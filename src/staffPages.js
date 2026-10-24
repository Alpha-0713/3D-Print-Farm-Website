import { DEMO_STAFF, MATERIALS } from "./data.js?v=12";
import { contributionsService, inventoryService, jobsService } from "./services.js?v=12";
import { notificationsService } from "./notificationsService.js?v=12";
import { appearanceControls, dateTime, esc, logo, moneylessId, shortDate, statusBadge } from "./pageShared.js?v=12";

function staffShell(content, active = "overview") {
  const links = [["overview", "Overview", "⌂", "#/staff"], ["active", "My active jobs", "◷", "#/staff/active"], ["materials", "Materials", "◇", "#/staff/materials"], ["hours", "My Hours", "◴", "#/staff/hours"]];
  const pageLabel = ({ overview: "Overview", active: "My active jobs", materials: "Materials", "material-new": "Add filament", hours: "My Hours" })[active] || "Staff Portal";
  return `<div class="staff-app">\
  <aside class="staff-sidebar">\
    <div class="sidebar-brand">\
      <div class="sidebar-brand-main">${logo()}${appearanceControls()}</div>\
    </div>\
    <nav aria-label="Staff navigation">\
  ${links.map(([id, label, icon, href]) => `<a class="sidebar-link ${active === id ? "selected" : ""}" href="${href}" ${active === id ? 'aria-current="page"' : ""}>\
  <span>\
    ${icon}\
  </span>\
  ${label}\
</a>`).join("")}\
    </nav>\
    <div class="sidebar-bottom">\
      <div class="staff-identity">\
        <span class="avatar">\
          JL\
        </span>\
        <div>\
          <strong>\
            ${DEMO_STAFF.name}\
          </strong>\
          <small>\
            Mock staff identity\
          </small>\
        </div>\
        <span class="online-dot">\
        </span>\
      </div>\
      <a class="back-public" href="#/">\
        ← Back to public website\
      </a>\
    </div>\
  </aside>\
  <div class="staff-main">\
    <header class="staff-topbar">\
      <div class="breadcrumbs">\
        <span>\
          Staff Portal\
        </span>\
        <b>\
          /\
        </b>\
        <strong>\
          ${pageLabel}\
        </strong>\
      </div>\
      <div class="topbar-right">\
        <span class="demo-pill">\
          DEMO WORKSPACE\
        </span>\
        <span class="top-date">\
          ${new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date())}\
        </span>\
        <span class="avatar">\
          JL\
        </span>\
      </div>\
    </header>\
    <div class="staff-content">\
      ${content}\
    </div>\
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
        <th>File</th>
        <th>Material</th>
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
      <strong>${moneylessId(job.id)}</strong>
      <span>${esc(job.projectName)}</span>
    </a>
  </td>
  <td>${esc(job.submitterName)}<small>${esc(job.submitterEmail)}</small></td>
  <td class="file-cell">${esc(job.fileName)}<small>${esc(job.fileSize)}</small></td>
  <td><span class="material-chip">${esc(job.material)}</span></td>
  <td>${shortDate(job.submittedAt)}<small>${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(job.submittedAt))}</small></td>
  <td>${statusBadge(job.status)}</td>
  <td>${job.assignedStaff ? `<span class="assigned"><i></i>${esc(job.assignedStaff)}</span>` : `<span class="unassigned">Unassigned</span>`}</td>
  <td><a class="table-action ${job.status === "SUBMITTED" && !job.assignedStaff ? "action-highlight" : ""}" href="#/staff/jobs/${encodeURIComponent(job.id)}">${job.status === "SUBMITTED" && !job.assignedStaff ? "Review" : "View"} <span>↗</span></a></td>
</tr>`).join("")}
    </tbody>
  </table>
</div>`;
}

export async function staffOverview() {
  const [summary, jobs] = await Promise.all([jobsService.summary(), jobsService.listJobs({ sort: "newest" })]);
  const cards = [["UNCLAIMED JOBS", summary.unclaimed, "Awaiting staff review", "lime"], ["IN PROGRESS", summary.inProgress, "Claimed by staff", "blue"], ["PRINTING", summary.printing, "Active print stage", "amber"], ["COMPLETED TODAY", summary.completedToday, "Marked complete today", "green"]];
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
    <a class="text-link" href="#/staff/active">View my active jobs ↗</a>\
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
    ${esc(DEMO_STAFF.name)} · DEMO\
  </span>\
</div>\
${jobs.length ? `<div class="active-jobs-grid">\
  ${jobs.map((job) => `<article class="active-job-card">\
  <div class="active-card-top">\
    <span class="job-id">\
      ${moneylessId(job.id)}\
    </span>\
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
  const entries = inventory.length ? `<div class="inventory-list" role="list">${inventory.map((item) => {
    const status = inventoryService.status(item);
    return `<div class="inventory-list-row" role="listitem">
  <div class="inventory-list-name"><a href="#/staff/materials/${encodeURIComponent(item.id)}">${esc(item.material)} · ${esc(item.color)}</a><small>Open filament details ↗</small></div>
  <div class="inventory-list-stock"><small>Remaining stock</small><strong>${Number(item.quantity)} <span>${esc(item.unit)}</span></strong></div>
  <span class="inventory-status status-${status.toLowerCase().replaceAll(" ", "-")}">${esc(status)}</span>
</div>`;
  }).join("")}</div>` : `<div class="empty-state inventory-empty"><span>◇</span><h2>No filament inventory entries yet</h2><p>Add the stock that staff have verified. Starting inventory is empty so this demo does not assume quantities or colors.</p></div>`;

  return staffShell(`<div class="staff-page-heading inventory-page-heading"><div><span class="eyebrow">STAFF PORTAL / MATERIALS</span><h1>Materials</h1><p>Current filament stock at a glance.</p><a class="button button-lime" href="#/staff/materials/new">Add New Filament <span>＋</span></a></div></div>
<section class="staff-section inventory-list-section"><div class="staff-section-head"><div><h2>Current inventory</h2><p>${inventory.length} filament ${inventory.length === 1 ? "entry" : "entries"}</p></div></div>${entries}</section>`, "materials");
}

const inventoryStatusClass = (status) => `status-${status.toLowerCase().replaceAll(" ", "-")}`;

export function staffMaterialForm() {
  return staffShell(`<div class="detail-back"><a href="#/staff/materials">← Current inventory</a></div>
<div class="staff-page-heading"><div><span class="eyebrow">MATERIALS / NEW ENTRY</span><h1>Add New Filament</h1><p>Enter verified stock details for one material and color.</p></div></div>
<section class="filament-panel filament-form-panel"><form class="inventory-add-form" data-form="inventory-add">
  <label class="field"><span>Material <b>*</b></span><select name="material" required><option value="">Choose material</option>${MATERIALS.map((material) => `<option value="${esc(material.id)}">${esc(material.name)} · ${esc(material.descriptor)}</option>`).join("")}</select></label>
  <label class="field"><span>Color name <b>*</b></span><input name="color" type="text" maxlength="60" placeholder="e.g. Matte black" required /></label>
  <label class="field"><span>Initial stock <b>*</b></span><input name="quantity" type="number" min="0" step="0.01" value="0" required /></label>
  <label class="field"><span>Unit <b>*</b></span><select name="unit" data-inventory-unit required><option value="g">Grams (g)</option><option value="kg">Kilograms (kg)</option><option value="spools">Spools</option></select></label>
  <label class="field"><span>Low-stock threshold <b>*</b></span><input name="lowStockThreshold" type="number" min="0" step="0.01" value="100" required /><small>Uses the selected stock unit.</small></label>
  <label class="field"><span>Available to students?</span><select name="available"><option value="true" selected>Yes</option><option value="false">No</option></select></label>
  <label class="field inventory-add-notes"><span>Notes <em>(optional)</em></span><input name="notes" type="text" maxlength="300" placeholder="Supplier, finish, or storage note" /></label>
  <div class="inventory-form-actions"><a class="button button-outline" href="#/staff/materials">Cancel</a><button class="button button-lime" type="submit">Save filament <span>＋</span></button></div>
</form></section>`, "material-new");
}

export async function staffMaterialDetail(id) {
  const item = await inventoryService.getItem(id);
  if (!item) return staffShell(`<div class="detail-back"><a href="#/staff/materials">← Current inventory</a></div><div class="empty-state"><span>◇</span><h2>Filament not found</h2><p>This inventory entry may have been removed or the link is invalid.</p><a class="button button-outline" href="#/staff/materials">Back to current inventory</a></div>`, "materials");
  const status = inventoryService.status(item);
  const adjustments = (item.adjustments || []).slice(0, 8);
  const adjustmentRows = adjustments.length ? `<div class="filament-adjustment-list">${adjustments.map((entry) => `<div class="filament-adjustment-row"><span class="adjustment-mark ${Number(entry.delta) >= 0 ? "is-positive" : "is-negative"}" aria-hidden="true">${Number(entry.delta) > 0 ? "+" : Number(entry.delta) < 0 ? "−" : "•"}</span><div><strong>${esc(entry.type === "initial" ? "Initial stock" : entry.type === "set" ? "Stock updated" : entry.type === "receive" ? "Stock received" : "Stock consumed")}</strong><small>${dateTime(entry.at)}${entry.note ? ` · ${esc(entry.note)}` : ""}</small></div><b>${Number(entry.delta) > 0 ? "+" : ""}${Number(entry.delta)} ${esc(item.unit)}</b></div>`).join("")}</div>` : `<p class="filament-muted">No stock changes recorded yet.</p>`;
  return staffShell(`<div class="detail-back"><a href="#/staff/materials">← Current inventory</a></div>
<div class="filament-detail-heading"><div><span class="eyebrow">MATERIALS / FILAMENT DETAILS</span><h1>${esc(item.material)} · ${esc(item.color)}</h1><span class="inventory-status ${inventoryStatusClass(status)}">${esc(status)}</span></div><div class="filament-current-stock"><small>Current stock</small><strong>${Number(item.quantity)} <span>${esc(item.unit)}</span></strong></div></div>
<div class="filament-detail-grid">
  <section class="filament-panel"><div class="filament-panel-heading"><div><h2>Filament settings</h2><p>Update identity, availability, and low-stock alert.</p></div></div>
    <form class="inventory-edit-form" data-form="inventory-update" data-id="${esc(item.id)}"><div class="inventory-edit-grid">
      <label class="field"><span>Material</span><select name="material" required>${MATERIALS.map((material) => `<option value="${esc(material.id)}" ${material.id === item.material ? "selected" : ""}>${esc(material.name)}</option>`).join("")}</select></label>
      <label class="field"><span>Color name</span><input name="color" type="text" maxlength="60" value="${esc(item.color)}" required /></label>
      <label class="field"><span>Stock quantity</span><input name="quantity" type="number" min="0" step="0.01" value="${Number(item.quantity)}" required /></label>
      <label class="field"><span>Unit</span><select name="unit" data-inventory-unit required>${[["g", "Grams (g)"], ["kg", "Kilograms (kg)"], ["spools", "Spools"]].map(([value, label]) => `<option value="${value}" ${value === item.unit ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="field"><span>Low-stock threshold</span><input name="lowStockThreshold" type="number" min="0" step="0.01" value="${Number(item.lowStockThreshold || 0)}" required /><small>Uses the selected stock unit.</small></label>
      <label class="field"><span>Available to students?</span><select name="available"><option value="true" ${item.available ? "selected" : ""}>Yes</option><option value="false" ${!item.available ? "selected" : ""}>No</option></select></label>
      <label class="field inventory-notes-field"><span>Notes</span><input name="notes" type="text" maxlength="300" value="${esc(item.notes || "")}" placeholder="Optional notes" /></label>
    </div><div class="inventory-edit-actions"><span>Updated ${item.updatedAt ? dateTime(item.updatedAt) : "—"}</span><div><button class="button button-outline button-small" type="reset">Cancel</button><button class="button button-lime button-small" type="submit">Save changes</button></div></div></form>
  </section>
  <section class="filament-panel"><div class="filament-panel-heading"><div><h2>Receive or use stock</h2><p>Record a quantity change and keep its history with this filament.</p></div></div>
    <form class="stock-adjust-form" data-form="inventory-adjust" data-id="${esc(item.id)}"><label class="field"><span>Adjustment</span><select name="action" aria-label="Adjustment type"><option value="receive">Receive stock</option><option value="consume">Record consumption</option></select></label><label class="field"><span>Amount (${esc(item.unit)})</span><input name="amount" type="number" min="0.01" step="0.01" placeholder="0" required aria-label="Stock adjustment amount" /></label><label class="field adjust-note"><span>Note <em>(optional)</em></span><input name="note" type="text" maxlength="120" placeholder="Reason for change" /></label><button class="button button-lime" type="submit">Record adjustment</button></form>
    <div class="filament-adjustment-history"><h3>Recent stock activity</h3>${adjustmentRows}</div>
  </section>
</div>`, "materials");
}

const localDateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const totalHours = (items) => items.reduce((sum, item) => sum + Number(item.hours), 0);

export async function staffHours(filters = {}, editingId = "") {
  const [records, allRecords] = await Promise.all([contributionsService.list(filters), contributionsService.listAll()]);
  const studentTotals = new Map();
  records.forEach((item) => studentTotals.set(item.student, (studentTotals.get(item.student) || 0) + Number(item.hours)));
  const selected = allRecords.find((item) => item.id === editingId);
  const studentSuggestions = [...new Set([...allRecords.map((item) => item.student), "Student Demo"])].sort((a, b) => a.localeCompare(b));
  const recordCards = records.length ? `<div class="hours-record-list">${records.map((item) => selected?.id === item.id
    ? `<article class="hours-record is-editing"><form data-form="hours-update" data-id="${esc(item.id)}"><div class="hours-record-heading"><h3>Edit contribution</h3><button type="button" class="text-button" data-action="hours-cancel-edit">Cancel</button></div><div class="hours-record-form-grid"><label class="field"><span>Student</span><input name="student" type="text" maxlength="100" value="${esc(item.student)}" list="student-suggestions" required /></label><label class="field"><span>Date</span><input name="date" type="date" max="${localDateValue()}" value="${esc(item.date)}" required /></label><label class="field"><span>Hours</span><input name="hours" type="number" min="0.01" max="24" step="0.01" value="${Number(item.hours)}" required /></label><label class="field hours-activity"><span>Activity</span><input name="activity" type="text" maxlength="300" value="${esc(item.activity)}" required /></label></div><button class="button button-lime button-small" type="submit">Save changes</button></form></article>`
    : `<article class="hours-record"><div class="hours-record-date">${shortDate(`${item.date}T12:00:00`)}</div><div class="hours-record-main"><div><h3>${esc(item.student)}</h3><span>${esc(item.activity)}</span></div><strong>${Number(item.hours)} ${Number(item.hours) === 1 ? "hour" : "hours"}</strong></div><button type="button" class="button button-outline button-small" data-action="hours-edit" data-id="${esc(item.id)}">Edit</button></article>`).join("")}</div>` : `<div class="empty-state hours-empty"><span>◴</span><h2>${allRecords.length ? "No contributions match these filters" : "No contribution records yet"}</h2><p>${allRecords.length ? "Try a wider date range or a different student name." : "Record a student's first contribution to get started."}</p></div>`;

  return staffShell(`<div class="staff-page-heading"><div><span class="eyebrow">STAFF PORTAL / STUDENT CONTRIBUTIONS</span><h1>My Hours</h1><p>Record and review student contributions to print farm activities.</p></div><span class="demo-pill">LOCAL DEMO STORAGE</span></div>
<section class="hours-summary-grid"><article><span>HOURS IN SELECTED PERIOD</span><strong>${totalHours(records).toFixed(2).replace(/\.00$/, "")}</strong></article><article><span>RECORDS SHOWN</span><strong>${records.length}</strong></article><article><span>STUDENTS SHOWN</span><strong>${studentTotals.size}</strong></article></section>
<section class="staff-section hours-filter-section"><div class="staff-section-head"><div><h2>Find contributions</h2><p>Totals and records below follow this student/date filter.</p></div></div><form class="hours-filter-form" data-form="hours-filter"><label class="field"><span>Student name</span><input name="student" type="search" value="${esc(filters.student || "")}" placeholder="Search students" /></label><label class="field"><span>From date</span><input name="from" type="date" value="${esc(filters.from || "")}" max="${localDateValue()}" /></label><label class="field"><span>To date</span><input name="to" type="date" value="${esc(filters.to || "")}" max="${localDateValue()}" /></label><div class="hours-filter-actions"><button class="button button-lime button-small" type="submit">Apply filters</button><button class="button button-outline button-small" type="button" data-action="hours-clear-filters">Clear</button></div></form></section>
<section class="hours-totals-section"><h2>Student totals for selected period</h2>${studentTotals.size ? `<div class="student-total-grid">${[...studentTotals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([student, hours]) => `<article><span>${esc(student)}</span><strong>${hours.toFixed(2).replace(/\.00$/, "")} h</strong></article>`).join("")}</div>` : `<p class="hours-muted">No student totals to show for this period.</p>`}</section>
<section class="staff-section hours-add-section"><div class="staff-section-head"><div><h2>Record a contribution</h2><p>Enter completed activity, date, and duration. Decimals such as 1.5 hours are supported.</p></div></div><form class="hours-add-form" data-form="hours-add"><label class="field"><span>Student name <b>*</b></span><input name="student" type="text" maxlength="100" list="student-suggestions" placeholder="Student name" required /><datalist id="student-suggestions">${studentSuggestions.map((name) => `<option value="${esc(name)}"></option>`).join("")}</datalist></label><label class="field"><span>Date <b>*</b></span><input name="date" type="date" max="${localDateValue()}" value="${localDateValue()}" required /></label><label class="field"><span>Duration in hours <b>*</b></span><input name="hours" type="number" min="0.01" max="24" step="0.01" placeholder="e.g. 1.5" required /></label><label class="field hours-add-activity"><span>Activity description <b>*</b></span><input name="activity" type="text" maxlength="300" placeholder="e.g. Prepared and sorted print jobs" required /></label><button class="button button-lime" type="submit">Save contribution <span>＋</span></button></form></section>
<section class="staff-section hours-records-section"><div class="staff-section-head"><div><h2>Contribution records</h2><p>${records.length} record${records.length === 1 ? "" : "s"} shown · totals are calculated from saved records</p></div></div>${recordCards}</section>
<div class="staff-note"><span>ⓘ</span><p>Student names use the demo's existing mock profiles and entered display names because no student directory or authentication backend exists. Records are stored locally in this browser.</p></div>`, "hours");
}

function historyLabel(event) {
  return ({ SUBMITTED: "Request submitted", CLAIMED: "Job claimed", PRINTING: "Marked as printing", COMPLETED: "Marked as completed", NOTIFICATION_SIMULATED: "Pickup notification simulated", NOTIFICATION_RETRIED_SIMULATED: "Notification retry simulated" })[event.type] || event.type;
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
  const action = job.status === "SUBMITTED" && !job.assignedStaff ? `<button class="button button-lime" data-action="claim-job" data-id="${esc(job.id)}">\
  Claim Job \
  <span>\
    →\
  </span>\
</button>` : job.status === "IN_PROGRESS" && job.assignedStaff === DEMO_STAFF.name ? `<button class="button button-lime" data-action="start-printing" data-id="${esc(job.id)}">\
  Mark as Printing \
  <span>\
    →\
  </span>\
</button>` : job.status === "PRINTING" && job.assignedStaff === DEMO_STAFF.name ? `<button class="button button-lime" data-action="complete-job" data-id="${esc(job.id)}">\
  Mark as Completed \
  <span>\
    ✓\
  </span>\
</button>` : "";
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
    ${moneylessId(job.id)}\
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
      <span>\
        ${moneylessId(job.id)}\
      </span>\
      ${statusBadge(job.status)}\
      <span>\
        Submitted ${dateTime(job.submittedAt)}\
      </span>\
    </div>\
  </div>\
  <div class="detail-actions">\
    ${action}\
    <button class="button button-outline button-small" data-action="copy-job" data-id="${esc(job.id)}">\
      Copy job ID\
    </button>\
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
            ${esc(job.fileSize)} · Filename only in this demo\
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
      <div class="notes-box">\
        <span>\
          Project notes\
        </span>\
        <p>\
          ${esc(job.notes || "No additional notes provided.")}\
        </p>\
      </div>\
      ${job.status === "COMPLETED" ? `<div class="pickup-box">\
  <span>\
    Pickup location\
  </span>\
  <strong>\
    ${esc(job.pickupLocation || "Not recorded")}\
  </strong>\
  <small>\
    Completed ${job.completedAt ? dateTime(job.completedAt) : ""}\
  </small>\
</div>` : ""}\
    </section>\
    ${notificationRows}\
  </div>\
  <aside class="detail-aside">\
    <section class="detail-section">\
      <h2>\
        Job history\
      </h2>\
      <div class="timeline">\
        ${[...job.history].reverse().map((event) => `<div class="timeline-event">\
  <i>\
  </i>\
  <div>\
    <strong>\
      ${historyLabel(event)}\
    </strong>\
    <small>\
      ${esc(event.by)} · ${dateTime(event.at)}\
    </small>\
  </div>\
</div>`).join("")}\
      </div>\
    </section>\
    <div class="detail-help">\
      <span>\
        ⓘ\
      </span>\
      <p>\
        Actions update local mock data only. They do not control a printer or send real email.\
      </p>\
    </div>\
  </aside>\
</div>`, "overview");
}
