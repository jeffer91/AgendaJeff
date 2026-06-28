/*
  Nombre completo: aj-local-ipc.js
  Ruta: electron/localdb/aj-local-ipc.js

  Función:
    - Registrar canales IPC seguros para usar la base local JSON desde las pantallas.
    - Registrar controles de segundo plano y bandeja.
*/

"use strict";

const { BrowserWindow } = require("electron");
const localRead = require("./aj-local-read");
const localSave = require("./aj-local-save");
const localIndex = require("./aj-local-index");
const localBackup = require("./aj-local-backup");
const { createBackgroundRunner } = require("../background/aj-background-runner");
const { createTrayController } = require("../tray/aj-tray");
const { sendNativeBackgroundNotification } = require("../background/aj-background-notify");

let backgroundRunner = null;
let trayController = null;
let backgroundRegistered = false;

function getActiveWindow() {
  const windows = BrowserWindow.getAllWindows().filter(function filterAlive(window) {
    return window && !window.isDestroyed();
  });
  return windows[0] || null;
}

function showActiveWindow() {
  const window = getActiveWindow();
  if (!window) return false;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
  return true;
}

function hideActiveWindow() {
  const window = getActiveWindow();
  if (!window) return false;
  window.hide();
  return true;
}

function quitApplication(appInstance) {
  if (!appInstance || typeof appInstance.quit !== "function") return false;
  appInstance.quit();
  return true;
}

function ensureBackgroundServices(appInstance) {
  if (backgroundRunner) return backgroundRunner.status();

  backgroundRunner = createBackgroundRunner({
    app: appInstance,
    intervalMs: 60000,
    sendNotification: sendNativeBackgroundNotification
  });
  backgroundRunner.start();

  trayController = createTrayController({
    showWindow: showActiveWindow,
    hideWindow: hideActiveWindow,
    checkNow: function checkNowFromTray() {
      if (backgroundRunner) backgroundRunner.checkNow("tray");
    },
    pauseBackground: function pauseFromTray() {
      if (backgroundRunner) backgroundRunner.pause();
    },
    resumeBackground: function resumeFromTray() {
      if (backgroundRunner) backgroundRunner.resume();
    },
    quitApp: function quitFromTray() {
      quitApplication(appInstance);
    }
  });
  trayController.create();

  return backgroundRunner.status();
}

function registerBackgroundIpc(ipcMain, appInstance) {
  if (backgroundRegistered) return;
  backgroundRegistered = true;

  ipcMain.handle("aj:bgStatus", function handleBgStatus() {
    return backgroundRunner ? backgroundRunner.status() : { ok: false, message: "Segundo plano no iniciado." };
  });

  ipcMain.handle("aj:bgStart", function handleBgStart() {
    return ensureBackgroundServices(appInstance);
  });

  ipcMain.handle("aj:bgPause", function handleBgPause() {
    return backgroundRunner ? backgroundRunner.pause() : { ok: false, message: "Segundo plano no iniciado." };
  });

  ipcMain.handle("aj:bgResume", function handleBgResume() {
    if (!backgroundRunner) return ensureBackgroundServices(appInstance);
    return backgroundRunner.resume();
  });

  ipcMain.handle("aj:bgCheckNow", function handleBgCheckNow() {
    return backgroundRunner ? backgroundRunner.checkNow("manual") : { ok: false, message: "Segundo plano no iniciado." };
  });

  if (appInstance && typeof appInstance.whenReady === "function") {
    appInstance.whenReady().then(function startWhenReady() {
      ensureBackgroundServices(appInstance);
    });
  }
}

function registerLocalIpc(ipcMain, appInstance) {
  ipcMain.handle("aj:localEnsure", function handleLocalEnsure() {
    const paths = localRead.ensureLocalDatabase(appInstance);
    return { ok: true, message: "Base local verificada.", data: { baseDir: paths.baseDir }, checkedAt: new Date().toISOString() };
  });

  ipcMain.handle("aj:localRead", function handleLocalRead() {
    return localRead.readLocalData(appInstance);
  });

  ipcMain.handle("aj:localQuery", function handleLocalQuery(event, filters) {
    return localIndex.queryLocalItems(appInstance, filters);
  });

  ipcMain.handle("aj:localUpsert", function handleLocalUpsert(event, item) {
    return localIndex.upsertLocalItem(appInstance, item);
  });

  ipcMain.handle("aj:localComplete", function handleLocalComplete(event, idLocal) {
    return localIndex.markLocalItemCompleted(appInstance, idLocal);
  });

  ipcMain.handle("aj:localRemove", function handleLocalRemove(event, idLocal) {
    return localIndex.deleteLocalItem(appInstance, idLocal);
  });

  ipcMain.handle("aj:localBackup", function handleLocalBackup() {
    return localBackup.createLocalBackup(appInstance);
  });

  ipcMain.handle("aj:settingsRead", function handleSettingsRead() {
    return localRead.readSettings(appInstance);
  });

  ipcMain.handle("aj:settingsSave", function handleSettingsSave(event, settings) {
    return localSave.saveSettings(appInstance, settings);
  });

  registerBackgroundIpc(ipcMain, appInstance);
}

module.exports = Object.freeze({ registerLocalIpc });
