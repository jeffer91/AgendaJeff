/*
  Nombre completo: tl-diagnostic-firebase.js
  Ruta: modulos/telegram/diagnostic/tl-diagnostic-firebase.js

  Función:
    - Diagnosticar Firebase para el módulo Telegram.
    - Validar configuración Firebase.
    - Probar SDK, inicialización, referencia, lectura y marca de prueba.
    - No tocar Telegram API ni UI.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/config/tl-firebase-config.js
    - modulos/telegram/firebase/tl-firebase-init.js
    - modulos/telegram/firebase/tl-firebase-read.js
    - modulos/telegram/firebase/tl-firebase-test.js
    - modulos/telegram/diagnostic/tl-diagnostic-report.js
*/

(function initTelegramDiagnosticFirebase(global) {
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
        source: data.source || "firebase",
        message: data.message || "",
        file: data.file || "modulos/telegram/diagnostic/tl-diagnostic-firebase.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function validateConfigSafe() {
    if (!telegram.FirebaseConfig || typeof telegram.FirebaseConfig.validateFirebaseConfig !== "function") {
      return {
        ok: false,
        missingFields: [],
        message: "No se encontró validateFirebaseConfig en tl-firebase-config.js."
      };
    }

    const validation = telegram.FirebaseConfig.validateFirebaseConfig();

    return {
      ...validation,
      message: validation.ok
        ? "Configuración Firebase completa."
        : "Configuración Firebase incompleta."
    };
  }

  async function diagnoseFirebase() {
    const config = getConfig();
    const createResult = getCreateResult();
    const firebaseLayer = telegram.Firebase || {};
    const file = config.fileHints ? config.fileHints.FIREBASE_TEST : "modulos/telegram/firebase/tl-firebase-test.js";
    const action = config.action ? config.action.DIAGNOSTIC : "diagnostic";
    const source = config.source ? config.source.FIREBASE : "firebase";

    const configValidation = validateConfigSafe();
    const sdkLoaded = firebaseLayer.hasFirebaseSdk && typeof firebaseLayer.hasFirebaseSdk === "function"
      ? firebaseLayer.hasFirebaseSdk()
      : false;

    const firebaseStateBefore = firebaseLayer.getFirebaseState && typeof firebaseLayer.getFirebaseState === "function"
      ? firebaseLayer.getFirebaseState()
      : null;

    let initResult = null;
    let readResult = null;
    let testResult = null;

    if (firebaseLayer.initializeFirebase && typeof firebaseLayer.initializeFirebase === "function") {
      initResult = firebaseLayer.initializeFirebase();
    }

    if (firebaseLayer.readFirebaseConnection && typeof firebaseLayer.readFirebaseConnection === "function") {
      readResult = await firebaseLayer.readFirebaseConnection();
    }

    if (firebaseLayer.testFirebaseConnection && typeof firebaseLayer.testFirebaseConnection === "function") {
      testResult = await firebaseLayer.testFirebaseConnection();
    }

    const firebaseStateAfter = firebaseLayer.getFirebaseState && typeof firebaseLayer.getFirebaseState === "function"
      ? firebaseLayer.getFirebaseState()
      : null;

    const ok = Boolean(configValidation.ok && sdkLoaded && initResult && initResult.ok && testResult && testResult.ok);

    return createResult({
      ok,
      status: ok
        ? (config.status ? config.status.READY : "ready")
        : (config.status ? config.status.ERROR : "error"),
      action,
      source,
      file,
      message: ok
        ? "Firebase funciona correctamente para Telegram."
        : "Firebase tiene un problema de configuración, SDK, inicialización, lectura o escritura.",
      error: ok ? null : {
        message: "Falló el diagnóstico Firebase de Telegram.",
        file
      },
      data: {
        configValidation,
        sdkLoaded,
        firebaseStateBefore,
        initResult,
        readResult,
        testResult,
        firebaseStateAfter
      }
    });
  }

  diagnostic.diagnoseFirebase = diagnoseFirebase;
})(window);
