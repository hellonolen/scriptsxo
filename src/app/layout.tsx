import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-provider";
import { SITECONFIG } from "@/lib/config";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: SITECONFIG.brand.name,
    template: `%s | ${SITECONFIG.brand.name}`,
  },
  description: SITECONFIG.brand.mission,
  keywords: [
    "telehealth",
    "prescription concierge",
    "online doctor",
    "prescription",
    "virtual consultation",
    "premium telehealth",
    "e-prescribe",
    "concierge medicine",
    "prescription delivery",
  ],
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FAF8F5" }],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${playfair.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
