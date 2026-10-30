// Set PRINT_FARM_CONFIG before loading app.js. Never infer API mode from connectivity.
export const config = Object.freeze({
  mode: globalThis.PRINT_FARM_CONFIG?.MODE ?? "demo",
  apiBaseUrl: globalThis.PRINT_FARM_CONFIG?.API_BASE_URL ?? "/api/v1",
  pollInterval: globalThis.PRINT_FARM_CONFIG?.POLL_INTERVAL_MS ?? 30000,
});
if (!["demo", "api"].includes(config.mode)) throw new Error("PRINT_FARM_CONFIG.MODE must be demo or api.");
