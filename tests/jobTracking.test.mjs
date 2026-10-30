import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

const storage = new Map();
const storeKey = "three-d-print-farm-demo-v3";
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
globalThis.location = { hash: "#/my-jobs" };
globalThis.document = { documentElement: { dataset: {} } };
const { jobsService, inventoryService, resetLocalData, LOCAL_DATA_KEYS, rgbFromHex } = await import("../src/services.js?v=2.2&rev=5");
const { authService } = await import("../src/authService.js?v=2.2&rev=5");
const { myJobsPage, myJobDetailsPage } = await import("../src/studentPages.js?v=2.2&rev=5");
const { jobProgress, pickupDetails } = await import("../src/jobProgress.js?v=2.2&rev=5");
const { normalizeHexInput } = await import("../src/filamentColor.js?v=2.2&rev=5");
const { staffMaterialForm, staffMaterialDetail, jobDetailsPage } = await import("../src/staffPages.js?v=2.2&rev=5");
const filament = { id: "black", material: "PLA", color: "Black", hexColor: "#000000", lowStock: false, available: true };
const blankState = () => ({ jobs: [], notifications: [], inventory: [{ ...filament }], contributions: [], hours: { transactions: [], requests: [] } });
const request = (name = "Test part") => ({ projectName: name, modelUrl: "https://example.com/part.stl", submissionKey: crypto.randomUUID(), material: "PLA", color: "Black", inventoryId: "black", purpose: "Class project", notes: "Check orientation" });
const load = () => JSON.parse(storage.get(storeKey));

beforeEach(() => {
  storage.clear();
  authService.resetSession();
  storage.set(storeKey, JSON.stringify(blankState()));
  location.hash = "#/my-jobs";
  Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
});

test("stable submitter IDs protect list, detail, event, and staff access", async () => {
  const first = await jobsService.createJob(request("Owned part"));
  const persisted = load();
  assert.equal(first.submitterId, "demo-person-01");
  // An authenticated ID remains authoritative even when an email matches.
  persisted.jobs.push({ ...first, id: "other-owner", submitterId: "another-account" });
  storage.set(storeKey, JSON.stringify(persisted));
  assert.deepEqual((await jobsService.listMyJobs()).map((job) => job.id), [first.id]);
  assert.equal(await jobsService.getMyJob("other-owner"), null);
  assert.equal(await jobsService.getJob("other-owner"), null);
  assert.deepEqual(await jobsService.listJobEvents("other-owner"), []);
  await assert.rejects(jobsService.listJobs(), /staff access/);
  await assert.rejects(jobsService.claimJob(first.id), /staff access/);
  await assert.rejects(jobsService.collectJob(first.id), /staff access/);
  await assert.rejects(jobsService.listNotifications(), /staff access/);
  authService.switchRole("demo-person-02");
  assert.equal((await jobsService.listJobs()).length, 0);
  assert.equal(await jobsService.getJob(first.id), null);
  authService.switchRole("demo-person-04");
  await jobsService.reviewRequest(first.id, "approved");
  authService.switchRole("demo-person-02");
  assert.equal((await jobsService.listJobs()).length, 1);
  assert.equal((await jobsService.getJob(first.id)).id, first.id);
  assert.equal(await jobsService.getMyJob(first.id), null);
});

test("legacy email ownership and sparse event history migrate without replacing records", async () => {
  const first = await jobsService.createJob(request());
  const saved = load();
  delete saved.jobs[0].submitterId;
  delete saved.jobs[0].history;
  saved.jobs[0].submitterEmail = "MR.Q@example.com";
  saved.jobs[0].status = "COMPLETED";
  storage.set(storeKey, JSON.stringify(saved));
  const job = await jobsService.getMyJob(first.id);
  assert.ok(job);
  assert.deepEqual(job.history, []);
  assert.equal(load().jobs.length, 1);
  assert.deepEqual(load().jobs[0].history, []);
  const timeline = jobProgress(job);
  assert.match(timeline, /Time not recorded/);
  assert.match(timeline, /earlier transitions were not recorded/);
  assert.match(pickupDetails(job), /Not set yet/);
});

test("serialized staff transitions persist actual times, pickup instructions, and collection once", async () => {
  Object.defineProperty(globalThis, "navigator", { value: { locks: { request: async (_key, operation) => operation() } }, configurable: true });
  const original = await jobsService.createJob(request());
  authService.switchRole("demo-person-04");
  await jobsService.reviewRequest(original.id, "approved");
  authService.switchRole("demo-person-02");
  await jobsService.claimJob(original.id);
  await jobsService.requestAuthorization(original.id);
  authService.switchRole("demo-person-04");
  await jobsService.reviewAuthorization(original.id, "authorized");
  authService.switchRole("demo-person-02");
  await jobsService.startPrinting(original.id);
  const finished = await jobsService.completeJob(original.id, { pickupLocation: "Approved test desk", pickupInstructions: "Ask the staff member.", notifyRecipient: true });
  assert.equal(finished.notification.status, "PENDING");
  assert.equal(finished.job.status, "COMPLETED");
  assert.equal(finished.job.pickupInstructions, "Ask the staff member.");
  const collected = await jobsService.collectJob(original.id);
  assert.equal(collected.status, "COLLECTED");
  assert.equal(collected.collectedAt, collected.history.find((event) => event.type === "COLLECTED").at);
  assert.deepEqual(collected.history.filter((event) => !event.type.startsWith("NOTIFICATION")).map((event) => event.type), ["SUBMITTED", "APPROVED", "CLAIMED", "AUTHORIZATION_REQUESTED", "AUTHORIZED", "PRINTING", "COMPLETED", "COLLECTED"]);
  assert.ok(collected.history.every((event) => Number.isFinite(Date.parse(event.at))));
  assert.deepEqual(load().jobs[0], collected);
  await assert.rejects(jobsService.collectJob(original.id), /Only a print ready/);
  authService.switchRole("demo-person-01");
  assert.equal((await jobsService.getMyJob(original.id)).status, "COLLECTED");
  await assert.rejects(jobsService.completeJob(original.id, {}), /staff access/);
  assert.match(await myJobDetailsPage({ menuOpen: false }, original.id), /Print collected/);
  assert.doesNotMatch(await myJobDetailsPage({ menuOpen: false }, original.id), /data-action="collect-job"/);
  // Cancel the notification timer and prove reset will not resurrect the job.
  await resetLocalData();
  await new Promise((resolve) => setTimeout(resolve, 950));
  assert.equal(storage.has(storeKey), false);
});

test("only the assigned member advances a job; Level 4 can reassign", async () => {
  const job = await jobsService.createJob(request());
  authService.switchRole("demo-person-04");
  await jobsService.reviewRequest(job.id, "approved");
  authService.switchRole("demo-person-02");
  await jobsService.claimJob(job.id);
  authService.switchRole("demo-person-03");
  await assert.rejects(jobsService.startPrinting(job.id), /Only the assigned/);
  await assert.rejects(jobsService.reassignJob(job.id, "demo-person-03"), /Level 4/);
  authService.switchRole("demo-person-04");
  await jobsService.reassignJob(job.id, "demo-person-03");
  authService.switchRole("demo-person-03");
  await jobsService.requestAuthorization(job.id);
  authService.switchRole("demo-person-04");
  await jobsService.reviewAuthorization(job.id, "authorized");
  authService.switchRole("demo-person-03");
  assert.equal((await jobsService.startPrinting(job.id)).status, "PRINTING");
});

test("filament entry and editing retain one hash, validation, RGB, and permissions", async () => {
  assert.equal(normalizeHexInput(""), "#");
  assert.equal(normalizeHexInput("##2f80ed"), "#2F80ED");
  assert.equal(normalizeHexInput("2f80ed"), "#2F80ED");
  assert.equal(rgbFromHex(normalizeHexInput("##2f80ed")), "RGB(47, 128, 237)");
  assert.equal(rgbFromHex("#GGGGGG"), "");
  assert.equal(rgbFromHex("#1234567"), "");
  await assert.rejects(inventoryService.add({ material: "PLA", color: "Blue", hexColor: "#2F80ED" }), /Level 3/);
  authService.switchRole("demo-person-03");
  assert.match(staffMaterialForm(), /data-hex-input[^>]*value="#"/);
  const added = await inventoryService.add({ material: "PLA", color: "Blue", hexColor: "#2f80ed" });
  assert.equal(added.hexColor, "#2F80ED");
  await assert.rejects(inventoryService.update(added.id, { color: "Blue", hexColor: "#GGGGGG" }), /six-digit HEX/);
  const changed = await inventoryService.update(added.id, { color: "Ocean", hexColor: "123456" });
  assert.equal(changed.hexColor, "#123456");
  assert.equal(changed.available, true);
  assert.match(await staffMaterialDetail(added.id), /value="#123456"/);
  authService.switchRole("demo-person-02");
  assert.doesNotMatch(await staffMaterialDetail(added.id), /data-form="inventory-update"/);
  await assert.rejects(inventoryService.update(added.id, { color: "Ocean", hexColor: "FFFFFF" }), /Level 3/);
});

test("reset removes only application-owned data and resets in-memory identities", async () => {
  const account = authService.createDemoAccount({ name: "Temporary person", roleId: "regular_teacher" });
  authService.switchRole(account.id);
  for (const key of LOCAL_DATA_KEYS.filter((key) => !key.includes("accounts") && !key.includes("role"))) storage.set(key, "saved");
  storage.set("unrelated-website-setting", "keep me");
  storage.set("three-d-print-farm-unrecognized-key", "also keep me");
  await resetLocalData();
  for (const key of LOCAL_DATA_KEYS) assert.equal(storage.has(key), false);
  assert.equal(storage.get("unrelated-website-setting"), "keep me");
  assert.equal(storage.get("three-d-print-farm-unrecognized-key"), "also keep me");
  assert.equal(authService.getCurrentIdentity().id, "demo-person-01");
  assert.equal(authService.getDemoIdentities().length, 6);
  assert.equal(jobsService.refreshFromStorage(), true);
  assert.ok(load().jobs.length > 0);
});

test("many requests, filters, closed states, escaping, and unavailable details render safely", async () => {
  const job = await jobsService.createJob(request('A <part> "name"'));
  const saved = load();
  saved.jobs = Array.from({ length: 40 }, (_, index) => ({ ...job, id: `test-${index}`, status: ["SUBMITTED", "COMPLETED", "COLLECTED", "CANCELLED", "REJECTED"][index % 5] }));
  storage.set(storeKey, JSON.stringify(saved));
  const page = await myJobsPage({ menuOpen: false });
  assert.equal((page.match(/class="request-row"/g) || []).length, 40);
  assert.match(page, /A &lt;part&gt; &quot;name&quot;/);
  assert.match(page, /Cancelled/);
  assert.match(page, /Rejected/);
  assert.doesNotMatch(page, /PFN-|Print Number|print number/);
  location.hash = "#/my-jobs?view=past";
  assert.equal(((await myJobsPage({ menuOpen: false })).match(/class="request-row"/g) || []).length, 24);
  const unavailable = await myJobDetailsPage({ menuOpen: false }, "absent");
  assert.match(unavailable, /Request not available/);
  assert.doesNotMatch(jobProgress({ ...job, status: "CANCELLED" }), /is-current|is-upcoming/);
  authService.switchRole("demo-person-02");
  const staffPage = await jobDetailsPage("test-1");
  assert.match(staffPage, /Mark as collected/);
  assert.doesNotMatch(staffPage, /PFN-|print number/);
});

test("staff can fill legacy pickup details without changing the print status or fabricating transitions", async () => {
  const original = await jobsService.createJob(request());
  const saved = load();
  saved.jobs[0].status = "COMPLETED";
  saved.jobs[0].history = [{ type: "SUBMITTED", at: original.submittedAt, by: "Mr. Q" }, { type: "COMPLETED", at: "invalid", by: "Leddy Tiang" }];
  delete saved.jobs[0].assignedStaff;
  storage.set(storeKey, JSON.stringify(saved));
  await assert.rejects(jobsService.updatePickup(original.id, { pickupLocation: "Test desk" }), /staff access/);
  authService.switchRole("demo-person-02");
  const updated = await jobsService.updatePickup(original.id, { pickupLocation: "Test desk", pickupInstructions: "Ask staff." });
  assert.equal(updated.status, "COMPLETED");
  assert.equal(updated.pickupLocation, "Test desk");
  assert.equal(updated.history.find((event) => event.type === "COMPLETED").at, null);
  assert.equal(updated.history.filter((event) => event.type === "PICKUP_UPDATED").length, 1);
  assert.equal(updated.history.some((event) => event.type === "PRINTING"), false);
  await jobsService.updatePickup(original.id, { pickupLocation: "Test desk", pickupInstructions: "Ask staff." });
  assert.equal(load().jobs[0].history.filter((event) => event.type === "PICKUP_UPDATED").length, 1);
  assert.match(await jobDetailsPage(original.id), /data-form="job-pickup-update"/);
});

test("filament subpages keep the Materials tab active with a single shared sidebar highlight", () => {
  authService.switchRole("demo-person-03");
  const html = staffMaterialForm();
  assert.match(html, /class="sidebar-link selected" href="#\/staff\/materials" aria-current="page"/);
  assert.equal((html.match(/class="sidebar-selection"/g) || []).length, 1);
});
