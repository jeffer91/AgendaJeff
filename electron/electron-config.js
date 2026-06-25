/*
  Nombre completo: electron-config.js
  Ruta: electron/electron-config.js

  Función:
    - Centralizar la configuración mínima de Electron.
    - Definir rutas base del proyecto.
    - Definir opciones seguras de ventana.
    - Evitar que electron/main.js crezca con configuraciones repetidas.

  Se conecta con:
    - electron/main.js
    - electron/preload.js
    - index.html
*/

"use strict";

const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

const CONFIG = Object.freeze({
  app: Object.freeze({
    id: "com.agendajeff.app",
    name: "AgendaJeff",
    title: "AgendaJeff",
    version: "0.0.1"
  }),

  paths: Object.freeze({
    root: ROOT_DIR,
    indexHtml: path.join(ROOT_DIR, "index.html"),
    preload: path.join(__dirname, "preload.js")
  }),

  window: Object.freeze({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#f4f7fb",
    showWhenReady: true
  }),

  security: Object.freeze({
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: false,
    webSecurity: true
  }),

  dev: Object.freeze({
    openDevTools: false
  })
});

function getWindowOptions() {
  return {
    width: CONFIG.window.width,
    height: CONFIG.window.height,
    minWidth: CONFIG.window.minWidth,
    minHeight: CONFIG.window.minHeight,
    backgroundColor: CONFIG.window.backgroundColor,
    title: CONFIG.app.title,
    show: !CONFIG.window.showWhenReady,
    webPreferences: {
      preload: CONFIG.paths.preload,
      nodeIntegration: CONFIG.security.nodeIntegration,
      contextIsolation: CONFIG.security.contextIsolation,
      sandbox: CONFIG.security.sandbox,
      webSecurity: CONFIG.security.webSecurity
    }
  };
}

module.exports = Object.freeze({
  CONFIG,
  getWindowOptions
});
