import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,

    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/convex/_generated/**",
        ".next/",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },

    include: [
      "tests/**/*.test.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
    ],

    exclude: [
      "node_modules",
      ".next",
      "convex/_generated",
      "tests/e2e/**",
    ],

    testTimeout: 10000,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@convex": path.resolve(__dirname, "./convex"),
    },
  },
});
