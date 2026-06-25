/*
  Nombre completo: tl-diagnostic-report.js
  Ruta: modulos/telegram/diagnostic/tl-diagnostic-report.js

  Función:
    - Ejecutar el diagnóstico completo del módulo Telegram.
    - Unir diagnóstico de estado, localStorage, Firebase y Telegram API.
    - Calcular resultado general y archivo probable del error.
    - Guardar el último diagnóstico en localStorage si la función local está disponible.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/diagnostic/tl-diagnostic-state.js
    - modulos/telegram/diagnostic/tl-diagnostic-local.js
    - modulos/telegram/diagnostic/tl-diagnostic-firebase.js
    - modulos/telegram/diagnostic/tl-diagnostic-telegram.js
    - modulos/telegram/storage/tl-local-save.js
*/

(function initTelegramDiagnosticReport(global) {
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
        source: data.source || "system",
        message: data.message || "",
        file: data.file || "modulos/telegram/diagnostic/tl-diagnostic-report.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function resultToSummary(name, result) {
    return {
      name,
      ok: Boolean(result && result.ok),
      status: result ? result.status : "missing",
      message: result ? result.message : "Diagnóstico no disponible.",
      file: result ? result.file : "modulos/telegram/diagnostic/",
      error: result ? result.error : {
        message: "No se ejecutó el diagnóstico.",
        file: "modulos/telegram/diagnostic/"
      }
    };
  }

  function getProbableErrorFile(summaries) {
    const failed = summaries.find(function findFailed(item) {
      return !item.ok;
    });

    if (!failed) {
      return "";
    }

    if (failed.error && failed.error.file) {
      return failed.error.file;
    }

    return failed.file || "modulos/telegram/diagnostic/";
  }

  function getMainMessage(ok, summaries) {
    if (ok) {
      return "Diagnóstico completo de Telegram correcto.";
    }

    const failed = summaries.find(function findFailed(item) {
      return !item.ok;
    });

    if (!failed) {
      return "Diagnóstico completo de Telegram con error no identificado.";
    }

    return `Diagnóstico Telegram detectó problema en ${failed.name}: ${failed.message}`;
  }

  function saveDiagnosticReport(report) {
    const config = getConfig();
    const storage = telegram.Storage || {};
    const storageConfig = config.storage || {};
    const diagnosticKey = storageConfig.diagnosticKey || "agendaJeff.telegram.diagnostic.v2";

    if (storage.writeJsonValue && typeof storage.writeJsonValue === "function") {
      return storage.writeJsonValue(diagnosticKey, report);
    }

    return {
      ok: false,
      key: diagnosticKey,
      error: {
        message: "No está disponible writeJsonValue para guardar diagnóstico."
      }
    };
  }

  async function runDiagnosticReport(options) {
    const config = getConfig();
    const createResult = getCreateResult();
    const opts = options && typeof options === "object" ? options : {};
    const file = "modulos/telegram/diagnostic/tl-diagnostic-report.js";
    const action = config.action ? config.action.DIAGNOSTIC : "diagnostic";
    const source = config.source ? config.source.SYSTEM : "system";
    const checkedAt = new Date().toISOString();

    const stateResult = diagnostic.diagnoseModuleState && typeof diagnostic.diagnoseModuleState === "function"
      ? diagnostic.diagnoseModuleState()
      : null;

    const localResult = diagnostic.diagnoseLocalStorage && typeof diagnostic.diagnoseLocalStorage === "function"
      ? diagnostic.diagnoseLocalStorage()
      : null;

    const firebaseResult = opts.skipFirebase === true
      ? null
      : diagnostic.diagnoseFirebase && typeof diagnostic.diagnoseFirebase === "function"
        ? await diagnostic.diagnoseFirebase()
        : null;

    const telegramResult = opts.skipTelegram === true
      ? null
      : diagnostic.diagnoseTelegramApi && typeof diagnostic.diagnoseTelegramApi === "function"
        ? await diagnostic.diagnoseTelegramApi({
            connection: opts.connection,
            sendTestMessage: opts.sendTestMessage === true
          })
        : null;

    const summaries = [
      resultToSummary("estado", stateResult),
      resultToSummary("localStorage", localResult)
    ];

    if (opts.skipFirebase !== true) {
      summaries.push(resultToSummary("firebase", firebaseResult));
    }

    if (opts.skipTelegram !== true) {
      summaries.push(resultToSummary("telegramApi", telegramResult));
    }

    const ok = summaries.every(function allOk(item) {
      return item.ok;
    });
    const probableErrorFile = getProbableErrorFile(summaries);

    const report = {
      ok,
      module: config.module || null,
      checkedAt,
      probableErrorFile,
      summaries,
      results: {
        stateResult,
        localResult,
        firebaseResult,
        telegramResult
      },
      options: {
        skipFirebase: opts.skipFirebase === true,
        skipTelegram: opts.skipTelegram === true,
        sendTestMessage: opts.sendTestMessage === true
      }
    };

    const saveResult = opts.skipSave === true
      ? {
          ok: true,
          skipped: true
        }
      : saveDiagnosticReport(report);

    return createResult({
      ok,
      status: ok
        ? (config.status ? config.status.READY : "ready")
        : (config.status ? config.status.ERROR : "error"),
      action,
      source,
      file,
      message: getMainMessage(ok, summaries),
      error: ok ? null : {
        message: "El diagnóstico completo encontró uno o más problemas.",
        file: probableErrorFile || file
      },
      data: {
        report,
        saveResult
      },
      checkedAt
    });
  }

  diagnostic.saveDiagnosticReport = saveDiagnosticReport;
  diagnostic.runDiagnosticReport = runDiagnosticReport;
})(window);
