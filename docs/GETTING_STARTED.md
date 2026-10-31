# Quick Start Guide

This guide will help you set up the development environment and start working on **NexoraCloud**.

---

## 📋 Prerequisites

Before you begin, make sure you have installed:

### Required

- **Node.js** v20.0.0 or later (LTS recommended)
- **npm** v10.0.0 or later (included with Node.js)

### Check the Installation

```bash
node --version    # Should show v20.x.x or later
npm --version     # Should show 10.x.x or later
```

### Optional Tools (Recommended)

- **Git** - Version control
- **VS Code** - Code editor (with the recommended extensions)

---

## 🚀 Installing the Project

### 1. Clone the Repository

```bash
git clone https://github.com/CeroCloud/CeroCloud-Desktop.git
cd NexoraCloud
```

Or download the ZIP and extract it.

### 2. Install Dependencies

```bash
npm install
```

This command installs every required dependency:
- Electron
- React and React DOM
- Vite
- TypeScript
- Tailwind CSS
- Shadcn/UI components
- better-sqlite3
- And all the development tools

**Estimated time:** 2-5 minutes (depending on your connection).

---

## 🏗️ Project Structure

Once installed, you will see this structure:

```
NexoraCloud/
├── electron/                # Electron code (Main Process)
│   ├── main/               # Main logic
│   ├── preload/            # Preload scripts
│   └── assets/             # App icons
├── src/                    # Frontend (React)
│   ├── app/                # Root and configuration
│   ├── components/         # UI components
│   ├── features/           # System modules
│   ├── hooks/              # Custom hooks
│   ├── services/           # IPC services
│   ├── styles/             # Global styles
│   └── types/              # TypeScript types
├── database/               # Local database
│   └── backups/            # Automatic backups
├── public/                 # Public assets
├── docs/                   # Documentation
└── package.json            # Project configuration
```

---

## 🎯 Main Commands

### Development

Start the development server:

```bash
npm run dev
```

This will:
1. Compile the TypeScript code
2. Start the Vite dev server
3. Launch the Electron application
4. Enable hot reload

### Production Build

Generate the executable for your platform:

```bash
npm run build           # Build the application
npm run build:win      # Windows executable
npm run build:mac      # macOS executable
npm run build:linux    # Linux executable
```

### Other Useful Commands

```bash
npm run lint           # Check the code with ESLint
npm run format         # Format the code with Prettier
npm run type-check     # Check TypeScript types
```

---

## 🛠️ Environment Setup

### Environment Variables (Optional)

Create a `.env.local` file in the project root:

```env
# Development configuration
VITE_APP_NAME=NexoraCloud
VITE_DB_PATH=./database/nexoracloud.db
```

**Note:** `.env*` files are in `.gitignore` for security.

---

## 📝 Your First Development Steps

### 1. Get Familiar with the Architecture

Read these documents in order:

1. `docs/PROJECT_STATEMENT.md` - Understand the goal
2. `docs/ARCHITECTURE.md` - Understand the architecture
3. `docs/TECH_STACK.md` - Learn the technologies

### 2. Explore the Code Base

```bash
# Start the development server
npm run dev
```

The application opens automatically.

### 3. Make Your First Change

1. Open `src/app/App.tsx`
2. Change the welcome text
3. Save the file
4. Watch the change appear automatically in the app ✨

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'electron'"

**Solution:** Run `npm install` again.

### Error: "node-gyp rebuild failed"

**Solution for Windows:**
```bash
npm install --global windows-build-tools
npm install
```

**Solution for macOS:**
```bash
xcode-select --install
npm install
```

**Solution for Linux:**
```bash
sudo apt-get install build-essential
npm install
```

### The application doesn't open

1. Make sure no other instance is running
2. Check the console for errors
3. Try `npm run dev -- --debug`

### Hot reload doesn't work

1. Restart the development server
2. Check that there are no TypeScript errors
3. Clear the cache: `npm run clean` (if it exists)

---

## 🎨 Editor Setup (VS Code)

### Recommended Extensions

Create `.vscode/extensions.json`:

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

### Recommended Settings

Create `.vscode/settings.json`:

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

## 📚 Useful Resources

### Documentation

- [Electron Docs](https://www.electronjs.org/docs/latest)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/UI](https://ui.shadcn.com)

### Community

- GitHub Issues - To report bugs
- GitHub Discussions - For general questions
- CONTRIBUTING.md - Contribution guide

---

## ✅ Setup Checklist

Before you start developing, check:

- [ ] Node.js and npm installed correctly
- [ ] Dependencies installed (`npm install`)
- [ ] Application running in development (`npm run dev`)
- [ ] Editor configured (extensions and settings)
- [ ] Documentation read (at least ARCHITECTURE.md)
- [ ] Git configured (name and email)

---

## 🎯 Next Steps

1. **Explore the code:** Get familiar with the structure
2. **Read the Roadmap:** Learn what is being developed
3. **Check the Issues:** Find tasks to contribute to
4. **Make your first change:** Experiment with components
5. **Read CONTRIBUTING.md:** Learn the workflow

---

## 💡 Tips

- **Keep dependencies up to date:** Check regularly
- **Read error messages in full:** They often point to the solution
- **Check the official documentation:** It is the source of truth
- **Make small, frequent commits:** It makes debugging easier
- **Ask when in doubt:** Better to ask than to assume

---

Happy coding! 🚀

**Problems?** Check `docs/` or open an Issue on GitHub.
