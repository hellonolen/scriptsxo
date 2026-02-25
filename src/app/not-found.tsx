import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#FAF8F5",
        color: "#1E1037",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480, padding: 32 }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase" as const,
            color: "#7C3AED",
            marginBottom: 8,
          }}
        >
          404
        </p>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 300,
            letterSpacing: "-0.02em",
            marginBottom: 12,
          }}
        >
          Page Not Found
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#6B7280",
            marginBottom: 24,
          }}
        >
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "#1E1037",
            color: "#FFFFFF",
            borderRadius: 6,
            fontSize: 12,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            textDecoration: "none",
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
