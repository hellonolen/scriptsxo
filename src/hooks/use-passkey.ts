"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  setSessionCookie,
  setAdminCookie,
  clearSessionCookie,
  clearAllAuthCookies,
  getSessionCookie,
  createSession,
  createAdminSession,
  type Session,
} from "@/lib/auth";

/**
 * DEVICE-MEMORY PASSKEY AUTHENTICATION
 *
 * ZERO browser dialogs. ZERO navigator.credentials calls.
 *
 * Uses Web Crypto API (ECDSA P-256) + IndexedDB for device-only keys.
 * The private key NEVER leaves the device. The public key is stored in Convex.
 *
 * Flow:
 *   Register: Generate ECDSA key pair -> store private key in IndexedDB -> send public key to Convex
 *   Authenticate: Get challenge from Convex -> sign with local private key -> verify on server
 *
 * Sessions stored in:
 *   - localStorage (fast client-side state)
 *   - Cookies (middleware route protection)
 */

// ============================================
// IndexedDB Key Storage (Device Memory Only)
// ============================================

const DB_NAME = "scriptsxo_keys";
const DB_VERSION = 1;
const STORE_NAME = "credentials";

interface StoredCredential {
  email: string;
  credentialId: string;
  privateKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  createdAt: number;
}

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (event) => {
        console.error(
          "[SXO-AUTH] IndexedDB open error:",
          (event.target as IDBOpenDBRequest).error
        );
        reject(new Error("idb_open_failed"));
      };
      request.onblocked = () => {
        console.warn("[SXO-AUTH] IndexedDB blocked -- close other tabs");
        reject(new Error("idb_blocked"));
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "credentialId",
          });
          store.createIndex("by_email", "email", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
    } catch (err) {
      console.error("[SXO-AUTH] IndexedDB not available:", err);
      reject(new Error("idb_unavailable"));
    }
  });
}

async function storeKeyLocally(credential: StoredCredential): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(credential);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(new Error("Failed to store key"));
    };
  });
}

async function getLocalCredentials(): Promise<StoredCredential[]> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(new Error("Failed to read keys"));
    };
  });
}

async function getLocalCredentialByEmail(
  email: string
): Promise<StoredCredential | null> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("by_email");
    const request = index.get(email.toLowerCase());
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(new Error("Failed to read key"));
    };
  });
}

// ============================================
// Crypto Utilities (Web Crypto API - ECDSA P-256)
// ============================================

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false, // NOT extractable
    ["sign", "verify"]
  );
}

async function exportPublicKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey("jwk", key);
}

async function signChallenge(
  privateKey: CryptoKey,
  challenge: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(challenge);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    data
  );
  return arrayBufferToBase64url(signature);
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function generateCredentialId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return arrayBufferToBase64url(bytes.buffer);
}

// ============================================
// Session Storage
// ============================================

const SESSIONKEY = "scriptsxo_session";

export type PasskeySession = Session;

export interface UsePasskeyReturn {
  register: (
    email: string,
    name?: string
  ) => Promise<{ success: boolean; error?: string }>;
  authenticate: (
    email?: string
  ) => Promise<{ success: boolean; email?: string; error?: string }>;
  getSession: () => PasskeySession | null;
  signOut: () => void;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
}

export function isPasskeySupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.crypto?.subtle && window.indexedDB);
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  return isPasskeySupported();
}

// ============================================
// Main Hook
// ============================================

export function usePasskey(): UsePasskeyReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createChallenge = useMutation(api.passkeys.createChallenge);
  const storeCredential = useMutation(api.passkeys.storeCredential);
  const verifyCredential = useMutation(api.passkeys.verifyCredential);

  const register = useCallback(
    async (
      email: string,
      name?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!isPasskeySupported()) {
        setError("Device key storage is not available on this device.");
        return { success: false, error: "Not supported" };
      }

      setIsLoading(true);
      setError(null);

      try {
        const keyPair = await generateKeyPair();
        const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey);
        const credentialId = generateCredentialId();

        const result = await storeCredential({
          email: email.toLowerCase(),
          credentialId,
          publicKey: JSON.stringify(publicKeyJwk),
          counter: 0,
          deviceType: "platform",
          transports: ["internal"],
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to store credential");
        }

        await storeKeyLocally({
          email: email.toLowerCase(),
          credentialId,
          privateKey: keyPair.privateKey,
          publicKeyJwk,
          createdAt: Date.now(),
        });

        const session = createSession(email, name);
        setSessionCookie(session);
        localStorage.setItem(SESSIONKEY, JSON.stringify(session));

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Registration failed";
        console.error("Device key registration error:", message);
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [storeCredential]
  );

  const authenticate = useCallback(
    async (
      email?: string
    ): Promise<{ success: boolean; email?: string; error?: string }> => {
      console.debug("[SXO-AUTH] Starting authentication...");

      if (!isPasskeySupported()) {
        console.error("[SXO-AUTH] Device not supported:", {
          crypto: !!window.crypto,
          subtle: !!window.crypto?.subtle,
          indexedDB: !!window.indexedDB,
        });
        setError("Device key storage is not available on this device.");
        return { success: false, error: "Not supported" };
      }

      setIsLoading(true);
      setError(null);

      try {
        console.debug("[SXO-AUTH] Step 1: Reading IndexedDB...");
        let localCreds: StoredCredential[];

        if (email) {
          const cred = await getLocalCredentialByEmail(email.toLowerCase());
          localCreds = cred ? [cred] : [];
        } else {
          localCreds = await getLocalCredentials();
        }

        console.debug(`[SXO-AUTH] Found ${localCreds.length} credential(s)`);

        if (localCreds.length === 0) {
          setError(
            "No device key found. Please register a new account or use the device where you originally signed up."
          );
          return { success: false, error: "not_found" };
        }

        const credential = localCreds[0];
        console.debug(
          `[SXO-AUTH] Step 2: Requesting challenge for ${credential.email}...`
        );

        const { challenge } = await createChallenge({
          email: credential.email,
          type: "authentication",
        });
        console.debug("[SXO-AUTH] Step 3: Got challenge, signing...");

        const signature = await signChallenge(credential.privateKey, challenge);
        console.debug("[SXO-AUTH] Step 4: Signed, verifying with server...");

        const result = await verifyCredential({
          credentialId: credential.credentialId,
          signature,
          challenge,
        });

        if (!result.success) {
          console.error("[SXO-AUTH] Server rejected:", result.error);
          throw new Error(result.error || "Verification failed");
        }

        console.debug("[SXO-AUTH] Step 5: Verified! Creating session...");

        const session = createSession(
          result.email!,
          result.email?.split("@")[0]
        );
        setSessionCookie(session);
        localStorage.setItem(SESSIONKEY, JSON.stringify(session));

        console.debug("[SXO-AUTH] Authentication complete.");
        return { success: true, email: result.email };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Authentication failed";
        const errorName = err instanceof Error ? err.name : "unknown";
        console.error("[SXO-AUTH] Error:", { name: errorName, message, err });

        if (
          message.includes("not found") ||
          message.includes("No credential") ||
          message.includes("No device key")
        ) {
          setError(
            "No device key found on this device. Please register or use your original device."
          );
          return { success: false, error: "not_found" };
        }

        if (
          message.includes("idb_") ||
          message.includes("IndexedDB") ||
          message.includes("QuotaExceededError")
        ) {
          setError(
            "Unable to access secure storage on this device. Make sure you're not in Private Browsing mode."
          );
          return { success: false, error: "storage_error" };
        }

        if (
          errorName === "AbortError" ||
          errorName === "NotAllowedError" ||
          message.toLowerCase().includes("cancel") ||
          message.toLowerCase().includes("abort") ||
          message.includes("The operation")
        ) {
          setError(
            "Sign in was interrupted. Please tap the button and wait a moment."
          );
          return { success: false, error: "interrupted" };
        }

        if (
          message.includes("network") ||
          message.includes("fetch") ||
          message.includes("Failed to fetch")
        ) {
          setError(
            "Connection error. Please check your internet connection."
          );
          return { success: false, error: "network_error" };
        }

        if (
          message.includes("key") ||
          message.includes("sign") ||
          message.includes("CryptoKey")
        ) {
          setError(
            "Your device key may be corrupted. Please register again with a new key."
          );
          return { success: false, error: "key_error" };
        }

        setError(
          "Authentication failed. Please try again or register a new device key."
        );
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [createChallenge, verifyCredential]
  );

  const getSession = useCallback((): PasskeySession | null => {
    if (typeof window === "undefined") return null;

    const stored = localStorage.getItem(SESSIONKEY);
    if (stored) {
      try {
        const session = JSON.parse(stored) as PasskeySession;
        if (session.expiresAt < Date.now()) {
          localStorage.removeItem(SESSIONKEY);
          clearSessionCookie();
          return null;
        }
        return session;
      } catch {
        localStorage.removeItem(SESSIONKEY);
      }
    }

    const cookieSession = getSessionCookie();
    if (cookieSession) {
      localStorage.setItem(SESSIONKEY, JSON.stringify(cookieSession));
      return cookieSession;
    }

    return null;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSIONKEY);
    clearAllAuthCookies();
  }, []);

  return {
    register,
    authenticate,
    getSession,
    signOut,
    isLoading,
    error,
    isSupported: isPasskeySupported(),
  };
}

/**
 * Hook to check passkey status for an email (uses Convex query)
 */
export function useHasPasskey(email: string | undefined) {
  const hasPasskey = useQuery(
    api.passkeys.hasPasskey,
    email ? { email } : "skip"
  );
  return hasPasskey ?? false;
}
