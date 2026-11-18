import {createQuote, salesTotals, advanceSale, invoiceBalance, parseCents, salesFollowUp} from "./sales-flow.mjs";
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
function render(){const c=companies[company];clear($("kpis"));[["العملاء المحتملون",c.leads.length],["قيمة الفرص",money(c.leads.reduce((s,x)=>s+x[2],0))],["أصناف المخزون",c.stock.length],["طلبات موافقة",c.approvals.length]].forEach(([k,v])=>{const d=make("div",undefined,"kpi");d.append(make("small",k),make("strong",v));$("kpis").append(d)});clear($("latestLeads"));c.leads.forEach(x=>$("latestLeads").append(row(x[0],money(x[2]))));clear($("latestApprovals"));c.approvals.forEach(x=>$("latestApprovals").append(row(x[0],x[2])));renderLeads();renderSales();clear($("inventoryTable"));c.stock.forEach(x=>{const tr=make("tr");[x[0],x[1],x[2],x[2]<10?"مخزون منخفض":"متوفر"].forEach(y=>tr.append(make("td",y)));$("inventoryTable").append(tr)});clear($("approvalTable"));c.approvals.forEach(x=>$("approvalTable").append(row(x[0],money(x[1])+" — "+x[2])));$("roleNote").textContent=role==="platform"?"مدير منصة ASAS: مسؤول عن إدارة الإعلانات والمنصة، دون اطلاع حر على بيانات الشركات الإنتاجية.":role==="owner"?"المالك الأعلى بحساب شركته، ويمكنه تفويض الصلاحيات داخل الشركة فقط.":"موظف مبيعات: صلاحيات محدودة بحسب الشركة والفرع والعملاء المسموحين له.";const permit=role==="platform";$("adsAdmin").hidden=!permit;$("adRestricted").hidden=permit;$("addCustomer").disabled=role==="employee"?false:!permit&&role!=="owner";renderCampaigns();renderAd()}
const salesByLead=new Map();
let selectedLead=null;
let quoteNumber=0;

function renderLeads(){
 const table=$("customersTable");
 const query=$("customerSearch").value.trim().toLowerCase();
 clear(table);
 for(const lead of companies[company].leads){
  if(!lead[0].toLowerCase().includes(query))continue;
  const tr=make("tr");
  for(const value of [lead[0],lead[1],money(lead[2]),lead[3]])tr.append(make("td",value));
  const actions=make("td");
  const button=make("button","عرض سجل المبيعات","mainbtn");
  button.type="button";
  button.setAttribute("aria-label","عرض سجل المبيعات — "+lead[0]);
  button.addEventListener("click",()=>{
   selectedLead=lead;
   $("quoteForm").reset();
   $("salesMessage").textContent="";
   renderSales();
   $("salesCustomer").focus();
  });
  actions.append(button);
  tr.append(actions);
  table.append(tr);
 }
}

function saleAction(sale, action, label, options={}){
 const form=make("form",undefined,"sales-form");
 let input;
 if(options.max!==undefined){
  const field=make("label",options.invoice?"مبلغ التحصيل":"الكمية");
  input=make("input");
  input.type="number";
  input.required=true;
  input.min=options.invoice?"0.01":"1";
  input.step=input.min;
  input.max=String(options.max);
  field.append(input);
  form.append(field);
 }
 let dueDate;
 if(action==="invoice"){
  const field=make("label","تاريخ الاستحقاق");
  dueDate=make("input");
  dueDate.type="date";
  dueDate.value=salesDate();
  dueDate.required=true;
  field.append(dueDate);
  form.append(field);
 }
 const button=make("button",label,"mainbtn");
 button.type="submit";
 form.append(button);
 form.addEventListener("submit",event=>{
  event.preventDefault();
  const amount=input?(options.invoice?parseCents(input.value):Number(input.value)):undefined;
  try {
   advanceSale(sale,companies[company].stock,action,amount,{dueDate:dueDate?.value,invoiceId:options.invoice?.id});
   $("salesMessage").textContent="تم تسجيل العملية في المعاينة.";
   render();
   $("salesMessage").focus();
  } catch(error) {
   $("salesMessage").textContent=error.message;
  }
 });
 return form;
}

const followUpLabels={
 quote:"اعتماد عرض السعر", delivery:"تسليم المتبقي", stock:"توفير المخزون",
 invoice:"فوترة الكمية المسلّمة", receipt:"تحصيل فاتورة", overdue:"تحصيل فاتورة متأخرة"
};
const salesDateFormat=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Baghdad",year:"numeric",month:"2-digit",day:"2-digit"});
function salesDate(){
 const parts=Object.fromEntries(salesDateFormat.formatToParts(new Date()).map(part=>[part.type,part.value]));
 return [parts.year,parts.month,parts.day].join("-");
}

function renderFollowUp(){
 const current=companies[company];
 const records=current.leads.flatMap(lead=>(salesByLead.get(lead)||[]).map(sale=>({lead,sale})));
 const items=salesFollowUp(records,current.stock,salesDate());
 const sum=entries=>entries.reduce((total,entry)=>total+(entry.balance||0),0);
 const overdue=items.filter(entry=>entry.type==="overdue");
 $("followupSummary").textContent="المتبقي للتحصيل "+money(sum(items)/100)+" · المتأخر "+money(sum(overdue)/100);
 const filter=$("followupFilter").value;
 const rows=$("followupRows");
 clear(rows);
 for(const item of items){
  if(filter==="receipt" && !item.invoice)continue;
  if(filter==="operations" && !["quote","delivery","stock"].includes(item.type))continue;
  if(["overdue","invoice"].includes(filter) && item.type!==filter)continue;
  const tr=make("tr");
  const reference=item.invoice?item.sale.id+"-"+item.invoice.id:item.sale.id;
  const detail=item.invoice
   ?money(item.balance/100)+" · "+(item.invoice.dueDate||"بدون موعد")
   :item.quantity?item.quantity+" وحدة":money(salesTotals(item.sale).total/100);
  for(const value of [item.lead[0]+" · "+item.lead[3],reference,followUpLabels[item.type],detail])tr.append(make("td",value));
  const action=make("td");
  const button=make("button","فتح المعاملة","mainbtn");
  button.type="button";
  button.addEventListener("click",()=>{
   selectedLead=item.lead;
   $("quoteForm").reset();
   $("salesMessage").textContent="";
   renderSales();
   document.getElementById("sale-record-"+item.sale.id)?.focus();
  });
  action.append(button);
  tr.append(action);
  rows.append(tr);
 }
 if(!rows.children.length){
  const tr=make("tr");
  const cell=make("td","لا توجد إجراءات مطابقة. افتح سجل مبيعات أي عميل لبدء معاملة.");
  cell.colSpan=5;
  tr.append(cell);
  rows.append(tr);
 }
}
$("followupFilter").addEventListener("change",renderFollowUp);

function renderSales(){
 renderFollowUp();
 const panel=$("salesFlow");
 panel.hidden=!selectedLead;
 if(!selectedLead)return;
 $("salesCustomer").textContent="سجل مبيعات "+selectedLead[0];
 const stock=companies[company].stock;
 const sku=$("quoteSku").value;
 $("quoteSku").replaceChildren(...stock.map(([name,code])=>new Option(name,code)));
 if(stock.some(item=>item[1]===sku))$("quoteSku").value=sku;
 const list=$("salesOrders");
 clear(list);
 const sales=salesByLead.get(selectedLead)||[];
 if(!sales.length)list.append(make("p","لا توجد عروض أسعار لهذا العميل."));
 for(const sale of sales){
  const totals=salesTotals(sale);
  const article=make("article",undefined,"sale-record");
  const stockItem=stock.find(item=>item[1]===sale.sku);
  const title=sale.confirmed?"أمر بيع":"عرض سعر";
  article.id="sale-record-"+sale.id;
  article.tabIndex=-1;
  article.append(make("h4",title+" "+sale.id+" · "+stockItem[0]));
  article.append(row("قيمة الطلب · "+sale.quantity+" وحدة",money(totals.total/100)));
  if(!sale.confirmed){
   article.append(saleAction(sale,"confirm","اعتماد وتحويل إلى أمر بيع"));
   list.append(article);
   continue;
  }
  article.append(row("الكمية المسلّمة",totals.delivered+" / "+sale.quantity));
  article.append(row("الكمية المفوترة",totals.invoiced+" / "+sale.quantity));
  article.append(row("المحصّل",money(totals.paid/100)));
  article.append(row("رصيد الفواتير",money(totals.outstanding/100)));
  for(const delivery of sale.deliveries)article.append(row("تسليم "+sale.id+"-"+delivery.id,delivery.quantity+" وحدة"));
  const available=Math.min(totals.toDeliver,stockItem[2]);
  if(available>0)article.append(saleAction(sale,"deliver","تسجيل تسليم",{max:available}));
  if(!available&&totals.toDeliver>0)article.append(make("p","المخزون المتاح لهذا الصنف نفد."));
  if(totals.toInvoice>0)article.append(saleAction(sale,"invoice","إصدار فاتورة للكميات المسلّمة",{max:totals.toInvoice}));
  for(const invoice of sale.invoices){
   const balance=invoiceBalance(sale,invoice);
   article.append(row("فاتورة "+sale.id+"-"+invoice.id+" · "+invoice.quantity+" وحدة",money(invoice.quantity*sale.unitCents/100)));
   article.append(row("تاريخ الاستحقاق",invoice.dueDate||"غير محدد"));
   article.append(row("المتبقي على الفاتورة",money(balance/100)));
   for(const receipt of sale.receipts.filter(item=>item.invoiceId===invoice.id)){
    article.append(row("سند قبض "+sale.id+"-"+receipt.id,money(receipt.cents/100)));
   }
   if(balance>0)article.append(saleAction(sale,"receive","تسجيل دفعة للفاتورة "+invoice.id,{max:balance/100,invoice}));
  }
  list.append(article);
 }
}

$("salesMessage").tabIndex=-1;
$("closeSales").addEventListener("click",()=>{
 const opener=Array.from($("customersTable").querySelectorAll("button")).find(button=>button.getAttribute("aria-label")==="عرض سجل المبيعات — "+selectedLead?.[0]);
 selectedLead=null;
 renderSales();
 opener?.focus();
});
$("quoteForm").addEventListener("submit",event=>{
 event.preventDefault();
 if(!selectedLead)return;
 const data=new FormData(event.target);
 if(!companies[company].stock.some(item=>item[1]===data.get("sku")))return;
 try {
  const sale=createQuote("S-"+(quoteNumber+1),data.get("sku"),Number(data.get("quantity")),parseCents(data.get("price")));
  quoteNumber++;
  const records=salesByLead.get(selectedLead)||[];
  records.push(sale);
  salesByLead.set(selectedLead,records);
  event.target.reset();
  $("salesMessage").textContent="تم إنشاء عرض السعر.";
  renderSales();
 } catch(error) {
  $("salesMessage").textContent=error.message;
 }
});
function active(){return (paid.length?paid:livePaid).slice(0,5)}
function adNow(){const a=active();return a.length?a[index%a.length]:{headline:"Your Business. Our Vision.",subtitle:"CRM • ERP • Integrated Business Solutions",link:"https://asas360.com",advertiser:"ASAS 360°",format:"motion",house:true}}
function renderAd(){const b=$("adBanner"),a=adNow();clear(b);const text=make("div",undefined,"adcopy");text.append(make("span",a.house?"ASAS 360° • ALWAYS ON":"SPONSORED ADVERTISEMENT","overline"),make("h2",a.headline),make("p",a.subtitle||a.advertiser));if(a.link){const link=make("a","اكتشف المزيد ↗");link.href=httpsOnly(a.link)||"https://asas360.com";link.target="_blank";link.rel="noopener noreferrer sponsored";text.append(link)}b.append(text);if(a.format==="video"&&a.video&&!reduced){const v=make("video");v.src=a.video;v.autoplay=!paused;v.muted=true;v.loop=true;v.playsInline=true;v.preload="metadata";b.prepend(v);if(!paused)v.play().catch(()=>{});const btn=make("button","تشغيل الصوت","sound");btn.addEventListener("click",()=>{v.muted=!v.muted;btn.textContent=v.muted?"تشغيل الصوت":"كتم الصوت"});b.append(btn)}const n=active().length;$("adStatus").textContent=n?"إعلان "+(index%n+1)+" من "+n+(paid.length?" • تجربة محلية":" • Cloudflare"):"إعلان ASAS 360° الاحتياطي";updateAdPause()}
function updateAdPause(){
 const button=$("adPause");
 $("adBanner").classList.toggle("ad-paused",paused);
 button.textContent=paused?"▶":"Ⅱ";
 button.setAttribute("aria-label",paused?"استئناف الإعلان":"إيقاف الإعلان مؤقتاً");
}
function rotation(){clearInterval(timer);timer=null;if(!paused&&!reduced&&active().length>1){timer=setInterval(()=>{if(view==="home"&&!document.hidden){index=(index+1)%active().length;renderAd()}},12000)}}
function next(n){if(active().length)index=(index+n+active().length)%active().length;renderAd();rotation()}
function renderCampaigns(){const list=$("adCampaigns");clear(list);$("adCount").textContent=paid.length+" / 5";if(!paid.length)list.append(make("p","لا يوجد معلنون؛ يتم عرض إعلان ASAS 360° تلقائياً."));paid.forEach((a,i)=>{const r=make("div",undefined,"line"),btn=make("button","حذف");btn.className="mainbtn";btn.type="button";btn.addEventListener("click",()=>{if(role!=="platform")return;paid.splice(i,1);index=0;renderCampaigns();renderAd();rotation()});r.append(make("span",a.advertiser),btn);list.append(r)})}
function httpsOnly(value){if(!value)return "";try{const u=new URL(value);return u.protocol==="https:"?u.href:null}catch{return null}}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>screen(b.dataset.view)));
$("company").addEventListener("change",e=>{company=e.target.value;selectedLead=null;$("quoteForm").reset();$("salesMessage").textContent="";render()});
$("role").addEventListener("change",e=>{role=e.target.value;render()});
$("customerSearch").addEventListener("input",renderLeads);
$("addCustomer").addEventListener("click",()=>{if($("addCustomer").disabled)return;const name=prompt("اسم العميل التجريبي:");if(!name||!name.trim())return;companies[company].leads.unshift([name.trim().slice(0,90),"عميل جديد",0,"موظف"]);render()});
$("adPrev").addEventListener("click",()=>next(-1));$("adNext").addEventListener("click",()=>next(1));$("adPause").addEventListener("click",()=>{paused=!paused;
 const video=$("adBanner").querySelector("video");
 if(video){
  if(paused)video.pause();
  else video.play().catch(()=>{});
 }
 updateAdPause();rotation()});
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