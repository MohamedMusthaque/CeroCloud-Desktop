# Project Statement: NexoraCloud

**Project:** Comprehensive Desktop Sales and Inventory System  
**Status:** Architecture Definition Phase  
**Year:** 2026

---

## 1. Overview
**NexoraCloud** is a cross-platform desktop application designed to run **100% locally and free of charge**. Its goal is to let small businesses manage inventory, sales and reports through a modern, smooth and scalable interface, removing any dependency on hosting, cloud servers or monthly subscriptions.

All data is stored directly on the user's computer, guaranteeing full control, privacy and zero infrastructure costs.

---

## 2. Project Pillars

- **Zero-Cost Hosting**  
  The system requires no monthly payments or external servers. The information lives locally on the user's computer.

- **100% Offline Operation**  
  The application works without an internet connection, ideal for environments with limited connectivity.

- **Portability and Simple Distribution**  
  Cross-platform executables are generated so the customer does not need to install Node.js, Python or Java beforehand.

- **Modern, Professional Interface**  
  A contemporary design based on modern web standards, moving away from outdated interfaces.

- **Data Integrity and Security**  
  A robust relational database with an automatic backup system.

---

## 3. Technology Stack

| Layer | Technology | Role |
|----|----|----|
| Desktop Runtime | Electron.js | Cross-platform desktop application |
| Bundler | Vite | Fast development and optimized builds |
| Frontend | React.js + Tailwind CSS | Modern, responsive interface |
| UI Components | Shadcn/UI + Lucide Icons | Professional components |
| Local Backend | Node.js (Electron Main Process) | Internal logic and filesystem |
| Database | SQLite (better-sqlite3) | Local persistence |
| Language | TypeScript | Strong typing and safety |

---

## 4. Modules and Features

### A. Dashboard and Analytics
- Dynamic charts of income and expenses.
- Best-selling products.
- Key performance indicators (KPIs).

### B. Inventory Management
- Product catalog with support for local images.
- Category and supplier management.
- Automatic low-stock alerts.
- Advanced search and filtering.

### C. Point of Sale (POS)
- Fast, optimized sales cart.
- Transaction recording.
- Configurable payment methods.
- Sales history with the option to cancel.

### D. Reports and Documents
- Export of invoices and cash closings to **PDF**.
- Export of inventory and sales to **CSV/Excel**.

### E. Security and Backups
- Automatic backups of the database file.
- Backups to local paths or to folders synced with personal cloud services (Google Drive, Dropbox, OneDrive).

> The system does not connect directly to cloud services; backups are written to local folders configured by the user.

---

## 5. User Experience (UX)

- No console or terminal exposed to the user.
- Simple installer or portable version.
- Support for light and dark mode.
- Smooth navigation focused on operational speed.

---

## 6. Initial Scope

- Single-user, local application.
- Designed to run on a single computer.
- Architecture ready for future expansion.


**NexoraCloud** aims to offer a modern, solid and free alternative to commercial cloud systems, putting the user in full control of their data.
