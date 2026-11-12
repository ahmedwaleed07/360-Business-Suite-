import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {
 seed,snapshot,addSection,updateSection,reorderSection,removeSection,
 addTask,updateTask,duplicateTask,removeTask,visibleTasks,counters
} from "../assets/projects-core.mjs";
const root=new URL("../",import.meta.url);
const html=readFileSync(new URL("projects.html",root),"utf8");
const ui=readFileSync(new URL("assets/projects.js",root),"utf8");
const style=readFileSync(new URL("assets/projects.css",root),"utf8");

test("sections and tasks exist in two separate fictional companies",()=>{
 const state=seed();
 assert.equal(snapshot(state,"atlas").sections.length,3);
 assert.equal(snapshot(state,"vision").sections.length,3);
 assert.notDeepEqual(snapshot(state,"atlas").members,snapshot(state,"vision").members);
});
test("section name can be edited and collaborators assigned individual access",()=>{
 const state=seed(),s=snapshot(state,"atlas").sections[0];
 updateSection(state,"atlas",s.id,{name:"خطة إطلاق جديدة",collaborators:[
  {userId:"atlas-me",access:"edit"},{userId:"atlas-omar",access:"view"}
 ]});
 assert.equal(s.name,"خطة إطلاق جديدة");
 assert.deepEqual(s.collaborators.map(x=>x.access),["edit","view"]);
});
test("a section cannot gain members from another company",()=>{
 const state=seed(),s=snapshot(state,"atlas").sections[0];
 assert.throws(()=>updateSection(state,"atlas",s.id,{name:"Safe",collaborators:[{userId:"vision-rana",access:"edit"}]}),/شركة ثانية/);
 assert.throws(()=>updateSection(state,"atlas",s.id,{name:"Safe",collaborators:[{userId:"atlas-me",access:"owner"}]}),/صلاحية/);
});
test("sections support fast addition and reordering",()=>{
 const state=seed(),s=addSection(state,"atlas","قسم جديد");
 assert.equal(counters(state,"atlas").sections,4);
 assert.equal(reorderSection(state,"atlas",s.id,-1),true);
 assert.equal(snapshot(state,"atlas").sections.at(-2).id,s.id);
});
test("tasks can be quickly added, edited, completed and moved",()=>{
 const state=seed();const sections=snapshot(state,"atlas").sections;
 const task=addTask(state,"atlas",sections[0].id,"متابعة العرض",{assignee:"atlas-me",priority:"high",dueDate:"2026-11-10"});
 updateTask(state,"atlas",task.id,{sectionId:sections[1].id,title:"متابعة عرض العميل",done:true,priority:"urgent"});
 assert.equal(task.sectionId,sections[1].id);
 assert.equal(task.done,true);
 assert.equal(task.priority,"urgent");
 assert.equal(task.title,"متابعة عرض العميل");
 assert.equal(visibleTasks(state,"atlas","done").some(t=>t.id===task.id),true);
});
test("duplicate task keeps details but resets completed status",()=>{
 const state=seed(),t=snapshot(state,"atlas").tasks.find(t=>t.done);
 const copy=duplicateTask(state,"atlas",t.id);
 assert.notEqual(copy.id,t.id);
 assert.match(copy.title,/نسخة/);
 assert.equal(copy.done,false);
 assert.equal(copy.sectionId,t.sectionId);
});
test("remove task and block deletion of nonempty sections",()=>{
 const state=seed(),s=snapshot(state,"atlas").sections[0];
 assert.throws(()=>removeSection(state,"atlas",s.id),/انقل مهام/);
 updateTask(state,"atlas","a3",{dependencies:[]});
 for(const t of [...snapshot(state,"atlas").tasks].filter(t=>t.sectionId===s.id))removeTask(state,"atlas",t.id);
 assert.equal(removeSection(state,"atlas",s.id),true);
});
test("cross-tenant task operations fail even when task IDs are known",()=>{
 const state=seed(),foreign=snapshot(state,"vision").tasks[0];
 assert.throws(()=>updateTask(state,"atlas",foreign.id,{done:true}),/هذه الشركة/);
 assert.throws(()=>duplicateTask(state,"atlas",foreign.id),/هذه الشركة/);
 assert.throws(()=>removeTask(state,"atlas",foreign.id),/هذه الشركة/);
 assert.equal(snapshot(state,"vision").tasks[0].done,false);
});
test("task assignee is constrained to same company",()=>{
 const state=seed(),section=snapshot(state,"atlas").sections[0];
 assert.throws(()=>addTask(state,"atlas",section.id,"مهمة",{assignee:"vision-rana"}),/الشركة/);
 assert.throws(()=>updateTask(state,"atlas","a1",{assignee:"vision-me"}),/الشركة/);
});
test("filter by current user's tasks and by completion",()=>{
 const state=seed(),all=visibleTasks(state,"atlas","all");
 assert.equal(visibleTasks(state,"atlas","mine").every(t=>t.assignee==="atlas-me"),true);
 assert.equal(visibleTasks(state,"atlas","open").every(t=>!t.done),true);
 assert.equal(visibleTasks(state,"atlas","done").every(t=>t.done),true);
 assert.equal(all.length,4);
});
test("reject invalid empty title, invalid priority and bad due date",()=>{
 const state=seed(),section=snapshot(state,"atlas").sections[0];
 assert.throws(()=>addTask(state,"atlas",section.id," "),/اسم/);
 assert.throws(()=>addTask(state,"atlas",section.id,"مهمة",{priority:"system"}),/أولوية/);
 assert.throws(()=>addTask(state,"atlas",section.id,"مهمة",{dueDate:"2026-02-30"}),/تاريخ/);
});
test("public Projects UI has all referenced controls, is a module, and reduces motion",()=>{
 assert.match(html,/type="module" src="\.\/assets\/projects\.js"/);
 assert.match(html,/DEMO/);
 assert.match(style,/prefers-reduced-motion/);
 for(const m of ui.matchAll(/\$\("([^"]+)"\)/g)){
  assert.ok(html.includes('id="'+m[1]+'"'),"Missing control: "+m[1]);
 }
});
test("projects UI passes syntax check and never includes database credentials",()=>{
 for(const path of ["assets/projects.js","assets/projects-core.mjs"]){
  const file=fileURLToPath(new URL(path,root));
  const res=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});
  assert.equal(res.status,0,res.stderr);
 }
 assert.doesNotMatch(html+ui+style,/sb_secret_|service_role|D1_DATABASE_ID|api[_-]?token/i);
});

test("dependencies prevent cycles, premature completion and orphaned links",()=>{
 const state=seed(),section=snapshot(state,"atlas").sections[0];
 const task=addTask(state,"atlas",section.id,"مراجعة العرض",{dependencies:["a3","a3"]});
 assert.deepEqual(task.dependencies,["a3"]);
 assert.throws(()=>addTask(state,"atlas",section.id,"مهمة خارج الشركة",{dependencies:["v1"]}),/هذا المشروع/);
 assert.throws(()=>updateTask(state,"atlas","a1",{title:"تعديل",dependencies:[task.id]}),/دائري/);
 assert.equal(snapshot(state,"atlas").tasks.find(item=>item.id==="a1").title,"إعداد خطة التواصل مع العملاء");
 assert.throws(()=>updateTask(state,"atlas","a3",{done:true}),/أكمل المهام/);
 assert.throws(()=>removeTask(state,"atlas","a1"),/أزل روابط/);
 assert.deepEqual(visibleTasks(state,"atlas","blocked").map(item=>item.id),["a3",task.id]);
 updateTask(state,"atlas","a1",{done:true});
 updateTask(state,"atlas","a3",{done:true});
 updateTask(state,"atlas",task.id,{done:true});
 assert.equal(visibleTasks(state,"atlas","blocked").length,0);
 assert.throws(()=>updateTask(state,"atlas","a1",{done:false}),/أعد فتح/);
});
