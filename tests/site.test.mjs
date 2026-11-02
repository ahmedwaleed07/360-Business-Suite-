import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const html=fileURLToPath(new URL("../index.html",import.meta.url));
const js=fileURLToPath(new URL("../assets/site.js",import.meta.url));
const css=fileURLToPath(new URL("../assets/site.css",import.meta.url));
const markup=readFileSync(html,"utf8"),script=readFileSync(js,"utf8"),style=readFileSync(css,"utf8");
test("public static HTML includes stylesheet, script and demo warning",()=>{
  assert.match(markup,/assets\/site\.css/);
  assert.match(markup,/assets\/site\.js/);
  assert.match(markup,/DEMO/);
});
test("frontend JavaScript passes Node syntax check",()=>{
  const run=spawnSync(process.execPath,["--check",js],{encoding:"utf8"});
  assert.equal(run.status,0,run.stderr);
});
test("every referenced DOM id exists in HTML",()=>{
  const references=[...script.matchAll(/\$\("([^"]+)"\)/g)].map(m=>m[1]);
  for(const id of new Set(references)) assert.ok(markup.includes('id="'+id+'"'),"Missing element: "+id);
});
test("advertisements have a house fallback and hard cap of five",()=>{
  assert.match(script,/Your Business\. Our Vision\./);
  assert.match(script,/paid\.length===5/);
  assert.match(markup,/ASAS 360°/);
});
test("reduced-motion and video-mute controls exist",()=>{
  assert.match(style,/prefers-reduced-motion/);
  assert.match(script,/v\.muted=true/);
  assert.match(script,/v\.playsInline=true/);
});
test("no credential values or real Supabase endpoints in public preview",()=>{
  assert.doesNotMatch(markup+script+style,/sb_secret_|service_role|xjspokwtikefpgwczehp|sk_live_/);
});
