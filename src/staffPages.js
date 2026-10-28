import { sidebarCollapsed } from "./sidebarState.js?v=2.3";
import { jobModelFiles } from "./jobModelFiles.js?v=2.3";
import { claimable, isAssignedTo } from "./jobWorkflow.js?v=2.2&rev=5";
import { MATERIALS } from "./data.js?v=2.2&rev=5";
import { contributionsService, inventoryService, jobsService } from "./services.js?v=2.2&rev=5";
import { notificationsService } from "./notificationsService.js?v=2.2&rev=5";
import { toolbarControls, dateTime, esc, logo, localDataControls, shortDate, statusBadge } from "./pageShared.js?v=2.2&rev=5";
import { authService } from "./authService.js?v=2.2&rev=5";
import { jobProgress, pickupDetails } from "./jobProgress.js?v=2.2&rev=5";
import { PERMISSIONS, ROLES } from "./authorization.js?v=2.2&rev=5";

export function staffShell(content, active = "overview") {
  const icons = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    active: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/><path d="M18 12h.01"/>',
    materials: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
    hours: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5h5"/>',
  };
  const links = [["overview", "Overview", "#/staff"], ["active", "My active jobs", "#/staff/active"], ["materials", "Materials", "#/staff/materials"], ["hours", "Hours", "#/staff/hours"]]
    .filter(([id]) => id !== "materials" || authService.can(PERMISSIONS.FILAMENT_VIEW));
  const activeNavigation = active === "material-new" ? "materials" : active;
  const identity = authService.getCurrentIdentity();
  return `<div class="staff-app" data-identity-id="${esc(identity.id)}" data-role-id="${esc(identity.roleId)}" data-sidebar-collapsed="${sidebarCollapsed()}">\
  <aside class="staff-sidebar" id="staff-sidebar">\
    <div class="sidebar-brand">\
      <div class="sidebar-brand-main">${logo()}</div>\
      <button type="button" class="sidebar-toggle" data-action="toggle-sidebar" aria-controls="staff-sidebar" aria-expanded="${!sidebarCollapsed()}" aria-label="${sidebarCollapsed() ? "Expand" : "Collapse"} sidebar" title="${sidebarCollapsed() ? "Expand" : "Collapse"} sidebar"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="16" height="14" rx="3"/><path d="M7 3v14m6-10-3 3 3 3"/></svg></button>\
    </div>\
    <nav aria-label="Staff navigation">\
      <span class="sidebar-selection" aria-hidden="true"></span>\
  ${links.map(([id, label, href]) => `<a class="sidebar-link ${activeNavigation === id ? "selected" : ""}" href="${href}" ${activeNavigation === id ? 'aria-current="page"' : ""} aria-label="${label}" title="${label}">\
  <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[id]}</svg></span>\
  <span class="sidebar-label">${label}</span>\
</a>`).join("")}\
    </nav>\
    <div class="sidebar-bottom">\
      <a class="back-public" href="#/" aria-label="Back to public website" title="Back to public website">\
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 10H2m7-7-7 7 7 7"/></svg><span>Back to public website</span>\
      </a>\
    </div>\
  </aside>\
  <div class="staff-main">\
    <div class="staff-toolbar"><div class="supervisor-presence" data-supervisor-presence aria-label="Print Farm supervisor presence"></div>${toolbarControls()}</div>\
    <div class="staff-content">\
      ${content}\
    </div>\
    ${localDataControls()}\
  </div>\
</div>`;
}

function jobTable(jobs) {
  if (!jobs.length) return `<div class="empty-state overview-empty">
  <span>⌁</span>
  <h2>No jobs yet</h2>
  <p>Submitted print requests will appear here.</p>
</div>`;
  return `<div class="table-wrap">
  <table class="overview-job-table">
    <thead>
      <tr>
        <th>Job / Project</th>
        <th>Submitted by</th>
        <th>Submitted</th>
        <th>Status</th>
        <th>Assigned staff</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${jobs.map((job) => `<tr>
  <td>
    <a class="table-project" href="#/staff/jobs/${encodeURIComponent(job.id)}">
      <strong class="table-project-name">${esc(job.projectName)}</strong>

    </a>
  </td>
  <td>${esc(job.submitterName)}<small>${esc(job.submitterEmail)}</small></td>
  <td>${shortDate(job.submittedAt)}<small>${Number.isFinite(Date.parse(job.submittedAt)) ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(job.submittedAt)) : "Time not recorded"}</small></td>
  <td>${statusBadge(job.status)}</td>
  <td>${job.assignedStaff ? `<span class="assigned">${esc(job.assignedStaff)}</span>` : `<span class="unassigned">Unassigned</span>`}</td>
  <td><a class="table-action ${["SUBMITTED", "APPROVED", "AWAITING_AUTHORIZATION"].includes(job.status) ? "action-highlight" : ""}" href="#/staff/jobs/${encodeURIComponent(job.id)}">${job.status === "APPROVED" ? "Claim" : ["SUBMITTED", "AWAITING_AUTHORIZATION"].includes(job.status) ? "Review" : "View"} <span>↗</span></a></td>
</tr>`).join("")}
    </tbody>
  </table>
</div>`;
}

export async function staffOverview() {
  const [summary, jobs] = await Promise.all([jobsService.summary(), jobsService.listJobs({ sort: "newest" })]);
  const cards = [["AVAILABLE JOBS", summary.unclaimed, "Approved for claiming", "lime"], ["IN PROGRESS", summary.inProgress, "Claimed by staff", "blue"], ["PRINTING", summary.printing, "Active print stage", "amber"], ["COMPLETED TODAY", summary.completedToday, "Marked complete today", "green"]];
  return staffShell(`<div class="staff-page-heading">\
  <div>\
    <span class="eyebrow">\
      STAFF PORTAL / OVERVIEW\
    </span>\
    <h1>\
      Overview\
    </h1>\
    <p>\
      Keep the school print queue moving.\
    </p>\
  </div>\
  <a class="button button-lime button-small" href="#/staff/active">\
    My active jobs \
    <span>→</span>\
  </a>\
</div>\
${authService.can(PERMISSIONS.JOBS_APPROVE) ? `<section class="staff-section supervisor-review-queue"><div class="staff-section-head"><div><h2>Supervisor decisions</h2><p>Initial requests and prepared jobs awaiting your approval.</p></div><span class="demo-pill">LEVEL 4</span></div>${jobTable(jobs.filter((job) => ["SUBMITTED", "AWAITING_AUTHORIZATION"].includes(job.status)))}</section>` : ""}\
${jobs.some(claimable) ? `<section class="staff-section available-jobs"><div class="staff-section-head"><div><h2>Available jobs</h2><p>Supervisor-approved requests ready for staff to claim.</p></div></div>${jobTable(jobs.filter(claimable))}</section>` : ""}\
<section class="metric-grid">\
  ${cards.map(([label, count, caption, color]) => `<article class="metric-card">\
  <div>\
    <span>\
      ${label}\
    </span>\
    <b class="metric-mark ${color}">\
      ↗\
    </b>\
  </div>\
  <strong>\
    ${count}\
  </strong>\
  <small>\
    ${caption}\
  </small>\
</article>`).join("")}\
</section>\
<section class="staff-section">\
  <div class="staff-section-head">\
    <div>\
      <h2>Recent jobs</h2>\
      <p>Latest activity across all demo requests</p>\
    </div>\
  </div>\
  ${jobTable(jobs.slice(0, 6))}\
</section>\
<div class="staff-note">\
  <span>\
    ⓘ\
  </span>\
  <p>\
    All records and actions in this workspace are local demo data. No printer is controlled and no message is sent.\
  </p>\
</div>`, "overview");
}

export async function activeJobsPage() {
  const jobs = await jobsService.listMyActiveJobs();
  const identity = authService.getCurrentIdentity();
  return staffShell(`<div class="staff-page-heading">\
  <div>\
    <span class="eyebrow">\
      STAFF PORTAL / ASSIGNED WORK\
    </span>\
    <h1>\
      My active jobs\
    </h1>\
    <p>\
      Requests currently assigned to the simulated staff profile.\
    </p>\
  </div>\
  <span class="demo-pill">\
    ${esc(identity.name)} · DEMO\
  </span>\
</div>\
${jobs.length ? `<div class="active-jobs-grid">\
  ${jobs.map((job) => `<article class="active-job-card">\
  <div class="active-card-top">\
    ${statusBadge(job.status)}\
  </div>\
  <h2>\
    ${esc(job.projectName)}\
  </h2>\
  <p>\
    ${esc(job.fileName)} · ${esc(job.fileSize)}\
  </p>\
  <div class="active-details">\
    <span>\
      ${esc(job.material)} · ${esc(job.color)}\
    </span>\
    <span>\
      ${esc(job.submitterName)}\
    </span>\
  </div>\
  <a class="button button-outline button-small" href="#/staff/jobs/${encodeURIComponent(job.id)}">\
    Open job details \
    <span>\
      ↗\
    </span>\
  </a>\
</article>`).join("")}\
</div>` : `<div class="empty-state">\
  <span>\
    ◷\
  </span>\
  <h2>\
    No active jobs assigned\
  </h2>\
  <p>\
    Open an unassigned request from Overview to claim it.\
  </p>\
  <a class="button button-lime" href="#/staff">\
    Open Overview\
  </a>\
</div>`}`, "active");
}

export async function staffMaterials() {
  const inventory = await inventoryService.listInventory();
  const canChangeFilament = authService.can(PERMISSIONS.FILAMENT_CHANGE);
  const entries = inventory.length ? `<div class="materials-grid" role="list">${inventory.map((item) => {
    const code = `<div class="material-values"><div class="material-value"><span>HEX</span><code>${esc(item.hexColor || "Needs verification")}</code></div><div class="material-value"><span>RGB</span><code>${esc(item.rgbColor || "Needs verification")}</code></div></div>`;
    const status = canChangeFilament
      ? `<div class="filament-controls">
    <button type="button" class="filament-control-toggle low-stock-control ${item.lowStock ? "is-on" : "is-off"}" data-action="inventory-low-stock-toggle" data-id="${esc(item.id)}" aria-pressed="${item.lowStock}" aria-label="Low Stock for ${esc(item.material)} ${esc(item.color)}: ${item.lowStock ? "on" : "off"}" title="Toggle Low Stock"><span>Low Stock</span><strong>${item.lowStock ? "On" : "Off"}</strong></button>
    <button type="button" class="filament-control-toggle availability-control ${item.available ? "is-on" : "is-off"}" data-action="inventory-toggle" data-id="${esc(item.id)}" aria-pressed="${item.available}" aria-label="Available for ${esc(item.material)} ${esc(item.color)}: ${item.available ? "on" : "off"}" title="Toggle availability"><span>Available</span><strong>${item.available ? "On" : "Off"}</strong></button>
    <button type="button" class="filament-delete-control" data-action="inventory-delete" data-id="${esc(item.id)}" data-label="${esc(item.material)} · ${esc(item.color)}" aria-label="Delete ${esc(item.material)} ${esc(item.color)}" title="Delete this filament">Delete</button>
  </div>`
      : `<div class="filament-readonly-status"><span class="filament-status-label ${item.lowStock ? "is-low-stock" : ""}">Low Stock · ${item.lowStock ? "On" : "Off"}</span><span class="filament-status-label ${item.available ? "is-available" : "is-unavailable"}">${item.available ? "Available" : "Unavailable"}</span></div>`;
    return `<article class="filament-inventory-card" role="listitem">
  <span class="filament-inventory-swatch ${item.hexColor ? "" : "is-missing"}" style="--filament-color:${item.hexColor || "transparent"}" aria-label="${item.hexColor ? `Filament color ${esc(item.color)}` : "Color code needs verification"}" role="img"></span>
  <div class="filament-inventory-main"><div class="filament-inventory-title"><h3>${esc(item.material)}</h3><span>${esc(item.color)}</span><a class="filament-edit-link" href="#/staff/materials/${encodeURIComponent(item.id)}" aria-label="${canChangeFilament ? "Edit" : "View"} ${esc(item.material)} ${esc(item.color)}">${canChangeFilament ? "Edit colour" : "Details"} →</a></div>${code}</div>
  ${status}
</article>`;
  }).join("")}</div>` : `<div class="empty-state inventory-empty"><span>◇</span><h2>No filament entries yet</h2><p>Add a filament type and verified HEX color to make it available for print requests.</p></div>`;

  return staffShell(`<div class="materials-page-top"><div><span class="eyebrow">STAFF PORTAL / MATERIALS</span><h1>Materials</h1><p>Current filament colors and request availability.</p></div>${canChangeFilament ? '<a class="button button-lime" href="#/staff/materials/new">Add Filament <span>＋</span></a>' : ""}</div>
<section class="materials-inventory"><div class="materials-inventory-head"><div><h2>Filament availability</h2><p>${inventory.length} ${inventory.length === 1 ? "entry" : "entries"}</p></div></div>${entries}</section>`, "materials");
}

export function staffMaterialForm() {
  return staffShell(`<div class="detail-back"><a href="#/staff/materials">← Current inventory</a></div>
<div class="staff-page-heading"><div><span class="eyebrow">MATERIALS / NEW ENTRY</span><h1>Add New Filament</h1><p>Add a filament type and verified color to the request list.</p></div></div>
<section class="filament-panel filament-form-panel"><form class="inventory-add-form" data-form="inventory-add">
  <label class="field"><span>Material type <b>*</b></span><select name="material" required><option value="">Choose material</option>${MATERIALS.map((material) => `<option value="${esc(material.id)}">${esc(material.name)} · ${esc(material.descriptor)}</option>`).join("")}</select></label>
  <label class="field"><span>Color name <b>*</b></span><input name="color" type="text" maxlength="60" placeholder="e.g. Matte black" autocomplete="off" required /></label>
  <label class="field"><span>HEX color <b>*</b></span><input name="hexColor" data-hex-input type="text" inputmode="text" autocomplete="off" value="#" placeholder="#2F80ED" pattern="#[0-9A-Fa-f]{6}" title="Enter six hexadecimal digits after #" minlength="7" spellcheck="false" required /><small>Type six hexadecimal characters after #, or paste a colour code. RGB is calculated automatically.</small></label>
  <div class="field"><span>Color preview</span><output class="color-input-preview" data-rgb-preview><span class="color-input-swatch" data-color-swatch aria-hidden="true"></span><span data-color-rgb>Enter a six-digit HEX value.</span></output></div>
  <p class="inventory-default-status">New entries start with Low Stock off and Available on.</p>
  <div class="inventory-form-actions"><a class="button button-outline" href="#/staff/materials">Cancel</a><button class="button button-lime" type="submit">Add filament <span>＋</span></button></div>
</form></section>`, "material-new");
}

export async function staffMaterialDetail(id) {
  const item = await inventoryService.getItem(id);
  if (!item) return staffShell(`<div class="detail-back"><a href="#/staff/materials">← Current inventory</a></div><div class="empty-state"><span>◇</span><h2>Filament not found</h2><p>This inventory entry may have been removed or the link is invalid.</p><a class="button button-outline" href="#/staff/materials">Back to current inventory</a></div>`, "materials");
  return staffShell(`<div class="detail-back"><a href="#/staff/materials">← Filament availability</a></div>
<div class="staff-page-heading"><div><span class="eyebrow">MATERIALS / FILAMENT DETAILS</span><h1>${esc(item.material)} · ${esc(item.color)}</h1><p>${item.available ? "Available for new print requests" : "Unavailable for new print requests"}${item.lowStock ? " · Low stock" : ""}</p></div></div>
<section class="filament-panel material-detail-panel"><div class="material-detail-color"><span class="filament-inventory-swatch ${item.hexColor ? "" : "is-missing"}" style="--filament-color:${item.hexColor || "transparent"}" aria-hidden="true"></span><div class="material-values"><div class="material-value"><span>HEX</span><code>${esc(item.hexColor || "Needs verification")}</code></div><div class="material-value"><span>RGB</span><code>${esc(item.rgbColor || "Needs verification")}</code></div></div></div><div class="filament-readonly-status"><span class="filament-status-label ${item.lowStock ? "is-low-stock" : ""}">Low Stock · ${item.lowStock ? "On" : "Off"}</span><span class="filament-status-label ${item.available ? "is-available" : "is-unavailable"}">${item.available ? "Available" : "Unavailable"}</span></div></section>${authService.can(PERMISSIONS.FILAMENT_CHANGE) ? `<section class="filament-panel"><h2>Edit filament colour</h2><form class="inventory-add-form" data-form="inventory-update" data-id="${esc(item.id)}">
  <label class="field"><span>Colour name</span><input name="color" maxlength="60" value="${esc(item.color)}" required /></label>
  <label class="field"><span>HEX colour</span><input name="hexColor" data-hex-input value="${esc(item.hexColor || "#")}" pattern="#[0-9A-Fa-f]{6}" minlength="7" autocomplete="off" spellcheck="false" required /><small>Type six hexadecimal characters after #.</small></label>
  <div class="field"><span>Colour preview</span><output class="color-input-preview" data-rgb-preview><span class="color-input-swatch" data-color-swatch style="--filament-color:${item.hexColor || "transparent"}" aria-hidden="true"></span><span data-color-rgb>${esc(item.rgbColor || "Enter a six-digit HEX value.")}</span></output></div>
  <div class="inventory-form-actions"><button class="button button-lime" type="submit">Save colour</button></div></form></section>` : ""}`, "materials");
}

const localDateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const totalHours = (items) => items.reduce((sum, item) => sum + Number(item.hours), 0);

export async function staffContributions(filters = {}, editingId = "") {
  const [records, allRecords] = await Promise.all([contributionsService.list(filters), contributionsService.listAll()]);
  const studentTotals = new Map();
  records.forEach((item) => studentTotals.set(item.student, (studentTotals.get(item.student) || 0) + Number(item.hours)));
  const selected = allRecords.find((item) => item.id === editingId);
  const studentSuggestions = [...new Set([...allRecords.map((item) => item.student), "Student Demo"])].sort((a, b) => a.localeCompare(b));
  const recordCards = records.length ? `<div class="hours-record-list">${records.map((item) => selected?.id === item.id
    ? `<article class="hours-record is-editing"><form data-form="hours-update" data-id="${esc(item.id)}"><div class="hours-record-heading"><h3>Edit contribution</h3><button type="button" class="text-button" data-action="hours-cancel-edit">Cancel</button></div><div class="hours-record-form-grid"><label class="field"><span>Student</span><input name="student" type="text" maxlength="100" value="${esc(item.student)}" list="student-suggestions" required /></label><label class="field"><span>Date</span><input name="date" type="date" max="${localDateValue()}" value="${esc(item.date)}" required /></label><label class="field"><span>Hours</span><input name="hours" type="number" min="0.01" max="24" step="0.01" value="${Number(item.hours)}" required /></label><label class="field hours-activity"><span>Activity</span><input name="activity" type="text" maxlength="300" value="${esc(item.activity)}" required /></label></div><button class="button button-lime button-small" type="submit">Save changes</button></form></article>`
    : `<article class="hours-record"><div class="hours-record-date">${shortDate(`${item.date}T12:00:00`)}</div><div class="hours-record-main"><div><h3>${esc(item.student)}</h3><span>${esc(item.activity)}</span></div><strong>${Number(item.hours)} ${Number(item.hours) === 1 ? "hour" : "hours"}</strong></div><button type="button" class="button button-outline button-small" data-action="hours-edit" data-id="${esc(item.id)}">Edit</button></article>`).join("")}</div>` : `<div class="empty-state hours-empty"><span>◴</span><h2>${allRecords.length ? "No contributions match these filters" : "No contribution records yet"}</h2><p>${allRecords.length ? "Try a wider date range or a different student name." : "Record a student's first contribution to get started."}</p></div>`;

  return staffShell(`<div class="staff-page-heading"><div><span class="eyebrow">STAFF PORTAL / STUDENT CONTRIBUTIONS</span><h1>Student contributions</h1><p>Record and review student contributions to print farm activities.</p></div><span class="demo-pill">LOCAL DEMO STORAGE</span></div>
<section class="hours-summary-grid"><article><span>HOURS IN SELECTED PERIOD</span><strong>${totalHours(records).toFixed(2).replace(/\.00$/, "")}</strong></article><article><span>RECORDS SHOWN</span><strong>${records.length}</strong></article><article><span>STUDENTS SHOWN</span><strong>${studentTotals.size}</strong></article></section>
<section class="staff-section hours-filter-section"><div class="staff-section-head"><div><h2>Find contributions</h2><p>Totals and records below follow this student/date filter.</p></div></div><form class="hours-filter-form" data-form="hours-filter"><label class="field"><span>Student name</span><input name="student" type="search" value="${esc(filters.student || "")}" placeholder="Search students" /></label><label class="field"><span>From date</span><input name="from" type="date" value="${esc(filters.from || "")}" max="${localDateValue()}" /></label><label class="field"><span>To date</span><input name="to" type="date" value="${esc(filters.to || "")}" max="${localDateValue()}" /></label><div class="hours-filter-actions"><button class="button button-lime button-small" type="submit">Apply filters</button><button class="button button-outline button-small" type="button" data-action="hours-clear-filters">Clear</button></div></form></section>
<section class="hours-totals-section"><h2>Student totals for selected period</h2>${studentTotals.size ? `<div class="student-total-grid">${[...studentTotals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([student, hours]) => `<article><span>${esc(student)}</span><strong>${hours.toFixed(2).replace(/\.00$/, "")} h</strong></article>`).join("")}</div>` : `<p class="hours-muted">No student totals to show for this period.</p>`}</section>
<section class="staff-section hours-add-section"><div class="staff-section-head"><div><h2>Record a contribution</h2><p>Enter completed activity, date, and duration. Decimals such as 1.5 hours are supported.</p></div></div><form class="hours-add-form" data-form="hours-add"><label class="field"><span>Student name <b>*</b></span><input name="student" type="text" maxlength="100" list="student-suggestions" placeholder="Student name" required /><datalist id="student-suggestions">${studentSuggestions.map((name) => `<option value="${esc(name)}"></option>`).join("")}</datalist></label><label class="field"><span>Date <b>*</b></span><input name="date" type="date" max="${localDateValue()}" value="${localDateValue()}" required /></label><label class="field"><span>Duration in hours <b>*</b></span><input name="hours" type="number" min="0.01" max="24" step="0.01" placeholder="e.g. 1.5" required /></label><label class="field hours-add-activity"><span>Activity description <b>*</b></span><input name="activity" type="text" maxlength="300" placeholder="e.g. Prepared and sorted print jobs" required /></label><button class="button button-lime" type="submit">Save contribution <span>＋</span></button></form></section>
<section class="staff-section hours-records-section"><div class="staff-section-head"><div><h2>Contribution records</h2><p>${records.length} record${records.length === 1 ? "" : "s"} shown · totals are calculated from saved records</p></div></div>${recordCards}</section>
<div class="staff-note"><span>ⓘ</span><p>Student names use the demo's existing mock profiles and entered display names because no student directory or authentication backend exists. Records are stored locally in this browser.</p></div>`, "contributions");
}

export async function jobDetailsPage(jobId) {
  const [job, notifications] = await Promise.all([jobsService.getJob(jobId), notificationsService.listForJob(jobId)]);
  if (!job) return staffShell(`<div class="empty-state">\
  <span>\
    ?\
  </span>\
  <h2>\
    Job not found\
  </h2>\
  <p>\
    This demo job may have been removed or the link is invalid.\
  </p>\
  <a class="button button-outline" href="#/staff">\
    Back to Overview\
  </a>\
</div>`);
  const button = (action, label, style = "button-lime") => `<button class="button ${style}" data-action="${action}" data-id="${esc(job.id)}" data-expected-at="${esc(job.printAuthorization?.requestedAt || "")}" data-authorization-id="${esc(job.printAuthorization?.id || "")}">${label}</button>`;
  const supervisor = authService.can(PERMISSIONS.JOBS_APPROVE);
  const responsible = isAssignedTo(job, authService.getCurrentIdentity());
  const action = job.status === "SUBMITTED" && supervisor
    ? button("approve-job", "Approve request") + button("reject-job", "Reject request", "button-outline destructive-action")
    : claimable(job) ? button("claim-job", "Claim job")
    : job.status === "IN_PROGRESS" && responsible ? button("request-authorization", "Request print authorization")
    : job.status === "AWAITING_AUTHORIZATION" && supervisor
      ? button("authorize-print", "Authorize printing") + button("revise-print", "Request changes", "button-outline")
    : job.status === "AUTHORIZED" && responsible ? button("start-printing", "Start printing")
    : job.status === "PRINTING" && responsible ? button("complete-job", "Mark ready for pickup") : "";
  const collectionAction = job.status === "COMPLETED" ? `<button class="button button-lime" data-action="collect-job" data-id="${esc(job.id)}">Mark as collected <span>✓</span></button>` : "";
  const canReassign = authService.can(PERMISSIONS.JOBS_REASSIGN);
  const reassignTargets = authService.getDemoIdentities().filter((identity) => (
    ROLES[identity.roleId]?.level >= 2 && identity.name !== job.assignedStaff
  ));
  const reassignForm = canReassign && !["COMPLETED", "COLLECTED", "CANCELLED", "REJECTED"].includes(job.status) && job.assignedStaff && reassignTargets.length
    ? `<section class="detail-section job-reassignment">
  <h2>Reassign task</h2>
  <p>Choose a different Level 2 or above member for this job.</p>
  <form class="job-reassignment-form" data-form="job-reassign" data-id="${esc(job.id)}">
    <label class="field"><span>New assignee</span><select name="assigneeId" required>${reassignTargets.map((identity) => {
      const role = ROLES[identity.roleId];
      return `<option value="${esc(identity.id)}">${esc(identity.name)} · ${esc(role.title)} (Level ${role.level})</option>`;
    }).join("")}</select></label>
    <button class="button button-lime button-small" type="submit">Reassign task</button>
  </form>
</section>`
    : "";
  const notificationRows = notifications.length ? `<section class="detail-section">\
  <div class="staff-section-head">\
    <div>\
      <h2>\
        Pickup notifications\
      </h2>\
      <p>\
        Simulated records only · no email delivery\
      </p>\
    </div>\
  </div>\
  ${notifications.map((item) => `<div class="notification-row">\
  <div>\
    <strong>\
      ${esc(item.subject)}\
    </strong>\
    <small>\
      ${esc(item.recipientEmail)} · ${dateTime(item.createdAt)}\
    </small>\
  </div>\
  <span class="notification-status notification-${item.status.toLowerCase()}">\
    ${item.status} · DEMO\
  </span>\
  ${item.status === "FAILED" ? `<button class="button button-outline button-small" data-action="retry-notification" data-id="${esc(item.id)}">\
  Retry simulation\
</button>` : ""}\
</div>`).join("")}\
</section>` : "";
  return staffShell(`<div class="detail-back">\
  <a href="#/staff">\
    ← Overview\
  </a>\
  <span>\
    /\
  </span>\
  <span>\
    ${esc(job.projectName)}\
  </span>\
</div>\
<div class="detail-title-row">\
  <div>\
    <span class="eyebrow">\
      JOB DETAILS / LOCAL DEMO\
    </span>\
    <h1>\
      ${esc(job.projectName)}\
    </h1>\
    <div class="detail-title-meta">\
      ${statusBadge(job.status)}\
      <span>\
        Submitted ${dateTime(job.submittedAt)}\
      </span>\
    </div>\
  </div>\
  <div class="detail-actions">\
    ${action}\
    ${collectionAction}\
  </div>\
</div>\
<div class="detail-layout">\
  <div class="detail-primary">\
    <section class="detail-section">\
      <div class="staff-section-head">\
        <div>\
          <h2>\
            Request overview\
          </h2>\
          <p>\
            Submitted model details and preferences\
          </p>\
        </div>\
      </div>\
      <div class="detail-file">\
        <div class="file-type-icon">\
          3D\
        </div>\
        <div>\
          <strong>\
            ${esc(job.fileName)}\
          </strong>\
          <small>\
            ${job.modelUrl ? "Link included with request" : `${esc(job.fileSize)} · ${job.attachments?.length ? "Model attachment · local demo" : "Original file unavailable"}`}\
          </small>\
        </div>\
        <span class="material-chip">\
          ${esc(job.material)}\
        </span>\
      </div>\
      <div class="detail-grid">\
        ${[["Submitted by", `${job.submitterName} · ${job.submitterEmail}`], ["Material", job.material], ["Color preference", job.color], ["Purpose", job.purpose], ["Assigned staff", job.assignedStaff || "Unassigned"], ["Recipient email", job.recipientEmail]].map(([label, value]) => `<div>\
  <span>\
    ${label}\
  </span>\
  <strong>\
    ${esc(value)}\
  </strong>\
</div>`).join("")}\
      </div>\
      ${job.modelUrl ? `<div class="notes-box"><span>Model link</span><p>${esc(job.modelUrl)}</p></div>` : ""}\
      <div class="notes-box">\
        <span>\
          Project notes\
        </span>\
        <p>\
          ${esc(job.notes || "No additional notes provided.")}\
        </p>\
      </div>\
      ${pickupDetails(job)}\
      ${job.status === "COMPLETED" ? `<details class="pickup-editor"><summary>Edit pickup details</summary><form data-form="job-pickup-update" data-id="${esc(job.id)}">
        <label class="field"><span>Pickup location</span><input name="pickupLocation" value="${esc(job.pickupLocation || "")}" maxlength="120" placeholder="Enter the approved collection location" required /></label>
        <label class="field"><span>Pickup instructions</span><textarea name="pickupInstructions" maxlength="500" rows="3">${esc(job.pickupInstructions || "")}</textarea></label>
        <button type="submit" class="button button-outline button-small">Save pickup details</button>
      </form></details>` : ""}\
    </section>\
    ${jobModelFiles(job)}\
    ${reassignForm}\
    ${notificationRows}\
  </div>\
  <aside class="detail-aside">\
    ${jobProgress(job)}\
    <div class="detail-help">\
      <span>\
        ⓘ\
      </span>\
      <p>\
        Actions update local mock data only. They do not control a printer or send real email.\
      </p>\
    </div>\
  </aside>\
</div>`, isAssignedTo(job, authService.getCurrentIdentity()) ? "active" : "overview");
}
