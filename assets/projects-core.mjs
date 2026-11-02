// Pure, in-memory domain model for the ASAS public workflow prototype.
// NOT production access control. The API must independently authorize every action.
const roles=new Set(["edit","comment","view"]);
const priorities=new Set(["normal","high","urgent"]);
const uuid=()=>crypto.randomUUID();
const text=(x,limit)=>typeof x==="string"?x.trim().slice(0,limit):"";
function org(state,companyId){
 const x=state.companies[companyId];
 if(!x)throw Error("شركة غير موجودة");
 return x;
}
function findSection(x,id){
 const s=x.sections.find(v=>v.id===id);
 if(!s)throw Error("القسم غير موجود في هذه الشركة");
 return s;
}
function findTask(x,id){
 const t=x.tasks.find(v=>v.id===id);
 if(!t)throw Error("المهمة غير موجودة في هذه الشركة");
 return t;
}
function collaboratorList(x,input){
 if(!Array.isArray(input))throw Error("قائمة المتعاونين غير صحيحة");
 const unique=new Set();
 return input.map(item=>{
  if(!x.members.some(m=>m.id===item.userId))throw Error("لا يمكن إضافة عضو من شركة ثانية");
  if(!roles.has(item.access))throw Error("صلاحية غير معروفة");
  if(unique.has(item.userId))throw Error("عضو مكرر");
  unique.add(item.userId);
  return {userId:item.userId,access:item.access};
 });
}
export function seed(){
 return {companies:{
  atlas:{
   members:[{id:"atlas-me",name:"أحمد"},{id:"atlas-sara",name:"سارة"},{id:"atlas-ali",name:"علي"},{id:"atlas-omar",name:"عمر"}],
   sections:[
    {id:"a-ready",name:"أفكار ومطلوب",collaborators:[{userId:"atlas-me",access:"edit"},{userId:"atlas-sara",access:"edit"}]},
    {id:"a-progress",name:"قيد التنفيذ",collaborators:[{userId:"atlas-me",access:"edit"},{userId:"atlas-ali",access:"edit"}]},
    {id:"a-review",name:"مراجعة واعتماد",collaborators:[{userId:"atlas-me",access:"edit"},{userId:"atlas-omar",access:"comment"}]}
   ],
   tasks:[
    {id:"a1",sectionId:"a-ready",title:"إعداد خطة التواصل مع العملاء",description:"ربط الخطة بفرص CRM ومراجعة المواعيد.",assignee:"atlas-sara",priority:"high",dueDate:"2026-11-12",done:false},
    {id:"a2",sectionId:"a-ready",title:"تحديد متطلبات الفرع الجديد",description:"تجميع الاحتياجات قبل طلب الشراء.",assignee:"atlas-me",priority:"normal",dueDate:"",done:false},
    {id:"a3",sectionId:"a-progress",title:"تجهيز عرض السعر",description:"تحديث عرض السعر وإرساله للمراجعة.",assignee:"atlas-ali",priority:"urgent",dueDate:"2026-11-07",done:false},
    {id:"a4",sectionId:"a-review",title:"اعتماد قائمة الموردين",description:"اعتماد موردين لشهر نوفمبر.",assignee:"atlas-me",priority:"normal",dueDate:"",done:true}
   ]
  },
  vision:{
   members:[{id:"vision-me",name:"أحمد"},{id:"vision-rana",name:"رنا"},{id:"vision-hasan",name:"حسن"}],
   sections:[
    {id:"v-ready",name:"طلبات جديدة",collaborators:[{userId:"vision-me",access:"edit"},{userId:"vision-rana",access:"edit"}]},
    {id:"v-progress",name:"تنفيذ الخدمات",collaborators:[{userId:"vision-me",access:"edit"},{userId:"vision-hasan",access:"edit"}]},
    {id:"v-done",name:"مغلق",collaborators:[{userId:"vision-me",access:"edit"}]}
   ],
   tasks:[
    {id:"v1",sectionId:"v-ready",title:"تجهيز جدول زيارات العملاء",description:"ترتيب الاجتماعات حسب الأولوية.",assignee:"vision-rana",priority:"high",dueDate:"2026-11-10",done:false},
    {id:"v2",sectionId:"v-progress",title:"فحص متطلبات الشبكة",description:"إعداد تقرير التوصيات.",assignee:"vision-hasan",priority:"normal",dueDate:"",done:false}
   ]
  }
 }};
}
export function snapshot(state,companyId){return org(state,companyId)}
export function addSection(state,companyId,name){
 const x=org(state,companyId),n=text(name,70);
 if(!n)throw Error("اكتب اسم القسم");
 const s={id:uuid(),name:n,collaborators:[]};
 x.sections.push(s);return s;
}
export function updateSection(state,companyId,id,patch){
 const x=org(state,companyId),s=findSection(x,id),n=text(patch.name,70);
 if(!n)throw Error("اسم القسم مطلوب");
 const members=collaboratorList(x,patch.collaborators||[]);
 s.name=n;s.collaborators=members;return s;
}
export function reorderSection(state,companyId,id,direction){
 const x=org(state,companyId),idx=x.sections.findIndex(s=>s.id===id);
 if(idx<0)throw Error("القسم غير موجود");
 const target=idx+direction;
 if(target<0||target>=x.sections.length)return false;
 [x.sections[idx],x.sections[target]]=[x.sections[target],x.sections[idx]];
 return true;
}
export function removeSection(state,companyId,id){
 const x=org(state,companyId),s=findSection(x,id);
 if(x.tasks.some(t=>t.sectionId===id))throw Error("انقل مهام القسم أولاً قبل حذفه");
 x.sections=x.sections.filter(v=>v.id!==s.id);return true;
}
export function addTask(state,companyId,sectionId,title,patch={}){
 const x=org(state,companyId);findSection(x,sectionId);
 const name=text(title,150);
 if(!name)throw Error("اكتب اسم المهمة");
 const assignee=patch.assignee||"";
 if(assignee&&!x.members.some(m=>m.id===assignee))throw Error("المسؤول ليس من أعضاء الشركة");
 const priority=patch.priority||"normal";
 if(!priorities.has(priority))throw Error("الأولوية غير صحيحة");
 const task={id:uuid(),sectionId,title:name,description:text(patch.description||"",2000),assignee,priority,dueDate:validDate(patch.dueDate||""),done:Boolean(patch.done)};
 x.tasks.push(task);return task;
}
function validDate(value){
 if(!value)return "";
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("تاريخ غير صالح");
 const d=new Date(value+"T00:00:00Z");
 if(Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==value)throw Error("تاريخ غير صالح");
 return value;
}
export function updateTask(state,companyId,id,patch){
 const x=org(state,companyId),t=findTask(x,id);
 if(patch.title!==undefined){const n=text(patch.title,150);if(!n)throw Error("اسم المهمة مطلوب");t.title=n}
 if(patch.description!==undefined)t.description=text(patch.description,2000);
 if(patch.sectionId!==undefined){findSection(x,patch.sectionId);t.sectionId=patch.sectionId}
 if(patch.assignee!==undefined){
  if(patch.assignee&&!x.members.some(m=>m.id===patch.assignee))throw Error("المسؤول ليس من أعضاء الشركة");
  t.assignee=patch.assignee;
 }
 if(patch.priority!==undefined){if(!priorities.has(patch.priority))throw Error("أولوية غير صحيحة");t.priority=patch.priority}
 if(patch.dueDate!==undefined)t.dueDate=validDate(patch.dueDate);
 if(patch.done!==undefined)t.done=Boolean(patch.done);
 return t;
}
export function duplicateTask(state,companyId,id){
 const x=org(state,companyId),t=findTask(x,id);
 return addTask(state,companyId,t.sectionId,t.title+" (نسخة)",{description:t.description,assignee:t.assignee,priority:t.priority,dueDate:t.dueDate});
}
export function removeTask(state,companyId,id){
 const x=org(state,companyId);findTask(x,id);x.tasks=x.tasks.filter(t=>t.id!==id);return true;
}
export function visibleTasks(state,companyId,filter="all"){
 const x=org(state,companyId),me=companyId+"-me";
 return x.tasks.filter(t=>filter==="mine"?t.assignee===me:filter==="open"?!t.done:filter==="done"?t.done:true);
}
export function counters(state,companyId){
 const x=org(state,companyId);
 return {sections:x.sections.length,total:x.tasks.length,open:x.tasks.filter(t=>!t.done).length,done:x.tasks.filter(t=>t.done).length};
}
