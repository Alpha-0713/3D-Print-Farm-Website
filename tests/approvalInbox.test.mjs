import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
const data = new Map();
const key = "three-d-print-farm-demo-v3";
globalThis.localStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
globalThis.document = { documentElement: { dataset: {} } };
globalThis.location = { hash: "#/staff" };
const { jobsService: jobs, hoursService: hours, inboxService: inbox, presenceService: presence, resetLocalData } = await import("../src/services.js?v=2.2&rev=5");
const { authService: auth } = await import("../src/authService.js?v=2.2&rev=5");
const { jobProgress } = await import("../src/jobProgress.js?v=2.2&rev=5");
const { jobDetailsPage, staffOverview, activeJobsPage } = await import("../src/staffPages.js?v=2.2&rev=5");
const select = (n) => auth.switchRole(`demo-person-${String(n).padStart(2, "0")}`);
const read = () => JSON.parse(data.get(key));
const request = { projectName: "QA bracket", file: { name: "part.stl", sizeBytes: 256 }, inventoryId: "qa-pla", material: "PLA", color: "Gray", notes: "Print upright" };
beforeEach(() => {
  data.clear(); auth.resetSession();
  data.set(key, JSON.stringify({ jobs: [], notifications: [], inventory: [{ id: "qa-pla", material: "PLA", color: "Gray", hexColor: "#808080", lowStock: false, available: true }], contributions: [], hours: { transactions: [], requests: [] } }));
  // Serialize concurrent callers in the same way as browser Web Locks.
  let tail = Promise.resolve();
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { request: (_key, run) => {
    const result = tail.then(run); tail = result.catch(() => {}); return result;
  } } } });
});
async function approveNew() {
  select(1); const job = await jobs.createJob(request);
  select(4); await jobs.reviewRequest(job.id, "approved");
  return job;
}
async function prepare() {
  const job = await approveNew(); select(2); await jobs.claimJob(job.id); return job;
}
test("pending requests are hidden from every staff list, filter, summary, detail, history and direct claim", async () => {
  const job = await jobs.createJob(request);
  for (const n of [2,3,5,6]) {
    select(n);
    assert.deepEqual(await jobs.listJobs(), []);
    assert.deepEqual(await jobs.listJobs({ status: "SUBMITTED", search: job.id }), []);
    assert.equal(await jobs.getJob(job.id), null);
    assert.deepEqual(await jobs.listJobEvents(job.id), []);
    assert.deepEqual(await jobs.listMyActiveJobs(), []);
    assert.equal((await jobs.summary()).total, 0);
    assert.doesNotMatch(await staffOverview(), /QA bracket/);
    assert.doesNotMatch(await activeJobsPage(), /QA bracket/);
    await assert.rejects(jobs.claimJob(job.id), /no longer available/);
    await assert.rejects(jobs.reviewRequest(job.id, "approved"), /Level 4/);
  }
  select(4); assert.equal((await inbox.list())[0].kind, "initial-review");
  assert.equal((await jobs.getJob(job.id)).status, "SUBMITTED");
  select(1); assert.equal((await jobs.getMyJob(job.id)).id, job.id);
});
test("initial approval is recorded once, creates individual job alerts, and duplicate claims are rejected", async () => {
  const job = await approveNew();
  await assert.rejects(jobs.reviewRequest(job.id, "approved"), /already been reviewed/);
  const saved = read().jobs[0];
  assert.equal(saved.initialApproval.byId, "demo-person-04");
  assert.ok(Date.parse(saved.initialApproval.at));
  for (const n of [2,3,5,6]) { select(n); assert.equal((await inbox.list())[0].kind, "available-job"); }
  select(2); const claims = await Promise.allSettled([jobs.claimJob(job.id), jobs.claimJob(job.id)]);
  assert.equal(claims.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(read().jobs[0].assignedStaffId, "demo-person-02");
});
test("authorization gate, required revisions, resubmission and stale supervisor attempts all validate", async () => {
  const job = await prepare();
  await assert.rejects(jobs.startPrinting(job.id), /authorization is required/);
  await jobs.requestAuthorization(job.id);
  const firstAttempt = read().jobs[0].printAuthorization.requestedAt;
  await assert.rejects(jobs.requestAuthorization(job.id), /Only a prepared/);
  await assert.rejects(jobs.startPrinting(job.id), /authorization is required/);
  await assert.rejects(jobs.reviewAuthorization(job.id, "authorized"), /Level 4/);
  select(4);
  assert.ok((await inbox.list()).some((item) => item.kind === "print-review"));
  await assert.rejects(jobs.reviewAuthorization(job.id, "revision", ""), /reason/);
  await jobs.reviewAuthorization(job.id, "revision", "Rotate the model");
  select(2);
  assert.match(jobProgress(await jobs.getJob(job.id)), /Rotate the model/);
  await jobs.requestAuthorization(job.id);
  select(4);
  await assert.rejects(jobs.reviewAuthorization(job.id, "authorized", "", "earlier-attempt"), /earlier authorization/);
  const authorized = await jobs.reviewAuthorization(job.id, "authorized");
  assert.equal(authorized.printAuthorization.byId, "demo-person-04");
  await assert.rejects(jobs.reviewAuthorization(job.id, "authorized"), /no longer pending/);
  select(2); assert.equal((await jobs.startPrinting(job.id)).status, "PRINTING");
  await jobs.completeJob(job.id, { pickupLocation: "QA desk", notifyRecipient: false });
  const final = await jobs.collectJob(job.id);
  select(1);
  assert.equal((await jobs.getMyJob(job.id)).status, "COLLECTED");
  assert.match(jobProgress(final), /Approved by Mr. Uw/);
  assert.ok(firstAttempt);
});
test("rejection remains private to supervisors and owning submitter, with a saved reason", async () => {
  const job = await jobs.createJob(request);
  select(4); await assert.rejects(jobs.reviewRequest(job.id, "rejected"), /reason/);
  await jobs.reviewRequest(job.id, "rejected", "Wall thickness needs adjustment");
  select(2); assert.equal(await jobs.getJob(job.id), null);
  await assert.rejects(jobs.claimJob(job.id), /no longer available/);
  select(1); const own = await jobs.getMyJob(job.id);
  assert.match(jobProgress(own), /Wall thickness needs adjustment/);
});
test("assigned staff receive other people's changes, never their own excluded progress events", async () => {
  const job = await prepare(); select(2);
  const count = (await inbox.list()).length;
  await jobs.requestAuthorization(job.id);
  assert.equal((await inbox.list()).length, count);
  select(4); await jobs.reviewAuthorization(job.id, "authorized");
  select(2);
  const updates = (await inbox.list()).filter((item) => item.kind === "job-progress");
  assert.equal(updates.length, 1); assert.equal(updates[0].title, "Print authorized");
  assert.match(updates[0].summary, /Mr. Uw/);
  await jobs.startPrinting(job.id);
  assert.equal((await inbox.list()).filter((item) => item.kind === "job-progress").length, 1);
});
test("personal inbox open deletes only the selected user's entry and retains a detached details snapshot", async () => {
  await approveNew(); select(2);
  const original = (await inbox.list())[0];
  select(3); await assert.rejects(inbox.open(original.id), /no longer in your inbox/);
  const other = await inbox.list();
  select(2); const opened = await inbox.open(original.id);
  assert.equal(opened.title, "New job available");
  assert.deepEqual(await inbox.list(), []);
  opened.title = "Changed snapshot";
  select(3); assert.deepEqual(await inbox.list(), other);
  assert.ok(!read().inbox.some((item) => item.id === original.id));
  select(2); jobs.refreshFromStorage(); assert.deepEqual(await inbox.list(), []);
});
test("presence belongs to each supervisor, persists, and is read-only for members", async () => {
  select(4); const second = auth.createDemoAccount({ name: "QA Supervisor", roleId: "print_farm_teacher" });
  await presence.set(true);
  auth.switchRole(second.id); assert.equal((await presence.list()).find((person) => person.id === second.id).present, false);
  await presence.set(false);
  select(2); const records = await presence.list();
  assert.equal(records.find((person) => person.id === "demo-person-04").present, true);
  assert.equal(records.find((person) => person.id === second.id).present, false);
  await assert.rejects(presence.set(true), /Only Level 4/);
  jobs.refreshFromStorage(); assert.deepEqual(await presence.list(), records);
});
test("each supervisor can review shared requests once; notification actions cannot repeat a decision", async () => {
  select(4); const second = auth.createDemoAccount({ name: "QA Supervisor", roleId: "print_farm_teacher" });
  select(1); const job = await jobs.createJob(request);
  select(4); assert.equal((await inbox.list()).length, 1); await jobs.reviewRequest(job.id, "approved");
  auth.switchRole(second.id); assert.equal((await inbox.list()).length, 1);
  await assert.rejects(jobs.reviewRequest(job.id, "rejected", "obsolete"), /already been reviewed/);
});
test("hours requests, direct credits and approvals generate one alert each and preserve hour validation", async () => {
  select(2); const payload = { adjustmentType: "add", hours: "1.5", reason: "Prepared the QA prints", submissionKey: "qa-hours-request-1" };
  const request = await hours.submitRequest(payload); await hours.submitRequest(payload);
  assert.equal((await hours.getOwnDashboard()).balanceCenti, 0);
  select(4); assert.equal((await inbox.list()).filter((item) => item.kind === "hours-review").length, 1);
  await hours.approveRequest(request.id);
  await assert.rejects(hours.approveRequest(request.id), /already been reviewed/);
  select(2); const alerts = await inbox.list();
  assert.equal(alerts.filter((item) => item.kind === "hours-added").length, 1);
  assert.match(alerts.find((item) => item.kind === "hours-added").summary, /1.5 hours/);
  select(4);
  const give = { hours: "2", date: new Date(Date.now() - 86400000).toISOString().slice(0,10), activity: "QA preparation", expectedBalanceCenti: 150, submissionKey: "qa-direct-credit-1" };
  await hours.giveHours("demo-person-02", give); await hours.giveHours("demo-person-02", give);
  select(2); assert.equal((await hours.getOwnDashboard()).balanceCenti, 350);
  assert.equal((await inbox.list()).filter((item) => item.kind === "hours-added").length, 2);
  select(3); assert.deepEqual(await inbox.list(), []);
});
test("legacy records retain progress, lack invented approval dates and still require final authorization", async () => {
  const created = await jobs.createJob(request); const saved = read();
  Object.assign(saved.jobs[0], { status: "IN_PROGRESS", assignedStaff: "Leddy Tiang", history: [] });
  delete saved.jobs[0].initialApproval; data.set(key, JSON.stringify(saved));
  select(2); const legacy = await jobs.getJob(created.id);
  assert.equal(legacy.status, "IN_PROGRESS"); assert.equal(legacy.initialApproval.legacy, true);
  assert.deepEqual(legacy.history, []);
  assert.match(jobProgress(legacy), /Earlier supervisor review was not recorded/);
  assert.doesNotMatch(jobProgress(legacy), /Approved by/);
  await assert.rejects(jobs.startPrinting(created.id), /authorization is required/);
  await jobs.requestAuthorization(created.id);
});
test("reassignment invalidates pending and granted authorization and notifies the new assignee", async () => {
  const job = await prepare(); await jobs.requestAuthorization(job.id);
  select(4); await jobs.reviewAuthorization(job.id, "authorized");
  await jobs.reassignJob(job.id, "demo-person-03");
  select(3); assert.equal((await jobs.getJob(job.id)).status, "IN_PROGRESS");
  await assert.rejects(jobs.startPrinting(job.id), /authorization is required/);
  assert.ok((await inbox.list()).some((item) => item.kind === "job-progress"));
});
test("failed writes roll back event generation; refreshes and repeated reads never create notifications", async () => {
  await approveNew(); select(2); const previous = data.get(key); const originalSet = localStorage.setItem;
  localStorage.setItem = () => { throw new Error("Storage full"); };
  await assert.rejects(jobs.claimJob(read().jobs[0].id), /could not save/);
  localStorage.setItem = originalSet; assert.equal(data.get(key), previous);
  for (let n=0;n<3;n++) { jobs.refreshFromStorage(); await inbox.list(); await jobs.listJobs(); }
  assert.equal(data.get(key), previous);
  await resetLocalData(); assert.equal(data.has(key), false);
  select(4); assert.deepEqual(await inbox.list(), []); assert.ok((await presence.list()).every((person) => !person.present));
});

test("a prior authorization stays upcoming after reassignment and a new review uses a unique attempt", async () => {
  const job = await prepare(); await jobs.requestAuthorization(job.id);
  const first = read().jobs[0].printAuthorization;
  select(4); await jobs.reviewAuthorization(job.id, "authorized");
  await jobs.reassignJob(job.id, "demo-person-03");
  select(3); await jobs.requestAuthorization(job.id);
  const second = read().jobs[0].printAuthorization;
  assert.notEqual(first.id, second.id);
  const progress = jobProgress(await jobs.getJob(job.id));
  assert.match(progress, /is-upcoming[^]*?Authorized to print/);
  select(4);
  await assert.rejects(jobs.reviewAuthorization(job.id, "authorized", "", null, first.id), /earlier authorization/);
  await jobs.reviewAuthorization(job.id, "authorized", "", null, second.id);
});
