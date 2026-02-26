// @ts-nocheck
"use node";
/**
 * WEBAUTHN SERVER-SIDE ACTIONS
 * Device-bound passkey registration and authentication
 * using @simplewebauthn/server.
 *
 * Platform authenticators only (Face ID, Touch ID, Windows Hello).
 * Env vars:
 *   WEBAUTHN_RP_ID     — Relying Party ID (domain). Default: "localhost"
 *   WEBAUTHN_ORIGIN    — Allowed origin(s), comma-separated. Default: "http://localhost:3001"
 */
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const RP_NAME = "ScriptsXO";

function getConfig() {
  const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
  const rawOrigin = process.env.WEBAUTHN_ORIGIN || "http://localhost:3001";
  const origin = rawOrigin.includes(",")
    ? rawOrigin.split(",").map((o) => o.trim())
    : rawOrigin;
  return { rpID, origin };
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlToUint8Array(b64url: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64url, "base64url"));
}

/* ---------------------------------------------------------------------------
   Registration: Generate options
   --------------------------------------------------------------------------- */

export const getRegistrationOptions = action({
  args: {
    email: v.string(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const { rpID } = getConfig();

    // Ensure a member record exists (creates one with role "patient" if new)
    await ctx.runMutation(api.members.getOrCreate, {
      email,
      name: args.userName || email.split("@")[0],
    });

    // Get existing credentials to exclude (prevent duplicate device registration)
    const existingCreds = await ctx.runQuery(api.passkeys.getCredentials, {
      email,
    });

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userName: email,
      userDisplayName: args.userName || email.split("@")[0],
      excludeCredentials: existingCreds.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports,
      })),
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        requireResidentKey: true,
        residentKey: "required",
        userVerification: "required",
      },
      timeout: 300000,
    });

    // Store the challenge for later verification
    await ctx.runMutation(api.passkeys.storeWebAuthnChallenge, {
      challenge: options.challenge,
      email,
      type: "webauthn_registration",
    });

    return options;
  },
});

/* ---------------------------------------------------------------------------
   Registration: Verify response and store credential
   --------------------------------------------------------------------------- */

export const verifyAndStoreRegistration = action({
  args: {
    email: v.string(),
    response: v.string(), // JSON-stringified RegistrationResponseJSON
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const { rpID, origin } = getConfig();

    // Consume the stored challenge (one-time use)
    const expectedChallenge = await ctx.runMutation(
      api.passkeys.consumeWebAuthnChallenge,
      { email, type: "webauthn_registration" }
    );

    if (!expectedChallenge) {
      return {
        success: false,
        error: "Challenge expired or not found. Please try again.",
      };
    }

    const registrationResponse = JSON.parse(args.response);

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: "Verification failed. Please try again." };
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    // Store the credential in Convex
    const result = await ctx.runMutation(api.passkeys.storeCredential, {
      email,
      credentialId: credential.id,
      publicKey: uint8ArrayToBase64Url(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Create server-side session after successful registration
    let sessionToken: string | undefined;
    try {
      const member = await ctx.runQuery(api.members.getByEmail, { email });
      if (member) {
        const session = await ctx.runMutation(internal.sessions.create, {
          memberId: member._id as Id<"members">,
          email,
        });
        sessionToken = session.sessionToken;
      }
    } catch (err) {
      console.error("[WEBAUTHN] Session create failed after registration:", err);
    }

    return { success: true, sessionToken };
  },
});

/* ---------------------------------------------------------------------------
   Authentication: Generate options
   --------------------------------------------------------------------------- */

export const getAuthenticationOptions = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const { rpID } = getConfig();

    // Get existing credentials
    const credentials = await ctx.runQuery(api.passkeys.getCredentials, {
      email,
    });

    if (credentials.length === 0) {
      throw new Error(
        "No passkeys registered for this email. Please create an account first."
      );
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports,
      })),
      userVerification: "required",
      timeout: 300000,
    });

    // Store the challenge
    await ctx.runMutation(api.passkeys.storeWebAuthnChallenge, {
      challenge: options.challenge,
      email,
      type: "webauthn_authentication",
    });

    return options;
  },
});

/* ---------------------------------------------------------------------------
   Authentication: Verify response
   --------------------------------------------------------------------------- */

export const verifyAuthentication = action({
  args: {
    email: v.string(),
    response: v.string(), // JSON-stringified AuthenticationResponseJSON
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const { rpID, origin } = getConfig();

    // Consume the stored challenge
    const expectedChallenge = await ctx.runMutation(
      api.passkeys.consumeWebAuthnChallenge,
      { email, type: "webauthn_authentication" }
    );

    if (!expectedChallenge) {
      return {
        success: false,
        error: "Challenge expired or not found. Please try again.",
      };
    }

    const authResponse = JSON.parse(args.response);
    const credentialId = authResponse.id;

    // Get the full credential data for verification
    const credential = await ctx.runQuery(
      api.passkeys.getCredentialForAuth,
      { credentialId, email }
    );

    if (!credential) {
      return { success: false, error: "Credential not recognized." };
    }

    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credentialId,
        publicKey: base64UrlToUint8Array(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports,
      },
    });

    if (!verification.verified) {
      return { success: false, error: "Authentication failed." };
    }

    // Update counter and login count
    await ctx.runMutation(api.passkeys.updateCredentialAfterAuth, {
      credentialId: credential.credentialId,
      newCounter: verification.authenticationInfo.newCounter,
    });

    // Create server-side session
    let sessionToken: string | undefined;
    try {
      const member = await ctx.runQuery(api.members.getByEmail, { email });
      if (member) {
        const session = await ctx.runMutation(internal.sessions.create, {
          memberId: member._id as Id<"members">,
          email,
        });
        sessionToken = session.sessionToken;
      }
    } catch (err) {
      console.error("[WEBAUTHN] Session create failed after authentication:", err);
    }

    return { success: true, email, sessionToken };
  },
});
