export const SITECONFIG = {
  brand: {
    name: "ScriptsXO",
    tagline: "Telehealth Prescriptions, Simplified",
    mission:
      "Connecting clients with licensed physicians for convenient, compliant telehealth consultations and prescription fulfillment.",
    domain: "scriptsxo.com",
    phone: "1-888-SXO-HEALTH",
    phoneNumber: "18887964325",
    email: "hello@scriptsxo.com",
    supportEmail: "support@scriptsxo.com",
  },
  visuals: {
    theme: "Medical Teal",
    primaryColor: "#0D6E8A",
    secondaryColor: "#2196F3",
    accentColor: "#00BCD4",
    loadingText: "Loading...",
    images: {
      logo: "/logo.svg",
      favicon: "/favicon.ico",
      ogImage: "/og-image.png",
    },
  },
  auth: {
    type: "Passkey" as const,
    sessionDays: 60,
    requireEmailVerification: false,
    adminEmails: [
      "hellonolen@gmail.com",
      "nolen@doclish.com",
      "nolen@scriptsxo.com",
    ],
    // Provider and pharmacy roles are assigned by the agentic
    // credential verification pipeline — no manual email lists needed.
  },
  billing: {
    provider: "Whop" as const,
    currency: "USD",
    membershipFee: 9700, // $97/month in cents — includes Office Hours
    providerCallFee: 19700, // $197 per 15-min same-day provider consultation in cents
    providerCallDuration: 15, // minutes
    billingInterval: "monthly" as const,
    cancelAnytime: true,
    noRefund: true,
    officeHoursIncluded: true, // weekly nurse Q&A included with membership
  },
  content: {
    stats: {
      providers: "50+",
      states: "Florida",
      avgWait: "3-8 min",
      satisfaction: "4.9/5",
    },
  },
  features: {
    enablePasskeys: true,
    enableSubscriptions: true,
    enableInsurance: true,
    enableVideoConsultation: true,
    enableAITriage: true,
    enableEPrescribe: true,
    enableAnalytics: true,
    enableOfficeHours: true,
    maintenanceMode: false,
  },
  memberRequirements: {
    governmentId: true,
    activeCreditCard: true,
    activeSubscription: true,
  },
  /**
   * Terminology config — swap "patient" ↔ "client" across the entire UI
   * without touching DB schema or internal role identifiers.
   * Change clientTerm / clientTermPlural here to rebrand globally.
   */
  terminology: {
    clientTerm: "client",         // singular: "client" or "patient"
    clientTermPlural: "clients",  // plural:   "clients" or "patients"
    clientTermTitle: "Client",    // title case
    clientTermPluralTitle: "Clients",
  },
  social: { twitter: "", instagram: "", facebook: "", linkedin: "" },
  legal: {
    privacyUrl: "/privacy",
    termsUrl: "/terms",
    hipaaUrl: "/hipaa",
  },
  navigation: {
    main: [
      { label: "Client Portal", href: "/portal" },
      { label: "Providers", href: "/provider" },
      { label: "Admin", href: "/admin" },
    ],
    footer: [
      { label: "Client Portal", href: "/portal" },
      { label: "Providers", href: "/provider" },
      { label: "Pharmacy", href: "/pharmacy" },
      { label: "Admin", href: "/admin" },
    ],
  },
  specialties: [
    "General Medicine",
    "Internal Medicine",
    "Dermatology",
    "Mental Health",
    "Urgent Care",
    "Endocrinology",
    "Pain Management",
    "Sexual Health",
  ],
} as const;

export type SiteConfig = typeof SITECONFIG;

/**
 * Returns the configured display term for the consumer role.
 * Use instead of hardcoding "patient" anywhere in the UI.
 *
 * Examples:
 *   term()           → "client"
 *   term("plural")   → "clients"
 *   term("title")    → "Client"
 *   term("titlePlural") → "Clients"
 */
export function term(
  form: "singular" | "plural" | "title" | "titlePlural" = "singular"
): string {
  const t = SITECONFIG.terminology;
  switch (form) {
    case "plural":      return t.clientTermPlural;
    case "title":       return t.clientTermTitle;
    case "titlePlural": return t.clientTermPluralTitle;
    default:            return t.clientTerm;
  }
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
