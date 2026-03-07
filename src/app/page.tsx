"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessionCookie } from "@/lib/auth";

// Marketing palette — teal/navy, independent of the app's violet design system
const mk = {
  teal: "#0d9488",
  tealDark: "#0f766e",
  tealLight: "#ccfbf1",
  navy: "#1a2744",
  navyLight: "#243158",
  white: "#ffffff",
  surface: "#f8fafc",
  surfaceAlt: "#f1f5f9",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
} as const;

const styles = {
  page: {
    fontFamily:
      "'DM Sans', ui-sans-serif, system-ui, -apple-system, sans-serif",
    background: mk.white,
    color: mk.text,
    lineHeight: "1.6",
    overflowX: "hidden" as const,
  },
  // Header
  header: {
    position: "sticky" as const,
    top: 0,
    zIndex: 50,
    background: "rgba(255, 255, 255, 0.96)",
    backdropFilter: "blur(12px)",
    borderBottom: `1px solid ${mk.border}`,
  },
  headerInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "64px",
  },
  logo: {
    fontSize: "20px",
    fontWeight: "600",
    color: mk.navy,
    letterSpacing: "-0.03em",
    textDecoration: "none",
  },
  logoAccent: {
    color: mk.teal,
  },
  headerNav: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  navLink: {
    fontSize: "14px",
    color: mk.textMuted,
    textDecoration: "none",
    fontWeight: "500",
    padding: "8px 12px",
    borderRadius: "8px",
  },
  ctaBtn: {
    fontSize: "14px",
    fontWeight: "600",
    color: mk.white,
    background: mk.teal,
    textDecoration: "none",
    padding: "10px 20px",
    borderRadius: "10px",
    display: "inline-block",
  },
  // Hero
  hero: {
    background: `linear-gradient(160deg, ${mk.navy} 0%, ${mk.navyLight} 100%)`,
    color: mk.white,
    padding: "96px 24px 80px",
    textAlign: "center" as const,
  },
  heroInner: {
    maxWidth: "760px",
    margin: "0 auto",
  },
  heroBadge: {
    display: "inline-block",
    background: "rgba(13, 148, 136, 0.2)",
    border: "1px solid rgba(13, 148, 136, 0.4)",
    color: "#5eead4",
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    padding: "6px 16px",
    borderRadius: "100px",
    marginBottom: "28px",
  },
  heroH1: {
    fontSize: "clamp(2.4rem, 6vw, 3.8rem)",
    fontWeight: "600",
    lineHeight: "1.12",
    letterSpacing: "-0.04em",
    marginBottom: "20px",
    color: mk.white,
  },
  heroAccent: {
    color: "#5eead4",
  },
  heroSub: {
    fontSize: "18px",
    color: "rgba(255,255,255,0.72)",
    maxWidth: "560px",
    margin: "0 auto 40px",
    lineHeight: "1.6",
  },
  heroCtas: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap" as const,
    marginBottom: "56px",
  },
  heroPrimaryBtn: {
    background: mk.teal,
    color: mk.white,
    fontSize: "15px",
    fontWeight: "600",
    padding: "14px 28px",
    borderRadius: "12px",
    textDecoration: "none",
    display: "inline-block",
  },
  heroSecondaryBtn: {
    background: "rgba(255,255,255,0.1)",
    color: mk.white,
    fontSize: "15px",
    fontWeight: "500",
    padding: "14px 28px",
    borderRadius: "12px",
    textDecoration: "none",
    display: "inline-block",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  heroTrust: {
    display: "flex",
    gap: "32px",
    justifyContent: "center",
    flexWrap: "wrap" as const,
  },
  heroTrustItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  heroTrustDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#5eead4",
    flexShrink: 0,
  },
  // Sections
  section: {
    padding: "80px 24px",
  },
  sectionAlt: {
    padding: "80px 24px",
    background: mk.surface,
  },
  sectionInner: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: mk.teal,
    marginBottom: "12px",
  },
  sectionH2: {
    fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
    fontWeight: "600",
    letterSpacing: "-0.03em",
    color: mk.navy,
    marginBottom: "16px",
    lineHeight: "1.2",
  },
  sectionSub: {
    fontSize: "17px",
    color: mk.textMuted,
    maxWidth: "560px",
    lineHeight: "1.65",
    marginBottom: "56px",
  },
  // Steps
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "32px",
  },
  stepCard: {
    background: mk.white,
    border: `1px solid ${mk.border}`,
    borderRadius: "16px",
    padding: "32px",
  },
  stepNumber: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    background: mk.tealLight,
    color: mk.teal,
    fontSize: "16px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
  },
  stepTitle: {
    fontSize: "17px",
    fontWeight: "600",
    color: mk.navy,
    marginBottom: "10px",
  },
  stepDesc: {
    fontSize: "15px",
    color: mk.textMuted,
    lineHeight: "1.65",
  },
  // Two-col grid for what we handle
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "32px",
  },
  listCard: {
    background: mk.white,
    border: `1px solid ${mk.border}`,
    borderRadius: "16px",
    padding: "32px",
  },
  listCardAlt: {
    background: mk.surfaceAlt,
    border: `1px solid ${mk.border}`,
    borderRadius: "16px",
    padding: "32px",
  },
  listCardTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: mk.navy,
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  listDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: mk.teal,
    flexShrink: 0,
  },
  listDotNo: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: mk.textMuted,
    flexShrink: 0,
    opacity: 0.5,
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "15px",
    color: mk.text,
    marginBottom: "12px",
  },
  listItemNo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "15px",
    color: mk.textMuted,
    marginBottom: "12px",
  },
  // Trust
  trustGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "24px",
  },
  trustCard: {
    background: mk.white,
    border: `1px solid ${mk.border}`,
    borderRadius: "16px",
    padding: "28px",
    textAlign: "center" as const,
  },
  trustIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    background: mk.tealLight,
    margin: "0 auto 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  trustTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: mk.navy,
    marginBottom: "8px",
  },
  trustDesc: {
    fontSize: "14px",
    color: mk.textMuted,
    lineHeight: "1.5",
  },
  // CTA Banner
  ctaBanner: {
    background: `linear-gradient(135deg, ${mk.navy} 0%, ${mk.navyLight} 100%)`,
    padding: "80px 24px",
    textAlign: "center" as const,
  },
  ctaBannerInner: {
    maxWidth: "640px",
    margin: "0 auto",
  },
  ctaBannerH2: {
    fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
    fontWeight: "600",
    color: mk.white,
    letterSpacing: "-0.03em",
    marginBottom: "16px",
  },
  ctaBannerSub: {
    fontSize: "17px",
    color: "rgba(255,255,255,0.65)",
    marginBottom: "36px",
    lineHeight: "1.6",
  },
  ctaBannerBtn: {
    background: mk.teal,
    color: mk.white,
    fontSize: "16px",
    fontWeight: "600",
    padding: "16px 36px",
    borderRadius: "12px",
    textDecoration: "none",
    display: "inline-block",
  },
  // Footer
  footer: {
    background: mk.navy,
    padding: "48px 24px",
  },
  footerInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "24px",
  },
  footerLogo: {
    fontSize: "18px",
    fontWeight: "600",
    color: mk.white,
    letterSpacing: "-0.03em",
    textDecoration: "none",
  },
  footerLinks: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap" as const,
  },
  footerLink: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.5)",
    textDecoration: "none",
  },
  footerCopy: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.35)",
    marginTop: "24px",
    paddingTop: "24px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    textAlign: "center" as const,
    maxWidth: "1100px",
    margin: "24px auto 0",
  },
} as const;

const HANDLES = [
  "Blood pressure medications",
  "Cholesterol (statins)",
  "Thyroid medications (levothyroxine)",
  "Common antibiotics",
  "Acid reflux / GERD",
  "Diabetes management (Type 2)",
  "Allergy medications",
  "General wellness and preventive care",
];

const DOES_NOT_HANDLE = [
  "Controlled substances (Schedule II-V)",
  "Psychiatric / psychotropic medications",
  "Specialty pharmacy drugs",
  "Oncology or biologics",
  "Acute emergency conditions",
];

const TRUST_ITEMS = [
  {
    title: "Licensed Physicians",
    desc: "Board-certified physicians licensed in Florida — real consultations, not rubber stamps.",
  },
  {
    title: "HIPAA Compliant",
    desc: "Your health information is encrypted end-to-end and never shared with third parties.",
  },
  {
    title: "Same-Day Available",
    desc: "Most prescriptions are approved within hours of your video consult.",
  },
  {
    title: "Secure Video",
    desc: "Encrypted HIPAA-compliant video platform — no account required for your consult link.",
  },
];

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSessionCookie();
    if (session) {
      router.replace("/dashboard");
    }
    // No redirect for unauthenticated — render the marketing page
  }, [router]);

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link href="/" style={styles.logo}>
            Scripts<span style={styles.logoAccent}>XO</span>
          </Link>
          <nav style={styles.headerNav}>
            <Link href="/login" style={styles.navLink}>
              Log In
            </Link>
            <Link href="/start" style={styles.ctaBtn}>
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroBadge}>Telehealth Prescriptions</div>
          <h1 style={styles.heroH1}>
            Your prescription.{" "}
            <span style={styles.heroAccent}>Handled.</span>
          </h1>
          <p style={styles.heroSub}>
            Video consult with a licensed physician — get your regular
            prescription approved same day and filled without the hassle.
          </p>
          <div style={styles.heroCtas}>
            <Link href="/start" style={styles.heroPrimaryBtn}>
              Get Started
            </Link>
            <Link href="/login" style={styles.heroSecondaryBtn}>
              Log In
            </Link>
          </div>
          <div style={styles.heroTrust}>
            {["Licensed physicians", "HIPAA compliant", "Same-day prescriptions", "Florida"].map(
              (item) => (
                <div key={item} style={styles.heroTrustItem}>
                  <span style={styles.heroTrustDot} />
                  {item}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionLabel}>How It Works</div>
          <h2 style={styles.sectionH2}>Three steps to your prescription</h2>
          <p style={styles.sectionSub}>
            No waiting rooms. No scheduling weeks out. A straightforward
            process designed around your time.
          </p>
          <div style={styles.stepsGrid}>
            <div style={styles.stepCard}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepTitle}>Tell us what you need</div>
              <p style={styles.stepDesc}>
                Complete a brief intake — your medications, current conditions,
                and basic health history. Takes about 5 minutes.
              </p>
            </div>
            <div style={styles.stepCard}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepTitle}>Video consult with a physician</div>
              <p style={styles.stepDesc}>
                Connect via secure video with a licensed physician. They review
                your history, ask questions, and issue your prescription.
              </p>
            </div>
            <div style={styles.stepCard}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepTitle}>Prescription filled and delivered</div>
              <p style={styles.stepDesc}>
                Your prescription goes to the pharmacy of your choice — or we
                can arrange delivery directly to your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What we handle */}
      <section style={styles.sectionAlt}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionLabel}>What We Cover</div>
          <h2 style={styles.sectionH2}>Common prescriptions, handled well</h2>
          <p style={styles.sectionSub}>
            ScriptsXO is built for people managing ongoing health conditions who
            need a straightforward path to a legitimate prescription.
          </p>
          <div style={styles.twoColGrid}>
            <div style={styles.listCard}>
              <div style={styles.listCardTitle}>
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    background: mk.teal,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                We handle
              </div>
              {HANDLES.map((label) => (
                <div key={label} style={styles.listItem}>
                  <span style={styles.listDot} />
                  {label}
                </div>
              ))}
            </div>
            <div style={styles.listCardAlt}>
              <div style={styles.listCardTitle}>
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    background: mk.textMuted,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    opacity: 0.5,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                We do not handle
              </div>
              {DOES_NOT_HANDLE.map((label) => (
                <div key={label} style={styles.listItemNo}>
                  <span style={styles.listDotNo} />
                  {label}
                </div>
              ))}
              <p
                style={{
                  fontSize: "13px",
                  color: mk.textMuted,
                  marginTop: "20px",
                  lineHeight: "1.5",
                  borderTop: `1px solid ${mk.border}`,
                  paddingTop: "16px",
                }}
              >
                For these conditions, please consult a specialist or visit an
                emergency care facility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <div style={styles.sectionLabel}>Trust and Compliance</div>
          <h2 style={styles.sectionH2}>Built with your privacy in mind</h2>
          <p style={styles.sectionSub}>
            Every part of ScriptsXO is designed to meet or exceed healthcare
            privacy standards.
          </p>
          <div style={styles.trustGrid}>
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} style={styles.trustCard}>
                <div style={styles.trustIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={mk.teal}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 12l2 2 4-4" />
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div style={styles.trustTitle}>{item.title}</div>
                <p style={styles.trustDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={styles.ctaBanner}>
        <div style={styles.ctaBannerInner}>
          <h2 style={styles.ctaBannerH2}>
            Ready to get your prescription handled?
          </h2>
          <p style={styles.ctaBannerSub}>
            Most consultations take 15 minutes or less. Same-day prescriptions
            available for qualifying conditions.
          </p>
          <Link href="/start" style={styles.ctaBannerBtn}>
            Get Started Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <Link href="/" style={styles.footerLogo}>
            ScriptsXO
          </Link>
          <div style={styles.footerLinks}>
            <Link href="/start" style={styles.footerLink}>
              Get Started
            </Link>
            <Link href="/login" style={styles.footerLink}>
              Log In
            </Link>
            <Link href="/privacy" style={styles.footerLink}>
              Privacy
            </Link>
            <Link href="/terms" style={styles.footerLink}>
              Terms
            </Link>
            <Link href="/hipaa" style={styles.footerLink}>
              HIPAA
            </Link>
          </div>
        </div>
        <div style={styles.footerCopy}>
          &copy; {new Date().getFullYear()} ScriptsXO. All rights reserved.
          Telehealth services provided by licensed physicians. Not for
          emergencies — call 911 if you need immediate assistance.
        </div>
      </footer>
    </div>
  );
}
