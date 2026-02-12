export const SITECONFIG = {
  brand: {
    name: "ScriptsXO",
    tagline: "Telehealth Prescriptions, Simplified",
    mission:
      "Connecting patients with licensed physicians for convenient, compliant telehealth consultations and prescription fulfillment.",
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
    ],
  },
  billing: {
    provider: "Stripe" as const,
    currency: "USD",
    consultationFee: 7500, // $75 in cents
  },
  content: {
    stats: {
      providers: "50+",
      states: "Florida",
      avgWait: "< 15 min",
      satisfaction: "4.9/5",
    },
  },
  features: {
    enablePasskeys: true,
    enableSubscriptions: false,
    enableInsurance: true,
    enableVideoConsultation: true,
    enableAITriage: true,
    enableEPrescribe: true,
    enableAnalytics: true,
    maintenanceMode: false,
  },
  social: { twitter: "", instagram: "", facebook: "", linkedin: "" },
  legal: {
    privacyUrl: "/privacy",
    termsUrl: "/terms",
    hipaaUrl: "/hipaa",
  },
  navigation: {
    main: [
      { label: "Patient Portal", href: "/portal" },
      { label: "Providers", href: "/provider" },
      { label: "Admin", href: "/admin" },
    ],
    footer: [
      { label: "Patient Portal", href: "/portal" },
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

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
