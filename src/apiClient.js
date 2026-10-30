import { config } from "./config.js";
import { ServiceError } from "./serviceError.js";
export const API_BASE_URL = config.apiBaseUrl;

export function createApiClient({ baseUrl = API_BASE_URL, fetchImpl = (...args) => fetch(...args), timeoutMs = 15000, onExpired = () => {}, csrfToken = () => null } = {}) {
  const origin = /^https?:\/\//.test(globalThis.location?.origin || "") ? globalThis.location.origin : "http://localhost";
  const base = new URL(baseUrl, origin);
  if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error("Invalid API base URL.");
  return {
    baseUrl: base.href.replace(/\/$/, ""),
    async request(path, { method = "GET", body, idempotencyKey, version, signal, binary = false } = {}) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
      const timer = setTimeout(abort, timeoutMs);
      const headers = { Accept: binary ? "application/octet-stream" : "application/json" };
      if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
      if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
      if (version != null) headers["If-Match"] = `"${version}"`;
      const csrf = csrfToken();
      if (csrf && method !== "GET") headers["X-CSRF-Token"] = csrf;
      try {
        const response = await fetchImpl(`${this.baseUrl}${path}`, { method, credentials: "include", cache: "no-store", headers,
          body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: controller.signal });
        if (!response.ok) {
          const codes = { 400: "validation", 401: "expired_session", 403: "permission_denied", 404: "not_found", 409: "conflict", 412: "conflict", 422: "validation", 429: "rate_limited" };
          const detail = await response.json().catch(() => ({}));
          const code = codes[response.status] || "server_error";
          if (code === "expired_session") onExpired();
          throw new ServiceError(code, typeof detail.error?.message === "string" ? detail.error.message : `The server returned HTTP ${response.status}.`, { status: response.status, fields: detail.error?.fields, requestId: detail.error?.requestId });
        }
        if (response.status === 204) return null;
        if (binary) return response.blob();
        const envelope = await response.json();
        if (!envelope || !Object.hasOwn(envelope, "data")) throw new ServiceError("invalid_response", "The server response does not match the API contract.");
        return envelope.data;
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        throw new ServiceError("network_error", "The server could not be reached. Retry the same operation when your connection returns.", { cause: error });
      } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
    },
  };
}
export const apiClient = createApiClient();
