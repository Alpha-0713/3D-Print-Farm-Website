import { hoursService } from "./services.js?v=20";
import { authService } from "./authService.js?v=20";
import { PERMISSIONS } from "./authorization.js?v=20";
import { dateTime, esc } from "./pageShared.js?v=25";
import { staffShell } from "./staffPages.js?v=24";

const formatHours = (centi) => `${(Number(centi || 0) / 100).toFixed(2).replace(/\.00$/, "")} h`;
const signedHours = (centi) => `${centi > 0 ? "+" : "−"}${formatHours(Math.abs(centi))}`;
const escapeAttr = (value = "") => esc(value).replace(/`/g, "&#96;");
const formatTimestamp = (value) => value ? dateTime(value) : "—";
const localDateValue = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const statusBadge = (status) => `<span class="hours-status" data-status="${esc(status)}">${esc(status)}</span>`;

function transactionCards(transactions, emptyMessage) {
  if (!transactions.length) return `<div class="empty-state hours-empty"><span>◴</span><h2>No hour activity yet</h2><p>${esc(emptyMessage)}</p></div>`;
  return `<div class="hours-transaction-list">${transactions.map((item) => `<article class="hours-transaction-card">
    <div class="hours-transaction-heading"><div><strong>${signedHours(item.deltaCenti)}</strong><span>${item.source === "request" ? "Approved request" : item.source === "contribution" ? "Student contribution" : "Balance correction"}</span></div><time>${formatTimestamp(item.createdAt)}</time></div>
    <p>${esc(item.reason)}</p>
    <div class="hours-transaction-meta"><span>Balance ${formatHours(item.balanceBeforeCenti)} → ${formatHours(item.balanceAfterCenti)}</span><span>Recorded by ${esc(item.actorName)}</span>${item.workDate ? `<span>Work date ${esc(item.workDate)}</span>` : ""}</div>
  </article>`).join("")}</div>`;
}

function requestCard(request, { ownId, admin = false } = {}) {
  const verb = request.adjustmentType === "add" ? "Additional hours" : "Correction / deduction";
  const transactionSummary = request.transaction
    ? `<p class="hours-request-outcome">Applied ${signedHours(request.transaction.deltaCenti)} on ${formatTimestamp(request.transaction.createdAt)}.</p>`
    : "";
  const reviewActions = request.status === "Pending" && admin
    ? request.requesterId === ownId
      ? `<p class="hours-request-self-note">You submitted this request. Another Level 4 reviewer must decide it.</p>`
      : `<div class="hours-request-actions"><button type="button" class="button button-lime button-small" data-action="hours-approve" data-id="${escapeAttr(request.id)}" data-name="${escapeAttr(request.staffName)}" data-type="${escapeAttr(verb)}" data-hours="${formatHours(request.hoursCenti)}">Approve</button><button type="button" class="button button-outline button-small" data-action="hours-reject" data-id="${escapeAttr(request.id)}" data-name="${escapeAttr(request.staffName)}" data-hours="${formatHours(request.hoursCenti)}">Reject</button></div>`
    : "";
  const outcome = request.status === "Rejected" && request.rejectionReason
    ? `<p class="hours-request-outcome">Rejection reason: ${esc(request.rejectionReason)}</p>`
    : request.status === "Approved" ? transactionSummary : "";

  return `<article class="hours-request-card">
    <div class="hours-request-heading"><div><h3>${admin ? esc(request.staffName) : esc(verb)}</h3><span>${admin ? `${esc(request.staffRoleTitle)} · Level ${request.staffLevel}` : esc(verb)}</span></div>${statusBadge(request.status)}</div>
    <div class="hours-request-detail"><strong>${formatHours(request.hoursCenti)}</strong><span>${esc(verb)}</span></div>
    <p class="hours-request-reason">${esc(request.reason)}</p>
    <div class="hours-request-meta"><span>Submitted ${formatTimestamp(request.submittedAt)}</span>${request.reviewedByName ? `<span>Reviewed by ${esc(request.reviewedByName)} · ${formatTimestamp(request.decidedAt)}</span>` : ""}</div>
    ${outcome}${reviewActions}
  </article>`;
}

function personalHoursPage(dashboard, role) {
  const canRequest = role.level <= 3 && authService.can(PERMISSIONS.HOURS_REQUEST);
  const requestForm = canRequest ? `<section class="staff-section hours-request-form-section">
    <div class="staff-section-head"><div><h2>Request an adjustment</h2><p>This request will be reviewed by Level 4 staff. Submitting it does not change your balance.</p></div></div>
    <form class="hours-request-form" data-form="hours-request">
      <input type="hidden" name="submissionKey" value="${esc(hoursService.newSubmissionKey())}" />
      <label class="field"><span>Request type <b>*</b></span><select name="adjustmentType" required><option value="add">Additional hours</option><option value="subtract">Correction / deduction</option></select></label>
      <label class="field"><span>Hours <b>*</b></span><input name="hours" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="e.g. 1.5" required /></label>
      <label class="field hours-request-reason-field"><span>Explanation <b>*</b></span><textarea name="reason" rows="3" maxlength="500" required placeholder="Explain the work or correction you are requesting"></textarea></label>
      <button class="button button-lime" type="submit">Submit request <span>→</span></button>
    </form>
  </section>` : "";

  return staffShell(`<div class="staff-page-heading"><div><span class="eyebrow">STAFF PORTAL / HOURS</span><h1>Hours</h1><p>Your personal hour balance, adjustment requests, and transaction history.</p></div><span class="demo-pill">LOCAL DEMO STORAGE</span></div>
  <section class="hours-personal-overview">
    <article class="hours-balance-card"><span>YOUR CURRENT BALANCE</span><strong>${formatHours(dashboard.balanceCenti)}</strong><p>Calculated from your saved hour transactions. New staff start at zero.</p></article>
    <article class="hours-overview-stat"><span>PENDING REQUESTS</span><strong>${dashboard.pendingCount}</strong><p>${dashboard.pendingCount ? "Awaiting a Level 4 decision" : "No requests awaiting review"}</p></article>
    <article class="hours-overview-stat"><span>RECENT ACTIVITY</span><strong>${dashboard.transactions.length}</strong><p>${dashboard.transactions[0] ? `Last adjustment ${formatTimestamp(dashboard.transactions[0].createdAt)}` : "No completed adjustments yet"}</p></article>
  </section>
  ${requestForm}
  <section class="staff-section hours-requests-section"><div class="staff-section-head"><div><h2>Your adjustment requests</h2><p>Pending requests do not affect your balance. Approved changes appear in your history.</p></div><span>${dashboard.requests.length} total</span></div>
    ${dashboard.requests.length ? `<div class="hours-request-list">${dashboard.requests.map((request) => requestCard(request, { ownId: dashboard.identity.id })).join("")}</div>` : `<div class="empty-state hours-empty"><span>◷</span><h2>No adjustment requests yet</h2><p>Submitted requests and their decisions will appear here.</p></div>`}
  </section>
  <section class="staff-section hours-history-section"><div class="staff-section-head"><div><h2>Your transaction history</h2><p>Completed adjustments are recorded with the acting staff member, reason, and before-and-after balance.</p></div></div>
    ${transactionCards(dashboard.transactions, "Completed adjustments will be listed here. Your starting balance is zero hours.")}
  </section>
  <div class="staff-note"><span>ⓘ</span><p>Hours are stored in this browser for demonstration purposes. This page does not authenticate your identity or provide shared, server-side accounting.</p></div>`, "hours");
}

function requestSummary(requests) {
  if (!requests.length) return `<span class="hours-request-none">—</span>`;
  return `<div class="hours-request-summary-list">${requests.map((request) => `<span class="hours-request-summary"><strong>${request.adjustmentType === "add" ? "+" : "−"}${formatHours(request.hoursCenti)}</strong><small>${request.adjustmentType === "add" ? "Additional" : "Correction"} · Pending</small></span>`).join("")}</div>`;
}

function staffOverviewTable(staff) {
  return staff.length ? `<div class="hours-table-wrap"><table class="hours-staff-table"><thead><tr><th>Staff member</th><th>Balance</th><th>Last adjustment</th><th>Requests</th><th><span class="visually-hidden">Select staff member</span></th></tr></thead><tbody>${staff.map((item) => `<tr>
    <td><strong>${esc(item.name)}</strong><small>Level ${item.level} · ${esc(item.roleTitle)}</small></td><td class="hours-balance-cell">${formatHours(item.balanceCenti)}</td>
    <td>${item.latestTransaction ? `${formatTimestamp(item.latestTransaction.createdAt)}<small>${signedHours(item.latestTransaction.deltaCenti)}</small>` : "No adjustments"}</td><td>${requestSummary(item.pendingRequests)}</td>
    <td><a class="button button-outline button-small" aria-label="Select ${esc(item.name)}" href="#/staff/hours/staff/${encodeURIComponent(item.id)}">Select</a></td>
  </tr>`).join("")}</tbody></table></div>` : `<div class="empty-state hours-empty"><span>⌕</span><h2>No staff match that search</h2><p>Search by staff name.</p></div>`;
}

function staffDetailPanel(detail) {
  if (!detail) return `<div class="empty-state hours-empty"><span>ⓘ</span><h2>Staff member unavailable</h2><p>This record may have been removed or the link is invalid.</p></div>`;
  return `<section class="staff-section hours-staff-detail">
    <div class="staff-section-head"><div><span class="eyebrow">LEVEL ${detail.level} STAFF · ${esc(detail.id)}</span><h2>${esc(detail.name)}</h2><p>${esc(detail.roleTitle)} · Current balance ${formatHours(detail.balanceCenti)}</p></div><a class="text-button" href="#/staff/hours">Back to overview</a></div>
    <section class="staff-section hours-member-requests-section"><div class="staff-section-head"><div><h3>Requests</h3><p>Review this staff member’s hour requests.</p></div><span>${detail.requests.length} total</span></div>
      ${detail.requests.length ? `<div class="hours-request-list">${detail.requests.map((request) => requestCard(request, { ownId: authService.getCurrentIdentity().id, admin: true })).join("")}</div>` : `<div class="empty-state hours-empty"><span>◷</span><h2>No requests yet</h2><p>Requests from this staff member will appear here.</p></div>`}
    </section>
    <div class="hours-give-panel"><h3>Give hours</h3><p>Hours added here update the balance and appear in the merged contribution history.</p>
    <form class="hours-admin-give-form" data-form="hours-admin-give" data-user-id="${escapeAttr(detail.id)}" data-user-name="${escapeAttr(detail.name)}" data-balance-centi="${detail.balanceCenti}">
      <input type="hidden" name="submissionKey" value="${esc(hoursService.newSubmissionKey())}" />
      <input type="hidden" name="expectedBalanceCenti" value="${detail.balanceCenti}" />
      <label class="field"><span>Hours <b>*</b></span><input name="hours" type="number" min="0.01" max="24" step="0.01" inputmode="decimal" placeholder="e.g. 1.5" data-hours-preview-input required /></label>
      <label class="field"><span>Work date <b>*</b></span><input name="date" type="date" max="${localDateValue()}" value="${localDateValue()}" required /></label>
      <label class="field hours-adjust-reason"><span>Activity <b>*</b></span><input name="activity" type="text" maxlength="300" required placeholder="What work did they complete?" /></label>
      <div class="hours-proposed-balance"><span>Current balance<strong>${formatHours(detail.balanceCenti)}</strong></span><span>Proposed balance<strong data-hours-proposed>${formatHours(detail.balanceCenti)}</strong></span></div>
      <button class="button button-lime" type="submit">Give hours <span>＋</span></button>
    </form>
    </div>
    <details class="hours-correction-details"><summary>Subtract or correct hours</summary><form class="hours-admin-adjust-form" data-form="hours-admin-adjust" data-user-id="${escapeAttr(detail.id)}" data-balance-centi="${detail.balanceCenti}">
      <input type="hidden" name="submissionKey" value="${esc(hoursService.newSubmissionKey())}" /><input type="hidden" name="expectedBalanceCenti" value="${detail.balanceCenti}" /><input type="hidden" name="adjustmentType" value="subtract" />
      <label class="field"><span>Hours to subtract <b>*</b></span><input name="hours" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="e.g. 0.5" data-hours-preview-input required /></label>
      <label class="field hours-adjust-reason"><span>Reason <b>*</b></span><input name="reason" type="text" maxlength="500" required placeholder="Why is this balance being corrected?" /></label>
      <div class="hours-proposed-balance"><span>Current balance<strong>${formatHours(detail.balanceCenti)}</strong></span><span>Proposed balance<strong data-hours-proposed>${formatHours(detail.balanceCenti)}</strong></span></div>
      <button class="button button-outline" type="submit">Subtract hours</button>
    </form></details>
    <div class="hours-staff-history"><div class="staff-section-head"><div><h3>Contribution and balance history</h3><p>Hours transactions and related student contribution records for this staff member appear together.</p></div></div>${adminActivityList(detail.activity)}</div>
  </section>`;
}

function adminActivityList(items) {
  if (!items.length) return `<div class="empty-state hours-empty"><span>◴</span><h2>No saved activity yet</h2><p>Staff contributions and balance changes will appear here.</p></div>`;
  return `<div class="hours-activity-list">${items.map((item) => `<article class="hours-activity-card">
    <div class="hours-activity-amount ${item.deltaCenti !== null && item.deltaCenti < 0 ? "is-negative" : ""}"><strong>${item.deltaCenti === null ? formatHours(item.hoursCenti) : signedHours(item.deltaCenti)}</strong><span>${esc(item.sourceLabel)}</span></div>
    <div class="hours-activity-main"><strong>${esc(item.userName)}${item.level ? ` · Level ${item.level}` : ""}</strong><p>${esc(item.reason)}</p><small>${item.affectsBalance ? `Balance ${formatHours(item.balanceBeforeCenti)} → ${formatHours(item.balanceAfterCenti)}` : "Contribution record · no staff balance linked"} · Recorded by ${esc(item.actorName)}</small></div>
    <time>${item.workDate ? `Work date ${esc(item.workDate)} · ` : ""}${formatTimestamp(item.createdAt)}</time>
  </article>`).join("")}</div>`;
}

async function levelFourHoursPage({ staffId, search }) {
  const [staff, detail, activity] = await Promise.all([
    hoursService.getStaffOverview(search),
    staffId ? hoursService.getStaffDetail(staffId).catch(() => null) : Promise.resolve(null),
    staffId ? hoursService.getAdminActivity(staffId).catch(() => []) : Promise.resolve([]),
  ]);
  const selectedDetail = detail ? { ...detail, activity } : detail;
  return staffShell(`<div class="staff-page-heading"><div><span class="eyebrow">STAFF PORTAL / HOURS</span><h1>Hours</h1><p>Give hours to Level 2 and Level 3 staff, review requests, and see their contribution history.</p></div><span class="demo-pill">LOCAL DEMO STORAGE</span></div>
  ${staffId ? staffDetailPanel(selectedDetail) : ""}
  <section class="staff-section hours-admin-staff-section"><div class="staff-section-head"><div><h2>Choose a staff member</h2><p>Only existing Level 2 and Level 3 accounts appear here. Select a person to give hours or review their history.</p></div></div>
    <form class="hours-admin-filter-form" data-form="hours-admin-filter"><label class="field"><span>Search by name</span><input type="search" name="search" value="${esc(search)}" placeholder="Enter a staff name" /></label><button class="button button-lime button-small" type="submit">Search</button></form>
    ${staffOverviewTable(staff)}
  </section>
  <div class="staff-note"><span>ⓘ</span><p>Level 4 permissions and hour data are enforced in the browser application only. This static demo has no trusted server-side authorization or shared database.</p></div>`, "hours");
}

export async function staffHours({ staffId = "", search = "" } = {}) {
  const role = authService.getCurrentRole();
  if (role.level >= 4) return levelFourHoursPage({ staffId, search });
  const dashboard = await hoursService.getOwnDashboard();
  return personalHoursPage(dashboard, role);
}
