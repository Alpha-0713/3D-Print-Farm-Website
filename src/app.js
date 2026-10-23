import { MATERIALS } from "./data.js?v=8";
import { contributionsService, inventoryService, jobsService } from "./services.js?v=8";
import { filesService, getModelFileExtension, MAX_MODEL_FILE_SIZE } from "./filesService.js?v=8";
import { notificationsService } from "./notificationsService.js?v=8";
import { dateTime, esc, moneylessId } from "./pageShared.js?v=8";
import { homePage } from "./publicPages.js?v=8";
import { getStartedPage } from "./requestWizard.js?v=8";
import { myJobsPage } from "./studentPages.js?v=8";
import {
  activeJobsPage,
  jobDetailsPage,
  staffHours,
  staffMaterials,
  staffOverview,
  staffQueue,
} from "./staffPages.js?v=8";

const app = document.querySelector("#app");
const toastRoot = document.querySelector("#toast-root");

const state = {
  menuOpen: false,
  queue: { search: "", status: "ALL", material: "ALL", sort: "newest" },
  hoursFilters: { student: "", from: "", to: "" },
  hoursEditingId: "",
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
    layerHeight: "0.20 mm",
    infill: 20,
    submittedJob: null,
  },
};

let modelPreviewModule;
let renderRevision = 0;
let linkController = null;

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
  const query = rawValue.split("?")[1] || "";
  const value = rawValue.split("?")[0];
  const queryMaterial = new URLSearchParams(query).get("material");

  if (
    value === "/staff/queue"
    && MATERIALS.some(({ id }) => id === queryMaterial)
  ) {
    state.queue.material = queryMaterial;
  }

  const section = value.match(/^\/section\/([^/?#]+)/);
  if (section) {
    const sectionId = decodeURIComponent(section[1]);
    return { page: "home", section: sectionId === "faq" ? "faq" : "" };
  }

  const detail = value.match(/^\/staff\/jobs\/([^/?#]+)/);
  if (detail) {
    return { page: "job", id: decodeURIComponent(detail[1]) };
  }

  if (value === "/get-started") return { page: "get-started" };
  if (value === "/my-jobs") return { page: "my-jobs" };
  if (value === "/staff" || value === "/staff/") return { page: "staff" };
  if (value === "/staff/queue") return { page: "queue" };
  if (value === "/staff/active") return { page: "active" };
  if (value === "/staff/materials") return { page: "materials" };
  if (value === "/staff/hours") return { page: "hours" };

  return { page: "home" };
}

async function render() {
  const revision = ++renderRevision;
  modelPreviewModule?.disposeModelPreview();
  const route = parseRoute();
  const staffPages = ["staff", "queue", "active", "materials", "hours", "job"];

  if (staffPages.includes(route.page)) {
    document.title = "Staff Portal · 3D Print Farm";
  } else if (route.page === "get-started") {
    document.title = "Get Started · 3D Print Farm";
  } else if (route.page === "my-jobs") {
    document.title = "My Jobs · 3D Print Farm";
  } else {
    document.title = "3D Print Farm";
  }

  if (route.page === "home") {
    app.innerHTML = homePage(route.section, state, await inventoryService.listInventory());
  } else if (route.page === "get-started") {
    app.innerHTML = await getStartedPage(state);
  } else if (route.page === "my-jobs") {
    app.innerHTML = await myJobsPage(state);
  } else if (route.page === "staff") {
    app.innerHTML = await staffOverview();
  } else if (route.page === "queue") {
    app.innerHTML = await staffQueue(state.queue);
  } else if (route.page === "active") {
    app.innerHTML = await activeJobsPage();
  } else if (route.page === "materials") {
    app.innerHTML = await staffMaterials();
  } else if (route.page === "hours") {
    app.innerHTML = await staffHours(state.hoursFilters, state.hoursEditingId);
  } else if (route.page === "job") {
    app.innerHTML = await jobDetailsPage(route.id);
  }

  if (route.page === "get-started" && state.wizard.modelFile && !state.wizard.submittedJob) {
    const selectedFile = state.wizard.modelFile;
    const stage = document.querySelector("#model-preview");
    try {
      modelPreviewModule ||= await import("./modelPreview.js?v=8");
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
    ${moneylessId(job.id)} · ${esc(job.projectName)}\
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

  try {
    if (action === "claim-job") {
      await jobsService.claimJob(id);
      toast("Job claimed and assigned to the demo staff profile.");
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
        if (!selection || !selection.available || Number(selection.quantity) <= 0) {
          toast("That filament is no longer available. Choose a current option or ask staff about restocking.", "error");
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
        layerHeight: "0.20 mm",
        infill: 20,
        submittedJob: null,
      };
      await render();
    } else if (action === "menu-toggle") {
      state.menuOpen = !state.menuOpen;
      await render();
    } else if (action === "copy-job") {
      await navigator.clipboard?.writeText(id);
      toast("Job ID copied.");
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

  if (form.dataset.saving === "true") return;
  form.dataset.saving = "true";
  const submitButton = form.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  try {
    if (action === "inventory-add") {
      await inventoryService.add({ ...values, available: values.available === "true" });
      await render();
      toast("Filament inventory entry added.");
    } else if (action === "inventory-update") {
      await inventoryService.update(form.dataset.id, { ...values, available: values.available === "true" });
      await render();
      toast("Inventory entry updated.");
    } else if (action === "inventory-adjust") {
      await inventoryService.adjust(form.dataset.id, values);
      await render();
      toast(values.action === "receive" ? "Received stock recorded." : "Material consumption recorded.");
    } else if (action === "hours-add") {
      await contributionsService.add(values);
      await render();
      toast("Student contribution saved.");
    } else if (action === "hours-update") {
      await contributionsService.update(form.dataset.id, values);
      state.hoursEditingId = "";
      await render();
      toast("Contribution record updated.");
    }
  } catch (error) {
    form.dataset.saving = "false";
    if (submitButton) submitButton.disabled = false;
    toast(error.message || "The change could not be saved.", "error");
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;

  if (target.matches("#model-link-url")) state.wizard.linkUrl = target.value;

  if (target.matches("[data-field]")) {
    const key = target.dataset.field;
    state.wizard[key] = key === "infill" ? Number(target.value) : target.value;

    const counter = document.querySelector(`[data-counter="${key}"]`);
    if (counter) counter.textContent = target.value.length;

    const output = document.querySelector("#infill-output");
    if (key === "infill" && output) output.textContent = `${target.value}%`;
  }

  if (target.matches('[data-filter="search"]')) {
    state.queue.search = target.value;
    const position = target.selectionStart;

    render().then(() => {
      const search = document.querySelector('[data-filter="search"]');
      search?.focus();
      search?.setSelectionRange(position, position);
    });
  }
});

app.addEventListener("change", async (event) => {
  const target = event.target;

  if (target.matches("#model-file")) {
    void setFile(target.files?.[0]);
  }

  if (target.matches("[data-inventory-unit]")) {
    const threshold = target.closest("form")?.querySelector('[name="lowStockThreshold"]');
    if (threshold) threshold.value = ({ g: "100", kg: "0.1", spools: "1" })[target.value] || "0";
  }

  if (target.matches("[data-field]")) {
    const key = target.dataset.field;
    state.wizard[key] = key === "infill" ? Number(target.value) : target.value;

    if (key === "inventoryId") {
      const selection = await inventoryService.getItem(target.value);
      if (selection) {
        state.wizard.material = selection.material;
        state.wizard.color = selection.color;
      }
      render();
      return;
    }

    if (key === "material" || key === "color" || key === "layerHeight") {
      const panel = document.querySelector(".wizard-layout");
      if (panel) render();
    }
  }

  if (target.matches("[data-filter]")) {
    state.queue[target.dataset.filter] = target.value;
    render();
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
  if (event.key !== "three-d-print-farm-demo-v3") return;
  await jobsService.refreshFromStorage();
  await render();
});

window.addEventListener("printfarm:updated", render);

render();
