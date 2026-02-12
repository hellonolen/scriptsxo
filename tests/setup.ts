import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  get length() {
    return Object.keys(localStorageMock.store).length;
  },
  key: vi.fn(
    (index: number) => Object.keys(localStorageMock.store)[index] || null
  ),
};

Object.defineProperty(window, "localStorage", { value: localStorageMock });
Object.defineProperty(window, "sessionStorage", { value: localStorageMock });

let cookieStore: Record<string, string> = {};
Object.defineProperty(document, "cookie", {
  get: vi.fn(() =>
    Object.entries(cookieStore)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ")
  ),
  set: vi.fn((cookieString: string) => {
    const [nameValue] = cookieString.split(";");
    const [name, value] = nameValue.split("=");
    if (
      value === "" ||
      cookieString.includes("expires=Thu, 01 Jan 1970")
    ) {
      delete cookieStore[name.trim()];
    } else {
      cookieStore[name.trim()] = value;
    }
  }),
});

beforeEach(() => {
  localStorageMock.store = {};
  cookieStore = {};
  vi.clearAllMocks();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(globalThis, "crypto", {
  value: {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++)
        array[i] = Math.floor(Math.random() * 256);
      return array;
    }),
    subtle: {
      digest: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  },
});

Object.defineProperty(navigator, "credentials", {
  value: { create: vi.fn(), get: vi.fn() },
});
Object.defineProperty(window, "PublicKeyCredential", {
  value: {
    isUserVerifyingPlatformAuthenticatorAvailable: vi
      .fn()
      .mockResolvedValue(true),
  },
});

const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("act(") ||
        args[0].includes("Expected test error"))
    )
      return;
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});

export { vi, localStorageMock, cookieStore };
