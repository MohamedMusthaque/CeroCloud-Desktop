<div align="center">

# NexoraCloud

**Offline-first desktop Point of Sale and Inventory Management**

[![Version](https://img.shields.io/badge/version-1.4.0-blue.svg)](changelog.md)
[![License: MIT + Commons Clause](https://img.shields.io/badge/License-MIT%20%2B%20Commons%20Clause-orange.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

*A cross-platform desktop app for small businesses to run sales, stock, purchases, clients, capital, accounts and reports, with all data stored locally on the machine. No server, no subscription, no internet required.*

[Features](#features) • [Getting started](#getting-started) • [Usage](#usage) • [Project structure](#project-structure) • [Building](#building-installers) • [License](#license)

</div>

---

## Overview

NexoraCloud keeps everything in a local SQLite database on the user's computer. It works fully offline, so a shop can keep selling when the connection drops, and its data never leaves the machine unless the user exports or backs it up.

This repository is a fork of [CeroCloud/CeroCloud-Desktop](https://github.com/CeroCloud/CeroCloud-Desktop). On top of the upstream app it adds:

- **Full English translation** alongside Spanish, switchable at runtime
- **Local login** with a first-run admin setup wizard, role-based per-page access control and user management
- **Category management**, with renames and deletes synced to products
- **Credit and cheque payments**, with optional per-client credit limits
- **Purchases**: supplier orders, advance payments, goods receiving and supplier accounts
- **Goods Received Notes (GRN)** for goods bought from clients, suppliers or walk-in sellers
- **Expenses**, **savings accounts** and **capital & income** (capital, loans, promised capital, income and withdrawals, including entries on credit and printable credit bills)
- **Accounts**: one ledger per supplier, client, walk-in, capital source or lender, savings account and expense category, with PDF and Excel reports
- **Business Zakat** calculator built on the business's own records, with PDF and Excel reports
- **Stock card** (every stock movement), internal barcodes and decimal quantities
- **Record pages** for every product, client, supplier, order, GRN, expense and capital entry, with audit details
- **NIC attachments** for clients and suppliers, and a movable **data folder**
- **More currencies** (LKR, INR, MYR, SGD, in addition to GTQ, USD, EUR, MXN) and thousands separators on every amount
- **Editable cart quantities** and a `ton` unit of measure
- **Cross-platform `Ctrl` shortcuts** and a single-instance lock

## Features

### Point of Sale
- Multiple open bills in tabs, so several customers can be served at once
- Fast product search by name, code or category (`F2`)
- Editable quantities directly in the cart
- Payment by cash (with change calculation), card, transfer, cheque (number and bank printed on the invoice), credit or other; each method can be enabled or disabled in Settings
- **Credit sales** for registered clients, optionally checked against the client's credit limit and outstanding balance
- Amount fields show thousands separators as you type (`1,250,000.00`)
- Configurable tax (included or added), discounts, and an optional required customer name
- Printable invoices in **A4** or **80 mm thermal ticket** format, with custom prefix, numbering, header/footer images and disclaimer

### Inventory
- Product catalog with code, barcode, category, supplier, image, cost, price, stock, minimum stock and unit (unit, ton, kg, g, l, ml, m, box, package); decimal quantities for weighed or measured goods
- Internal barcodes generated automatically when a product has none
- **Categories** page: create, rename and delete categories; changes propagate to linked products
- Low-stock alerts with a configurable threshold
- **Stock card**: every stock change (sale, cancellation, purchase, GRN, capital goods, adjustment, import) with the stock before and after, the user and a link to the record that caused it
- Bulk **import from Excel or CSV** (`.xlsx`, `.xls`, `.csv`) through a guided wizard
- Product image upload

### Clients and suppliers
- Client records with tax ID, contact details, notes, NIC scan and an optional credit limit
- Per-client purchase history, goods bought from the client (GRN) and current credit balance
- Supplier directory linked to products, with NIC scan, orders and the supplier account

### Purchases
- **Purchase orders** to suppliers, editable until the goods arrive; cancel or delete open orders
- **Advance payments** on an order, and payments or refunds on the supplier account
- **Receive goods** against an order: received quantities and costs update stock, and the order's advance plus any credit with the supplier pays for them first
- **Supplier accounts**: paid, refunded, goods received, advances held and the balance (credit in your favour or amount owed)
- **Goods Received Notes (GRN)** for goods bought from a registered client, a registered supplier or a walk-in seller, paid on receipt; printable in A4 or ticket format and cancellable (stock is reversed)

### Expenses and savings
- Expenses by type (rent, utilities, wages …) with date, payment method and description; expense types can be managed
- Savings accounts (employee, personal or other) with deposits, withdrawals and a running balance

### Capital & income
- Record **initial and additional capital**, **other income** and **owner withdrawals**
- Capital as money, the owner's **own goods** (added to stock), **goods on credit** from a supplier, **borrowed money** (loans) or **promised capital**
- Capital and income **on credit**: pick an existing source or create one as you type
- Record payments against loans, promises, credit entries and goods on credit; **Repayments** spreads one payment over a source's or supplier's outstanding entries, oldest first
- Every entry taken or given on credit gets a numbered **credit bill** (`CB-000042`) showing payments and the balance due, printable in A4 or ticket format

### Accounts
- One place for every account: **suppliers**, **clients**, **walk-in** sellers and customers (grouped by name), **capital sources and lenders**, **savings accounts** and **expense categories**
- Each account's ledger lists every transaction (orders, goods received, payments, refunds, sales, GRNs, capital, loans, repayments, deposits, expenses) with references, method, user, items and the running balance
- Balances read as *owes you*, *you owe* or *settled*; totals of what is owed to you and what you owe
- Filter by kind, balance, search and date range; with dates, balances are shown as they stood on the end date and each ledger opens with the balance brought forward
- **PDF report** and **Excel report** of the account list (with every transaction of the listed accounts) and of each account's statement, plus CSV export
- Record a supplier payment or a loan repayment straight from the account

### Business Zakat
- Zakat on the **complete business** according to Islamic law (zakat al-tijarah), laid out step by step:
  - **A** money (cash and bank, from the records or a counted balance), **B** trade goods (stock at market value or cost), **C** debts owed to the business, **D** other zakatable wealth, less **E** debts due now
  - **F** nisab (85 g gold or 595 g silver at the price you enter, per gram or per sovereign) and the zakat year (lunar 2.5% or solar 2.577%)
- **Zakat year** filter (From / To): every figure is valued as it stood on the zakat day, stock included (rebuilt from the stock card), and the page shows whether a full year (hawl) has passed
- Each step shows its ruling; figures from the records can be included or left out where the schools differ
- **PDF report** (calculation, rulings applied, signature lines) and **Excel report**
- Settings and amounts entered are kept on the computer

### Record pages
- A detail page for each product, category, client, supplier, purchase order, GRN, expense, savings account, capital entry and user, with related records, links between them and who created or last changed it

### Dashboard and reports
- Dashboard with revenue, sales count, average bill, stock health, 7-day revenue trend and top products
- Reports with profitability analysis (revenue, cost, gross profit, margin), peak activity hours and most profitable products
- **Profit** report (profit and loss with expenses and other income) and **cash flow** (sales collected, credit sales, capital, loans, payments to suppliers and clients, withdrawals)
- **Purchases** report (orders and supplier payments) and reports for expenses, capital, GRNs and stock movements
- One date range filter shared by the report tabs, with client and transaction-type filters
- Transaction list with sale cancellation (stock is restored automatically)
- CSV export of inventory, sales, detailed sales and low-stock items; PDF report generation

### Users and access control
- Local sign-in; passwords are hashed with **scrypt** and a random salt
- Two roles: **Administrator** (every page) and **User** (only the pages granted to them)
- Page-level permissions for Dashboard, Inventory, Sales, Suppliers, Purchases, Clients, Expenses, Savings, Capital, Accounts, Zakat, Reports, Users and Settings, enforced in both the UI and the Electron main process
- New pages (such as Accounts and Zakat) must be ticked for existing non-admin users; each account kind on the Accounts page also needs access to its own page (Purchases, Clients, Capital, Savings, Expenses)
- Safeguards: the last administrator cannot be deleted or demoted, and admins cannot remove their own admin role

### Backups and data safety
- Backup and restore wizards with drag-and-drop restore and a preview of the backup's contents
- Optional **AES-256-GCM** encryption with a PBKDF2-derived key (600,000 iterations)
- `.cerobak` file association on install
- Guided upload to Google Drive or Dropbox, or save to a local or external drive

### Settings and personalization
- Company profile (name, logo, tax ID, address, contact details)
- Language (English / Spanish); light/dark theme toggle in the header
- Currency, tax, POS behaviour (auto-confirm, negative stock, sound effects), payment methods, invoice and inventory options
- Sample data that is localized to the current UI language
- Auto-update via GitHub Releases (`electron-updater`)

## Tech stack

| Layer | Technology |
|-------|------------|
| Desktop runtime | [Electron](https://www.electronjs.org/) 28 |
| Build tool | [Vite](https://vitejs.dev/) 5 with `vite-plugin-electron` |
| UI | [React](https://react.dev/) 18 + [TypeScript](https://www.typescriptlang.org/) 5 |
| Styling | [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide](https://lucide.dev/) icons |
| State | [Zustand](https://zustand-demo.pmnd.rs/), [TanStack Query](https://tanstack.com/query) |
| Forms and validation | React Hook Form + [Zod](https://zod.dev/) |
| Database | [SQLite](https://www.sqlite.org/) via `better-sqlite3` |
| Charts | [Recharts](https://recharts.org/) |
| Documents | jsPDF, html2canvas, SheetJS (`xlsx`), JSZip |
| Packaging and updates | electron-builder, electron-updater |
| Releases | semantic-release with Conventional Commits |

## Getting started

### Prerequisites

- **Node.js** 20 or later (CI uses Node 22)
- **npm** 10 or later
- Build tools for native modules, since `better-sqlite3` is compiled against Electron on install:
  - Windows: Visual Studio Build Tools with the "Desktop development with C++" workload
  - macOS: Xcode Command Line Tools
  - Linux: `build-essential` and Python 3

### Install and run

```bash
git clone https://github.com/MohamedMusthaque/CeroCloud-Desktop.git
cd CeroCloud-Desktop
npm install        # also rebuilds better-sqlite3 for Electron
npm run dev        # starts Vite and launches the Electron app with hot reload
```

If the app fails to start with a `better-sqlite3` / `NODE_MODULE_VERSION` error, run `npm run rebuild`.

### First sign-in

On first launch the app opens the **Admin Setup** wizard instead of the login screen:

1. **Your business**: name (required), address, phone, currency and tax. These are saved to **Settings → General** and can be changed later.
2. **Administrator account**: choose the username and password (at least 4 characters) for the first administrator.

When you finish, you are signed in as that administrator. You can add more users from the **Users** page. No default `admin/admin` account is created. The wizard only appears while the database has no users.

### Where data is stored

Everything lives in Electron's per-user data folder:

| OS | Location |
|----|----------|
| Windows | `%APPDATA%\NexoraCloud\` |
| macOS | `~/Library/Application Support/NexoraCloud/` |
| Linux | `~/.config/NexoraCloud/` |

Inside it, `nexoracloud.db` is the SQLite database, `images/products/` holds product images and `attachments/nic/` holds NIC scans. In development (`npm run dev`) the folder is named `nexoracloud` (lowercase) instead. On first launch, data from a previous `CeroCloud` install is moved into this folder automatically.

An administrator can move the data to another folder (another drive, for example) from **Settings → Backups → Data Location**. The app copies the database, images and attachments there and restarts. The old folder is left in place as a safety copy. If the chosen folder already holds a NexoraCloud database, you can open that one or replace it with your current data. The choice is saved in `data-location.json` in the per-user folder above, which always keeps the logs. If the folder can't be reached at startup (for example, an unplugged drive), the app asks whether to retry, use the default location or quit.

### Resetting the database

**Settings → Backups → Reset Database** (administrators only) permanently deletes all products, categories, sales, clients, suppliers, purchases, GRNs, expenses, savings, capital entries and the stock card, along with their images and attachments. User accounts and app settings are kept, and the default expense types are recreated. Create a backup first if you might need the data.

## Usage

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open the command palette / global search |
| `Ctrl+N` | Go to Inventory |
| `Ctrl+V` | Go to Sales (POS) |
| `Ctrl+R` | Go to Reports |
| `D` / `I` / `V` / `R` / `S` | Go to Dashboard / Inventory / Sales / Reports / Settings (when not typing in a field) |
| `F2` | POS: focus product search |
| `Ctrl+Enter` | POS: start checkout |
| `Enter` | POS checkout: confirm sale |
| `Esc` | POS: close checkout, or clear the search |

On macOS, `Cmd` works in place of `Ctrl`.

### Changing the language

Open **Settings → Appearance** and choose English or Español. The choice is remembered per machine.

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run the app in development mode with hot reload |
| `npm run build` | Type-check, build and package the app for the current OS |
| `npm run build:win` / `build:mac` / `build:linux` | Package for a specific platform |
| `npm run lint` | Run ESLint (fails on any warning) |
| `npm run type-check` | Run the TypeScript compiler without emitting |
| `npm run rebuild` | Rebuild `better-sqlite3` against the installed Electron version |

## Project structure

```
CeroCloud-Desktop/
├── electron/
│   ├── main/
│   │   ├── main.ts          # App window, single-instance lock, protocol handlers
│   │   ├── database.ts      # SQLite schema, migrations, queries, auth (scrypt)
│   │   ├── ipc.ts           # IPC handlers exposed to the renderer
│   │   ├── autoUpdater.ts   # GitHub Releases auto-update
│   │   └── logger.ts
│   ├── preload/preload.ts   # Safe bridge between main and renderer
│   └── assets/              # App icons and branding
├── src/
│   ├── app/                 # App shell and routes
│   ├── features/            # Pages: dashboard, inventory, sales, clients, suppliers, purchases,
│   │                        #        expenses, savings, capital, accounts, zakat, reports,
│   │                        #        users, settings, auth, about
│   ├── components/          # Layout, wizards (backup, restore, import), record pages,
│   │                        # print templates (invoice, GRN, credit bill, reports), UI
│   ├── services/            # Data access, export, PDF, backup and encryption services
│   ├── stores/              # Zustand stores (auth, cart, UI, notifications)
│   ├── i18n/                # Translations (locales/en, locales/es)
│   ├── lib/                 # Permissions, validators, utilities
│   └── types/               # Shared TypeScript types
├── docs/                    # Architecture, development and release guides (Spanish)
├── screenshots/
└── package.json
```

### Adding translations

Strings live in `src/i18n/locales/<lang>/<area>.ts`. The Spanish files are the source of truth for keys, and the English files are typed against them, so a missing English key is a compile error. Use the `t('key', { param })` helper from `src/i18n` in components.

## Building installers

```bash
npm run build:win     # NSIS installer (.exe)
npm run build:mac     # .dmg
npm run build:linux   # AppImage and .deb
```

Output goes to `release/`. If the previous build's files are locked (VS Code, OneDrive or a running copy of the app can keep `release/win-unpacked/resources/app.asar` open), the build says so and writes the installer to a new `release-<date>-<time>/` folder instead; close the app and run **Developer: Reload Window** in VS Code to free `release/` again. Releases are automated with semantic-release from Conventional Commit messages (`feat:`, `fix:`, `chore:` …); see [docs/RELEASE_GUIDE.md](docs/RELEASE_GUIDE.md).

## Screenshots

| Dashboard | Inventory |
|-----------|-----------|
| ![Dashboard](screenshots/dashboard.png) | ![Inventory](screenshots/inventory.png) |
| **Point of Sale** | **Reports** |
| ![POS](screenshots/pos.png) | ![Reports](screenshots/reports.png) |

![Settings](screenshots/settings.png)

## Documentation

The detailed guides in `docs/` come from the upstream project and are written in Spanish.

| Document | Contents |
|----------|----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture and folder layout |
| [TECH_STACK.md](docs/TECH_STACK.md) | Technology choices |
| [GETTING_STARTED.md](docs/GETTING_STARTED.md) | Developer setup |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Development workflow |
| [GITFLOW.md](docs/GITFLOW.md) | Branching model |
| [RELEASE_GUIDE.md](docs/RELEASE_GUIDE.md) | Release process |
| [AUTO_UPDATE.md](docs/AUTO_UPDATE.md) | Auto-update setup |
| [changelog.md](changelog.md) | Version history |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |

## Contributing

1. Fork the repository and create a branch from `dev` (for example `feature/my-change`).
2. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
3. Make sure `npm run lint` and `npm run type-check` pass.
4. Add strings to both `en` and `es` locale files for any new UI text.
5. Open a pull request.

## License

Released under the **MIT License with the Commons Clause**. See [LICENSE](LICENSE) for the full text.

- You may use, study and modify the software, including in your own business, free of charge.
- You may **not** sell the software, or a product or service whose value comes substantially from it (including paid hosting or support).

## Acknowledgements

Based on [CeroCloud](https://github.com/CeroCloud/CeroCloud-Desktop) by DaaNiieeL123. Built with [Electron](https://www.electronjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) and [SQLite](https://www.sqlite.org/).
