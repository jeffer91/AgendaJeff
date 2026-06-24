/*
  Nombre completo: electron-config.js
  Ruta: electron/electron-config.js

  Función:
    - Centralizar la configuración de Electron para AgendaJeff.
    - Definir archivo inicial, tamaño de ventana, título y preferencias seguras.
    - Agregar configuración real para segundo plano, bandeja y notificaciones.
    - Mantener Electron separado de los módulos visuales de la app.
*/

"use strict";

const path = require("path");

const ELECTRON_DIR = __dirname;
const ROOT_DIR = path.resolve(ELECTRON_DIR, "..");

const ELECTRON_CONFIG = {
  app: {
    name: "AgendaJeff",
    title: "AgendaJeff",
    productName: "AgendaJeff",
    appUserModelId: "com.jeffersonvillarreal.agendajeff",
    rootDir: ROOT_DIR,
    electronDir: ELECTRON_DIR,
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
    file: path.join(ELECTRON_DIR, "preload.js")
  },

  memory: {
    windowStateFile: "window-state.json",
    backgroundStoreFile: "background-store.json"
  },

  background: {
    enabledByDefault: true,
    keepAliveOnClose: true,
    hideOnClose: true,
    startMinimized: false,
    checkIntervalMs: 60000,
    minimumCheckIntervalMs: 15000,
    maxNotificationItemsPerCycle: 10,
    showTrayBalloonOnFirstHide: true
  },

  tray: {
    enabled: true,
    tooltip: "AgendaJeff activo en segundo plano",
    title: "AgendaJeff",
    menu: {
      open: "Abrir AgendaJeff",
      hide: "Ocultar ventana",
      testNotification: "Probar notificación",
      status: "Estado del segundo plano",
      quit: "Salir completamente"
    }
  },

  notifications: {
    enabled: true,
    defaultTitle: "AgendaJeff",
    silent: false,
    timeoutType: "default"
  },

  ipc: {
    namespace: "agendaJeff"
  },

  development: {
    openDevTools: false
  }
};

module.exports = ELECTRON_CONFIG;
