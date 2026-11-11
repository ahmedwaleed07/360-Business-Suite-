const invoiceFields = {name:"الفاتورة", posting_date:"تاريخ القيد", status:"الحالة", currency:"العملة", grand_total:"الإجمالي", outstanding_amount:"المتبقي"};
const views = {
  accounts: {label:"دليل الحسابات", type:"Account", sort:"name", fields:{name:"الحساب", parent_account:"الحساب الرئيسي", root_type:"التصنيف", account_currency:"العملة"}},
  orders: {label:"أوامر البيع", type:"Sales Order", date:"transaction_date", fields:{name:"الأمر", transaction_date:"التاريخ", customer:"العميل", status:"الحالة", currency:"العملة", grand_total:"الإجمالي"}},
  procurement: {label:"أوامر الشراء", type:"Purchase Order", date:"transaction_date", fields:{name:"الأمر", transaction_date:"التاريخ", supplier:"المورّد", status:"الحالة", currency:"العملة", grand_total:"الإجمالي"}},
  sales: {label:"فواتير المبيعات", type:"Sales Invoice", fields:{...invoiceFields, customer:"العميل"}},
  purchases: {label:"فواتير المشتريات", type:"Purchase Invoice", fields:{...invoiceFields, supplier:"المورّد"}},
  payments: {label:"القبض والصرف", type:"Payment Entry", fields:{name:"السند", posting_date:"تاريخ القيد", payment_type:"النوع", party:"الطرف", paid_amount:"المدفوع", paid_from_account_currency:"عملة الحساب المدفوع منه", received_amount:"المستلم", paid_to_account_currency:"عملة الحساب المستلم"}},
  journals: {label:"القيود اليومية", type:"Journal Entry", fields:{name:"القيد", posting_date:"تاريخ القيد", voucher_type:"نوع المستند", docstatus:"حالة المستند"}},
  ledger: {label:"دفتر الأستاذ", type:"GL Entry", fields:{posting_date:"تاريخ القيد", account:"الحساب", voucher_type:"نوع المستند", voucher_no:"المستند", debit:"مدين بعملة الشركة", credit:"دائن بعملة الشركة"}}
};

export function erpSettings(env) {
  if (!env.ERP_ORIGIN || !env.ERP_TOKEN || !env.ERP_COMPANY || !env.ERP_ORGANIZATION_ID) return null;
  try {
    const url = new URL(env.ERP_ORIGIN);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return { origin:url.origin, token:env.ERP_TOKEN, company:env.ERP_COMPANY, organizationId:env.ERP_ORGANIZATION_ID };
  } catch {
    return null;
  }
}

export function customerView(view) {
  return ["orders","sales","payments"].includes(view);
}

async function readRecords(settings, view, filters, fields, offset, limit, fetcher = fetch) {
  const url = new URL("/api/resource/" + encodeURIComponent(view.type), settings.origin);
  url.search = new URLSearchParams({
    filters: JSON.stringify([["company", "=", settings.company], ...filters]),
    fields: JSON.stringify([...new Set([...fields, "name", "company"])]),
    order_by: view.sort === "name" ? "name asc" : (view.date || "posting_date") + " desc, name desc",
    limit_start: String(offset),
    limit_page_length: String(limit)
  });
  const response = await fetcher(url, {
    headers: { Accept:"application/json", Authorization:"token " + settings.token },
    redirect:"error",
    signal:AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error("erp_request_failed");
  const {data} = await response.json();
  if (!Array.isArray(data) || data.length > limit || data.some(row => row?.company !== settings.company)) {
    throw new Error("erp_response_scope_invalid");
  }
  return data;
}

export async function resolveErpCustomer(settings, source, documentId) {
  if (!["orders","sales"].includes(source)) return null;
  const rows = await readRecords(settings, views[source], [["name","=",documentId],["docstatus","=",1]], ["customer","docstatus"], 0, 1);
  const row = rows[0];
  return row?.name === documentId && row.docstatus === 1 && typeof row.customer === "string" && row.customer.trim() ? row.customer : null;
}

export async function readAccounting(settings, viewId, offset, fetcher = fetch, customer = null) {
  if (!Object.hasOwn(views, viewId) || (customer && !customerView(viewId))) throw new RangeError("unknown_view");
  const view = views[viewId];
  const fields = Object.keys(view.fields);
  const filters = [];
  if (viewId === "ledger") filters.push(["is_cancelled", "=", 0]);
  if (customer && viewId === "payments") filters.push(["party_type","=","Customer"],["party","=",customer]);
  else if (customer) filters.push(["customer","=",customer]);
  const data = await readRecords(settings, view, filters, viewId === "payments" && customer ? [...fields,"party_type"] : fields, offset, 51, fetcher);
  if (customer && data.some(row => viewId === "payments" ? row.party_type !== "Customer" || row.party !== customer : row.customer !== customer)) {
    throw new Error("erp_response_customer_invalid");
  }
  return {
    columns:Object.values(view.fields),
    rows:data.slice(0, 50).map(row => fields.map(field => row[field] ?? "")),
    hasNext:data.length > 50,
    workspaceUrl:settings.origin + "/app/accounting"
  };
}

export const accountingPage = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>360° Business Suite | المحاسبة</title>
<style>
  body { max-width: 66rem; margin: 2rem auto; padding: 0 1rem; font: 1rem/1.6 system-ui, sans-serif; color: #242030 }
  header { text-align: center }
  header strong, header span { display: block }
  header strong { font-size: 2rem; color: #7022bb }
  select, button { min-height: 44px; font: inherit; padding-inline: .5rem }
  .controls { display: flex; gap: .65rem 1rem; flex-wrap: wrap; align-items: center }
  .table { overflow: auto }
  table { width: 100%; border-collapse: collapse }
  th, td { text-align: start; padding: .6rem; border-bottom: 1px solid #e7e3ee; min-width: 6rem }
</style>
<script src="/pilot/accounting.js" defer></script>
</head>
<body>
<header dir="ltr"><strong>360°</strong><span>BUSINESS SUITE</span></header>
<nav aria-label="التنقل"><a href="/pilot/">إدارة العملاء</a> · <a href="/cdn-cgi/access/logout">تسجيل الخروج</a></nav>
<main>
  <h1>المحاسبة</h1>
  <p id="accounting-status" role="status">جارٍ تحميل الشركات…</p>
  <section id="accounting" hidden>
    <div class="controls">
      <label>الشركة <select id="company"></select></label>
      <label>السجل <select id="view">${Object.entries(views).map(([key, view]) => `<option value="${key}">${view.label}</option>`).join("")}</select></label>
      <a id="erp-workspace" hidden target="_blank" rel="noopener noreferrer">العمليات والتقارير في ERPNext</a>
    </div>
    <div class="table"><table aria-label="السجل المحاسبي"><thead id="columns"></thead><tbody id="records"></tbody></table></div>
    <div class="controls">
      <button id="prev" type="button" disabled>السابق</button>
      <button id="next" type="button" disabled>التالي</button>
    </div>
  </section>
</main>
</body>
</html>`;

export const accountingScript = `"use strict";
const element = id => document.getElementById(id);
const company = element("company");
const view = element("view");
const message = element("accounting-status");
const prev = element("prev");
const next = element("next");
const workspace = element("erp-workspace");
const header = element("columns");
const body = element("records");
const params = new URLSearchParams(location.search);
const crmAccount = params.get("crmAccount");
let offset = 0;
let pending;

async function get(path, signal) {
  const response = await fetch(path, {signal, redirect:"error", cache:"no-store"});
  if (response.status === 401) throw new Error("انتهت الجلسة. حدّث الصفحة وسجّل الدخول.");
  if (response.status === 404) {
    const error = await response.json();
    throw new Error(error.error === "crm_account_not_linked" ? "اربط سجل العميل من صفحة إدارة العملاء أولاً." : "المحاسبة غير مفعّلة لهذه الشركة.");
  }
  if (response.status === 503) throw new Error("لم يُستكمل إعداد اتصال ERPNext.");
  if (!response.ok) throw new Error("تعذّر تحميل البيانات من النظام. حاول مرة أخرى.");
  return response.json();
}

async function load() {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  prev.disabled = next.disabled = true;
  workspace.hidden = true;
  header.replaceChildren();
  body.replaceChildren();
  message.textContent = "جارٍ تحميل السجل…";
  try {
    const path = "/api/organizations/" + encodeURIComponent(company.value) + "/accounting/" + view.value;
    const query = new URLSearchParams({offset});
    if (crmAccount) query.set("crmAccount", crmAccount);
    const data = await get(path + "?" + query, controller.signal);
    if (controller.signal.aborted) return;
    const titles = header.insertRow();
    for (const label of data.columns) {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = label;
      titles.append(cell);
    }
    for (const values of data.rows) {
      const row = body.insertRow();
      for (const value of values) row.insertCell().textContent = value;
    }
    workspace.href = data.workspaceUrl;
    workspace.hidden = false;
    prev.disabled = offset === 0;
    next.disabled = !data.hasNext;
    message.textContent = data.rows.length ? "" : "لا توجد سجلات في هذه الصفحة.";
  } catch (error) {
    if (!controller.signal.aborted) {
      prev.disabled = offset === 0;
      message.textContent = error.message;
    }
  }
}

for (const control of [company, view]) control.addEventListener("change", () => { offset = 0; load(); });
prev.addEventListener("click", () => { offset -= 50; load(); });
next.addEventListener("click", () => { offset += 50; load(); });

async function start() {
  try {
    const { organizations } = await get("/api/organizations");
    const allowed = organizations.filter(org => ["owner", "admin"].includes(org.role) && (!crmAccount || org.id === params.get("company")));
    if (crmAccount) {
      document.querySelector("h1").textContent = "معاملات عميل CRM";
      for (const option of Array.from(view.options)) {
        if (!["orders","sales","payments"].includes(option.value)) option.remove();
      }
    }
    if (!allowed.length) {
      message.textContent = "لا توجد شركة لديك صلاحية عرض محاسبتها.";
      return;
    }
    for (const org of allowed) company.add(new Option(org.name, org.id));
    element("accounting").hidden = false;
    await load();
  } catch (error) {
    message.textContent = error.message;
  }
}
start();`;
