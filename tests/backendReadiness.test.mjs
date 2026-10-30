import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { parseRoute } from "../src/routes.js";
import { validateRequest } from "../src/requestValidation.js";
import { freshWizard, restoreWizard } from "../src/wizardState.js";
const saved = new Map();
const key = "three-d-print-farm-demo-v3";
globalThis.localStorage = { getItem: k => saved.get(k) ?? null, setItem: (k,v) => saved.set(k,String(v)), removeItem: k => saved.delete(k), key: n => [...saved.keys()][n], get length() { return saved.size; } };
globalThis.location = { hash: "#/staff/jobs" };
globalThis.document = { documentElement: { dataset: {} } };
const { jobsService: jobs, inventoryService: inventory, inboxService: inbox, diagnosticsService: diagnostics, resetLocalData } = await import("../src/services.js?v=2.2&rev=5");
const { authService: auth } = await import("../src/authService.js?v=2.2&rev=5");
const { getStartedPage } = await import("../src/requestWizard.js?v=2.2&rev=5");
const { staffJobsPage } = await import("../src/staffPages.js?v=2.2&rev=5");
const { toolbarControls } = await import("../src/pageShared.js?v=2.2&rev=5");
const item = { id: "original-id", material: "PLA", color: "Gray", hexColor: "#808080", available: true, lowStock: false };
const blank = () => ({ jobs: [], notifications: [], inventory: [{...item}], contributions: [], hours: { transactions: [], requests: [] } });
const request = extra => ({ submissionKey: crypto.randomUUID(), projectName: "Synthetic bracket", modelUrl: "https://example.com/bracket.stl", inventoryId: item.id, material: item.material, color: item.color, ...extra });
beforeEach(() => { Object.defineProperty(globalThis,"navigator",{value:{},configurable:true}); saved.clear(); auth.resetSession(); saved.set(key, JSON.stringify(blank())); });

test("strict URL, lengths, enumerations and mutually exclusive sources are checked at both boundaries", async () => {
  for (const modelUrl of ["javascript:alert(1)", "data:text/plain,x", "http://example.com/a.stl", "ftp://example.com/a", "https://user:secret@example.com/a", "https://example.com/" + "x".repeat(2050)]) {
    assert.throws(() => validateRequest(request({ modelUrl })), /URL|HTTPS|protocol|username/);
    await assert.rejects(jobs.createJob(request({ modelUrl })), /URL|HTTPS|protocol|username/);
  }
  for (const extra of [{projectName:"x".repeat(101)}, {notes:"x".repeat(501)}, {purpose:"Forged"}, {infill:101}, {infill:3.5}, {layerHeight:"anything"}, {modelUrl:"https://example.com/a", file:{name:"a.stl",sizeBytes:10}}]) await assert.rejects(jobs.createJob(request(extra)));
  assert.equal(JSON.parse(saved.get(key)).jobs.length, 0);
});
test("filename-only requests are refused; legacy filename-only jobs stay readable", async () => {
  await assert.rejects(jobs.createJob(request({ modelUrl:"", file:{name:"a.stl",sizeBytes:10} })), /filename alone/);
  const job = await jobs.createJob(request());
  const data = JSON.parse(saved.get(key)); delete data.jobs[0].modelUrl; data.jobs[0].fileName = "legacy.stl"; data.jobs[0].attachments = []; saved.set(key,JSON.stringify(data));
  assert.equal((await jobs.getMyJob(job.id)).fileName,"legacy.stl");
});
test("corrupt records do not replace good records or overwrite their raw data", async () => {
  const valid = await jobs.createJob(request());
  const data = JSON.parse(saved.get(key)); data.jobs.push({id:"broken",status:"invalid"}); data.jobs[0].history.push({invalid:"unreadable history event"}); const raw = JSON.stringify(data); saved.set(key,raw);
  assert.deepEqual((await jobs.listMyJobs()).map(j=>j.id),[valid.id]);
  assert.equal(saved.get(key),raw); assert.equal(JSON.parse(diagnostics.exportData()).rawRecords[key],raw); assert.equal(diagnostics.getStatus().writesBlocked,true);
  await assert.rejects(jobs.createJob(request()), /recovery/); assert.equal(saved.get(key),raw);
});
test("malformed JSON, unreadable storage and future schemas fail safely without writing seeds", async () => {
  for (const raw of ["{bad json", JSON.stringify({...blank(),schemaVersion:900})]) {
    saved.set(key,raw); await jobs.listMyJobs(); assert.equal(saved.get(key),raw); assert.equal(diagnostics.getStatus().writesBlocked,true);
  }
  const get = localStorage.getItem; localStorage.getItem = () => {throw new Error("blocked")};
  try { assert.deepEqual(await jobs.listMyJobs(),[]); assert.ok(diagnostics.getStatus().issues.length); }
  finally {localStorage.getItem=get;}
});
test("migration versions and exact pre-migration snapshot preserve legacy records and fields", async () => {
  const raw = JSON.stringify({...blank(), customField:{keep:true},inventory:[{...item, quantity:12}]}); saved.set(key,raw);
  await inventory.listInventory(); const data = JSON.parse(saved.get(key));
  assert.equal(data.schemaVersion,4); assert.deepEqual(data.customField,{keep:true}); assert.equal(data.inventory[0].quantity,12);
  assert.equal(saved.get(`${key}-before-schema-4`),raw);
});
test("owner-scoped drafts and reset isolate accounts and preserve unscoped legacy drafts until explicit reset", async () => {
  saved.set("three-d-print-farm-draft-v2",JSON.stringify({projectName:"Unknown legacy owner"}));
  assert.equal(jobs.getDraft(),null); jobs.saveDraft({projectName:"Owner one"});
  auth.switchRole("demo-person-02"); assert.equal(jobs.getDraft(),null); jobs.saveDraft({projectName:"Owner two"});
  auth.switchRole("demo-person-01"); assert.equal(jobs.getDraft().projectName,"Owner one");
  await resetLocalData(); assert.ok([...saved.keys()].every(k=>!k.startsWith("three-d-print-farm-draft-v2")));
});
test("draft restoration cannot import another session's files, previews, submission or arbitrary state", () => {
  const wizard = restoreWizard({projectName:"My draft", modelFile:{secret:true}, file:{name:"other.stl"}, submittedJob:{id:"private"}, submitting:true, step:4, submissionKey:"old-key"});
  assert.equal(wizard.projectName,"My draft"); assert.equal(wizard.file,null); assert.equal(wizard.modelFile,null); assert.equal(wizard.step,1); assert.equal(wizard.submitting,false); assert.notEqual(wizard.submissionKey,"old-key"); assert.notEqual(freshWizard().submissionKey,freshWizard().submissionKey);
});
test("Level 1 can read its rejection inbox and open its own request while staff actions stay denied", async () => {
  const job = await jobs.createJob(request()); auth.switchRole("demo-person-04"); await jobs.reviewRequest(job.id,"rejected","Synthetic rejection reason"); auth.switchRole("demo-person-01");
  assert.match(toolbarControls(),/inbox-picker/); const entries = await inbox.list(); assert.equal(entries.length,1); assert.equal(entries[0].kind,"request-decision");
  assert.equal((await inbox.open(entries[0].id)).jobId,job.id); assert.equal((await jobs.getMyJob(job.id)).status,"REJECTED");
  await assert.rejects(jobs.claimJob(job.id),{code:"permission_denied"});
  auth.switchRole("demo-person-02"); assert.equal(await jobs.getJob(job.id),null); assert.deepEqual(await inbox.list(),[]);
});
test("a deleted stable filament ID never resolves to a replacement with the same material and colour", async () => {
  const state = {menuOpen:false,wizard:{...freshWizard(),inventoryId:item.id,material:item.material,color:item.color}};
  saved.set(key,JSON.stringify({...blank(),inventory:[{...item,id:"replacement-id"}]}));
  await getStartedPage(state); assert.equal(state.wizard.inventoryId,""); assert.match(state.wizard.selectionError,/no longer available/);
  await assert.rejects(jobs.createJob(request()), /no longer available/);
});
test("saved jobs keep the original filament ID and request-time snapshot after inventory edits", async () => {
  const job = await jobs.createJob(request()); auth.switchRole("demo-person-03"); await inventory.update(item.id,{color:"Renamed",hexColor:"#123456"}); await inventory.remove(item.id);
  const data = JSON.parse(saved.get(key)).jobs.find(j=>j.id===job.id); assert.equal(data.inventoryId,item.id); assert.deepEqual(data.filamentSnapshot,{id:item.id,material:"PLA",color:"Gray",hexColor:"#808080"});
});
test("creation retries deduplicate by owner and key and reject changed payloads", async () => {
  const payload=request(); const a=await jobs.createJob(payload), b=await jobs.createJob(payload); assert.equal(a.id,b.id); assert.equal(JSON.parse(saved.get(key)).jobs.length,1);
  await assert.rejects(jobs.createJob({...payload,projectName:"Changed"}),{code:"conflict"});
});
test("complete staff list searches and paginates old jobs, respecting review visibility", async () => {
  const original=await jobs.createJob(request()); const data=JSON.parse(saved.get(key));
  data.jobs=Array.from({length:47},(_,n)=>({...original,id:`old-${n}`,projectName:`Archived ${n}`,status:"COLLECTED",initialApproval:{legacy:true},submittedAt:new Date(2020,0,n+1).toISOString()})); saved.set(key,JSON.stringify(data)); auth.switchRole("demo-person-02");
  const last=await jobs.listPage({page:3,pageSize:20,sort:"oldest"}); assert.equal(last.total,47); assert.equal(last.items.length,7); assert.equal(last.items.at(-1).id,"old-46");
  assert.equal((await jobs.listPage({search:"Archived 46"})).total,1); assert.match(await staffJobsPage({page:3,sort:"oldest"}),/Archived 46/);
});
test("malformed and suffix routes return a safe not-found page", () => {
  for (const hash of ["#/section/%", "#/staff/jobs/%E0%A4%A", "#/staff/jobs/id/extra", "#/staff/jobs/%2F", "#/missing", "#/section/faq/extra"]) assert.equal(parseRoute(hash).page,"not-found");
  assert.deepEqual(parseRoute("#/staff/jobs?search=old"),{page:"jobs"}); assert.deepEqual(parseRoute("#/my-jobs/safe%20id"),{page:"my-job",id:"safe id"});
});
test("failed draft/account writes report failure instead of pretending to save", () => {
  const set=localStorage.setItem; localStorage.setItem=()=>{throw new Error("quota")};
  try { assert.throws(()=>jobs.saveDraft({projectName:"Unsaved"}),/could not be saved/); assert.throws(()=>auth.createDemoAccount({name:"Unsaved account",roleId:"regular_teacher"}),/could not save/); assert.ok(!auth.getDemoIdentities().some(p=>p.name==="Unsaved account")); }
  finally {localStorage.setItem=set;}
});
