import {
  MATERIALS,
  MOCK_JOBS,
  MOCK_NOTIFICATIONS,
  STATUSES,
} from "./data.js?v=2.2&rev=5";
import { authService, DEMO_ACCOUNTS_STORAGE_KEY, DEMO_ROLE_STORAGE_KEY } from "./authService.js?v=2.2&rev=5";
import { getRole, PERMISSIONS } from "./authorization.js?v=2.2&rev=5";
import { API_BASE_URL } from "./apiClient.js?v=2.2&rev=5";
import { filesService } from "./filesService.js?v=2.2&rev=5";

import { projectInboxEvents } from "./inboxEvents.js?v=2.2&rev=5";
import { claimable, initiallyApproved, isAssignedTo, staffCanSeeJob } from "./jobWorkflow.js?v=2.2&rev=5";

const STORE_KEY = "three-d-print-farm-demo-v3";
const DRAFT_KEY = "three-d-print-farm-draft-v2";
export const LOCAL_DATA_KEYS = Object.freeze([
  STORE_KEY, DRAFT_KEY, DEMO_ACCOUNTS_STORAGE_KEY, DEMO_ROLE_STORAGE_KEY,
  "three-d-print-farm-accent", "three-d-print-farm-theme", "three-d-print-farm-glass-transparency",
]);
const simulationTimers = new Set();
const CLOSED_STATUSES = new Set(["COMPLETED", "COLLECTED", "CANCELLED", "REJECTED"]);
const clone = (value) => JSON.parse(JSON.stringify(value));
const LEGACY_CSS_COLORS = {
  black: "#000000", blue: "#0000FF", gray: "#808080", grey: "#808080",
  green: "#008000", orange: "#FFA500", pink: "#FFC0CB", purple: "#800080",
  red: "#FF0000", white: "#FFFFFF", yellow: "#FFFF00", brown: "#A52A2A",
};

function normalizeHex(value) {
  const match = /^#?([\da-f]{6})$/i.exec(String(value || "").trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

export function rgbFromHex(value) {
  const hex = normalizeHex(value);
  if (!hex) return "";
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return `RGB(${red}, ${green}, ${blue})`;
}

function normalizeInventoryItem(item) {
  const color = typeof item.color === "string" ? item.color.trim() : "";
  const quantity = Number(item.quantity);
  const threshold = Number(item.lowStockThreshold);
  const isLegacyStatus = typeof item.lowStock !== "boolean";
  const lowStock = typeof item.lowStock === "boolean"
    ? item.lowStock
    : Number.isFinite(quantity) && quantity > 0 && Number.isFinite(threshold) && quantity <= threshold;
  return {
    id: item.id,
    material: typeof item.material === "string" ? item.material.trim() : "",
    color,
    hexColor: normalizeHex(item.hexColor) || LEGACY_CSS_COLORS[color.toLowerCase()] || "",
    lowStock,
    available: item.available === true && !(isLegacyStatus && Number.isFinite(quantity) && quantity <= 0),
    ...(typeof item.createdAt === "string" ? { createdAt: item.createdAt } : {}),
    ...(typeof item.updatedAt === "string" ? { updatedAt: item.updatedAt } : {}),
  };
}

function inventoryNeedsMigration(original, normalized) {
  if (!Array.isArray(original) || original.length !== normalized.length) return true;
  const supportedKeys = new Set(["id", "material", "color", "hexColor", "lowStock", "available", "createdAt", "updatedAt"]);
  return original.some((item, index) => {
    const current = normalized[index];
    return !item
      || Object.keys(item).some((key) => !supportedKeys.has(key))
      || item.id !== current.id
      || item.material !== current.material
      || item.color !== current.color
      || item.hexColor !== current.hexColor
      || item.lowStock !== current.lowStock
      || item.available !== current.available;
  });
}

function seedState() {
  return normalizeState({
    jobs: clone(MOCK_JOBS),
    notifications: clone(MOCK_NOTIFICATIONS),
    inventory: [],
    contributions: [],
    hours: { transactions: [], requests: [] },
    inbox: [],
    supervisorPresence: {},
  });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidState(value) {
  if (
    !isRecord(value)
    || !Array.isArray(value.jobs)
    || !Array.isArray(value.notifications)
  ) {
    return false;
  }

  const jobsAreValid = value.jobs.every((job) => (
    isRecord(job)
    && typeof job.id === "string"
    && typeof job.projectName === "string"
    && typeof job.submitterName === "string"
    && typeof job.submitterEmail === "string"
    && typeof job.recipientEmail === "string"
    && typeof job.fileName === "string"
    && typeof job.fileSize === "string"
    && typeof job.material === "string"
    && typeof job.color === "string"
    && typeof job.submittedAt === "string"
    && STATUSES.includes(job.status)
    && (job.assignedStaff == null || typeof job.assignedStaff === "string")
    && (job.history === undefined || job.history === null || Array.isArray(job.history))
  ));
  const notificationsAreValid = value.notifications.every((notification) => (
    isRecord(notification)
    && typeof notification.id === "string"
    && typeof notification.jobId === "string"
    && typeof notification.recipientEmail === "string"
    && typeof notification.subject === "string"
    && typeof notification.createdAt === "string"
    && ["PENDING", "SENT", "FAILED"].includes(notification.status)
  ));

  const inventoryIsValid = value.inventory === undefined || (
    Array.isArray(value.inventory)
    && value.inventory.every((item) => (
      isRecord(item)
      && typeof item.id === "string"
      && typeof item.material === "string"
      && typeof item.color === "string"
      && (item.hexColor === undefined || typeof item.hexColor === "string")
      && (item.lowStock === undefined || typeof item.lowStock === "boolean")
      && (item.available === undefined || typeof item.available === "boolean")
    ))
  );
  const contributionsAreValid = value.contributions === undefined || (
    Array.isArray(value.contributions)
    && value.contributions.every((item) => (
      isRecord(item)
      && typeof item.id === "string"
      && typeof item.student === "string"
      && typeof item.date === "string"
      && Number.isFinite(Number(item.hours))
      && Number(item.hours) > 0
      && typeof item.activity === "string"
      && (item.staffId === undefined || typeof item.staffId === "string")
      && (item.submissionKey === undefined || typeof item.submissionKey === "string")
    ))
  );

  const validTimestamp = (timestamp) => typeof timestamp === "string" && !Number.isNaN(Date.parse(timestamp));
  const hoursAreValid = value.hours === undefined || (
    isRecord(value.hours)
    && Array.isArray(value.hours.transactions)
    && Array.isArray(value.hours.requests)
    && value.hours.transactions.every((transaction) => (
      isRecord(transaction)
      && typeof transaction.id === "string"
      && typeof transaction.userId === "string"
      && Number.isSafeInteger(transaction.deltaCenti)
      && transaction.deltaCenti !== 0
      && Number.isSafeInteger(transaction.balanceBeforeCenti)
      && transaction.balanceBeforeCenti >= 0
      && Number.isSafeInteger(transaction.balanceAfterCenti)
      && transaction.balanceAfterCenti >= 0
      && transaction.balanceBeforeCenti + transaction.deltaCenti === transaction.balanceAfterCenti
      && typeof transaction.reason === "string"
      && ["manual", "request", "contribution"].includes(transaction.source)
      && (transaction.submissionKey === undefined || typeof transaction.submissionKey === "string")
      && (transaction.contributionId === undefined || typeof transaction.contributionId === "string")
      && (transaction.workDate === undefined || /^\d{4}-\d{2}-\d{2}$/.test(transaction.workDate))
      && typeof transaction.actorId === "string"
      && typeof transaction.actorName === "string"
      && (transaction.requestId === null || typeof transaction.requestId === "string")
      && validTimestamp(transaction.createdAt)
    ))
    && value.hours.requests.every((request) => (
      isRecord(request)
      && typeof request.id === "string"
      && typeof request.submissionKey === "string"
      && typeof request.requesterId === "string"
      && typeof request.requesterName === "string"
      && Number.isInteger(request.requesterLevel)
      && ["add", "subtract"].includes(request.adjustmentType)
      && Number.isSafeInteger(request.hoursCenti)
      && request.hoursCenti > 0
      && typeof request.reason === "string"
      && ["Pending", "Approved", "Rejected"].includes(request.status)
      && validTimestamp(request.submittedAt)
      && (request.reviewedById === null || typeof request.reviewedById === "string")
      && (request.reviewedByName === null || typeof request.reviewedByName === "string")
      && (request.decidedAt === null || validTimestamp(request.decidedAt))
      && typeof request.rejectionReason === "string"
      && (request.transactionId === null || typeof request.transactionId === "string")
      && (request.status === "Pending"
        ? request.reviewedById === null && request.decidedAt === null && request.transactionId === null
        : request.reviewedById !== null && request.decidedAt !== null
          && (request.status === "Approved" ? request.transactionId !== null : request.transactionId === null))
    ))
  );

  const inboxValid = value.inbox === undefined || (Array.isArray(value.inbox) && value.inbox.every((item) =>
    isRecord(item) && typeof item.id === "string" && typeof item.userId === "string"
    && typeof item.eventKey === "string" && typeof item.createdAt === "string"
    && typeof item.title === "string" && typeof item.summary === "string"));
  return jobsAreValid && notificationsAreValid && inventoryIsValid && contributionsAreValid && hoursAreValid && inboxValid;
}

function normalizeState(value) {
  return {
    ...value,
    jobs: value.jobs.map((job) => ({
      ...job,
      assignedStaff: job.assignedStaff ?? null,
      assignedStaffId: job.assignedStaffId || authService.getDemoIdentities().find((person) => person.name === job.assignedStaff)?.id || null,
      // Grandfather work already in progress without fabricating a supervisor decision or time.
      initialApproval: job.initialApproval || (job.status === "SUBMITTED" || job.status === "REJECTED"
        ? null : { legacy: true }),
      // Keep sparse legacy records; absent events never acquire invented timestamps.
      history: (Array.isArray(job.history) ? job.history : []).filter((event) => (
        isRecord(event) && typeof event.type === "string"
      )).map((event) => ({
        ...event,
        at: typeof event.at === "string" && Number.isFinite(Date.parse(event.at)) ? event.at : null,
        by: typeof event.by === "string" ? event.by : "Not recorded",
      })),
    })),
    inbox: Array.isArray(value.inbox) ? value.inbox : [],
    supervisorPresence: isRecord(value.supervisorPresence) ? value.supervisorPresence : {},
    inventory: Array.isArray(value.inventory) ? value.inventory.map(normalizeInventoryItem) : [],
    contributions: Array.isArray(value.contributions) ? value.contributions : [],
    hours: isRecord(value.hours) ? value.hours : { transactions: [], requests: [] },
  };
}

function identityForContribution(item) {
  const identities = authService.getDemoIdentities();
  const identity = item.staffId
    ? identities.find((candidate) => candidate.id === item.staffId)
    : identities.find((candidate) => candidate.name.toLowerCase() === String(item.student || "").trim().toLowerCase());
  const role = identity && getRole(identity.roleId);
  return identity && role && role.level >= 2 && role.level <= 3 ? { identity, role } : null;
}

function migrateLegacyStaffContributions(value) {
  const existingContributionIds = new Set(value.hours.transactions.map((transaction) => transaction.contributionId).filter(Boolean));
  const legacyRecords = value.contributions
    .filter((item) => item.id && !existingContributionIds.has(item.id) && identityForContribution(item))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  if (!legacyRecords.length) return false;

  let timestamp = Date.now();
  let migratedCount = 0;
  for (const contribution of legacyRecords) {
    const matched = identityForContribution(contribution);
    const userId = matched.identity.id;
    const hoursCenti = Math.round(Number(contribution.hours) * 100);
    if (!Number.isSafeInteger(hoursCenti) || hoursCenti <= 0) continue;
    const balanceBeforeCenti = value.hours.transactions
      .filter((transaction) => transaction.userId === userId)
      .reduce((sum, transaction) => sum + transaction.deltaCenti, 0);
    const balanceAfterCenti = balanceBeforeCenti + hoursCenti;
    if (!Number.isSafeInteger(balanceAfterCenti)) continue;
    const actor = authService.getDemoIdentities().find((identity) => identity.name.toLowerCase() === String(contribution.createdBy || "").trim().toLowerCase());
    const transaction = {
      id: `HTXN-CONTRIBUTION-${contribution.id}`,
      userId,
      deltaCenti: hoursCenti,
      balanceBeforeCenti,
      balanceAfterCenti,
      reason: String(contribution.activity || "Legacy contribution record"),
      source: "contribution",
      actorId: actor?.id || "legacy-contribution",
      actorName: String(contribution.createdBy || "Legacy contribution record"),
      requestId: null,
      contributionId: contribution.id,
      workDate: contribution.date,
      createdAt: new Date(timestamp++).toISOString(),
    };
    value.hours.transactions.unshift(transaction);
    existingContributionIds.add(contribution.id);
    migratedCount += 1;
  }
  return migratedCount > 0;
}

function readState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidState(parsed)) {
        const normalized = normalizeState(parsed);
        const migratedContributions = migrateLegacyStaffContributions(normalized);
        const migratedInventory = inventoryNeedsMigration(parsed.inventory, normalized.inventory);
        if (parsed.inventory === undefined || parsed.contributions === undefined || parsed.hours === undefined || migratedContributions || migratedInventory || JSON.stringify(parsed.jobs) !== JSON.stringify(normalized.jobs)) writeState(normalized);
        return normalized;
      }
      console.warn("Demo data has an invalid format; restoring the seed data.");
    }
  } catch (error) {
    console.warn("Demo data could not be read; using an in-memory seed.", error);
  }

  const initial = seedState();
  writeState(initial);
  return initial;
}

function writeState(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn("Demo data is available for this session only.", error);
    return false;
  }
}

function formatFileSize(sizeBytes) {
  return sizeBytes >= 1024 * 1024
    ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

let state = readState();
const nowIso = () => new Date().toISOString();
const currentUser = () => authService.getCurrentIdentity();
const currentStaff = () => authService.getCurrentIdentity();
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const jobIndex = (id) => state.jobs.findIndex((job) => job.id === id);
const update = (mutator) => {
  const actor = currentUser();
  const run = () => {
    assert(currentUser().id === actor.id, "Your identity changed. Try again with the selected account.");
    state = readState();
    const previous = clone(state);
    try {
      const result = mutator();
      generateInboxEvents(previous, actor);
      if (!writeState(state)) throw new Error("This browser could not save the change. Check that local storage is available and try again.");
      globalThis.window?.dispatchEvent(new Event("printfarm:inbox-updated"));
      return clone(result);
    } catch (error) {
      state = previous;
      throw error;
    }
  };
  if (globalThis.navigator?.locks?.request) {
    return globalThis.navigator.locks.request("three-d-print-farm-state", run);
  }
  return run();
};

const requireSupervisor = () => assert(authService.can(PERMISSIONS.JOBS_APPROVE), "Only Level 4 supervisors can approve requests and authorize printing.");
const decisionReason = (value, required) => {
  const reason = String(value || "").trim();
  assert(reason.length <= 500 && (!required || reason.length > 0), "Enter a reason of 1–500 characters.");
  return reason;
};
function generateInboxEvents(previous, actor) {
  for (const event of projectInboxEvents(previous, state, actor, authService.getDemoIdentities(), getRole)) {
    if (state.inbox.some((item) => item.userId === event.userId && item.eventKey === event.eventKey)) continue;
    state.inbox.unshift({ id: localId("INBOX"), unread: true, ...event });
  }
}
const ownsJob = (job) => job.submitterId
  ? job.submitterId === currentUser().id
  : job.submitterEmail.trim().toLowerCase() === currentUser().email.trim().toLowerCase();
const requireStaff = () => assert(authService.can(PERMISSIONS.JOBS_MANAGE), "Access denied: staff access is required.");
const requireFilamentChange = () => assert(authService.can(PERMISSIONS.FILAMENT_CHANGE), "Access denied: Level 3 or above is required.");

export async function resetLocalData() {
  const reset = () => {
    // Explicit allowlist: never clear unrelated origin data or contact a backend.
    for (const key of LOCAL_DATA_KEYS) localStorage.removeItem(key);
    for (const timer of simulationTimers) clearTimeout(timer);
    simulationTimers.clear();
    authService.resetSession();
    state = seedState();
  };
  if (globalThis.navigator?.locks?.request) return navigator.locks.request("three-d-print-farm-state", reset);
  return reset();
}

function scheduleNotificationSimulation(notificationId) {
  const timer = setTimeout(async () => {
    simulationTimers.delete(timer);
    try {
      // Read and serialize the latest state so another tab's changes survive.
      await update(() => {
        const item = state.notifications.find((notification) => notification.id === notificationId);
        if (item?.status === "PENDING") {
          item.status = "SENT";
          item.simulatedAt = nowIso();
        }
        return item || null;
      });
      globalThis.window?.dispatchEvent(new Event("printfarm:updated"));
    } catch (error) {
      console.warn("The simulated notification remains pending.", error);
    }
  }, 900);
  simulationTimers.add(timer);
}

function validatePayload(payload) {
  assert(
    payload && typeof payload.projectName === "string" && payload.projectName.trim(),
    "Enter a project name.",
  );
  filesService.validateMetadata(payload.file);
  assert(MATERIALS.some(({ id }) => id === payload.material), "Choose a supported print material.");
  assert(typeof payload.color === "string" && payload.color.trim(), "Choose an available color.");
  const matchesSelection = (item) => (
    item.material === payload.material
    && item.color.toLowerCase() === payload.color.trim().toLowerCase()
  );
  const option = payload.inventoryId
    ? state.inventory.find((item) => item.id === payload.inventoryId && matchesSelection(item))
    : state.inventory.find(matchesSelection);
  assert(option && option.available && withColorData(option).hexColor, "That filament is no longer available or its color code needs verification. Refresh the options and choose an available filament.");
}

export const jobsService = {
  mode: "mock",
  apiBaseUrl: API_BASE_URL,
  refreshFromStorage() {
    state = readState();
    return true;
  },
  async listJobs(filters = {}) {
    requireStaff();
    state = readState();
    let jobs = state.jobs.filter((job) => staffCanSeeJob(job, authService.can(PERMISSIONS.JOBS_APPROVE)));
    if (filters.status && filters.status !== "ALL") {
      jobs = jobs.filter((job) => job.status === filters.status);
    }
    if (filters.material && filters.material !== "ALL") {
      jobs = jobs.filter((job) => job.material === filters.material);
    }
    if (filters.search) {
      const query = filters.search.trim().toLowerCase();
      jobs = jobs.filter((job) => (
        job.id.toLowerCase().includes(query)
        || job.projectName.toLowerCase().includes(query)
      ));
    }
    if (filters.sort === "oldest") {
      jobs.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    } else if (filters.sort === "project") {
      jobs.sort((a, b) => a.projectName.localeCompare(b.projectName));
    } else {
      jobs.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    }

    return clone(jobs);
  },
  async getJob(jobId) {
    state = readState();
    const job = state.jobs.find((job) => job.id === jobId);
    return job && (authService.can(PERMISSIONS.JOBS_MANAGE)
      ? staffCanSeeJob(job, authService.can(PERMISSIONS.JOBS_APPROVE)) : ownsJob(job)) ? clone(job) : null;
  },
  async getMyJob(jobId) {
    state = readState();
    const job = state.jobs.find((job) => job.id === jobId && ownsJob(job));
    return job ? clone(job) : null;
  },
  async listMyJobs() {
    state = readState();
    return clone(
      state.jobs
        .filter(ownsJob)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    );
  },
  async createJob(payload) {
    return update(() => {
      assert(authService.can(PERMISSIONS.PRINT_REQUEST_CREATE), "Access denied: request submission is required.");
      validatePayload(payload);
      let id;
      do {
        id = `PF-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      } while (state.jobs.some((job) => job.id === id));
      const submittedAt = nowIso();
      const job = {
        id,
        projectName: payload.projectName.trim(),
        submitterId: currentUser().id,
        submitterName: currentUser().name,
        submitterEmail: currentUser().email,
        recipientEmail: currentUser().email,
        fileName: payload.file.name,
        fileSize: formatFileSize(payload.file.sizeBytes),
        material: payload.material,
        color: payload.color,
        layerHeight: payload.layerHeight || "Not specified",
        infill: payload.infill ?? null,
        purpose: payload.purpose || "Not specified",
        notes: payload.notes || "",
        submittedAt,
        status: "SUBMITTED",
        initialApproval: null,
        printAuthorization: null,
        assignedStaffId: null,
        assignedStaff: null,
        pickupLocation: null,
        completedAt: null,
        history: [{ type: "SUBMITTED", at: submittedAt, by: currentUser().name }],
      };
      state.jobs.unshift(job);
      return job;
    });
  },
  async claimJob(jobId) {
    requireStaff();
    return update(() => {
      requireStaff();
      const index = jobIndex(jobId);
      assert(index >= 0, "Job not found.");
      const job = state.jobs[index];
      assert(
        claimable(job),
        "This job is no longer available to claim.",
      );
      job.assignedStaff = currentStaff().name;
      job.assignedStaffId = currentStaff().id;
      job.status = "IN_PROGRESS";
      job.history.push({
        type: "CLAIMED",
        at: nowIso(),
        by: currentStaff().name,
      });
      return job;
    });
  },
  async reassignJob(jobId, targetIdentityId) {
    return update(() => {
      assert(authService.can(PERMISSIONS.JOBS_REASSIGN), "Only the Level 4 Print Farm Teacher can reassign jobs.");
      const targetIdentity = authService.getDemoIdentities().find((identity) => identity.id === targetIdentityId);
      const targetRole = targetIdentity && getRole(targetIdentity.roleId);
      assert(targetIdentity && targetRole && targetRole.level >= 2, "Choose a Level 2 or above staff member.");
      const index = jobIndex(jobId);
      assert(index >= 0, "Job not found.");
      const job = state.jobs[index];
      assert(!CLOSED_STATUSES.has(job.status), "Closed jobs cannot be reassigned.");
      assert(job.assignedStaff, "Claim an unassigned job before reassigning it.");
      assert(job.assignedStaff !== targetIdentity.name, "Choose a different staff member.");
      job.assignedStaff = targetIdentity.name;
      job.assignedStaffId = targetIdentity.id;
      if (["AWAITING_AUTHORIZATION", "AUTHORIZED"].includes(job.status)) {
        job.status = "IN_PROGRESS";
        job.printAuthorization = null;
      }
      job.history.push({
        type: "REASSIGNED",
        at: nowIso(),
        by: currentStaff().name,
        assignedTo: targetIdentity.name,
      });
      return job;
    });
  },
  async reviewRequest(jobId, decision, reason = "") {
    return update(() => {
      requireSupervisor();
      const job = state.jobs.find((item) => item.id === jobId);
      assert(job?.status === "SUBMITTED" && !job.initialApproval, "This request has already been reviewed or is no longer pending.");
      assert(["approved", "rejected"].includes(decision), "Choose an approval decision.");
      const note = decisionReason(reason, decision === "rejected");
      const at = nowIso();
      job.initialApproval = { decision, byId: currentUser().id, by: currentUser().name, at, reason: note };
      job.status = decision === "approved" ? "APPROVED" : "REJECTED";
      job.history.push({ type: job.status, at, by: currentUser().name, byId: currentUser().id, note, visibility: "submitter" });
      return job;
    });
  },
  async requestAuthorization(jobId) {
    return update(() => {
      requireStaff();
      const job = state.jobs.find((item) => item.id === jobId);
      assert(job && isAssignedTo(job, currentUser()), "Only the assigned staff member can request authorization.");
      assert(job.status === "IN_PROGRESS" && initiallyApproved(job), "Only a prepared, approved job can request printing authorization.");
      job.status = "AWAITING_AUTHORIZATION";
      job.printAuthorization = { id: localId("AUTH"), decision: "pending", requestedById: currentUser().id, requestedBy: currentUser().name, requestedAt: nowIso() };
      job.history.push({ type: "AUTHORIZATION_REQUESTED", at: job.printAuthorization.requestedAt, by: currentUser().name, byId: currentUser().id });
      return job;
    });
  },
  async reviewAuthorization(jobId, decision, reason = "", expectedRequestedAt = null, expectedAuthorizationId = null) {
    return update(() => {
      requireSupervisor();
      const job = state.jobs.find((item) => item.id === jobId);
      assert(job?.status === "AWAITING_AUTHORIZATION" && job.printAuthorization?.decision === "pending", "This print authorization is no longer pending.");
      assert(!expectedAuthorizationId || job.printAuthorization.id === expectedAuthorizationId, "This notification belongs to an earlier authorization attempt. Review the current job.");
      assert(!expectedRequestedAt || job.printAuthorization.requestedAt === expectedRequestedAt, "This notification belongs to an earlier authorization attempt. Review the current job.");
      assert(["authorized", "revision"].includes(decision), "Choose an authorization decision.");
      const note = decisionReason(reason, decision === "revision");
      const at = nowIso();
      job.printAuthorization = { ...job.printAuthorization, decision, byId: currentUser().id, by: currentUser().name, at, reason: note };
      job.status = decision === "authorized" ? "AUTHORIZED" : "IN_PROGRESS";
      job.history.push({ type: decision === "authorized" ? "AUTHORIZED" : "REVISION_REQUESTED", at, by: currentUser().name, byId: currentUser().id, note, visibility: "submitter" });
      return job;
    });
  },
  async startPrinting(jobId) {
    requireStaff();
    return update(() => {
      requireStaff();
      const index = jobIndex(jobId);
      assert(index >= 0, "Job not found.");
      const job = state.jobs[index];
      assert(
        isAssignedTo(job, currentStaff()),
        "Only the assigned demo staff member can advance this job.",
      );
      assert(job.status === "AUTHORIZED" && job.printAuthorization?.decision === "authorized", "Supervisor print authorization is required before printing.");
      job.status = "PRINTING";
      job.history.push({
        type: "PRINTING",
        at: nowIso(),
        by: currentStaff().name,
      });
      return job;
    });
  },
  async completeJob(jobId, payload) {
    requireStaff();
    const result = await update(() => {
      requireStaff();
      const index = jobIndex(jobId);
      assert(index >= 0, "Job not found.");
      const job = state.jobs[index];
      assert(job.status === "PRINTING", "Only a printing job can be completed.");
      assert(
        isAssignedTo(job, currentStaff()),
        "Only the assigned demo staff member can complete this job.",
      );
      assert(
        typeof payload.pickupLocation === "string" && payload.pickupLocation.trim(),
        "Enter a pickup location.",
      );
      const completedAt = nowIso();
      assert(payload.pickupLocation.trim().length <= 120, "Pickup location must be 120 characters or fewer.");
      assert(String(payload.pickupInstructions || "").trim().length <= 500, "Pickup instructions must be 500 characters or fewer.");
      job.status = "COMPLETED";
      job.pickupLocation = payload.pickupLocation.trim();
      job.pickupInstructions = String(payload.pickupInstructions || "").trim();
      job.completedAt = completedAt;
      job.history.push({
        type: "COMPLETED",
        at: completedAt,
        by: currentStaff().name,
      });
      let notification = null;
      if (payload.notifyRecipient) {
        notification = {
          id: `NT-${Date.now().toString().slice(-7)}`,
          jobId: job.id,
          recipientEmail: job.recipientEmail,
          pickupLocation: job.pickupLocation,
          subject: "Your 3D print is ready for pickup",
          status: "PENDING",
          createdAt: completedAt,
          simulated: true,
        };
        state.notifications.unshift(notification);
        job.history.push({
          type: "NOTIFICATION_SIMULATED",
          at: completedAt,
          by: currentStaff().name,
        });
      }
      return { job, notification };
    });
    if (result.notification) {
      const notificationId = result.notification.id;
      scheduleNotificationSimulation(notificationId);
    }
    return result;
  },
  async updatePickup(jobId, payload) {
    return update(() => {
      requireStaff();
      const job = state.jobs.find((item) => item.id === jobId);
      assert(job?.status === "COMPLETED", "Pickup details can only be edited while a print awaits collection.");
      const location = String(payload.pickupLocation || "").trim();
      const instructions = String(payload.pickupInstructions || "").trim();
      assert(location && location.length <= 120, "Enter a pickup location of up to 120 characters.");
      assert(instructions.length <= 500, "Pickup instructions must be 500 characters or fewer.");
      if (job.pickupLocation !== location || (job.pickupInstructions || "") !== instructions) {
        job.pickupLocation = location;
        job.pickupInstructions = instructions;
        job.history.push({ type: "PICKUP_UPDATED", at: nowIso(), by: currentStaff().name });
      }
      return job;
    });
  },
  async collectJob(jobId) {
    requireStaff();
    return update(() => {
      requireStaff();
      const job = state.jobs.find((item) => item.id === jobId);
      assert(job, "Job not found.");
      assert(job.status === "COMPLETED" && !job.collectedAt, "Only a print ready for pickup can be marked as collected.");
      job.status = "COLLECTED";
      job.collectedAt = nowIso();
      job.history.push({ type: "COLLECTED", at: job.collectedAt, by: currentStaff().name });
      return job;
    });
  },
  async listJobEvents(jobId) {
    const job = await this.getJob(jobId);
    return clone(job?.history || []);
  },
  async listNotifications(jobId = null) {
    requireStaff();
    state = readState();
    const jobs = state.jobs.filter((job) => staffCanSeeJob(job, authService.can(PERMISSIONS.JOBS_APPROVE)));
    const allowed = new Set(jobs.map((job) => job.id));
    return clone(state.notifications.filter((item) => allowed.has(item.jobId) && (!jobId || item.jobId === jobId)));
  },
  async getNotification(notificationId) {
    requireStaff();
    return (await this.listNotifications()).find((item) => item.id === notificationId) || null;
  },
  async retryNotification(notificationId) {
    assert(authService.can(PERMISSIONS.NOTIFICATIONS_RETRY), "Access denied: notification retry is restricted to staff.");
    const result = await update(() => {
      const item = state.notifications.find((notification) => notification.id === notificationId);
      assert(item && staffCanSeeJob(state.jobs.find((job) => job.id === item.jobId) || {}, authService.can(PERMISSIONS.JOBS_APPROVE)), "Notification record not found.");
      assert(item.status === "FAILED", "Only a failed demo notification can be retried.");
      item.status = "PENDING";
      item.retriedAt = nowIso();
      item.simulated = true;
      const job = state.jobs.find((candidate) => candidate.id === item.jobId);
      job?.history.push({
        type: "NOTIFICATION_RETRIED_SIMULATED",
        at: item.retriedAt,
        by: currentStaff().name,
      });
      return item;
    });
    scheduleNotificationSimulation(notificationId);
    return result;
  },
  async summary() {
    requireStaff();
    state = readState();
    const today = new Date().toDateString();
    const jobs = state.jobs.filter((job) => staffCanSeeJob(job, authService.can(PERMISSIONS.JOBS_APPROVE)));
    return {
      unclaimed: jobs.filter(claimable).length,
      pendingReview: jobs.filter((job) => job.status === "SUBMITTED").length,
      inProgress: jobs.filter((job) => ["IN_PROGRESS", "AWAITING_AUTHORIZATION", "AUTHORIZED"].includes(job.status)).length,
      printing: jobs.filter((job) => job.status === "PRINTING").length,
      completedToday: jobs.filter((job) => (
        ["COMPLETED", "COLLECTED"].includes(job.status)
        && job.completedAt
        && new Date(job.completedAt).toDateString() === today
      )).length,
      total: jobs.length,
    };
  },
  async listMyActiveJobs() {
    requireStaff();
    state = readState();
    return clone(
      state.jobs.filter((job) => (
        isAssignedTo(job, currentStaff()) && staffCanSeeJob(job, authService.can(PERMISSIONS.JOBS_APPROVE)) && !CLOSED_STATUSES.has(job.status)
      )),
    );
  },
  async getMaterials() {
    return clone(MATERIALS);
  },
  async resetDemo() {
    requireStaff();
    for (const timer of simulationTimers) clearTimeout(timer);
    simulationTimers.clear();
    state = seedState();
    writeState(state);
    return true;
  },
  saveDraft(fields) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(fields));
      return true;
    } catch {
      return false;
    }
  },
  getDraft() {
    try {
      const value = localStorage.getItem(DRAFT_KEY);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* demo storage may be unavailable */
    }
  },
  currentStudent() {
    return clone(currentUser());
  },
  currentStaff() {
    return clone(currentStaff());
  },
  availableStatuses() {
    return [...STATUSES];
  },
};

export const inboxService = {
  async list() {
    requireStaff();
    state = readState();
    return clone(state.inbox.filter((item) => item.userId === currentUser().id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)));
  },
  async open(id) {
    return update(() => {
      requireStaff();
      const index = state.inbox.findIndex((item) => item.id === id && item.userId === currentUser().id);
      assert(index >= 0, "This notification is no longer in your inbox.");
      return state.inbox.splice(index, 1)[0];
    });
  },
};
export const presenceService = {
  async list() {
    requireStaff();
    state = readState();
    return clone(authService.getDemoIdentities().filter((identity) => getRole(identity.roleId)?.level === 4)
      .map((identity) => ({ id: identity.id, name: identity.name, present: state.supervisorPresence[identity.id]?.present === true,
        updatedAt: state.supervisorPresence[identity.id]?.updatedAt || null })));
  },
  async set(present) {
    return update(() => {
      assert(authService.can(PERMISSIONS.SUPERVISOR_PRESENCE), "Only Level 4 can update their own supervisor presence.");
      assert(typeof present === "boolean", "Choose a valid presence setting.");
      const record = { present, updatedAt: nowIso() };
      state.supervisorPresence[currentUser().id] = record;
      return record;
    });
  },
};

const MATERIAL_IDS = new Set(MATERIALS.map(({ id }) => id));
const localId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
function withColorData(item) {
  const hexColor = normalizeHex(item.hexColor) || LEGACY_CSS_COLORS[item.color.trim().toLowerCase()] || null;
  return { ...item, hexColor, rgbColor: rgbFromHex(hexColor) };
}

function validateInventory(payload) {
  assert(MATERIAL_IDS.has(payload.material), "Choose one of the supported materials.");
  assert(typeof payload.color === "string" && payload.color.trim().length > 0 && payload.color.trim().length <= 60, "Enter a color name of up to 60 characters.");
  assert(payload.color.trim().toLowerCase() !== "[object object]", "Enter a valid color name.");
  assert(normalizeHex(payload.hexColor), "Enter a valid six-digit HEX color such as #2F80ED.");
  assert(typeof payload.lowStock === "boolean" && typeof payload.available === "boolean", "Filament status must use valid on or off values.");
}

export const inventoryService = {
  async listInventory() {
    state = readState();
    return clone([...state.inventory].map(withColorData).sort((a, b) => (
      MATERIALS.findIndex(({ id }) => id === a.material) - MATERIALS.findIndex(({ id }) => id === b.material)
      || a.color.localeCompare(b.color)
    )));
  },
  async listAvailable() {
    state = readState();
    return clone(state.inventory.filter((item) => item.available).map(withColorData).filter((item) => Boolean(item.hexColor)));
  },
  async getItem(id) {
    state = readState();
    const item = state.inventory.find((entry) => entry.id === id);
    return item ? clone(withColorData(item)) : null;
  },
  async add(payload) {
    requireFilamentChange();
    return update(() => {
      const normalized = {
        material: String(payload.material || ""),
        color: String(payload.color || "").trim(),
        hexColor: normalizeHex(payload.hexColor),
        lowStock: false,
        available: true,
      };
      validateInventory(normalized);
      const duplicate = state.inventory.some((item) => item.material === normalized.material && item.color.toLowerCase() === normalized.color.toLowerCase());
      assert(!duplicate, "A filament with this material and color already exists.");
      const timestamp = nowIso();
      const item = {
        id: localId("FIL"),
        ...normalized,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state.inventory.unshift(item);
      return item;
    });
  },
  async update(id, payload) {
    requireFilamentChange();
    return update(() => {
      const item = state.inventory.find((entry) => entry.id === id);
      assert(item, "Filament entry not found.");
      const normalized = { ...item, color: String(payload.color || "").trim(), hexColor: normalizeHex(payload.hexColor) };
      validateInventory(normalized);
      assert(!state.inventory.some((other) => other.id !== id && other.material === item.material && other.color.toLowerCase() === normalized.color.toLowerCase()), "A filament with this material and color already exists.");
      Object.assign(item, normalized, { updatedAt: nowIso() });
      return item;
    });
  },
  async toggleAvailability(id) {
    requireFilamentChange();
    return update(() => {
      const item = state.inventory.find((entry) => entry.id === id);
      assert(item, "Inventory entry not found. Refresh the page and try again.");
      item.available = !item.available;
      item.updatedAt = nowIso();
      return item;
    });
  },
  async toggleLowStock(id) {
    requireFilamentChange();
    return update(() => {
      const item = state.inventory.find((entry) => entry.id === id);
      assert(item, "Inventory entry not found. Refresh the page and try again.");
      item.lowStock = !item.lowStock;
      item.updatedAt = nowIso();
      return item;
    });
  },
  async remove(id) {
    requireFilamentChange();
    return update(() => {
      const index = state.inventory.findIndex((entry) => entry.id === id);
      assert(index >= 0, "Filament entry not found. Refresh the page and try again.");
      return state.inventory.splice(index, 1)[0];
    });
  },
};

function validateContribution(payload) {
  assert(typeof payload.student === "string" && payload.student.trim().length > 0 && payload.student.trim().length <= 100, "Enter a student name of up to 100 characters.");
  const parsedDate = new Date(`${payload.date}T00:00:00.000Z`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(payload.date) && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === payload.date, "Choose a valid contribution date.");
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  assert(payload.date <= localToday, "Contribution date cannot be in the future.");
  assert(Number.isFinite(Number(payload.hours)) && Number(payload.hours) > 0 && Number(payload.hours) <= 24, "Hours must be greater than zero and no more than 24.");
  assert(typeof payload.activity === "string" && payload.activity.trim().length > 0 && payload.activity.trim().length <= 300, "Enter an activity description of up to 300 characters.");
}

export const contributionsService = {
  async list(filters = {}) {
    requireHoursPermission(PERMISSIONS.CONTRIBUTIONS_MANAGE);
    state = readState();
    const search = String(filters.student || "").trim().toLowerCase();
    return clone(state.contributions.filter((item) => (
      (!search || item.student.toLowerCase().includes(search))
      && (!filters.from || item.date >= filters.from)
      && (!filters.to || item.date <= filters.to)
    )).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)));
  },
  async listAll() {
    requireHoursPermission(PERMISSIONS.CONTRIBUTIONS_MANAGE);
    state = readState();
    return clone([...state.contributions]);
  },
  async add(payload) {
    requireHoursPermission(PERMISSIONS.CONTRIBUTIONS_MANAGE);
    return update(() => {
      const normalized = { ...payload, student: String(payload.student || "").trim(), date: String(payload.date || ""), hours: Number(payload.hours), activity: String(payload.activity || "").trim() };
      validateContribution(normalized);
      assert(!identityForContribution(normalized), "Give hours to Level 2 or Level 3 staff from the Hours dashboard so their balance and contribution history stay linked.");
      const timestamp = nowIso();
      const record = { id: localId("HRS"), ...normalized, createdAt: timestamp, updatedAt: timestamp, createdBy: currentStaff().name };
      state.contributions.unshift(record);
      return record;
    });
  },
  async update(id, payload) {
    requireHoursPermission(PERMISSIONS.CONTRIBUTIONS_MANAGE);
    return update(() => {
      const record = state.contributions.find((item) => item.id === id);
      assert(record, "Contribution record not found. Refresh the page and try again.");
      assert(!state.hours.transactions.some((transaction) => transaction.contributionId === id), "This contribution is linked to a staff balance and cannot be edited. Record a new correction from Hours instead.");
      const normalized = { ...payload, student: String(payload.student || "").trim(), date: String(payload.date || ""), hours: Number(payload.hours), activity: String(payload.activity || "").trim() };
      validateContribution(normalized);
      Object.assign(record, normalized, { updatedAt: nowIso() });
      return record;
    });
  },
};

const hoursTransactions = () => state.hours.transactions;
const hoursRequests = () => state.hours.requests;
const hoursBalanceCenti = (userId) => hoursTransactions()
  .filter((transaction) => transaction.userId === userId)
  .reduce((total, transaction) => total + transaction.deltaCenti, 0);
const hoursForUser = (userId) => hoursTransactions()
  .filter((transaction) => transaction.userId === userId)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const hourRequestOrder = (a, b) => b.submittedAt.localeCompare(a.submittedAt);
const resolveDemoIdentity = (userId) => authService.getDemoIdentities().find((identity) => identity.id === userId) || null;
const parseHourAmountCenti = (rawValue) => {
  const raw = String(rawValue ?? "").trim();
  assert(/^\d+(?:\.\d{1,2})?$/.test(raw), "Enter a positive number of hours using up to two decimal places.");
  const [whole, fraction = ""] = raw.split(".");
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  assert(Number.isSafeInteger(value) && value > 0, "Hours must be greater than zero.");
  return value;
};
const validateHoursReason = (value, label = "reason") => {
  const reason = String(value || "").trim();
  assert(reason.length > 0 && reason.length <= 500, `Enter a ${label} of up to 500 characters.`);
  return reason;
};
const requireHoursPermission = (permission) => {
  assert(authService.can(permission), "You do not have permission to access this hours operation.");
};
const staffRoleForUser = (userId) => {
  const identity = resolveDemoIdentity(userId);
  const role = identity && getRole(identity.roleId);
  return role ? { identity, role } : null;
};
const isEligibleHoursStaff = (userId) => {
  const record = staffRoleForUser(userId);
  return Boolean(record && record.role.level >= 2 && record.role.level <= 3);
};

export const hoursService = {
  newSubmissionKey() {
    return localId("HREQKEY");
  },
  async getOwnDashboard() {
    requireHoursPermission(PERMISSIONS.HOURS_VIEW_OWN);
    const role = authService.getCurrentRole();
    assert(role && role.level >= 2 && role.level <= 3, "Only Level 2 and Level 3 staff have personal hour balances.");
    state = readState();
    const identity = currentUser();
    const transactions = hoursForUser(identity.id);
    const requests = hoursRequests().filter((request) => request.requesterId === identity.id).sort(hourRequestOrder);
    return clone({
      identity,
      balanceCenti: hoursBalanceCenti(identity.id),
      transactions,
      requests,
      pendingCount: requests.filter((request) => request.status === "Pending").length,
    });
  },
  async getStaffOverview(search = "") {
    requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
    state = readState();
    const query = String(search || "").trim().toLowerCase();
    return clone(authService.getDemoIdentities()
      .filter((identity) => isEligibleHoursStaff(identity.id))
      .filter((identity) => !query || identity.name.toLowerCase().includes(query))
      .map((identity) => {
        const transactions = hoursForUser(identity.id);
        const pendingRequests = hoursRequests()
          .filter((request) => request.requesterId === identity.id && request.status === "Pending")
          .sort(hourRequestOrder)
          .map((request) => ({
            id: request.id,
            adjustmentType: request.adjustmentType,
            hoursCenti: request.hoursCenti,
          }));
        return {
          id: identity.id,
          name: identity.name,
          roleId: identity.roleId,
          roleTitle: getRole(identity.roleId).title,
          level: getRole(identity.roleId).level,
          balanceCenti: hoursBalanceCenti(identity.id),
          latestTransaction: transactions[0] || null,
          pendingRequests,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)));
  },
  async getStaffDetail(userId) {
    requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
    state = readState();
    assert(isEligibleHoursStaff(userId), "Choose a Level 2 or Level 3 staff member.");
    const identity = resolveDemoIdentity(userId);
    const role = getRole(identity.roleId);
    return clone({
      id: identity.id,
      name: identity.name,
      roleId: identity.roleId,
      roleTitle: role.title,
      level: role.level,
      balanceCenti: hoursBalanceCenti(identity.id),
      transactions: hoursForUser(identity.id),
      requests: hoursRequests()
        .filter((request) => request.requesterId === identity.id)
        .sort(hourRequestOrder)
        .map((request) => {
          const transaction = request.transactionId
            ? hoursTransactions().find((item) => item.id === request.transactionId) || null
            : null;
          return {
            ...request,
            staffName: identity.name,
            staffLevel: role.level,
            staffRoleTitle: role.title,
            transaction,
          };
        }),
    });
  },
  async listRequests(status = "ALL") {
    requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
    state = readState();
    assert(["ALL", "Pending", "Approved", "Rejected"].includes(status), "Choose a valid request status filter.");
    return clone(hoursRequests()
      .filter((request) => status === "ALL" || request.status === status)
      .sort(hourRequestOrder)
      .map((request) => {
        const target = staffRoleForUser(request.requesterId);
        const transaction = request.transactionId
          ? hoursTransactions().find((item) => item.id === request.transactionId) || null
          : null;
        return {
          ...request,
          staffName: target?.identity.name || request.requesterName,
          staffLevel: target?.role.level || request.requesterLevel,
          staffRoleTitle: target?.role.title || "Former demo identity",
          transaction,
        };
      }));
  },
  async getAdminActivity(userId) {
    requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
    requireHoursPermission(PERMISSIONS.CONTRIBUTIONS_MANAGE);
    state = readState();
    assert(isEligibleHoursStaff(userId), "Choose a Level 2 or Level 3 staff member.");
    const identity = resolveDemoIdentity(userId);
    const role = getRole(identity.roleId);
    const linkedContributionIds = new Set(hoursTransactions().map((transaction) => transaction.contributionId).filter(Boolean));
    const transactionActivity = hoursForUser(userId).map((transaction) => {
      const sourceLabel = transaction.source === "request"
        ? "Approved request"
        : transaction.source === "contribution" ? "Student contribution" : "Balance correction";
      return {
        id: transaction.id,
        userId: transaction.userId,
        userName: identity.name,
        level: role.level,
        source: transaction.source,
        sourceLabel,
        deltaCenti: transaction.deltaCenti,
        hoursCenti: Math.abs(transaction.deltaCenti),
        reason: transaction.reason,
        actorName: transaction.actorName,
        workDate: transaction.workDate || null,
        createdAt: transaction.createdAt,
        balanceBeforeCenti: transaction.balanceBeforeCenti,
        balanceAfterCenti: transaction.balanceAfterCenti,
        affectsBalance: true,
      };
    });
    const otherContributions = state.contributions
      .filter((contribution) => !linkedContributionIds.has(contribution.id)
        && (contribution.staffId === userId
          || String(contribution.student || "").trim().toLowerCase() === identity.name.toLowerCase()))
      .map((contribution) => ({
        id: contribution.id,
        userId: contribution.staffId || null,
        userName: contribution.student,
        level: null,
        source: "student_contribution",
        sourceLabel: "Student contribution",
        deltaCenti: null,
        hoursCenti: Math.round(Number(contribution.hours) * 100),
        reason: contribution.activity,
        actorName: contribution.createdBy || "Unknown",
        workDate: contribution.date,
        createdAt: contribution.createdAt || `${contribution.date}T12:00:00.000Z`,
        balanceBeforeCenti: null,
        balanceAfterCenti: null,
        affectsBalance: false,
      }));
    return clone([...transactionActivity, ...otherContributions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async submitRequest(payload) {
    requireHoursPermission(PERMISSIONS.HOURS_REQUEST);
    const actor = currentUser();
    const role = getRole(actor.roleId);
    assert(role && role.level >= 2 && role.level <= 3, "Only Level 2 and Level 3 staff can request an hour adjustment.");
    const adjustmentType = String(payload?.adjustmentType || "");
    assert(["add", "subtract"].includes(adjustmentType), "Choose additional hours or a correction/deduction.");
    const hoursCenti = parseHourAmountCenti(payload?.hours);
    const reason = validateHoursReason(payload?.reason, "explanation");
    const submissionKey = String(payload?.submissionKey || "").trim();
    assert(submissionKey.length >= 8 && submissionKey.length <= 120, "This request form has expired. Refresh the page and try again.");

    return update(() => {
      requireHoursPermission(PERMISSIONS.HOURS_REQUEST);
      const duplicate = hoursRequests().find((request) => request.submissionKey === submissionKey);
      if (duplicate) {
        assert(duplicate.requesterId === actor.id, "This request key is already in use.");
        return duplicate;
      }
      const request = {
        id: localId("HREQ"),
        submissionKey,
        requesterId: actor.id,
        requesterName: actor.name,
        requesterLevel: role.level,
        adjustmentType,
        hoursCenti,
        reason,
        status: "Pending",
        submittedAt: nowIso(),
        reviewedById: null,
        reviewedByName: null,
        decidedAt: null,
        rejectionReason: "",
        transactionId: null,
      };
      hoursRequests().unshift(request);
      return request;
    });
  },
  async giveHours(userId, payload) {
    requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
    requireHoursPermission(PERMISSIONS.CONTRIBUTIONS_MANAGE);
    const actor = currentUser();
    assert(actor.id !== userId, "Choose another staff member before giving hours.");
    const target = resolveDemoIdentity(userId);
    assert(target && isEligibleHoursStaff(userId), "Choose a Level 2 or Level 3 staff member.");
    const date = String(payload?.date || "");
    const activity = String(payload?.activity || "").trim();
    const hoursCenti = parseHourAmountCenti(payload?.hours);
    const normalized = { student: target.name, date, hours: hoursCenti / 100, activity };
    validateContribution(normalized);
    assert(hoursCenti % 1 === 0 && hoursCenti <= 2400, "Give no more than 24 hours in one contribution.");
    const submissionKey = String(payload?.submissionKey || "").trim();
    assert(submissionKey.length >= 8 && submissionKey.length <= 120, "This form has expired. Refresh the staff details and try again.");
    const expectedBalanceCenti = Number(payload?.expectedBalanceCenti);
    assert(Number.isSafeInteger(expectedBalanceCenti) && expectedBalanceCenti >= 0, "Refresh the staff details before confirming this contribution.");

    return update(() => {
      requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
      const duplicate = state.contributions.find((contribution) => (
        contribution.submissionKey === submissionKey && contribution.createdById === actor.id
      ));
      if (duplicate) {
        const transaction = hoursTransactions().find((item) => item.contributionId === duplicate.id);
        assert(transaction, "This contribution exists without a linked hour transaction. Ask an administrator to review the demo data.");
        return { contribution: duplicate, transaction };
      }
      const balanceBeforeCenti = hoursBalanceCenti(userId);
      assert(balanceBeforeCenti === expectedBalanceCenti, "This balance changed after the page was opened. Review the latest balance and try again.");
      const balanceAfterCenti = balanceBeforeCenti + hoursCenti;
      assert(Number.isSafeInteger(balanceAfterCenti), "This contribution would create an invalid hour balance.");
      const timestamp = nowIso();
      const contribution = {
        id: localId("HRS"),
        ...normalized,
        staffId: target.id,
        submissionKey,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: actor.name,
        createdById: actor.id,
      };
      const transaction = {
        id: localId("HTXN"),
        userId: target.id,
        deltaCenti: hoursCenti,
        balanceBeforeCenti,
        balanceAfterCenti,
        reason: activity,
        source: "contribution",
        actorId: actor.id,
        actorName: actor.name,
        requestId: null,
        contributionId: contribution.id,
        workDate: date,
        createdAt: timestamp,
      };
      state.contributions.unshift(contribution);
      hoursTransactions().unshift(transaction);
      return { contribution, transaction };
    });
  },
  async adjustStaffHours(userId, payload) {
    requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
    const actor = currentUser();
    assert(actor.id !== userId, "Choose another staff member for a direct adjustment.");
    assert(isEligibleHoursStaff(userId), "Choose a Level 2 or Level 3 staff member.");
    const adjustmentType = String(payload?.adjustmentType || "");
    assert(adjustmentType === "subtract", "Use Give hours to add hours so the balance and contribution history remain linked.");
    const hoursCenti = parseHourAmountCenti(payload?.hours);
    const reason = validateHoursReason(payload?.reason);
    const submissionKey = String(payload?.submissionKey || "").trim();
    assert(submissionKey.length >= 8 && submissionKey.length <= 120, "This adjustment form has expired. Refresh the page and try again.");
    const expectedBalanceCenti = Number(payload?.expectedBalanceCenti);
    assert(Number.isSafeInteger(expectedBalanceCenti) && expectedBalanceCenti >= 0, "Refresh the staff details before confirming this adjustment.");

    return update(() => {
      requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
      const duplicate = hoursTransactions().find((transaction) => (
        transaction.actorId === actor.id && transaction.submissionKey === submissionKey
      ));
      if (duplicate) return duplicate;
      const target = resolveDemoIdentity(userId);
      assert(target && isEligibleHoursStaff(target.id), "This staff record is no longer available.");
      const balanceBeforeCenti = hoursBalanceCenti(userId);
      assert(balanceBeforeCenti === expectedBalanceCenti, "This balance changed after the page was opened. Review the latest balance and confirm again.");
      const deltaCenti = adjustmentType === "add" ? hoursCenti : -hoursCenti;
      const balanceAfterCenti = balanceBeforeCenti + deltaCenti;
      assert(Number.isSafeInteger(balanceAfterCenti) && balanceAfterCenti >= 0, "This adjustment would create an invalid or negative hour balance.");
      const transaction = {
        id: localId("HTXN"),
        userId,
        deltaCenti,
        balanceBeforeCenti,
        balanceAfterCenti,
        reason,
        source: "manual",
        submissionKey,
        actorId: actor.id,
        actorName: actor.name,
        requestId: null,
        createdAt: nowIso(),
      };
      hoursTransactions().unshift(transaction);
      return transaction;
    });
  },
  async approveRequest(requestId) {
    requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
    const reviewer = currentUser();
    return update(() => {
      requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
      const request = hoursRequests().find((item) => item.id === requestId);
      assert(request, "Request not found. Refresh the page and try again.");
      assert(request.status === "Pending", "This request has already been reviewed.");
      assert(!hoursTransactions().some((transaction) => transaction.requestId === request.id), "This request already has a recorded transaction.");
      assert(request.requesterId !== reviewer.id, "You cannot approve your own request.");
      assert(staffRoleForUser(request.requesterId), "The requesting staff record is no longer available.");
      const balanceBeforeCenti = hoursBalanceCenti(request.requesterId);
      const deltaCenti = request.adjustmentType === "add" ? request.hoursCenti : -request.hoursCenti;
      const balanceAfterCenti = balanceBeforeCenti + deltaCenti;
      assert(Number.isSafeInteger(balanceAfterCenti) && balanceAfterCenti >= 0, "This adjustment would create an invalid or negative balance. Reject the request or ask for a smaller correction.");
      const transaction = {
        id: localId("HTXN"),
        userId: request.requesterId,
        deltaCenti,
        balanceBeforeCenti,
        balanceAfterCenti,
        reason: request.reason,
        source: "request",
        actorId: reviewer.id,
        actorName: reviewer.name,
        requestId: request.id,
        createdAt: nowIso(),
      };
      hoursTransactions().unshift(transaction);
      Object.assign(request, {
        status: "Approved",
        reviewedById: reviewer.id,
        reviewedByName: reviewer.name,
        decidedAt: transaction.createdAt,
        transactionId: transaction.id,
      });
      return { request, transaction };
    });
  },
  async rejectRequest(requestId, rejectionReason = "") {
    requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
    const reviewer = currentUser();
    const reason = String(rejectionReason || "").trim();
    assert(reason.length <= 500, "Keep the rejection reason under 500 characters.");
    return update(() => {
      requireHoursPermission(PERMISSIONS.HOURS_ADMIN);
      const request = hoursRequests().find((item) => item.id === requestId);
      assert(request, "Request not found. Refresh the page and try again.");
      assert(request.status === "Pending", "This request has already been reviewed.");
      assert(request.requesterId !== reviewer.id, "You cannot reject your own request.");
      Object.assign(request, {
        status: "Rejected",
        reviewedById: reviewer.id,
        reviewedByName: reviewer.name,
        decidedAt: nowIso(),
        rejectionReason: reason,
      });
      return request;
    });
  },
};
