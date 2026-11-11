export const pilotPage = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>360° Business Suite | CRM</title>
  <style>
    body { max-width: 54rem; margin: 2rem auto; padding: 0 1rem; font: 1rem/1.6 system-ui, sans-serif; color: #242030 }
    header { text-align: center }
    header strong, header span { display: block }
    header strong { font-size: 2rem; color: #7022bb }
    label { display: block; margin-block: .5rem }
    input, select, button { font: inherit; max-width: 100%; padding: .35rem }
    table { width: 100%; border-collapse: collapse; text-align: start }
    th, td { text-align: start; padding: .5rem; border-block-end: 1px solid #e7e3ee; overflow-wrap: anywhere }
  </style>
  <script src="/pilot/clients.js" defer></script>
</head>
<body>
  <header dir="ltr"><strong>360°</strong><span>BUSINESS SUITE</span></header>
  <main>
    <h1>إدارة العملاء</h1>
    <p>بيئة الاختبار الداخلية</p>
    <nav aria-label="التنقل"><a href="/pilot/accounting">المحاسبة</a> · <a href="/cdn-cgi/access/logout">تسجيل الخروج</a></nav>
    <p id="status" role="status"></p>
    <section id="workspace" hidden>
      <label>الشركة <select id="organization"></select></label>
      <form id="account-form" hidden>
        <label>اسم العميل <input id="name" required maxlength="180"></label>
        <label>المرحلة <select id="stage">
          <option value="lead">عميل محتمل</option><option value="qualified">مؤهل</option>
          <option value="proposal">عرض سعر</option><option value="negotiation">تفاوض</option>
          <option value="won">تم الاتفاق</option><option value="lost">لم يتم الاتفاق</option>
        </select></label>
        <button id="save" type="submit">إضافة العميل</button>
      </form>
      <table><thead><tr><th scope="col">الاسم</th><th scope="col">المرحلة</th><th scope="col">معاملات ERP</th></tr></thead><tbody id="accounts"></tbody></table>
    </section>
  </main>
</body>
</html>`;

export const pilotScript = `"use strict";
const status = document.getElementById("status");
const organization = document.getElementById("organization");
const accounts = document.getElementById("accounts");
const form = document.getElementById("account-form");
const stage = document.getElementById("stage");
const stages = new Map(Array.from(stage.options, option => [option.value, option.textContent]));
const save = document.getElementById("save");
let memberships = [];
let requestNumber = 0;

async function api(path, options) {
  const response = await fetch(path, { ...options, cache: "no-store", redirect: "error" });
  if (response.status === 401) throw new Error("انتهت الجلسة. حدّث الصفحة وسجّل الدخول.");
  if (response.status === 403 || response.status === 404) throw new Error("تعذّر الوصول. تحقّق من صلاحيات الشركة.");
  if (response.status === 409) throw new Error("هذا الحساب أو عميل ERPNext مرتبط بسجل آخر.");
  if (response.status === 503) throw new Error("لم يُستكمل إعداد اتصال ERPNext.");
  if (!response.ok) throw new Error("تعذّر إكمال العملية. حاول مرة أخرى.");
  return response.json();
}

function accountPath() {
  return "/api/organizations/" + encodeURIComponent(organization.value) + "/crm/accounts";
}

function showError(error) {
  status.textContent = error instanceof TypeError ? "تعذّر الاتصال. حدّث الصفحة للتحقق من الجلسة." : error.message;
}

function showErpActions(cell, account) {
  const company = organization.value;
  const query = new URLSearchParams({ company, crmAccount: account.id });
  const transactions = document.createElement("a");
  transactions.href = "/pilot/accounting?" + query;
  transactions.textContent = "عرض المعاملات";
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "ربط عميل ERPNext";
  const linkForm = document.createElement("form");
  const sourceLabel = document.createElement("label");
  sourceLabel.textContent = "نوع المستند ";
  const source = document.createElement("select");
  source.add(new Option("أمر بيع", "orders"));
  source.add(new Option("فاتورة مبيعات", "sales"));
  sourceLabel.append(source);
  const idLabel = document.createElement("label");
  idLabel.textContent = "رقم المستند المعتمد ";
  const input = document.createElement("input");
  input.required = true;
  input.maxLength = 140;
  idLabel.append(input);
  const submit = document.createElement("button");
  submit.textContent = "حفظ الربط";
  const feedback = document.createElement("span");
  feedback.setAttribute("role", "status");
  linkForm.append(sourceLabel, idLabel, submit, feedback);
  details.append(summary, linkForm);
  cell.append(transactions, details);
  linkForm.addEventListener("submit", async event => {
    event.preventDefault();
    submit.disabled = true;
    feedback.textContent = " جارٍ التحقق…";
    try {
      await api("/api/organizations/" + encodeURIComponent(company) + "/crm/accounts/" + encodeURIComponent(account.id) + "/erp-link", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({source: source.value, documentId: input.value})
      });
      linkForm.reset();
      feedback.textContent = " تم حفظ الربط.";
    } catch (error) {
      feedback.textContent = " " + error.message;
    } finally {
      submit.disabled = false;
    }
  });
}

async function loadAccounts() {
  const current = ++requestNumber;
  accounts.replaceChildren();
  form.hidden = true;
  status.textContent = "جارٍ تحميل العملاء…";
  try {
    const result = await api(accountPath());
    if (current !== requestNumber) return;
    const membership = memberships.find(item => item.id === organization.value);
    for (const account of result.accounts) {
      const row = accounts.insertRow();
      row.insertCell().textContent = account.name;
      row.insertCell().textContent = stages.get(account.stage) || account.stage;
      const erpCell = row.insertCell();
      if (["owner","admin"].includes(membership?.role)) showErpActions(erpCell, account);
    }
    form.hidden = !["owner", "admin", "manager", "sales"].includes(membership?.role);
    status.textContent = result.accounts.length ? "" : "لا توجد سجلات عملاء لهذه الشركة.";
  } catch (error) {
    if (current === requestNumber) showError(error);
  }
}

organization.addEventListener("change", () => {
  form.reset();
  loadAccounts();
});
form.addEventListener("submit", async event => {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  if (!name) {
    status.textContent = "أدخل اسم العميل.";
    return;
  }
  save.disabled = true;
  organization.disabled = true;
  try {
    await api(accountPath(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stage: stage.value })
    });
    form.reset();
    await loadAccounts();
  } catch (error) {
    showError(error);
  } finally {
    save.disabled = false;
    organization.disabled = false;
  }
});

async function start() {
  try {
    ({ organizations: memberships } = await api("/api/organizations"));
    if (!memberships.length) {
      status.textContent = "حسابك غير مرتبط بشركة نشطة.";
      return;
    }
    for (const item of memberships) organization.add(new Option(item.name, item.id));
    document.getElementById("workspace").hidden = false;
    await loadAccounts();
  } catch (error) {
    showError(error);
  }
}
start();`;
