import { INTRO_DURATION_MS, entryRoute, isSavedPreviewSession, savePreviewSession, clearPreviewSession } from "./brand-gate-core.mjs";
const gate=document.getElementById("suiteGate");
const splash=document.getElementById("suiteIntro");
const entry=document.getElementById("suiteEntry");
const skip=document.getElementById("suiteSkip");
const enter=document.getElementById("suiteEnter");
const logout=document.getElementById("suiteLogout");
const replay=document.getElementById("suiteReplay");
let introTimer=null;
const root=document.documentElement;
let storage=null;try{storage=window.localStorage}catch{/* private browsing / disabled storage */}
const prefersReduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function showWorkspace(){
  clearTimeout(introTimer);
  root.classList.add("suite-ready");
  root.classList.remove("suite-gated");
  gate.hidden=true;
  splash.hidden=true;
  entry.hidden=true;
  document.body.classList.add("suite-demo-active");
}
function showEntry(){
  clearTimeout(introTimer);
  splash.hidden=true;
  entry.hidden=false;
  gate.hidden=false;
  root.classList.add("suite-gated");
  root.classList.remove("suite-ready");
  enter.focus({preventScroll:true});
}
function startIntro(){
  clearTimeout(introTimer);
  gate.hidden=false;
  splash.hidden=false;
  entry.hidden=true;
  root.classList.remove("suite-ready");
  root.classList.add("suite-gated");
  // Restart just the 6-second reveal; no separate ° or ∞ appears at the start.
  splash.classList.remove("play");
  void splash.offsetHeight;
  splash.classList.add("play");
  if(prefersReduced){showEntry();return;}
  introTimer=window.setTimeout(showEntry,INTRO_DURATION_MS);
}
skip.addEventListener("click",showEntry);
enter.addEventListener("click",()=>{
  savePreviewSession(storage);
  showWorkspace();
});
logout?.addEventListener("click",()=>{
  clearPreviewSession(storage);
  document.body.classList.remove("suite-demo-active");
  startIntro();
});
replay?.addEventListener("click",startIntro);
// Only a future server-verified session may count as real authentication.
// Preview storage makes the prototype convenient; it grants no API permissions.
const mode=entryRoute({hasVerifiedServerSession:false,hasSavedPreviewSession:isSavedPreviewSession(storage)});
if(mode==="workspace"){showWorkspace()}else{startIntro()}
window.SuitePreviewGate={logout:()=>logout?.click()};
