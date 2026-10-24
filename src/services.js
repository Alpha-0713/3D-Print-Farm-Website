import {
  DEMO_STAFF,
  DEMO_STUDENT,
  MATERIALS,
  MOCK_JOBS,
  MOCK_NOTIFICATIONS,
  STATUSES,
} from "./data.js?v=12";
import { API_BASE_URL } from "./apiClient.js?v=12";
import { filesService } from "./filesService.js?v=12";

const STORE_KEY = "three-d-print-farm-demo-v3";
const DRAFT_KEY = "three-d-print-farm-draft-v2";
const clone = (value) => JSON.parse(JSON.stringify(value));

function seedState() {
  return {
    jobs: clone(MOCK_JOBS),
    notifications: clone(MOCK_NOTIFICATIONS),
    inventory: [],
    contributions: [],
  };
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
    && (job.assignedStaff === null || typeof job.assignedStaff === "string")
    && Array.isArray(job.history)
    && job.history.every((event) => (
      isRecord(event)
      && typeof event.type === "string"
      && typeof event.at === "string"
      && typeof event.by === "string"
    ))
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
      && Number.isFinite(Number(item.quantity))
      && Number(item.quantity) >= 0
      && ["g", "kg", "spools"].includes(item.unit)
      && typeof item.available === "boolean"
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
    ))
  );

  return jobsAreValid && notificationsAreValid && inventoryIsValid && contributionsAreValid;
}

function normalizeState(value) {
  return {
    ...value,
    inventory: Array.isArray(value.inventory) ? value.inventory : [],
    contributions: Array.isArray(value.contributions) ? value.contributions : [],
  };
}

function readState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidState(parsed)) {
        const normalized = normalizeState(parsed);
        if (parsed.inventory === undefined || parsed.contributions === undefined) writeState(normalized);
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
const currentUser = DEMO_STUDENT;
const currentStaff = DEMO_STAFF;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const jobIndex = (id) => state.jobs.findIndex((job) => job.id === id);
const update = (mutator) => {
  state = readState();
  const result = mutator();
  if (!writeState(state)) throw new Error("This browser could not save the change. Check that local storage is available and try again.");
  return clone(result);
};

function validatePayload(payload) {
  assert(
    payload && typeof payload.projectName === "string" && payload.projectName.trim(),
    "Enter a project name.",
  );
  filesService.validateMetadata(payload.file);
  assert(MATERIALS.some(({ id }) => id === payload.material), "Choose a supported print material.");
  assert(typeof payload.color === "string" && payload.color.trim(), "Choose an available color.");
  const option = state.inventory.find((item) => (
    item.material === payload.material
    && item.color.toLowerCase() === payload.color.trim().toLowerCase()
  ));
  assert(option && option.available && Number(option.quantity) > 0, "That material and color are no longer available. Refresh the options and choose an available filament.");
}

export const jobsService = {
  mode: "mock",
  apiBaseUrl: API_BASE_URL,
  refreshFromStorage() {
    state = readState();
    return clone(state);
  },
  async listJobs(filters = {}) {
    let jobs = [...state.jobs];
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
    return clone(state.jobs.find((job) => job.id === jobId) || null);
  },
  async listMyJobs() {
    return clone(
      state.jobs
        .filter((job) => job.submitterEmail === currentUser.email)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    );
  },
  async createJob(payload) {
    return update(() => {
      validatePayload(payload);
      let id;
      do {
        id = `PF-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      } while (state.jobs.some((job) => job.id === id));
      const submittedAt = nowIso();
      const job = {
        id,
        projectName: payload.projectName.trim(),
        submitterName: currentUser.name,
        submitterEmail: currentUser.email,
        recipientEmail: currentUser.email,
        fileName: payload.file.name,
        fileSize: formatFileSize(payload.file.sizeBytes),
        material: payload.material,
        color: payload.color,
        purpose: payload.purpose || "Not specified",
        notes: payload.notes || "",
        submittedAt,
        status: "SUBMITTED",
        assignedStaff: null,
        pickupLocation: null,
        completedAt: null,
        history: [{ type: "SUBMITTED", at: submittedAt, by: currentUser.name }],
      };
      state.jobs.unshift(job);
      return job;
    });
  },
  async claimJob(jobId) {
    return update(() => {
      const index = jobIndex(jobId);
      assert(index >= 0, "Job not found.");
      const job = state.jobs[index];
      assert(
        job.status === "SUBMITTED" && !job.assignedStaff,
        "This job is no longer available to claim.",
      );
      job.assignedStaff = currentStaff.name;
      job.status = "IN_PROGRESS";
      job.history.push({
        type: "CLAIMED",
        at: nowIso(),
        by: currentStaff.name,
      });
      return job;
    });
  },
  async startPrinting(jobId) {
    return update(() => {
      const index = jobIndex(jobId);
      assert(index >= 0, "Job not found.");
      const job = state.jobs[index];
      assert(job.status === "IN_PROGRESS", "Only an in-progress job can advance to printing.");
      assert(
        job.assignedStaff === currentStaff.name,
        "Only the assigned demo staff member can advance this job.",
      );
      job.status = "PRINTING";
      job.history.push({
        type: "PRINTING",
        at: nowIso(),
        by: currentStaff.name,
      });
      return job;
    });
  },
  async completeJob(jobId, payload) {
    const result = update(() => {
      const index = jobIndex(jobId);
      assert(index >= 0, "Job not found.");
      const job = state.jobs[index];
      assert(job.status === "PRINTING", "Only a printing job can be completed.");
      assert(
        job.assignedStaff === currentStaff.name,
        "Only the assigned demo staff member can complete this job.",
      );
      assert(
        typeof payload.pickupLocation === "string" && payload.pickupLocation.trim(),
        "Enter a pickup location.",
      );
      const completedAt = nowIso();
      job.status = "COMPLETED";
      job.pickupLocation = payload.pickupLocation.trim();
      job.completedAt = completedAt;
      job.history.push({
        type: "COMPLETED",
        at: completedAt,
        by: currentStaff.name,
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
          by: currentStaff.name,
        });
      }
      return { job, notification };
    });
    if (result.notification) {
      const notificationId = result.notification.id;
      setTimeout(() => {
        const notification = state.notifications.find((item) => item.id === notificationId);
        if (!notification || notification.status !== "PENDING") {
          return;
        }
        notification.status = "SENT";
        notification.simulatedAt = nowIso();
        writeState(state);
        window.dispatchEvent(new Event("printfarm:updated"));
      }, 900);
    }
    return result;
  },
  async listJobEvents(jobId) {
    const job = state.jobs.find((item) => item.id === jobId);
    return clone(job?.history || []);
  },
  async listNotifications(jobId = null) {
    return clone(
      jobId
        ? state.notifications.filter((item) => item.jobId === jobId)
        : state.notifications,
    );
  },
  async getNotification(notificationId) {
    return clone(state.notifications.find((item) => item.id === notificationId) || null);
  },
  async retryNotification(notificationId) {
    const result = update(() => {
      const item = state.notifications.find((notification) => notification.id === notificationId);
      assert(item, "Notification record not found.");
      assert(item.status === "FAILED", "Only a failed demo notification can be retried.");
      item.status = "PENDING";
      item.retriedAt = nowIso();
      item.simulated = true;
      const job = state.jobs.find((candidate) => candidate.id === item.jobId);
      job?.history.push({
        type: "NOTIFICATION_RETRIED_SIMULATED",
        at: item.retriedAt,
        by: currentStaff.name,
      });
      return item;
    });
    setTimeout(() => {
      const item = state.notifications.find((notification) => notification.id === notificationId);
      if (item?.status !== "PENDING") {
        return;
      }
      item.status = "SENT";
      item.simulatedAt = nowIso();
      writeState(state);
      window.dispatchEvent(new Event("printfarm:updated"));
    }, 900);
    return result;
  },
  async summary() {
    const today = new Date().toDateString();
    return {
      unclaimed: state.jobs.filter((job) => job.status === "SUBMITTED" && !job.assignedStaff).length,
      inProgress: state.jobs.filter((job) => job.status === "IN_PROGRESS").length,
      printing: state.jobs.filter((job) => job.status === "PRINTING").length,
      completedToday: state.jobs.filter((job) => (
        job.status === "COMPLETED"
        && job.completedAt
        && new Date(job.completedAt).toDateString() === today
      )).length,
      total: state.jobs.length,
    };
  },
  async listMyActiveJobs() {
    return clone(
      state.jobs.filter((job) => (
        job.assignedStaff === currentStaff.name && job.status !== "COMPLETED"
      )),
    );
  },
  async getMaterials() {
    return clone(MATERIALS);
  },
  async resetDemo() {
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
    return clone(currentUser);
  },
  currentStaff() {
    return clone(currentStaff);
  },
  availableStatuses() {
    return [...STATUSES];
  },
};

const MATERIAL_IDS = new Set(MATERIALS.map(({ id }) => id));
const INVENTORY_UNITS = new Set(["g", "kg", "spools"]);
const localId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;

function validateInventory(payload) {
  assert(MATERIAL_IDS.has(payload.material), "Choose one of the supported materials.");
  assert(typeof payload.color === "string" && payload.color.trim().length > 0 && payload.color.trim().length <= 60, "Enter a color name of up to 60 characters.");
  assert(payload.color.trim().toLowerCase() !== "[object object]", "Enter a valid color name.");
  assert(Number.isFinite(Number(payload.quantity)) && Number(payload.quantity) >= 0, "Stock quantity must be zero or greater.");
  assert(INVENTORY_UNITS.has(payload.unit), "Choose grams, kilograms, or spools as the unit.");
  assert(Number.isFinite(Number(payload.lowStockThreshold)) && Number(payload.lowStockThreshold) >= 0, "Low-stock threshold must be zero or greater.");
  assert(typeof payload.notes === "string" && payload.notes.length <= 300, "Notes must be 300 characters or fewer.");
}

function inventoryStatus(item) {
  if (!item.available) return "Unavailable";
  if (Number(item.quantity) <= 0) return "Out of stock";
  if (Number(item.quantity) <= Number(item.lowStockThreshold || 0)) return "Low stock";
  return "Available";
}

export const inventoryService = {
  async listInventory() {
    state = readState();
    return clone([...state.inventory].sort((a, b) => (
      MATERIALS.findIndex(({ id }) => id === a.material) - MATERIALS.findIndex(({ id }) => id === b.material)
      || a.color.localeCompare(b.color)
    )));
  },
  async listAvailable() {
    state = readState();
    return clone(state.inventory.filter((item) => item.available && Number(item.quantity) > 0));
  },
  async getItem(id) {
    state = readState();
    return clone(state.inventory.find((item) => item.id === id) || null);
  },
  async add(payload) {
    return update(() => {
      const normalized = {
        ...payload,
        material: String(payload.material || ""),
        color: String(payload.color || "").trim(),
        quantity: Number(payload.quantity),
        lowStockThreshold: Number(payload.lowStockThreshold),
        notes: String(payload.notes || "").trim(),
        available: Boolean(payload.available),
      };
      validateInventory(normalized);
      const duplicate = state.inventory.some((item) => item.material === normalized.material && item.color.toLowerCase() === normalized.color.toLowerCase());
      assert(!duplicate, "That material and color already have an inventory entry. Edit the existing row instead.");
      const timestamp = nowIso();
      const item = {
        id: localId("FIL"),
        ...normalized,
        adjustments: [{ type: "initial", delta: normalized.quantity, note: "Initial stock", at: timestamp, by: currentStaff.name }],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state.inventory.unshift(item);
      return item;
    });
  },
  async update(id, payload) {
    return update(() => {
      const item = state.inventory.find((entry) => entry.id === id);
      assert(item, "Inventory entry not found. Refresh the page and try again.");
      const normalized = {
        ...payload,
        material: String(payload.material || ""),
        color: String(payload.color || "").trim(),
        quantity: Number(payload.quantity),
        lowStockThreshold: Number(payload.lowStockThreshold),
        notes: String(payload.notes || "").trim(),
        available: Boolean(payload.available),
      };
      validateInventory(normalized);
      const duplicate = state.inventory.some((entry) => entry.id !== id && entry.material === normalized.material && entry.color.toLowerCase() === normalized.color.toLowerCase());
      assert(!duplicate, "Another entry already uses that material and color.");
      const previousQuantity = Number(item.quantity);
      Object.assign(item, normalized, { updatedAt: nowIso() });
      if (previousQuantity !== normalized.quantity) {
        item.adjustments ||= [];
        item.adjustments.unshift({
          type: "set",
          delta: normalized.quantity - previousQuantity,
          note: "Quantity changed in inventory form",
          at: item.updatedAt,
          by: currentStaff.name,
        });
      }
      return item;
    });
  },
  async adjust(id, payload) {
    return update(() => {
      const item = state.inventory.find((entry) => entry.id === id);
      assert(item, "Inventory entry not found. Refresh the page and try again.");
      const amount = Number(payload.amount);
      assert(Number.isFinite(amount) && amount > 0, "Enter an adjustment greater than zero.");
      assert(["receive", "consume"].includes(payload.action), "Choose whether stock was received or consumed.");
      const delta = payload.action === "receive" ? amount : -amount;
      assert(Number(item.quantity) + delta >= 0, "This adjustment cannot reduce stock below zero.");
      item.quantity = Number(item.quantity) + delta;
      item.updatedAt = nowIso();
      item.adjustments ||= [];
      item.adjustments.unshift({
        type: payload.action,
        delta,
        note: String(payload.note || "").trim().slice(0, 120),
        at: item.updatedAt,
        by: currentStaff.name,
      });
      return item;
    });
  },
  status: inventoryStatus,
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
    state = readState();
    const search = String(filters.student || "").trim().toLowerCase();
    return clone(state.contributions.filter((item) => (
      (!search || item.student.toLowerCase().includes(search))
      && (!filters.from || item.date >= filters.from)
      && (!filters.to || item.date <= filters.to)
    )).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)));
  },
  async listAll() {
    state = readState();
    return clone([...state.contributions]);
  },
  async add(payload) {
    return update(() => {
      const normalized = { ...payload, student: String(payload.student || "").trim(), date: String(payload.date || ""), hours: Number(payload.hours), activity: String(payload.activity || "").trim() };
      validateContribution(normalized);
      const timestamp = nowIso();
      const record = { id: localId("HRS"), ...normalized, createdAt: timestamp, updatedAt: timestamp, createdBy: currentStaff.name };
      state.contributions.unshift(record);
      return record;
    });
  },
  async update(id, payload) {
    return update(() => {
      const record = state.contributions.find((item) => item.id === id);
      assert(record, "Contribution record not found. Refresh the page and try again.");
      const normalized = { ...payload, student: String(payload.student || "").trim(), date: String(payload.date || ""), hours: Number(payload.hours), activity: String(payload.activity || "").trim() };
      validateContribution(normalized);
      Object.assign(record, normalized, { updatedAt: nowIso() });
      return record;
    });
  },
};
