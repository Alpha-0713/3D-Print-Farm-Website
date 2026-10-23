import { MATERIALS } from "./data.js?v=7";
import { contributionsService, inventoryService, jobsService } from "./services.js?v=7";
import { filesService } from "./filesService.js?v=7";
import { notificationsService } from "./notificationsService.js?v=7";
import { dateTime, esc, moneylessId } from "./pageShared.js?v=7";
import { homePage } from "./publicPages.js?v=7";
import { getStartedPage } from "./requestWizard.js?v=7";
import { myJobsPage } from "./studentPages.js?v=7";
import {
  activeJobsPage,
  jobDetailsPage,
  staffHours,
  staffMaterials,
  staffOverview,
  staffQueue,
} from "./staffPages.js?v=7";

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

const savedDraft = jobsService.getDraft();
if (savedDraft) {
  Object.assign(state.wizard, savedDraft, {
    step: 1,
    file: null,
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

function setFile(file) {
  if (!file) return;

  const feedback = document.querySelector("#file-feedback");
  const selection = filesService.inspectSelection(file);

  if (!selection.valid && selection.error.includes("Unsupported")) {
    state.wizard.file = null;
    if (feedback) feedback.textContent = selection.error;
    render();
    requestAnimationFrame(() => {
      const currentFeedback = document.querySelector("#file-feedback");
      if (currentFeedback) currentFeedback.textContent = selection.error;
    });
    return;
  }

  if (!selection.valid) {
    state.wizard.file = null;
    render();
    requestAnimationFrame(() => {
      const currentFeedback = document.querySelector("#file-feedback");
      if (currentFeedback) currentFeedback.textContent = selection.error;
    });
    return;
  }

  state.wizard.file = selection.metadata;
  render();
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
      if (state.wizard.step === 1 && !state.wizard.file) {
        toast("Choose an STL or 3MF file to continue.", "error");
        document.querySelector("#model-file")?.focus();
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
      await render();
    } else if (action === "save-draft") {
      const { file, submittedJob, step, ...fields } = state.wizard;
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
        const job = await jobsService.createJob({
          ...state.wizard,
          file: state.wizard.file,
        });
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
    setFile(target.files?.[0]);
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
  setFile(event.dataTransfer.files?.[0]);
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
