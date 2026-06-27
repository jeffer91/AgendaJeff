/*
  Nombre completo: preload.js
  Ruta: electron/preload.js

  Función:
    - Crear un puente seguro entre Electron y la interfaz web.
    - Exponer solo funciones mínimas y controladas en window.AgendaJeffElectron.
    - Permitir que index.html y módulos detecten si están corriendo en Electron.
    - Permitir apertura externa controlada para OAuth de Google Calendar.
    - Evitar que la UI tenga acceso directo a Node.js.

  Se conecta con:
    - electron/main.js
    - index.html
    - modulos/googlecalendar/auth/gc-auth-desktop.js
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
  openExternal
});

contextBridge.exposeInMainWorld("AgendaJeffElectron", electronBridge);
