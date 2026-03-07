import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ScriptsXO — Telehealth Prescriptions, Simplified",
  description:
    "Connect with a licensed physician via video, get your prescription approved same day, and have it filled without the wait. For blood pressure, cholesterol, thyroid, and more.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
