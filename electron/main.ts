import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Custom styled desktop titlebar with Windows controls
    titleBarStyle: 'hidden',
    backgroundColor: '#FBF8F3',
    show: false, // Window ready hone tak nahi dikhegi
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Remove default menu for sleek desktop look
  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load URL or local index.html
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Production (.exe) build mein local file load hogi
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    
    // 🚨 DEBUGGING KE LIYE: Agar .exe mein phir bhi white screen aaye, toh DevTools khul jayega
    // Jab sab kuch sahi chalne lage, toh is line ko comment (//) kar dein
    mainWindow.webContents.openDevTools(); 
  }
}

// Window control IPC handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('app:getInfo', () => {
  return {
    name: 'CueMaster Snooker Club Manager',
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
