import test from "node:test";
import assert from "node:assert/strict";
import {createQuote, salesTotals, advanceSale, invoiceBalance, parseCents, salesFollowUp} from "../assets/sales-flow.mjs";

test("partial deliveries, invoices and receipts share a single order", () => {
 const sale=createQuote("S-1","SKU1",10,parseCents("125.50"));
 const stock=[["Product","SKU1",8]];
 assert.throws(()=>advanceSale(sale,stock,"deliver",1));
 advanceSale(sale,stock,"confirm");
 assert.throws(()=>advanceSale(sale,stock,"confirm"));
 assert.throws(()=>advanceSale(sale,stock,"deliver",9));
 assert.equal(stock[0][2],8);
 advanceSale(sale,stock,"deliver",6);
 assert.equal(stock[0][2],2);
 assert.throws(()=>advanceSale(sale,stock,"invoice",7));
 advanceSale(sale,stock,"invoice",3);
 advanceSale(sale,stock,"invoice",3);
 assert.throws(()=>advanceSale(sale,stock,"invoice",1));
 assert.throws(()=>advanceSale(sale,stock,"receive",37651,{invoiceId:1}));
 advanceSale(sale,stock,"receive",10000,{invoiceId:1});
 assert.equal(invoiceBalance(sale,sale.invoices[0]),27650);
 assert.equal(invoiceBalance(sale,sale.invoices[1]),37650);
 assert.deepEqual(salesTotals(sale),{
  delivered:6,invoiced:6,paid:10000,toDeliver:4,toInvoice:0,outstanding:65300,total:125500
 });
});

test("sub-cent, invalid and oversized quotes cannot enter the workflow", () => {
 assert.throws(()=>createQuote("S-1","SKU",1,parseCents("0.001")));
 assert.throws(()=>createQuote("S-1","SKU",1.5,100));
 assert.throws(()=>createQuote("S-1","SKU",100001,100));
 assert.equal(parseCents("0.29"),29);
});

test("follow-up separates overdue balances, unbilled deliveries and stock shortages", () => {
 const sale=createQuote("S-1","SKU1",10,12500);
 const stock=[["Product","SKU1",8]];
 const records=[{lead:["Customer"],sale}];
 const actions=()=>salesFollowUp(records,stock,"2026-11-18");
 assert.deepEqual(actions().map(item=>item.type),["quote"]);
 advanceSale(sale,stock,"confirm");
 advanceSale(sale,stock,"deliver",8);
 assert.throws(()=>advanceSale(sale,stock,"invoice",3,{dueDate:"2026-02-30"}));
 assert.equal(sale.invoices.length,0);
 advanceSale(sale,stock,"invoice",3,{dueDate:"2026-11-17"});
 advanceSale(sale,stock,"invoice",2,{dueDate:"2026-11-18"});
 advanceSale(sale,stock,"receive",12500,{invoiceId:1});
 assert.deepEqual(actions().map(item=>item.type),["overdue","receipt","invoice","stock"]);
 assert.equal(actions()[0].balance,25000);
 assert.equal(actions()[2].quantity,3);
 assert.equal(actions()[3].quantity,2);
 advanceSale(sale,stock,"receive",25000,{invoiceId:1});
 assert.equal(actions().some(item=>item.type==="overdue"),false);
});
