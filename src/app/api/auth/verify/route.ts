import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  try {
    const result = await convex.mutation(api.auth.verifyMagicLinkToken, { token });

    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(result.error || "invalid")}`, request.url)
      );
    }

    const params = new URLSearchParams({
      auth: "success",
      email: result.email || "",
      name: result.name || "",
      role: result.role || "member",
      isAdmin: String(result.isAdmin || false),
    });

    const redirectPath = result.isAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(
      new URL(`/login/callback?${params.toString()}&redirect=${redirectPath}`, request.url)
    );
  } catch {
    return NextResponse.redirect(new URL("/login?error=verification_failed", request.url));
  }
}
