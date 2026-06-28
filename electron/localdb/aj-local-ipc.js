/*
  Nombre completo: aj-local-ipc.js
  Ruta: electron/localdb/aj-local-ipc.js

  Función:
    - Registrar canales IPC seguros para usar la base local JSON desde las pantallas.
*/

"use strict";

const localRead = require("./aj-local-read");
const localSave = require("./aj-local-save");
const localIndex = require("./aj-local-index");
const localBackup = require("./aj-local-backup");

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
}

module.exports = Object.freeze({ registerLocalIpc });
