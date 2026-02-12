"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";

const NPI_REGISTRY_URL = "https://npiregistry.cms.hhs.gov/api/";

interface NpiResult {
  npi: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone: string;
  fax: string;
}

export const search = action({
  args: {
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<NpiResult[]> => {
    const params = new URLSearchParams({
      version: "2.1",
      enumeration_type: "NPI-2", // Organizations (pharmacies)
      taxonomy_description: "Pharmacy",
      limit: "20",
    });

    if (args.name) params.set("organization_name", args.name);
    if (args.city) params.set("city", args.city);
    if (args.state) params.set("state", args.state);
    if (args.zip) params.set("postal_code", args.zip);

    const response = await fetch(`${NPI_REGISTRY_URL}?${params.toString()}`);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((r: Record<string, unknown>) => {
      const basic = r.basic as Record<string, string> | undefined;
      const addresses = r.addresses as Array<Record<string, string>> | undefined;
      const primaryAddr = addresses?.[0];

      // Extract fax from practice location address
      const practiceAddr = addresses?.find(
        (a: Record<string, string>) => a.address_purpose === "LOCATION"
      ) || primaryAddr;

      return {
        npi: (r.number as number)?.toString() ?? "",
        name: basic?.organization_name ?? basic?.name ?? "Unknown",
        address: {
          street: primaryAddr?.address_1 ?? "",
          city: primaryAddr?.city ?? "",
          state: primaryAddr?.state ?? "",
          zip: primaryAddr?.postal_code?.slice(0, 5) ?? "",
        },
        phone: practiceAddr?.telephone_number ?? "",
        fax: practiceAddr?.fax_number ?? "",
      };
    });
  },
});
