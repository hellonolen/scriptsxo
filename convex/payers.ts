// @ts-nocheck
import { v } from 'convex/values';
import { action, query } from './_generated/server';
import { checkEligibility, listPayers, PAYERS } from './lib/payers/index';

/* ─── listPayers query ──────────────────────────────────── */
// Returns all supported payers with a configured flag.
// Credentials are never exposed — only their presence is checked.

export const list = query({
    args: {},
    handler: async () => {
        const env: Record<string, string | undefined> = {
            UHC_CLIENT_ID: process.env.UHC_CLIENT_ID,
            UHC_CLIENT_SECRET: process.env.UHC_CLIENT_SECRET,
            AETNA_CLIENT_ID: process.env.AETNA_CLIENT_ID,
            AETNA_CLIENT_SECRET: process.env.AETNA_CLIENT_SECRET,
            BCBS_CLIENT_ID: process.env.BCBS_CLIENT_ID,
            BCBS_CLIENT_SECRET: process.env.BCBS_CLIENT_SECRET,
            CIGNA_CLIENT_ID: process.env.CIGNA_CLIENT_ID,
            CIGNA_CLIENT_SECRET: process.env.CIGNA_CLIENT_SECRET,
            HUMANA_CLIENT_ID: process.env.HUMANA_CLIENT_ID,
            HUMANA_CLIENT_SECRET: process.env.HUMANA_CLIENT_SECRET,
        };

        return listPayers(env);
    },
});

/* ─── checkEligibility action ──────────────────────────── */
// Performs a live FHIR R4 CoverageEligibilityRequest against the named payer.
// Returns 'not_configured' gracefully when credentials are missing.

export const check = action({
    args: {
        payerKey: v.string(),
        patient: v.object({
            firstName: v.string(),
            lastName: v.string(),
            dob: v.string(),
            memberId: v.optional(v.string()),
            groupId: v.optional(v.string()),
        }),
        serviceDate: v.optional(v.string()),
        serviceType: v.optional(v.string()),
    },
    handler: async (_ctx, args) => {
        const env: Record<string, string | undefined> = {
            UHC_CLIENT_ID: process.env.UHC_CLIENT_ID,
            UHC_CLIENT_SECRET: process.env.UHC_CLIENT_SECRET,
            AETNA_CLIENT_ID: process.env.AETNA_CLIENT_ID,
            AETNA_CLIENT_SECRET: process.env.AETNA_CLIENT_SECRET,
            BCBS_CLIENT_ID: process.env.BCBS_CLIENT_ID,
            BCBS_CLIENT_SECRET: process.env.BCBS_CLIENT_SECRET,
            CIGNA_CLIENT_ID: process.env.CIGNA_CLIENT_ID,
            CIGNA_CLIENT_SECRET: process.env.CIGNA_CLIENT_SECRET,
            HUMANA_CLIENT_ID: process.env.HUMANA_CLIENT_ID,
            HUMANA_CLIENT_SECRET: process.env.HUMANA_CLIENT_SECRET,
        };

        const result = await checkEligibility(
            args.payerKey,
            {
                patient: args.patient,
                serviceDate: args.serviceDate,
                serviceType: args.serviceType,
            },
            env,
        );

        return result;
    },
});

/* ─── getPayerInfo query ────────────────────────────────── */
// Returns static config metadata (name, notes, registration link) for a payer.
// No credentials, no live calls.

export const getInfo = query({
    args: {
        payerKey: v.string(),
    },
    handler: async (_ctx, args) => {
        const config = PAYERS[args.payerKey];
        if (!config) return null;

        return {
            key: config.key,
            name: config.name,
            notes: config.notes,
        };
    },
});
