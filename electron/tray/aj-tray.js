/*
  Nombre completo: aj-tray.js
  Ruta: electron/tray/aj-tray.js

  Función:
    - Crear y controlar el ícono de bandeja de Windows para AgendaJeff.
    - Permitir abrir, ocultar, revisar recordatorios, pausar/reanudar y salir.
*/

"use strict";

const { Tray, nativeImage, app } = require("electron");
const { createTrayMenu } = require("./aj-tray-menu");

function createTrayIcon() {
  const svg = encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' rx='16' fill='#2563eb'/><text x='32' y='40' text-anchor='middle' font-family='Arial' font-size='24' font-weight='700' fill='white'>AJ</text></svg>");
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${svg}`);
  image.setTemplateImage(false);
  return image;
}

function createTrayController(options) {
  const config = options && typeof options === "object" ? options : {};
  const actions = {
    showWindow: config.showWindow || function noop() {},
    hideWindow: config.hideWindow || function noop() {},
    checkNow: config.checkNow || function noop() {},
    pauseBackground: config.pauseBackground || function noop() {},
    resumeBackground: config.resumeBackground || function noop() {},
    quitApp: config.quitApp || function noop() {}
  };

  let tray = null;

  function create() {
    if (tray) return tray;

    tray = new Tray(createTrayIcon());
    tray.setToolTip("AgendaJeff activo en segundo plano");
    tray.setContextMenu(createTrayMenu(actions));

    tray.on("click", function handleTrayClick() {
      actions.showWindow();
    });

    return tray;
  }

  function updateTooltip(text) {
    if (!tray) return false;
    tray.setToolTip(text || "AgendaJeff activo en segundo plano");
    return true;
  }

  function destroy() {
    if (tray) tray.destroy();
    tray = null;
  }

  function isCreated() {
    return Boolean(tray);
  }

  app.on("before-quit", destroy);

  return Object.freeze({ create, updateTooltip, destroy, isCreated });
}

module.exports = Object.freeze({ createTrayController });
