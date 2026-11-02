import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

test("public health endpoint is marked scaffold / not ready", async () => {
 const res=await worker.fetch(new Request("https://example.com/health"),{});
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.production_ready,false);
});
test("house ad always shows when no D1 binding exists",async()=>{
 const res=await worker.fetch(new Request("https://example.com/public/ads"),{});
 const body=await res.json();
 assert.equal(body.fallback,true);
 assert.equal(body.advertisements[0].house_ad,true);
});
test("at most five paid ads exposed to clients",async()=>{
 let sql="";
 const mock={DB:{prepare(q){sql=q;return {bind(){return {all:async()=>({results:Array.from({length:5},(_,i)=>({id:String(i),advertiser_name:"Business",headline:"Ad "+i,subtitle:"",format:"motion",destination_url:null}))})}}}}}};
 const res=await worker.fetch(new Request("https://example.com/public/ads"),mock);
 const body=await res.json();
 assert.match(sql,/LIMIT 5/);
 assert.equal(body.advertisements.length,5);
 assert.equal(body.fallback,false);
});
test("D1 errors still show house ad",async()=>{
 const mock={DB:{prepare(){throw Error("mock unavailable")}}};
 const body=await (await worker.fetch(new Request("https://example.com/public/ads"),mock)).json();
 assert.equal(body.advertisements[0].house_ad,true);
});
test("protected API is closed before auth is implemented",async()=>{
 for(const path of ["/api/crm/accounts","/api/users","/api/organizations","/api/ads/admin"]){
  const res=await worker.fetch(new Request("https://example.com"+path),{});
  assert.equal(res.status,503,path);
 }
});
test("other endpoint is not found",async()=>{
 assert.equal((await worker.fetch(new Request("https://example.com/secret"),{})).status,404);
});
