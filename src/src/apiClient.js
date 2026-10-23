// The REST adapter is intentionally inactive in the frontend MVP.
export const API_BASE_URL = globalThis.PRINT_FARM_CONFIG?.API_BASE_URL || "/api/v1";

export const apiClient = {
  baseUrl: API_BASE_URL,
  async request() {
    throw new Error("The API client is a future integration seam; this app currently uses local mock services.");
  },
};
