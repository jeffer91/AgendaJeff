/*
  Nombre completo: preload.js
  Ruta: electron/preload.js

  Función:
    - Crear un puente seguro entre Electron y la app web.
    - Exponer funciones mínimas y controladas hacia index.html.
    - No exponer Node.js directamente a las pantallas internas.
    - Permitir que el menú detecte si está corriendo dentro de Electron.

  Se conecta con:
    - electron/main.js
    - index.html
    - menu/js/menu-app.js
*/

"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function invokeSafe(channel, payload) {
  return ipcRenderer.invoke(channel, payload || {});
}

contextBridge.exposeInMainWorld("AgendaJeffElectron", {
  isElectron: true,

  platform: process.platform,

  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  },

  app: {
    getInfo() {
      return invokeSafe("agendaJeff:app-info");
    },

    reload() {
      return invokeSafe("agendaJeff:reload-window");
    },

    minimize() {
      return invokeSafe("agendaJeff:minimize-window");
    },

    maximizeOrRestore() {
      return invokeSafe("agendaJeff:maximize-or-restore-window");
    },

    close() {
      return invokeSafe("agendaJeff:close-window");
    }
  },

  menu: {
    getLastSnapshot() {
      return invokeSafe("agendaJeff:get-menu-snapshot");
    },

    saveLastSnapshot(snapshot) {
      return invokeSafe("agendaJeff:save-menu-snapshot", snapshot || {});
    }
  }
});