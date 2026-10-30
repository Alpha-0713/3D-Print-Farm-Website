import { parseRoute as parseHashRoute } from "./routes.js";
import { freshWizard, restoreWizard, draftFields } from "./wizardState.js";
import { errorMessage } from "./serviceError.js";
import { diagnosticsService, refreshService } from "./services.js?v=2.2&rev=5";
import { publicHeader, footer } from "./pageShared.js?v=2.4&rev=4";
import { syncHeaderSurface } from "./headerSurface.js?v=2.4&rev=4";
import { syncSidebarState, toggleSidebar, SIDEBAR_STORAGE_KEY } from "./sidebarState.js?v=2.3";
import { disposeJobFiles, mountJobFiles, previewJobFile, downloadJobFile, resetJobCamera } from "./jobModelFiles.js?v=2.3";
import { bindPersonalInbox, syncPersonalInbox, resetInboxSession } from "./personalInbox.js?v=2.2&rev=5";
import { presenceService } from "./services.js?v=2.2&rev=5";
import { commitPage } from "./pageCommit.js?v=2.2&rev=5";
import { syncFloatingControls } from "./floatingControls.js?v=2.2&rev=5";
import { syncSidebarSelection } from "./sidebarSelection.js?v=2.2&rev=5";
import { contributionsService, hoursService, inventoryService, jobsService, resetLocalData, rgbFromHex } from "./services.js?v=2.2&rev=5";
import { filesService } from "./filesService.js?v=2.2&rev=5";
import { notificationsService } from "./notificationsService.js?v=2.2&rev=5";
import { dateTime, esc } from "./pageShared.js?v=2.4&rev=4";
import { accessDeniedPage, homePage } from "./publicPages.js?v=2.4&rev=5";
import { authService } from "./authService.js?v=2.2&rev=5";
import { ACTION_PERMISSIONS, FORM_PERMISSIONS, PERMISSION_LABELS, PERMISSIONS, ROUTE_PERMISSIONS } from "./authorization.js?v=2.2&rev=5";
import { getStartedPage, normalizeOptionalNote } from "./requestWizard.js?v=2.2&rev=5";
import { applyFilamentSelection } from "./filamentPalette.js?v=2.2&rev=5";
import { normalizeHexInput } from "./filamentColor.js?v=2.2&rev=5";
import { myJobDetailsPage, myJobsPage } from "./studentPages.js?v=2.2&rev=5";
import {
  staffJobsPage,
  activeJobsPage,
  jobDetailsPage,
  staffMaterialDetail,
  staffMaterialForm,
  staffMaterials,
  staffOverview,
} from "./staffPages.js?v=2.2&rev=5";
import { staffHours } from "./hoursPages.js?v=2.2&rev=5";

const app = document.querySelector("#app");
const toastRoot = document.querySelector("#toast-root");

const state = {
  menuOpen: false,
  hoursFilters: { student: "", from: "", to: "" },
  hoursEditingId: "",
  hoursStaffSearch: "",
  wizard: freshWizard(),
};

const THEME_STORAGE_KEY = "three-d-print-farm-theme";
const THEME_IDS = new Set(["light", "dark"]);
function systemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function syncAppearanceControls() {
  const root = document.documentElement;
  const theme = THEME_IDS.has(root.dataset.theme) ? root.dataset.theme : "dark";
  root.dataset.theme = theme;
  root.dataset.accent = "blue";
  document.querySelectorAll(".accent-picker > summary").forEach((summary) => {
    summary.setAttribute("aria-label", "Appearance settings. " + (theme === "light" ? "Light" : "Dark") + " theme");
  });
  document.querySelectorAll(".theme-choice").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.theme === theme)));
  let themeWasChosen = false;
  try {
    themeWasChosen = localStorage.getItem(THEME_STORAGE_KEY) !== null;
  } catch {
    // Keep the appearance controls usable if browser storage is unavailable.
  }
  document.querySelectorAll("#appearance-theme-note").forEach((note) => {
    note.textContent = themeWasChosen ? "Saved on this device." : "Following your device preference.";
  });
  document.querySelectorAll(".appearance-system-reset").forEach((button) => {
    button.hidden = !themeWasChosen;
  });

  const color = getComputedStyle(root).getPropertyValue("--accent-primary").trim();
  const background = theme === "light" ? "#f5f5f7" : "#111112";
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon && /^#[\da-f]{6}$/i.test(color)) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" rx="7" fill="' + background + '"/><path d="M5 7h26v6H5zm0 9h20v6H5zm0 9h14v6H5z" fill="' + color + '"/></svg>';
    favicon.href = "data:image/svg+xml," + encodeURIComponent(svg);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = background;
  app.querySelectorAll("img[data-theme-light][data-theme-dark]").forEach((image) => {
    const source = theme === "dark" ? image.dataset.themeDark : image.dataset.themeLight;
    if (image.getAttribute("src") !== source) image.src = source;
  });
  syncHeaderSurface(app);
  modelPreviewModule?.syncPreviewAppearance?.();
}

function applyAppearance({ theme, persist = true } = {}) {
  const root = document.documentElement;
  if (theme === "system") {
    root.dataset.theme = systemTheme();
    if (persist) {
      try { localStorage.removeItem(THEME_STORAGE_KEY); } catch {
        // Keep the current page responsive when browser storage is unavailable.
      }
    }
  } else if (THEME_IDS.has(theme)) {
    root.dataset.theme = theme;
    if (persist) {
      try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {
        // Keep the current page responsive when browser storage is unavailable.
      }
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
let makerWorldPreviewTimer = null;
let makerWorldPreviewController = null;
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

  const entrance = app.querySelector(".public-main > section:first-child, .get-started, .my-jobs, .staff-content, .access-denied");
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

let sessionIdentity = authService.getCurrentIdentity()?.id || null;
let sessionRevision = 0;
async function loadOwnedDraft() {
  const actor = authService.getCurrentIdentity()?.id;
  if (!actor) return;
  try {
    const saved = await jobsService.getDraft();
    if (actor === authService.getCurrentIdentity()?.id && saved) state.wizard = restoreWizard(saved);
  } catch (error) { reportServiceError(error); }
}
async function sessionChanged() {
  const revision = ++sessionRevision;
  const next = authService.getCurrentIdentity()?.id || null;
  if (next !== sessionIdentity) {
    sessionIdentity = next;
    ++renderRevision;
    clearTimeout(makerWorldPreviewTimer);
    makerWorldPreviewController?.abort();
    modelPreviewModule?.disposeModelPreview();
    disposeJobFiles();
    document.querySelectorAll("dialog").forEach(dialog => { dialog.close(); dialog.remove(); });
    state.wizard = freshWizard();
    state.hoursStaffSearch = "";
    state.hoursEditingId = "";
    app.replaceChildren();
    resetInboxSession();
    await loadOwnedDraft();
  }
  if (revision === sessionRevision) await render();
}

function makerWorldDesignId(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (url.hostname !== "makerworld.com" && !url.hostname.endsWith(".makerworld.com")) return "";
    return url.pathname.match(/\/models\/(\d+)(?:[-/]|$)/i)?.[1] || "";
  } catch {
    return "";
  }
}

function makerWorldFallbackTitle(value) {
  try {
    const slug = new URL(value).pathname.match(/\/models\/\d+[-/]?([^/]*)/i)?.[1] || "MakerWorld model";
    return decodeURIComponent(slug).replace(/[-_]+/g, " ").trim() || "MakerWorld model";
  } catch {
    return "MakerWorld model";
  }
}

function safeMakerWorldImage(value) {
  try {
    const imageUrl = new URL(typeof value === "string" ? value : "");
    if (imageUrl.protocol === "https:" && (imageUrl.hostname === "makerworld.com" || imageUrl.hostname.endsWith(".makerworld.com") || imageUrl.hostname.endsWith(".bblmw.com"))) return imageUrl.href;
  } catch { /* Ignore image URLs outside MakerWorld's image hosts. */ }
  return "";
}

function makerWorldPreviewFrom(data, value) {
  const design = data?.data?.design || data?.data || data?.design || data;
  const creator = design?.designCreator || design?.creator || {};
  const images = Array.isArray(design?.images) ? design.images : Array.isArray(design?.designPictures) ? design.designPictures : [];
  const rawImage = design?.coverUrl || design?.cover || design?.coverImage || design?.image?.url || images[0]?.url || images[0] || "";
  const count = (...values) => values.find((item) => item !== null && item !== undefined && item !== "" && Number.isFinite(Number(item))) ?? null;
  return {
    url: value,
    title: String(design?.title || design?.name || makerWorldFallbackTitle(value)),
    creator: String(creator?.name || design?.creatorName || creator?.handle || design?.author || "MakerWorld creator"),
    avatar: safeMakerWorldImage(creator?.avatar || creator?.avatarUrl || ""),
    image: safeMakerWorldImage(typeof rawImage === "string" ? rawImage : rawImage?.url || ""),
    downloads: count(design?.downloadCount, design?.downloads, design?.stats?.downloadCount),
    likes: count(design?.likeCount, design?.likes, design?.stats?.likeCount),
  };
}

async function fetchMakerWorldDesign(designId, signal) {
  const endpoints = [
    `https://api.bambulab.com/v1/design-service/design/${designId}?handle=en`,
    `https://makerworld.com/api/v1/design-service/design/${designId}?handle=en`,
  ];
  let lastError;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: "GET", mode: "cors", credentials: "omit", signal });
      if (!response.ok) throw new Error(`MakerWorld returned HTTP ${response.status}.`);
      return await response.json();
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError || new Error("MakerWorld model details are unavailable.");
}

async function fetchMakerWorldPageMetadata(value, signal) {
  const endpoint = new URL("https://api.microlink.io/");
  endpoint.searchParams.set("url", value);
  const response = await fetch(endpoint, { method: "GET", mode: "cors", credentials: "omit", signal });
  if (!response.ok) throw new Error(`MakerWorld preview service returned HTTP ${response.status}.`);
  const result = await response.json();
  if (result?.status !== "success" || !result?.data) throw new Error("MakerWorld page metadata is unavailable.");
  return result;
}

async function renderKeepingModelLinkFocus() {
  const input = document.querySelector("#model-link-url");
  const keepFocus = document.activeElement === input;
  const start = keepFocus ? input.selectionStart : null;
  const end = keepFocus ? input.selectionEnd : null;
  await render();
  if (keepFocus) {
    const nextInput = document.querySelector("#model-link-url");
    nextInput?.focus();
    if (start !== null && end !== null) nextInput?.setSelectionRange(start, end);
  }
}

function scheduleMakerWorldPreview(value) {
  clearTimeout(makerWorldPreviewTimer);
  makerWorldPreviewController?.abort();
  makerWorldPreviewController = null;
  const requestedUrl = String(value || "").trim();
  const designId = filesService.inspectUrl(requestedUrl).valid ? makerWorldDesignId(requestedUrl) : "";
  state.wizard.makerWorldPreview = null;
  state.wizard.makerWorldPreviewStatus = designId ? "loading" : (requestedUrl ? "unsupported" : "idle");
  makerWorldPreviewTimer = setTimeout(async () => {
    if (!designId) {
      await renderKeepingModelLinkFocus();
      return;
    }
    await renderKeepingModelLinkFocus();
    if (state.wizard.linkUrl.trim() !== requestedUrl) return;
    const controller = new AbortController();
    makerWorldPreviewController = controller;
    try {
      let data;
      try {
        data = await fetchMakerWorldDesign(designId, controller.signal);
      } catch (error) {
        if (controller.signal.aborted) throw error;
      }
      if (!makerWorldPreviewFrom(data, requestedUrl).image) {
        try {
          data = await fetchMakerWorldPageMetadata(requestedUrl, controller.signal);
        } catch (error) {
          if (controller.signal.aborted) throw error;
        }
      }
      if (controller.signal.aborted || state.wizard.linkUrl.trim() !== requestedUrl) return;
      state.wizard.makerWorldPreview = makerWorldPreviewFrom(data, requestedUrl);
      state.wizard.makerWorldPreviewStatus = state.wizard.makerWorldPreview.image ? "ready" : "details";
    } catch (error) {
      if (controller.signal.aborted || state.wizard.linkUrl.trim() !== requestedUrl) return;
      state.wizard.makerWorldPreview = makerWorldPreviewFrom({}, requestedUrl);
      state.wizard.makerWorldPreviewStatus = "unavailable";
    } finally {
      if (makerWorldPreviewController === controller) makerWorldPreviewController = null;
      if (!controller.signal.aborted && state.wizard.linkUrl.trim() === requestedUrl) await renderKeepingModelLinkFocus();
    }
  }, 650);
}

function parseRoute() { return parseHashRoute(location.hash); }

function messagePage(title, message, action = "retry-page", label = "Retry") {
  return `${publicHeader(state)}<main class="page-shell my-jobs"><div class="empty-state"><h1>${esc(title)}</h1><p role="alert">${esc(message)}</p>${action ? `<button class="button button-outline" data-action="${action}">${label}</button>` : '<a class="button button-outline" href="#/">Back home</a>'}</div></main>${footer()}`;
}
async function render() {
  const revision = ++renderRevision;
  const status = authService.getState().status;
  if (status !== "signed-in") {
    const messages = { loading: ["Loading session…", "Checking your session with the server."], "signed-out": ["Signed out", "No authenticated session is available. Google sign-in will be connected by the future backend."], "expired-session": ["Session expired", "Reload your session before continuing. Unconfirmed changes need to be checked with the server."], error: ["Session unavailable", "The server could not verify your session. Check your connection and retry."] };
    document.querySelector("#service-loading")?.remove();
    app.removeAttribute("aria-busy");
    const [title, message] = messages[status] || messages.error;
    commitPage(app, messagePage(title, message, status === "loading" ? "" : "reload-session", "Check session"));
    syncAppearanceControls();
    return;
  }
  app.setAttribute("aria-busy", "true");
  let loading = document.querySelector("#service-loading");
  if (!loading) { loading = document.createElement("p"); loading.id = "service-loading"; loading.setAttribute("role", "status"); document.body.append(loading); }
  loading.textContent = "Loading…";
  try { await renderPage(revision); }
  catch (error) {
    if (revision === renderRevision) {
      commitPage(app, messagePage(error.code === "permission_denied" ? "Access restricted" : error.code === "conflict" ? "Record changed" : "Page unavailable", errorMessage(error)));
      syncAppearanceControls();
    }
  } finally {
    if (revision === renderRevision) { app.removeAttribute("aria-busy"); loading.remove(); }
  }
}
async function renderPage(revision) {

  clearRouteMotion();
  disposeJobFiles();
  modelPreviewModule?.disposeModelPreview();
  const route = parseRoute();
  if (route.page === "get-started" && state.wizard.linkUrl.trim() && state.wizard.makerWorldPreviewStatus === "idle") {
    scheduleMakerWorldPreview(state.wizard.linkUrl);
  }
  const routeKey = `${route.page}:${route.id || ""}:${route.staffId || ""}:${route.section || ""}`;
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
    document.title = "Access restricted · 3D Print Farm · v2.4";
    commitPage(app, accessDeniedPage(state, requiredPermission));
    syncSidebarState(app);
    syncSidebarSelection(app);
    syncFloatingControls(app);
    syncAppearanceControls();
    await syncPersonalInbox(app);
    prepareRouteMotion(routeChanged);
    window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }
  const staffPages = ["jobs", "staff", "active", "materials", "material-new", "filament", "hours", "job"];

  if (staffPages.includes(route.page)) {
    document.title = "Staff Portal · School 3D Print Farm — v2.4";
  } else if (route.page === "get-started") {
    document.title = "Get Started · School 3D Print Farm — v2.4";
  } else if (["my-jobs", "my-job"].includes(route.page)) {
    document.title = "My Print Jobs · School 3D Print Farm — v2.4";
  } else {
    document.title = "School 3D Print Farm Website — v2.4";
  }

  let pageHtml;
  if (route.page === "not-found") {
    pageHtml = messagePage("Page not found", "This address is invalid or no longer exists.", "");
  } else if (route.page === "home") {
    pageHtml = homePage(route.section, state, await inventoryService.listInventory());
  } else if (route.page === "get-started") {
    pageHtml = await getStartedPage(state);
  } else if (route.page === "my-jobs") {
    pageHtml = await myJobsPage(state);
  } else if (route.page === "my-job") {
    pageHtml = await myJobDetailsPage(state, route.id);
  } else if (route.page === "staff") {
    pageHtml = await staffOverview();
  } else if (route.page === "jobs") {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    pageHtml = await staffJobsPage({ search: params.get("search") || "", status: params.get("status") || "ALL", material: params.get("material") || "ALL", sort: params.get("sort") || "newest", page: Math.max(1, Number(params.get("page")) || 1) });
  } else if (route.page === "active") {
    pageHtml = await activeJobsPage();
  } else if (route.page === "materials") {
    pageHtml = await staffMaterials();
  } else if (route.page === "material-new") {
    pageHtml = staffMaterialForm();
  } else if (route.page === "filament") {
    pageHtml = await staffMaterialDetail(route.id);
  } else if (route.page === "hours") {
    pageHtml = await staffHours({ staffId: route.staffId || "", search: state.hoursStaffSearch });
  } else if (route.page === "job") {
    pageHtml = await jobDetailsPage(route.id);
  }
  if (revision !== renderRevision) return;
  commitPage(app, pageHtml);
  const diagnostics = diagnosticsService.getStatus();
  if (diagnostics.issues.length) {
    const banner = document.createElement("aside");
    banner.className = "storage-recovery";
    banner.setAttribute("role", "alert");
    banner.innerHTML = `<strong>Saved data needs attention</strong><p>${esc(diagnostics.issues.join(" "))}</p><p>Recoverable records remain visible. Export the saved data and resolve the listed issue before recovery.</p><button class="button button-outline" data-action="export-demo-data">Export saved data</button>`;
    app.prepend(banner);
  }
  syncSidebarState(app);
  syncSidebarSelection(app);
  syncFloatingControls(app);
  syncAppearanceControls();
  await syncPersonalInbox(app);
  prepareRouteMotion(routeChanged);

  if (route.page === "job") {
    const job = await jobsService.getJob(route.id);
    if (revision !== renderRevision) return;
    if (job) await mountJobFiles(app, job, async () => {
      modelPreviewModule ||= await import("./modelPreview.js?v=2.2&rev=5");
      return modelPreviewModule;
    });
  }

  if (route.page === "get-started" && state.wizard.modelFile && !state.wizard.submittedJob) {
    const selectedFile = state.wizard.modelFile;
    const stage = document.querySelector("#model-preview");
    try {
      modelPreviewModule ||= await import("./modelPreview.js?v=2.2&rev=5");
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
    const requestedHoursId = route.page === "hours" ? new URLSearchParams(location.hash.split("?")[1] || "").get("request") : null;
    const hoursRequest = requestedHoursId ? document.getElementById(`hours-request-${requestedHoursId}`) : null;
    if (hoursRequest) { hoursRequest.focus(); hoursRequest.scrollIntoView({ block: "center", behavior: "auto" }); }
    else if (routeChanged) window.scrollTo({ top: 0, behavior: "auto" });
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

function reportServiceError(error) {
  toast(errorMessage(error), "error");
  if (error?.code === "conflict" && !app.querySelector(".conflict-notice")) {
    const notice = document.createElement("aside");
    notice.className = "storage-recovery conflict-notice";
    notice.setAttribute("role", "alert");
    notice.innerHTML = '<strong>Record changed</strong><p>Review the latest record before saving again. Refreshing replaces the current form with server values.</p><button class="button button-outline" data-action="retry-page">Refresh record</button>';
    app.prepend(notice);
  }
  const field = error?.field || Object.keys(error?.fields || {})[0];
  if (field) app.querySelector(`[name="${CSS.escape(field)}"], [data-field="${CSS.escape(field)}"]`)?.focus();
}

async function setFile(file) {
  if (!file) return;
  state.wizard.linkUrl = "";
  state.wizard.makerWorldPreview = null;
  state.wizard.makerWorldPreviewStatus = "idle";
  clearTimeout(makerWorldPreviewTimer);
  makerWorldPreviewController?.abort();

  const selection = filesService.inspectSelection(file);
  if (!selection.valid) {
    state.wizard.file = null;
    state.wizard.modelFile = null;
    state.wizard.previewStatus = "error";
    state.wizard.fileFeedback = selection.error;
    await render();
    return;
  }

  state.wizard.file = selection.metadata;
  state.wizard.modelFile = file;
  state.wizard.previewStatus = "loading";
  state.wizard.fileFeedback = "Checking model geometry…";
  await render();
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
        ${authService.mode === "demo" ? "COMPLETE DEMO JOB" : "COMPLETE JOB"}\
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
    ${esc(job.projectName)}\
  </p>\
  <label class="field">\
    <span>\
      Pickup location \
      <b>\
        *\
      </b>\
    </span>\
    <input name="pickupLocation" type="text" required maxlength="120" value="${esc(job.pickupLocation || "")}" placeholder="Enter the approved collection location" />\
  </label>\
  <label class="field"><span>Pickup instructions <small>(optional)</small></span><textarea name="pickupInstructions" maxlength="500" rows="3" placeholder="Collection hours or who to ask for">${esc(job.pickupInstructions || "")}</textarea></label>\
  <div class="recipient-field">\
    <span>\
      Recipient email\
    </span>\
    <strong>\
      ${esc(job.recipientEmail)}\
    </strong>\
    <small>\
      ${authService.mode === "demo" ? "Fictional demo recipient" : "Request recipient"}\
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
      ${authService.mode === "demo" ? "EMAIL PREVIEW · DEMO" : "PICKUP NOTIFICATION"}\
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
      toast("Access denied: this account cannot manage print jobs.", "error");
      return;
    }
    submitButton.disabled = true;

    try {
      const result = await jobsService.completeJob(form.dataset.jobId, {
        pickupLocation: form.elements.pickupLocation.value,
        pickupInstructions: form.elements.pickupInstructions.value,
        notifyRecipient: form.elements.notifyRecipient.checked,
      });

      dialog.close();
      dialog.remove();
      toast(
        result.notification
          ? (authService.mode === "demo" ? "Job completed. Pickup notification simulated locally." : "Job completed. The server recorded the notification request.")
          : "Job completed without creating a notification.",
      );
      await render();
    } catch (error) {
      submitButton.disabled = false;
      reportServiceError(error);
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

const pendingActions = new Set();
async function doAction(action, target) {
  const id = target.dataset.id;
  const requiredPermission = ACTION_PERMISSIONS[action];
  if (requiredPermission && !authService.can(requiredPermission)) {
    toast("Access denied: this account cannot " + (PERMISSION_LABELS[requiredPermission] || "perform that action") + ".", "error");
    return;
  }

  const lockKey = `${action}:${id || ""}`;
  if (pendingActions.has(lockKey)) return;
  pendingActions.add(lockKey);
  const wasDisabled = target.disabled;
  target.disabled = true;
  try {
    if (action === "retry-page") { await refreshService.reload?.(); await render(); return; }
    if (action === "reload-session") { await authService.load(); await render(); return; }
    if (action === "export-demo-data") {
      const url = URL.createObjectURL(new Blob([diagnosticsService.exportData()], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "print-farm-demo-recovery.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
    }
    if (action === "toggle-sidebar") {
      toggleSidebar(app);
      return;
    } else if (["preview-job-file", "download-job-file", "reset-job-camera"].includes(action)) {
      if (!authService.can(PERMISSIONS.JOBS_MANAGE) || !await jobsService.getJob(id)) throw new Error("This job is no longer available to this account.");
      if (action === "preview-job-file") await previewJobFile(Number(target.dataset.index), id);
      else if (action === "download-job-file") downloadJobFile(Number(target.dataset.index), id);
      else resetJobCamera(id);
      return;
    } else if (action === "reset-local-data") {
      target.disabled = true;
      await resetLocalData();
      location.hash = "#/";
      window.location.reload();
      return;
    } else if (action === "switch-role") {
      target.closest(".role-switcher")?.removeAttribute("open");
      if (!authService.switchRole(target.dataset.identityId)) throw new Error("That demonstration identity is unavailable.");
      return;
    } else if (action === "set-theme") {
      if (THEME_IDS.has(target.dataset.theme)) applyAppearance({ theme: target.dataset.theme });
      return;
    } else if (action === "use-system-theme") {
      applyAppearance({ theme: "system" });
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
    } else if (action === "toggle-presence") {
      await presenceService.set(target.dataset.present !== "true");
      await syncPersonalInbox(app);
    } else if (["approve-job", "reject-job", "authorize-print", "revise-print"].includes(action)) {
      const job = await jobsService.getJob(id);
      if (!job) throw new Error("Job not available.");
      let reason = "";
      if (["reject-job", "revise-print"].includes(action)) {
        reason = window.prompt(action === "reject-job" ? "Reason for rejecting this request (required):" : "What must change before printing? (required):", "");
        if (reason === null) return;
        if (!reason.trim()) throw new Error("Enter a reason so the requester and responsible staff know what to change.");
      }
      const labels = { "approve-job": "Approve request", "reject-job": "Reject request", "authorize-print": "Authorize printing", "revise-print": "Return for changes" };
      if (!window.confirm(`${labels[action]} for “${job.projectName}”?${reason ? `\n\n${reason}` : ""}`)) return;
      if (["approve-job", "reject-job"].includes(action)) await jobsService.reviewRequest(id, action === "approve-job" ? "approved" : "rejected", reason);
      else await jobsService.reviewAuthorization(id, action === "authorize-print" ? "authorized" : "revision", reason, target.dataset.expectedAt || null, target.dataset.authorizationId || null);
      toast("Supervisor decision saved.");
      await render();
    } else if (action === "request-authorization") {
      if (!window.confirm("Confirm the model, material, and print preparation are ready for supervisor review?")) return;
      await jobsService.requestAuthorization(id);
      toast("Print authorization requested. A Level 4 supervisor will review the job.");
      await render();
    } else if (action === "claim-job") {
      await jobsService.claimJob(id);
      toast("Job claimed and assigned to " + authService.getCurrentIdentity().name + ".");
      await render();
    } else if (action === "collect-job") {
      await jobsService.collectJob(id);
      toast("Collection recorded. This request is now complete.");
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
      toast(authService.mode === "demo" ? "Demo notification retry queued locally." : "Notification retry recorded by the server.");
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
      const hasModelLink = Boolean(state.wizard.linkUrl.trim());
      if (state.wizard.step === 1 && hasModelLink) {
        const result = filesService.inspectUrl(state.wizard.linkUrl);
        if (!result.valid) throw new Error(result.error);
      }
      if (state.wizard.step === 1 && !hasModelLink && (!state.wizard.file || !state.wizard.modelFile)) {
        toast("Choose an STL, 3MF, or OBJ file, or paste a model link.", "error");
        document.querySelector("#model-file")?.focus();
        return;
      }
      if (state.wizard.step === 1 && !hasModelLink && state.wizard.previewStatus !== "ready") {
        toast(state.wizard.previewStatus === "loading" ? "Wait for the model preview to finish loading." : "Fix the model preview error before continuing.", "error");
        return;
      }

      if (state.wizard.step === 2) {
        const selection = await inventoryService.getItem(state.wizard.inventoryId);
        if (!selection || !selection.available || !selection.hexColor) {
          toast("That filament is no longer available. Choose a current option or ask staff to verify its color.", "error");
          state.wizard.inventoryId = "";
          state.wizard.material = "";
          state.wizard.color = "";
          state.wizard.selectionError = "Your selected filament is no longer available. Choose a current colour.";
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
      state.wizard.linkUrl = "";
      state.wizard.makerWorldPreview = null;
      state.wizard.makerWorldPreviewStatus = "idle";
      clearTimeout(makerWorldPreviewTimer);
      makerWorldPreviewController?.abort();
      await render();
    } else if (action === "save-draft") {
      const fields = draftFields(state.wizard);
      if (await jobsService.saveDraft(fields)) {
        toast(authService.mode === "demo" ? "Draft saved on this device. Local files must be chosen again." : "Draft saved by the server. Local files must be chosen again.");
      } else {
        toast("Draft could not be saved in this browser.", "error");
      }
    } else if (action === "discard-draft") {
      await jobsService.discardDraft();
      toast("Saved draft discarded.");
    } else if (action === "submit-request") {
      if (state.wizard.submitting) return;
      state.wizard.submitting = true;
      target.textContent = "Submitting…";
      target.setAttribute("aria-busy", "true");

      const wizard = state.wizard;
      const actor = authService.getCurrentIdentity()?.id;
      try {
        const { modelFile, previewStatus, fileFeedback, linkUrl, makerWorldPreview, makerWorldPreviewStatus, ...request } = state.wizard;
        request.notes = normalizeOptionalNote(request.notes);
        const job = await jobsService.createJob({ ...request, modelUrl: linkUrl.trim(), file: state.wizard.file, modelFiles: state.wizard.modelFile ? [state.wizard.modelFile] : [] });
        if (wizard !== state.wizard || actor !== authService.getCurrentIdentity()?.id) return;
        state.wizard.submittedJob = job;
        state.wizard.submitting = false;
        try { await jobsService.discardDraft(); } catch (error) { toast(`Request saved. ${errorMessage(error)}`, "error"); }
        toast(authService.mode === "demo" ? "Demo request added locally." : "Print request submitted.");
        await render();
      } catch (error) {
        if (wizard !== state.wizard) return;
        state.wizard.submitting = false;
        target.textContent = "Submit request";
        target.removeAttribute("aria-busy");
        reportServiceError(error);
      }
    } else if (action === "new-request") {
      await jobsService.discardDraft();
      state.wizard = freshWizard();
      await render();
    } else if (action === "menu-toggle") {
      state.menuOpen = !state.menuOpen;
      target.setAttribute("aria-expanded", String(state.menuOpen));
      target.setAttribute("aria-label", `${state.menuOpen ? "Close" : "Open"} navigation`);

    }
  } catch (error) {
    if (action === "reset-local-data") target.disabled = false;
    reportServiceError(error);
  } finally { pendingActions.delete(lockKey); if (target.isConnected) target.disabled = wasDisabled; }
}

app.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !state.menuOpen) return;
  const toggle = app.querySelector('[data-action="menu-toggle"]');
  if (!toggle) return;
  state.menuOpen = false;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open navigation");
  toggle.focus();
  event.preventDefault();
});

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (target?.dataset.action === "skip-main") {
    const main = app.querySelector("main");
    if (main) { main.tabIndex = -1; main.focus(); }
    return;
  }
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
    toast("Access denied: this account cannot " + (PERMISSION_LABELS[requiredPermission] || "submit that form") + ".", "error");
    return;
  }

  if (action === "staff-jobs-filter") {
    location.hash = `#/staff/jobs?${new URLSearchParams({ ...values, page: "1" }).toString()}`;
    await render(); return;
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
    } else if (action === "job-pickup-update") {
      await jobsService.updatePickup(form.dataset.id, values);
      await render();
      toast("Pickup details saved.");
    } else if (action === "job-reassign") {
      const job = await jobsService.reassignJob(form.dataset.id, values.assigneeId);
      await render();
      toast("Job reassigned to " + job.assignedStaff + ".");
    } else if (action === "inventory-update") {
      await inventoryService.update(form.dataset.id, values);
      await render();
      toast("Filament colour updated.");
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
    reportServiceError(error);
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
  if (target.form) target.form.dataset.dirty = "true";

  if (target.matches("[data-hours-preview-input]")) updateHoursPreview(target.form);

  if (target.matches("[data-hex-input]")) {
    const cursor = target.selectionStart;
    const before = target.value;
    target.value = normalizeHexInput(before);
    if (cursor !== null) {
      const nextCursor = Math.max(1, cursor + target.value.length - before.length);
      target.setSelectionRange(nextCursor, nextCursor);
    }
    const preview = target.form?.querySelector("[data-rgb-preview]");
    const rgb = rgbFromHex(target.value);
    const rgbText = preview?.querySelector("[data-color-rgb]");
    const swatch = preview?.querySelector("[data-color-swatch]");
    const hexMatch = /^#?([\da-f]{6})$/i.exec(target.value.trim());
    if (rgbText) rgbText.textContent = rgb || "Enter a valid HEX value such as #2F80ED.";
    if (swatch) swatch.style.setProperty("--filament-color", hexMatch ? `#${hexMatch[1].toUpperCase()}` : "transparent");
    target.setCustomValidity(target.value && !rgb ? "Use a six-digit HEX value in the format #RRGGBB." : "");
  }

  if (target.matches("#model-link-url")) {
    state.wizard.linkUrl = target.value;
    scheduleMakerWorldPreview(target.value);
    if (target.value.trim()) {
      modelPreviewModule?.disposeModelPreview();
      state.wizard.file = null;
      state.wizard.modelFile = null;
      state.wizard.previewStatus = "empty";
      state.wizard.fileFeedback = "";
    }
  }

  if (target.matches("[data-field]")) {
    const key = target.dataset.field;
    state.wizard[key] = target.value;

    const counter = document.querySelector(`[data-counter="${key}"]`);
    if (counter) counter.textContent = target.value.length;

  }

});

app.addEventListener("change", async (event) => {
  const target = event.target;
  if (target.form) target.form.dataset.dirty = "true";

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
      const selectedId = target.value;
      try {
        const selection = await inventoryService.getItem(selectedId);
        if (state.wizard.inventoryId !== selectedId) return;
        applyFilamentSelection(app, state.wizard, selection);
        // Native radios retain focus and scroll position; the 3D preview stays mounted.
      } catch (error) {
        if (state.wizard.inventoryId !== selectedId) return;
        state.wizard.inventoryId = "";
        state.wizard.material = "";
        state.wizard.color = "";
        toast(error.message, "error");
        await render();
      }
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

const systemColorScheme = window.matchMedia?.("(prefers-color-scheme: light)");
if (systemColorScheme?.addEventListener) {
  systemColorScheme.addEventListener("change", () => {
    try {
      if (localStorage.getItem(THEME_STORAGE_KEY) === null) {
        applyAppearance({ theme: systemTheme(), persist: false });
      }
    } catch {
      applyAppearance({ theme: systemTheme(), persist: false });
    }
  });
}

window.addEventListener("hashchange", () => {
  state.menuOpen = false;
  render();
});

window.addEventListener("storage", async (event) => {
  if (event.key === SIDEBAR_STORAGE_KEY) { syncSidebarState(app); return; }
  if (event.key === THEME_STORAGE_KEY) {
    applyAppearance({
      theme: THEME_IDS.has(event.newValue) ? event.newValue : systemTheme(),
      persist: false,
    });
    return;
  }
 });
const unsubscribeSession = authService.subscribe(() => void sessionChanged().catch(error => toast(errorMessage(error), "error")));
const unsubscribeRefresh = refreshService.subscribe(async () => {
  try {
    await refreshService.refresh();
    // Keep unfinished forms and the model preview intact during background refreshes.
    if (parseRoute().page === "get-started" || document.activeElement?.closest("form") || app.querySelector('form[data-dirty="true"]') || document.querySelector("dialog[open]")) await syncPersonalInbox(app);
    else await render();
  } catch (error) { reportServiceError(error); }
});
window.addEventListener("pagehide", event => { if (!event.persisted) { unsubscribeSession(); unsubscribeRefresh(); } modelPreviewModule?.disposeModelPreview(); disposeJobFiles(); });
window.addEventListener("pageshow", event => { if (event.persisted) void authService.load().then(render); });
window.addEventListener("printfarm:inbox-updated", () => void syncPersonalInbox(app).catch(error => toast(errorMessage(error), "error")));
bindPersonalInbox(app, (message) => toast(message, "error"));

syncAppearanceControls();
await render();
await authService.load();
await loadOwnedDraft();
await render();
