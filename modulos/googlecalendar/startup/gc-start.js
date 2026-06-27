/*
  Nombre completo: gc-start.js
  Ruta: modulos/googlecalendar/startup/gc-start.js

  Función:
    - Arrancar el módulo Google Calendar de forma ordenada.
    - Verificar capas cargadas, activar eventos UI y cargar conexión inicial.
    - Mantener el módulo independiente del shell principal.

  Se conecta con:
    - modulos/googlecalendar/gc-module.html
    - modulos/googlecalendar/ui/gc-ui-dom.js
    - modulos/googlecalendar/ui/gc-ui-render.js
    - modulos/googlecalendar/ui/gc-ui-events.js
*/

(function initGoogleCalendarStartup(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const startup = googleCalendar.Startup = googleCalendar.Startup || {};

  let started = false;

  function layerExists(path, value) {
    return { path, ok: Boolean(value) };
  }

  function checkLayers() {
    const checks = [
      layerExists("CONFIG", googleCalendar.CONFIG),
      layerExists("Utils.Time", googleCalendar.Utils && googleCalendar.Utils.Time),
      layerExists("Utils.Normalize", googleCalendar.Utils && googleCalendar.Utils.Normalize),
      layerExists("Utils.Validate", googleCalendar.Utils && googleCalendar.Utils.Validate),
      layerExists("Storage", googleCalendar.Storage),
      layerExists("Firebase", googleCalendar.Firebase),
      layerExists("Auth", googleCalendar.Auth),
      layerExists("Api", googleCalendar.Api),
      layerExists("Connection", googleCalendar.Connection),
      layerExists("Diagnostic", googleCalendar.Diagnostic),
      layerExists("Connector", googleCalendar.Connector),
      layerExists("UI.Dom", googleCalendar.UI && googleCalendar.UI.Dom),
      layerExists("UI.Render", googleCalendar.UI && googleCalendar.UI.Render),
      layerExists("UI.Events", googleCalendar.UI && googleCalendar.UI.Events)
    ];

    return {
      ok: checks.every(function everyCheck(check) { return check.ok; }),
      checks,
      missing: checks.filter(function filterMissing(check) { return !check.ok; })
    };
  }

  async function loadInitialConnection() {
    const connection = googleCalendar.Connection || {};
    const ui = googleCalendar.UI || {};

    if (!connection.readConnection || !ui.Dom || !ui.Dom.fillConnectionForm) {
      return null;
    }

    const result = await connection.readConnection();
    const loadedConnection = result && result.data ? result.data.connection : null;

    if (loadedConnection) {
      ui.Dom.fillConnectionForm(loadedConnection);
    }

    return result;
  }

  async function startGoogleCalendarModule() {
    if (started) {
      return { ok: true, alreadyStarted: true };
    }

    const ui = googleCalendar.UI || {};
    const render = ui.Render || {};
    const events = ui.Events || {};
    const layers = checkLayers();

    if (render.renderLayerStatus) {
      render.renderLayerStatus();
    }

    if (!layers.ok) {
      const result = {
        ok: false,
        status: "partial",
        action: "startup",
        source: "startup",
        file: "modulos/googlecalendar/startup/gc-start.js",
        message: "Google Calendar arrancó con capas pendientes.",
        data: layers,
        checkedAt: new Date().toISOString()
      };

      if (render.renderResult) {
        render.renderResult(result);
      }

      return result;
    }

    if (events.attachEvents) {
      events.attachEvents();
    }

    let initialRead = null;

    try {
      initialRead = await loadInitialConnection();
    } catch (error) {
      initialRead = {
        ok: false,
        message: error && error.message ? error.message : "No se pudo cargar conexión inicial."
      };
    }

    started = true;

    const result = {
      ok: true,
      status: "ready",
      action: "startup",
      source: "startup",
      file: "modulos/googlecalendar/startup/gc-start.js",
      message: "Módulo Google Calendar listo para usar.",
      data: { layers, initialRead },
      checkedAt: new Date().toISOString()
    };

    if (render.renderResult) {
      render.renderResult(result);
    }

    if (render.enableUi) {
      render.enableUi();
    }

    return result;
  }

  function autoStart() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startGoogleCalendarModule, { once: true });
      return;
    }

    startGoogleCalendarModule();
  }

  startup.checkLayers = checkLayers;
  startup.startGoogleCalendarModule = startGoogleCalendarModule;
  startup.autoStart = autoStart;

  autoStart();
})(window);
