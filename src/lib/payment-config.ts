/**
 * Payment Methods Configuration
 *
 * Defines all supported payment methods for ScriptsXO.
 * In production these settings would be stored in Convex and managed via the admin dashboard.
 * For now they live here as a typed config that the admin settings UI reads/writes.
 */

export type PaymentMethodId =
  | "credit_card"
  | "insurance"
  | "ach"
  | "wire_transfer"
  | "zelle"
  | "crypto";

export interface PaymentMethodConfig {
  id: PaymentMethodId;
  label: string;
  description: string;
  enabled: boolean;
  /** Additional settings specific to each method */
  settings: Record<string, string | boolean>;
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: "credit_card",
    label: "Credit / Debit Card",
    description:
      "Accept Visa, Mastercard, Amex, and Discover via Stripe or Whop.",
    enabled: true,
    settings: {
      processor: "whop",
      allowSavedCards: true,
    },
  },
  {
    id: "insurance",
    label: "Insurance",
    description:
      "Accept eligible health insurance plans. Claims routed through the insurance verification agent.",
    enabled: false,
    settings: {
      requirePreAuth: true,
      acceptedNetworks: "Aetna, BlueCross BlueShield, Cigna, UnitedHealthcare, Humana",
      verificationRequired: true,
      claimsEmail: "claims@scriptsxo.com",
      npiNumber: "",
      taxonomyCode: "",
    },
  },
  {
    id: "ach",
    label: "ACH Bank Transfer",
    description:
      "Accept direct bank-to-bank transfers via ACH. Lower fees, 2-3 business day settlement.",
    enabled: false,
    settings: {
      processor: "stripe",
      allowMicroDeposit: true,
      instantVerification: true,
      routingDisplay: "ending in ****",
    },
  },
  {
    id: "wire_transfer",
    label: "Wire Transfer",
    description:
      "Accept domestic and international wire transfers. Same-day settlement for domestic wires.",
    enabled: false,
    settings: {
      bankName: "",
      routingNumber: "",
      accountNumber: "",
      swiftCode: "",
      beneficiaryName: "ScriptsXO LLC",
      beneficiaryAddress: "",
      referencePrefix: "SXO-",
      internationalEnabled: false,
    },
  },
  {
    id: "zelle",
    label: "Zelle",
    description:
      "Accept instant payments via Zelle. No fees for either party.",
    enabled: false,
    settings: {
      zelleEmail: "",
      zellePhone: "",
      displayName: "ScriptsXO",
      confirmationRequired: true,
    },
  },
  {
    id: "crypto",
    label: "Cryptocurrency",
    description:
      "Accept Bitcoin, Ethereum, USDC, and other major cryptocurrencies.",
    enabled: false,
    settings: {
      processor: "coinbase_commerce",
      acceptBTC: true,
      acceptETH: true,
      acceptUSDC: true,
      acceptSOL: false,
      walletAddress: "",
      autoConvertToUSD: true,
      networkConfirmations: "3",
    },
  },
];

/**
 * Returns only enabled payment methods.
 */
export function getEnabledPaymentMethods(): PaymentMethodConfig[] {
  return PAYMENT_METHODS.filter((m) => m.enabled);
}

/**
 * Returns a specific payment method by ID.
 */
export function getPaymentMethod(
  id: PaymentMethodId
): PaymentMethodConfig | undefined {
  return PAYMENT_METHODS.find((m) => m.id === id);
}

/**
 * Icons mapped to payment method IDs (used in UI).
 * Import lucide icons in the component, not here.
 */
export const PAYMENT_METHOD_ICONS: Record<PaymentMethodId, string> = {
  credit_card: "CreditCard",
  insurance: "ShieldCheck",
  ach: "Building2",
  wire_transfer: "ArrowLeftRight",
  zelle: "Zap",
  crypto: "Bitcoin",
};
