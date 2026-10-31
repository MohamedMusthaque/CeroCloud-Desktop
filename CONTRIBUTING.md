# Contribuyendo a NexoraCloud

¡Gracias por tu interés en contribuir a **NexoraCloud**! 🎉

Este documento proporciona lineamientos para contribuir al proyecto.

---

## 📋 Código de Conducta

- Sé respetuoso y profesional.
- Acepta críticas constructivas.
- Enfócate en lo que es mejor para la comunidad.
- Mantén un ambiente colaborativo y amigable.

---

## 🚀 Cómo Contribuir

### 1. Reportar Bugs

Si encuentras un bug:

1. Verifica que no haya sido reportado previamente.
2. Abre un **Issue** con:
   - Descripción clara del problema.
   - Pasos para reproducirlo.
   - Comportamiento esperado vs. actual.
   - Versión del sistema operativo y de la aplicación.
   - Screenshots si es posible.

### 2. Sugerir Mejoras

¿Tienes una idea para mejorar el proyecto?

1. Abre un **Issue** etiquetado como `enhancement`.
2. Describe claramente:
   - El problema que resuelve.
   - Cómo mejoraría la experiencia del usuario.
   - Posibles implementaciones.

### 3. Contribuir con Código

#### Preparación

1. Haz fork del repositorio.
2. Clona tu fork:
   ```bash
   git clone https://github.com/TU-USUARIO/CeroCloud-Desktop.git
   ```
3. Agrega el repositorio original como upstream:
   ```bash
   git remote add upstream https://github.com/CeroCloud/CeroCloud-Desktop.git
   ```
4. Crea una rama para tu feature desde `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/nombre-descriptivo
   ```

**📖 Consulta la guía completa de Gitflow:** [docs/GITFLOW.md](docs/GITFLOW.md)

#### Desarrollo

1. Asegúrate de seguir la **arquitectura definida** en `docs/ARCHITECTURE.md`.
2. Escribe código limpio y bien documentado.
3. Sigue las convenciones de TypeScript y React.
4. Mantén la consistencia con el código existente.

### 4. Commits (¡IMPORTANTE!)

Este proyecto utiliza **Semantic Release** para automatizar versiones y changelogs.
Por eso, es **OBLIGATORIO** seguir la convención [Conventional Commits](https://www.conventionalcommits.org/).

El formato estricto es:
```
tipo(scope): descripción breve en minúsculas


Descripción detallada (opcional)
```

**Tipos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formato, punto y coma faltantes, etc.
- `refactor`: Refactorización de código
- `test`: Agregar o corregir tests
- `chore`: Tareas de mantenimiento

**Ejemplos:**
```
feat(inventory): add product search functionality
fix(pos): correct cart total calculation
docs(readme): update installation instructions
```

#### Pull Request

1. Asegúrate de que tu código funciona correctamente.
2. Verifica que pase el linting y type-check:
   ```bash
   npm run lint
   npm run type-check
   ```
3. Actualiza la documentación si es necesario.
4. Haz push a tu fork:
   ```bash
   git push origin feature/nombre-descriptivo
   ```
5. Abre un **Pull Request** hacia la rama `develop` (NO a `main`).
   - **Features** → `develop`
   - **Hotfixes** → `main` y `develop`
   - **Releases** → `main` y luego merge de vuelta a `develop`

**⚠️ IMPORTANTE:** Los PRs a `main` solo se aceptan desde ramas `release/*` o `hotfix/*`.
5. Describe claramente:
   - Qué cambios realizaste.
   - Por qué son necesarios.
   - Cómo probar los cambios.

---

## 🎯 Prioridades del Proyecto

Consulta el archivo `Roadmap.md` para conocer las prioridades actuales y las fases de desarrollo.

---

## 📝 Estándares de Código

### TypeScript
- Usa tipos estrictos.
- Evita `any` siempre que sea posible.
- Define interfaces claras para estructuras de datos.

### React
- Componentes funcionales con hooks.
- Props tipadas con TypeScript.
- Componentes reutilizables en `src/components/`.

### Estilos
- Usa Tailwind CSS para estilos.
- Mantén consistencia con el diseño existente.
- Usa Shadcn/UI para componentes estándar.

### Base de Datos
- Todas las operaciones SQLite deben estar en el Main Process.
- Usa prepared statements para prevenir SQL injection.
- Documenta el esquema de las tablas.

---

## 🧪 Testing

Actualmente el proyecto está en fase inicial. Se agregarán guidelines de testing en futuras versiones.

---

## 📚 Documentación

Si agregas nuevas funcionalidades:

1. Actualiza `README.md` si es relevante.
2. Documenta cambios en `changelog.md`.
3. Actualiza `docs/ARCHITECTURE.md` si afecta la arquitectura.

---

## ❓ ¿Necesitas Ayuda?

- Revisa la documentación en la carpeta `docs/`.
- Abre un **Issue** con la etiqueta `question`.
- Contacta a los mantenedores del proyecto.

---

## 🙏 Reconocimientos

Todos los contribuidores serán reconocidos en el proyecto.

¡Gracias por hacer de **NexoraCloud** un mejor proyecto! 🚀
