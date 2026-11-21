# ShopLedger

## Current stack

- Node.js with CommonJS modules.
- Express 4 serves the API and static browser UI; `body-parser` parses JSON request bodies.
- Browser UI is plain HTML, CSS, and JavaScript.
- Application data is stored in `data/db.json` through synchronous filesystem reads and writes in `lib/store.js`.
- Runtime dependencies declared in `package.json`: `express` and `body-parser`.

## Module map

- `server.js`, `config.js`: app setup, route mounting, invoice page, runtime and shop settings.
- `public/`: POS, order history, Khata, and audit UI.
- `routes/products.js`: product catalog and coupons.
- `routes/orders.js`: order reads, placement, and cancellation.
- `routes/customers.js`: customer/settlement reads and Khata settlements.
- `routes/reports.js`: dashboard, GST reconciliation, pricing preview, and data export.
- `lib/orders.js`, `lib/inventory.js`: order lifecycle and stock handling.
- `lib/pricing.js`, `lib/coupons.js`, `lib/tax.js`: subtotal, discount, and GST calculations.
- `lib/ledger.js`: customer credit balances and settlements.
- `lib/reports.js`, `lib/invoice.js`: dashboard/reconciliation calculations and printable invoice rendering.
- `lib/store.js`, `lib/dates.js`: JSON persistence, audit entries, and date helpers.
- `data/db.json`: checked-in application data.

## Commands

- `npm start` — starts the Express app on `PORT`, or port 3000 when `PORT` is unset.
- `npm test` — currently exits with “no test specified”; no test suite is configured.

## Change rules

- Write characterization tests before changing behaviour.
- Change only the module the ticket is about.
- Tests must never read or write `data/db.json`; use isolated temporary data or test doubles.
- Do not add dependencies.
