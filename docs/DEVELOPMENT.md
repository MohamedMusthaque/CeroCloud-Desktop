# Development Guide - NexoraCloud

## 🚀 Running in Development Mode

### Option 1: All-in-one (Recommended)

```bash
npm run dev
```

This command:
- Compiles the Electron files (main.ts and preload.ts)
- Starts the Vite server at http://localhost:5173
- Opens the Electron window automatically
- Enables hot reload for code changes

**Note:** The Electron window opens automatically. DevTools messages are normal and can be ignored.

### Option 2: Separate processes

If you need more control:

```bash
# Terminal 1: Start Vite
npx vite

# Terminal 2: Start Electron (once Vite is running)
npx electron .
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development mode with hot reload |
| `npm run build` | Full production build |
| `npm run build:win` | Build the Windows executable |
| `npm run build:mac` | Build the macOS executable |
| `npm run build:linux` | Build the Linux executable |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Check TypeScript types |
| `npm run preview` | Preview the production build |

## 📁 Project Structure

```
NexoraCloud/
├── electron/               # Electron main process
│   ├── main/              # Main process
│   │   └── main.ts       # Main process entry point
│   ├── preload/          # Preload scripts
│   │   └── preload.ts    # contextBridge API
│   └── assets/           # Application icons
├── src/                   # Frontend (Renderer process)
│  ├── app/               # App configuration
│   │   ├── App.tsx       # Root component
│   │   └── routes.tsx    # Route definitions
│   ├── components/       # Reusable components
│   │   └── layout/       # Layout components
│   ├── features/         # System modules
│   │   ├── dashboard/
│   │   ├── inventory/
│   │   ├── sales/
│   │   └── reports/
│   ├── lib/              # Utilities
│   ├── styles/           # Global styles
│   └── main.tsx          # React entry point
├── database/             # Local database
│   └── backups/          # Automatic backups
└── public/               # Static assets
```

## 🎨 UI Development

### Tailwind CSS

Styles are configured with Tailwind CSS. CSS variables live in `src/styles/globals.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  /* ... more variables */
}
```

### Dark Mode

The project supports dark mode. Toggle it in the Header:

```tsx
// Add the 'dark' class to html
document.documentElement.classList.toggle('dark')
```

### Icons

We use Lucide React for icons:

```tsx
import { Package, User } from 'lucide-react'

<Package className="w-5 h-5" />
```

## 🔌 IPC Communication

### From the Renderer (Frontend)

```tsx
// Access APIs exposed via preload
const result = await window.electronAPI.db.query('SELECT * FROM products')
```

### Adding a new API

1. **Add a handler in main.ts:**

```typescript
ipcMain.handle('my-channel', async (event, args) => {
  // Logic here
  return result
})
```

2. **Expose it in preload.ts:**

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  myAPI: () => ipcRenderer.invoke('my-channel')
})
```

3. **Use it in the frontend:**

```typescript
const data = await window.electronAPI.myAPI()
```

## 🗄️ Database (Pending implementation)

SQLite will be configured with better-sqlite3:

```typescript
// In electron/main/database.ts
import Database from 'better-sqlite3'

const db = new Database('database/nexoracloud.db')
```

## 🐛 Debugging

### Renderer Process (Frontend)

- DevTools open automatically in development
- `console.log()` shows up in DevTools
- React DevTools are available

### Main Process (Backend)

- Add `console.log()` in main.ts
- The output appears in the terminal where you ran `npm run dev`

### Breakpoints

Use VS Code with the Debugger for Chrome/Edge extension.

## ⚠️ Common Problems

### The application doesn't open

1. Make sure no other instance is running
2. Check that port 5173 is free: `netstat -ano | findstr :5173`
3. Delete `dist-electron/` and `dist/` and run it again

### Hot reload doesn't work

1. Make sure the file was saved
2. Check that there are no TypeScript errors
3. Restart the development server

### TypeScript type errors

```bash
npm run type-check
```

This shows every type error without compiling.

## 📝 Code Conventions

### File Names

- Components: `PascalCase.tsx` (e.g. `Dashboard.tsx`)
- Utilities: `camelCase.ts` (e.g. `utils.ts`)
- Hooks: `use*.ts` (e.g. `useProducts.ts`)

### Component Structure

```tsx
// Imports
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// Types
interface Props {
  title: string
}

// Component
export function MyComponent({ title }: Props) {
  return <div>{title}</div>
}
```

### Commits

Follow the Conventional Commits convention:

```
feat: new feature
fix: bug fix
docs: documentation changes
style: formatting, semicolons, etc
refactor: refactoring
test: add tests
chore: maintenance tasks
```

## 🚢 Production Build

### Windows

```bash
npm run build:win
```

Generates the installer in `release/`

### Requirements

- Windows: Node.js
- macOS: Xcode Command Line Tools
- Linux: `build-essential`

## 📚 Resources

- [Electron Docs](https://www.electronjs.org/docs/latest)
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Problems?** Open an issue on GitHub or check the documentation in `docs/`.
