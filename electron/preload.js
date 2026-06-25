/*
  Nombre completo: preload.js
  Ruta: electron/preload.js

  Función:
    - Crear un puente seguro entre Electron y la interfaz web.
    - Exponer solo funciones mínimas y controladas en window.AgendaJeffElectron.
    - Permitir que index.html y módulos futuros detecten si están corriendo en Electron.
    - Evitar que la UI tenga acceso directo a Node.js.

  Se conecta con:
    - electron/main.js
    - index.html
    - módulos futuros dentro de modulos/
*/

"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function createSafeInvoke(channel) {
  return async function safeInvoke() {
    try {
      return await ipcRenderer.invoke(channel);
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

const electronBridge = Object.freeze({
  isElectron: true,
  platform: process.platform,
  versions: Object.freeze({
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }),
  ping: createSafeInvoke("aj:ping"),
  getEnvironment: createSafeInvoke("aj:environment")
});

contextBridge.exposeInMainWorld("AgendaJeffElectron", electronBridge);
