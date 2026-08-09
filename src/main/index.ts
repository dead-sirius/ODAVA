import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Scanner } from './scanner'

let mainWindow: BrowserWindow | null = null;
let scanner: Scanner | null = null;

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Initialize Scanner Service
  scanner = new Scanner();
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers
ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('check-model-status', async () => {
  return { ready: scanner ? scanner.isModelReady() : false };
});

ipcMain.handle('setup-model', async (_, modelName: string) => {
  if (scanner) {
    await scanner.setupModel(modelName);
    return { success: true };
  }
  return { success: false, error: 'Scanner not initialized' };
});

ipcMain.handle('start-scan', async (event, dirPath) => {
  if (!scanner) return [];
  
  // Send progress events back to the renderer
  const onProgress = (progress: number, newVuln: any) => {
    event.sender.send('scan-progress', progress, newVuln);
  };
  
  try {
    const results = await scanner.scanDirectory(dirPath, onProgress);
    return results;
  } catch (error) {
    console.error('Scan failed:', error);
    return [];
  }
});

ipcMain.handle('export-pdf', async () => {
  if (!mainWindow) return { success: false, error: 'No main window' };

  try {
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false
    });

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Vulnerability Report',
      defaultPath: 'ODAVA_Report.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!canceled && filePath) {
      fs.writeFileSync(filePath, pdfData);
      return { success: true, filePath };
    }
    return { success: false, canceled: true };
  } catch (error: any) {
    console.error('Failed to export PDF:', error);
    return { success: false, error: error.message };
  }
});
