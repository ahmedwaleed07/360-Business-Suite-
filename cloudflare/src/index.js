import { pilotPage, pilotScript } from "./pilot.js";
import { accountingPage, accountingScript, erpSettings, readAccounting, resolveErpCustomer } from "./accounting.js";

// ASAS 360° Business Suite – Cloudflare-first staging API.
// Production authorization must be configured with a valid Cloudflare Access
// application, and the SaaS customer-login system is a separate deliverable.
// Protected endpoints fail closed whenever Access is not configured.
const HOUSE_AD = Object.freeze({
  id: "asas-house", advertiser_name: "ASAS 360°",
  headline: "Your Business. Our Vision.",
  subtitle: "CRM • ERP • Integrated Business Solutions",
  format: "motion", destination_url: "https://asas360.com",
  duration_seconds: 15, house_ad: true
});
const noCache = {"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
function json(data,status=200,extra={}) {
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...noCache,...extra}});
}
function cors(request,env) {
  const origin=request.headers.get("Origin");
  const allowed=typeof env?.PUBLIC_PREVIEW_ORIGIN==="string" ? env.PUBLIC_PREVIEW_ORIGIN : "";
  if (!origin || !allowed || origin!==allowed) return {};
  return {"Access-Control-Allow-Origin":origin,"Vary":"Origin"};
}
function decodePart(part) {
  if(typeof part!=="string" || part.length>20000 || !/^[A-Za-z0-9_-]+$/.test(part)) throw new Error("invalid token");
  const base64=part.replace(/-/g,"+").replace(/_/g,"/");
  const decoded=atob(base64.padEnd(Math.ceil(base64.length/4)*4,"="));
  return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}
function parsedJson(bytes) {
  return JSON.parse(new TextDecoder().decode(bytes));
}
function accessConfig(env) {
  const domain=env?.ACCESS_TEAM_DOMAIN;
  const aud=env?.ACCESS_AUD;
  if(typeof domain!=="string"||typeof aud!=="string"||!aud.trim())return null;
  try {
    const u=new URL(domain);
    if(u.protocol!=="https:"||u.username||u.password||u.pathname!=="/"||u.search||u.hash||!u.hostname.endsWith(".cloudflareaccess.com"))return null;
    return {issuer:u.origin,aud};
  }catch{return null}
}
export async function validateAccessToken(token,config,fetcher=fetch) {
  if(typeof token!=="string"||token.length>20000)return null;
  const parts=token.split(".");
  if(parts.length!==3)return null;
  try {
    const header=parsedJson(decodePart(parts[0]));
    const payload=parsedJson(decodePart(parts[1]));
    if(header.alg!=="RS256"||!header.kid||typeof header.kid!=="string"||header.kid.length>256)return null;
    const now=Math.floor(Date.now()/1000);
    const audience=Array.isArray(payload.aud)?payload.aud:[payload.aud];
    if(payload.iss!==config.issuer||!audience.includes(config.aud)||typeof payload.sub!=="string"||!payload.sub||payload.sub.length>256)return null;
    if(!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(payload.iat)||payload.iat>now+60)return null;
    if(payload.nbf!==undefined&&(!Number.isFinite(payload.nbf)||payload.nbf>now))return null;
    const r=await fetcher(config.issuer+"/cdn-cgi/access/certs",{redirect:"error"});
    if(!r.ok)return null;
    const certs=await r.json();
    const key=(certs.keys||[]).find(k=>k.kid===header.kid&&k.kty==="RSA"&&(!k.alg||k.alg==="RS256")&&(!k.use||k.use==="sig"));
    if(!key)return null;
    const publicKey=await crypto.subtle.importKey("jwk",key,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",publicKey,decodePart(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
    return valid?{userId:payload.sub}:null;
  }catch{return null}
}
async function accessPrincipal(request,env) {
  const config=accessConfig(env);
  if(!config)return {error:json({error:"identity_provider_not_configured"},503)};
  const jwt=request.headers.get("Cf-Access-Jwt-Assertion");
  if(!jwt)return {error:json({error:"not_authenticated"},401)};
  const principal=await validateAccessToken(jwt,config);
  if(!principal)return {error:json({error:"invalid_session"},401)};
  return {principal};
}
async function requireMembership(db,orgId,userId) {
  return db.prepare(`SELECT m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id
    WHERE m.organization_id=? AND m.user_id=? AND m.status='active' AND o.status='active'`)
    .bind(orgId,userId).first();
}
async function listOrganizations(env,principal) {
  if(!env.DB)return json({error:"database_not_bound"},503);
  const result=await env.DB.prepare(`SELECT o.id,o.name,m.role FROM memberships m
    JOIN organizations o ON o.id=m.organization_id
    WHERE m.user_id=? AND m.status='active' AND o.status='active' ORDER BY o.name,o.id`)
    .bind(principal.userId).all();
  return json({organizations:result.results});
}
const validOrg=/^[a-zA-Z0-9_-]{1,64}$/;
const validStages=new Set(["lead","qualified","proposal","negotiation","won","lost"]);
function leadRow(row) {
  return {id:row.id,name:row.name,stage:row.stage,owner_user_id:row.owner_user_id,created_at:row.created_at};
}
async function crmRoute(request,env,orgId,principal) {
  if(!env.DB)return json({error:"database_not_bound"},503);
  if(!validOrg.test(orgId))return json({error:"not_found"},404);
  const membership=await requireMembership(env.DB,orgId,principal.userId);
  if(!membership)return json({error:"not_found"},404);
  const canSeeAll=["owner","admin","manager","viewer"].includes(membership.role);
  const canAdd=["owner","admin","manager","sales"].includes(membership.role);
  if(request.method==="GET") {
    const statement=canSeeAll
      ?env.DB.prepare("SELECT id,name,stage,owner_user_id,created_at FROM crm_accounts WHERE organization_id=? ORDER BY created_at DESC LIMIT 100").bind(orgId)
      :env.DB.prepare("SELECT id,name,stage,owner_user_id,created_at FROM crm_accounts WHERE organization_id=? AND owner_user_id=? ORDER BY created_at DESC LIMIT 100").bind(orgId,principal.userId);
    const result=await statement.all();
    return json({accounts:(result.results||[]).map(leadRow)});
  }
  if(request.method==="POST") {
    if(!canAdd)return json({error:"forbidden"},403);
    const type=request.headers.get("Content-Type")||"";
    if(!type.toLowerCase().startsWith("application/json"))return json({error:"json_required"},415);
    const length=Number(request.headers.get("Content-Length")||"0");
    if(length>8192)return json({error:"request_too_large"},413);
    let payload;try{const body=await request.text();if(body.length>8192)return json({error:"request_too_large"},413);payload=JSON.parse(body)}catch{return json({error:"invalid_json"},400)}
    if(!payload||Array.isArray(payload)||typeof payload!=="object")return json({error:"invalid_payload"},400);
    const name=typeof payload.name==="string"?payload.name.trim():"";
    const stage=payload.stage===undefined?"lead":payload.stage;
    if(!name||name.length>180||!validStages.has(stage))return json({error:"invalid_fields"},400);
    const id=crypto.randomUUID(),auditId=crypto.randomUUID();
    const time=new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO crm_accounts(id,organization_id,name,stage,owner_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(id,orgId,name,stage,principal.userId,time,time),
      env.DB.prepare("INSERT INTO audit_events(id,organization_id,actor_user_id,event_type,target_type,target_id,created_at) VALUES (?,?,?,?,?,?,?)").bind(auditId,orgId,principal.userId,"crm.account.created","crm_account",id,time)
    ]);
    return json({id,name,stage,owner_user_id:principal.userId,created_at:time},201);
  }
  return json({error:"method_not_allowed"},405,{"Allow":"GET, POST"});
}
async function accountingRoute(request,env,orgId,view,principal) {
  if(request.method!=="GET")return json({error:"method_not_allowed"},405,{"Allow":"GET"});
  if(!env.DB)return json({error:"database_not_bound"},503);
  const membership=await requireMembership(env.DB,orgId,principal.userId);
  if(!membership||!["owner","admin"].includes(membership.role))return json({error:"not_found"},404);
  const settings=erpSettings(env);
  if(!settings)return json({error:"erp_not_configured"},503);
  if(settings.organizationId!==orgId)return json({error:"not_found"},404);
  const params=new URL(request.url).searchParams;
  const raw=params.get("offset")??"0";
  if(!/^\d{1,9}$/.test(raw)||Number(raw)%50!==0)return json({error:"invalid_offset"},400);
  const accountId=params.get("crmAccount");
  let customer=null;
  if(accountId!==null) {
    const link=await env.DB.prepare("SELECT erp_customer FROM crm_erp_customer_links WHERE organization_id=? AND crm_account_id=?")
      .bind(orgId,accountId).first();
    if(!link)return json({error:"crm_account_not_linked"},404);
    customer=link.erp_customer;
  }
  try {
    return json(await readAccounting(settings,view,Number(raw),fetch,customer));
  } catch(error) {
    if(error instanceof RangeError&&error.message==="unknown_view")return json({error:"not_found"},404);
    return json({error:"erp_unavailable"},502);
  }
}

async function customerLinkRoute(request,env,orgId,accountId,principal) {
  if(request.method!=="POST")return json({error:"method_not_allowed"},405,{"Allow":"POST"});
  if(request.headers.get("Origin")!==new URL(request.url).origin)return json({error:"invalid_origin"},403);
  if(!env.DB)return json({error:"database_not_bound"},503);
  const membership=await requireMembership(env.DB,orgId,principal.userId);
  if(!membership||!["owner","admin"].includes(membership.role))return json({error:"not_found"},404);
  const settings=erpSettings(env);
  if(!settings)return json({error:"erp_not_configured"},503);
  if(settings.organizationId!==orgId)return json({error:"not_found"},404);
  let input;
  try {
    if(Number(request.headers.get("Content-Length"))>2048)return json({error:"request_too_large"},413);
    const raw=await request.text();
    if(raw.length>2048)return json({error:"request_too_large"},413);
    input=JSON.parse(raw);
  } catch {
    return json({error:"invalid_json"},400);
  }
  const documentId=typeof input?.documentId==="string"?input.documentId.trim():"";
  if(!documentId||documentId.length>140||!["orders","sales"].includes(input.source))return json({error:"invalid_fields"},400);
  let customer;
  try {
    customer=await resolveErpCustomer(settings,input.source,documentId);
  } catch {
    return json({error:"erp_unavailable"},502);
  }
  if(!customer)return json({error:"erp_document_not_found"},404);
  await env.DB.prepare(`INSERT INTO crm_erp_customer_links(organization_id,crm_account_id,erp_customer,linked_by)
    SELECT c.organization_id,c.id,?,m.user_id FROM crm_accounts c
    JOIN organizations o ON o.id=c.organization_id AND o.status='active'
    JOIN memberships m ON m.organization_id=c.organization_id AND m.user_id=? AND m.status='active' AND m.role IN ('owner','admin')
    WHERE c.organization_id=? AND c.id=? ON CONFLICT DO NOTHING`)
    .bind(customer,principal.userId,orgId,accountId).run();
  const link=await env.DB.prepare("SELECT erp_customer FROM crm_erp_customer_links WHERE organization_id=? AND crm_account_id=?")
    .bind(orgId,accountId).first();
  if(link?.erp_customer!==customer)return json({error:"crm_link_conflict"},409);
  return json({linked:true});
}

async function publicAds(env) {
  if(!env?.DB)return {advertisements:[HOUSE_AD],fallback:true};
  try {
    const now=new Date().toISOString();
    const r=await env.DB.prepare("SELECT id,advertiser_name,headline,subtitle,format,destination_url FROM ad_campaigns WHERE status='active' AND starts_at<=? AND ends_at>? ORDER BY created_at ASC LIMIT 5").bind(now,now).all();
    const ads=(r.results||[]).map(v=>({...v,house_ad:false}));
    return {advertisements:ads.length?ads:[HOUSE_AD],fallback:ads.length===0};
  }catch(e){console.error("Public ads query failed",e instanceof Error?e.message:"unknown");return {advertisements:[HOUSE_AD],fallback:true}}
}
export default {
  async fetch(request,env) {
    const path=new URL(request.url).pathname;
    if(request.method==="GET"&&path==="/health")return json({service:"asas-business-suite-api",status:"staging",production_ready:false});
    if(request.method==="OPTIONS"&&path==="/public/ads")return new Response(null,{status:204,headers:{...cors(request,env),"Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Cache-Control":"no-store"}});
    if(request.method==="GET"&&path==="/public/ads")return json(await publicAds(env),200,cors(request,env));
    if(path.startsWith("/pilot/")||path.startsWith("/api/")) {
      const auth=await accessPrincipal(request,env);
      if(auth.error)return auth.error;
      if(request.method==="GET"&&["/pilot/","/pilot/accounting"].includes(path))return new Response(path==="/pilot/"?pilotPage:accountingPage,{headers:{
        ...noCache,"Content-Type":"text/html; charset=utf-8",
        "Content-Security-Policy":"default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
      }});
      if(request.method==="GET"&&["/pilot/clients.js","/pilot/accounting.js"].includes(path))return new Response(path==="/pilot/clients.js"?pilotScript:accountingScript,{headers:{
        ...noCache,"Content-Type":"application/javascript; charset=utf-8"
      }});
      if(request.method==="GET"&&path==="/api/organizations")return listOrganizations(env,auth.principal);
      const accounting=path.match(/^\/api\/organizations\/([a-zA-Z0-9_-]{1,64})\/accounting\/([a-z]+)$/);
      if(accounting)return accountingRoute(request,env,accounting[1],accounting[2],auth.principal);
      const customerLink=path.match(/^\/api\/organizations\/([a-zA-Z0-9_-]{1,64})\/crm\/accounts\/([a-zA-Z0-9_-]{1,64})\/erp-link$/);
      if(customerLink)return customerLinkRoute(request,env,customerLink[1],customerLink[2],auth.principal);
      const match=path.match(/^\/api\/organizations\/([a-zA-Z0-9_-]{1,64})\/crm\/accounts$/);
      if(match)return crmRoute(request,env,match[1],auth.principal);
      return json({error:"not_found"},404);
    }
    return json({error:"not_found"},404);
  }
};
