/*
  Nombre completo: main.js
  Ruta: electron/main.js
*/

"use strict";

const { app, BrowserWindow, ipcMain, shell, Notification } = require("electron");
const { CONFIG, getWindowOptions } = require("./electron-config");
const gcReturn = require("./" + "oauth" + "/" + "gc-local-callback");

let mainWindow = null;
let ipcRegistered = false;

function isHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function normalizeNotificationText(value, fallback) {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text || fallback || "";
}

function prepareWindowsNotifications() {
  if (process.platform === "win32" && typeof app.setAppUserModelId === "function") {
    app.setAppUserModelId(CONFIG.app.id || "com.agendajeff.app");
  }
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
  return true;
}

function getNotificationDiagnostic() {
  const supported = Notification.isSupported();

  return {
    ok: supported,
    supported,
    platform: process.platform,
    appReady: app.isReady(),
    hasMainWindow: Boolean(mainWindow && !mainWindow.isDestroyed()),
    message: supported ? "Notificaciones nativas disponibles." : "Notificaciones nativas no disponibles.",
    checkedAt: new Date().toISOString()
  };
}

function buildNativeNotificationPayload(payload) {
  const data = payload && typeof payload === "object" ? payload : {};

  return {
    title: normalizeNotificationText(data.title, CONFIG.app.name || "AgendaJeff"),
    body: normalizeNotificationText(data.body || data.message, "notificaciones prueba"),
    silent: Boolean(data.silent),
    type: normalizeNotificationText(data.type, "normal")
  };
}

function sendNativeNotification(payload) {
  const diagnostic = getNotificationDiagnostic();
  const cleanPayload = buildNativeNotificationPayload(payload);

  if (!diagnostic.supported) {
    return {
      ok: false,
      status: "error",
      action: "ntNotify",
      source: "electron",
      message: diagnostic.message,
      data: { diagnostic, payload: cleanPayload },
      checkedAt: new Date().toISOString()
    };
  }

  try {
    const notification = new Notification({
      title: cleanPayload.title,
      body: cleanPayload.body,
      silent: cleanPayload.silent
    });

    notification.on("click", function handleNotificationClick() {
      focusMainWindow();
    });

    notification.show();

    return {
      ok: true,
      status: "ready",
      action: "ntNotify",
      source: "electron",
      message: "Notificación de escritorio enviada.",
      data: { diagnostic, payload: cleanPayload },
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      action: "ntNotify",
      source: "electron",
      message: error && error.message ? error.message : "No se pudo crear la notificación nativa.",
      data: { diagnostic, payload: cleanPayload },
      checkedAt: new Date().toISOString()
    };
  }
}

async function openExternalUrl(url) {
  if (!isHttpUrl(url)) {
    return { ok: false, message: "Solo se permite abrir URLs http/https externas.", checkedAt: new Date().toISOString() };
  }

  await shell.openExternal(url);
  return { ok: true, opened: true, message: "URL externa abierta correctamente.", checkedAt: new Date().toISOString() };
}

function registerIpcHandlers() {
  if (ipcRegistered) return;
  ipcRegistered = true;

  ipcMain.handle("aj:ping", function handlePing() {
    return { ok: true, appName: CONFIG.app.name, message: "Electron responde correctamente.", checkedAt: new Date().toISOString() };
  });

  ipcMain.handle("aj:environment", function handleEnvironment() {
    return {
      ok: true,
      mode: "electron",
      app: CONFIG.app,
      platform: process.platform,
      versions: { node: process.versions.node, chrome: process.versions.chrome, electron: process.versions.electron },
      checkedAt: new Date().toISOString()
    };
  });

  ipcMain.handle("aj:openExternal", async function handleOpenExternal(event, url) {
    return openExternalUrl(url);
  });

  ipcMain.handle("aj:ntNotify", function handleNtNotify(event, payload) {
    return sendNativeNotification(payload);
  });

  ipcMain.handle("aj:ntDiagnostic", function handleNtDiagnostic() {
    return getNotificationDiagnostic();
  });

  ipcMain.handle("aj:gcReturnStart", async function handleReturnStart() {
    return gcReturn.start();
  });

  ipcMain.handle("aj:gcReturnGet", function handleReturnGet(event, expectedState) {
    return gcReturn.getLatest(expectedState);
  });

  ipcMain.handle("aj:gcReturnClear", function handleReturnClear() {
    return gcReturn.clear();
  });

  ipcMain.handle("aj:gcReturnStop", async function handleReturnStop() {
    return gcReturn.stop();
  });
}

function protectExternalNavigation(window) {
  window.webContents.setWindowOpenHandler(function handleWindowOpen(details) {
    if (isHttpUrl(details.url)) shell.openExternal(details.url);
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
  const window = new BrowserWindow(getWindowOptions());
  mainWindow = window;
  protectExternalNavigation(window);

  window.once("ready-to-show", function handleReadyToShow() {
    if (!window.isDestroyed()) window.show();
  });

  window.on("closed", function handleClosed() {
    if (mainWindow === window) mainWindow = null;
  });

  window.loadFile(CONFIG.paths.indexHtml);

  if (CONFIG.dev.openDevTools) window.webContents.openDevTools({ mode: "detach" });

  return window;
}

function bootstrapElectron() {
  prepareWindowsNotifications();
  registerIpcHandlers();

  app.whenReady().then(function handleReady() {
    prepareWindowsNotifications();
    createMainWindow();
    app.on("activate", function handleActivate() {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on("window-all-closed", function handleWindowAllClosed() {
    if (process.platform !== "darwin") app.quit();
  });
}

bootstrapElectron();