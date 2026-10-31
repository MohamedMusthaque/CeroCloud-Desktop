# Contributing to NexoraCloud

Thank you for your interest in contributing to **NexoraCloud**! 🎉

This document provides guidelines for contributing to the project.

---

## 📋 Code of Conduct

- Be respectful and professional.
- Accept constructive criticism.
- Focus on what is best for the community.
- Keep the environment collaborative and friendly.

---

## 🚀 How to Contribute

### 1. Report Bugs

If you find a bug:

1. Check that it hasn't been reported already.
2. Open an **Issue** with:
   - A clear description of the problem.
   - Steps to reproduce it.
   - Expected vs. actual behavior.
   - Your operating system and application versions.
   - Screenshots if possible.

### 2. Suggest Improvements

Do you have an idea to improve the project?

1. Open an **Issue** labeled `enhancement`.
2. Clearly describe:
   - The problem it solves.
   - How it would improve the user experience.
   - Possible implementations.

### 3. Contribute Code

#### Setup

1. Fork the repository.
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/CeroCloud-Desktop.git
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/CeroCloud/CeroCloud-Desktop.git
   ```
4. Create a branch for your feature from `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/descriptive-name
   ```

**📖 See the complete Gitflow guide:** [docs/GITFLOW.md](docs/GITFLOW.md)

#### Development

1. Make sure you follow the **defined architecture** in `docs/ARCHITECTURE.md`.
2. Write clean, well-documented code.
3. Follow the TypeScript and React conventions.
4. Stay consistent with the existing code.

### 4. Commits (IMPORTANT!)

This project uses **Semantic Release** to automate versions and changelogs.
That is why following the [Conventional Commits](https://www.conventionalcommits.org/) convention is **MANDATORY**.

The strict format is:
```
type(scope): short lowercase description


Detailed description (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code refactoring
- `test`: Add or fix tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(inventory): add product search functionality
fix(pos): correct cart total calculation
docs(readme): update installation instructions
```

#### Pull Request

1. Make sure your code works correctly.
2. Check that it passes linting and type-check:
   ```bash
   npm run lint
   npm run type-check
   ```
3. Update the documentation if needed.
4. Push to your fork:
   ```bash
   git push origin feature/descriptive-name
   ```
5. Open a **Pull Request** against the `develop` branch (NOT `main`).
   - **Features** → `develop`
   - **Hotfixes** → `main` and `develop`
   - **Releases** → `main`, then merge back into `develop`

**⚠️ IMPORTANT:** PRs to `main` are only accepted from `release/*` or `hotfix/*` branches.
5. Clearly describe:
   - What changes you made.
   - Why they are needed.
   - How to test the changes.

---

## 🎯 Project Priorities

See the `Roadmap.md` file for the current priorities and development phases.

---

## 📝 Code Standards

### TypeScript
- Use strict types.
- Avoid `any` whenever possible.
- Define clear interfaces for data structures.

### React
- Functional components with hooks.
- Props typed with TypeScript.
- Reusable components in `src/components/`.

### Styles
- Use Tailwind CSS for styles.
- Stay consistent with the existing design.
- Use Shadcn/UI for standard components.

### Database
- All SQLite operations must live in the Main Process.
- Use prepared statements to prevent SQL injection.
- Document the table schema.

---

## 🧪 Testing

The project is currently in an early phase. Testing guidelines will be added in future versions.

---

## 📚 Documentation

If you add new features:

1. Update `README.md` if relevant.
2. Document the changes in `changelog.md`.
3. Update `docs/ARCHITECTURE.md` if it affects the architecture.

---

## ❓ Need Help?

- Check the documentation in the `docs/` folder.
- Open an **Issue** with the `question` label.
- Contact the project maintainers.

---

## 🙏 Acknowledgements

All contributors will be acknowledged in the project.

Thank you for making **NexoraCloud** a better project! 🚀
