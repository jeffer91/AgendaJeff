/*
  Nombre completo: tl-start.js
  Ruta: modulos/telegram/startup/tl-start.js

  Función:
    - Iniciar el módulo Telegram de forma mínima y ordenada.
    - Esperar que el HTML esté disponible.
    - Verificar que las capas internas estén cargadas.
    - Cargar conexión inicial desde Firebase o respaldo local.
    - Pintar estado inicial.
    - Activar eventos de botones.
    - Evitar crear un archivo gigante tipo tl-app.js.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/diagnostic/tl-diagnostic-state.js
    - modulos/telegram/connection/tl-connection-read.js
    - modulos/telegram/ui/dom/*
    - modulos/telegram/ui/render/*
    - modulos/telegram/ui/events/*
    - modulos/telegram/connector/*
*/

(function initTelegramStart(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const startup = telegram.Startup = telegram.Startup || {};

  const state = {
    started: false,
    starting: false,
    startedAt: "",
    lastStartResult: null,
    layerCheckResult: null,
    initialReadResult: null,
    attachedEventsResult: null,
    pingResult: null
  };

  function getConfig() {
    return telegram.CONFIG || {};
  }

  function getCreateResult() {
    if (typeof telegram.createResult === "function") {
      return telegram.createResult;
    }

    return function fallbackCreateResult(payload) {
      const data = payload && typeof payload === "object" ? payload : {};
      return {
        ok: Boolean(data.ok),
        status: data.status || (data.ok ? "ready" : "error"),
        action: data.action || "init",
        source: data.source || "startup",
        message: data.message || "",
        file: data.file || "modulos/telegram/startup/tl-start.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function getDom() {
    return telegram.UI && telegram.UI.Dom ? telegram.UI.Dom : {};
  }

  function getRender() {
    return telegram.UI && telegram.UI.Render ? telegram.UI.Render : {};
  }

  function getEvents() {
    return telegram.UI && telegram.UI.Events ? telegram.UI.Events : {};
  }

  function getConnection() {
    return telegram.Connection || {};
  }

  function getDiagnostic() {
    return telegram.Diagnostic || {};
  }

  function getConnector() {
    return telegram.Connector || {};
  }

  function isDocumentReady() {
    return global.document && ["interactive", "complete"].includes(global.document.readyState);
  }

  function onDocumentReady(callback) {
    if (!global.document) {
      callback();
      return;
    }

    if (isDocumentReady()) {
      callback();
      return;
    }

    global.document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  function getConnectionFromResult(result) {
    if (!result || !result.data) {
      return null;
    }

    return result.data.connection || null;
  }

  function setFormValues(connectionData) {
    const dom = getDom();

    if (connectionData && dom.Form && typeof dom.Form.setFormValues === "function") {
      dom.Form.setFormValues(connectionData);
      return true;
    }

    return false;
  }

  function renderLoading(message) {
    const render = getRender();

    if (render.renderLoadingStatus) {
      render.renderLoadingStatus(message || "Iniciando Telegram...");
      return true;
    }

    return false;
  }

  function renderResult(result) {
    const render = getRender();

    if (render.renderConnectionStatus) {
      render.renderConnectionStatus(result);
    }

    if (result && result.ok && render.renderResult) {
      render.renderResult(result, { skipJson: false });
      return true;
    }

    if (render.renderError) {
      render.renderError(result);
      return true;
    }

    if (render.renderResult) {
      render.renderResult(result);
      return true;
    }

    return false;
  }

  function runLayerCheck() {
    const config = getConfig();
    const diagnostic = getDiagnostic();
    const createResult = getCreateResult();

    if (diagnostic.diagnoseModuleState && typeof diagnostic.diagnoseModuleState === "function") {
      return diagnostic.diagnoseModuleState();
    }

    return createResult({
      ok: false,
      status: config.status ? config.status.PARTIAL : "partial",
      action: config.action ? config.action.INIT : "init",
      source: "startup",
      file: "modulos/telegram/startup/tl-start.js",
      message: "No está disponible diagnoseModuleState. El módulo seguirá intentando iniciar.",
      error: {
        message: "Falta función diagnoseModuleState.",
        file: "modulos/telegram/diagnostic/tl-diagnostic-state.js"
      }
    });
  }

  function attachEvents() {
    const config = getConfig();
    const events = getEvents();
    const createResult = getCreateResult();

    if (events.attachAllEvents && typeof events.attachAllEvents === "function") {
      const result = events.attachAllEvents();

      return createResult({
        ok: Boolean(result && result.ok),
        status: result && result.ok
          ? (config.status ? config.status.READY : "ready")
          : (config.status ? config.status.PARTIAL : "partial"),
        action: config.action ? config.action.INIT : "init",
        source: "startup",
        file: "modulos/telegram/startup/tl-start.js",
        message: result && result.ok
          ? "Eventos UI de Telegram activados."
          : "Algunos eventos UI de Telegram no pudieron activarse todavía.",
        data: result || null
      });
    }

    return createResult({
      ok: false,
      status: config.status ? config.status.PARTIAL : "partial",
      action: config.action ? config.action.INIT : "init",
      source: "startup",
      file: "modulos/telegram/startup/tl-start.js",
      message: "No está disponible attachAllEvents. Revisa tl-event-diagnostic.js.",
      error: {
        message: "Falta función attachAllEvents.",
        file: "modulos/telegram/ui/events/tl-event-diagnostic.js"
      }
    });
  }

  async function loadInitialConnection() {
    const config = getConfig();
    const connection = getConnection();
    const createResult = getCreateResult();

    if (!connection.readConnection || typeof connection.readConnection !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.IDLE : "idle",
        action: config.action ? config.action.READ : "read",
        source: "startup",
        file: "modulos/telegram/startup/tl-start.js",
        message: "No está disponible readConnection. No se cargó conexión inicial.",
        error: {
          message: "Falta función readConnection.",
          file: config.fileHints ? config.fileHints.CONNECTION_READ : "modulos/telegram/connection/tl-connection-read.js"
        }
      });
    }

    const readResult = await connection.readConnection();
    const connectionData = getConnectionFromResult(readResult);

    if (connectionData) {
      setFormValues(connectionData);
    }

    return readResult;
  }

  async function pingConnector() {
    const config = getConfig();
    const connector = getConnector();
    const createResult = getCreateResult();

    if (connector.ping && typeof connector.ping === "function") {
      return connector.ping();
    }

    return createResult({
      ok: false,
      status: config.status ? config.status.PARTIAL : "partial",
      action: "ping",
      source: "startup",
      file: "modulos/telegram/startup/tl-start.js",
      message: "Conector Telegram todavía no tiene ping disponible.",
      error: {
        message: "Falta connector.ping.",
        file: config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/"
      }
    });
  }

  function renderInitialInfo() {
    const render = getRender();

    if (render.renderInfo) {
      render.renderInfo("Módulo Telegram iniciado. Puedes guardar, cargar, probar o diagnosticar la conexión.", {
        startup: getStartupState()
      });
    }
  }

  async function startTelegramModule() {
    const config = getConfig();
    const createResult = getCreateResult();
    const checkedAt = new Date().toISOString();

    if (state.starting) {
      return state.lastStartResult || createResult({
        ok: false,
        status: config.status ? config.status.LOADING : "loading",
        action: config.action ? config.action.INIT : "init",
        source: "startup",
        file: "modulos/telegram/startup/tl-start.js",
        message: "Telegram ya se está iniciando."
      });
    }

    if (state.started) {
      return state.lastStartResult || createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: config.action ? config.action.INIT : "init",
        source: "startup",
        file: "modulos/telegram/startup/tl-start.js",
        message: "Telegram ya estaba iniciado."
      });
    }

    state.starting = true;
    renderLoading("Iniciando módulo Telegram...");

    try {
      state.layerCheckResult = runLayerCheck();
      state.attachedEventsResult = attachEvents();
      state.initialReadResult = await loadInitialConnection();
      state.pingResult = await pingConnector();

      if (state.initialReadResult && state.initialReadResult.data && state.initialReadResult.data.connection) {
        renderResult(state.initialReadResult);
      } else {
        renderInitialInfo();
      }

      state.started = true;
      state.startedAt = checkedAt;

      state.lastStartResult = createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: config.action ? config.action.INIT : "init",
        source: "startup",
        file: "modulos/telegram/startup/tl-start.js",
        message: "Módulo Telegram iniciado correctamente.",
        data: getStartupState(),
        checkedAt
      });

      return state.lastStartResult;
    } catch (error) {
      state.lastStartResult = createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.INIT : "init",
        source: "startup",
        file: "modulos/telegram/startup/tl-start.js",
        message: "Error inesperado iniciando módulo Telegram.",
        error: {
          message: error && error.message ? error.message : "Error desconocido.",
          file: "modulos/telegram/startup/tl-start.js"
        },
        data: getStartupState(),
        checkedAt
      });

      renderResult(state.lastStartResult);
      return state.lastStartResult;
    } finally {
      state.starting = false;
    }
  }

  function autoStart() {
    onDocumentReady(function handleReady() {
      startTelegramModule();
    });
  }

  function getStartupState() {
    return {
      started: state.started,
      starting: state.starting,
      startedAt: state.startedAt,
      lastStartResult: state.lastStartResult,
      layerCheckResult: state.layerCheckResult,
      initialReadResult: state.initialReadResult,
      attachedEventsResult: state.attachedEventsResult,
      pingResult: state.pingResult
    };
  }

  startup.startTelegramModule = startTelegramModule;
  startup.autoStart = autoStart;
  startup.getStartupState = getStartupState;

  autoStart();
})(window);
