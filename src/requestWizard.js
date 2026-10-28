import { canSelectFilament, filamentPalette, filamentSelectionDetails } from "./filamentPalette.js?v=2.2&rev=5";
import { inventoryService } from "./services.js?v=2.2&rev=5";
import { esc, footer, publicHeader, statusBadge, dateTime } from "./pageShared.js?v=2.2&rev=5";

export function normalizeOptionalNote(value) {
  const note = typeof value === "string" ? value : "";
  return note.trim() ? note : "";
}

function stepIndicator(active) {
  const steps = [[1, "Upload model"], [2, "Print settings"], [3, "Project details"], [4, "Review & submit"]];
  return `<div class="wizard-steps" aria-label="Request progress">\
  ${steps.map(([num, label]) => { const clickable = num < active; const tag = clickable ? "button" : "div"; return `<${tag} class="wizard-step ${num === active ? "active" : ""} ${clickable ? "done" : ""}" ${clickable ? `type="button" data-action="wizard-goto" data-step="${num}"` : ""}>\
<span>\
  ${clickable ? "✓" : num}\
</span>\
<b>\
  ${label}\
</b>\
</${tag}>`; }).join("")}\
</div>`;
}

function fieldSelect(name, label, options, selected, hint = "") {
  return `<label class="field">\
  <span>\
    ${label}\
  </span>\
  <select name="${name}" data-field="${name}">\
    ${options.map((option) => {
    const value = typeof option === "string" ? option : option.value;
    const text = typeof option === "string" ? option : option.label;
    return `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>\
  ${esc(text)}\
</option>`;
  }).join("")}\
  </select>\
  ${hint ? `<small>\
  ${hint}\
</small>` : ""}\
</label>`;
}

function fileSummary(state) {
  const file = state.wizard.file;
  if (!file && state.wizard.linkUrl.trim()) return `<div class="selected-file">\
  <div class="file-thumb"><strong aria-hidden="true">↗</strong></div>\
  <div class="file-info"><strong>Model link provided</strong><span>No preview; the link will be included with your request.</span></div>\
</div>`;
  const format = file?.extension?.toUpperCase() || file?.name?.split(".").pop()?.toUpperCase() || "MODEL";
  return file ? `<div class="selected-file">\
  <div class="file-thumb">\
    <span>\
      ${esc(format)}\
    </span>\
    <strong aria-hidden="true">3D</strong>\
  </div>\
  <div class="file-info">\
    <strong>\
      ${esc(file.name)}\
    </strong>\
    <span>\
      ${formatBytes(file.sizeBytes)} · on this device\
    </span>\
  </div>\
  <label for="model-file" class="text-link selected-file-replace">Replace</label>\
  <button type="button" class="icon-button" aria-label="Remove selected file" data-action="remove-file">\
    ×\
  </button>\
</div>` : `<div class="file-empty">\
  <div class="upload-glyph">\
    ↥\
  </div>\
  <strong>\
    Drop your 3D model here\
  </strong>\
  <span>\
    or \n    <label for="model-file" class="text-link">\
      click to browse\
    </label>\
  </span>\
  <small>\
    STL, 3MF, or OBJ · Max 25 MB · Previewed in your browser\
  </small>\
</div>`;
}
function formatBytes(bytes) { return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

function wizardPanel(state, filaments) {
  const w = state.wizard;
  const notes = typeof w.notes === "string" ? w.notes : "";
  const selectedFilament = filaments.find((item) => item.id === w.inventoryId && canSelectFilament(item));
  if (w.submittedJob) return `<section class="confirmation-panel">\
  <div class="confirmation-icon">\
    ✓\
  </div>\
  <span class="eyebrow">\
    LOCAL DEMO DATA\
  </span>\
  <h1>\
    Request ready for review.\
  </h1>\
  <p>\
    Your demo request has been added locally for the school team to review. No file was uploaded and no real request was sent.\
  </p>\
  <div class="confirmation-id">\
    <span>\
      PRINT REQUEST\
    </span>\
    <strong>\
      ${esc(w.submittedJob.projectName)}\
    </strong>\
    <span>\
      Submitted ${dateTime(w.submittedJob.submittedAt)}\
    </span>\
  </div>\
  <div class="hero-actions">\
    <a class="button button-lime" href="#/my-jobs/${encodeURIComponent(w.submittedJob.id)}">\
      Track this request \
      <span>\
        ↗\
      </span>\
    </a>\
    <button class="button button-outline" data-action="new-request">\
      Start another request\
    </button>\
  </div>\
</section>`;
  const content = w.step === 1 ? `<div class="form-section-head">\
  <span>\
    01\
  </span>\
  <div>\
    <h2>\
      Upload your model\
    </h2>\
    <p>\
      Choose the file you want staff to review.\
    </p>\
  </div>\
</div>\
<input id="model-file" class="sr-only" type="file" accept=".stl,.3mf,.obj,model/stl,model/obj,model/3mf,application/vnd.ms-package.3dmanufacturing-3dmodel+xml" aria-label="Choose a 3D model file" />\
<div class="file-drop ${w.file ? "has-file" : ""}" data-drop-zone="true">\
  ${fileSummary(state)}\
</div>\
<p class="form-feedback" id="file-feedback" role="status" aria-live="polite">\
  ${esc(w.fileFeedback || "")}\
</p>\
<div class="model-link-divider"><span>OR PASTE A MODEL LINK</span></div>\
<label class="field model-link-field">\
    <span>Model URL</span>\
    <input id="model-link-url" name="modelUrl" type="url" inputmode="url" autocomplete="url" placeholder="https://example.com/model.stl" value="${esc(w.linkUrl || "")}" aria-describedby="model-link-help" />\
    <small id="model-link-help">The link will be included with your request. It won’t be opened or previewed here.</small>\
</label>\
<div class="form-note">\
  <span>\
    ⓘ\
  </span>\
  <p>\
    Files are previewed locally in this browser. The demo stores the file name and size; it does not upload file contents. Model links are passed along with your request.\
  </p>\
</div>`
    : w.step === 2 ? `<div class="form-section-head">\
  <span>\
    02\
  </span>\
  <div>\
    <h2>\
      Print settings\
    </h2>\
    <p>\
      Choose your material and colour. Staff will confirm the final print settings.\
    </p>\
  </div>\
</div>\
${filamentPalette(filaments, w.inventoryId)}\
<div class="palette-selection" data-filament-detail role="status" aria-live="polite" aria-atomic="true">${filamentSelectionDetails(selectedFilament)}</div>\
<div class="inventory-banner">\
  <span>\
    ⓘ\
  </span>\
  <p>\
    <strong>\
    Availability is refreshed when you open this form and checked again before your request is saved.\
    </strong>\
     Final settings are confirmed by staff.\
  </p>\
</div>`
    : w.step === 3 ? `<div class="form-section-head">\
  <span>\
    03\
  </span>\
  <div>\
    <h2>\
      Project details\
    </h2>\
    <p>\
      Give staff a little context for your idea.\
    </p>\
  </div>\
</div>\
<div class="form-grid two-col">\
  <label class="field full-field">\
    <span>\
      Project name \
      <b>\
        *\
      </b>\
    </span>\
    <input type="text" data-field="projectName" maxlength="100" value="${esc(w.projectName)}" placeholder="e.g. Camera mount bracket" required />\
    <small>\
      <span data-counter="projectName">\
        ${w.projectName.length}\
      </span>\
      /100\
    </small>\
  </label>\
  ${fieldSelect("purpose", "Purpose or intended use", ["Personal project", "Class project", "Functional prototype", "Engineering design", "Other"], w.purpose)}\
  <label class="field full-field">\
    <span>\
      Additional notes \
      <em>\
        (optional)\
      </em>\
    </span>\
    <textarea data-field="notes" maxlength="500" rows="4" placeholder="Requirements, orientation, or anything staff should know…">${esc(notes)}</textarea>\
    <small>\
      <span data-counter="notes">\
        ${notes.length}\
      </span>\
      /500\
    </small>\
  </label>\
</div>`
    : `<div class="form-section-head">\
  <span>\
    04\
  </span>\
  <div>\
    <h2>\
      Review your request\
    </h2>\
    <p>\
      Check the details before adding this demo request.\
    </p>\
  </div>\
</div>\
${reviewCard(w)}\
<div class="review-notice">\
  <strong>\
    Staff review required\
  </strong>\
  <p>\
    Your request will require staff review. Final feasibility, cost, and turnaround time are not confirmed by this demo.\
  </p>\
</div>`;
  const footerActions = `<div class="wizard-actions">\
  ${w.step > 1 ? `<button type="button" class="button button-outline" data-action="wizard-back">\
  ← Back\
</button>` : `<button type="button" class="button button-outline" data-action="save-draft">\
  ▣ Save as Draft\
</button>`}${w.step < 4 ? `<button type="button" class="button button-lime" data-action="wizard-next">\
  Continue \
  <span>\
    →\
  </span>\
</button>` : `<div class="review-actions">\
  <button type="button" class="button button-outline button-small" data-action="save-draft">\
    Save as Draft\
  </button>\
  <button type="button" class="button button-lime" data-action="submit-request">\
    Submit Print Request \
    <span>\
      →\
    </span>\
  </button>\
</div>`}\
</div>`;
  return `<div class="wizard-layout">\
  <section class="wizard-main">\
    <div class="wizard-heading">\
      <span class="eyebrow">\
        <i>\
        </i>\
         / GET STARTED\
      </span>\
      <h1>\
        Get started.\
      </h1>\
      <p>\
        Share your model and preferences. School staff will take it from there.\
      </p>\
    </div>\
    ${stepIndicator(w.step)}\
    <section class="form-card">\
      ${content}\
    </section>\
    ${footerActions}\
    <button type="button" class="discard-draft" data-action="discard-draft">\
      Discard saved draft\
    </button>\
  </section>\
  <aside class="wizard-aside">\
    <div class="aside-card preview-card">\
      <span class="eyebrow">\
        <i>\
        </i>\
         3D MODEL PREVIEW\
      </span>\
      <div class="preview-art model-preview" id="model-preview" role="group" aria-label="Interactive 3D model preview">\
        <p class="model-preview-message" role="status" aria-live="polite">${w.file ? "Loading model geometry…" : "Choose a file or link to preview its geometry."}</p>\
      </div>\
      <h2>\
        ${esc(w.projectName || "Your project")}\
      </h2>\
      <p>\
        ${w.file ? `${esc(w.file.name)} · ${formatBytes(w.file.sizeBytes)}` : "No model selected"}\
      </p>\
      <div class="summary-rows">\
        <div>\
          <span>\
            Material\
          </span>\
          <strong>\
            <span data-summary-material>${esc(w.material || "Choose a filament")}</span>\
          </strong>\
        </div>\
        <div>\
          <span>\
            Color\
          </span>\
          <strong>\
            <span data-summary-color>${esc(w.color || "—")}</span>\
          </strong>\
        </div>\
      </div>\
      <div class="estimate-note">\
        <span>\
          ◎\
        </span>\
        <p>\
          Staff will confirm feasibility, cost, and timing after review.\
        </p>\
      </div>\
    </div>\
    <div class="aside-card good-to-know">\
      <span class="eyebrow">\
        GOOD TO KNOW\
      </span>\
      <ul>\
        <li>\
          Supported model files: STL, 3MF, and OBJ.\
        </li>\
        <li>\
          Material and color depend on school inventory.\
        </li>\
        <li>\
          Direct HTTPS links must allow browser access (CORS).\
        </li>\
      </ul>\
    </div>\
  </aside>\
</div>`;
}

function reviewCard(w) {
  const model = w.file ? `${w.file.name} (${formatBytes(w.file.sizeBytes)})` : w.linkUrl.trim() || "Choose a file or paste a model link";
  const rows = [["Model", model], ["Material", w.material || "No available option"], ["Color preference", w.color || "—"], ["Project name", w.projectName || "—"], ["Purpose", w.purpose || "—"], ["Notes", normalizeOptionalNote(w.notes) || "None"]];
  return `<div class="review-card">\
  ${rows.map(([label, value], i) => `<div class="review-row ${i > 4 ? "review-detail" : ""}">\
  <span>\
    ${label}\
  </span>\
  <strong>\
    ${esc(value)}\
  </strong>\
</div>`).join("")}\
  <button type="button" data-action="wizard-goto" data-step="${w.file ? 2 : 1}" class="edit-review">\
    Edit request details\
  </button>\
</div>`;
}

export async function getStartedPage(state) {
  const filaments = await inventoryService.listInventory();
  const availableFilaments = filaments.filter(canSelectFilament);
  const selected = availableFilaments.find((item) => item.id === state.wizard.inventoryId)
    || availableFilaments.find((item) => item.material === state.wizard.material && item.color === state.wizard.color);
  if (selected) {
    state.wizard.inventoryId = selected.id;
    state.wizard.material = selected.material;
    state.wizard.color = selected.color;
  } else {
    state.wizard.inventoryId = "";
    state.wizard.material = "";
    state.wizard.color = "";
  }
  return `${publicHeader(state)}\
<main class="get-started page-shell">\
  ${wizardPanel(state, filaments)}\
</main>\
${footer()}`;
}
