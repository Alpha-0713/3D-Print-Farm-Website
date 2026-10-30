import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

const storage = new Map();
const key = "three-d-print-farm-demo-v3";
globalThis.localStorage = { getItem: (name) => storage.get(name) ?? null, setItem: (name, value) => storage.set(name, String(value)), removeItem: (name) => storage.delete(name) };
globalThis.location = { hash: "#/get-started" };
globalThis.document = { documentElement: { dataset: {} }, querySelectorAll: () => [] };
const { groupFilaments, filamentPalette, setFilamentSelection } = await import("../src/filamentPalette.js?v=2.2&rev=5");
const { getStartedPage } = await import("../src/requestWizard.js?v=2.2&rev=5");
const { jobsService } = await import("../src/services.js?v=2.2&rev=5");
const item = (id, hexColor, options = {}) => ({ id, material: "PLA", color: id, hexColor, available: true, lowStock: false, ...options });
const examples = [item("blue", "#0066FF"), item("black", "#000000"), item("white", "#FFFFFF"), item("green", "#00CC44"), item("red", "#FF0000"), item("yellow", "#EEEE00"), item("purple", "#6633CC"), item("grey", "#AAAAAA")];
const state = (inventoryId = "") => ({ menuOpen: false, wizard: { step: 2, file: null, projectName: "", notes: "", material: "", color: "", inventoryId } });
beforeEach(() => storage.set(key, JSON.stringify({ jobs: [], notifications: [], inventory: examples, contributions: [], hours: { transactions: [], requests: [] } })));

test("colours sort into material sections, neutrals first, then warm to cool, without mutating inventory", () => {
  const input = [item("tpu", "#FF00FF", { material: "TPU" }), ...examples, item("petg", "#00FFFF", { material: "PETG" })];
  const before = JSON.stringify(input);
  const groups = groupFilaments(input);
  assert.deepEqual(groups.map((group) => group.material), ["PLA", "PETG", "TPU"]);
  assert.deepEqual(groups[0].filaments.map((filament) => filament.id), ["white", "grey", "black", "red", "yellow", "green", "blue", "purple"]);
  assert.equal(JSON.stringify(input), before);
});

test("all colours remain visible; unavailable and unverified colours are disabled, low stock stays selectable", () => {
  const items = [item("ready", "#FFFFFF"), item("low", "#FF0000", { lowStock: true }), item("out", "#000000", { available: false }), item("invalid", 'red;opacity:0')];
  const html = filamentPalette(items, "out");
  assert.equal((html.match(/type="radio"/g) || []).length, 4);
  const inputs = [...html.matchAll(/<input[^>]+>/g)].map((match) => match[0]);
  assert.match(inputs.find((input) => input.includes('value="out"')), /disabled/);
  assert.match(inputs.find((input) => input.includes('value="invalid"')), /disabled/);
  assert.doesNotMatch(inputs.find((input) => input.includes('value="low"')), /disabled/);
  assert.equal((html.match(/<input[^>]*type="radio"[^>]* checked[^>]*>/g) || []).length, 0);
  assert.doesNotMatch(html, /--filament-color:red;opacity/);
});

test("one native radio group spans materials and preserves the chosen inventory identity", async () => {
  const current = JSON.parse(storage.get(key));
  current.inventory.push(item("petg-blue", "#0066FF", { material: "PETG", color: "Blue" }));
  storage.set(key, JSON.stringify(current));
  const wizard = state("petg-blue");
  const html = await getStartedPage(wizard);
  assert.equal((html.match(/<input[^>]*type="radio"[^>]* checked[^>]*>/g) || []).length, 1);
  assert.match(html, /name="inventoryId"[^>]*value="petg-blue"[^>]*checked/);
  assert.doesNotMatch(html, /<select name="inventoryId"/);
  assert.equal(wizard.wizard.material, "PETG");
  assert.equal(wizard.wizard.color, "Blue");
});

test("a removed or unavailable selection is cleared rather than silently selecting a different colour", async () => {
  const wizard = state("deleted-colour");
  const html = await getStartedPage(wizard);
  assert.equal(wizard.wizard.inventoryId, "");
  assert.equal(wizard.wizard.material, "");
  assert.equal((html.match(/<input[^>]*type="radio"[^>]* checked[^>]*>/g) || []).length, 0);
  const current = JSON.parse(storage.get(key));
  current.inventory[0].available = false;
  storage.set(key, JSON.stringify(current));
  const unavailable = state("blue");
  await getStartedPage(unavailable);
  assert.equal(unavailable.wizard.inventoryId, "");
});

test("valid legacy colour selections survive and unavailable colours remain visible when none can be selected", async () => {
  const wizard = state();
  wizard.wizard.material = "PLA";
  wizard.wizard.color = "blue";
  await getStartedPage(wizard);
  assert.equal(wizard.wizard.inventoryId, "blue");
  const current = JSON.parse(storage.get(key));
  current.inventory.forEach((filament) => { filament.available = false; });
  storage.set(key, JSON.stringify(current));
  const html = await getStartedPage(state());
  assert.equal((html.match(/type="radio"/g) || []).length, examples.length);
  assert.equal((html.match(/ disabled/g) || []).length, examples.length);
});

test("selection uses an inventory ID, rejects invalid choices, and is checked again when saving a request", async () => {
  const wizard = state().wizard;
  setFilamentSelection(wizard, examples[0]);
  assert.deepEqual([wizard.inventoryId, wizard.material, wizard.color], ["blue", "PLA", "blue"]);
  assert.throws(() => setFilamentSelection(wizard, { ...examples[0], available: false }), /unavailable/);
  assert.throws(() => setFilamentSelection(wizard, { ...examples[0], hexColor: "#nope" }), /verification/);
  const current = JSON.parse(storage.get(key));
  current.inventory[0].available = false;
  storage.set(key, JSON.stringify(current));
  await assert.rejects(jobsService.createJob({ ...wizard, modelUrl: "https://example.com/test.stl", submissionKey: crypto.randomUUID(), projectName: "Palette request" }), /no longer available/);
});

test("palette labels escape user-entered names and a completely empty inventory remains usable", async () => {
  const html = filamentPalette([item('x"', "#FF0000", { color: '<red> "special"' })]);
  assert.match(html, /&lt;red&gt; &quot;special&quot;/);
  assert.doesNotMatch(html, /<red>/);
  storage.set(key, JSON.stringify({ jobs: [], notifications: [], inventory: [] }));
  assert.match(await getStartedPage(state()), /No filament colours listed yet/);
});
