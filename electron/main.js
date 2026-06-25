/*
  Nombre completo: main.js
  Ruta: electron/main.js

  Función:
    - Iniciar AgendaJeff como aplicación de escritorio con Electron.
    - Crear la ventana principal.
    - Cargar index.html desde la raíz del proyecto.
    - Registrar IPC mínimo para que la interfaz detecte el entorno Electron.
    - Mantener Electron simple para que la lógica de módulos no viva aquí.

  Se conecta con:
    - electron/electron-config.js
    - electron/preload.js
    - index.html
*/

"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { CONFIG, getWindowOptions } = require("./electron-config");

let mainWindow = null;
let ipcRegistered = false;

function isHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function registerIpcHandlers() {
  if (ipcRegistered) {
    return;
  }

  ipcRegistered = true;

  ipcMain.handle("aj:ping", function handlePing() {
    return {
      ok: true,
      appName: CONFIG.app.name,
      message: "Electron responde correctamente.",
      checkedAt: new Date().toISOString()
    };
  });

  ipcMain.handle("aj:environment", function handleEnvironment() {
    return {
      ok: true,
      mode: "electron",
      app: CONFIG.app,
      platform: process.platform,
      versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
      },
      checkedAt: new Date().toISOString()
    };
  });
}

function protectExternalNavigation(window) {
  window.webContents.setWindowOpenHandler(function handleWindowOpen(details) {
    if (isHttpUrl(details.url)) {
      shell.openExternal(details.url);
    }

    return { action: "deny" };
  });

  window.webContents.on("will-navigate", function handleNavigation(event, url) {
    const currentUrl = window.webContents.getURL();

    if (url !== currentUrl && isHttpUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

function createMainWindow() {
  const windowOptions = getWindowOptions();
  const window = new BrowserWindow(windowOptions);

  mainWindow = window;

  protectExternalNavigation(window);

  window.once("ready-to-show", function handleReadyToShow() {
    if (!window.isDestroyed()) {
      window.show();
    }
  });

  window.on("closed", function handleClosed() {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  window.loadFile(CONFIG.paths.indexHtml);

  if (CONFIG.dev.openDevTools) {
    window.webContents.openDevTools({ mode: "detach" });
  }

  return window;
}

function bootstrapElectron() {
  registerIpcHandlers();

  app.whenReady().then(function handleReady() {
    createMainWindow();

    app.on("activate", function handleActivate() {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on("window-all-closed", function handleWindowAllClosed() {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

bootstrapElectron();
