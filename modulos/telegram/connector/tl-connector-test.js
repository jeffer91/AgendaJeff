/*
  Nombre completo: tl-connector-test.js
  Ruta: modulos/telegram/connector/tl-connector-test.js

  Función:
    - Exponer pruebas de Telegram para otros módulos de AgendaJeff.
    - Permitir probar conexión completa sin conocer capas internas.
    - Permitir ejecutar diagnóstico completo desde fuera del módulo Telegram.
    - Cerrar el conector público window.AgendaJeffTelegram con funciones estables.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/connector/tl-connector-status.js
    - modulos/telegram/connector/tl-connector-send.js
    - modulos/telegram/connection/tl-connection-test.js
    - modulos/telegram/diagnostic/tl-diagnostic-report.js
*/

(function initTelegramConnectorTest(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const connector = telegram.Connector = telegram.Connector || {};
  const publicConnector = global.AgendaJeffTelegram = global.AgendaJeffTelegram || {};

  let lastTestResult = null;
  let lastDiagnosticResult = null;

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
        action: data.action || "testTelegram",
        source: data.source || "connector",
        message: data.message || "",
        file: data.file || "modulos/telegram/connector/tl-connector-test.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  async function testConnection(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const connectionLayer = telegram.Connection || {};
    const opts = options && typeof options === "object" ? options : {};
    const file = config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/";
    const action = config.action ? config.action.TEST_TELEGRAM : "testTelegram";

    if (!connectionLayer.testConnection || typeof connectionLayer.testConnection !== "function") {
      lastTestResult = createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: "connector",
        file,
        message: "No está disponible testConnection. Revisa tl-connection-test.js.",
        error: {
          message: "Falta función testConnection.",
          file: config.fileHints ? config.fileHints.CONNECTION_TEST : "modulos/telegram/connection/tl-connection-test.js"
        }
      });

      return lastTestResult;
    }

    const testResult = await connectionLayer.testConnection({
      connection: opts.connection,
      skipPersist: opts.skipPersist === true
    });

    lastTestResult = createResult({
      ok: Boolean(testResult && testResult.ok),
      status: testResult ? testResult.status : (config.status ? config.status.ERROR : "error"),
      action,
      source: "connector",
      file,
      message: testResult && testResult.ok
        ? "Prueba completa Telegram ejecutada desde el conector."
        : "Falló la prueba completa Telegram desde el conector.",
      error: testResult && testResult.ok ? null : testResult ? testResult.error : null,
      data: {
        testResult
      }
    });

    return lastTestResult;
  }

  async function runDiagnostic(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const diagnostic = telegram.Diagnostic || {};
    const opts = options && typeof options === "object" ? options : {};
    const file = config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/";
    const action = config.action ? config.action.DIAGNOSTIC : "diagnostic";

    if (!diagnostic.runDiagnosticReport || typeof diagnostic.runDiagnosticReport !== "function") {
      lastDiagnosticResult = createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source: "connector",
        file,
        message: "No está disponible runDiagnosticReport. Revisa tl-diagnostic-report.js.",
        error: {
          message: "Falta función runDiagnosticReport.",
          file: "modulos/telegram/diagnostic/tl-diagnostic-report.js"
        }
      });

      return lastDiagnosticResult;
    }

    const diagnosticResult = await diagnostic.runDiagnosticReport({
      connection: opts.connection,
      skipFirebase: opts.skipFirebase === true,
      skipTelegram: opts.skipTelegram === true,
      sendTestMessage: opts.sendTestMessage === true,
      skipSave: opts.skipSave === true
    });

    lastDiagnosticResult = createResult({
      ok: Boolean(diagnosticResult && diagnosticResult.ok),
      status: diagnosticResult ? diagnosticResult.status : (config.status ? config.status.ERROR : "error"),
      action,
      source: "connector",
      file,
      message: diagnosticResult && diagnosticResult.ok
        ? "Diagnóstico Telegram ejecutado desde el conector."
        : "Diagnóstico Telegram detectó problemas desde el conector.",
      error: diagnosticResult && diagnosticResult.ok ? null : diagnosticResult ? diagnosticResult.error : null,
      data: {
        diagnosticResult
      }
    });

    return lastDiagnosticResult;
  }

  async function ping() {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.CONNECTOR : "modulos/telegram/connector/";
    const hasStatus = Boolean(connector.getStatus && typeof connector.getStatus === "function");
    const hasSend = Boolean(connector.sendMessage && typeof connector.sendMessage === "function");
    const hasTest = Boolean(connector.testConnection && typeof connector.testConnection === "function");
    const hasDiagnostic = Boolean(connector.runDiagnostic && typeof connector.runDiagnostic === "function");
    const ok = hasStatus && hasSend && hasTest && hasDiagnostic;

    return createResult({
      ok,
      status: ok
        ? (config.status ? config.status.READY : "ready")
        : (config.status ? config.status.PARTIAL : "partial"),
      action: "ping",
      source: "connector",
      file,
      message: ok
        ? "Conector público Telegram disponible."
        : "Conector público Telegram incompleto.",
      error: ok ? null : {
        message: "Faltan funciones públicas del conector Telegram.",
        file
      },
      data: {
        publicName: "window.AgendaJeffTelegram",
        hasStatus,
        hasSend,
        hasTest,
        hasDiagnostic,
        module: config.module || null
      }
    });
  }

  function getLastTestResult() {
    return lastTestResult;
  }

  function getLastDiagnosticResult() {
    return lastDiagnosticResult;
  }

  connector.testConnection = testConnection;
  connector.runDiagnostic = runDiagnostic;
  connector.ping = ping;
  connector.getLastTestResult = getLastTestResult;
  connector.getLastDiagnosticResult = getLastDiagnosticResult;

  publicConnector.testConnection = testConnection;
  publicConnector.runDiagnostic = runDiagnostic;
  publicConnector.ping = ping;
  publicConnector.getLastTestResult = getLastTestResult;
  publicConnector.getLastDiagnosticResult = getLastDiagnosticResult;
})(window);
