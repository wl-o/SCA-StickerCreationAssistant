const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const net = require('net')
const { spawn } = require('child_process')

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null
/** @type {null | (() => Promise<void>)} */
let closeServer = null
/** @type {import('child_process').ChildProcess | null} */
let childServer = null
let quitting = false

function getDataDir() {
  return path.join(app.getPath('userData'), 'data')
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((err) => {
        if (err) reject(err)
        else resolve(port)
      })
    })
    server.on('error', reject)
  })
}

function waitForHealth(port, timeoutMs = 20000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`)
        if (res.ok) {
          resolve(undefined)
          return
        }
      } catch {
        // retry
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`服务启动超时（端口 ${port}）`))
        return
      }
      setTimeout(tick, 200)
    }
    tick()
  })
}

function loadServerModule() {
  const serverPath = path.join(__dirname, '../dist-server/server.cjs')
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(serverPath)
}

/** 生产：在 Electron 主进程内启动（better-sqlite3 已按 Electron ABI 打包） */
async function startInProcessServer(port, staticDir) {
  process.env.DATA_DIR = getDataDir()
  process.env.PORT = String(port)
  const { startServer } = loadServerModule()
  const started = await startServer({
    port,
    host: '127.0.0.1',
    staticDir,
    logger: false,
  })
  closeServer = started.close
  return started.port
}

/** 开发：用系统 Node/tsx 起后端，避免和浏览器开发抢 native 模块 ABI */
async function startDevChildServer(port) {
  const dataDir = getDataDir()
  const projectRoot = path.join(__dirname, '..')
  const entry = path.join(projectRoot, 'server/src/index.ts')

  childServer = spawn('npx', ['tsx', entry], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      PORT: String(port),
    },
    shell: true,
    stdio: 'inherit',
  })

  childServer.on('exit', (code) => {
    if (!quitting && code && code !== 0) {
      console.error(`[electron] API process exited: ${code}`)
    }
    childServer = null
  })

  await waitForHealth(port)
  return port
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const startUrl = process.env.ELECTRON_START_URL
  if (!app.isPackaged && startUrl) {
    const apiPort = Number(process.env.ELECTRON_API_PORT || 8787)
    await startDevChildServer(apiPort)
    await mainWindow.loadURL(startUrl)
    return
  }

  const port = await findFreePort()
  const staticDir = path.join(__dirname, '../dist')
  await startInProcessServer(port, staticDir)
  await mainWindow.loadURL(`http://127.0.0.1:${port}`)
}

async function shutdown() {
  if (quitting) return
  quitting = true

  if (childServer && !childServer.killed) {
    childServer.kill()
    childServer = null
  }

  if (closeServer) {
    const closer = closeServer
    closeServer = null
    try {
      await closer()
    } catch {
      // ignore
    }
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    try {
      await createWindow()
    } catch (error) {
      console.error('[electron] failed to start', error)
      app.quit()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', (event) => {
    if (quitting) return
    if (!closeServer && !childServer) return
    event.preventDefault()
    shutdown().finally(() => app.exit(0))
  })
}
