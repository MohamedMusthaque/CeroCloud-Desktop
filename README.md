<div align="center">

# NexoraCloud

**Offline-first desktop Point of Sale and Inventory Management**

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](changelog.md)
[![License: MIT + Commons Clause](https://img.shields.io/badge/License-MIT%20%2B%20Commons%20Clause-orange.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

*A cross-platform desktop app for small businesses to run sales, stock, clients and reports, with all data stored locally on the machine. No server, no subscription, no internet required.*

[Features](#features) • [Getting started](#getting-started) • [Usage](#usage) • [Project structure](#project-structure) • [Building](#building-installers) • [License](#license)

</div>

---

## Overview

NexoraCloud keeps everything in a local SQLite database on the user's computer. It works fully offline, so a shop can keep selling when the connection drops, and its data never leaves the machine unless the user exports or backs it up.

This repository is a fork of [CeroCloud/CeroCloud-Desktop](https://github.com/CeroCloud/CeroCloud-Desktop). On top of the upstream app it adds:

- **Full English translation** alongside Spanish, switchable at runtime
- **Local login** with role-based, per-page access control and user management
- **Category management**, with renames and deletes synced to products
- **Credit sales** with per-client credit limits
- **More currencies** (LKR, INR, MYR, SGD, in addition to GTQ, USD, EUR, MXN)
- **Editable cart quantities** and a `ton` unit of measure
- **Cross-platform `Ctrl` shortcuts** and a single-instance lock

## Features

### Point of Sale
- Multiple open bills in tabs, so several customers can be served at once
- Fast product search by name, code or category (`F2`)
- Editable quantities directly in the cart
- Payment by cash (with change calculation), card, transfer, credit or other; each method can be enabled or disabled in Settings
- **Credit sales** for registered clients, checked against the client's credit limit and outstanding balance
- Configurable tax (included or added), discounts, and an optional required customer name
- Printable invoices in **A4** or **80 mm thermal ticket** format, with custom prefix, numbering, header/footer images and disclaimer

### Inventory
- Product catalog with code, category, supplier, image, cost, price, stock, minimum stock and unit (unit, ton, kg, g, l, ml, m, box, package)
- **Categories** page: create, rename and delete categories; changes propagate to linked products
- Low-stock alerts with a configurable threshold
- Inventory movement log (sales, purchases, adjustments, returns)
- Bulk **import from Excel or CSV** (`.xlsx`, `.xls`, `.csv`) through a guided wizard
- Product image upload

### Clients and suppliers
- Client records with tax ID, contact details, notes and credit limit
- Per-client purchase history and current credit balance
- Supplier directory linked to products

### Dashboard and reports
- Dashboard with revenue, sales count, average bill, stock health, 7-day revenue trend and top products
- Reports with profitability analysis (revenue, cost, gross profit, margin), peak activity hours and most profitable products
- Transaction list with sale cancellation (stock is restored automatically)
- CSV export of inventory, sales, detailed sales and low-stock items; PDF report generation

### Users and access control
- Local sign-in; passwords are hashed with **scrypt** and a random salt
- Two roles: **Administrator** (every page) and **User** (only the pages granted to them)
- Page-level permissions for Dashboard, Inventory, Sales, Suppliers, Clients, Reports, Users and Settings, enforced in both the UI and the Electron main process
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

On first launch the app creates a default administrator:

| Username | Password |
|----------|----------|
| `admin`  | `admin`  |

**Change this password right away** from the **Users** page.

### Where data is stored

Everything lives in Electron's per-user data folder:

| OS | Location |
|----|----------|
| Windows | `%APPDATA%\NexoraCloud\` |
| macOS | `~/Library/Application Support/NexoraCloud/` |
| Linux | `~/.config/NexoraCloud/` |

Inside it, `nexoracloud.db` is the SQLite database and `images/products/` holds product images. In development (`npm run dev`) the folder is named `nexoracloud` (lowercase) instead. On first launch, data from a previous `CeroCloud` install is moved into this folder automatically.

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
│   ├── features/            # Pages: dashboard, inventory, sales, clients, suppliers,
│   │                        #        reports, users, settings, auth, about
│   ├── components/          # Layout, wizards (backup, restore, import), print templates, UI
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

Output goes to `release/`. Releases are automated with semantic-release from Conventional Commit messages (`feat:`, `fix:`, `chore:` …); see [docs/RELEASE_GUIDE.md](docs/RELEASE_GUIDE.md).

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
