/*
  Nombre completo: aj-service-bridge.js
  Ruta: core/integrations/aj-service-bridge.js

  Función:
    - Cargar conectores existentes como servicios internos sin tocar sus módulos.
    - Mantener Telegram, Google Calendar y Notificaciones disponibles para Agenda.
*/

(function initAgendaJeffServiceBridge(global) {
  "use strict";

  const core = global.AgendaJeffCore = global.AgendaJeffCore || {};
  const services = core.Services = core.Services || {};

  const SERVICE_CONFIG = Object.freeze({
    telegram: Object.freeze({ src: "../telegram/tl-module.html", publicName: "AgendaJeffTelegram" }),
    googleCalendar: Object.freeze({ src: "../googlecalendar/gc-module.html", publicName: "AgendaJeffGoogleCalendar" }),
    notificaciones: Object.freeze({ src: "../notificaciones/nt-module.html", publicName: "AgendaJeffNotifications" })
  });

  const frames = {};
  let started = false;

  function createResult(payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    return {
      ok: Boolean(data.ok),
      status: data.status || (data.ok ? "ready" : "pending"),
      action: data.action || "serviceBridge",
      source: data.source || "agenda-service-bridge",
      message: data.message || "",
      data: data.data || null,
      error: data.error || null,
      checkedAt: data.checkedAt || new Date().toISOString()
    };
  }

  function ensureContainer() {
    let container = global.document.getElementById("ajServiceBridgeFrames");

    if (!container) {
      container = global.document.createElement("div");
      container.id = "ajServiceBridgeFrames";
      container.setAttribute("aria-hidden", "true");
      container.style.position = "fixed";
      container.style.width = "1px";
      container.style.height = "1px";
      container.style.overflow = "hidden";
      container.style.left = "-10000px";
      container.style.top = "-10000px";
      global.document.body.appendChild(container);
    }

    return container;
  }

  function ensureFrame(key) {
    const config = SERVICE_CONFIG[key];
    if (!config) return null;
    if (frames[key] && frames[key].iframe && frames[key].iframe.contentWindow) return frames[key];

    const container = ensureContainer();
    const iframe = global.document.createElement("iframe");
    iframe.title = `AgendaJeff service ${key}`;
    iframe.src = config.src;
    iframe.dataset.serviceKey = key;
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";

    const record = {
      key,
      iframe,
      loaded: false,
      loadedAt: "",
      config
    };

    iframe.addEventListener("load", function handleServiceLoaded() {
      record.loaded = true;
      record.loadedAt = new Date().toISOString();
    });

    container.appendChild(iframe);
    frames[key] = record;
    return record;
  }

  function start() {
    if (started) return getStatus();
    started = true;
    Object.keys(SERVICE_CONFIG).forEach(ensureFrame);
    return getStatus();
  }

  function getServiceWindow(key) {
    const record = ensureFrame(key);
    try {
      return record && record.iframe ? record.iframe.contentWindow : null;
    } catch (error) {
      return null;
    }
  }

  function getPublicConnector(key) {
    const config = SERVICE_CONFIG[key];
    const serviceWindow = getServiceWindow(key);
    if (!config || !serviceWindow) return null;
    return serviceWindow[config.publicName] || null;
  }

  function waitForConnector(key, methodName, timeoutMs) {
    const limit = Number(timeoutMs) > 0 ? Number(timeoutMs) : 8000;
    const startedAt = Date.now();

    return new Promise(function wait(resolve) {
      function tick() {
        const connector = getPublicConnector(key);
        const ready = connector && (!methodName || typeof connector[methodName] === "function");

        if (ready) {
          resolve(createResult({
            ok: true,
            status: "ready",
            action: "waitForConnector",
            message: `Conector ${key} disponible.`,
            data: { key, connector }
          }));
          return;
        }

        if (Date.now() - startedAt >= limit) {
          resolve(createResult({
            ok: false,
            status: "pending",
            action: "waitForConnector",
            message: `Conector ${key} no disponible todavía.`,
            data: { key, methodName }
          }));
          return;
        }

        global.setTimeout(tick, 250);
      }

      tick();
    });
  }

  function getStatus() {
    return createResult({
      ok: true,
      status: "ready",
      action: "serviceStatus",
      message: "Servicios internos inicializados.",
      data: {
        started,
        services: Object.keys(SERVICE_CONFIG).map(function mapService(key) {
          const record = frames[key] || null;
          return {
            key,
            loaded: Boolean(record && record.loaded),
            loadedAt: record ? record.loadedAt : "",
            hasConnector: Boolean(getPublicConnector(key))
          };
        })
      }
    });
  }

  services.start = start;
  services.getStatus = getStatus;
  services.getServiceWindow = getServiceWindow;
  services.getPublicConnector = getPublicConnector;
  services.waitForConnector = waitForConnector;

  if (global.document && global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else if (global.document) {
    start();
  }
})(window);
