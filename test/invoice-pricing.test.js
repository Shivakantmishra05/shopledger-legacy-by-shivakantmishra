const test = require('node:test');
const assert = require('node:assert/strict');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');
const coupons = require('../lib/coupons');
const tax = require('../lib/tax');

// These are request-like in-memory order lines. The order route stores HSN but
// does not copy a gstRate onto each line.
function orderFixture(items, coupon = '') {
  return {
    id: 42,
    customer: 'In-memory customer',
    paymentMode: 'cash',
    status: 'completed',
    coupon,
    items
  };
}

test('pricing applies the configured HSN slab to post-discount taxable value', () => {
  const items = [{ id: 1, name: 'Rice', hsn: '1006', price: 640, qty: 1 }];
  const totals = pricing.computeTotals(items, '');

  assert.equal(tax.getRateForItem(items[0]), 0.05);
  assert.equal(totals.tax, 32);
  assert.equal(totals.cgst, 16);
  assert.equal(totals.sgst, 16);
  assert.equal(totals.total, 672);
});

test('invoice uses the HSN slab for GST and matches the checkout total', () => {
  const order = orderFixture([{ id: 1, name: 'Rice', hsn: '1006', price: 640, qty: 1 }]);
  const billed = pricing.computeTotals(order.items, order.coupon);
  const invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.equal(billed.tax, 32); // 5% HSN slab used by the order pricing path
  assert.equal(invoiceFigures.rows[0].gstPercent, 5);
  assert.equal(invoiceFigures.tax, billed.tax);
  assert.equal(invoiceFigures.total, billed.total);
});

test('coupon validation and order pricing honor minimum subtotal and max discount', () => {
  const lowSubtotal = 299;
  assert.deepEqual(coupons.validate('FLAT50', lowSubtotal), {
    valid: false,
    error: 'Coupon FLAT50 requires a minimum order subtotal of ₹300'
  });
  assert.equal(coupons.calculateDiscount(2000, 'SAVE10'), 150);

  const totals = pricing.computeTotals(
    [{ id: 2, name: 'Rice', hsn: '1006', price: 2000, qty: 1 }],
    'SAVE10'
  );
  assert.equal(totals.discount, 150);
  assert.equal(totals.tax, 92.5); // 5% on the ₹1,850 post-discount base
  assert.equal(totals.total, 1942.5);
});

test('invoice honors coupon discount caps and matches checkout GST and total', () => {
  const order = orderFixture(
    [{ id: 2, name: 'Rice', hsn: '1006', price: 2000, qty: 1 }],
    'SAVE10'
  );
  const billed = pricing.computeTotals(order.items, order.coupon);
  const invoiceFigures = invoice.computeInvoiceFigures(order);

  assert.equal(billed.discount, 150); // SAVE10 maxDiscount
  assert.equal(billed.tax, 92.5); // tax on discounted HSN taxable amount
  assert.equal(billed.total, 1942.5);

  assert.equal(invoiceFigures.rows[0].gstPercent, 5);
  assert.equal(invoiceFigures.tax, billed.tax);
  assert.equal(invoiceFigures.discount, billed.discount);
  assert.equal(invoiceFigures.total, billed.total);
});

test('tax splits a rounded total equally into CGST and SGST with remainder in SGST', () => {
  assert.deepEqual(tax.splitCgstSgst(1.01), { cgst: 0.51, sgst: 0.5 });
});
