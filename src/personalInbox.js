import { syncFloatingControls } from "./floatingControls.js?v=2.2&rev=5";
import { authService } from "./authService.js?v=2.2&rev=5";
import { PERMISSIONS } from "./authorization.js?v=2.2&rev=5";
import { inboxService, presenceService, jobsService, hoursService } from "./services.js?v=2.2&rev=5";
import { claimable } from "./jobWorkflow.js?v=2.2&rev=5";
import { dateTime, esc } from "./pageShared.js?v=2.2&rev=5";

export { inboxControl } from "./pageShared.js?v=2.2&rev=5";
let mountedRoot = null;
let identityId = null;
let entries = [];
let opened = null;
let seen = new Set();
let revision = 0;
let toastTimer;
let toastExitTimer;
let toastQueue = [];
let currentToast = null;
let contentSignature = "";
const routeFor = (item) => item.jobId ? `${authService.can(PERMISSIONS.STAFF_DASHBOARD_VIEW) ? "#/staff/jobs/" : "#/my-jobs/"}${encodeURIComponent(item.jobId)}`
  : item.kind === "hours-review" ? `#/staff/hours/staff/${encodeURIComponent(item.requesterId)}?request=${encodeURIComponent(item.requestId)}` : "#/staff/hours";
const closeMenus = (root) => root.querySelectorAll(".accent-picker[open], .role-switcher[open], .inbox-picker[open]").forEach((menu) => { menu.open = false; });

function showNextToast() {
  if (currentToast || !toastQueue.length) return;
  const item = toastQueue.shift();
  currentToast = item;
  let region = document.querySelector("#inbox-toast-root");
  if (!region) {
    region = document.createElement("div");
    region.id = "inbox-toast-root";
    region.setAttribute("aria-live", "polite");
    document.body.append(region);
  }
  region.innerHTML = `<div class="inbox-toast"><div><strong>${esc(item.title)}</strong><p>${esc(item.summary)}</p><button type="button" class="text-link" data-toast-open>View notification →</button></div><button type="button" class="inbox-toast-dismiss" data-toast-dismiss aria-label="Dismiss notification">×</button></div>`;
  region.querySelector("[data-toast-dismiss]").onclick = dismissToast;
  region.querySelector("[data-toast-open]").onclick = (event) => {
    event.stopPropagation();
    const root = mountedRoot;
    if (!root?.isConnected) { dismissToast(); return; }
    if (authService.getCurrentIdentity()?.id !== identityId) { dismissToast(); return; }
    closeMenus(root);
    const menu = root.querySelector(".inbox-picker");
    if (menu && entries.some((entry) => entry.id === item.id)) {
      menu.open = true;
      root.querySelector('[data-inbox-content]').dispatchEvent(new CustomEvent("inbox:open", { bubbles: true, detail: item.id }));
    } else {
      location.hash = routeFor(item);
    }
    dismissToast();
  };
  toastTimer = setTimeout(dismissToast, 6500);
}
function dismissToast() {
  clearTimeout(toastTimer);
  const region = document.querySelector("#inbox-toast-root");
  region?.firstElementChild?.classList.add("is-leaving");
  clearTimeout(toastExitTimer);
  toastExitTimer = setTimeout(() => {
    region?.replaceChildren();
    currentToast = null;
    showNextToast();
  }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160);
}
export function resetInboxSession() {
  revision += 1;
  identityId = null;
  entries = [];
  opened = null;
  contentSignature = "";
  seen = new Set();
  toastQueue = [];
  currentToast = null;
  clearTimeout(toastTimer);
  clearTimeout(toastExitTimer);
  document.querySelector("#inbox-toast-root")?.remove();
}

async function detailMarkup(item) {
  const actions = [];
  const supervisor = authService.can(PERMISSIONS.JOBS_APPROVE);
  let obsolete = false;
  if (item.jobId) {
    const job = await (authService.can(PERMISSIONS.STAFF_DASHBOARD_VIEW) ? jobsService.getJob(item.jobId) : jobsService.getMyJob(item.jobId));
    if (!job) return '<p class="inbox-muted">This job is no longer available to your account.</p>';
    actions.push(`<a class="button button-outline button-small" data-inbox-navigate href="${routeFor(item)}">${supervisor && ["initial-review", "print-review"].includes(item.kind) ? "Review job" : "View job"}</a>`);
    const button = (action, label, style = "button-lime") => `<button class="button ${style} button-small" data-action="${action}" data-id="${esc(job.id)}" data-expected-at="${esc(item.createdAt)}" data-authorization-id="${esc(item.authorizationId || "")}">${label}</button>`;
    if (item.kind === "available-job" && authService.can(PERMISSIONS.JOBS_MANAGE)) {
      if (claimable(job)) actions.push(button("claim-job", "Claim job"));
      else obsolete = true;
    }
    if (item.kind === "initial-review" && supervisor) {
      if (job.status === "SUBMITTED") actions.push(button("approve-job", "Approve"), button("reject-job", "Reject", "button-outline destructive-action"));
      else obsolete = true;
    }
    if (item.kind === "print-review" && supervisor) {
      // Match this attempt, not an earlier request that was returned and resubmitted.
      if (job.status === "AWAITING_AUTHORIZATION" && job.printAuthorization?.requestedAt === item.createdAt && (!item.authorizationId || job.printAuthorization.id === item.authorizationId))
        actions.push(button("authorize-print", "Authorize printing"), button("revise-print", "Request changes", "button-outline"));
      else obsolete = true;
    }
  } else {
    if (item.kind === "hours-review" && authService.can(PERMISSIONS.HOURS_ADMIN)) {
      const dashboard = await hoursService.getStaffDetail(item.requesterId).catch(() => null);
      if (!dashboard) return '<p class="inbox-muted">This staff record is no longer available. Open Hours to review current records.</p>';
      const request = dashboard.requests.find((request) => request.id === item.requestId);
      obsolete = !request || request.status !== "Pending";
      if (!obsolete && request.requesterId !== authService.getCurrentIdentity()?.id) {
        const attrs = `data-id="${esc(request.id)}" data-name="${esc(dashboard.name)}" data-hours="${request.hoursCenti / 100} hours" data-type="${request.adjustmentType === "add" ? "additional hours" : "correction / deduction"}"`;
        actions.push(`<button class="button button-lime button-small" data-action="hours-approve" ${attrs}>Approve hours</button><button class="button button-outline button-small" data-action="hours-reject" ${attrs}>Reject hours</button>`);
      }
    }
    actions.push(`<a class="button button-outline button-small" data-inbox-navigate href="${routeFor(item)}">${item.kind === "hours-review" ? "Review hours request" : "View hours"}</a>`);
  }
  return `${obsolete ? '<p class="inbox-resolved">This notification no longer has a pending action. Open the current record for details.</p>' : ""}<div class="inbox-detail-actions">${actions.join("")}</div>`;
}
async function paint(root, force = false) {
  const content = root.querySelector("[data-inbox-content]");
  if (!content) return;
  const signature = JSON.stringify({ entries, opened });
  if (!force && signature === contentSignature && !opened && content.childElementCount) return;
  const snapshot = opened;
  const actorId = identityId;
  const actions = snapshot ? await detailMarkup(snapshot) : "";
  if (snapshot !== opened || actorId !== identityId || !content.isConnected) return;
  const html = snapshot ? `<button class="inbox-back text-link" type="button" data-action="inbox-back">← Inbox</button><article class="inbox-detail"><span class="eyebrow">${esc(snapshot.context)}</span><h2 tabindex="-1">${esc(snapshot.title)}</h2><time datetime="${esc(snapshot.createdAt)}">${dateTime(snapshot.createdAt)}</time><p>${esc(snapshot.summary)}</p><p class="inbox-message">${esc(snapshot.message || "")}</p>${actions}</article>`
    : `<div class="inbox-heading"><h2>Inbox</h2><span>${entries.length} unread</span></div>${entries.length ? `<div class="inbox-list">${entries.map((item) => `<button type="button" class="inbox-entry" data-action="inbox-open" data-id="${esc(item.id)}"><strong>${esc(item.title)}</strong><span>${esc(item.summary)}</span><small>${esc(item.context)} · ${dateTime(item.createdAt)}</small></button>`).join("")}</div>` : '<div class="inbox-empty"><strong>You’re all caught up</strong><p>Job updates and hours decisions will appear here.</p></div>'}`;
  if (force || content.dataset.markup !== html) { content.innerHTML = html; content.dataset.markup = html; }
  contentSignature = signature;
  syncFloatingControls(root);
}

export async function syncPersonalInbox(root) {
  mountedRoot = root;
  if (!authService.getCurrentIdentity()) { resetInboxSession(); return; }
  const user = authService.getCurrentIdentity();
  const changedIdentity = user.id !== identityId;
  if (changedIdentity) { resetInboxSession(); identityId = user.id; }
  const call = ++revision;
  const [inbox, supervisors] = await Promise.all([inboxService.list(), authService.can(PERMISSIONS.STAFF_DASHBOARD_VIEW) ? presenceService.list() : Promise.resolve([])]);
  if (call !== revision || authService.getCurrentIdentity()?.id !== user.id) return;
  const arrivals = changedIdentity ? [] : inbox.filter((item) => !seen.has(item.id));
  entries = inbox;
  for (const item of inbox) seen.add(item.id);
  const summary = root.querySelector(".inbox-picker > summary");
  if (summary) {
    summary.setAttribute("aria-label", `Inbox${entries.length ? `, ${entries.length} unread notifications` : ", no unread notifications"}`);
    summary.querySelector(".inbox-dot").hidden = !entries.length;
  }
  const presence = root.querySelector("[data-supervisor-presence]");
  if (presence) {
    const html = `<div class="presence-people">${supervisors.map((person) => `<div class="presence-person"><span class="presence-copy" title="${esc(person.name)} - ${person.present ? "In the Print Farm" : "Not in the Print Farm"}"><strong>${esc(person.name)}</strong><span class="presence-separator" aria-hidden="true"> - </span><small class="${person.present ? "is-present" : ""}">${person.present ? "In the Print Farm" : "Not in the Print Farm"}</small></span>${person.id === user.id && authService.can(PERMISSIONS.SUPERVISOR_PRESENCE) ? `<button type="button" role="switch" aria-checked="${person.present}" aria-label="Your Print Farm presence" title="${person.present ? "Set as away" : "Set as present"}" class="presence-toggle" data-action="toggle-presence" data-present="${person.present}"><span class="presence-switch-track" aria-hidden="true"></span><span class="sr-only">${person.present ? "Set as away" : "Set as present"}</span></button>` : ""}</div>`).join("")}</div>`;
    if (presence.innerHTML !== html) presence.innerHTML = html;
  }
  await paint(root);
  toastQueue.push(...arrivals.slice().reverse());
  showNextToast();
}
export function bindPersonalInbox(root, reportError) {
  root.addEventListener("inbox:open", (event) => void openEntry(event.detail));
  const openEntry = async (id) => {
    const user = identityId;
    try {
      const item = await inboxService.open(id);
      if (authService.getCurrentIdentity()?.id !== user) return;
      opened = item;
      await syncPersonalInbox(root);
      root.querySelector(".inbox-detail h2")?.focus();
    } catch (error) { reportError(error.message); }
  };
  root.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "inbox-open") await openEntry(event.target.closest("[data-id]").dataset.id);
    if (action === "inbox-back") { opened = null; await paint(root, true); root.querySelector(".inbox-entry")?.focus(); }
    if (event.target.closest("[data-inbox-navigate]")) { opened = null; closeMenus(root); }
  });
  root.addEventListener("toggle", (event) => {
    if (event.target.matches?.(".inbox-picker") && !event.target.open) {
      opened = null;
      contentSignature = "";
      void paint(root, true);
    }
  }, true);
}
