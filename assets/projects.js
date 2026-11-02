import {seed,snapshot,addSection,updateSection,reorderSection,removeSection,addTask,updateTask,duplicateTask,removeTask,visibleTasks,counters} from "./projects-core.mjs";
const state=seed(),$=id=>document.getElementById(id),element=(tag,cls,content)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=String(content);return e;
};
let companyId="atlas",filter="all",mode="board",editingTask=null,editingSection=null,focusRestore=null,toastTimer=null;
const labels={normal:"اعتيادية",high:"عالية",urgent:"عاجلة"};
function data(){return snapshot(state,companyId)}
function memberName(id){return data().members.find(m=>m.id===id)?.name||"غير محدد"}
function notify(message){const e=$("toast");e.textContent=message;e.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.hidden=true,2500)}
function protect(fn){try{return fn()}catch(err){notify(err.message||"تعذرت العملية");return null}}
function stats(){
 const t=counters(state,companyId),items=[["الأقسام",t.sections],["إجمالي المهام",t.total],["غير المكتملة",t.open],["المكتملة",t.done]];
 $("summary").replaceChildren(...items.map(([name,n])=>{const e=element("div","stat");e.append(element("small","",name),element("strong","",n));return e}));
}
function closeMenu(){$("menu").hidden=true;$("menu").replaceChildren()}
function showMenu(event,entries){
 event.stopPropagation();closeMenu();
 const m=$("menu");for(const item of entries){
  if(item.divider){m.append(element("hr"));continue}
  const b=element("button",item.danger?"danger":"",item.label);b.type="button";b.setAttribute("role","menuitem");
  b.addEventListener("click",()=>{closeMenu();protect(item.action)});
  m.append(b);
 }
 const r=event.currentTarget.getBoundingClientRect();
 m.hidden=false;
 m.style.top=Math.min(r.bottom+5,window.innerHeight-m.offsetHeight-10)+"px";
 m.style.left=Math.max(8,Math.min(r.left,window.innerWidth-m.offsetWidth-8))+"px";
 m.querySelector("button")?.focus();
}
function showDialog(id,opener){
 closeMenu();
 focusRestore=opener||document.activeElement;
 $("overlay").hidden=false;$(id).hidden=false;document.body.style.overflow="hidden";
 setTimeout(()=>$(id).querySelector("input, textarea, button")?.focus(),0);
}
function closeDialog(){
 $("drawer").hidden=true;$("sectionDrawer").hidden=true;$("overlay").hidden=true;document.body.style.overflow="";
 const button=focusRestore;focusRestore=null;if(button?.isConnected)button.focus();
}
function selectorOptions(select,options,selected=""){
 select.replaceChildren(...options.map(([value,label])=>{const o=element("option","",label);o.value=value;o.selected=value===selected;return o}));
}
function openTask(t,sectionId,opener){
 editingTask=t?.id||null;
 $("drawerTitle").textContent=t?"تفاصيل المهمة":"مهمة جديدة";
 $("taskTitle").value=t?.title||"";
 $("taskDescription").value=t?.description||"";
 $("taskPriority").value=t?.priority||"normal";
 $("taskDue").value=t?.dueDate||"";
 $("taskDone").checked=Boolean(t?.done);
 selectorOptions($("taskAssignee"),[["","بدون مسؤول"],...data().members.map(m=>[m.id,m.name])],t?.assignee||"");
 selectorOptions($("taskSection"),data().sections.map(s=>[s.id,s.name]),t?.sectionId||sectionId||data().sections[0]?.id);
 showDialog("drawer",opener);
}
function openSection(s,opener){
 editingSection=s?.id||null;
 $("sectionDrawerTitle").textContent=s?"تعديل القسم والمتعاونين":"قسم جديد";
 $("sectionName").value=s?.name||"";
 const choices=$("memberChoices");choices.replaceChildren();
 for(const m of data().members){
  const c=s?.collaborators?.find(x=>x.userId===m.id);
  const row=element("label","member-item");
  const check=element("input");check.type="checkbox";check.value=m.id;check.checked=Boolean(c);check.setAttribute("aria-label","إضافة "+m.name);
  const select=element("select");select.setAttribute("aria-label","صلاحية "+m.name);
  selectorOptions(select,[["edit","تعديل"],["comment","تعليق"],["view","عرض"]],c?.access||"edit");
  row.append(check,element("span","",m.name),select);
  choices.append(row);
 }
 showDialog("sectionDrawer",opener);
}
function taskMenu(e,t){
 const x=data();
 const entries=[
  {label:"تعديل التفاصيل",action:()=>openTask(t,null,e.currentTarget)},
  {label:"نسخ المهمة",action:()=>{duplicateTask(state,companyId,t.id);render();notify("تم نسخ المهمة")}},
  {label:t.done?"إرجاع إلى غير المكتملة":"تحديد مكتملة",action:()=>{updateTask(state,companyId,t.id,{done:!t.done});render()}},
  {label:"تبديل الأولوية",action:()=>{const cycle={normal:"high",high:"urgent",urgent:"normal"};updateTask(state,companyId,t.id,{priority:cycle[t.priority]});render()}},
  {divider:true},
  ...x.sections.filter(s=>s.id!==t.sectionId).map(s=>({label:"نقل إلى: "+s.name,action:()=>{updateTask(state,companyId,t.id,{sectionId:s.id});render();notify("تم نقل المهمة")}})),
  {divider:true},
  {label:"حذف المهمة",danger:true,action:()=>{if(confirm("حذف المهمة من هذه التجربة؟")){removeTask(state,companyId,t.id);render()}}}
 ];
 showMenu(e,entries);
}
function sectionMenu(e,s){
 showMenu(e,[
  {label:"تعديل الاسم والمتعاونين",action:()=>openSection(s,e.currentTarget)},
  {label:"نقل القسم لليمين",action:()=>{reorderSection(state,companyId,s.id,-1);render()}},
  {label:"نقل القسم لليسار",action:()=>{reorderSection(state,companyId,s.id,1);render()}},
  {divider:true},
  {label:"حذف القسم",danger:true,action:()=>{if(confirm("حذف القسم الفارغ؟")){removeSection(state,companyId,s.id);render()}}}
 ]);
}
function taskCard(t){
 const card=element("article","task-card"+(t.done?" completed":""));
 card.tabIndex=0;card.draggable=mode==="board";
 card.setAttribute("aria-label",t.title+" — افتح التفاصيل");
 card.dataset.taskId=t.id;
 const top=element("div","task-top");
 top.append(element("div","task-title",t.title));
 const menu=element("button","icon-button","⋯");menu.type="button";menu.setAttribute("aria-label","قائمة خيارات المهمة "+t.title);
 menu.addEventListener("click",e=>taskMenu(e,t));top.append(menu);card.append(top);
 const meta=element("div","task-meta");
 const pill=element("span","pill "+(t.priority==="normal"?"":t.priority),labels[t.priority]);
 meta.append(pill,element("span","",memberName(t.assignee)));
 if(t.dueDate)meta.append(element("span","",t.dueDate));
 if(t.done)meta.append(element("span","pill","مكتملة"));
 card.append(meta);
 card.addEventListener("click",e=>{if(!e.target.closest("button"))openTask(t,null,card)});
 card.addEventListener("keydown",e=>{if(e.target===card&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openTask(t,null,card)}});
 card.addEventListener("dragstart",e=>{e.dataTransfer?.setData("text/plain",t.id);e.dataTransfer.effectAllowed="move"});
 return card;
}
function sectionColumn(s,tasks){
 const section=element("section","section"),head=element("div","section-head");
 section.dataset.sectionId=s.id;
 const title=element("button","section-title-button",s.name+" ");
 title.style.cssText="font:inherit;color:inherit;border:0;background:transparent;font-weight:750;cursor:pointer;text-align:right";
 title.setAttribute("title","تعديل القسم والمتعاونين");
 title.addEventListener("click",()=>openSection(s,title));
 const heading=element("div");heading.append(title,element("small","",tasks.length+" مهام"));
 const menu=element("button","icon-button","⋯");
 menu.type="button";menu.setAttribute("aria-label","خيارات القسم "+s.name);
 menu.addEventListener("click",e=>sectionMenu(e,s));
 head.append(heading,menu);section.append(head);
 section.append(element("div","section-owners",s.collaborators.length?
   "المتعاونون: "+s.collaborators.map(c=>memberName(c.userId)).join("، "):"بدون متعاونين"));
 const list=element("div","task-list");
 for(const t of tasks)list.append(taskCard(t));
 section.append(list);
 const add=element("button","quick-add","+ أضف مهمة لهذا القسم");
 add.type="button";
 const form=element("form","inline-create");form.hidden=true;
 const input=element("input");input.type="text";input.maxLength=150;input.required=true;input.placeholder="اسم المهمة...";input.setAttribute("aria-label","اسم المهمة الجديدة");
 const submit=element("button","primary","إضافة");submit.type="submit";
 form.append(input,submit);
 add.addEventListener("click",()=>{add.hidden=true;form.hidden=false;input.focus()});
 form.addEventListener("submit",e=>{e.preventDefault();const value=input.value.trim();if(!value)return;const created=protect(()=>addTask(state,companyId,s.id,value,{assignee:companyId+"-me"}));if(created){render();notify("أُضيفت المهمة")}}); 
 input.addEventListener("keydown",e=>{if(e.key==="Escape"){e.stopPropagation();form.hidden=true;add.hidden=false;add.focus()}});
 section.append(add,form);
 section.addEventListener("dragover",e=>{if(e.dataTransfer?.types.includes("text/plain")){e.preventDefault();section.classList.add("dragover")}});
 section.addEventListener("dragleave",()=>section.classList.remove("dragover"));
 section.addEventListener("drop",e=>{e.preventDefault();section.classList.remove("dragover");const id=e.dataTransfer?.getData("text/plain");if(id&&data().tasks.some(t=>t.id===id)){protect(()=>updateTask(state,companyId,id,{sectionId:s.id}));render();notify("تم نقل المهمة")}});
 return section;
}
function render(){
 closeMenu();stats();
 const b=$("board");b.classList.toggle("list-mode",mode==="list");b.replaceChildren();
 const filtered=visibleTasks(state,companyId,filter);
 for(const s of data().sections)b.append(sectionColumn(s,filtered.filter(t=>t.sectionId===s.id)));
 if(!data().sections.length)b.append(element("p","help","لا توجد أقسام. اضغط قسم جديد وابدأ تنظيم مشروعك."));
}
$("companySelect").addEventListener("change",e=>{companyId=e.target.value;closeDialog();render()});
$("filterTasks").addEventListener("change",e=>{filter=e.target.value;render()});
function switchMode(next){mode=next;$("boardView").classList.toggle("chosen",next==="board");$("listView").classList.toggle("chosen",next==="list");$("boardView").setAttribute("aria-pressed",String(next==="board"));$("listView").setAttribute("aria-pressed",String(next==="list"));render()}
$("boardView").addEventListener("click",()=>switchMode("board"));
$("listView").addEventListener("click",()=>switchMode("list"));
$("createSection").addEventListener("click",e=>openSection(null,e.currentTarget));
$("taskForm").addEventListener("submit",e=>{
 e.preventDefault();const patch={title:$("taskTitle").value,description:$("taskDescription").value,assignee:$("taskAssignee").value,priority:$("taskPriority").value,sectionId:$("taskSection").value,dueDate:$("taskDue").value,done:$("taskDone").checked};
 const result=protect(()=>editingTask?updateTask(state,companyId,editingTask,patch):addTask(state,companyId,patch.sectionId,patch.title,patch));
 if(result){closeDialog();render();notify("تم حفظ المهمة")}
});
$("sectionForm").addEventListener("submit",e=>{
 e.preventDefault();const participants=[];
 for(const row of $("memberChoices").children){
  const checkbox=row.querySelector("input"),select=row.querySelector("select");
  if(checkbox.checked)participants.push({userId:checkbox.value,access:select.value});
 }
 const name=$("sectionName").value;
 const updated=protect(()=>{
  if(editingSection)return updateSection(state,companyId,editingSection,{name,collaborators:participants});
  const s=addSection(state,companyId,name);
  return updateSection(state,companyId,s.id,{name,collaborators:participants});
 });
 if(updated){closeDialog();render();notify("تم حفظ إعدادات القسم")}
});
["closeDrawer","cancelTask","closeSectionDrawer","cancelSection"].forEach(id=>$(id).addEventListener("click",closeDialog));
$("overlay").addEventListener("click",closeDialog);
document.addEventListener("click",e=>{if(!$("menu").contains(e.target)&&!e.target.closest(".icon-button"))closeMenu()});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"){if(!$("menu").hidden)closeMenu();else if(!$("overlay").hidden)closeDialog()}
 if(e.key.toLowerCase()==="n"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&$("overlay").hidden){
  const a=document.activeElement;if(a&&(/INPUT|TEXTAREA|SELECT/.test(a.tagName)||a.isContentEditable))return;
  if(data().sections.length){e.preventDefault();openTask(null,data().sections[0].id,a)}
 }
});
render();
