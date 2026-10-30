import { validateRequest } from "./requestValidation.js";
import { ServiceError, validation } from "./serviceError.js";
import { PERMISSIONS as P } from "./authorization.js?v=2.2&rev=5";
import { MATERIALS, STATUSES } from "./data.js?v=2.2&rev=5";
import { config } from "./config.js";
export const newKey = () => crypto.randomUUID();
const id = value => encodeURIComponent(value);
const query = fields => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(fields)) if (value != null && value !== "") params.set(key, String(value)); return params.size ? `?${params}` : ""; };

export function createHttpServices({ session, files, client = session.client, pollInterval = config.pollInterval } = {}) {
  const versions = new Map(), retries = new Map(), pending = new Map();
  let scope = session.getCurrentIdentity()?.id;
  session.subscribe(() => { const next = session.getCurrentIdentity()?.id; if (scope !== next) { versions.clear(); retries.clear(); scope = next; } });
  function requirePermission(permission) {
    const status = session.getState().status;
    if (status !== "signed-in") throw new ServiceError(status === "expired-session" ? "expired_session" : "signed_out", "A current authenticated session is required.");
    if (permission && !session.can(permission)) throw new ServiceError("permission_denied", "Your account does not have permission for this operation.");
  }
  function remember(value, kind) {
    if (Array.isArray(value)) { value.forEach(item => remember(item, kind)); return value; }
    if (value && typeof value === "object") {
      if (value.id && value.version != null && kind && !versions.has(`${kind}:${value.id}`)) versions.set(`${kind}:${value.id}`, value.version);
      if (value.items) remember(value.items, kind);
      if (value.job) remember(value.job, "jobs");
      if (value.request) remember(value.request, "hour-requests");
      if (value.requests) remember(value.requests, "hour-requests");
    }
    return value;
  }
  async function read(path, kind, permission) {
    if (permission !== false) requirePermission(permission);
    const actor = session.getCurrentIdentity()?.id;
    const result = await client.request(path);
    if (actor !== session.getCurrentIdentity()?.id) throw new ServiceError("expired_session", "Your account changed while this page was loading.");
    return remember(result, kind);
  }
  async function page(path, filters = {}, kind, permission) {
    const result = await read(path + query(filters), kind, permission);
    if (!Array.isArray(result?.items) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.page) || result.page < 1 || !Number.isInteger(result.pageSize) || result.pageSize < 1 || result.pageSize > 100 || result.items.length > result.pageSize) throw new ServiceError("invalid_response", "The server returned an invalid paginated list.");
    return result;
  }
  async function all(path, filters = {}, kind, permission) {
    const first = await page(path, { ...filters, page: 1, pageSize: 100 }, kind, permission);
    const items = [...first.items];
    for (let n = 2; items.length < first.total; n++) {
      const next = await page(path, { ...filters, page: n, pageSize: 100 }, kind, permission);
      if (next.page !== n || !next.items.length || n > 10000) throw new ServiceError("invalid_response", "The paginated list changed or is incomplete. Refresh and retry.");
      items.push(...next.items);
    }
    return items;
  }
  function mutate(path, body = {}, { kind, recordId, permission, method = "POST", key } = {}) {
    requirePermission(permission);
    const actor = session.getCurrentIdentity().id;
    const version = recordId ? versions.get(`${kind}:${recordId}`) : undefined;
    if (recordId && version == null) throw new ServiceError("conflict", "Refresh and review this record before changing it.");
    const fingerprint = JSON.stringify([actor, path, method, body, version]);
    if (pending.has(fingerprint)) return pending.get(fingerprint);
    const idempotencyKey = key || retries.get(fingerprint) || newKey();
    retries.set(fingerprint, idempotencyKey);
    const operation = client.request(path, { method, body, version, idempotencyKey }).then(result => {
      if (session.getCurrentIdentity()?.id !== actor) throw new ServiceError("expired_session", "Your account changed. Reload to confirm the result.");
      retries.delete(fingerprint);
      if (recordId) versions.delete(`${kind}:${recordId}`);
      return remember(result, kind);
    }).catch(error => {
      if (error.code === "conflict" && recordId) versions.delete(`${kind}:${recordId}`);
      if (!["network_error", "server_error"].includes(error.code)) retries.delete(fingerprint);
      throw error;
    }).finally(() => pending.delete(fingerprint));
    pending.set(fingerprint, operation);
    return operation;
  }
  const jobAction = (jobId, action, body = {}, permission = P.JOBS_MANAGE) => mutate(`/jobs/${id(jobId)}/${action}`, body, { kind: "jobs", recordId: jobId, permission });
  const services = {
    jobsService: {
      mode: "api",
      listPage: filters => page("/jobs", filters, "jobs", P.JOBS_MANAGE),
      listJobs: filters => all("/jobs", filters, "jobs", P.JOBS_MANAGE),
      getJob: jobId => read(`/jobs/${id(jobId)}`, "jobs"),
      getMyJob: jobId => read(`/my/jobs/${id(jobId)}`, "jobs", P.MY_JOBS_VIEW),
      listMyJobs: () => all("/my/jobs", {}, "jobs", P.MY_JOBS_VIEW),
      listMyActiveJobs: () => all("/jobs", { assignedTo: "me", active: true }, "jobs", P.JOBS_MANAGE),
      summary: () => read("/jobs/summary", null, P.JOBS_MANAGE),
      async createJob(payload) {
        requirePermission(P.PRINT_REQUEST_CREATE);
        const actor = session.getCurrentIdentity().id;
        const source = validateRequest(payload);
        validation(typeof payload.submissionKey === "string" && payload.submissionKey.length >= 8 && payload.submissionKey.length <= 120, "A request idempotency key is required.");
        const stored = source.files.length ? await files.upload(source.files, { idempotencyKey: `${payload.submissionKey}-files` }) : source.attachments;
        await files.verify(stored);
        if (actor !== session.getCurrentIdentity()?.id) throw new ServiceError("expired_session", "Your account changed. Reopen your request form.");
        // Only contract fields cross the trust boundary. Ownership, role, status and snapshots are server-owned.
        const body = { projectName: payload.projectName.trim(), purpose: payload.purpose || "Personal project", notes: payload.notes || "", inventoryId: payload.inventoryId,
          requestedFilament: { material: payload.material, color: payload.color },
          modelUrl: source.modelUrl || null, attachmentIds: stored.map(a => a.id),
          ...(payload.layerHeight != null ? { layerHeight: payload.layerHeight } : {}), ...(payload.infill != null ? { infill: Number(payload.infill) } : {}) };
        return mutate("/jobs", body, { kind: "jobs", permission: P.PRINT_REQUEST_CREATE, key: payload.submissionKey });
      },
      claimJob: jobId => jobAction(jobId, "claim"),
      reassignJob: (jobId, assigneeId) => jobAction(jobId, "assignment", { assigneeId }, P.JOBS_REASSIGN),
      reviewRequest: (jobId, decision, reason = "") => jobAction(jobId, "review", { decision, reason }, P.JOBS_APPROVE),
      requestAuthorization: jobId => jobAction(jobId, "authorization-request"),
      reviewAuthorization: (jobId, decision, reason = "", expectedRequestedAt = null, expectedAuthorizationId = null) => jobAction(jobId, "authorization-review", { decision, reason, expectedRequestedAt, expectedAuthorizationId }, P.JOBS_APPROVE),
      startPrinting: jobId => jobAction(jobId, "start"),
      completeJob: (jobId, payload) => jobAction(jobId, "complete", payload),
      updatePickup: (jobId, payload) => jobAction(jobId, "pickup", payload),
      collectJob: jobId => jobAction(jobId, "collect"),
      listJobEvents: jobId => read(`/jobs/${id(jobId)}/events`),
      getMaterials: async () => structuredClone(MATERIALS),
      availableStatuses: () => [...STATUSES],
      currentStudent: () => session.getCurrentIdentity(), currentStaff: () => session.getCurrentIdentity(),
      getDraft: () => read("/my/draft"),
      saveDraft: fields => mutate("/my/draft", { schemaVersion: 1, fields }, { method: "PUT" }).then(() => true),
      discardDraft: () => mutate("/my/draft", undefined, { method: "DELETE" }),
    },
    inventoryService: {
      listInventory: () => all("/inventory", {}, "inventory", false),
      listAvailable: () => all("/inventory", { available: true }, "inventory", false),
      getItem: itemId => read(`/inventory/${id(itemId)}`, "inventory", false),
      add: payload => mutate("/inventory", payload, { kind: "inventory", permission: P.FILAMENT_CHANGE }),
      update: (itemId, payload) => mutate(`/inventory/${id(itemId)}`, payload, { method: "PATCH", kind: "inventory", recordId: itemId, permission: P.FILAMENT_CHANGE }),
      toggleAvailability: itemId => mutate(`/inventory/${id(itemId)}/availability`, {}, { kind: "inventory", recordId: itemId, permission: P.FILAMENT_CHANGE }),
      toggleLowStock: itemId => mutate(`/inventory/${id(itemId)}/low-stock`, {}, { kind: "inventory", recordId: itemId, permission: P.FILAMENT_CHANGE }),
      remove: itemId => mutate(`/inventory/${id(itemId)}`, undefined, { method: "DELETE", kind: "inventory", recordId: itemId, permission: P.FILAMENT_CHANGE }),
    },
    inboxService: { list: () => all("/my/inbox"), open: entryId => mutate(`/my/inbox/${id(entryId)}/open`) },
    notificationsService: {
      mode: "api", listForJob: jobId => all("/notifications", { jobId }, "notifications", P.JOBS_MANAGE),
      get: notificationId => read(`/notifications/${id(notificationId)}`, "notifications", P.JOBS_MANAGE),
      retry: notificationId => mutate(`/notifications/${id(notificationId)}/retry`, {}, { kind: "notifications", recordId: notificationId, permission: P.NOTIFICATIONS_RETRY }),
    },
    presenceService: { list: () => read("/presence", null, P.JOBS_MANAGE), set: present => mutate("/presence/me", { present }, { method: "PUT", permission: P.SUPERVISOR_PRESENCE }) },
    directoryService: { listStaff: () => all("/staff", {}, null, P.JOBS_MANAGE) },
    contributionsService: {
      list: filters => all("/contributions", filters, "contributions", P.CONTRIBUTIONS_MANAGE),
      listAll: () => all("/contributions", {}, "contributions", P.CONTRIBUTIONS_MANAGE),
      add: payload => mutate("/contributions", payload, { kind: "contributions", permission: P.CONTRIBUTIONS_MANAGE }),
      update: (recordId, payload) => mutate(`/contributions/${id(recordId)}`, payload, { method: "PATCH", kind: "contributions", recordId, permission: P.CONTRIBUTIONS_MANAGE }),
    },
    hoursService: {
      newSubmissionKey: newKey,
      getOwnDashboard: () => read("/my/hours", null, P.HOURS_VIEW_OWN),
      getStaffOverview: search => all("/hours/staff", { search }, "balances", P.HOURS_ADMIN),
      getStaffDetail: userId => read(`/hours/staff/${id(userId)}`, "balances", P.HOURS_ADMIN),
      getAdminActivity: userId => read(`/hours/staff/${id(userId)}/activity`, null, P.HOURS_ADMIN),
      listRequests: status => all("/hour-requests", { status }, "hour-requests", P.HOURS_ADMIN),
      submitRequest: payload => mutate("/hour-requests", payload, { kind: "hour-requests", permission: P.HOURS_REQUEST, key: payload.submissionKey }),
      giveHours: (userId, payload) => mutate(`/hours/staff/${id(userId)}/contributions`, payload, { kind: "balances", recordId: userId, permission: P.HOURS_ADMIN, key: payload.submissionKey }),
      adjustStaffHours: (userId, payload) => mutate(`/hours/staff/${id(userId)}/adjustments`, payload, { kind: "balances", recordId: userId, permission: P.HOURS_ADMIN, key: payload.submissionKey }),
      approveRequest: requestId => mutate(`/hour-requests/${id(requestId)}/approve`, {}, { kind: "hour-requests", recordId: requestId, permission: P.HOURS_ADMIN }),
      rejectRequest: (requestId, rejectionReason = "") => mutate(`/hour-requests/${id(requestId)}/reject`, { rejectionReason }, { kind: "hour-requests", recordId: requestId, permission: P.HOURS_ADMIN }),
    },
    diagnosticsService: { getStatus: () => ({ issues: [], writesBlocked: false }) },
    resetLocalData() { throw new ServiceError("permission_denied", "Local demo reset is unavailable in API mode."); },
    refreshService: {
      async refresh() { await session.load(); },
      async reload() { versions.clear(); await session.load(); },
      subscribe(listener) {
        let running = false;
        const tick = async () => { if (running || globalThis.document?.hidden) return; running = true; try { await listener(); } finally { running = false; } };
        const timer = setInterval(() => void tick(), Math.max(1000, Number(pollInterval) || 30000));
        globalThis.window?.addEventListener("online", tick);
        return () => { clearInterval(timer); globalThis.window?.removeEventListener("online", tick); };
      },
    },
  };
  return services;
}
