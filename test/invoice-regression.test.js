const test = require('node:test');
const assert = require('node:assert/strict');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

function orderFixture(items, coupon = '') {
  return { id: 43, coupon, items };
}

test('invoice uses the configured HSN GST slab for each item', () => {
  const items = [
    { id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 },
    { id: 2, name: 'Ghee', hsn: '0405', price: 100, qty: 1 },
    { id: 3, name: 'Tea', hsn: '0902', price: 100, qty: 1 }
  ];
  const figures = invoice.computeInvoiceFigures(orderFixture(items));

  assert.deepEqual(figures.rows.map((row) => row.gstPercent), [5, 12, 18]);
  assert.deepEqual(figures.rows.map((row) => row.lineTax), [5, 12, 18]);
  assert.equal(figures.tax, 35);
});

test('invoice applies a percentage coupon to subtotal, then calculates GST on discounted value', () => {
  const items = [{ id: 4, name: 'Rice', hsn: '1006', price: 600, qty: 1 }];
  const figures = invoice.computeInvoiceFigures(orderFixture(items, 'WELCOME'));

  assert.equal(figures.discount, 30);
  assert.equal(figures.tax, 28.5);
  assert.equal(figures.total, 598.5);
});

test('invoice honors the SAVE10 maximum discount', () => {
  const items = [{ id: 5, name: 'Rice', hsn: '1006', price: 2000, qty: 1 }];
  const figures = invoice.computeInvoiceFigures(orderFixture(items, 'SAVE10'));

  assert.equal(figures.discount, 150);
  assert.equal(figures.tax, 92.5);
  assert.equal(figures.total, 1942.5);
});

test('invoice totals and GST breakdown match checkout pricing for mixed HSN items with a capped coupon', () => {
  const items = [
    { id: 6, name: 'Rice', hsn: '1006', price: 2000, qty: 1 },
    { id: 7, name: 'Ghee', hsn: '0405', price: 450, qty: 1 },
    { id: 8, name: 'Tea', hsn: '0902', price: 140, qty: 1 }
  ];
  const order = orderFixture(items, 'SAVE10');
  const checkout = pricing.computeTotals(order.items, order.coupon);
  const billedOrder = { ...order, total: checkout.total };
  const figures = invoice.computeInvoiceFigures(billedOrder);

  assert.equal(figures.subtotal, checkout.subtotal);
  assert.equal(figures.discount, checkout.discount);
  assert.equal(figures.tax, checkout.tax);
  assert.equal(figures.cgst, checkout.cgst);
  assert.equal(figures.sgst, checkout.sgst);
  assert.equal(figures.total, checkout.total);
  assert.deepEqual(
    figures.rows.map(({ gstPercent, lineTax }) => ({ gstPercent, lineTax })),
    checkout.lines.map(({ gstPercent, tax: lineTax }) => ({ gstPercent, lineTax }))
  );
});
