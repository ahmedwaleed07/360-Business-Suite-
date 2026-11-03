import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {INTRO_DURATION_MS,PREVIEW_SESSION_KEY,entryRoute,isSavedPreviewSession,savePreviewSession,clearPreviewSession} from "../assets/brand-gate-core.mjs";

test("Splash exactly six seconds",()=>{assert.equal(INTRO_DURATION_MS,6000)});
test("A saved preview visit bypasses the intro; guest sees the intro",()=>{
 assert.equal(entryRoute({hasSavedPreviewSession:false}),"intro");
 assert.equal(entryRoute({hasSavedPreviewSession:true}),"workspace");
 assert.equal(entryRoute({hasVerifiedServerSession:true}),"workspace");
});
test("Preview-session helper stores and clears a non-authentication marker",()=>{
 const memory=new Map();
 const storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 assert.equal(isSavedPreviewSession(storage),false);
 assert.equal(savePreviewSession(storage),true);
 assert.equal(memory.get(PREVIEW_SESSION_KEY),"active");
 assert.equal(isSavedPreviewSession(storage),true);
 clearPreviewSession(storage);
 assert.equal(isSavedPreviewSession(storage),false);
});
test("Denied browser storage cannot break the gate's saved-state helper",()=>{
 const bad={getItem(){throw Error("blocked")},setItem(){throw Error("blocked")},removeItem(){throw Error("blocked")}};
 assert.equal(isSavedPreviewSession(bad),false);
 assert.equal(savePreviewSession(bad),false);
 assert.doesNotThrow(()=>clearPreviewSession(bad));
});
test("Both pages have branded intro, Skip, demo-entry and logout controls",()=>{
 for(const name of ["index.html","projects.html"]){
  const content=readFileSync(fileURLToPath(new URL("../"+name,import.meta.url)),"utf8");
  for(const marker of ["suiteIntro","suiteSkip","suiteEntry","suiteEnter","suiteLogout","brand-gate.js","brand-theme.css","360-infinity.svg","asas360-original-logo.png"])
   assert.match(content,new RegExp(marker),name+" missing "+marker);
 }
});
test("Visual identity uses light base, purple and cyan, and six-second CSS animations",()=>{
 const css=readFileSync(fileURLToPath(new URL("../assets/brand-theme.css",import.meta.url)),"utf8");
 assert.match(css,/color-scheme:light/);
 assert.match(css,/#fff/);
 assert.match(css,/#7826c8/);
 assert.match(css,/#28bae9/);
 assert.match(css,/animation:suiteTraceDraw 6s/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test("No real authentication is claimed in the public preview",()=>{
 const js=readFileSync(fileURLToPath(new URL("../assets/brand-gate.js",import.meta.url)),"utf8");
 assert.match(js,/hasVerifiedServerSession:false/);
 assert.match(js,/preview/i);
});
