# Electron 桌面端设计（Windows 优先）

## 目标

将现有 Vue + Fastify + SQLite Web 应用打包为 Windows 桌面程序（NSIS `.exe` 安装包）。macOS 后续再扩。暂不代码签名。

## 架构（方案 1）

- Electron Main 创建窗口，设置 `DATA_DIR`，在主进程内启动 Fastify。
- Fastify 只监听 `127.0.0.1`，提供 `/api/*`、`/ai-proxy/*`，并静态托管前端 `dist/`。
- BrowserWindow 加载 `http://127.0.0.1:<port>/`。
- 用户数据：`app.getPath('userData')/data`（`app.sqlite` + `images/`），与仓库 `data/` 隔离。

## 开发与脚本

- 保留 `npm run dev`（浏览器）。
- `npm run electron:dev`：Vite + 内嵌/联调 Electron。
- `npm run electron:build`：构建前端 + 打包 server + electron-builder NSIS。

## 打包

- `electron-builder`，Windows `nsis`。
- `better-sqlite3` 针对 Electron ABI rebuild，并 `asarUnpack`。
- 产物目录：`release/`。

## 非目标（本阶段）

- macOS / Linux 安装包
- 代码签名与自动更新
- 从旧 `data/` 一键导入
