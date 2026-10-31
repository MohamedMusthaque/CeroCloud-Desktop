# Guía de Inicio Rápido

Esta guía te ayudará a configurar el entorno de desarrollo y comenzar a trabajar en **NexoraCloud**.

---

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

### Requerimientos Obligatorios

- **Node.js** v20.0.0 o superior (LTS recomendado)
- **npm** v10.0.0 o superior (incluido con Node.js)

### Verificar Instalación

```bash
node --version    # Debe mostrar v20.x.x o superior
npm --version     # Debe mostrar 10.x.x o superior
```

### Herramientas Opcionales (Recomendadas)

- **Git** - Control de versiones
- **VS Code** - Editor de código (con extensiones recomendadas)

---

## 🚀 Instalación del Proyecto

### 1. Clonar el Repositorio

```bash
git clone https://github.com/CeroCloud/CeroCloud-Desktop.git
cd NexoraCloud
```

O descarga el ZIP y descomprímelo.

### 2. Instalar Dependencias

```bash
npm install
```

Este comando instalará todas las dependencias necesarias:
- Electron
- React y React DOM
- Vite
- TypeScript
- Tailwind CSS
- Shadcn/UI components
- better-sqlite3
- Y todas las herramientas de desarrollo

**Tiempo estimado:** 2-5 minutos (dependiendo de tu conexión).

---

## 🏗️ Estructura del Proyecto

Una vez instalado, verás esta estructura:

```
NexoraCloud/
├── electron/                # Código de Electron (Main Process)
│   ├── main/               # Lógica principal
│   ├── preload/            # Preload scripts
│   └── assets/             # Iconos de la app
├── src/                    # Frontend (React)
│   ├── app/                # Root y configuración
│   ├── components/         # Componentes UI
│   ├── features/           # Módulos del sistema
│   ├── hooks/              # Hooks personalizados
│   ├── services/           # Servicios IPC
│   ├── styles/             # Estilos globales
│   └── types/              # Tipos TypeScript
├── database/               # Base de datos local
│   └── backups/            # Backups automáticos
├── public/                 # Assets públicos
├── docs/                   # Documentación
└── package.json            # Configuración del proyecto
```

---

## 🎯 Comandos Principales

### Desarrollo

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Esto hará:
1. Compilar el código TypeScript
2. Iniciar Vite dev server
3. Lanzar la aplicación Electron
4. Habilitar hot reload

### Build para Producción

Genera el ejecutable para tu plataforma:

```bash
npm run build           # Build de la aplicación
npm run build:win      # Ejecutable para Windows
npm run build:mac      # Ejecutable para macOS
npm run build:linux    # Ejecutable para Linux
```

### Otros Comandos Útiles

```bash
npm run lint           # Verificar código con ESLint
npm run format         # Formatear código con Prettier
npm run type-check     # Verificar tipos TypeScript
```

---

## 🛠️ Configuración del Entorno

### Variables de Entorno (Opcional)

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Configuración de desarrollo
VITE_APP_NAME=NexoraCloud
VITE_DB_PATH=./database/nexoracloud.db
```

**Nota:** Los archivos `.env*` están en `.gitignore` por seguridad.

---

## 📝 Primer Desarrollo

### 1. Familiarízate con la Arquitectura

Lee estos documentos en orden:

1. `docs/ENUNCIADO_PROYECTO.md` - Entender el objetivo
2. `docs/ARCHITECTURE.md` - Comprender la arquitectura
3. `docs/TECH_STACK.md` - Conocer las tecnologías

### 2. Explora el Código Base

```bash
# Inicia el servidor de desarrollo
npm run dev
```

La aplicación se abrirá automáticamente.

### 3. Haz tu Primer Cambio

1. Abre `src/app/App.tsx`
2. Modifica el texto de bienvenida
3. Guarda el archivo
4. Observa el cambio automáticamente en la app ✨

---

## 🐛 Solución de Problemas

### Error: "Cannot find module 'electron'"

**Solución:** Ejecuta `npm install` nuevamente.

### Error: "node-gyp rebuild failed"

**Solución para Windows:**
```bash
npm install --global windows-build-tools
npm install
```

**Solución para macOS:**
```bash
xcode-select --install
npm install
```

**Solución para Linux:**
```bash
sudo apt-get install build-essential
npm install
```

### La aplicación no se abre

1. Verifica que no haya otra instancia ejecutándose
2. Revisa la consola en busca de errores
3. Intenta `npm run dev -- --debug`

### Hot reload no funciona

1. Reinicia el servidor de desarrollo
2. Verifica que no haya errores de TypeScript
3. Limpia la cache: `npm run clean` (si existe)

---

## 🎨 Configuración del Editor (VS Code)

### Extensiones Recomendadas

Crea `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "usernamehw.errorlens"
  ]
}
```

### Configuración Recomendada

Crea `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## 📚 Recursos Útiles

### Documentación

- [Electron Docs](https://www.electronjs.org/docs/latest)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/UI](https://ui.shadcn.com)

### Comunidad

- GitHub Issues - Para reportar bugs
- GitHub Discussions - Para preguntas generales
- CONTRIBUTING.md - Guía de contribución

---

## ✅ Checklist de Configuración

Antes de comenzar a desarrollar, verifica:

- [ ] Node.js y npm instalados correctamente
- [ ] Dependencias instaladas (`npm install`)
- [ ] Aplicación ejecutándose en desarrollo (`npm run dev`)
- [ ] Editor configurado (extensiones y settings)
- [ ] Documentación leída (al menos ARCHITECTURE.md)
- [ ] Git configurado (nombre y email)

---

## 🎯 Próximos Pasos

1. **Explora el código:** Familiarízate con la estructura
2. **Lee el Roadmap:** Conoce qué se está desarrollando
3. **Revisa Issues:** Encuentra tareas para contribuir
4. **Haz tu primer cambio:** Experimenta con componentes
5. **Consulta CONTRIBUTING.md:** Aprende el flujo de trabajo

---

## 💡 Consejos

- **Mantén las dependencias actualizadas:** Revisa regularmente
- **Lee los mensajes de error completos:** Suelen indicar la solución
- **Consulta la documentación oficial:** Es la fuente de verdad
- **Haz commits pequeños y frecuentes:** Facilita el debugging
- **Pregunta cuando tengas dudas:** Better to ask than to assume

---

¡Feliz desarrollo! 🚀

**¿Problemas?** Revisa `docs/` o abre un Issue en GitHub.
