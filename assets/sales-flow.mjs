const MAX_UNITS = 100000;

function positiveInteger(value, max) {
 return Number.isSafeInteger(value) && value > 0 && value <= max;
}

export function createQuote(id, sku, quantity, unitCents) {
 if(!sku || !positiveInteger(quantity, MAX_UNITS) || !positiveInteger(unitCents, 100000000)) {
  throw Error("أدخل صنفاً وكمية وسعر وحدة صالحين.");
 }
 return {id, sku, quantity, unitCents, confirmed:false, deliveries:[], invoices:[], receipts:[]};
}

export function salesTotals(sale) {
 const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);
 const delivered = sum(sale.deliveries, "quantity");
 const invoiced = sum(sale.invoices, "quantity");
 const paid = sum(sale.receipts, "cents");
 return {
  delivered, invoiced, paid,
  toDeliver: sale.quantity - delivered,
  toInvoice: delivered - invoiced,
  outstanding: invoiced * sale.unitCents - paid,
  total: sale.quantity * sale.unitCents
 };
}

export function invoiceBalance(sale, invoice) {
 return invoice.quantity * sale.unitCents - sale.receipts
  .filter(receipt => receipt.invoiceId === invoice.id)
  .reduce((total, receipt) => total + receipt.cents, 0);
}

export function advanceSale(sale, stock, action, amount, invoiceId) {
 const totals = salesTotals(sale);
 if(action === "confirm" && !sale.confirmed) {
  sale.confirmed = true;
  return;
 }
 if(!sale.confirmed) throw Error("اعتمد عرض السعر أولاً.");
 if(action === "deliver") {
  const item = stock.find(entry => entry[1] === sale.sku);
  if(!item || !positiveInteger(amount, Math.min(item[2], totals.toDeliver))) {
   throw Error("كمية التسليم تتجاوز المخزون المتاح أو المتبقي من الطلب.");
  }
  sale.deliveries.push({id:sale.deliveries.length + 1, quantity:amount});
  item[2] -= amount;
 } else if(action === "invoice") {
  if(!positiveInteger(amount, totals.toInvoice)) throw Error("فوْتر فقط الكمية المسلّمة التي لم تُفوتر بعد.");
  sale.invoices.push({id:sale.invoices.length + 1, quantity:amount});
 } else if(action === "receive") {
  const invoice = sale.invoices.find(entry => entry.id === invoiceId);
  if(!invoice || !positiveInteger(amount, invoiceBalance(sale, invoice))) {
   throw Error("مبلغ التحصيل يتجاوز رصيد الفاتورة.");
  }
  sale.receipts.push({id:sale.receipts.length + 1, invoiceId, cents:amount});
 } else {
  throw Error("هذه العملية غير متاحة في الحالة الحالية.");
 }
}

export function parseCents(value) {
 const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(value).trim());
 if(!match) return NaN;
 return Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
}
