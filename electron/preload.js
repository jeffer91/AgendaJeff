/*
  Nombre completo: preload.js
  Ruta: electron/preload.js
*/

"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function createSafeInvoke(channel) {
  return async function safeInvoke(...args) {
    try {
      return await ipcRenderer.invoke(channel, ...args);
    } catch (error) {
      return {
        ok: false,
        channel,
        message: error && error.message ? error.message : "Error desconocido en preload.",
        checkedAt: new Date().toISOString()
      };
    }
  };
}

function openExternal(url) {
  return createSafeInvoke("aj:openExternal")(url);
}

function onBackgroundNotification(callback) {
  if (typeof callback !== "function") {
    return { ok: false, message: "Callback inválido." };
  }

  const listener = function handleBackgroundNotification(event, payload) {
    callback(payload || {});
  };

  ipcRenderer.on("aj:bgNotification", listener);

  return {
    ok: true,
    remove: function removeListener() {
      ipcRenderer.removeListener("aj:bgNotification", listener);
    }
  };
}

const electronBridge = Object.freeze({
  isElectron: true,
  platform: process.platform,
  versions: Object.freeze({
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }),
  ping: createSafeInvoke("aj:ping"),
  getEnvironment: createSafeInvoke("aj:environment"),
  openExternal,
  sendDesktopNotification: createSafeInvoke("aj:ntNotify"),
  checkDesktopNotifications: createSafeInvoke("aj:ntDiagnostic"),
  startGoogleCalendarReturn: createSafeInvoke("aj:gcReturnStart"),
  getGoogleCalendarReturn: createSafeInvoke("aj:gcReturnGet"),
  clearGoogleCalendarReturn: createSafeInvoke("aj:gcReturnClear"),
  stopGoogleCalendarReturn: createSafeInvoke("aj:gcReturnStop"),
  ensureLocalDatabase: createSafeInvoke("aj:localEnsure"),
  readAgendaData: createSafeInvoke("aj:localRead"),
  queryAgendaItems: createSafeInvoke("aj:localQuery"),
  saveAgendaItem: createSafeInvoke("aj:localUpsert"),
  completeAgendaItem: createSafeInvoke("aj:localComplete"),
  removeAgendaItem: createSafeInvoke("aj:localRemove"),
  createLocalBackup: createSafeInvoke("aj:localBackup"),
  readAgendaSettings: createSafeInvoke("aj:settingsRead"),
  saveAgendaSettings: createSafeInvoke("aj:settingsSave"),
  getBackgroundStatus: createSafeInvoke("aj:bgStatus"),
  startBackground: createSafeInvoke("aj:bgStart"),
  pauseBackground: createSafeInvoke("aj:bgPause"),
  resumeBackground: createSafeInvoke("aj:bgResume"),
  checkBackgroundNow: createSafeInvoke("aj:bgCheckNow"),
  onBackgroundNotification
});

contextBridge.exposeInMainWorld("AgendaJeffElectron", electronBridge);
