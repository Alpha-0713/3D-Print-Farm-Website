import { jobsService } from "./services.js?v=8";
import { authService } from "./authService.js?v=8";
import { esc, footer, moneylessId, publicHeader, shortDate, statusBadge } from "./pageShared.js?v=8";

function jobCard(job, showAction = true) {
  return `<article class="job-card">\
  <div class="job-card-head">\
    <span class="job-id">\
      ${moneylessId(job.id)}\
    </span>\
    ${statusBadge(job.status)}\
  </div>\
  <h3>\
    ${esc(job.projectName)}\
  </h3>\
  <p class="job-file">\
    ${esc(job.fileName)} · ${esc(job.fileSize)}\
  </p>\
  <div class="job-card-meta">\
    <span>\
      ${esc(job.material)} \
      <i>\
        ·\
      </i>\
       ${esc(job.color)}\
    </span>\
    <span>\
      ${shortDate(job.submittedAt)}\
    </span>\
  </div>\
  <div class="job-card-foot">\
    <span>\
      Submitted ${shortDate(job.submittedAt)}\
    </span>\
    ${showAction ? `<a href="#/staff/jobs/${encodeURIComponent(job.id)}" class="text-link">\
  View details ↗\
</a>` : ""}\
  </div>\
</article>`;
}

export async function myJobsPage(state) {
  const [jobs, student] = await Promise.all([jobsService.listMyJobs(), authService.getStudent()]);
  return `${publicHeader(state)}\
<main class="my-jobs page-shell">\
  <div class="page-title-row">\
    <div>\
      <span class="eyebrow">\
        <i>\
        </i>\
         STUDENT PORTAL · DEMO\
      </span>\
      <h1>\
        My Jobs\
      </h1>\
      <p>\
        Track print requests created under the fictional demo student profile.\
      </p>\
    </div>\
    <a class="button button-lime" href="#/get-started">\
      New print request \
      <span>\
        ↗\
      </span>\
    </a>\
  </div>\
  <div class="demo-identity">\
    <span class="avatar">\
      SD\
    </span>\
    <div>\
      <strong>\
        ${esc(student.name)}\
      </strong>\
      <small>\
        Mock identity · ${esc(student.email)}\
      </small>\
    </div>\
    <span class="demo-pill">\
      LOCAL DEMO DATA\
    </span>\
  </div>\
  ${jobs.length ? `<div class="jobs-grid">\
  ${jobs.map((job) => jobCard(job, false)).join("")}\
</div>` : `<div class="empty-state">\
  <span>\
    ⌁\
  </span>\
  <h2>\
    No demo requests yet\
  </h2>\
  <p>\
    Start a request to see it appear here.\
  </p>\
  <a class="button button-lime" href="#/get-started">\
    Get Started\
  </a>\
</div>`}\
</main>\
${footer()}`;
}
