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
