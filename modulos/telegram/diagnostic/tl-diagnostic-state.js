/*
  Nombre completo: tl-diagnostic-state.js
  Ruta: modulos/telegram/diagnostic/tl-diagnostic-state.js

  Función:
    - Diagnosticar el estado general del módulo Telegram.
    - Verificar si están cargadas las capas principales: config, utils, storage, firebase, api y connection.
    - Detectar si la app corre en navegador o Electron.
    - No ejecutar pruebas remotas; solo inspecciona disponibilidad interna.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/utils/*
    - modulos/telegram/storage/*
    - modulos/telegram/firebase/*
    - modulos/telegram/api/*
    - modulos/telegram/connection/*
    - modulos/telegram/diagnostic/tl-diagnostic-report.js
*/

(function initTelegramDiagnosticState(global) {
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
        file: data.file || "modulos/telegram/diagnostic/tl-diagnostic-state.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function hasFunction(container, functionName) {
    return Boolean(container && typeof container[functionName] === "function");
  }

  function getRuntimeInfo() {
    const electronBridge = global.AgendaJeffElectron || null;

    return {
      mode: electronBridge && electronBridge.isElectron ? "electron" : "browser",
      hasElectronBridge: Boolean(electronBridge),
      userAgent: global.navigator && global.navigator.userAgent ? global.navigator.userAgent : "",
      language: global.navigator && global.navigator.language ? global.navigator.language : "",
      online: global.navigator && typeof global.navigator.onLine === "boolean" ? global.navigator.onLine : null,
      locationProtocol: global.location && global.location.protocol ? global.location.protocol : ""
    };
  }

  function getLayerAvailability() {
    const utils = telegram.Utils || {};
    const storage = telegram.Storage || {};
    const firebaseLayer = telegram.Firebase || {};
    const api = telegram.Api || {};
    const connection = telegram.Connection || {};

    return {
      config: {
        loaded: Boolean(telegram.CONFIG),
        hasDefaultConnection: typeof telegram.getDefaultConnection === "function",
        hasCreateResult: typeof telegram.createResult === "function"
      },
      firebaseConfig: {
        loaded: Boolean(telegram.FirebaseConfig),
        getFirebaseConfig: hasFunction(telegram.FirebaseConfig, "getFirebaseConfig"),
        validateFirebaseConfig: hasFunction(telegram.FirebaseConfig, "validateFirebaseConfig")
      },
      utils: {
        loaded: Boolean(telegram.Utils),
        time: Boolean(utils.Time),
        mask: Boolean(utils.Mask),
        normalize: Boolean(utils.Normalize),
        validate: Boolean(utils.Validate)
      },
      storage: {
        loaded: Boolean(telegram.Storage),
        readLocalConnection: hasFunction(storage, "readLocalConnection"),
        readLocalConnectionWithFallback: hasFunction(storage, "readLocalConnectionWithFallback"),
        saveLocalConnection: hasFunction(storage, "saveLocalConnection"),
        clearLocalConnection: hasFunction(storage, "clearLocalConnection"),
        testLocalStorage: hasFunction(storage, "testLocalStorage")
      },
      firebase: {
        loaded: Boolean(telegram.Firebase),
        initializeFirebase: hasFunction(firebaseLayer, "initializeFirebase"),
        readFirebaseConnection: hasFunction(firebaseLayer, "readFirebaseConnection"),
        saveFirebaseConnection: hasFunction(firebaseLayer, "saveFirebaseConnection"),
        testFirebaseConnection: hasFunction(firebaseLayer, "testFirebaseConnection")
      },
      api: {
        loaded: Boolean(telegram.Api),
        url: Boolean(api.Url),
        getTelegramBotInfo: hasFunction(api, "getTelegramBotInfo"),
        sendTelegramMessage: hasFunction(api, "sendTelegramMessage"),
        sendTelegramTestMessage: hasFunction(api, "sendTelegramTestMessage"),
        testTelegramApi: hasFunction(api, "testTelegramApi")
      },
      connection: {
        loaded: Boolean(telegram.Connection),
        calculateConnectionStatus: hasFunction(connection, "calculateConnectionStatus"),
        readConnection: hasFunction(connection, "readConnection"),
        saveConnection: hasFunction(connection, "saveConnection"),
        clearConnection: hasFunction(connection, "clearConnection"),
        testConnection: hasFunction(connection, "testConnection")
      }
    };
  }

  function flattenMissing(layerAvailability) {
    const missing = [];

    Object.keys(layerAvailability).forEach(function eachLayer(layerName) {
      const layer = layerAvailability[layerName];

      Object.keys(layer).forEach(function eachCheck(checkName) {
        if (layer[checkName] !== true) {
          missing.push({
            layer: layerName,
            check: checkName,
            value: layer[checkName]
          });
        }
      });
    });

    return missing;
  }

  function diagnoseModuleState() {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.DIAGNOSTIC : "modulos/telegram/diagnostic/";
    const action = config.action ? config.action.DIAGNOSTIC : "diagnostic";
    const source = config.source ? config.source.SYSTEM : "system";
    const runtime = getRuntimeInfo();
    const layerAvailability = getLayerAvailability();
    const missing = flattenMissing(layerAvailability);
    const ok = missing.length === 0;

    return createResult({
      ok,
      status: ok
        ? (config.status ? config.status.READY : "ready")
        : (config.status ? config.status.PARTIAL : "partial"),
      action,
      source,
      file,
      message: ok
        ? "El módulo Telegram tiene cargadas todas las capas base."
        : "El módulo Telegram tiene capas o funciones pendientes de cargar.",
      error: ok ? null : {
        message: "Faltan capas o funciones internas del módulo Telegram.",
        file
      },
      data: {
        runtime,
        layerAvailability,
        missing,
        module: config.module || null
      }
    });
  }

  diagnostic.getRuntimeInfo = getRuntimeInfo;
  diagnostic.getLayerAvailability = getLayerAvailability;
  diagnostic.diagnoseModuleState = diagnoseModuleState;
})(window);
