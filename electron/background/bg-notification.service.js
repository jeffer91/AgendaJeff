/*
  Nombre completo: bg-notification.service.js
  Ruta: electron/background/bg-notification.service.js

  Función:
    - Enviar notificaciones nativas desde el proceso principal de Electron.
    - Funcionar aunque la ventana esté oculta.
    - Mantener la lógica fuera de main.js.
*/

"use strict";

const { Notification } = require("electron");

function createBackgroundNotificationService(app, config) {
  const CONFIG = config || {};

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizePayload(payload) {
    const item = payload && typeof payload === "object" ? payload : {};
    const notificationConfig = CONFIG.notifications || {};

    return {
      title: String(item.title || notificationConfig.defaultTitle || CONFIG.app?.title || "AgendaJeff").trim(),
      body: String(item.body || item.message || "Notificación de AgendaJeff.").trim(),
      subtitle: String(item.subtitle || "").trim(),
      silent: Boolean(item.silent ?? notificationConfig.silent ?? false),
      urgency: item.urgency || "normal",
      timeoutType: item.timeoutType || notificationConfig.timeoutType || "default",
      tag: String(item.tag || "").trim(),
      source: String(item.source || "electron-background").trim(),
      createdAt: item.createdAt || nowIso()
    };
  }

  function isSupported() {
    try {
      return Notification.isSupported();
    } catch (_error) {
      return false;
    }
  }

  function send(payload) {
    const normalized = normalizePayload(payload);

    if (!isSupported()) {
      return {
        ok: false,
        mode: "electron",
        message: "Las notificaciones nativas no están soportadas en este equipo.",
        payload: normalized,
        sentAt: nowIso()
      };
    }

    const notification = new Notification({
      title: normalized.title,
      body: normalized.body,
      subtitle: normalized.subtitle || undefined,
      silent: normalized.silent,
      urgency: normalized.urgency,
      timeoutType: normalized.timeoutType
    });

    notification.show();

    return {
      ok: true,
      mode: "electron",
      message: "Notificación nativa enviada correctamente.",
      payload: normalized,
      sentAt: nowIso()
    };
  }

  function test(payload) {
    const item = payload && typeof payload === "object" ? payload : {};
    return send({
      title: item.title || "AgendaJeff - prueba",
      body: item.body || "La notificación nativa de Electron está funcionando.",
      source: item.source || "test-notification"
    });
  }

  function testBackground() {
    return send({
      title: "AgendaJeff en segundo plano",
      body: "La app sigue activa aunque cierres u ocultes la ventana.",
      source: "test-background"
    });
  }

  function testReminder(reminder) {
    const item = reminder && typeof reminder === "object" ? reminder : {};
    return send({
      title: item.title || "Recordatorio AgendaJeff",
      body: item.body || item.description || "Prueba de recordatorio automático.",
      source: "test-reminder"
    });
  }

  return {
    isSupported,
    normalizePayload,
    send,
    test,
    testBackground,
    testReminder
  };
}

module.exports = createBackgroundNotificationService;
