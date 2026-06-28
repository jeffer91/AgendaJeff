/*
  Nombre completo: aj-background-notify.js
  Ruta: electron/background/aj-background-notify.js

  Función:
    - Enviar avisos nativos visibles para recordatorios de segundo plano.
*/

"use strict";

const { BrowserWindow, Notification } = require("electron");

function getFirstWindow() {
  return BrowserWindow.getAllWindows().find(function findWindow(window) {
    return window && !window.isDestroyed();
  }) || null;
}

function focusFirstWindow() {
  const window = getFirstWindow();
  if (!window) return false;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
  return true;
}

function sendNativeBackgroundNotification(payload) {
  const data = payload && typeof payload === "object" ? payload : {};

  if (!Notification.isSupported()) {
    return { ok: false, message: "Notificaciones nativas no disponibles." };
  }

  try {
    const notification = new Notification({
      title: data.title || "AgendaJeff",
      body: data.body || data.message || "Recordatorio pendiente.",
      silent: Boolean(data.silent)
    });

    notification.on("click", focusFirstWindow);
    notification.show();

    return { ok: true, message: "Notificación nativa enviada." };
  } catch (error) {
    return { ok: false, message: error && error.message ? error.message : "Error enviando notificación nativa." };
  }
}

module.exports = Object.freeze({ sendNativeBackgroundNotification, focusFirstWindow });
