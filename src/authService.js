import { config } from "./config.js";
// No demo module (and therefore no operational browser storage) is loaded in API mode.
export const authService = config.mode === "demo"
  ? (await import("./demo/session.js")).authService
  : (await import("./httpSession.js")).createHttpSession();
// Compatibility exports; consumers use the session subscription, never these storage keys.
export const DEMO_ROLE_STORAGE_KEY = "three-d-print-farm-demo-role";
export const DEMO_ACCOUNTS_STORAGE_KEY = "three-d-print-farm-demo-accounts";
