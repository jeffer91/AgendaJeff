/*
  Nombre completo: tl-diagnostic-local.js
  Ruta: modulos/telegram/diagnostic/tl-diagnostic-local.js

  Función:
    - Diagnosticar el respaldo local del módulo Telegram.
    - Probar localStorage.
    - Revisar si existen conexión principal, respaldo, diagnóstico y último resultado.
    - Leer conexión local y respaldo local sin tocar Firebase ni Telegram API.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/storage/tl-local-read.js
    - modulos/telegram/storage/tl-local-test.js
    - modulos/telegram/diagnostic/tl-diagnostic-report.js
*/

(function initTelegramDiagnosticLocal(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const diagnostic = telegram.Diagnostic = telegram.Diagnostic || {};

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
        action: data.action || "diagnostic",
        source: data.source || "local",
        message: data.message || "",
        file: data.file || "modulos/telegram/diagnostic/tl-diagnostic-local.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function diagnoseLocalStorage() {
    const config = getConfig();
    const createResult = getCreateResult();
    const storage = telegram.Storage || {};
    const file = config.fileHints ? config.fileHints.LOCAL_TEST : "modulos/telegram/storage/tl-local-test.js";
    const action = config.action ? config.action.DIAGNOSTIC : "diagnostic";
    const source = config.source ? config.source.LOCAL : "local";

    const testResult = storage.testLocalStorage && typeof storage.testLocalStorage === "function"
      ? storage.testLocalStorage()
      : null;

    const summary = storage.getLocalStorageSummary && typeof storage.getLocalStorageSummary === "function"
      ? storage.getLocalStorageSummary()
      : null;

    const mainResult = storage.readLocalConnection && typeof storage.readLocalConnection === "function"
      ? storage.readLocalConnection()
      : null;

    const backupResult = storage.readLocalBackup && typeof storage.readLocalBackup === "function"
      ? storage.readLocalBackup()
      : null;

    const ok = Boolean(testResult && testResult.ok);
    const hasAnyConnection = Boolean(
      (mainResult && mainResult.ok) ||
      (backupResult && backupResult.ok)
    );

    return createResult({
      ok,
      status: ok
        ? (config.status ? config.status.READY : "ready")
        : (config.status ? config.status.ERROR : "error"),
      action,
      source,
      file,
      message: ok
        ? hasAnyConnection
          ? "localStorage funciona y existe información local de Telegram."
          : "localStorage funciona, pero todavía no hay conexión local guardada."
        : "localStorage no funciona correctamente para Telegram.",
      error: ok ? null : {
        message: testResult && testResult.error && testResult.error.message
          ? testResult.error.message
          : "No se pudo completar la prueba local.",
        file
      },
      data: {
        testResult,
        summary,
        mainResult,
        backupResult,
        hasAnyConnection
      }
    });
  }

  diagnostic.diagnoseLocalStorage = diagnoseLocalStorage;
})(window);
