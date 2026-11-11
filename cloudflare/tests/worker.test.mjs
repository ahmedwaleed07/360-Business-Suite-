import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign,webcrypto} from "node:crypto";
import app,{validateAccessToken} from "../src/index.js";
const base="https://example.com";
const config={ACCESS_TEAM_DOMAIN:"https://tenant.cloudflareaccess.com",ACCESS_AUD:"aud-test"};
function req(path,options={}){return new Request(base+path,options)}
async function body(res){return await res.json()}
function b64(v){return Buffer.from(typeof v==="string"?v:JSON.stringify(v)).toString("base64url")}
const pair=generateKeyPairSync("rsa",{modulusLength:2048});
const jwk=pair.publicKey.export({format:"jwk"});jwk.kid="test-key";jwk.alg="RS256";jwk.use="sig";
const now=Math.floor(Date.now()/1000);
function jwt(claims={},tamper=false){
 const h=b64({alg:"RS256",kid:"test-key",typ:"JWT"});
 const p=b64({iss:config.ACCESS_TEAM_DOMAIN,aud:[config.ACCESS_AUD],sub:"user-1",iat:now,exp:now+1800,...claims});
 const data=h+"."+p;
 const sig=sign("RSA-SHA256",Buffer.from(data),pair.privateKey).toString("base64url");
 return data+"."+(tamper?"invalidsignature":sig);
}
const certs=async()=>new Response(JSON.stringify({keys:[jwk]}),{headers:{"content-type":"application/json"}});
test("Cloudflare Access RS256 token valid, tamper, audience and expiry rejected",async()=>{
 const cfg={issuer:config.ACCESS_TEAM_DOMAIN,aud:config.ACCESS_AUD};
 assert.deepEqual(await validateAccessToken(jwt(),cfg,certs),{userId:"user-1"});
 for(const token of [jwt({},true),jwt({aud:["wrong"]}),jwt({exp:now-10}),jwt({iss:"https://other.cloudflareaccess.com"}),"abc"])
   assert.equal(await validateAccessToken(token,cfg,certs),null);
});
test("Public health and ASAS ad fallback remain available",async()=>{
 assert.equal((await app.fetch(req("/health"),{})).status,200);
 const data=await body(await app.fetch(req("/public/ads"),{}));
 assert.equal(data.advertisements[0].house_ad,true);
});
test("Protected API never opens without Access configuration",async()=>{
 const res=await app.fetch(req("/api/organizations/org1/crm/accounts"),{});
 assert.equal(res.status,503);
 assert.equal((await body(res)).error,"identity_provider_not_configured");
});
test("Fake or absent identity cannot access protected routes",async()=>{
 const url="/api/organizations/org1/crm/accounts";
 assert.equal((await app.fetch(req(url),config)).status,401);
 assert.equal((await app.fetch(req(url,{headers:{"Cf-Access-Jwt-Assertion":"not.a.jwt"}}),config)).status,401);
});
test("Paid ads are capped in API query and ASAS house ad remains fallback",async()=>{
 let query="";
 const mock={DB:{prepare(sql){query=sql;return {bind(){return {all:async()=>({results:Array.from({length:5},(_,i)=>({id:"ad"+i,advertiser_name:"Demo",headline:"Headline",subtitle:"",format:"motion",destination_url:null}))})}}}}}};
 const ads=await body(await app.fetch(req("/public/ads"),mock));
 assert.equal(ads.advertisements.length,5);
 assert.equal(ads.fallback,false);
 assert.match(query,/LIMIT 5/);
});
test("When ad storage fails, house ad is still shown",async()=>{
 const mock={DB:{prepare(){throw Error("simulated D1 outage")}}};
 const data=await body(await app.fetch(req("/public/ads"),mock));
 assert.equal(data.fallback,true);
});

test("Verified users still cannot access organizations without an active membership",async()=>{
 const saved=globalThis.fetch;
 globalThis.fetch=certs;
 const sqlSeen=[];
 const db={prepare(sql){sqlSeen.push(sql);return {bind(...args){return {first:async()=>null}}}}};
 try {
  const r=await app.fetch(req("/api/organizations/other-company/crm/accounts",{headers:{"Cf-Access-Jwt-Assertion":jwt()}}),{...config,DB:db});
  assert.equal(r.status,404);
  assert.ok(sqlSeen[0].includes("organization_id=?"));
  assert.ok(sqlSeen[0].includes("user_id=?"));
 }finally{globalThis.fetch=saved}
});
test("Sales role can only list accounts owned by the verified identity",async()=>{
 const saved=globalThis.fetch;globalThis.fetch=certs;
 const sqlSeen=[],bindSeen=[];
 const db={prepare(sql){sqlSeen.push(sql);return {bind(...args){bindSeen.push(args);return {
  first:async()=>({role:"sales"}),
  all:async()=>({results:[{id:"1",name:"Assigned",stage:"lead",owner_user_id:"user-1",created_at:"2026-11-02"}]})
 }}}}};
 try {
  const r=await app.fetch(req("/api/organizations/org1/crm/accounts",{headers:{"Cf-Access-Jwt-Assertion":jwt()}}),{...config,DB:db});
  assert.equal(r.status,200);
  assert.equal((await body(r)).accounts.length,1);
  assert.match(sqlSeen[1],/organization_id=\? AND owner_user_id=\?/);
  assert.deepEqual(bindSeen[1],["org1","user-1"]);
 }finally{globalThis.fetch=saved}
});
test("Viewer cannot create CRM accounts, even when claiming an admin role in request body",async()=>{
 const saved=globalThis.fetch;globalThis.fetch=certs;
 const db={prepare(){return {bind(){return {first:async()=>({role:"viewer"})}}}}};
 try {
  const r=await app.fetch(req("/api/organizations/org1/crm/accounts",{method:"POST",headers:{"Cf-Access-Jwt-Assertion":jwt(),"Content-Type":"application/json"},body:JSON.stringify({name:"Spoof",role:"owner"})}),{...config,DB:db});
  assert.equal(r.status,403);
 }finally{globalThis.fetch=saved}
});
test("Authorized sales creation is scoped and audit logged using one D1 batch",async()=>{
 const saved=globalThis.fetch;globalThis.fetch=certs;
 const prepared=[],batches=[];
 const db={prepare(sql){return {bind(...args){prepared.push({sql,args});return {first:async()=>({role:"sales"})}}}},batch:async statements=>{batches.push(statements);return []}};
 try {
  const r=await app.fetch(req("/api/organizations/org1/crm/accounts",{method:"POST",headers:{"Cf-Access-Jwt-Assertion":jwt(),"Content-Type":"application/json"},body:JSON.stringify({name:"New Account",stage:"lead",owner_user_id:"another-user"})}),{...config,DB:db});
  assert.equal(r.status,201);
  const payload=await body(r);
  assert.equal(payload.owner_user_id,"user-1");
  assert.equal(batches.length,1);
  assert.equal(batches[0].length,2);
  const account=prepared.find(p=>p.sql.startsWith("INSERT INTO crm_accounts"));
  assert.equal(account.args[1],"org1");
  assert.equal(account.args[4],"user-1");
  assert.ok(prepared.some(p=>p.sql.startsWith("INSERT INTO audit_events")));
 }finally{globalThis.fetch=saved}
});

test("Pilot UI and organization discovery require a verified Access session",async()=>{
 for(const path of ["/pilot/","/pilot/clients.js","/api/organizations"]){
  assert.equal((await app.fetch(req(path),{})).status,503);
  assert.equal((await app.fetch(req(path),config)).status,401);
 }
 const saved=globalThis.fetch;
 globalThis.fetch=certs;
 try {
  const headers={"Cf-Access-Jwt-Assertion":jwt()};
  const page=await app.fetch(req("/pilot/",{headers}),config);
  assert.equal(page.status,200);
  assert.match(page.headers.get("Content-Security-Policy"),/frame-ancestors 'none'/);
  assert.match(await page.text(),/BUSINESS SUITE/);
  const script=await app.fetch(req("/pilot/clients.js",{headers}),config);
  assert.equal(script.status,200);
  const src=await script.text();
  assert.doesNotThrow(()=>new Function(src));
  const organizations=[{id:"org1",name:"Company",role:"viewer"}];
  const db={prepare(sql){
   assert.match(sql,/m.user_id=\? AND m.status='active' AND o.status='active'/);
   return {bind(userId){
    assert.equal(userId,"user-1");
    return {all:async()=>({results:organizations})};
   }};
  }};
  const result=await app.fetch(req("/api/organizations",{headers}),{...config,DB:db});
  assert.deepEqual(await result.json(),{organizations});
 }finally{globalThis.fetch=saved}
});

test("Accounting reads only the configured company after checking active membership",async()=>{
 const saved=globalThis.fetch;
 const erp={ERP_ORIGIN:"https://erp.example.com",ERP_TOKEN:"test-key:test-secret",ERP_COMPANY:"Pilot Co",ERP_ORGANIZATION_ID:"org1"};
 let role="viewer";
 let ledgerCompany="Pilot Co";
 let calls=0;
 globalThis.fetch=async(input, options)=>{
  if(String(input).includes("/cdn-cgi/access/certs"))return certs();
  calls++;
  const url=new URL(input);
  assert.equal(url.pathname,"/api/resource/GL%20Entry");
  assert.deepEqual(JSON.parse(url.searchParams.get("filters")),[["company","=","Pilot Co"],["is_cancelled","=",0]]);
  assert.equal(url.searchParams.get("limit_start"),"50");
  assert.equal(options.redirect,"error");
  assert.equal(options.headers.Authorization,"token test-key:test-secret");
  return Response.json({data:[{company:ledgerCompany,debit:15,credit:0}]});
 };
 const DB={prepare(){return {bind(){return {first:async()=>({role})}}}}};
 const run=(org,options={})=>app.fetch(req("/api/organizations/"+org+"/accounting/ledger?offset=50",{
  headers:{"Cf-Access-Jwt-Assertion":jwt()},...options
 }),{...config,DB,...erp});
 try {
  assert.equal((await run("org1")).status,404);
  role="owner";
  assert.equal((await run("org2")).status,404);
  assert.equal((await run("org1",{method:"POST"})).status,405);
  assert.equal(calls,0);
  const res=await run("org1");
  assert.equal(res.status,200);
  const result=await res.json();
  assert.deepEqual(result.rows,[["","","","",15,0]]);
  assert.equal(result.workspaceUrl,"https://erp.example.com/app/accounting");
  ledgerCompany="Different Company";
  assert.equal((await run("org1")).status,502);
 } finally {
  globalThis.fetch=saved;
 }
});

test("CRM link is verified against a submitted ERP document and scopes customer receipts",async()=>{
 const saved=globalThis.fetch;
 const erp={ERP_ORIGIN:"https://erp.example.com",ERP_TOKEN:"fake",ERP_COMPANY:"Pilot Co",ERP_ORGANIZATION_ID:"org1"};
 let customer;
 let documentStatus=0;
 let insertCount=0;
 let wrongParty=false;
 globalThis.fetch=async input=>{
  const url=new URL(input);
  if(url.pathname==="/cdn-cgi/access/certs")return certs();
  const filters=JSON.parse(url.searchParams.get("filters"));
  if(url.pathname==="/api/resource/Sales%20Order"){
   assert.deepEqual(filters,[["company","=","Pilot Co"],["name","=","SO-1"],["docstatus","=",1]]);
   return Response.json({data:[{company:"Pilot Co",name:"SO-1",customer:"CUST-1",docstatus:documentStatus}]});
  }
  assert.equal(url.pathname,"/api/resource/Payment%20Entry");
  assert.deepEqual(filters,[["company","=","Pilot Co"],["party_type","=","Customer"],["party","=","CUST-1"]]);
  return Response.json({data:[{company:"Pilot Co",party_type:"Customer",party:wrongParty?"OTHER":"CUST-1"}]});
 };
 const DB={prepare(sql){return {bind(...args){return {
  first:async()=>sql.includes("SELECT erp_customer")?(customer?{erp_customer:customer}:null):{role:"admin"},
  run:async()=>{
   assert.match(sql,/m.status='active'/);
   assert.deepEqual(args,["CUST-1","user-1","org1","crm-1"]);
   insertCount++;
   customer=args[0];
  }
 }}}}};
 const headers={"Cf-Access-Jwt-Assertion":jwt(),Origin:base};
 const env={...config,DB,...erp};
 const link=()=>app.fetch(req("/api/organizations/org1/crm/accounts/crm-1/erp-link",{
  method:"POST",headers,body:JSON.stringify({source:"orders",documentId:"SO-1"})
 }),env);
 const receipts=()=>app.fetch(req("/api/organizations/org1/accounting/payments?crmAccount=crm-1",{headers}),env);
 try {
  assert.equal((await receipts()).status,404);
  assert.equal((await link()).status,404);
  assert.equal(insertCount,0);
  documentStatus=1;
  assert.equal((await link()).status,200);
  assert.equal(insertCount,1);
  assert.equal((await receipts()).status,200);
  wrongParty=true;
  assert.equal((await receipts()).status,502);
 } finally {
  globalThis.fetch=saved;
 }
});
