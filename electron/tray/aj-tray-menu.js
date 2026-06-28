/*
  Nombre completo: aj-tray-menu.js
  Ruta: electron/tray/aj-tray-menu.js

  Función:
    - Construir el menú de bandeja de AgendaJeff.
*/

"use strict";

const { Menu } = require("electron");

function createTrayMenu(actions) {
  const safeActions = actions && typeof actions === "object" ? actions : {};

  return Menu.buildFromTemplate([
    {
      label: "Abrir AgendaJeff",
      click: safeActions.showWindow || function noop() {}
    },
    {
      label: "Ocultar ventana",
      click: safeActions.hideWindow || function noop() {}
    },
    { type: "separator" },
    {
      label: "Revisar recordatorios ahora",
      click: safeActions.checkNow || function noop() {}
    },
    {
      label: "Pausar segundo plano",
      click: safeActions.pauseBackground || function noop() {}
    },
    {
      label: "Reanudar segundo plano",
      click: safeActions.resumeBackground || function noop() {}
    },
    { type: "separator" },
    {
      label: "Salir completamente",
      click: safeActions.quitApp || function noop() {}
    }
  ]);
}

module.exports = Object.freeze({ createTrayMenu });
