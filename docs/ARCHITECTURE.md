# Arquitectura y Estructura del Proyecto

**Proyecto:** NexoraCloud  
**Stack:** Electron + Vite + React + TypeScript + SQLite  
**Objetivo:** Base sólida, escalable y mantenible para una aplicación de escritorio 100% local.

---

## 1. Arquitectura General

El proyecto sigue la arquitectura estándar de **Electron** separando responsabilidades en tres capas:

- **Main Process**: Control del ciclo de vida de la app, ventanas, filesystem y base de datos.
- **Preload**: Capa segura de comunicación entre Electron y el frontend.
- **Renderer**: Interfaz de usuario (React).

Esta separación garantiza **seguridad**, **escalabilidad** y **mantenibilidad**.

```mermaid
graph TB
    A[Main Process<br/>Node.js / Electron] -->|IPC Seguro| B[Preload<br/>contextBridge]
    B -->|API Controlada| C[Renderer<br/>React + Vite]
    
    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style B fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    style C fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
```

---

## 2. Estructura de Carpetas

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

## 3. Responsabilidades por Capa

```mermaid
graph TD
    subgraph Main["Main Process"]
        M1[Gestión de Ventanas]
        M2[Inicialización SQLite]
        M3[Acceso al Filesystem]
        M4[Lógica Crítica del Sistema]
    end
    
    subgraph Preload["Preload"]
        P1[Exposición de API Segura]
        P2[contextBridge]
        P3[Validación de Operaciones]
    end
    
    subgraph Renderer["Renderer"]
        R1[Interfaz de Usuario]
        R2[Gestión de Estados]
        R3[Navegación]
        R4[Consumo de APIs]
    end
    
    Main -->|IPC| Preload
    Preload -->|API| Renderer
    
    style Main fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style Preload fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    style Renderer fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
```

### Main Process (electron/main)
- Crear y gestionar ventanas.
- Inicializar SQLite.
- Acceso al filesystem (imágenes, backups).
- Lógica crítica del sistema.

### Preload (electron/preload)
- Exponer funciones seguras mediante `contextBridge`.
- Evitar acceso directo a Node.js desde el frontend.

Ejemplo de responsabilidades:
- `getProducts()`
- `createSale()`
- `backupDatabase()`

### Renderer (src)
- Renderizado de la interfaz.
- Manejo de estados y navegación.
- Consumo de APIs expuestas por preload.

---

## 4. Comunicación IPC

```mermaid
sequenceDiagram
    participant R as Renderer
    participant P as Preload
    participant M as Main Process
    participant DB as SQLite
    
    R->>P: Solicita acción (ej: getProducts)
    P->>P: Valida datos
    P->>M: Envía solicitud por IPC
    M->>DB: Ejecuta consulta
    DB-->>M: Retorna datos
    M-->>P: Responde con resultado
    P-->>R: Devuelve datos al frontend
    
    Note over R,DB: Comunicación unidireccional y tipada
```

- Uso exclusivo de canales definidos.
- Validación de datos antes de ejecutar operaciones.
- Comunicación unidireccional y tipada.

---

## 5. Sistema de Respaldo y Protección (V1.0.0)

El sistema de backups no es solo una funcionalidad, es un subsistema crítico con su propia arquitectura de flujo de datos.

```mermaid
graph TD
    User[Usuario] -->|Solicita Backup| Wizard[BackupWizard UI]
    Wizard -->|Selecciona Datos| Service[ZipBackupService]
    
    subgraph Core Logic
        Service -->|1. Recolecta JSONs| Data[Datos en Memoria]
        Service -->|2. Aplica AES-256 (Opcional)| Crypto[SecureEncryptionService]
        Crypto -->|3. Genera ZIP| JSZip[JSZip Engine]
    end
    
    JSZip -->|4. Blob .cerobak| FileSaver
    FileSaver -->|Descarga Local| HDD[Disco Local]
    
    HDD -.->|Subida Manual| Cloud[Google Drive / Dropbox]
    
    style User fill:#1e293b,color:#fff
    style Wizard fill:#059669,color:#fff
    style Service fill:#7c3aed,color:#fff
    style Crypto fill:#dc2626,color:#fff
```

### Componentes Clave
1.  **BackupWizard/RestoreWizard**: Controladores de UI que gestionan el estado del proceso y las animaciones.
2.  **ZipBackupService**: Orquestador que coordina la recolección de datos, compresión y generación de archivos.
3.  **SecureEncryptionService**: Módulo aislado encargado exclusivamente de la criptografía (PBKDF2 + AES-GCM).

---

## 6. Base de Datos

```mermaid
graph LR
    A[Aplicación] --> B[better-sqlite3]
    B --> C[nexoracloud.db]
    C --> D[Tablas]
    C --> E[Backups Automáticos]
    
    D --> D1[productos]
    D --> D2[ventas]
    D --> D3[clientes]
    D --> D4[usuarios]
    
    style A fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style B fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    style C fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
```

- SQLite como motor local.
- Archivo único `.db`.
- Acceso sincronizado mediante `better-sqlite3`.
- Backups automáticos configurables por el usuario.

---

## 6. Seguridad

```mermaid
graph TD
    A[Configuración de Seguridad] --> B[contextIsolation: true]
    A --> C[nodeIntegration: false]
    A --> D[API Limitada en Preload]
    A --> E[Acceso Controlado al Filesystem]
    
    B --> F[Aislamiento de Contextos]
    C --> G[Sin Acceso Directo a Node.js]
    D --> H[Solo Funciones Expuestas]
    E --> I[Validación de Rutas]
    
    style A fill:#1e293b,stroke:#0f172a,stroke-width:3px,color:#fff
    style B fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style C fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style D fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
    style E fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
```

---

## 7. Escalabilidad

```mermaid
graph TD
    A[Arquitectura Base] --> B[Módulos Independientes]
    A --> C[Sistema de Roles]
    A --> D[Multi-empresa]
    A --> E[Plugins y Extensiones]
    
    B --> B1[Dashboard]
    B --> B2[Inventario]
    B --> B3[Ventas]
    B --> B4[Reportes]
    
    C --> C1[Administrador]
    C --> C2[Vendedor]
    C --> C3[Almacén]
    
    D --> D1[Múltiples Bases de Datos]
    D --> D2[Configuración por Empresa]
    
    E --> E1[Sistema de Impresión]
    E --> E2[Integraciones Externas]
    E --> E3[Módulos Personalizados]
    
    style A fill:#1e293b,stroke:#0f172a,stroke-width:3px,color:#fff
    style B fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    style C fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff
    style D fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
    style E fill:#2563eb,stroke:#1e40af,stroke-width:2px,color:#fff
```

La arquitectura permite:
- Agregar módulos sin afectar el core.
- Incorporar roles de usuario.
- Soportar múltiples empresas.
- Integrar impresión o plugins futuros.

---

Este documento define la base estructural del proyecto y sirve como referencia para el desarrollo continuo de **NexoraCloud**.