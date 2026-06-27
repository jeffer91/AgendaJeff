/*
  Nombre completo: gc-ui-events.js
  Ruta: modulos/googlecalendar/ui/gc-ui-events.js

  Función:
    - Conectar botones de la pantalla Google Calendar con las capas internas.
    - Mantener eventos UI separados de Firebase, Auth, API, Connection y Connector.

  Se conecta con:
    - modulos/googlecalendar/ui/gc-ui-dom.js
    - modulos/googlecalendar/ui/gc-ui-render.js
    - modulos/googlecalendar/connection/*
    - modulos/googlecalendar/auth/*
    - modulos/googlecalendar/api/*
    - modulos/googlecalendar/diagnostic/*
*/

(function initGoogleCalendarUiEvents(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const ui = googleCalendar.UI = googleCalendar.UI || {};

  function getDom() {
    return ui.Dom || {};
  }

  function getRender() {
    return ui.Render || {};
  }

  async function runUiAction(label, action) {
    const render = getRender();

    try {
      if (render.setBusy) {
        render.setBusy(true, label || "Procesando...");
      }

      const result = await action();

      if (render.renderResult) {
        render.renderResult(result);
      }

      return result;
    } catch (error) {
      const result = {
        ok: false,
        status: "error",
        action: "uiAction",
        source: "ui",
        file: "modulos/googlecalendar/ui/gc-ui-events.js",
        message: "Falló una acción de interfaz Google Calendar.",
        error: { message: error && error.message ? error.message : String(error), file: "modulos/googlecalendar/ui/gc-ui-events.js" },
        checkedAt: new Date().toISOString()
      };

      if (render.renderResult) {
        render.renderResult(result);
      }

      return result;
    } finally {
      if (render.setBusy) {
        render.setBusy(false);
      }
    }
  }

  async function handleSave() {
    const dom = getDom();
    const connection = googleCalendar.Connection || {};

    return runUiAction("Guardando conexión Google Calendar...", async function saveAction() {
      if (!connection.saveConnection) {
        throw new Error("No está disponible Connection.saveConnection.");
      }

      return connection.saveConnection(dom.readConnectionForm ? dom.readConnectionForm() : {});
    });
  }

  async function handleLoad() {
    const dom = getDom();
    const render = getRender();
    const connection = googleCalendar.Connection || {};

    return runUiAction("Cargando conexión Google Calendar...", async function loadAction() {
      if (!connection.readConnection) {
        throw new Error("No está disponible Connection.readConnection.");
      }

      const result = await connection.readConnection();
      const loadedConnection = result && result.data ? result.data.connection : null;

      if (loadedConnection && dom.fillConnectionForm) {
        dom.fillConnectionForm(loadedConnection);
      }

      if (render.renderLayerStatus) {
        render.renderLayerStatus();
      }

      return result;
    });
  }

  async function handleClear() {
    const dom = getDom();
    const connection = googleCalendar.Connection || {};

    return runUiAction("Limpiando conexión Google Calendar...", async function clearAction() {
      if (!connection.clearConnection) {
        throw new Error("No está disponible Connection.clearConnection.");
      }

      const result = await connection.clearConnection({ all: true });

      if (dom.clearSensitiveFields) {
        dom.clearSensitiveFields();
      }

      return result;
    });
  }

  async function handleConnect() {
    const dom = getDom();
    const auth = googleCalendar.Auth || {};

    return runUiAction("Preparando autorización Google Calendar...", async function connectAction() {
      if (!auth.startDesktopAuth) {
        throw new Error("No está disponible Auth.startDesktopAuth.");
      }

      return auth.startDesktopAuth(dom.readAuthInput ? dom.readAuthInput() : {}, { openExternal: true });
    });
  }

  async function handleExchangeCode() {
    const dom = getDom();
    const auth = googleCalendar.Auth || {};

    return runUiAction("Procesando código Google Calendar...", async function exchangeAction() {
      if (!auth.exchangeAuthorizationCode) {
        throw new Error("No está disponible Auth.exchangeAuthorizationCode.");
      }

      return auth.exchangeAuthorizationCode(dom.readAuthInput ? dom.readAuthInput() : {});
    });
  }

  async function handleTestFirebase() {
    const firebase = googleCalendar.Firebase || {};

    return runUiAction("Probando Firebase Google Calendar...", async function testFirebaseAction() {
      if (!firebase.testFirebaseConnection) {
        throw new Error("No está disponible Firebase.testFirebaseConnection.");
      }

      return firebase.testFirebaseConnection();
    });
  }

  async function handleTestGoogle() {
    const connection = googleCalendar.Connection || {};

    return runUiAction("Probando Google Calendar...", async function testGoogleAction() {
      if (!connection.testConnection) {
        throw new Error("No está disponible Connection.testConnection.");
      }

      return connection.testConnection({ createTestEvent: false });
    });
  }

  async function handleCreateTestEvent() {
    const dom = getDom();
    const api = googleCalendar.Api || {};

    return runUiAction("Creando evento de prueba...", async function createTestEventAction() {
      if (!api.createTestEvent) {
        throw new Error("No está disponible Api.createTestEvent.");
      }

      const draft = dom.readEventDraft ? dom.readEventDraft() : {};
      return api.createTestEvent(draft);
    });
  }

  async function handleDiagnostic() {
    const render = getRender();
    const diagnostic = googleCalendar.Diagnostic || {};

    return runUiAction("Ejecutando diagnóstico Google Calendar...", async function diagnosticAction() {
      if (!diagnostic.runDiagnosticReport) {
        throw new Error("No está disponible Diagnostic.runDiagnosticReport.");
      }

      const result = await diagnostic.runDiagnosticReport({ createTestEvent: false });

      if (render.renderDiagnostic) {
        render.renderDiagnostic(result);
      }

      return result;
    });
  }

  function attachEvents() {
    const dom = getDom();
    const elements = dom.getElements ? dom.getElements() : {};
    const bindings = [
      [elements.btnSave, handleSave],
      [elements.btnLoad, handleLoad],
      [elements.btnClear, handleClear],
      [elements.btnConnect, handleConnect],
      [elements.btnExchangeCode, handleExchangeCode],
      [elements.btnTestFirebase, handleTestFirebase],
      [elements.btnTestGoogle, handleTestGoogle],
      [elements.btnCreateTestEvent, handleCreateTestEvent],
      [elements.btnDiagnostic, handleDiagnostic]
    ];

    bindings.forEach(function bindButton(pair) {
      const button = pair[0];
      const handler = pair[1];

      if (button && !button.dataset.gcBound) {
        button.addEventListener("click", handler);
        button.dataset.gcBound = "true";
      }
    });

    return { ok: true, bound: bindings.filter(function countBound(pair) { return Boolean(pair[0]); }).length };
  }

  ui.Events = Object.freeze({
    runUiAction,
    handleSave,
    handleLoad,
    handleClear,
    handleConnect,
    handleExchangeCode,
    handleTestFirebase,
    handleTestGoogle,
    handleCreateTestEvent,
    handleDiagnostic,
    attachEvents
  });
})(window);
