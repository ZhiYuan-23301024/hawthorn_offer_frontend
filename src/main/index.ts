import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

let mainWindow: BrowserWindow | null = null

function setupConsoleRedirect() {
  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error
  const originalInfo = console.info

  const prefix = '[Electron]'

  console.log = (...args: unknown[]) => {
    originalLog.apply(console, [`${prefix}`, ...args])
  }

  console.warn = (...args: unknown[]) => {
    originalWarn.apply(console, [`${prefix} [WARN]`, ...args])
  }

  console.error = (...args: unknown[]) => {
    originalError.apply(console, [`${prefix} [ERROR]`, ...args])
  }

  console.info = (...args: unknown[]) => {
    originalInfo.apply(console, [`${prefix} [INFO]`, ...args])
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Hawthorn Offer',
    frame: true,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.webContents.on('console-message', (event) => {
    const params = event as unknown as { level: string; message: string; line: number; sourceId: string }
    const { level, message, line, sourceId } = params
    const source = sourceId ? ` (${sourceId}:${line})` : ''
    switch (level) {
      case 'info':
        console.log(`[Renderer] LOG: ${message}${source}`)
        break
      case 'warning':
        console.warn(`[Renderer] WARN: ${message}${source}`)
        break
      case 'error':
        console.error(`[Renderer] ERROR: ${message}${source}`)
        break
      case 'debug':
        console.log(`[Renderer] DEBUG: ${message}${source}`)
        break
      default:
        console.log(`[Renderer] LOG: ${message}${source}`)
    }
  })

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile']
  })
  return result.filePaths[0] || null
})

ipcMain.handle('file:save', async (_, path: string, content: string) => {
  const fs = await import('fs')
  await fs.promises.writeFile(path, content, 'utf-8')
  return true
})

setupConsoleRedirect()

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})