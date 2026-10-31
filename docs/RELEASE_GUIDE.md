# 📦 Guía Rápida: Crear tu Primer Release con Auto-Update

**Para:** NexoraCloud Desktop  
**Objetivo:** Publicar v1.1.0 con sistema de auto-actualización funcional

---

## 🎯 Pre-requisitos

Antes de comenzar, asegúrate de tener:

- ✅ Node.js v20+ instalado
- ✅ Git configurado
- ✅ Acceso al repositorio GitHub (push access)
- ✅ Proyecto compilando sin errores (`npm run type-check`)

---

## 📋 Paso a Paso

### 1️⃣ **Preparar la Nueva Versión**

```bash
# Navegar al directorio del proyecto
cd C:\Users\danie\Desktop\CeroCloud-Desktop

# Actualizar la versión en package.json
npm version minor
# Esto cambiará de 1.0.0 → 1.1.0
# Y creará un commit automático

# Resultado esperado:
# v1.1.0
```

### 2️⃣ **Actualizar el Changelog**

Edita `changelog.md` y agrega:

```markdown
## [1.1.0] – 2026-01-XX 🎉 **SISTEMA DE AUTO-ACTUALIZACIÓN**

### Added - ✅ **Auto-Update integrado**
- ✅ Verificación automática cada 6 horas
- ✅ Notificaciones elegantes con Sonner toasts
- ✅ Descarga en segundo plano con barra de progreso
- ✅ Instalación opcional (no forzada)
- ✅ Soporte para GitHub Releases
- ✅ Logs detallados para debugging

### Technical
- Agregado `electron-updater` y `electron-log`
- Nuevo servicio `AutoUpdateService` en main process
- Componente `UpdateNotifier` para UI
- API completa en preload script
```

Guarda el archivo.

### 3️⃣ **Commit y Push**

```bash
# Agregar changelog
git add changelog.md

# Commit
git commit -m "docs: update changelog for v1.1.0"

# Push a main (o develop según tu workflow)
git push origin main

# Push del tag
git push origin v1.1.0
```

### 4️⃣ **Build de la Aplicación**

```bash
# Build para Windows
npm run build:win

# Esto generará en la carpeta 'release':
# - NexoraCloud Setup 1.1.0.exe (~80-120 MB)
# - latest.yml (metadata para auto-updater)
```

**⏱️ Tiempo estimado:** 2-5 minutos dependiendo de tu PC.

**📁 Archivos generados:**
```
release/
  ├── NexoraCloud Setup 1.1.0.exe   ← Instalador principal
  └── latest.yml                   ← Metadata de actualización
```

### 5️⃣ **Crear Release en GitHub**

#### Opción A: Interfaz Web (Recomendado)

1. Ve a: https://github.com/CeroCloud/CeroCloud-Desktop/releases

2. Click en **"Draft a new release"**

3. Completa el formulario:
   ```
   Tag version: v1.1.0
   Release title: v1.1.0 - Auto-Update & Mejoras
   
   Description:
   ## 🎉 Novedades
   
   ### Sistema de Auto-Actualización
   NexoraCloud ahora se actualiza automáticamente:
   - ✅ Notificaciones de nuevas versiones
   - ✅ Descarga en segundo plano
   - ✅ Instalación sin interrumpir tu trabajo
   
   ### Mejoras Técnicas
   - Verificación cada 6 horas
   - Logs detallados en `%APPDATA%\nexoracloud\logs`
   - Compatible con GitHub Releases
   
   ## 📥 Descarga
   Descarga el instalador para Windows más abajo.
   
   ## 🔄 Actualización desde v1.0.0
   Si ya tienes NexoraCloud instalado:
   1. La app te notificará automáticamente
   2. Click en "Descargar"
   3. Espera la descarga
   4. Click en "Instalar y Reiniciar"
   
   ## 📝 Changelog Completo
   Ver [changelog.md](https://github.com/CeroCloud/CeroCloud-Desktop/blob/main/changelog.md)
   ```

4. **Subir archivos:**
   - Arrastra `NexoraCloud Setup 1.1.0.exe` al área de assets
   - Arrastra `latest.yml` al área de assets

5. Marcar como "**Latest release**" (checkbox)

6. Click en **"Publish release"**

#### Opción B: GitHub CLI (Avanzado)

```bash
# Instalar gh CLI si no lo tienes
# https://cli.github.com/

# Autenticarse
gh auth login

# Crear release
gh release create v1.1.0 \
  --title "v1.1.0 - Auto-Update & Mejoras" \
  --notes "Sistema de auto-actualización integrado. Ver changelog para detalles." \
  "release/NexoraCloud Setup 1.1.0.exe#NexoraCloud-Setup-1.1.0.exe" \
  "release/latest.yml#latest.yml"
```

### 6️⃣ **Verificar el Release**

1. Ve al release publicado:
   ```
   https://github.com/CeroCloud/CeroCloud-Desktop/releases/tag/v1.1.0
   ```

2. Verifica que aparezcan:
   - ✅ Tag: `v1.1.0`
   - ✅ Archivo: `NexoraCloud-Setup-1.1.0.exe` (~80-120 MB)
   - ✅ Archivo: `latest.yml` (~1 KB)
   - ✅ Descripción del release

---

## 🧪 Testing del Auto-Update

### Simular Actualización (Testing Local)

Para verificar que funciona:

1. **Instala la versión OLD (simulada):**
   ```bash
   # Cambia temporalmente la versión a 1.0.9
   # En package.json: "version": "1.0.9"
   
   npm run build:win
   # Instala este .exe
   ```

2. **Ejecuta la app instalada**
   - Espera 5 segundos
   - Debería mostrar: "🎉 ¡Nueva versión 1.1.0 disponible!"

3. **Descargar e Instalar**
   - Click en "Descargar"
   - Espera la descarga (verás la barra de progreso)
   - Click en "Instalar y Reiniciar"
   - La app se cierra, actualiza y reabre con v1.1.0

### Ver Logs

```powershell
# En PowerShell
Get-Content "$env:APPDATA\nexoracloud\logs\main.log" -Tail 30

# Buscar líneas como:
# 🔍 Verificando actualizaciones...
# ✅ Actualización disponible: 1.1.0
# ⬇️ Descargando...
# ✅ Actualización descargada: 1.1.0
```

---

## 🎨 Capturas para el Release (Opcional)

Para hacer el release más atractivo, puedes agregar capturas de pantalla:

### Captura 1: Notificación de Actualización
![update-notification](screenshots/update-notification.png)

### Captura 2: Barra de Progreso
![update-download](screenshots/update-download.png)

Sube las imágenes en la descripción del release usando:
```markdown
![Descripción](URL_de_la_imagen)
```

---

## ⚠️ Problemas Comunes

### "Latest.yml not found"
**Causa:** electron-builder no lo generó.

**Solución:**
```bash
# Asegúrate de que package.json tiene:
"build": {
  "publish": {
    "provider": "github",
    "releaseType": "release"
  }
}

# Re-build
npm run build:win
```

### "Update check failed"
**Causa:** El repositorio está privado o no tienes permisos.

**Solución:**
- Asegúrate de que el repo es **público** en GitHub
- O configura un GitHub Token (ver `docs/AUTO_UPDATE.md`)

### "SmartScreen warning" en Windows
**Causa:** El .exe no está firmado digitalmente.

**Solución (temporal):**
- Los usuarios pueden hacer click en "Más información" → "Ejecutar de todas formas"

**Solución (permanente):**
- Obtener un certificado de código (Sectigo, DigiCert)
- Ver: `docs/AUTO_UPDATE.md` sección "Code Signing"

---

## 📊 Checklist Final

Antes de publicar, verifica:

- [ ] Versión actualizada en `package.json` (1.1.0)
- [ ] Changelog actualizado
- [ ] Commit y push realizados
- [ ] Tag `v1.1.0` creado y pusheado
- [ ] Build completado exitosamente
- [ ] Archivos `.exe` y `latest.yml` generados
- [ ] Release creado en GitHub
- [ ] Assets subidos correctamente
- [ ] Release marcado como "Latest"
- [ ] Descripción del release completa

---

## 🎉 ¡Listo!

Ahora todos los usuarios que tengan NexoraCloud instalado recibirán una notificación automática cuando haya v1.1.0 disponible.

### Próxima vez (más simple):

```bash
npm version patch  # 1.1.0 → 1.1.1
git push origin main v1.1.1
npm run build:win
# Crear release en GitHub con los archivos
```

---

## 🆘 ¿Necesitas Ayuda?

- 📖 **Documentación Completa:** `docs/AUTO_UPDATE.md`
- 📝 **Resumen de Feature:** `docs/FEATURE_AUTO_UPDATE_SUMMARY.md`
- 🐛 **Issues:** https://github.com/CeroCloud/CeroCloud-Desktop/issues
- 📧 **Email:** proyectogit22@gmail.com

---

**¿Todo funcionó? ¡Felicidades, acabas de implementar auto-updates en tu app Electron! 🚀**
