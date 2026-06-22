/*
  Nombre completo: electron-config.js
  Ruta: electron/electron-config.js

  Función:
    - Centralizar la configuración de Electron para AgendaJeff.
    - Definir archivo inicial, tamaño de ventana, título y preferencias seguras.
    - Evitar que la configuración quede mezclada dentro de main.js.
    - Mantener Electron por fuera de las pantallas funcionales existentes.

  Se conecta con:
    - electron/main.js
    - electron/window-state.service.js
    - electron/preload.js
    - index.html
*/

"use strict";

const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");

const ELECTRON_CONFIG = {
  app: {
    name: "AgendaJeff",
    title: "AgendaJeff",
    rootDir: ROOT_DIR,
    startFile: path.join(ROOT_DIR, "index.html")
  },

  window: {
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    showOnReady: true,
    center: true,
    backgroundColor: "#f3f6fb",
    titleBarStyle: "default",
    autoHideMenuBar: false
  },

  security: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: false,
    webSecurity: true,
    allowRunningInsecureContent: false
  },

  preload: {
    file: path.join(__dirname, "preload.js")
  },

  memory: {
    windowStateFile: "window-state.json"
  },

  development: {
    openDevTools: false
  }
};

module.exports = ELECTRON_CONFIG;