/**
 * ┌───────────────────────────────────────────────────────────────────────────────┐
 * │ This module is the starting place of the application and mostly contains      │
 * │ electron boilerplate code. Apart from that it initializes the API that's      │
 * │ exposed to the renderer process via the preload process.                      │
 * └───────────────────────────────────────────────────────────────────────────────┘
 */

import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import './api'
import { autoUpdater } from 'electron-updater'

// Try to load electron-log, but fall back to console if it's not available
let log: any = console
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  log = require('electron-log')
} catch (e) {
  log = console
}

import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.requestSingleInstanceLock()
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  createWindow()

  // Auto-update setup (only in production builds)
  if (!is.dev) {
    ;(autoUpdater as any).logger = log
    try {
      const loggerAny = (autoUpdater as any).logger
      if (loggerAny && loggerAny.transports && loggerAny.transports.file) {
        loggerAny.transports.file.level = 'info'
      }
    } catch {}
    // Don't auto-download; ask user first
    autoUpdater.autoDownload = false

    autoUpdater.on('checking-for-update', () => {
      alert('Checking for update...')
    })

    autoUpdater.on('update-available', (info) => {
      log.info('Update available', info)
      const res = dialog.showMessageBoxSync({
        type: 'info',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
        message: 'Update available',
        detail: `Version ${info.version} is available. Download now?`
      })
      if (res === 0) autoUpdater.downloadUpdate()
    })

    autoUpdater.on('update-not-available', () => {
      log.info('No update available')
    })

    autoUpdater.on('download-progress', (progress) => {
      log.info(`Download progress: ${Math.round(progress.percent || 0)}%`)
    })

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded', info)
      const res = dialog.showMessageBoxSync({
        type: 'question',
        buttons: ['Install and restart', 'Later'],
        defaultId: 0,
        cancelId: 1,
        message: 'Install update?',
        detail: `Version ${info.version} has been downloaded. Install and restart now?`
      })
      if (res === 0) autoUpdater.quitAndInstall()
    })

    // Check for updates a few seconds after startup
    setTimeout(() => autoUpdater.checkForUpdates(), 5000)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
