import { createApiClient } from "./apiClient.js?v=2.2&rev=5";
import { getRole } from "./authorization.js?v=2.2&rev=5";
import { ServiceError } from "./serviceError.js";

export function createHttpSession(options = {}) {
  let snapshot = { status: "loading", user: null, permissions: [], error: null };
  let csrf = null;
  let generation = 0;
  let pending;
  const listeners = new Set();
  const emit = (next) => { const changed = JSON.stringify(snapshot) !== JSON.stringify(next); snapshot = next; if (changed) for (const listener of listeners) listener(session.getState()); };
  const client = createApiClient({ ...options, csrfToken: () => csrf, onExpired: () => session.expire() });
  const session = {
    mode: "api", client,
    getState: () => structuredClone(snapshot),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    expire() { generation++; csrf = null; emit({ status: "expired-session", user: null, permissions: [], error: null }); },
    async load() {
      if (pending) return pending;
      const call = ++generation;
      pending = (async () => {
        try {
          const result = await client.request("/session");
          if (call !== generation) return session.getState();
          if (result?.status === "signed-out") { csrf = null; emit({ status: "signed-out", user: null, permissions: [], error: null }); }
          else {
            if (result?.status !== "signed-in" || typeof result.user?.id !== "string" || !result.user.id || typeof result.user.name !== "string" || typeof result.user.email !== "string" || !getRole(result.user.roleId) || !Array.isArray(result.permissions) || !result.permissions.every(p => typeof p === "string") || typeof result.csrfToken !== "string" || !result.csrfToken) throw new ServiceError("invalid_response", "The session response is incomplete. Ask the server administrator to review it.");
            csrf = result.csrfToken;
            emit({ status: "signed-in", user: { ...result.user, authenticationMode: "server" }, permissions: [...result.permissions], error: null });
          }
        } catch (error) {
          if (call === generation) { csrf = null; emit({ status: error.code === "expired_session" ? "expired-session" : "error", user: null, permissions: [], error: { code: error.code, message: error.message } }); }
        }
        return session.getState();
      })().finally(() => { pending = null; });
      return pending;
    },
    getCurrentIdentity: () => snapshot.user ? { ...snapshot.user } : null,
    getCurrentRole: () => snapshot.user ? getRole(snapshot.user.roleId) : null,
    getActiveRoleId: () => snapshot.user?.roleId ?? null,
    can: permission => snapshot.status === "signed-in" && snapshot.permissions.includes(permission),
    getDemoIdentities: () => [],
    switchRole: () => false,
    createDemoAccount() { throw new ServiceError("permission_denied", "Local demo accounts are unavailable in API mode."); },
    resetSession() { session.expire(); },
  };
  return session;
}
