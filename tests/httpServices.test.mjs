import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { createApiClient } from "../src/apiClient.js?v=2.2&rev=5";
import { createHttpSession } from "../src/httpSession.js";
import { createHttpServices } from "../src/httpServices.js";
import { createHttpFiles } from "../src/filesService.js?v=2.2&rev=5";
import { getPermissions, ROLES } from "../src/authorization.js?v=2.2&rev=5";
const response = (data,status=200) => new Response(JSON.stringify({data}),{status,headers:{"Content-Type":"application/json"}});
function sessionStub(roleId="print_farm_teacher") {
  let user={id:"synthetic-user",name:"Synthetic user",email:"synthetic@example.com",roleId};
  return {getState:()=>({status:user?"signed-in":"expired-session"}),getCurrentIdentity:()=>user,can:p=>getPermissions(roleId).has(p),subscribe:()=>()=>{},expire(){user=null;},load:async()=>{}};
}
const paginated = (items,total=items.length,page=1,pageSize=100)=>({items,total,page,pageSize});
const request = () => ({ submissionKey:crypto.randomUUID(), projectName:"HTTP bracket",modelUrl:"https://example.com/model.stl",material:"PLA",color:"Gray",inventoryId:"fil-1",notes:"Synthetic" });

test("HTTP errors have stable categories and never return a demo fallback", async () => {
  for (const [status,code] of [[400,"validation"],[401,"expired_session"],[403,"permission_denied"],[409,"conflict"],[412,"conflict"],[422,"validation"],[500,"server_error"]]) {
    let expired=false; const client=createApiClient({fetchImpl:async()=>new Response(JSON.stringify({error:{message:"Synthetic failure",fields:{name:"invalid"}}}),{status}),onExpired:()=>expired=true});
    await assert.rejects(client.request("/jobs"),error=>error.code===code&&error.status===status);
    assert.equal(expired,status===401);
  }
  const client=createApiClient({fetchImpl:async()=>{throw new TypeError("offline")}});
  await assert.rejects(client.request("/jobs"),{code:"network_error"});
});
test("HTTP timeout and malformed success responses fail explicitly", async () => {
  const timeout=createApiClient({timeoutMs:5,fetchImpl:(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener("abort",()=>reject(new Error("timeout"))))});
  await assert.rejects(timeout.request("/jobs"),{code:"network_error"});
  const invalid=createApiClient({fetchImpl:async()=>new Response('{"items":[]}')});
  await assert.rejects(invalid.request("/jobs"),{code:"invalid_response"});
});
test("session supports loading, signed-out, signed-in, expired-session and error without demo identity controls", async () => {
  let next={status:"signed-out"}; const seen=[];
  const session=createHttpSession({fetchImpl:async()=>response(next)}); session.subscribe(state=>seen.push(state.status));
  assert.equal(session.getState().status,"loading"); await session.load(); assert.equal(session.getState().status,"signed-out");
  next={status:"signed-in",user:{id:"backend-id",name:"Server user",email:"server@example.com",roleId:"regular_teacher"},permissions:["jobs.manage"],csrfToken:"memory-only-csrf"};
  await session.load(); assert.equal(session.getCurrentIdentity().id,"backend-id"); assert.equal(session.can("jobs.manage"),true); assert.equal(session.can("jobs.approve"),false); assert.equal(session.switchRole("print_farm_teacher"),false); assert.throws(()=>session.createDemoAccount({}),{code:"permission_denied"});
  session.expire(); assert.equal(session.getState().status,"expired-session"); assert.equal(session.can("jobs.manage"),false); assert.equal(session.getCurrentIdentity(),null);
  next={status:"signed-in",user:{id:"bad"}}; await session.load(); assert.equal(session.getState().status,"error");
  assert.ok(seen.includes("signed-in"));
});
test("server session failures and 401 clear previous identity and permissions", async () => {
  let status=200; let offline=false;
  const session=createHttpSession({fetchImpl:async()=>{if(offline)throw Error("offline");return status===200?response({status:"signed-in",user:{id:"qa",name:"QA",email:"qa@example.com",roleId:"print_farm_teacher"},permissions:["jobs.approve"],csrfToken:"csrf"}):new Response("{}",{status});}});
  await session.load(); status=401; await session.load(); assert.equal(session.getState().status,"expired-session"); assert.equal(session.getCurrentIdentity(),null);
  status=200; await session.load(); offline=true; await session.load(); assert.equal(session.getState().status,"error"); assert.equal(session.can("jobs.approve"),false);
});
test("API permissions are tested using synthetic sessions at every existing level", async () => {
  for(const roleId of Object.keys(ROLES)) {
    let writes=0; const client=createApiClient({fetchImpl:async(_url,init)=>{if(init.method!=="GET")writes++;return response({id:"job",version:2});}});
    const services=createHttpServices({session:sessionStub(roleId),client,files:{}});
    await services.jobsService.getJob("job");
    if(ROLES[roleId].level===4) await services.jobsService.reviewRequest("job","approved");
    else assert.throws(()=>services.jobsService.reviewRequest("job","approved"),{code:"permission_denied"});
    assert.equal(writes,ROLES[roleId].level===4?1:0);
  }
});
test("HTTP writes use cookie credentials, in-memory CSRF, idempotency keys and version preconditions", async () => {
  const calls=[]; const session=createHttpSession({fetchImpl:async(url,init)=>{calls.push({url,init});if(url.endsWith("/session"))return response({status:"signed-in",user:{id:"qa",name:"QA",email:"qa@example.com",roleId:"print_farm_teacher"},permissions:["jobs.manage"],csrfToken:"csrf-memory"});return response({id:"j1",version:init.method==="GET"?7:8});}});
  await session.load(); const services=createHttpServices({session,files:{}}); await services.jobsService.getJob("j1"); await services.jobsService.claimJob("j1");
  const write=calls.at(-1).init; assert.equal(write.credentials,"include"); assert.equal(write.headers["X-CSRF-Token"],"csrf-memory"); assert.equal(write.headers["If-Match"],'"7"'); assert.ok(write.headers["Idempotency-Key"]); assert.equal(write.headers.Authorization,undefined);
});
test("network retries reuse an idempotency key and duplicate concurrent mutations share one request", async () => {
  const writes=[]; let fail=true; const client=createApiClient({fetchImpl:async(_url,init)=>{if(init.method==="GET")return response({id:"j",version:1}); writes.push(init); if(fail)throw Error("offline"); await new Promise(r=>setTimeout(r,2)); return response({id:"j",version:2});}});
  const services=createHttpServices({session:sessionStub(),client,files:{}}); await services.jobsService.getJob("j");
  await assert.rejects(services.jobsService.claimJob("j"),{code:"network_error"}); fail=false;
  const [a,b]=await Promise.all([services.jobsService.claimJob("j"),services.jobsService.claimJob("j")]); assert.equal(a.id,b.id); assert.equal(writes.length,2); assert.equal(writes[0].headers["Idempotency-Key"],writes[1].headers["Idempotency-Key"]);
});
test("conflicts are surfaced and require another read before a fresh mutation", async () => {
  let version=1; const headers=[]; const client=createApiClient({fetchImpl:async(_url,init)=>{if(init.method==="GET")return response({id:"j",version});headers.push(init.headers["If-Match"]);return version===1?new Response("{}",{status:409}):response({id:"j",version:3});}});
  const services=createHttpServices({session:sessionStub(),client,files:{}}); await services.jobsService.getJob("j"); await assert.rejects(services.jobsService.claimJob("j"),{code:"conflict"});
  assert.throws(()=>services.jobsService.claimJob("j"),{code:"conflict"}); version=2; await services.jobsService.getJob("j"); await services.jobsService.claimJob("j"); assert.deepEqual(headers,['"1"','"2"']);
});
test("background reads cannot upgrade a previously reviewed version and allow overwriting stale forms", async () => {
  let version=1; let write; const client=createApiClient({fetchImpl:async(_url,init)=>{if(init.method==="GET")return response({id:"fil",version});write=init;return response({id:"fil",version:3});}});
  const services=createHttpServices({session:sessionStub(),client,files:{}}); await services.inventoryService.getItem("fil"); version=2; await services.inventoryService.listInventory().catch(()=>{}); await services.inventoryService.getItem("fil"); await services.inventoryService.update("fil",{color:"new"}); assert.equal(write.headers["If-Match"],'"1"');
});
test("all-page compatibility lists do not hide older jobs and filters are safely encoded", async () => {
  const calls=[]; const client=createApiClient({fetchImpl:async(url)=>{calls.push(url);const p=new URL(url).searchParams.get("page");return response(paginated([{id:p,version:1}],2,Number(p),100));}});
  const services=createHttpServices({session:sessionStub(),client,files:{}}); assert.equal((await services.jobsService.listJobs({search:"old & parts"})).length,2); assert.match(calls[0],/search=old\+%26\+parts/); assert.match(calls[1],/page=2/);
});
test("HTTP creation strips forged ownership and role fields, keeps stable keys, and never substitutes demo data", async () => {
  let body,headers; const client=createApiClient({fetchImpl:async(_url,init)=>{body=JSON.parse(init.body);headers=init.headers;return response({id:"server-job",version:1});}});
  const services=createHttpServices({session:sessionStub(),client,files:{verify:async()=>[]}}); const payload={...request(),submitterId:"forged",roleId:"print_farm_teacher",status:"AUTHORIZED"}; await services.jobsService.createJob(payload);
  assert.equal(headers["Idempotency-Key"],payload.submissionKey); assert.equal(body.submitterId,undefined); assert.equal(body.roleId,undefined); assert.equal(body.status,undefined); assert.equal(body.inventoryId,"fil-1");
});
test("uploads must be confirmed stored before creation; attachment bytes are checked on download", async () => {
  const file=new File(["solid test\nendsolid test"],"part.stl");
  const files=createHttpFiles(createApiClient({fetchImpl:async()=>response([{id:"a",name:file.name,sizeBytes:file.size,status:"processing"}])}));
  await assert.rejects(files.upload([file],{idempotencyKey:"upload-qa-key"}),{code:"invalid_response"});
  const downloads=createHttpFiles(createApiClient({fetchImpl:async url=>url.endsWith("/original")?new Response("wrong bytes"):response({id:"a",name:"a.stl",sizeBytes:50,status:"stored"})}));
  await assert.rejects(downloads.get("a"),{code:"invalid_response"});
});
test("API mode never accesses operational LocalStorage or imports demo adapters", () => {
  const output=execFileSync(process.execPath,["--input-type=module","-e",`globalThis.PRINT_FARM_CONFIG={MODE:'api'};globalThis.localStorage={getItem(){throw Error('LocalStorage touched')},setItem(){throw Error('LocalStorage touched')}};const s=await import('./src/services.js?v=2.2&rev=5');const a=(await import('./src/authService.js?v=2.2&rev=5')).authService;console.log(s.jobsService.mode,a.mode,a.getState().status);`],{cwd:new URL("..",import.meta.url),encoding:"utf8"});
  assert.equal(output.trim(),"api api loading");
});

test("accounting mutations send stable operation keys and balance versions through HTTP conflicts", async () => {
  const calls=[]; let conflict=true; const client=createApiClient({fetchImpl:async(url,init)=>{calls.push({url,init});if(init.method==="GET")return response({id:"staff/id",version:12,balanceCenti:150,requests:[],transactions:[]});if(conflict)return new Response("{}",{status:412});return response({contribution:{id:"c"},transaction:{id:"t"}});}});
  const services=createHttpServices({session:sessionStub(),client,files:{}});await services.hoursService.getStaffDetail("staff/id");
  const payload={hours:"1.5",activity:"QA assistance",date:"2026-01-01",submissionKey:"qa-accounting-fixed-key",expectedBalanceCenti:150};
  await assert.rejects(services.hoursService.giveHours("staff/id",payload),{code:"conflict"});conflict=false;await services.hoursService.getStaffDetail("staff/id");await services.hoursService.giveHours("staff/id",payload);
  const writes=calls.filter(c=>c.init.method==="POST");assert.equal(writes.length,2);for(const {url,init} of writes){assert.match(url,/staff%2Fid\/contributions$/);assert.equal(init.headers["If-Match"],'"12"');assert.equal(init.headers["Idempotency-Key"],payload.submissionKey);assert.equal(JSON.parse(init.body).expectedBalanceCenti,150);}
});

test("a failed original upload cannot produce a job request", async () => {
  let jobRequests=0;const client=createApiClient({fetchImpl:async()=>{jobRequests++;return response({id:"unexpected"});}});
  const services=createHttpServices({session:sessionStub(),client,files:{upload:async()=>{throw new Error("Upload rejected")},verify:async()=>[]}});
  const file=new File(["solid qa\nendsolid qa"],"qa.stl");const payload={...request(),modelUrl:"",modelFiles:[file],file:{name:file.name,sizeBytes:file.size}};
  await assert.rejects(services.jobsService.createJob(payload),/Upload rejected/);assert.equal(jobRequests,0);
});
