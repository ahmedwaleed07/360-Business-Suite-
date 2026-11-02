"use strict";
(()=>{
const $=id=>document.getElementById(id);
const companies={
atlas:{leads:[["الرافدين للتجهيزات","تفاوض",14500,"سارة"],["المدى للمقاولات","عرض سعر",9800,"علي"],["مجموعة النخيل","متابعة",6200,"أحمد"]],stock:[["أجهزة نقاط بيع","POS-210",32],["ماسحات باركود","SCAN-4",5],["ورق فواتير","PAPER-80",180]],approvals:[["شراء أجهزة للمخزن",7500,"بانتظار المالية"],["طلب توريد أجهزة",2400,"موافقة المدير"]]},
vision:{leads:[["مجموعة المدار","عميل جديد",8200,"رنا"],["شركة الفرات","تفاوض",12500,"حسن"]],stock:[["معدات شبكة","NET-12",9],["أجهزة اتصال","COM-8",24]],approvals:[["أجهزة للشبكة",1900,"بانتظار المدير"]]}}
let company="atlas",role="platform",view="home",paid=[],livePaid=[],index=0,paused=false,timer=null;
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const money=n=>"$"+Number(n).toLocaleString("en-US");
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e};
const clear=e=>e.replaceChildren();
function row(left,right){const e=make("div",undefined,"line");e.append(make("span",left),make("span",right,"muted"));return e}
function screen(which){view=which;document.querySelectorAll(".view").forEach(el=>el.classList.toggle("current",el.id===which));document.querySelectorAll("[data-view]").forEach(el=>el.classList.toggle("selected",el.dataset.view===which));$("viewTitle").textContent={home:"لوحة التحكم",crm:"إدارة العملاء",erp:"المخزون و ERP",workflow:"الموافقات",permissions:"الصلاحيات",ads:"ASAS Ads"}[which];render()}
function render(){const c=companies[company];clear($("kpis"));[["العملاء المحتملون",c.leads.length],["قيمة الفرص",money(c.leads.reduce((s,x)=>s+x[2],0))],["أصناف المخزون",c.stock.length],["طلبات موافقة",c.approvals.length]].forEach(([k,v])=>{const d=make("div",undefined,"kpi");d.append(make("small",k),make("strong",v));$("kpis").append(d)});clear($("latestLeads"));c.leads.forEach(x=>$("latestLeads").append(row(x[0],money(x[2]))));clear($("latestApprovals"));c.approvals.forEach(x=>$("latestApprovals").append(row(x[0],x[2])));renderLeads();clear($("inventoryTable"));c.stock.forEach(x=>{const tr=make("tr");[x[0],x[1],x[2],x[2]<10?"مخزون منخفض":"متوفر"].forEach(y=>tr.append(make("td",y)));$("inventoryTable").append(tr)});clear($("approvalTable"));c.approvals.forEach(x=>$("approvalTable").append(row(x[0],money(x[1])+" — "+x[2])));$("roleNote").textContent=role==="platform"?"مدير منصة ASAS: مسؤول عن إدارة الإعلانات والمنصة، دون اطلاع حر على بيانات الشركات الإنتاجية.":role==="owner"?"المالك الأعلى بحساب شركته، ويمكنه تفويض الصلاحيات داخل الشركة فقط.":"موظف مبيعات: صلاحيات محدودة بحسب الشركة والفرع والعملاء المسموحين له.";const permit=role==="platform";$("adsAdmin").hidden=!permit;$("adRestricted").hidden=permit;$("addCustomer").disabled=role==="employee"?false:!permit&&role!=="owner";renderCampaigns();renderAd()}
function renderLeads(){clear($("customersTable"));const q=$("customerSearch").value.trim().toLowerCase();companies[company].leads.filter(x=>x[0].toLowerCase().includes(q)).forEach(x=>{const tr=make("tr");[x[0],x[1],money(x[2]),x[3]].forEach(t=>tr.append(make("td",t)));$("customersTable").append(tr)})}
function active(){return (paid.length?paid:livePaid).slice(0,5)}
function adNow(){const a=active();return a.length?a[index%a.length]:{headline:"Your Business. Our Vision.",subtitle:"CRM • ERP • Integrated Business Solutions",link:"https://asas360.com",advertiser:"ASAS 360°",format:"motion",house:true}}
function renderAd(){const b=$("adBanner"),a=adNow();clear(b);const text=make("div",undefined,"adcopy");text.append(make("span",a.house?"ASAS 360° • ALWAYS ON":"SPONSORED ADVERTISEMENT","overline"),make("h2",a.headline),make("p",a.subtitle||a.advertiser));if(a.link){const link=make("a","اكتشف المزيد ↗");link.href=httpsOnly(a.link)||"https://asas360.com";link.target="_blank";link.rel="noopener noreferrer sponsored";text.append(link)}b.append(text);if(a.format==="video"&&a.video&&!reduced){const v=make("video");v.src=a.video;v.autoplay=true;v.muted=true;v.loop=true;v.playsInline=true;v.preload="metadata";b.prepend(v);v.play().catch(()=>{});const btn=make("button","تشغيل الصوت","sound");btn.addEventListener("click",()=>{v.muted=!v.muted;btn.textContent=v.muted?"تشغيل الصوت":"كتم الصوت"});b.append(btn)}const n=active().length;$("adStatus").textContent=n?"إعلان "+(index%n+1)+" من "+n+(paid.length?" • تجربة محلية":" • Cloudflare"):"إعلان ASAS 360° الاحتياطي";$("adPause").textContent=paused?"▶":"Ⅱ"}
function rotation(){clearInterval(timer);timer=null;if(!paused&&!reduced&&active().length>1){timer=setInterval(()=>{if(view==="home"&&!document.hidden){index=(index+1)%active().length;renderAd()}},12000)}}
function next(n){if(active().length)index=(index+n+active().length)%active().length;renderAd();rotation()}
function renderCampaigns(){const list=$("adCampaigns");clear(list);$("adCount").textContent=paid.length+" / 5";if(!paid.length)list.append(make("p","لا يوجد معلنون؛ يتم عرض إعلان ASAS 360° تلقائياً."));paid.forEach((a,i)=>{const r=make("div",undefined,"line"),btn=make("button","حذف");btn.className="mainbtn";btn.type="button";btn.addEventListener("click",()=>{if(role!=="platform")return;paid.splice(i,1);index=0;renderCampaigns();renderAd();rotation()});r.append(make("span",a.advertiser),btn);list.append(r)})}
function httpsOnly(value){if(!value)return "";try{const u=new URL(value);return u.protocol==="https:"?u.href:null}catch{return null}}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>screen(b.dataset.view)));
$("company").addEventListener("change",e=>{company=e.target.value;render()});
$("role").addEventListener("change",e=>{role=e.target.value;render()});
$("customerSearch").addEventListener("input",renderLeads);
$("addCustomer").addEventListener("click",()=>{if($("addCustomer").disabled)return;const name=prompt("اسم العميل التجريبي:");if(!name||!name.trim())return;companies[company].leads.unshift([name.trim().slice(0,90),"عميل جديد",0,"موظف"]);render()});
$("adPrev").addEventListener("click",()=>next(-1));$("adNext").addEventListener("click",()=>next(1));$("adPause").addEventListener("click",()=>{paused=!paused;renderAd();rotation()});
$("adForm").addEventListener("submit",e=>{e.preventDefault();if(role!=="platform")return;if(paid.length===5){alert("الحد الأقصى خمسة إعلانات");return}const d=new FormData(e.target),video=httpsOnly(String(d.get("video")||"").trim()),link=httpsOnly(String(d.get("link")||"").trim()),format=String(d.get("format"));if(video===null||link===null||(format==="video"&&!video)){alert("يرجى إدخال روابط HTTPS صحيحة");return}paid.push({advertiser:String(d.get("advertiser")).trim().slice(0,60),headline:String(d.get("headline")).trim().slice(0,120),subtitle:String(d.get("subtitle")).trim().slice(0,180),format,video,link});index=0;e.target.reset();screen("home");rotation()});
render();rotation();

async function loadCloudflarePublicAds(){
 // Read-only, non-sensitive advertisements. User/company records are NEVER fetched from this demo.
 try{
  const response=await fetch("https://asas-business-suite-staging.eng-ahmed-waleed.workers.dev/public/ads",{headers:{"Accept":"application/json"},cache:"no-store",signal:typeof AbortSignal.timeout==="function"?AbortSignal.timeout(6000):undefined});
  if(!response.ok)return;
  const payload=await response.json();
  if(!Array.isArray(payload.advertisements))return;
  const filtered=payload.advertisements.filter(a=>a&&a.house_ad!==true&&typeof a.headline==="string").slice(0,5);
  livePaid=filtered.map(a=>({
   advertiser:String(a.advertiser_name||"Business").slice(0,80),
   headline:String(a.headline).slice(0,120),
   subtitle:String(a.subtitle||"").slice(0,180),
   format:"motion", // R2 media streaming and approvals are not production-configured.
   link:httpsOnly(a.destination_url)||""
  }));
  index=0;renderAd();rotation();
 }catch(error){console.info("ASAS Ads public API unavailable; showing ASAS 360° fallback")}
}
loadCloudflarePublicAds();
})();