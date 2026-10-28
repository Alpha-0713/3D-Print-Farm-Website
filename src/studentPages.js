import { jobsService } from "./services.js?v=2.2&rev=5";
import { authService } from "./authService.js?v=2.2&rev=5";
import { esc, footer, publicHeader, dateTime, shortDate, statusBadge } from "./pageShared.js?v=2.2&rev=5";
import { jobProgress, pickupDetails } from "./jobProgress.js?v=2.2&rev=5";

const category = (job) => ["COLLECTED", "CANCELLED", "REJECTED"].includes(job.status) ? "past" : job.status === "COMPLETED" ? "ready" : "active";

function jobCard(job) {
  return `<article class="request-row">
    <div class="request-row-title"><h2>${esc(job.projectName)}</h2>
      <p>${esc(job.material)} · ${esc(job.color)} <span> / </span> ${esc(job.fileName)}</p></div>
    <div class="request-row-status">${statusBadge(job.status)}<small>Submitted ${shortDate(job.submittedAt)}</small></div>
    <a class="request-row-action" href="#/my-jobs/${encodeURIComponent(job.id)}" aria-label="View ${esc(job.projectName)}">View details <span aria-hidden="true">→</span></a>
  </article>`;
}

export async function myJobsPage(state) {
  const jobs = await jobsService.listMyJobs();
  const identity = authService.getCurrentIdentity();
  const requestedView = new URLSearchParams(location.hash.split("?")[1] || "").get("view");
  const view = ["active", "ready", "past"].includes(requestedView) ? requestedView : "all";
  const visible = jobs.filter((job) => view === "all" || category(job) === view);
  return `${publicHeader(state)}<main class="my-jobs page-shell">
    <div class="page-title-row"><div><span class="eyebrow">YOUR REQUESTS</span><h1>My Print Jobs</h1>
      <p>From the first review to the finished part. Follow every request here.</p></div>
      <a class="button button-lime" href="#/get-started">New print request <span>↗</span></a></div>
    <div class="request-owner"><span>Submitted by <strong>${esc(identity.name)}</strong></span><small>${esc(identity.email)}</small></div>
    <nav class="request-filters" aria-label="Filter print jobs">${[["all", "All requests"], ["active", "In progress"], ["ready", "Ready for pickup"], ["past", "Past requests"]].map(([key, label]) => `<a href="#/my-jobs${key === "all" ? "" : `?view=${key}`}" ${view === key ? 'aria-current="page"' : ""}>${label}<span>${jobs.filter((job) => key === "all" || category(job) === key).length}</span></a>`).join("")}</nav>
    ${visible.length ? `<div class="request-list">${visible.map(jobCard).join("")}</div>` : `<div class="empty-state"><h2>${jobs.length ? "No requests in this view" : "Your first print starts here"}</h2><p>${jobs.length ? "Choose another view to see your other requests." : "Submit a model and return here for updates from the Print Farm team."}</p><a class="text-link" href="${jobs.length ? "#/my-jobs" : "#/get-started"}">${jobs.length ? "View all requests" : "Start a print request"} →</a></div>`}
    <p class="local-data-note">Demo workspace · Requests are saved in this browser.</p>
  </main>${footer()}`;
}

export async function myJobDetailsPage(state, jobId) {
  const job = await jobsService.getMyJob(jobId);
  if (!job) return `${publicHeader(state)}<main class="page-shell my-jobs"><div class="empty-state"><h1>Request not available</h1><p>This request is unavailable for your current identity.</p><a class="button button-outline" href="#/my-jobs">Back to My Print Jobs</a></div></main>${footer()}`;
  return `${publicHeader(state)}<main class="page-shell my-jobs submitter-detail ${["COMPLETED", "COLLECTED"].includes(job.status) ? "has-pickup" : ""}">
    <div class="detail-back"><a href="#/my-jobs">← My Print Jobs</a></div>
    <div class="page-title-row"><div><span class="eyebrow">PRINT REQUEST</span><h1>${esc(job.projectName)}</h1><p>Submitted ${dateTime(job.submittedAt)}</p></div>${statusBadge(job.status)}</div>
    <div class="submitter-detail-layout"><div class="request-detail-body">
      ${pickupDetails(job)}
      <section class="request-specs"><h2>Request details</h2><dl>${[["Model file", `${job.fileName} · ${job.fileSize}`], ["Material & colour", `${job.material} · ${job.color}`], ["Purpose", job.purpose || "Not specified"], ["Layer height", job.layerHeight || "Not recorded"], ["Infill", job.infill == null ? "Not recorded" : `${job.infill}%`], ["Staff member", job.assignedStaff || "Awaiting assignment"]].map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
      <div class="request-notes"><h3>Your project notes</h3><p>${esc(job.notes || "No additional notes.")}</p></div></section>
    </div><aside>${jobProgress(job)}</aside></div>
  </main>${footer()}`;
}
