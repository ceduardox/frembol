# Instrucciones Operativas y Reglas para Agentes IA — FREMBOL

Este documento contiene las reglas críticas y directrices de arquitectura para cualquier asistente de IA (Antigravity, Cursor, Windsurf, Cline, etc.) o desarrollador trabajando en este repositorio.

---

## 1. Repositorio y Despliegue en Producción
* **Repositorio oficial:** `https://github.com/ceduardox/frembol.git`
* **Rama de producción:** `main`
* **Plataforma de despliegue:** Coolify v4 en VPS Hetzner (`5.78.221.222`), Aplicación ID `37` (`ux5liu8g912mj0anm3kgyzll`).
* **Mecanismo de despliegue:** **Automático mediante Webhook de GitHub**.
  * Cada `git push origin main` dispara automáticamente el build y despliegue en Coolify.

---

## 2. Reglas Estrictas de Recursos y Compilación (PROHIBIDO MODIFICAR A CIEGAS)

El servidor VPS es compartido con otras aplicaciones y bases de datos. **Para evitar que Next.js sature la RAM y dispare el OOM Killer del sistema operativo**, se deben respetar SIEMPRE las siguientes directrices:

### A. Configuración en `next.config.ts`:
1. **Límite de núcleos en build:** Debe conservarse `experimental: { cpus: 1 }`.
   * *Razón:* Si se omite, Turbopack/Next.js genera hilos en paralelo consumiendo todos los núcleos de la CPU, multiplicando el consumo de memoria por encima de 4 GB.
2. **TypeScript en build de Docker:** Debe conservarse `typescript: { ignoreBuildErrors: true }`.
   * *Razón:* El paso `Running TypeScript ...` dentro del contenedor tarda más de 2 minutos y consume más de 2 GB de RAM adicionales. Los chequeos de tipos deben ejecutarse en local o CI (`npm run check` o `npx tsc --noEmit`), nunca dentro del contenedor en el VPS.

### B. Configuración en `Dockerfile`:
1. **Límites de memoria Node.js:**
   * En `deps` y `builder`: `ENV NODE_OPTIONS=--max-old-space-size=2048`.
   * En `runner` (runtime): `ENV NODE_OPTIONS=--max-old-space-size=1536`.
   * *Razón:* Fuerza a V8 a recolectar basura y previene fugas de memoria en ejecución continua.
2. **Montajes de caché BuildKit:**
   * La primera línea DEBE ser `# syntax=docker/dockerfile:1`.
   * Los comandos `RUN npm ci` y `RUN npm run build` deben usar `--mount=type=cache,target=...`.
3. **Modo Standalone:**
   * Mantener `output: 'standalone'` en `next.config.ts` y la copia de `.next/standalone` en el runner.

### C. Script de Arranque `init-db.sh`:
* **Nunca volver a poner bucles infinitos** (`until pg_isready`). Debe mantenerse la verificación de variables de entorno y el límite de reintentos (`max_retries=15`) con timeout de 30s.

---

## 3. Límites del Contenedor en Coolify
La aplicación en Coolify tiene configurados los siguientes techos de seguridad en Docker:
* **Memory Limit:** `2048M` (2 GB).
* **Memory Reservation:** `512M`.
* **Memory Swap Limit:** `2560M`.
* **CPUs:** `1.5`.

> ⚠️ **Advertencia:** NUNCA restablecer estos límites a `0` (ilimitado) en Coolify.

---

## 4. Base de Datos PostgreSQL
* Frembol utiliza el contenedor PostgreSQL administrado por Coolify: `m2gvlv9mjpu5dv643uzb5m3k` (puerto interno `5432`).
* Las migraciones se aplican automáticamente en el arranque mediante `init-db.sh` (`npx prisma migrate deploy`).
