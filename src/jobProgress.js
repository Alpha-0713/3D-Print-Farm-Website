import { dateTime, esc } from "./pageShared.js?v=2.2&rev=5";

const STAGES = [
  ["SUBMITTED", "Submitted", "SUBMITTED"],
  ["SUBMITTED", "Supervisor review", null],
  ["APPROVED", "Approved / available to staff", "APPROVED"],
  ["IN_PROGRESS", "Claimed / preparation", "CLAIMED"],
  ["AWAITING_AUTHORIZATION", "Awaiting print authorization", "AUTHORIZATION_REQUESTED"],
  ["AUTHORIZED", "Authorized to print", "AUTHORIZED"],
  ["PRINTING", "Printing", "PRINTING"],
  ["COMPLETED", "Ready for pickup", "COMPLETED"],
  ["COLLECTED", "Collected / completed", "COLLECTED"],
];
export function jobProgress(job) {
  const history = job.history || [];
  const stopped = ["CANCELLED", "REJECTED"].includes(job.status);
  const recorded = (type) => [...history].reverse().find((event) => event.type === type);
  let current = job.status === "SUBMITTED" ? 1 : STAGES.findIndex(([status]) => status === job.status);
  const revision = job.status === "IN_PROGRESS" && job.printAuthorization?.decision === "revision";
  const stages = STAGES.map(([, label, type], index) => {
    let event = type ? recorded(type) : null;
    if (index === 1) event = recorded("APPROVED");
    // A previous authorization attempt remains in history, but is never the current authorization.
    if ([4, 5].includes(index) && (revision || (job.status === "IN_PROGRESS" && !job.printAuthorization))) event = null;
    if (index === 5 && current < 5) event = null;
    const reached = Boolean(event) || (!stopped && index < current);
    const state = !stopped && index === current ? "current" : event ? "done" : reached ? "unrecorded" : stopped ? "inactive" : "upcoming";
    const detail = event?.at ? dateTime(event.at) : state === "current" && index === 1 ? "Awaiting a Level 4 decision"
      : reached || state === "current" ? "Time not recorded" : stopped ? "Not reached" : "Awaiting this stage";
    const supervisor = [1, 2, 5].includes(index) && event ? `<small>Approved by ${esc(event.by)}</small>` : "";
    return `<li class="progress-stage is-${state}" ${state === "current" ? 'aria-current="step"' : ""}>
      <span class="progress-marker" aria-hidden="true">${state === "done" ? "✓" : state === "unrecorded" ? "—" : index + 1}</span>
      <div><strong>${label}</strong><small>${state === "current" ? "Current stage · " : ""}${esc(detail)}</small>${supervisor}</div></li>`;
  }).join("");
  const decision = stopped ? recorded(job.status) : revision ? recorded("REVISION_REQUESTED") : null;
  const missingHistory = STAGES.some(([, , type], index) => type && index < current && !recorded(type)?.at);
  return `<section class="job-progress" aria-label="Print progress"><h2>Print progress</h2>
    ${stopped ? `<p class="progress-stopped">Request ${job.status.toLowerCase()} · ${dateTime(decision?.at)}</p>` : ""}
    ${decision?.note ? `<p class="workflow-reason"><strong>${revision ? "Changes required" : "Decision reason"}</strong>${esc(decision.note)}<small>${esc(decision.by)} · ${dateTime(decision.at)}</small></p>` : ""}
    ${job.initialApproval?.legacy ? '<p class="history-note">Existing work retained. Earlier supervisor review was not recorded.</p>' : ""}
    <ol class="progress-stages">${stages}</ol>
    ${missingHistory ? '<p class="history-note">Some earlier transitions were not recorded. Only saved event times are shown.</p>' : ""}
  </section>`;
}

export function pickupDetails(job) {
  if (!["COMPLETED", "COLLECTED"].includes(job.status)) return "";
  const collected = job.status === "COLLECTED";
  return `<section class="pickup-details ${collected ? "is-collected" : ""}" aria-label="Pickup information">
    <span class="eyebrow">${collected ? "PICKUP RECORDED" : "YOUR PRINT IS READY"}</span>
    <h2>${collected ? "Print collected" : "Ready for pickup"}</h2>
    <dl><div><dt>Collection location</dt><dd>${esc(job.pickupLocation || "Not set yet. Contact Print Farm staff for the collection location.")}</dd></div>
    <div><dt>Pickup instructions</dt><dd>${esc(job.pickupInstructions || "No additional instructions. Contact staff if you need help with collection.")}</dd></div>
    <div><dt>Collection status</dt><dd>${collected ? `Collected${job.collectedAt ? ` · ${dateTime(job.collectedAt)}` : " · Time not recorded"}` : "Awaiting collection · Staff will record your pickup."}</dd></div></dl>
  </section>`;
}
