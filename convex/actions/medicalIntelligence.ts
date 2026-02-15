"use node";
// @ts-nocheck
/**
 * MEDICAL INTELLIGENCE AGENT
 * Uses FREE public APIs for drug interaction screening,
 * medication lookup, and clinical intelligence.
 *
 * Data Sources (ALL FREE, no API keys):
 * - OpenFDA: Drug adverse events, interactions, labeling
 * - NIH RxNorm: Medication normalization + interaction pairs
 * - NIH DailyMed: Drug label/SPL data
 */
import { action } from "../_generated/server";
import { v } from "convex/values";

const OPENFDA_BASE = "https://api.fda.gov/drug";
const RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST";

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

interface DrugInfo {
  name: string;
  rxcui: string | null;
  brandNames: string[];
  genericName: string | null;
  warnings: string[];
}

interface InteractionPair {
  drug1: string;
  drug2: string;
  severity: string;
  description: string;
}

interface ScreeningResult {
  medications: DrugInfo[];
  interactions: InteractionPair[];
  warnings: string[];
  summary: string;
}

/* ---------------------------------------------------------------------------
   RxNorm: Normalize medication name → RxCUI
   --------------------------------------------------------------------------- */

async function lookupRxCUI(drugName: string): Promise<string | null> {
  try {
    const url = `${RXNORM_BASE}/rxcui.json?name=${encodeURIComponent(drugName)}&search=1`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const group = data?.idGroup;
    if (group?.rxnormId?.length > 0) {
      return group.rxnormId[0];
    }

    // Try approximate match
    const approxUrl = `${RXNORM_BASE}/approximateTerm.json?term=${encodeURIComponent(drugName)}&maxEntries=1`;
    const approxRes = await fetch(approxUrl);
    if (!approxRes.ok) return null;

    const approxData = await approxRes.json();
    const candidates = approxData?.approximateGroup?.candidate;
    if (candidates?.length > 0) {
      return candidates[0].rxcui;
    }

    return null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------------
   RxNorm: Get drug info by RxCUI
   --------------------------------------------------------------------------- */

async function getDrugProperties(rxcui: string): Promise<{
  brandNames: string[];
  genericName: string | null;
}> {
  try {
    const url = `${RXNORM_BASE}/rxcui/${rxcui}/allProperties.json?prop=names`;
    const res = await fetch(url);
    if (!res.ok) return { brandNames: [], genericName: null };

    const data = await res.json();
    const props = data?.propConceptGroup?.propConcept || [];

    const brandNames: string[] = [];
    let genericName: string | null = null;

    for (const prop of props) {
      if (prop.propName === "RxNorm Name") {
        genericName = prop.propValue;
      }
      if (prop.propName === "BRAND_NAME") {
        brandNames.push(prop.propValue);
      }
    }

    return { brandNames, genericName };
  } catch {
    return { brandNames: [], genericName: null };
  }
}

/* ---------------------------------------------------------------------------
   RxNorm: Check drug-drug interactions
   --------------------------------------------------------------------------- */

async function checkInteractions(rxcuis: string[]): Promise<InteractionPair[]> {
  if (rxcuis.length < 2) return [];

  try {
    const rxcuiList = rxcuis.join("+");
    const url = `${RXNORM_BASE}/interaction/list.json?rxcuis=${rxcuiList}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const pairs: InteractionPair[] = [];

    const interactionGroups =
      data?.fullInteractionTypeGroup || [];

    for (const group of interactionGroups) {
      const types = group?.fullInteractionType || [];
      for (const type of types) {
        const interactionPairs = type?.interactionPair || [];
        for (const pair of interactionPairs) {
          const concepts = pair?.interactionConcept || [];
          if (concepts.length >= 2) {
            pairs.push({
              drug1: concepts[0]?.minConceptItem?.name || "Unknown",
              drug2: concepts[1]?.minConceptItem?.name || "Unknown",
              severity: pair?.severity || "unknown",
              description: pair?.description || "Potential interaction detected",
            });
          }
        }
      }
    }

    return pairs;
  } catch {
    return [];
  }
}

/* ---------------------------------------------------------------------------
   OpenFDA: Get drug adverse events / warnings
   --------------------------------------------------------------------------- */

async function getOpenFDAWarnings(drugName: string): Promise<string[]> {
  try {
    const url = `${OPENFDA_BASE}/label.json?search=openfda.brand_name:"${encodeURIComponent(drugName)}"+openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const results = data?.results || [];
    if (results.length === 0) return [];

    const label = results[0];
    const warnings: string[] = [];

    // Extract key warnings (truncated for context window)
    if (label.boxed_warning?.length > 0) {
      const boxed = label.boxed_warning[0];
      warnings.push(`BLACK BOX WARNING: ${boxed.substring(0, 300)}`);
    }

    if (label.warnings_and_cautions?.length > 0) {
      const caution = label.warnings_and_cautions[0];
      warnings.push(caution.substring(0, 200));
    }

    if (label.contraindications?.length > 0) {
      const contra = label.contraindications[0];
      warnings.push(`Contraindications: ${contra.substring(0, 200)}`);
    }

    if (label.drug_interactions?.length > 0) {
      const interactions = label.drug_interactions[0];
      warnings.push(`Drug Interactions: ${interactions.substring(0, 300)}`);
    }

    return warnings;
  } catch {
    return [];
  }
}

/* ---------------------------------------------------------------------------
   Main: Screen a patient's medication list
   --------------------------------------------------------------------------- */

export const screenMedications = action({
  args: {
    medications: v.array(v.string()),
    allergies: v.optional(v.array(v.string())),
    conditions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<ScreeningResult> => {
    const medications = args.medications.filter((m) => m.trim().length > 0);
    const allergies = args.allergies || [];
    const conditions = args.conditions || [];

    if (medications.length === 0) {
      return {
        medications: [],
        interactions: [],
        warnings: [],
        summary: "No medications reported.",
      };
    }

    // Step 1: Resolve all medications to RxCUIs in parallel
    const rxcuiResults = await Promise.all(
      medications.map(async (med) => {
        const rxcui = await lookupRxCUI(med);
        return { name: med, rxcui };
      })
    );

    // Step 2: Get drug properties and FDA warnings in parallel
    const drugInfoResults = await Promise.all(
      rxcuiResults.map(async ({ name, rxcui }) => {
        const [properties, fdaWarnings] = await Promise.all([
          rxcui ? getDrugProperties(rxcui) : Promise.resolve({ brandNames: [], genericName: null }),
          getOpenFDAWarnings(name),
        ]);

        return {
          name,
          rxcui,
          brandNames: properties.brandNames,
          genericName: properties.genericName,
          warnings: fdaWarnings,
        };
      })
    );

    // Step 3: Check drug-drug interactions
    const validRxcuis = rxcuiResults
      .filter((r) => r.rxcui !== null)
      .map((r) => r.rxcui as string);

    const interactions = await checkInteractions(validRxcuis);

    // Step 4: Build warnings list
    const allWarnings: string[] = [];

    // Allergy cross-check
    for (const med of drugInfoResults) {
      const medNameLower = med.name.toLowerCase();
      const genericLower = (med.genericName || "").toLowerCase();
      for (const allergy of allergies) {
        const allergyLower = allergy.toLowerCase();
        if (
          medNameLower.includes(allergyLower) ||
          genericLower.includes(allergyLower) ||
          med.brandNames.some((b) => b.toLowerCase().includes(allergyLower))
        ) {
          allWarnings.push(
            `ALLERGY ALERT: Patient reports allergy to "${allergy}" — medication "${med.name}" may be related.`
          );
        }
      }
    }

    // Interaction warnings
    for (const pair of interactions) {
      const severityTag =
        pair.severity === "high" ? "HIGH SEVERITY" : pair.severity?.toUpperCase() || "POTENTIAL";
      allWarnings.push(
        `${severityTag} INTERACTION: ${pair.drug1} + ${pair.drug2} — ${pair.description.substring(0, 200)}`
      );
    }

    // Step 5: Build summary
    const resolvedCount = validRxcuis.length;
    const totalCount = medications.length;
    const interactionCount = interactions.length;

    let summary = `Screened ${totalCount} medication(s) (${resolvedCount} identified in RxNorm).`;
    if (interactionCount > 0) {
      summary += ` Found ${interactionCount} potential drug interaction(s).`;
    }
    if (allWarnings.length > 0) {
      summary += ` ${allWarnings.length} warning(s) flagged.`;
    } else {
      summary += " No significant warnings detected.";
    }

    return {
      medications: drugInfoResults,
      interactions,
      warnings: allWarnings,
      summary,
    };
  },
});

/**
 * Quick lookup for a single medication.
 * Returns drug info + warnings without interaction screening.
 */
export const lookupDrug = action({
  args: {
    drugName: v.string(),
  },
  handler: async (ctx, args) => {
    const rxcui = await lookupRxCUI(args.drugName);

    const [properties, fdaWarnings] = await Promise.all([
      rxcui
        ? getDrugProperties(rxcui)
        : Promise.resolve({ brandNames: [], genericName: null }),
      getOpenFDAWarnings(args.drugName),
    ]);

    return {
      name: args.drugName,
      rxcui,
      brandNames: properties.brandNames,
      genericName: properties.genericName,
      warnings: fdaWarnings,
      found: rxcui !== null,
    };
  },
});
