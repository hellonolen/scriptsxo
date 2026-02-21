
# ScriptsXO Agent Architecture

Last Updated: 2026-02-21

## Overview

ScriptsXO runs 10 autonomous AI agents covering the full telehealth prescription lifecycle: patient intake through quality assurance. All agents use Google Gemini Flash as the primary LLM with Claude (Anthropic) as fallback. Agent dispatch is handled through a Conductor pattern with centralized LLM gateway.

No external agent frameworks (CrewAI, LangChain, AutoGen). The entire agent system is built on Convex actions + Gemini API calls via a custom LLM gateway.


## Architecture

| Component | Technology | Location |
|-----------|-----------|----------|
| Agent Dispatch | Conductor pattern (agents/conductor.ts) | Convex |
| LLM Gateway | Gemini primary, Claude fallback (agents/llmGateway.ts) | Convex |
| Agent State | Convex tables (agentLogs) | Convex Cloud (striped-caribou-797) |
| AI Reasoning | Gemini 2.0 Flash | Google Cloud |
| Fallback AI | Claude (Anthropic) | Anthropic |


## Conductor Pattern

All agent requests are routed through `convex/agents/conductor.ts`:

1. Incoming request specifies agent name + payload
2. Conductor routes to the correct agent handler
3. Agent executes its logic (Gemini API call + domain operations)
4. Conductor logs the result to agentLogs table (success/failure + duration)
5. Structured result returned to caller


## LLM Gateway

Centralized in `convex/agents/llmGateway.ts`:

| Function | Purpose | Models |
|----------|---------|--------|
| callLLM() | Text-based reasoning | Gemini Flash (primary), Claude (fallback) |
| callMultimodal() | Image analysis (base64) | Gemini Flash |

Configuration per call: temperature, max tokens, system prompt, response format (JSON).

KNOWN BUG: Line 213 calls getApiKey() which does not exist. Should be getGeminiKey(). Must fix before production.


## The 10 Agents

### 1. Intake Agent

| Field | Value |
|-------|-------|
| Internal name | intake_agent |
| Model | Gemini Flash |
| Status | FUNCTIONAL |

What it does:
- Validates medical history completeness
- Returns completeness score (0-100)
- Identifies missing required fields
- Flags risk factors for provider review
- Returns structured JSON: completeness score, missing fields list, risk flags


### 2. Triage Agent

| Field | Value |
|-------|-------|
| Internal name | triage_agent |
| Model | Gemini Flash |
| Status | FUNCTIONAL |

What it does:
- Analyzes patient symptoms and chief complaint
- Classifies urgency: emergency, urgent, standard, routine
- Flags potential drug interactions from medication list
- Recommends care pathway (immediate consult, scheduled, pharmacy-only)
- Checks contraindications against existing conditions


### 3. Scheduling Agent

| Field | Value |
|-------|-------|
| Internal name | scheduling_agent |
| Model | Gemini Flash |
| Status | FUNCTIONAL |

What it does:
- Matches patients to providers by state licensing, specialty, urgency level
- Checks provider availability against scheduling table
- Returns available appointment slots ranked by fit
- Handles multi-state telehealth licensing compliance


### 4. Compliance Agent

| Field | Value |
|-------|-------|
| Internal name | compliance_agent |
| Model | Gemini Flash |
| Status | FUNCTIONAL |

What it does:
- Verifies patient identity documents (via Stripe Identity)
- Validates provider licenses and DEA numbers
- Checks telehealth regulations per patient state
- Flags compliance issues before consultation begins
- Returns structured compliance checklist (pass/fail per item)


### 5. Consultation Agent

| Field | Value |
|-------|-------|
| Internal name | consultation_agent |
| Model | Gemini Flash |
| Status | FUNCTIONAL |

What it does:
- Real-time clinical decision support sidebar during telehealth consultations
- Summarizes patient history, medications, allergies for provider
- Suggests clinical questions based on chief complaint
- Flags contraindications and drug interactions in real-time
- Provides evidence-based treatment suggestions


### 6. Prescription Agent

| Field | Value |
|-------|-------|
| Internal name | prescription_agent |
| Model | Gemini Flash |
| Status | FUNCTIONAL |

What it does:
- Validates prescription details (drug, dose, frequency, duration)
- Checks for drug-drug interactions against patient medication list
- Verifies dosage appropriateness for patient age/weight
- Formats prescription for NCPDP e-prescribing standard
- Flags controlled substance scheduling requirements


### 7. Pharmacy Agent

| Field | Value |
|-------|-------|
| Internal name | pharmacy_agent |
| Model | Gemini Flash |
| Status | FUNCTIONAL |

What it does:
- Routes prescriptions to optimal pharmacy based on:
  - Drug availability
  - Patient location/preference
  - Controlled substance licensing
  - Insurance network participation
- Tracks fulfillment status through pharmacy workflow
- Handles pharmacy-to-pharmacy transfers


### 8. Follow-Up Agent

| Field | Value |
|-------|-------|
| Internal name | followup_agent |
| Model | Gemini Flash |
| Status | FUNCTIONAL |

What it does:
- Generates post-consultation follow-up plans
- Monitors for side effect reports
- Tracks medication adherence signals
- Escalates concerns to provider when thresholds exceeded
- Schedules follow-up appointments based on treatment protocol


### 9. Billing Agent

| Field | Value |
|-------|-------|
| Internal name | billing_agent |
| Model | Gemini Flash |
| Status | FUNCTIONAL |

What it does:
- Determines CPT/HCPCS codes for telehealth consultations
- Calculates patient copay based on insurance plan
- Checks insurance eligibility before billing
- Generates claim details for submission
- Handles modifier codes for telehealth (95, GT, etc.)


### 10. Quality Agent

| Field | Value |
|-------|-------|
| Internal name | quality_agent |
| Model | Gemini Flash |
| Status | FUNCTIONAL |

What it does:
- Scores consultations 0-100 on quality metrics
- Analyzes prescribing patterns for anomalies
- Detects potential compliance issues (overprescribing, inappropriate combinations)
- Generates quality improvement recommendations
- Produces audit-ready quality reports


## Agent Flow (End-to-End)

```
Patient registers (passkey) + starts intake
  |
  v
Intake Agent -- validates medical history, flags missing fields
  |
  v
Triage Agent -- analyzes symptoms, classifies urgency
  |
  v
Compliance Agent -- verifies ID, checks state regulations
  |
  v
Scheduling Agent -- matches provider, returns appointment slots
  |
  v
Patient completes payment (Whop checkout)
  |
  v
Consultation Agent -- real-time sidebar during telehealth visit
  |
  v
Prescription Agent -- validates Rx, checks interactions, formats NCPDP
  |
  v
Pharmacy Agent -- routes Rx to optimal pharmacy
  |
  v
Follow-Up Agent -- schedules check-ins, monitors adherence
  |
  v
Billing Agent -- generates CPT codes, calculates copay, submits claim
  |
  v
Quality Agent -- scores consultation, flags anomalies
```


## Database Tables (Agent-Related)

### agentLogs

| Column | Type | Purpose |
|--------|------|---------|
| agentName | string | Which agent ran |
| action | string | What was requested |
| success | boolean | Pass/fail |
| duration | number | Execution time (ms) |
| input | string | JSON input payload |
| output | string | JSON output result |
| error | string (optional) | Error message if failed |
| createdAt | number | Timestamp |

Index: by_agent, by_created


## File Map

| File | Purpose |
|------|---------|
| convex/agents/conductor.ts | Central dispatch -- routes requests to agent handlers |
| convex/agents/llmGateway.ts | LLM abstraction -- Gemini primary, Claude fallback |
| convex/agents/intakeAgent.ts | Intake validation + completeness scoring |
| convex/agents/triageAgent.ts | Symptom analysis + urgency classification |
| convex/agents/schedulingAgent.ts | Provider matching + appointment availability |
| convex/agents/complianceAgent.ts | ID/license verification + telehealth regulation |
| convex/agents/consultationAgent.ts | Real-time clinical decision support |
| convex/agents/prescriptionAgent.ts | Rx validation + drug interactions + NCPDP |
| convex/agents/pharmacyAgent.ts | Pharmacy routing + fulfillment tracking |
| convex/agents/followUpAgent.ts | Post-consult monitoring + adherence |
| convex/agents/billingAgent.ts | CPT coding + copay + claims |
| convex/agents/qualityAgent.ts | Quality scoring + prescribing analysis |


## Known Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| getApiKey() undefined in llmGateway.ts line 213 | CRITICAL | Change to getGeminiKey() |
| GEMINI_API_KEY not set in Convex env | CRITICAL | Run npx convex env set GEMINI_API_KEY |
| ANTHROPIC_API_KEY not set (Claude fallback) | MEDIUM | Run npx convex env set ANTHROPIC_API_KEY |
| Agent unit tests missing | HIGH | No test coverage for any agent logic |
| No retry/dead-letter on agent failures | MEDIUM | Agent errors logged but not retried |
