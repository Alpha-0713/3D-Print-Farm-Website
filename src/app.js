import { contributionsService, hoursService, inventoryService, jobsService, rgbFromHex } from "./services.js?v=20";
import { filesService, getModelFileExtension, MAX_MODEL_FILE_SIZE } from "./filesService.js?v=20";
import { notificationsService } from "./notificationsService.js?v=20";
import { dateTime, esc, printNumber } from "./pageShared.js?v=25";
import { accessDeniedPage, homePage } from "./publicPages.js?v=24";
import { authService, DEMO_ACCOUNTS_STORAGE_KEY, DEMO_ROLE_STORAGE_KEY } from "./authService.js?v=20";
import { ACTION_PERMISSIONS, FORM_PERMISSIONS, PERMISSION_LABELS, PERMISSIONS, ROUTE_PERMISSIONS } from "./authorization.js?v=20";
import { getStartedPage } from "./requestWizard.js?v=25";
import { myJobsPage } from "./studentPages.js?v=24";
import {
  activeJobsPage,
  jobDetailsPage,
  staffMaterialDetail,
  staffMaterialForm,
  staffMaterials,
  staffOverview,
} from "./staffPages.js?v=24";
import { staffHours } from "./hoursPages.js?v=24";

const app = document.querySelector("#app");
const toastRoot = document.querySelector("#toast-root");

const state = {
  menuOpen: false,
  hoursFilters: { student: "", from: "", to: "" },
  hoursEditingId: "",
  hoursStaffSearch: "",
  wizard: {
    step: 1,
    file: null,
    modelFile: null,
    previewStatus: "empty",
    fileFeedback: "",
    linkUrl: "",
    modelSource: "",
    sourceUrl: "",
    loadingLink: false,
    projectName: "",
    purpose: "Personal project",
    notes: "",
    material: "PLA",
    color: "Black",
    submittedJob: null,
  },
};

const ACCENT_STORAGE_KEY = "three-d-print-farm-accent";
const ACCENT_IDS = new Set(["green", "blue", "purple", "teal", "orange", "rose"]);

function syncAppearanceControls() {
  const root = document.documentElement;
  root.dataset.theme = "dark";
  const accent = root.dataset.accent || "green";
  const names = { green: "Green", blue: "Blue", purple: "Purple", teal: "Teal", orange: "Orange", rose: "Rose" };
  document.querySelectorAll(".accent-option").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.accent === accent)));
  document.querySelectorAll(".accent-picker summary").forEach((summary) => {
    summary.setAttribute("aria-label", "Choose accent color. Current color: " + (names[accent] || "Green"));
    summary.querySelector(".accent-picker-label").textContent = names[accent] || "Green";
  });
  const color = getComputedStyle(root).getPropertyValue("--accent-primary").trim();
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon && /^#[\da-f]{6}$/i.test(color)) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" rx="7" fill="#181818"/><path d="M5 7h26v6H5zm0 9h20v6H5zm0 9h14v6H5z" fill="' + color + '"/></svg>';
    favicon.href = "data:image/svg+xml," + encodeURIComponent(svg);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = "#181818";
}

function applyAppearance({ accent, persist = true } = {}) {
  const root = document.documentElement;
  if (ACCENT_IDS.has(accent)) root.dataset.accent = accent;
  if (persist) {
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, root.dataset.accent || "green");
    } catch {
      // Keep the current page responsive when browser storage is unavailable.
    }
  }
  syncAppearanceControls();
}

function decodeRouteId(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

let modelPreviewModule;
let renderRevision = 0;
let linkController = null;
let lastRenderedRouteKey = "";
let routeMotionObserver = null;
let routeMotionCleanup = null;

function clearRouteMotion() {
  routeMotionObserver?.disconnect();
  routeMotionObserver = null;
  routeMotionCleanup?.();
  routeMotionCleanup = null;
}

function prepareRouteMotion(routeChanged) {
  if (!routeChanged || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const entrance = app.querySelector(".public-main > section:first-child, .get-started, .my-jobs, .staff-app, .access-denied");
  entrance?.classList.add("route-enter");
  if (entrance) window.setTimeout(() => entrance.classList.remove("route-enter"), 420);

  const targets = [...app.querySelectorAll(
    ".public-main > section:not(:first-child), .staff-content > :not(.metric-grid):not(.active-jobs-grid), " +
    ".metric-grid > *, .active-jobs-grid > *, .printer-grid > *, .jobs-grid > *, .get-started, .my-jobs, .access-denied"
  )].filter((target) => target !== entrance);
  if (!targets.length) return;

  app.classList.add("motion-enhanced");
  const staggerGroups = new Map();
  const revealTarget = (target) => {
    target.classList.add("is-visible");
    routeMotionObserver?.unobserve(target);
  };
  if (typeof window.IntersectionObserver === "function") {
    routeMotionObserver = new window.IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) revealTarget(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
  }

  targets.forEach((target) => {
    target.classList.add("motion-reveal");
    const parent = target.parentElement;
    if (parent?.matches(".metric-grid, .active-jobs-grid, .printer-grid, .jobs-grid")) {
      const index = staggerGroups.get(parent) || 0;
      target.style.setProperty("--motion-delay", `${Math.min(index, 4) * 42}ms`);
      staggerGroups.set(parent, index + 1);
    }
    routeMotionObserver?.observe(target);
  });

  if (!routeMotionObserver) {
    const pendingTargets = new Set(targets);
    let frame = 0;
    const cleanup = () => {
      window.removeEventListener("scroll", scheduleReveal, false);
      window.removeEventListener("resize", scheduleReveal, false);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (routeMotionCleanup === cleanup) routeMotionCleanup = null;
    };
    const revealVisibleTargets = () => {
      frame = 0;
      pendingTargets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 1.12 && rect.bottom >= 0) {
          target.classList.add("is-visible");
          pendingTargets.delete(target);
        }
      });
      if (!pendingTargets.size) cleanup();
    };
    function scheduleReveal() {
      if (!frame) frame = window.requestAnimationFrame(revealVisibleTargets);
    }
    window.addEventListener("scroll", scheduleReveal, { passive: true });
    window.addEventListener("resize", scheduleReveal, { passive: true });
    routeMotionCleanup = cleanup;
    scheduleReveal();
  }
}

const savedDraft = jobsService.getDraft();
if (savedDraft) {
  Object.assign(state.wizard, savedDraft, {
    step: 1,
    file: null,
    modelFile: null,
    previewStatus: "empty",
    fileFeedback: "",
    linkUrl: "",
    modelSource: "",
    sourceUrl: "",
    loadingLink: false,
    submittedJob: null,
  });
}

function parseRoute() {
  const rawValue = location.hash.slice(1) || "/";
  const value = rawValue.split("?")[0];

  const section = value.match(/^\/section\/([^/?#]+)/);
  if (section) {
    const sectionId = decodeURIComponent(section[1]);
    return { page: "home", section: sectionId === "faq" ? "faq" : "" };
  }

  const detail = value.match(/^\/staff\/jobs\/([^/?#]+)/);
  if (detail) {
    return { page: "job", id: decodeRouteId(detail[1]) };
  }

  if (value === "/staff/materials/new") return { page: "material-new" };
  const filament = value.match(/^\/staff\/materials\/([^/?#]+)$/);
  if (filament) return { page: "filament", id: decodeRouteId(filament[1]) };

  if (value === "/get-started") return { page: "get-started" };
  if (value === "/my-jobs") return { page: "my-jobs" };
  if (value === "/staff" || value === "/staff/") return { page: "staff" };
  if (value === "/staff/queue") return { page: "staff", redirect: true };
  if (value === "/staff/active") return { page: "active" };
  if (value === "/staff/materials") return { page: "materials" };
  const hoursStaff = value.match(/^\/staff\/hours\/staff\/([^/?#]+)$/);
  if (hoursStaff) return { page: "hours", staffId: decodeRouteId(hoursStaff[1]) };
  if (value === "/staff/hours") return { page: "hours" };
  if (value === "/staff/contributions") return { page: "hours", legacyContributionsRoute: true };

  return { page: "home" };
}

async function render() {
  const revision = ++renderRevision;
  clearRouteMotion();
  modelPreviewModule?.disposeModelPreview();
  const route = parseRoute();
  const routeKey = `${route.page}:${route.id || ""}:${route.staffId || ""}`;
  const routeChanged = routeKey !== lastRenderedRouteKey;
  lastRenderedRouteKey = routeKey;
  if (route.redirect) {
    location.hash = "#/staff";
    return;
  }
  const requiredPermission = route.page === "hours" && (route.staffId || authService.can(PERMISSIONS.HOURS_ADMIN))
    ? PERMISSIONS.HOURS_ADMIN
    : ROUTE_PERMISSIONS[route.page];
  if (requiredPermission && !authService.can(requiredPermission)) {
    document.title = "Access restricted · 3D Print Farm · v2.0.0";
    app.innerHTML = accessDeniedPage(state, requiredPermission);
    prepareRouteMotion(routeChanged);
    window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }
  const staffPages = ["staff", "active", "materials", "material-new", "filament", "hours", "job"];

  if (staffPages.includes(route.page)) {
    document.title = "Staff Portal · School 3D Print Farm — v2.0.0";
  } else if (route.page === "get-started") {
    document.title = "Get Started · School 3D Print Farm — v2.0.0";
  } else if (route.page === "my-jobs") {
    document.title = "My Jobs · School 3D Print Farm — v2.0.0";
  } else {
    document.title = "School 3D Print Farm Website — v2.0.0";
  }

  if (route.page === "home") {
    app.innerHTML = homePage(route.section, state, await inventoryService.listInventory());
  } else if (route.page === "get-started") {
    app.innerHTML = await getStartedPage(state);
  } else if (route.page === "my-jobs") {
    app.innerHTML = await myJobsPage(state);
  } else if (route.page === "staff") {
    app.innerHTML = await staffOverview();
  } else if (route.page === "active") {
    app.innerHTML = await activeJobsPage();
  } else if (route.page === "materials") {
    app.innerHTML = await staffMaterials();
  } else if (route.page === "material-new") {
    app.innerHTML = staffMaterialForm();
  } else if (route.page === "filament") {
    app.innerHTML = await staffMaterialDetail(route.id);
  } else if (route.page === "hours") {
    app.innerHTML = await staffHours({ staffId: route.staffId || "", search: state.hoursStaffSearch });
  } else if (route.page === "job") {
    app.innerHTML = await jobDetailsPage(route.id);
  }
  prepareRouteMotion(routeChanged);

  if (route.page === "get-started" && state.wizard.modelFile && !state.wizard.submittedJob) {
    const selectedFile = state.wizard.modelFile;
    const stage = document.querySelector("#model-preview");
    try {
      modelPreviewModule ||= await import("./modelPreview.js?v=20");
      if (revision !== renderRevision || selectedFile !== state.wizard.modelFile || !stage?.isConnected) return;
      await modelPreviewModule.mountModelPreview(stage, selectedFile, (status, message = "") => {
        if (revision !== renderRevision || selectedFile !== state.wizard.modelFile) return;
        state.wizard.previewStatus = status;
        state.wizard.fileFeedback = status === "error" ? message : "";
        const feedback = document.querySelector("#file-feedback");
        if (feedback) feedback.textContent = state.wizard.fileFeedback;
      });
    } catch {
      if (revision === renderRevision && selectedFile === state.wizard.modelFile) {
        state.wizard.previewStatus = "error";
        state.wizard.fileFeedback = "The 3D preview could not start. Check your connection and try again.";
        const feedback = document.querySelector("#file-feedback");
        const message = document.querySelector(".model-preview-message");
        if (feedback) feedback.textContent = state.wizard.fileFeedback;
        if (message) message.textContent = state.wizard.fileFeedback;
      }
    }
  }

  if (route.section) {
    requestAnimationFrame(() => {
      const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";

      document.getElementById(route.section)?.scrollIntoView({
        behavior,
        block: "start",
      });
    });
  } else {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

let toastTimer;
function toast(message, kind = "success") {
  toastRoot.innerHTML = `<div class="toast toast-${kind}" role="status">\
  <span>\
    ${kind === "error" ? "!" : "✓"}\
  </span>\
  ${esc(message)}\
</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastRoot.innerHTML = "";
  }, 3600);
}

async function setFile(file, { sourceUrl = "" } = {}) {
  if (!file) return;
  linkController?.abort();
  linkController = null;
  state.wizard.loadingLink = false;

  const selection = filesService.inspectSelection(file);
  if (!selection.valid) {
    state.wizard.file = null;
    state.wizard.modelFile = null;
    state.wizard.previewStatus = "error";
    state.wizard.fileFeedback = selection.error;
    state.wizard.modelSource = "";
    state.wizard.sourceUrl = "";
    await render();
    return;
  }

  state.wizard.file = selection.metadata;
  state.wizard.modelFile = file;
  state.wizard.previewStatus = "loading";
  state.wizard.fileFeedback = sourceUrl ? "Link loaded. Checking model geometry…" : "Checking model geometry…";
  state.wizard.modelSource = sourceUrl ? "link" : "device";
  state.wizard.sourceUrl = sourceUrl;
  await render();
}

function linkedFileName(response, requestedUrl) {
  const disposition = response.headers.get("content-disposition") || "";
  let headerName = "";
  const encoded = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  try { headerName = encoded ? decodeURIComponent(encoded[1].trim()) : (plain?.[1]?.trim() || ""); } catch { headerName = plain?.[1]?.trim() || ""; }

  const candidates = [headerName, response.url, requestedUrl];
  for (const candidate of candidates) {
    if (!candidate) continue;
    let name = candidate;
    try {
      const url = new URL(candidate);
      name = decodeURIComponent(url.pathname.split("/").pop() || "");
    } catch {
      name = candidate.split(/[\\/]/).pop() || "";
    }
    name = name.replace(/[\/\x00-\x1f]/g, "").replace(/\\/g, "").trim();
    const extension = getModelFileExtension(name);
    if (["stl", "3mf", "obj"].includes(extension)) return name;
  }
  throw new Error("The link does not point to a supported STL, 3MF, or OBJ file.");
}

async function loadModelFromLink(value) {
  const requested = String(value || "").trim();
  state.wizard.linkUrl = requested;
  state.wizard.file = null;
  state.wizard.modelFile = null;
  state.wizard.previewStatus = "empty";
  state.wizard.modelSource = "";
  state.wizard.sourceUrl = "";
  state.wizard.loadingLink = false;
  linkController?.abort();
  linkController = null;

  const checked = filesService.inspectUrl(requested);
  if (!checked.valid) {
    state.wizard.fileFeedback = checked.error;
    await render();
    return;
  }

  const controller = new AbortController();
  linkController = controller;
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
  state.wizard.loadingLink = true;
  state.wizard.fileFeedback = "Retrieving the linked model…";
  await render();

  try {
    const response = await fetch(checked.url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`The model link returned HTTP ${response.status}.`);
    const finalUrl = new URL(response.url || checked.url);
    if (finalUrl.protocol !== "https:") throw new Error("The model link redirected away from HTTPS. Use a direct HTTPS file URL.");

    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (contentType === "text/html" || contentType === "application/xhtml+xml" || contentType === "application/json") {
      throw new Error("The link returned a web page instead of a model file. Use a direct download URL.");
    }
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_MODEL_FILE_SIZE) {
      throw new Error("The linked model is larger than the 25 MB demo limit.");
    }

    const fileName = linkedFileName(response, checked.url);
    const reader = response.body?.getReader();
    let blob;
    if (reader) {
      const chunks = [];
      let total = 0;
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        total += chunk.byteLength;
        if (total > MAX_MODEL_FILE_SIZE) {
          await reader.cancel();
          throw new Error("The linked model is larger than the 25 MB demo limit.");
        }
        chunks.push(chunk);
      }
      blob = new Blob(chunks, { type: contentType || "application/octet-stream" });
    } else {
      blob = await response.blob();
    }
    if (!blob.size) throw new Error("The linked model file is empty.");
    if (blob.size > MAX_MODEL_FILE_SIZE) throw new Error("The linked model is larger than the 25 MB demo limit.");

    linkController = null;
    state.wizard.loadingLink = false;
    await setFile(new File([blob], fileName, { type: blob.type || "application/octet-stream" }), { sourceUrl: checked.url });
  } catch (error) {
    if (linkController !== controller) return;
    state.wizard.loadingLink = false;
    state.wizard.file = null;
    state.wizard.modelFile = null;
    state.wizard.previewStatus = "error";
    state.wizard.modelSource = "";
    state.wizard.sourceUrl = "";
    state.wizard.fileFeedback = timedOut
      ? "The download timed out. Try another direct HTTPS model link."
      : error.name === "AbortError"
        ? "The download was cancelled. Try again with a direct HTTPS model link."
        : error instanceof TypeError
          ? "The link could not be read. It may require sign-in or block browser access (CORS). Use a direct HTTPS download URL."
          : (error.message || "The model could not be downloaded from this link.");
    await render();
  } finally {
    clearTimeout(timeout);
    if (linkController === controller) linkController = null;
  }
}

function openCompletionDialog(job) {
  const priorDialog = document.querySelector("#completion-dialog");
  priorDialog?.remove();

  const dialog = document.createElement("dialog");
  dialog.id = "completion-dialog";
  dialog.className = "completion-dialog";
  dialog.innerHTML = `<form id="completion-form" method="dialog" data-job-id="${esc(job.id)}">\
  <div class="dialog-top">\
    <div>\
      <span class="eyebrow">\
        COMPLETE DEMO JOB\
      </span>\
      <h2>\
        Ready for pickup?\
      </h2>\
    </div>\
    <button type="button" class="icon-button" data-action="close-dialog" aria-label="Close dialog">\
      ×\
    </button>\
  </div>\
  <p class="dialog-job">\
    ${printNumber(job.id)} · ${esc(job.projectName)}\
  </p>\
  <label class="field">\
    <span>\
      Pickup location \
      <b>\
        *\
      </b>\
    </span>\
    <input name="pickupLocation" type="text" required maxlength="120" placeholder="e.g. School office" />\
  </label>\
  <div class="recipient-field">\
    <span>\
      Recipient email\
    </span>\
    <strong>\
      ${esc(job.recipientEmail)}\
    </strong>\
    <small>\
      Fictional demo recipient\
    </small>\
  </div>\
  <label class="notification-choice">\
    <input name="notifyRecipient" type="checkbox" value="yes" />\
    <span>\
      <strong>\
        Simulate pickup notification\
      </strong>\
      <small>\
        Optional · no real email will be sent\
      </small>\
    </span>\
  </label>\
  <div class="email-preview" id="email-preview" hidden>\
    <span class="eyebrow">\
      EMAIL PREVIEW · DEMO\
    </span>\
    <strong>\
      Subject: Your 3D print is ready for pickup\
    </strong>\
    <p>\
      Your print job has been completed. You can collect it at \
      <span data-preview-location>\
        [pickup location]\
      </span>\
      . Please contact the Print Farm staff if you have any questions.\
    </p>\
    <small>\
      Preview only. This message will not be sent.\
    </small>\
  </div>\
  <div class="dialog-actions">\
    <button type="button" class="button button-outline" data-action="close-dialog">\
      Cancel\
    </button>\
    <button type="submit" class="button button-lime">\
      Confirm completion \
      <span>\
        ✓\
      </span>\
    </button>\
  </div>\
</form>`;

  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector('[name="pickupLocation"]').focus();

  dialog.addEventListener("close", () => {
    setTimeout(() => dialog.remove(), 0);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target.closest('[data-action="close-dialog"]')) {
      dialog.close();
      dialog.remove();
    }
  });

  dialog.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.target;
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton.disabled) return;
    if (!authService.can(PERMISSIONS.JOBS_MANAGE)) {
      dialog.close();
      dialog.remove();
      toast("Access denied: this demo identity cannot manage print jobs.", "error");
      return;
    }
    submitButton.disabled = true;

    try {
      const result = await jobsService.completeJob(form.dataset.jobId, {
        pickupLocation: form.elements.pickupLocation.value,
        notifyRecipient: form.elements.notifyRecipient.checked,
      });

      dialog.close();
      dialog.remove();
      toast(
        result.notification
          ? "Job completed. Pickup notification simulated locally."
          : "Job completed without creating a notification.",
      );
      await render();
    } catch (error) {
      submitButton.disabled = false;
      toast(error.message || "Could not complete this job.", "error");
    }
  });

  dialog.querySelector('[name="pickupLocation"]').addEventListener("input", (event) => {
    const previewLocation = dialog.querySelector("[data-preview-location]");
    previewLocation.textContent = event.target.value || "[pickup location]";
  });

  dialog.querySelector('[name="notifyRecipient"]').addEventListener("change", (event) => {
    dialog.querySelector("#email-preview").hidden = !event.target.checked;
  });
}

async function doAction(action, target) {
  const id = target.dataset.id;
  const requiredPermission = ACTION_PERMISSIONS[action];
  if (requiredPermission && !authService.can(requiredPermission)) {
    toast("Access denied: this demo identity cannot " + (PERMISSION_LABELS[requiredPermission] || "perform that action") + ".", "error");
    return;
  }

  try {
    if (action === "switch-role") {
      target.closest(".role-switcher")?.removeAttribute("open");
      if (!authService.switchRole(target.dataset.identityId)) throw new Error("That demonstration identity is unavailable.");
      await render();
    } else if (action === "set-accent") {
      if (ACCENT_IDS.has(target.dataset.accent)) {
        applyAppearance({ accent: target.dataset.accent });
        target.closest(".accent-picker").open = false;
      }
      return;
    } else if (action === "inventory-toggle") {
      const item = await inventoryService.toggleAvailability(id);
      toast(`${item.material} · ${item.color} is now ${item.available ? "available" : "unavailable"}.`);
      await render();
    } else if (action === "inventory-low-stock-toggle") {
      const item = await inventoryService.toggleLowStock(id);
      toast(`Low Stock is ${item.lowStock ? "on" : "off"} for ${item.material} · ${item.color}.`);
      await render();
    } else if (action === "inventory-delete") {
      const label = target.dataset.label || "this filament";
      if (!window.confirm(`Delete ${label}? This permanently removes it from Materials and new print requests.`)) return;
      await inventoryService.remove(id);
      toast("Filament deleted and removed from new requests.");
      await render();
    } else if (action === "claim-job") {
      await jobsService.claimJob(id);
      toast("Job claimed and assigned to " + authService.getCurrentIdentity().name + ".");
      await render();
    } else if (action === "start-printing") {
      await jobsService.startPrinting(id);
      toast("Job status updated to Printing.");
      await render();
    } else if (action === "complete-job") {
      const job = await jobsService.getJob(id);
      if (!job) throw new Error("Job not found.");
      openCompletionDialog(job);
    } else if (action === "retry-notification") {
      await notificationsService.retry(id);
      toast("Demo notification retry marked as simulated sent.");
      await render();
    } else if (action === "hours-edit") {
      state.hoursEditingId = id;
      await render();
    } else if (action === "hours-cancel-edit") {
      state.hoursEditingId = "";
      await render();
    } else if (action === "hours-clear-filters") {
      state.hoursFilters = { student: "", from: "", to: "" };
      await render();
    } else if (action === "hours-approve") {
      const detail = `${target.dataset.type || "hour adjustment"} of ${target.dataset.hours || ""}`.trim();
      if (!window.confirm(`Approve ${detail} for ${target.dataset.name || "this staff member"}? This will update the balance and permanently record a transaction.`)) return;
      await hoursService.approveRequest(id);
      toast("Request approved and the hour adjustment was recorded.");
      await render();
    } else if (action === "hours-reject") {
      const rejectionReason = window.prompt("Optional reason for rejecting this request:", "");
      if (rejectionReason === null) return;
      if (!window.confirm(`Reject ${target.dataset.name || "this staff member"}'s request for ${target.dataset.hours || "the requested hours"}? The balance will not change.`)) return;
      await hoursService.rejectRequest(id, rejectionReason);
      toast("Request rejected. The staff member can now see the decision.");
      await render();
    } else if (action === "close-dialog") {
      const dialog = document.querySelector("#completion-dialog");
      dialog?.close();
      dialog?.remove();
    } else if (action === "wizard-next") {
      if (state.wizard.step === 1 && (!state.wizard.file || !state.wizard.modelFile)) {
        toast("Choose an STL, 3MF, or OBJ file, or load a model link.", "error");
        document.querySelector("#model-file")?.focus();
        return;
      }
      if (state.wizard.step === 1 && state.wizard.previewStatus !== "ready") {
        toast(state.wizard.previewStatus === "loading" ? "Wait for the model preview to finish loading." : "Fix the model preview error before continuing.", "error");
        return;
      }

      if (state.wizard.step === 2) {
        const selection = await inventoryService.getItem(state.wizard.inventoryId);
        if (!selection || !selection.available || !selection.hexColor) {
          toast("That filament is no longer available. Choose a current option or ask staff to verify its color.", "error");
          state.wizard.inventoryId = "";
          await render();
          return;
        }
      }

      if (state.wizard.step === 3 && !state.wizard.projectName.trim()) {
        toast("Enter a project name to continue.", "error");
        document.querySelector('[data-field="projectName"]')?.focus();
        return;
      }

      state.wizard.step = Math.min(4, state.wizard.step + 1);
      await render();
    } else if (action === "wizard-back") {
      state.wizard.step = Math.max(1, state.wizard.step - 1);
      await render();
    } else if (action === "wizard-goto") {
      const step = Number(target.dataset.step);
      if (step < state.wizard.step) {
        state.wizard.step = step;
        await render();
      }
    } else if (action === "remove-file") {
      state.wizard.file = null;
      state.wizard.modelFile = null;
      state.wizard.previewStatus = "empty";
      state.wizard.fileFeedback = "";
      state.wizard.modelSource = "";
      state.wizard.sourceUrl = "";
      state.wizard.linkUrl = "";
      await render();
    } else if (action === "save-draft") {
      const { file, modelFile, previewStatus, fileFeedback, linkUrl, modelSource, sourceUrl, loadingLink, submittedJob, step, ...fields } = state.wizard;
      if (jobsService.saveDraft(fields)) {
        toast("Draft saved on this device. You will need to choose the model file again.");
      } else {
        toast("Draft could not be saved in this browser.", "error");
      }
    } else if (action === "discard-draft") {
      jobsService.discardDraft();
      toast("Saved draft discarded.");
    } else if (action === "submit-request") {
      if (state.wizard.submitting) return;
      state.wizard.submitting = true;

      try {
        const { modelFile, previewStatus, fileFeedback, linkUrl, modelSource, sourceUrl, loadingLink, ...request } = state.wizard;
        const job = await jobsService.createJob({ ...request, file: state.wizard.file });
        state.wizard.submittedJob = job;
        state.wizard.submitting = false;
        jobsService.discardDraft();
        toast("Demo request added locally.");
        await render();
      } catch (error) {
        state.wizard.submitting = false;
        toast(error.message || "Review the request details.", "error");
      }
    } else if (action === "new-request") {
      jobsService.discardDraft();
      state.wizard = {
        step: 1,
        file: null,
        modelFile: null,
        previewStatus: "empty",
        fileFeedback: "",
        linkUrl: "",
        modelSource: "",
        sourceUrl: "",
        loadingLink: false,
        projectName: "",
        purpose: "Personal project",
        notes: "",
        material: "PLA",
        color: "Black",
        submittedJob: null,
      };
      await render();
    } else if (action === "menu-toggle") {
      state.menuOpen = !state.menuOpen;
      await render();
    } else if (action === "copy-job") {
      await navigator.clipboard?.writeText(printNumber(id));
      toast("Print number copied.");
    }
  } catch (error) {
    toast(error.message || "The action could not be completed.", "error");
  }
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const isWizardStepButton = target.matches("[role=button]") || target.tagName === "BUTTON";
  if (action === "wizard-goto" && !isWizardStepButton) return;
  if (action !== "close-dialog") event.preventDefault();
  doAction(action, target);
});

app.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form).entries());
  const action = form.dataset.form;
  const requiredPermission = FORM_PERMISSIONS[action];
  if (requiredPermission && !authService.can(requiredPermission)) {
    toast("Access denied: this demo identity cannot " + (PERMISSION_LABELS[requiredPermission] || "submit that form") + ".", "error");
    return;
  }

  if (action === "model-link") {
    await loadModelFromLink(values.modelUrl);
    return;
  }

  if (action === "hours-filter") {
    if (values.from && values.to && values.from > values.to) {
      toast("The start date must be before the end date.", "error");
      return;
    }
    state.hoursFilters = { student: values.student || "", from: values.from || "", to: values.to || "" };
    await render();
    return;
  }

  if (action === "hours-admin-filter") {
    state.hoursStaffSearch = String(values.search || "").trim();
    await render();
    return;
  }

  if (form.dataset.saving === "true") return;
  form.dataset.saving = "true";
  const submitButton = form.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  try {
    if (action === "create-demo-account") {
      const account = authService.createDemoAccount(values);
      if (!authService.switchRole(account.id)) throw new Error("The new demo account could not be selected.");
      if (location.hash !== "#/") location.hash = "#/";
      await render();
      const role = authService.getCurrentRole();
      toast(`${account.name} demo account created · Level ${role.level}.`);
    } else if (action === "job-reassign") {
      const job = await jobsService.reassignJob(form.dataset.id, values.assigneeId);
      await render();
      toast("Job reassigned to " + job.assignedStaff + ".");
    } else if (action === "inventory-add") {
      await inventoryService.add(values);
      location.hash = "#/staff/materials";
      await render();
      toast("Filament added and available for new requests.");
    } else if (action === "hours-add") {
      await contributionsService.add(values);
      await render();
      toast("Student contribution saved.");
    } else if (action === "hours-update") {
      await contributionsService.update(form.dataset.id, values);
      state.hoursEditingId = "";
      await render();
      toast("Contribution record updated.");
    } else if (action === "hours-request") {
      await hoursService.submitRequest(values);
      await render();
      toast("Adjustment request submitted for Level 4 review. Your balance has not changed.");
    } else if (action === "hours-admin-adjust") {
      const amountCenti = Math.round(Number(values.hours) * 100);
      const beforeCenti = Number(form.dataset.balanceCenti);
      const deltaCenti = values.adjustmentType === "add" ? amountCenti : -amountCenti;
      const afterCenti = beforeCenti + deltaCenti;
      const adjustmentVerb = values.adjustmentType === "add" ? "add" : "subtract";
      if (!Number.isSafeInteger(amountCenti) || amountCenti <= 0 || !Number.isSafeInteger(afterCenti) || afterCenti < 0) {
        form.dataset.saving = "false";
        if (submitButton) submitButton.disabled = false;
        toast("Enter a valid positive amount that will keep the balance at zero or above.", "error");
        return;
      }
      if (!window.confirm(`Confirm ${adjustmentVerb}ing ${values.hours} hour(s) for this staff member? Balance: ${(beforeCenti / 100).toFixed(2)} → ${(afterCenti / 100).toFixed(2)} hours. Reason: ${String(values.reason || "").trim()}`)) {
        form.dataset.saving = "false";
        if (submitButton) submitButton.disabled = false;
        return;
      }
      await hoursService.adjustStaffHours(form.dataset.userId, values);
      await render();
      toast("Hours corrected and saved to the transaction history.");
    } else if (action === "hours-admin-give") {
      const amountCenti = Math.round(Number(values.hours) * 100);
      const beforeCenti = Number(form.dataset.balanceCenti);
      const afterCenti = beforeCenti + amountCenti;
      if (!Number.isSafeInteger(amountCenti) || amountCenti <= 0 || amountCenti > 2400 || !Number.isSafeInteger(afterCenti)) {
        form.dataset.saving = "false";
        if (submitButton) submitButton.disabled = false;
        toast("Enter an amount from 0.01 to 24 hours.", "error");
        return;
      }
      if (!window.confirm(`Give ${values.hours} hour(s) to ${form.dataset.userName}? Balance: ${(beforeCenti / 100).toFixed(2)} → ${(afterCenti / 100).toFixed(2)} hours. Activity: ${String(values.activity || "").trim()}`)) {
        form.dataset.saving = "false";
        if (submitButton) submitButton.disabled = false;
        return;
      }
      await hoursService.giveHours(form.dataset.userId, values);
      await render();
      toast("Hours given and added to the staff member’s contribution and transaction history.");
    }
  } catch (error) {
    form.dataset.saving = "false";
    if (submitButton) submitButton.disabled = false;
    toast(error.message || "The change could not be saved.", "error");
  }
});

function updateHoursPreview(form) {
  if (!form?.matches(".hours-admin-adjust-form, .hours-admin-give-form")) return;
  const input = form.elements.hours;
  const amount = String(input?.value || "").trim();
  const preview = form.querySelector("[data-hours-proposed]");
  const beforeCenti = Number(form.dataset.balanceCenti);
  const amountIsValid = /^\d+(?:\.\d{1,2})?$/.test(amount) && Number(amount) > 0;
  if (!preview) return;
  if (!amountIsValid || !Number.isFinite(beforeCenti)) {
    preview.textContent = "Enter a valid amount";
    preview.closest("span")?.classList.remove("is-negative");
    return;
  }
  const amountCenti = Math.round(Number(amount) * 100);
  const isGivingHours = form.matches(".hours-admin-give-form");
  const afterCenti = beforeCenti + (isGivingHours ? amountCenti : -amountCenti);
  preview.textContent = `${(afterCenti / 100).toFixed(2).replace(/\.00$/, "")} h`;
  preview.closest("span")?.classList.toggle("is-negative", afterCenti < 0);
}

app.addEventListener("input", (event) => {
  const target = event.target;

  if (target.matches("[data-hours-preview-input]")) updateHoursPreview(target.form);

  if (target.matches("[data-hex-input]")) {
    const preview = target.form?.querySelector("[data-rgb-preview]");
    const rgb = rgbFromHex(target.value);
    const rgbText = preview?.querySelector("[data-color-rgb]");
    const swatch = preview?.querySelector("[data-color-swatch]");
    const hexMatch = /^#?([\da-f]{6})$/i.exec(target.value.trim());
    if (rgbText) rgbText.textContent = rgb || "Enter a valid HEX value such as #2F80ED.";
    if (swatch) swatch.style.setProperty("--filament-color", hexMatch ? `#${hexMatch[1].toUpperCase()}` : "transparent");
    target.setCustomValidity(target.value && !rgb ? "Use a six-digit HEX value in the format #RRGGBB." : "");
  }

  if (target.matches("#model-link-url")) state.wizard.linkUrl = target.value;

  if (target.matches("[data-field]")) {
    const key = target.dataset.field;
    state.wizard[key] = target.value;

    const counter = document.querySelector(`[data-counter="${key}"]`);
    if (counter) counter.textContent = target.value.length;

  }

});

app.addEventListener("change", async (event) => {
  const target = event.target;

  if (target.matches("[data-hours-preview-input]")) updateHoursPreview(target.form);

  if (target.matches("[data-hex-input]")) {
    const hexMatch = /^#?([\da-f]{6})$/i.exec(target.value.trim());
    if (hexMatch) target.value = `#${hexMatch[1].toUpperCase()}`;
  }

  if (target.matches("#model-file")) {
    void setFile(target.files?.[0]);
  }

  if (target.matches("[data-field]")) {
    const key = target.dataset.field;
    state.wizard[key] = target.value;

    if (key === "inventoryId") {
      const selection = await inventoryService.getItem(target.value);
      if (selection) {
        state.wizard.material = selection.material;
        state.wizard.color = selection.color;
      }
      render();
      return;
    }

    if (key === "material" || key === "color") {
      const panel = document.querySelector(".wizard-layout");
      if (panel) render();
    }
  }

});

app.addEventListener("dragover", (event) => {
  if (event.target.closest("[data-drop-zone]")) event.preventDefault();
});

app.addEventListener("drop", (event) => {
  if (!event.target.closest("[data-drop-zone]")) return;
  event.preventDefault();
  void setFile(event.dataTransfer.files?.[0]);
});

window.addEventListener("hashchange", () => {
  state.menuOpen = false;
  render();
});

window.addEventListener("storage", async (event) => {
  if (event.key === DEMO_ROLE_STORAGE_KEY) {
    await render();
    return;
  }
  if (event.key === DEMO_ACCOUNTS_STORAGE_KEY) {
    await render();
    return;
  }
  if (event.key === ACCENT_STORAGE_KEY) {
    applyAppearance({
      accent: ACCENT_IDS.has(event.newValue) ? event.newValue : "green",
      persist: false,
    });
    return;
  }
  if (event.key !== "three-d-print-farm-demo-v3") return;
  await jobsService.refreshFromStorage();
  await render();
});

window.addEventListener("printfarm:updated", render);

syncAppearanceControls();
render();
