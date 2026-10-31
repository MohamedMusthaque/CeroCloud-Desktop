# [1.2.0](https://github.com/CeroCloud/CeroCloud-Desktop/compare/v1.1.0...v1.2.0) (2026-01-10)


### Bug Fixes

* add Wine to develop workflow for cross-platform builds ([7f42d46](https://github.com/CeroCloud/CeroCloud-Desktop/commit/7f42d46fd16689fdf1198fb3035e2d56fd2a2dec))
* add missing semantic-release plugins and latest.yml ([e962ae0](https://github.com/CeroCloud/CeroCloud-Desktop/commit/e962ae004fee386957d6b395cc9cd67752525d92))
* add prereleased trigger for the Windows build ([dcf2953](https://github.com/CeroCloud/CeroCloud-Desktop/commit/dcf2953f25aa988e1279992a1530412e26b4e7bf))
* change release workflow to ubuntu-latest with Wine for cross-platform builds ([8572ab3](https://github.com/CeroCloud/CeroCloud-Desktop/commit/8572ab3986a39321baf6c76ce4175cdaed6ba53a))
* correct the semantic-release config and add missing plugins ([d2d229d](https://github.com/CeroCloud/CeroCloud-Desktop/commit/d2d229d7b0bed166cfe746cf3d83f9d42e60f24b))
* hotfix v1.1.1 - fix auto-update and semantic-release ([6d4de52](https://github.com/CeroCloud/CeroCloud-Desktop/commit/6d4de52bbcdf9a30cbf4b983441d5a96e64dc65b))
* move the Windows build into a dedicated workflow ([fd117c6](https://github.com/CeroCloud/CeroCloud-Desktop/commit/fd117c651c8726d7f5f9a3e4844c9b5d3d13e969))
* sync hotfix v1.1.1 to develop ([7ec88b7](https://github.com/CeroCloud/CeroCloud-Desktop/commit/7ec88b7273bbe82756e08e467d8ba36384b3d035))


### Features

* add manual run for the Windows build ([e7bffbd](https://github.com/CeroCloud/CeroCloud-Desktop/commit/e7bffbdcaae0d8e74cba5542df6db5818530594b))
* simplify the build to produce Linux and Windows together ([b7dffb7](https://github.com/CeroCloud/CeroCloud-Desktop/commit/b7dffb76d90fd86e6f130cdf25902abaa2b80e66))

# [1.2.0-beta.2](https://github.com/CeroCloud/CeroCloud-Desktop/compare/v1.2.0-beta.1...v1.2.0-beta.2) (2026-01-10)


### Bug Fixes

* add Wine to develop workflow for cross-platform builds ([7f42d46](https://github.com/CeroCloud/CeroCloud-Desktop/commit/7f42d46fd16689fdf1198fb3035e2d56fd2a2dec))


### Features

* simplify the build to produce Linux and Windows together ([b7dffb7](https://github.com/CeroCloud/CeroCloud-Desktop/commit/b7dffb76d90fd86e6f130cdf25902abaa2b80e66))

# [1.2.0-beta.1](https://github.com/CeroCloud/CeroCloud-Desktop/compare/v1.1.0...v1.2.0-beta.1) (2026-01-09)


### Bug Fixes

* add missing semantic-release plugins and latest.yml ([e962ae0](https://github.com/CeroCloud/CeroCloud-Desktop/commit/e962ae004fee386957d6b395cc9cd67752525d92))
* add prereleased trigger for the Windows build ([dcf2953](https://github.com/CeroCloud/CeroCloud-Desktop/commit/dcf2953f25aa988e1279992a1530412e26b4e7bf))
* correct the semantic-release config and add missing plugins ([d2d229d](https://github.com/CeroCloud/CeroCloud-Desktop/commit/d2d229d7b0bed166cfe746cf3d83f9d42e60f24b))
* move the Windows build into a dedicated workflow ([fd117c6](https://github.com/CeroCloud/CeroCloud-Desktop/commit/fd117c651c8726d7f5f9a3e4844c9b5d3d13e969))
* sync hotfix v1.1.1 to develop ([7ec88b7](https://github.com/CeroCloud/CeroCloud-Desktop/commit/7ec88b7273bbe82756e08e467d8ba36384b3d035))


### Features

* add manual run for the Windows build ([e7bffbd](https://github.com/CeroCloud/CeroCloud-Desktop/commit/e7bffbdcaae0d8e74cba5542df6db5818530594b))

## [1.1.1-beta.2](https://github.com/CeroCloud/CeroCloud-Desktop/compare/v1.1.1-beta.1...v1.1.1-beta.2) (2026-01-09)


### Bug Fixes

* add prereleased trigger for the Windows build ([dcf2953](https://github.com/CeroCloud/CeroCloud-Desktop/commit/dcf2953f25aa988e1279992a1530412e26b4e7bf))

## [1.1.1-beta.1](https://github.com/CeroCloud/CeroCloud-Desktop/compare/v1.1.0...v1.1.1-beta.1) (2026-01-09)


### Bug Fixes

* add missing semantic-release plugins and latest.yml ([e962ae0](https://github.com/CeroCloud/CeroCloud-Desktop/commit/e962ae004fee386957d6b395cc9cd67752525d92))
* correct the semantic-release config and add missing plugins ([d2d229d](https://github.com/CeroCloud/CeroCloud-Desktop/commit/d2d229d7b0bed166cfe746cf3d83f9d42e60f24b))
* move the Windows build into a dedicated workflow ([fd117c6](https://github.com/CeroCloud/CeroCloud-Desktop/commit/fd117c651c8726d7f5f9a3e4844c9b5d3d13e969))
* sync hotfix v1.1.1 to develop ([7ec88b7](https://github.com/CeroCloud/CeroCloud-Desktop/commit/7ec88b7273bbe82756e08e467d8ba36384b3d035))

# Changelog

All notable changes to **NexoraCloud** will be documented in this file.

The format loosely follows the *Keep a Changelog* standard and uses **Semantic Versioning** (`MAJOR.MINOR.PATCH`).

---

## [Unreleased]
### In development
- Visual integration of backend features (Suppliers UI, image upload)
- Ticket printing
- Advanced user system

---

## [1.0.0] – 2026-01-08 🎉 **FIRST STABLE VERSION**

**[📥 Download Release](https://github.com/CeroCloud/CeroCloud-Desktop/releases/tag/v1.0.0)**

### Added - ✅ **Premium Backup and Restore System**
- ✅ **"Premium Glass" Backup Wizard**:
  - Fully redesigned interface with `backdrop-blur` effects and Framer Motion animations.
  - Improved user flow: Generate -> Manual Download -> Cloud Instructions.
  - Interactive cards with glow and depth effects for choosing the destination.
  - Visual integration of the official brands: **Google Drive** and **Dropbox** in their corporate colors.
  - Clear action buttons with icons and animated loading states.
  - Intrusive automatic downloads removed; the user is in full control.
- ✅ **Restore Wizard 2.0**:
  - Immersive **Drag & Drop** upload zone with visual validation.
  - Automatic detection of encrypted backups with an elegant unlock UI.
  - Detailed confirmation screen with a **Statistics Grid** (Products, Sales, Date) before restoring.
  - Clear, styled security warnings (no ugly native alerts).
  - Visual feedback on restore progress with success/error states.
- ✅ **Reinforced Security**:
  - Optional AES-256 encryption for backups.
  - Strict validation of `.cerobak` extensions.
  - Protection against accidentally restoring corrupt files.

### Changed
- Optimized animation performance in modals.
- Removed the blur effect on hovered button text for sharper rendering.
- Unified border and shadow styles across all wizards (Backup/Restore).

---

## [Earlier Versions - Pre-Release]
### Features included in v1.0.0:

#### **Sales and POS System**

### Added - ✅ **UX and Sales Flow Improvements**
- ✅ **Advanced Checkout Modal**:
  - Dedicated modal to confirm the sale.
  - Automatic change calculation.
  - Validation of cash payments.
  - "Quick Pay" chips with smart suggested amounts.
  - Keyboard-optimized navigation (auto-focus, Enter to confirm).
- ✅ **Premium Cart UI Redesign**:
  - Gradient header with an item counter.
  - Product list with friendly empty states.
  - Customer and Discount inputs with built-in icons.
  - Compact chips for choosing the payment method.
  - Charge button with glow and gradient effects.
- ✅ **Brand Customization**:
  - **Dashboard**: Real-time digital clock + company logo integrated with glassmorphism.
  - **Sidebar**: Company name and logo follow the configuration.
  - **Settings**: Redesigned "About" tab with social links and support.
- ✅ **Global Styles**:
  - Custom scrollbars (thin, rounded, hover effects).
  - Removed the "ugly" native scrollbars.

### Changed
- Refactored `Sales.tsx` to separate the Checkout logic.
- Updated `globals.css` to support modern scrollbars in WebKit and Firefox.
- Improved configuration state management in `companyService`.
- Cleaned up logs and unused code in the main components.

### Fixed
- Fixed duplicate icon imports in Settings.tsx.
- Resolved linter warnings in SaleService and Sidebar.

---

## [1.0.0] – 2026-01-04 🎉 **MAIN RELEASE**

**[📥 Download Release](https://github.com/CeroCloud/CeroCloud-Desktop/releases/tag/v1.0.0)**

### Added - ✅ **Complete Business Management System**

#### 🎯 **BACKEND & LOGIC (100% Complete)**
- ✅ **Supplier Management**:
  - Complete Supplier interface (name, contact, phone, email, address)
  - Complete CRUD (getAll, create, update, delete)
  - IPC handlers registered
  - Relation with products (supplier_id, supplier_name)
  
- ✅ **Image Support for Products**:
  - `image` field in the Product interface
  - Ready to store local image paths
  
- ✅ **Sale Cancellation**:
  - `cancelSale()` function implemented
  - Automatic stock restoration
  - Status changed to 'cancelled'
  - `sales:cancel` IPC handler
  
- ✅ **Professional PDF Export**:
  - **Individual invoices** with logo and professional formatting
  - **Daily cash closings** with a summary by payment method
  - Automatic pagination
  - Headers, footers and totals
  - jsPDF library integrated
  
- ✅ **Automatic Backup System**:
  - Frequency configuration (daily, weekly, monthly)
  - Automatic detection of when to back up
  - Settings saved in localStorage
  - Validation of backup files
  - Support for custom paths

#### 📊 **Premium Dashboard with Analytics (Phase 4)**
- ✅ Professional charts with Recharts:
  - Line: sales over the last 7 days
  - Bars: top 5 products
  - Pie: distribution by payment method
- ✅ Animated KPIs with gradients
- ✅ Recent activity panel
- ✅ Real-time statistics

#### 🎨 **Premium UX (Phase 4)**
- ✅ NexoraCloud color palette (Indigo/Teal/Cyan)
- ✅ Hexagonal logo generated with AI
- ✅ Sidebar with gradients and active states
- ✅ Header with glassmorphism (backdrop blur)
- ✅ Polished light/dark mode
- ✅ Smooth transition animations
- ✅ Modern border radius (0.75rem)

#### 🛒 **POS - Point of Sale (Phase 2)**
- ✅ Complete interactive cart
- ✅ Real-time product search
- ✅ Automatic stock validation
- ✅ Calculation of subtotals, VAT and discounts
- ✅ Multiple payment methods
- ✅ Optional customer
- ✅ Automatic inventory update

#### 📈 **Reports and Analysis (Phase 3)**
- ✅ Complete sales history
- ✅ Inventory reports
- ✅ Low-stock products
- ✅ CSV export (4 types)
- ✅ PDF export (invoices + closings)
- ✅ Backup/restore system

#### 🗄️ **Database**
- ✅ electron-store (temporary, migration to SQLite planned)
- ✅ 4 entities: Products, Categories, Sales, Suppliers
- ✅ Relations between tables
- ✅ Auto-increment IDs
- ✅ Automatic timestamps

### Changed
- Migrated from better-sqlite3 to electron-store (temporarily)
- Updated the entire color palette
- Improved all the main components
- Optimized chart performance

### Dependencies Added
- recharts - Professional charts
- jspdf - PDF export
- date-fns - Date handling
- file-saver - File downloads
- @types/file-saver - TypeScript types

### Technical Highlights
- TypeScript throughout the project
- Clean architecture (Main/Renderer/Preload)
- Secure IPC communication
- Reusable React components
- Well-separated services
- CSS with Tailwind + custom variables

### Known Limitations
- ⚠️ Suppliers: Backend complete, UI pending
- ⚠️ Images: Field ready, upload UI pending
- ⚠️ Cancel sale: Function ready, UI button pending
- ⚠️ PDF: Functions ready, UI buttons pending
- ⚠️ Settings: Logic ready, settings page pending

### Testing Status
- ✅ TypeScript: 0 errors
- ✅ Build: Successful
- ✅ Hot reload: Working
- ✅ All core features tested

---

## [0.5.0] – 2026-01-04 ✅
### Added - ✅ **Phase 4 COMPLETED**: Advanced UX and Analytics
- ✅ **Premium Dashboard with Professional Charts**:
  - Line chart: Sales over the last 7 days with real-time data
  - Bar chart: Top 5 best-selling products
  - Pie chart: Distribution by payment method
  - Recent activity panel with the last 5 sales
- ✅ **Modern, Animated KPIs**:
  - Total revenue compared with the day
  - Total products with stock alerts
  - Real-time sales for the day
  - Calculated average ticket
  - Custom gradients per metric
  - Trend indicators (up/down)
- ✅ **Premium Color Palette (NexoraCloud)**:
  - Primary: Deep Indigo (#4F46E5 → #6366F1)
  - Secondary: Teal (#14B8A6)
  - Accent: Cyan (#06B6D4)
  - Optimized for light and dark mode
- ✅ **Redesigned Sidebar**:
  - Animated logo with a hexagonal effect
  - Gradients on active states
  - Navigation with visual indicators
  - Version badge and beta status
  - Dark gradient background
- ✅ **Improved Premium Header**:
  - Backdrop blur (glassmorphism)
  - Improved global search
  - Dark mode toggle with a smooth animation
  - Notifications with a badge
  - User avatar with a gradient
- ✅ **Charts with Recharts**:
  - Custom tooltips
  - Smooth animations
  - Colors coordinated with the theme
  - Responsive at every size
  - Labels in Spanish

### Changed
- Updated the color palette in globals.css
- Improved all components with the premium theme
- Border radius increased to 0.75rem for a modern look
- Gradients applied to key elements

### Dependencies
- Added: recharts (professional charting library)

### Design
- Hexagonal logo generated with AI
- Cohesive color system
- Glassmorphism effects
- Improved gradients and shadows
- Smooth transition animations

### Testing
- ✅ Charts render correctly
- ✅ KPIs calculate values in real time
- ✅ Dark/light theme works perfectly
- ✅ Sidebar navigation without errors
- ✅ Responsive header
- ✅ No TypeScript errors

---

## [0.4.0] – 2026-01-04 ✅
### Added - ✅ **Phase 3 COMPLETED**: Reports and Analysis
- ✅ **Complete Reports module with 4 tabs**:
  - **Sales Tab**: Complete history with real-time statistics
    - Sales of the day (amount and number of transactions)
    - Accumulated total sales
    - Calculated average ticket
    - Table of the last 10 sales with full details
  - **Inventory Tab**: Product analysis
    - Total products in the system
    - Total inventory value
    - Low-stock products
    - Detailed table of products that need restocking
  - **Export Tab**: 4 types of CSV export
    - Complete inventory with every field
    - Summarized sales (ID, date, customer, total, payment method)
    - Detailed sales (each product in each sale)
    - Low-stock products
  - **Backup Tab**: Complete backup system
    - Create a JSON backup with a timestamp
    - Restore from a backup file
    - File validation
    - Security warnings
- ✅ **Export service** (`exportService.ts`):
  - CSV export with UTF-8 encoding
  - Descriptive headers in Spanish
  - File names with the date added automatically
  - Excel-compatible format
- ✅ **Backup service** (`backupService.ts`):
  - Complete backup of products, sales and categories
  - Versioned JSON format
  - File structure validation
  - Restore API (base for a future implementation)
- ✅ **Date formatting** with date-fns:
  - Spanish format (dd/MM/yyyy HH:mm)
  - Locale configured
  - Consistent timestamp handling

### Changed
- Improved the Reports page with a professional UI
- Added statistics calculated in real time

### Dependencies
- Added: date-fns (date formatting)
- Added: file-saver (file downloads)
- Added: @types/file-saver (TypeScript types)

### Testing
- ✅ All CSV exports working
- ✅ Backup creates a valid JSON file
- ✅ Statistics calculated correctly
- ✅ Sales history showing real data
- ✅ Responsive tables
- ✅ No TypeScript errors

---

## [0.3.0] – 2026-01-04 ✅
### Added - ✅ **Phase 2 COMPLETED**: Sales and Point of Sale
- ✅ **Complete, working POS (Point of Sale) module**:
  - Real-time product search
  - Interactive shopping cart
  - Add/remove products with stock validation
  - Adjust quantities with +/- controls
  - Automatic calculation of subtotal, discounts, VAT and total
  - Support for multiple payment methods (cash, card, transfer)
  - Optional customer details
  - Real-time stock validation
  - Automatic inventory update when a sale completes
  - Responsive, professional interface
- ✅ **Sales backend**:
  - Sales persistence system with electron-store
  - Complete CRUD operations for sales
  - Optimized queries (getAll, getById, getRecent, etc.)
  - Automatic stock update when a sale is recorded
  - Calculation of daily and accumulated totals
- ✅ **IPC layer for sales**:
  - 6 IPC handlers for sales operations
  - APIs exposed in preload with a secure context
  - Frontend service (`saleService.ts`)
- ✅ **Updated TypeScript types**:
  - Sale interface with every required field
  - SaleItem interface with the product details
  - CartItem interface for cart handling

### Changed
- Improved the type structure to include sales relations
- Optimized database.ts with efficient sales queries

### Testing
- ✅ Working POS with a complete cart
- ✅ Stock validation working
- ✅ Correct math (subtotal, VAT, discounts)
- ✅ Stock updates correctly when a sale completes
- ✅ No TypeScript errors
- ✅ Working hot reload

---

## [0.2.0] – 2026-01-04 ✅
### Added - ✅ **Phase 1 COMPLETED**: Working System Foundation
- ✅ Complete project configuration (package.json, tsconfig, vite.config)
- ✅ Folder structure following the documented architecture
- ✅ Electron Main Process with a security configuration
- ✅ Preload script with contextBridge for secure APIs
- ✅ React 18 with TypeScript and React Router
- ✅ Tailwind CSS configured with a light/dark theme
- ✅ Professional layout (Sidebar + Header)
- ✅ Persistence system with electron-store
- ✅ **Complete, working product CRUD**:
  - Create products with a validated form
  - List products in a responsive table
  - Search products in real time
  - Edit existing products
  - Delete products with confirmation
  - Low-stock alerts
- ✅ **Dashboard with real data**:
  - Inventory statistics
  - Total value and potential profit
  - Low-stock alerts
  - Summary by category
  - Top 5 products by value
- ✅ Working navigation with React Router
- ✅ Icon system with Lucide React
- ✅ Working dark/light theme toggle
- ✅ 5 demo products for testing
- 660 dependencies installed and working

### Changed
- Replaced SQLite with electron-store for faster development
- Improved the Vite configuration for native modules

### Testing
- ✅ The application runs with `npm run dev`
- ✅ Working hot reload
- ✅ DevTools enabled
- ✅ No TypeScript compilation errors
- ✅ Complete CRUD tested and working
- ✅ Data persistence verified

---

## [0.1.0] – 2026-01-03 ✅
### Added
- ✅ **Phase 0 Completed**: Project documentation and preparation
- Base project structure
- Electron architecture defined (main / preload / renderer)
- Complete system documentation:
  - Professional `README.md` with badges and complete sections
  - `docs/PROJECT_STATEMENT.md` - Vision and goals
  - `docs/ARCHITECTURE.md` - Architecture with Mermaid diagrams
  - `docs/TECH_STACK.md` - Technology stack details
  - `docs/GETTING_STARTED.md` - Quick start guide
  - `CONTRIBUTING.md` - Contribution guide
  - `Roadmap.md` - Development plan by phases
  - `changelog.md` - Change log
- Configuration files:
  - Complete `.gitignore` for Electron + Node.js
  - `LICENSE` (MIT)
- Tools verified (Node.js v22.18.0, npm 10.9.3)

---

## [0.1.0] – 2026-01-XX
### Added
- Electron + Vite + React project initialization.
- TypeScript and Tailwind CSS configuration.
- Folder structure for the frontend and the local backend.
- Base application layout (Sidebar and Header).

---

## [0.2.0] – 2026-02-XX
### Added
- SQLite configuration and integration.
- Basic product CRUD.
- Initial inventory management.

---

## [0.3.0] – 2026-03-XX
### Added
- Basic Point of Sale (POS) module.
- Sales cart.
- Transaction recording.

---

## [0.4.0] – 2026-04-XX
### Added
- Sales history.
- Automatic stock control.
- Inventory validations.

---

## [0.5.0] – 2026-05-XX
### Added
- Report export to PDF.
- Inventory and sales export to CSV.

---

## [0.6.0] – 2026-06-XX
### Added
- Automatic backup system.
- Backup path configuration.

---

## Conventions
- **Added**: new features.
- **Changed**: changes to existing features.
- **Fixed**: bug fixes.
- **Removed**: removed features.

---

## 🔗 Comparison Links

- [Unreleased](https://github.com/CeroCloud/CeroCloud-Desktop/compare/v1.0.0...HEAD)
- [1.0.0](https://github.com/CeroCloud/CeroCloud-Desktop/releases/tag/v1.0.0)

---

This file will be updated with each new stable version of the project.
