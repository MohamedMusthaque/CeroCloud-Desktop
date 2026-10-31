# Technology Stack – NexoraCloud

This document details the technologies, tools and libraries used in the project, along with the reasoning behind each choice.

---

## 🎯 Overview

**NexoraCloud** uses a modern, robust stack designed to build cross-platform desktop applications with the following traits:

- ✅ **100% Local** - No dependency on servers
- ✅ **Cross-platform** - Windows, macOS, Linux
- ✅ **Free** - No infrastructure costs
- ✅ **Modern** - Contemporary UI/UX
- ✅ **Secure** - Local data that can be encrypted

---

## 🏗️ Core Architecture

### Electron.js
**Version:** ^28.0.0 (target)  
**Role:** Desktop application runtime  
**Why?**
- Builds desktop applications with web technologies
- Large community and mature ecosystem
- Native cross-platform support
- Full access to the operating system and filesystem
- Built-in automatic updates

**Documentation:** https://www.electronjs.org/

---

## 🚀 Development and Build

### Vite
**Version:** ^5.0.0 (target)  
**Role:** Bundler and dev server  
**Why?**
- Extremely fast Hot Module Replacement (HMR)
- Optimized builds with Rollup
- Simple configuration compared to Webpack
- Native ESM support
- Ideal for Electron development

**Documentation:** https://vitejs.dev/

### electron-builder
**Role:** Packaging and distribution  
**Why?**
- Generates installers for Windows, Mac and Linux
- Simplified configuration
- Support for automatic updates
- Built-in code signing

**Documentation:** https://www.electron.build/

---

## ⚛️ Frontend

### React.js
**Version:** ^18.3.0 (target)  
**Role:** User interface library  
**Why?**
- Scalable component-based architecture
- Virtual DOM for optimal performance
- Modern hooks for state management
- Mature ecosystem and large community
- Excellent TypeScript integration

**Documentation:** https://react.dev/

### TypeScript
**Version:** ^5.3.0 (target)  
**Role:** Typed programming language  
**Why?**
- Type safety at development time
- Better autocompletion in IDEs
- Safer refactoring
- Implicit documentation in the code
- Fewer bugs in production

**Documentation:** https://www.typescriptlang.org/

---

## 🎨 UI and Styles

### Tailwind CSS
**Version:** ^3.4.0 (target)  
**Role:** Utility CSS framework  
**Why?**
- Fast development with utility classes
- Responsive design out of the box
- Optimized bundle size (built-in PurgeCSS)
- Visual consistency
- Highly customizable

**Documentation:** https://tailwindcss.com/

### Shadcn/UI
**Role:** UI component library  
**Why?**
- Accessible components (WCAG)
- Based on Radix UI primitives
- Fully customizable
- Not a dependency: the components are copied into the project
- Modern, professional design

**Documentation:** https://ui.shadcn.com/

### Lucide Icons
**Role:** Iconography  
**Why?**
- Modern, consistent icons
- Tree-shakeable (you only import what you use)
- React support
- Open source and frequently updated

**Documentation:** https://lucide.dev/

---

## 💾 Database

### SQLite
**Role:** Database engine  
**Why?**
- Serverless - a single `.db` file
- Zero configuration
- ACID compliant
- Fast for local operations
- Widely tested and stable

**Documentation:** https://www.sqlite.org/

### better-sqlite3
**Version:** ^9.0.0 (target)  
**Role:** SQLite driver for Node.js  
**Why?**
- Simple synchronous API
- Better performance than sqlite3 (async)
- Ideal for the Electron Main Process
- Built-in prepared statements
- Transaction support

**Documentation:** https://github.com/WiseLibs/better-sqlite3

---

## 🔧 Development Tools

### ESLint
**Role:** Code linter  
**Why?**
- Detects common errors
- Enforces code standards
- TypeScript integration
- Extensible configuration

### Prettier
**Role:** Code formatter  
**Why?**
- Consistent automatic formatting
- Saves time in code reviews
- Editor integration

---

## 📦 Package Management

### npm
**Minimum version:** 10.0.0  
**Why?**
- Ships with Node.js
- The lockfile (`package-lock.json`) guarantees consistent installs
- Built-in scripts for development and builds

**Valid alternative:** pnpm (faster and more space-efficient)

---

## 🖥️ Runtime

### Node.js
**Minimum version:** 20.0.0 (LTS)  
**Role:** Runtime environment  
**Why?**
- Required by Electron
- ECMAScript modules support
- Improved performance
- Long-term support (LTS)

**Documentation:** https://nodejs.org/

---

---

## 📊 Libraries and Utilities (Updated V1.0.0)

### Advanced UI & UX
#### Framer Motion
**Role:** Animation engine  
**Why?**
- Declarative and gesture-based animations (drag & drop).
- Exit effects (`AnimatePresence`), key for the wizards.
- Optimized performance (GPU acceleration).

#### Sonner
**Role:** Notification system  
**Why?**
- Modern, minimalist design out of the box.
- Stackable and customizable.
- Simple imperative API (`toast.success()`, `toast.promise()`).

### Data and File Management
#### JSZip
**Role:** Client-side ZIP compression  
**Why?**
- Generates the `.cerobak` container files.
- Encryption support and efficient compression.
- Works 100% in the browser/renderer without extra processes.

#### FileSaver.js
**Role:** Saving files
**Why?**
- Cross-browser abstraction over `Blob` and `<a> download`.
- Ensures large files download correctly.

### Visualization
#### Recharts
**Role:** Statistical charts  
**For:** The main dashboard (Sales, Products).

### Node.js Crypto (Native)
**Role:** Secure encryption
**For:** AES-256 protection of backups.

---

---

## 🔒 Security

### Electron Configuration

```typescript
// Security configuration in BrowserWindow
{
  webPreferences: {
    contextIsolation: true,      // ✅ Isolates contexts
    nodeIntegration: false,      // ✅ No Node.js in the renderer
    sandbox: true,               // ✅ Sandbox enabled
    preload: path.join(__dirname, 'preload.js')
  }
}
```

### contextBridge API
- Controlled exposure of functionality
- Inputs validated before running
- No direct Node.js access from the UI

---

## 📈 Scalability

The chosen stack allows:

1. **Modularity** - Add features without restructuring
2. **Performance** - Optimized SQLite + React
3. **Maintainability** - TypeScript + ESLint
4. **Extensibility** - Future plugins
5. **Cross-platform** - One codebase, multiple OSes

---

## 🎓 Learning Resources

- **Electron + React:** https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/intro.html
- **Tailwind CSS Play:** https://play.tailwindcss.com/
- **React Hooks:** https://react.dev/reference/react

---

## 📝 Important Notes

- **Avoid heavy dependencies** - Keep the application lightweight
- **Prefer vanilla JS over libraries** - Only add one if it is needed
- **Future testing** - Vitest or Jest once it is implemented
- **Updates** - Keep dependencies up to date for security

---

This stack was carefully chosen to guarantee:
- ✅ Agile, modern development
- ✅ Optimal performance
- ✅ Long-term maintainability
- ✅ Future scalability

**Last updated:** January 2026
