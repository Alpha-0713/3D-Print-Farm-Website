import { LAYER_HEIGHTS, MATERIALS } from "./data.js?v=7";
import { inventoryService } from "./services.js?v=7";
import { esc, footer, moneylessId, publicHeader, statusBadge, dateTime } from "./pageShared.js?v=7";
import { partArtwork } from "./visualComponents.js?v=7";

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
  return file ? `<div class="selected-file">\
  <div class="file-thumb">\
    <span>\
      STL\
    </span>\
    <svg viewBox="0 0 70 60" aria-hidden="true">\
      <path d="M16 13h20l14 10v24H16z" fill="#777f78"/>\
      <path d="M36 13v12h14" fill="#a9b0a8"/>\
      <path d="M22 32h21M22 38h17" stroke="#1c211d" stroke-width="2"/>\
    </svg>\
  </div>\
  <div class="file-info">\
    <strong>\
      ${esc(file.name)}\
    </strong>\
    <span>\
      ${formatBytes(file.sizeBytes)}\
    </span>\
  </div>\
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
    or \
    <label for="model-file" class="text-link">\
      click to browse\
    </label>\
  </span>\
  <small>\
    STL or 3MF · Max 25 MB · File stays on this device\
  </small>\
</div>`;
}

function formatBytes(bytes) { return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

function wizardPanel(state, availableFilaments) {
  const w = state.wizard;
  const selectedFilament = availableFilaments.find((item) => item.id === w.inventoryId);
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
      DEMO JOB ID\
    </span>\
    <strong>\
      ${moneylessId(w.submittedJob.id)}\
    </strong>\
    <span>\
      Submitted ${dateTime(w.submittedJob.submittedAt)}\
    </span>\
  </div>\
  <div class="hero-actions">\
    <a class="button button-lime" href="#/my-jobs">\
      View My Jobs \
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
<input id="model-file" class="sr-only" type="file" accept=".stl,.3mf,model/stl,application/vnd.ms-package.3dmanufacturing-3dmodel+xml" aria-label="Choose a 3D model file" />\
<div class="file-drop ${w.file ? "has-file" : ""}" data-drop-zone="true">\
  ${fileSummary(state)}\
</div>\
<p class="form-feedback" id="file-feedback" role="status">\
</p>\
<div class="form-note">\
  <span>\
    ⓘ\
  </span>\
  <p>\
    The selected file is only represented by its name and size in this browser demo. Its contents are not stored or uploaded.\
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
      Share preferences for staff to review.\
    </p>\
  </div>\
</div>\
<div class="form-grid two-col">\
  <label class="field full-field">\
    <span>Available filament <b>*</b></span>\
    <select name="inventoryId" data-field="inventoryId" ${availableFilaments.length ? "required" : "disabled"}>\
      ${availableFilaments.length ? availableFilaments.map((item) => `<option value="${esc(item.id)}" ${item.id === w.inventoryId ? "selected" : ""}>${esc(item.material)} · ${esc(item.color)} — ${Number(item.quantity)} ${esc(item.unit)} in stock</option>`).join("") : "<option value=\"\">No material and color combinations are currently available</option>"}\
    </select>\
    <small>Choose a combination staff have marked available in the current inventory.</small>\
  </label>\
  ${selectedFilament ? `<div class="material-choice-detail full-field"><span class="filament-swatch" style="--filament-color:${/^(#[\\da-f]{3,8}|[a-z]{1,24})$/i.test(selectedFilament.color) ? selectedFilament.color : "#899080"}" aria-hidden="true"></span><div><strong>${esc(selectedFilament.material)} · ${esc(selectedFilament.color)}</strong><p>${esc(MATERIALS.find((item) => item.id === selectedFilament.material)?.description || "Supported print filament.")}</p><small>Good for: ${esc(MATERIALS.find((item) => item.id === selectedFilament.material)?.uses || "Staff review required")} · ${esc(MATERIALS.find((item) => item.id === selectedFilament.material)?.considerations || "Ask staff about printer compatibility.")} · ${Number(selectedFilament.quantity)} ${esc(selectedFilament.unit)} in inventory</small></div></div>` : `<div class="empty-inventory-note full-field"><strong>No filament is currently listed as available.</strong><p>Staff must enter a color and a positive stock amount in the Materials section before you can request it.</p></div>`}\
  ${fieldSelect("layerHeight", "Layer height", LAYER_HEIGHTS, w.layerHeight, "A requested preference, not a printer instruction.")}\
  <label class="field">\
    <span>\
      Infill preference \
      <output id="infill-output">\
        ${w.infill}%\
      </output>\
    </span>\
    <input type="range" min="10" max="100" step="5" value="${w.infill}" data-field="infill" aria-label="Infill preference, from 10 to 100 percent" />\
    <div class="range-ends">\
      <small>\
        10%\
      </small>\
      <small>\
        100%\
      </small>\
    </div>\
    <small>\
      A requested preference for staff review.\
    </small>\
  </label>\
</div>\
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
    <textarea data-field="notes" maxlength="500" rows="4" placeholder="Requirements, orientation, or anything staff should know…">\
      ${esc(w.notes)}\
    </textarea>\
    <small>\
      <span data-counter="notes">\
        ${w.notes.length}\
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
         REQUEST SUMMARY\
      </span>\
      <div class="preview-art">\
        ${partArtwork("bracket")}\
      </div>\
      <h2>\
        ${esc(w.projectName || "Your project")}\
      </h2>\
      <p>\
        ${w.file ? `${esc(w.file.name)} · ${formatBytes(w.file.sizeBytes)}` : "A preview placeholder · no file selected"}\
      </p>\
      <div class="summary-rows">\
        <div>\
          <span>\
            Material\
          </span>\
          <strong>\
            ${esc(w.material || "No option available")}\
          </strong>\
        </div>\
        <div>\
          <span>\
            Color\
          </span>\
          <strong>\
            ${esc(w.color || "—")}\
          </strong>\
        </div>\
        <div>\
          <span>\
            Layer height\
          </span>\
          <strong>\
            ${esc(w.layerHeight)}\
          </strong>\
        </div>\
        <div>\
          <span>\
            Infill\
          </span>\
          <strong>\
            ${Number(w.infill)}%\
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
          Supported demo files: STL and 3MF.\
        </li>\
        <li>\
          Material and color depend on school inventory.\
        </li>\
        <li>\
          Your file contents stay on this device.\
        </li>\
      </ul>\
    </div>\
  </aside>\
</div>`;
}

function reviewCard(w) {
  const rows = [["File", w.file ? `${w.file.name} (${formatBytes(w.file.sizeBytes)})` : "Choose a file"], ["Material", w.material || "No available option"], ["Color preference", w.color || "—"], ["Layer height", w.layerHeight], ["Infill preference", `${w.infill}%`], ["Project name", w.projectName || "—"], ["Purpose", w.purpose || "—"], ["Notes", w.notes || "None"]];
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
  const availableFilaments = await inventoryService.listAvailable();
  const selected = availableFilaments.find((item) => item.id === state.wizard.inventoryId)
    || availableFilaments.find((item) => item.material === state.wizard.material && item.color === state.wizard.color)
    || availableFilaments[0];
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
  ${wizardPanel(state, availableFilaments)}\
</main>\
${footer()}`;
}
