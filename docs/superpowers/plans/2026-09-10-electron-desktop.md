# Electron Desktop Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Ship a Windows NSIS installer that runs the existing Vue + Fastify + SQLite app as a desktop program with isolated AppData storage.

**Architecture:** Electron main sets `DATA_DIR`, starts Fastify in-process (bundled server), serves `dist/` + API + AI proxy on `127.0.0.1`, opens BrowserWindow to that origin.

**Tech Stack:** Electron, electron-builder, esbuild (server bundle), @fastify/static, better-sqlite3 (+ @electron/rebuild)

## Global Constraints

- Windows first; unsigned OK
- Data under `userData/data`, not repo `data/`
- Keep existing `npm run dev` working
- Do not commit unless user asks

---

### Task 1: Server readiness (DATA_DIR, startServer, static, AI proxy)

**Files:**
- Modify: `server/src/db.ts`
- Modify: `server/src/index.ts`
- Create: `scripts/build-server.mjs`

### Task 2: Electron shell

**Files:**
- Create: `electron/main.cjs`
- Modify: `package.json` (main, scripts, build, deps)

### Task 3: Install deps, rebuild native, verify electron:dev + build

**Commands:** npm install; electron-builder --win nsis (or dir for faster smoke)

---
