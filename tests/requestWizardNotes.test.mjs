import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

const storage = new Map();
const stateKey = "three-d-print-farm-demo-v3";
const createDemoState = () => ({
  jobs: [],
  notifications: [],
  inventory: [{ id: "test-black", material: "PLA", color: "Black", hexColor: "#000000", lowStock: false, available: true }],
  contributions: [],
  hours: { transactions: [], requests: [] },
});

globalThis.localStorage = {
  getItem(key) { return storage.get(key) ?? null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};
globalThis.location = { hash: "#/get-started" };
globalThis.document = {
  documentElement: { dataset: {} },
  querySelectorAll() { return []; },
};

const { getStartedPage, normalizeOptionalNote } = await import("../src/requestWizard.js?v=2.2&rev=5");
const { jobsService } = await import("../src/services.js?v=2.2&rev=5");

beforeEach(() => {
  storage.set(stateKey, JSON.stringify(createDemoState()));
});

function wizardState(notes = "", step = 3) {
  return {
    menuOpen: false,
    wizard: {
      step,
      file: null,
      projectName: "Regression test project",
      purpose: "Class project",
      notes,
      inventoryId: "test-black",
      material: "PLA",
      color: "Black",
      submittedJob: null,
    },
  };
}

function submittedRequest(notes) {
  return {
    projectName: "Regression test project",
    modelUrl: "https://example.com/sample.stl", submissionKey: crypto.randomUUID(),
    material: "PLA",
    color: "Black",
    inventoryId: "test-black",
    purpose: "Class project",
    notes,
  };
}

test("Get Started renders an initially empty optional note value", async () => {
  const html = await getStartedPage(wizardState(""));
  const textarea = html.match(/<textarea data-field="notes"[^>]*>[\s\S]*?<\/textarea>/)?.[0];

  assert.equal(
    textarea,
    '<textarea data-field="notes" maxlength="500" rows="4" placeholder="Requirements, orientation, or anything staff should know…"></textarea>',
  );
});

test("meaningful notes keep their leading and trailing whitespace in the field", async () => {
  const note = "  Check orientation before printing. \t";
  const html = await getStartedPage(wizardState(note));
  const textarea = html.match(/<textarea data-field="notes"[^>]*>[\s\S]*?<\/textarea>/)?.[0];

  assert.ok(textarea?.endsWith(`>${note}</textarea>`));
});

test("whitespace-only submitted notes become empty while meaningful notes are preserved", async () => {
  for (const value of ["   ", "\t\n", "\u00a0\u2003", "\ufeff"]) {
    assert.equal(normalizeOptionalNote(value), "");
  }

  const emptyJob = await jobsService.createJob(submittedRequest(normalizeOptionalNote(" \t\n\u00a0")));
  assert.equal(emptyJob.notes, "");

  const note = "  Please check orientation. \t";
  const meaningfulJob = await jobsService.createJob(submittedRequest(normalizeOptionalNote(note)));
  assert.equal(meaningfulJob.notes, note);
});
