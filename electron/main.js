/*
  Nombre completo: main.js
  Ruta: electron/main.js

  Función:
    - Iniciar AgendaJeff como aplicación de escritorio con Electron.
    - Cargar index.html como shell externo.
    - Mantener intactas las carpetas internas de pantallas funcionales.
    - Aplicar configuración segura de BrowserWindow.
    - Restaurar tamaño y posición de ventana.
    - Conectar IPC básico con preload.js.

  Se conecta con:
    - electron/electron-config.js
    - electron/window-state.service.js
    - electron/preload.js
    - index.html
    - menu/
*/

"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const CONFIG = require("./electron-config");
const WindowStateService = require("./window-state.service");

let mainWindow = null;

function isMac() {
  return process.platform === "darwin";
}

function ensureSingleInstance() {
  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    app.quit();
    return false;
  }

  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  });

  return true;
}

function createBrowserWindow() {
  const stateResult = WindowStateService.createWindowOptionsFromState(app, CONFIG);

  const browserWindow = new BrowserWindow({
    ...stateResult.options,

    autoHideMenuBar: CONFIG.window.autoHideMenuBar,

    webPreferences: {
      preload: CONFIG.preload.file,
      nodeIntegration: CONFIG.security.nodeIntegration,
      contextIsolation: CONFIG.security.contextIsolation,
      sandbox: CONFIG.security.sandbox,
      webSecurity: CONFIG.security.webSecurity,
      allowRunningInsecureContent: CONFIG.security.allowRunningInsecureContent
    }
  });

  if (stateResult.state && stateResult.state.isMaximized) {
    browserWindow.maximize();
  }

  WindowStateService.bindWindowState(app, CONFIG, browserWindow);

  browserWindow.once("ready-to-show", () => {
    if (CONFIG.window.showOnReady) {
      browserWindow.show();
    }
  });

  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }

    return { action: "allow" };
  });

  browserWindow.webContents.on("will-navigate", (event, url) => {
    const isExternal = /^https?:\/\//i.test(url);

    if (isExternal) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  browserWindow.on("closed", () => {
    mainWindow = null;
  });

  return browserWindow;
}

async function loadStartFile(browserWindow) {
  if (!fs.existsSync(CONFIG.app.startFile)) {
    throw new Error(`No se encontró el archivo inicial: ${CONFIG.app.startFile}`);
  }

  await browserWindow.loadFile(CONFIG.app.startFile);
}

function registerIpcHandlers() {
  ipcMain.handle("agendaJeff:app-info", () => {
    return {
      ok: true,
      name: CONFIG.app.name,
      title: CONFIG.app.title,
      version: app.getVersion(),
      platform: process.platform,
      startFile: CONFIG.app.startFile
    };
  });

  ipcMain.handle("agendaJeff:reload-window", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();

      return {
        ok: true,
        message: "Ventana recargada."
      };
    }

    return {
      ok: false,
      message: "La ventana principal no está disponible."
    };
  });

  ipcMain.handle("agendaJeff:minimize-window", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();

      return {
        ok: true,
        message: "Ventana minimizada."
      };
    }

    return {
      ok: false,
      message: "La ventana principal no está disponible."
    };
  });

  ipcMain.handle("agendaJeff:maximize-or-restore-window", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return {
        ok: false,
        message: "La ventana principal no está disponible."
      };
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();

      return {
        ok: true,
        maximized: false,
        message: "Ventana restaurada."
      };
    }

    mainWindow.maximize();

    return {
      ok: true,
      maximized: true,
      message: "Ventana maximizada."
    };
  });

  ipcMain.handle("agendaJeff:close-window", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();

      return {
        ok: true,
        message: "Ventana cerrada."
      };
    }

    return {
      ok: false,
      message: "La ventana principal no está disponible."
    };
  });

  ipcMain.handle("agendaJeff:get-menu-snapshot", () => {
    return {
      ok: true,
      message: "Electron no lee localStorage directamente. El snapshot vive en el menú web.",
      snapshot: null
    };
  });

  ipcMain.handle("agendaJeff:save-menu-snapshot", (_event, snapshot) => {
    return {
      ok: true,
      message: "Snapshot recibido desde preload.",
      snapshot: snapshot || {}
    };
  });
}

async function createMainWindow() {
  mainWindow = createBrowserWindow();

  await loadStartFile(mainWindow);

  if (CONFIG.development.openDevTools) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function bootstrap() {
  if (!ensureSingleInstance()) {
    return;
  }

  registerIpcHandlers();

  app.whenReady().then(async () => {
    try {
      await createMainWindow();
    } catch (error) {
      console.error(error);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }

      app.quit();
    }

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createMainWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (!isMac()) {
      app.quit();
    }
  });
}

bootstrap();