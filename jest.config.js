/**
 * Jest configuration for Ustaad.
 *
 * Two modes:
 *   1. `npm test`             — pure unit tests (design patterns, pure logic).
 *                               No DB, no network. Fast (<1s).
 *   2. `npm run test:integration` — hits a running dev server at
 *                               http://localhost:3000 and exercises every
 *                               public API endpoint end-to-end.
 *
 * Integration tests live in __tests__/integration/ and are gated behind
 * USTAAD_RUN_INTEGRATION=1 so a default `npm test` does NOT require a
 * dev server.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/__tests__/**/*.test.ts",
    "<rootDir>/__tests__/**/*.test.tsx",
  ],
  testPathIgnorePatterns: process.env.USTAAD_RUN_INTEGRATION
    ? ["/node_modules/"]
    : ["/node_modules/", "<rootDir>/__tests__/integration/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: [
    "lib/patterns/**/*.ts",
    "lib/repositories/**/*.ts",
  ],
  verbose: true,
};
