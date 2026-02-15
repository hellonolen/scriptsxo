/**
 * WEBAUTHN CLIENT HELPERS
 * Wraps @simplewebauthn/browser for device-bound passkey authentication.
 * Platform authenticators only (Face ID, Touch ID, Windows Hello).
 */
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

/**
 * Check if the browser supports WebAuthn.
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

/**
 * Check if a platform authenticator (Face ID, Touch ID, Windows Hello) is available.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Start passkey registration (triggers biometric prompt).
 * Returns the registration response to send back to the server.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerPasskey(options: any) {
  return startRegistration({ optionsJSON: options });
}

/**
 * Start passkey authentication (triggers biometric prompt).
 * Returns the authentication response to send back to the server.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function authenticatePasskey(options: any) {
  return startAuthentication({ optionsJSON: options });
}
