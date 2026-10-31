# Project Architecture and Structure

**Project:** NexoraCloud  
**Stack:** Electron + Vite + React + TypeScript + SQLite  
**Goal:** A solid, scalable and maintainable foundation for a 100% local desktop application.

---

## 1. General Architecture

The project follows the standard **Electron** architecture, splitting responsibilities into three layers:

- **Main Process**: Controls the app lifecycle, windows, filesystem and database.
- **Preload**: Secure communication layer between Electron and the frontend.
- **Renderer**: User interface (React).

This separation guarantees **security**, **scalability** and **maintainability**.

```mermaid
graph TB
    A[Main Process<br/>Node.js / Electron] -->|Secure IPC| B[Preload<br/>contextBridge]
    B -->|Controlled API| C[Renderer<br/>React + Vite]
    
    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style B fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    style C fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
```

---

## 2. Folder Structure

```mermaid
graph LR
    A[NexoraCloud] --> B[electron/]
    A --> C[src/]
    A --> D[public/]
    A --> E[database/]
    A --> F[docs/]
    
    B --> B1[main/]
    B --> B2[preload/]
    B --> B3[assets/]
    
    B1 --> B1A[main.ts]
    B1 --> B1B[windows.ts]
    B1 --> B1C[ipc.ts]
    B1 --> B1D[database.ts]
    
    B2 --> B2A[preload.ts]
    
    C --> C1[app/]
    C --> C2[components/]
    C --> C3[features/]
    C --> C4[hooks/]
    C --> C5[services/]
    C --> C6[styles/]
    C --> C7[types/]
    
    C3 --> C3A[dashboard/]
    C3 --> C3B[inventory/]
    C3 --> C3C[sales/]
    C3 --> C3D[reports/]
    
    E --> E1[nexoracloud.db]
    E --> E2[backups/]
    
    style A fill:#1e293b,stroke:#0f172a,stroke-width:3px,color:#fff
    style B fill:#334155,stroke:#1e293b,stroke-width:2px,color:#fff
    style C fill:#334155,stroke:#1e293b,stroke-width:2px,color:#fff
    style E fill:#334155,stroke:#1e293b,stroke-width:2px,color:#fff
```

---

## 3. Responsibilities by Layer

```mermaid
graph TD
    subgraph Main["Main Process"]
        M1[Window Management]
        M2[SQLite Initialization]
        M3[Filesystem Access]
        M4[Critical System Logic]
    end
    
    subgraph Preload["Preload"]
        P1[Secure API Exposure]
        P2[contextBridge]
        P3[Operation Validation]
    end
    
    subgraph Renderer["Renderer"]
        R1[User Interface]
        R2[State Management]
        R3[Navigation]
        R4[API Consumption]
    end
    
    Main -->|IPC| Preload
    Preload -->|API| Renderer
    
    style Main fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style Preload fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    style Renderer fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
```

### Main Process (electron/main)
- Create and manage windows.
- Initialize SQLite.
- Filesystem access (images, backups).
- Critical system logic.

### Preload (electron/preload)
- Expose safe functions through `contextBridge`.
- Prevent direct Node.js access from the frontend.

Example responsibilities:
- `getProducts()`
- `createSale()`
- `backupDatabase()`

### Renderer (src)
- Render the interface.
- Handle state and navigation.
- Consume the APIs exposed by preload.

---

## 4. IPC Communication

```mermaid
sequenceDiagram
    participant R as Renderer
    participant P as Preload
    participant M as Main Process
    participant DB as SQLite
    
    R->>P: Requests an action (e.g. getProducts)
    P->>P: Validates data
    P->>M: Sends the request over IPC
    M->>DB: Runs the query
    DB-->>M: Returns data
    M-->>P: Responds with the result
    P-->>R: Returns data to the frontend
    
    Note over R,DB: One-way, typed communication
```

- Only defined channels are used.
- Data is validated before operations run.
- Communication is one-way and typed.

---

## 5. Backup and Protection System (V1.0.0)

The backup system is not just a feature; it is a critical subsystem with its own data-flow architecture.

```mermaid
graph TD
    User[User] -->|Requests Backup| Wizard[BackupWizard UI]
    Wizard -->|Selects Data| Service[ZipBackupService]
    
    subgraph Core Logic
        Service -->|1. Collects JSONs| Data[In-Memory Data]
        Service -->|2. Applies AES-256 (Optional)| Crypto[SecureEncryptionService]
        Crypto -->|3. Builds ZIP| JSZip[JSZip Engine]
    end
    
    JSZip -->|4. .cerobak Blob| FileSaver
    FileSaver -->|Local Download| HDD[Local Disk]
    
    HDD -.->|Manual Upload| Cloud[Google Drive / Dropbox]
    
    style User fill:#1e293b,color:#fff
    style Wizard fill:#059669,color:#fff
    style Service fill:#7c3aed,color:#fff
    style Crypto fill:#dc2626,color:#fff
```

### Key Components
1.  **BackupWizard/RestoreWizard**: UI controllers that manage the process state and animations.
2.  **ZipBackupService**: Orchestrator that coordinates data collection, compression and file generation.
3.  **SecureEncryptionService**: Isolated module dedicated solely to cryptography (PBKDF2 + AES-GCM).

---

## 6. Database

```mermaid
graph LR
    A[Application] --> B[better-sqlite3]
    B --> C[nexoracloud.db]
    C --> D[Tables]
    C --> E[Automatic Backups]
    
    D --> D1[products]
    D --> D2[sales]
    D --> D3[clients]
    D --> D4[users]
    
    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style B fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    style C fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
```

- SQLite as the local engine.
- A single `.db` file.
- Synchronous access through `better-sqlite3`.
- Automatic backups configurable by the user.

---

## 6. Security

```mermaid
graph TD
    A[Security Configuration] --> B[contextIsolation: true]
    A --> C[nodeIntegration: false]
    A --> D[Limited API in Preload]
    A --> E[Controlled Filesystem Access]
    
    B --> F[Context Isolation]
    C --> G[No Direct Node.js Access]
    D --> H[Exposed Functions Only]
    E --> I[Path Validation]
    
    style A fill:#1e293b,stroke:#0f172a,stroke-width:3px,color:#fff
    style B fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style C fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style D fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style E fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
```

---

## 7. Scalability

```mermaid
graph TD
    A[Base Architecture] --> B[Independent Modules]
    A --> C[Role System]
    A --> D[Multi-company]
    A --> E[Plugins and Extensions]
    
    B --> B1[Dashboard]
    B --> B2[Inventory]
    B --> B3[Sales]
    B --> B4[Reports]
    
    C --> C1[Administrator]
    C --> C2[Salesperson]
    C --> C3[Warehouse]
    
    D --> D1[Multiple Databases]
    D --> D2[Per-Company Configuration]
    
    E --> E1[Printing System]
    E --> E2[External Integrations]
    E --> E3[Custom Modules]
    
    style A fill:#1e293b,stroke:#0f172a,stroke-width:3px,color:#fff
    style B fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    style C fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    style D fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
    style E fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
```

The architecture makes it possible to:
- Add modules without affecting the core.
- Introduce user roles.
- Support multiple companies.
- Integrate printing or future plugins.

---

This document defines the structural foundation of the project and serves as a reference for the ongoing development of **NexoraCloud**.
