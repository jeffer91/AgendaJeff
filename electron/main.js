/*
  Nombre completo: main.js
  Ruta: electron/main.js

  Función:
    - Iniciar AgendaJeff como aplicación de escritorio con Electron.
    - Cargar index.html como shell externo.
    - Mantener la app viva en segundo plano cuando el usuario cierra la ventana.
    - Crear Tray real junto al reloj de Windows.
    - Iniciar motor liviano de recordatorios.
    - Enviar notificaciones nativas y Telegram desde segundo plano.
*/

"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("fs");

const CONFIG = require("./electron-config");
const WindowStateService = require("./window-state.service");
const createBackgroundStoreService = require("./background/bg-store.service");
const createBackgroundNotificationService = require("./background/bg-notification.service");
const createBackgroundTelegramService = require("./background/bg-telegram.service");
const createBackgroundReminderEngineService = require("./background/bg-reminder-engine.service");
const createBackgroundTrayService = require("./background/bg-tray.service");
const createBackgroundIpcService = require("./background/bg-ipc.service");

let mainWindow = null;
let isQuitting = false;

let backgroundStoreService = null;
let backgroundNotificationService = null;
let backgroundTelegramService = null;
let backgroundReminderEngineService = null;
let backgroundTrayService = null;
let backgroundIpcService = null;

function isMac() {
  return process.platform === "darwin";
}

function getMainWindow() {
  return mainWindow;
}

function requestQuit() {
  isQuitting = true;

  if (backgroundReminderEngineService && typeof backgroundReminderEngineService.stop === "function") {
    backgroundReminderEngineService.stop();
  }

  if (backgroundTrayService && typeof backgroundTrayService.destroyTray === "function") {
    backgroundTrayService.destroyTray();
  }

  app.quit();
}

function ensureSingleInstance() {
  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    app.quit();
    return false;
  }

  app.on("second-instance", async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      await createMainWindow();
      return;
    }

    if (!mainWindow.isVisible()) {
      mainWindow.show();
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
    if (CONFIG.window.showOnReady && !CONFIG.background.startMinimized) {
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
    if (/^https?:\/\//i.test(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  browserWindow.on("close", (event) => {
    if (isQuitting || !CONFIG.background.hideOnClose) {
      return;
    }

    event.preventDefault();

    if (backgroundTrayService && typeof backgroundTrayService.hideMainWindow === "function") {
      backgroundTrayService.hideMainWindow();
      return;
    }

    browserWindow.hide();
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

function registerBasicIpcHandlers() {
  ipcMain.handle("agendaJeff:app-info", () => ({
    ok: true,
    name: CONFIG.app.name,
    title: CONFIG.app.title,
    version: app.getVersion(),
    platform: process.platform,
    startFile: CONFIG.app.startFile,
    backgroundEnabled: CONFIG.background.enabledByDefault,
    trayEnabled: CONFIG.tray.enabled
  }));

  ipcMain.handle("agendaJeff:reload-window", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();
      return { ok: true, message: "Ventana recargada." };
    }
    return { ok: false, message: "La ventana principal no está disponible." };
  });

  ipcMain.handle("agendaJeff:minimize-window", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
      return { ok: true, message: "Ventana minimizada." };
    }
    return { ok: false, message: "La ventana principal no está disponible." };
  });

  ipcMain.handle("agendaJeff:maximize-or-restore-window", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, message: "La ventana principal no está disponible." };
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return { ok: true, maximized: false, message: "Ventana restaurada." };
    }

    mainWindow.maximize();
    return { ok: true, maximized: true, message: "Ventana maximizada." };
  });

  ipcMain.handle("agendaJeff:close-window", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, message: "La ventana principal no está disponible." };
    }

    if (CONFIG.background.hideOnClose) {
      if (backgroundTrayService && typeof backgroundTrayService.hideMainWindow === "function") {
        return backgroundTrayService.hideMainWindow();
      }

      mainWindow.hide();
      return { ok: true, message: "Ventana oculta. AgendaJeff sigue activo en segundo plano." };
    }

    mainWindow.close();
    return { ok: true, message: "Ventana cerrada." };
  });

  ipcMain.handle("agendaJeff:get-menu-snapshot", () => ({
    ok: true,
    message: "Electron no lee localStorage directamente. El snapshot vive en el menú web.",
    snapshot: null
  }));

  ipcMain.handle("agendaJeff:save-menu-snapshot", (_event, snapshot) => ({
    ok: true,
    message: "Snapshot recibido desde preload.",
    snapshot: snapshot || {}
  }));
}

function initializeBackgroundServices() {
  backgroundStoreService = createBackgroundStoreService(app, CONFIG);
  backgroundNotificationService = createBackgroundNotificationService(app, CONFIG);
  backgroundTelegramService = createBackgroundTelegramService(backgroundStoreService);

  backgroundReminderEngineService = createBackgroundReminderEngineService(CONFIG, {
    storeService: backgroundStoreService,
    notificationService: backgroundNotificationService,
    telegramService: backgroundTelegramService
  });

  backgroundTrayService = createBackgroundTrayService(app, CONFIG, {
    getMainWindow,
    createMainWindow,
    requestQuit,
    storeService: backgroundStoreService,
    notificationService: backgroundNotificationService
  });

  backgroundIpcService = createBackgroundIpcService(ipcMain, {
    getMainWindow,
    createMainWindow,
    requestQuit,
    storeService: backgroundStoreService,
    notificationService: backgroundNotificationService,
    telegramService: backgroundTelegramService,
    reminderEngineService: backgroundReminderEngineService,
    trayService: backgroundTrayService
  });

  backgroundIpcService.registerHandlers();

  if (CONFIG.background.enabledByDefault) {
    backgroundStoreService.setBackgroundRunning(true);
    backgroundReminderEngineService.start();
  }

  if (CONFIG.tray.enabled) {
    backgroundTrayService.createTray();
  }
}

async function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = createBrowserWindow();
  await loadStartFile(mainWindow);

  if (CONFIG.development.openDevTools) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  if (backgroundTrayService && typeof backgroundTrayService.refreshMenu === "function") {
    backgroundTrayService.refreshMenu();
  }

  return mainWindow;
}

function bootstrap() {
  if (!ensureSingleInstance()) return;

  app.setName(CONFIG.app.name);

  if (process.platform === "win32" && CONFIG.app.appUserModelId) {
    app.setAppUserModelId(CONFIG.app.appUserModelId);
  }

  registerBasicIpcHandlers();

  app.whenReady().then(async () => {
    try {
      initializeBackgroundServices();
      await createMainWindow();
    } catch (error) {
      console.error(error);
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
      app.quit();
    }

    app.on("activate", async () => {
      await createMainWindow();
    });
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("window-all-closed", () => {
    if (CONFIG.background.keepAliveOnClose && !isQuitting) {
      return;
    }

    if (!isMac()) {
      app.quit();
    }
  });
}

bootstrap();
