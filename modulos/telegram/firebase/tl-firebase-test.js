/*
  Nombre completo: tl-firebase-test.js
  Ruta: modulos/telegram/firebase/tl-firebase-test.js

  Función:
    - Probar la conexión Firebase exclusiva del módulo Telegram.
    - Validar SDK, configuración, inicialización, referencia y lectura del documento.
    - Guardar una marca de prueba en el documento Telegram sin borrar campos existentes.
    - Entregar diagnóstico claro de Firebase sin tocar Telegram API ni UI.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/config/tl-firebase-config.js
    - modulos/telegram/firebase/tl-firebase-init.js
    - modulos/telegram/firebase/tl-firebase-read.js
    - modulos/telegram/firebase/tl-firebase-save.js
    - modulos/telegram/diagnostic/tl-diagnostic-firebase.js
*/

(function initTelegramFirebaseTest(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const firebaseLayer = telegram.Firebase = telegram.Firebase || {};

  function getConfig() {
    return telegram.CONFIG || {};
  }

  function getUtils() {
    return telegram.Utils || {};
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
        action: data.action || "testFirebase",
        source: data.source || "firebase",
        message: data.message || "",
        file: data.file || "modulos/telegram/firebase/tl-firebase-test.js",
        data: data.data || null,
        error: data.error || null,
        checkedAt: data.checkedAt || new Date().toISOString()
      };
    };
  }

  function validateFirebaseConfigSafe() {
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

  async function writeFirebaseTestMark(refResult, checkedAt) {
    const config = getConfig();
    const testPayload = {
      firebaseConnectionOk: true,
      firebaseConexionOk: true,
      firebaseLastCheck: checkedAt,
      lastFirebaseTest: {
        ok: true,
        action: config.action ? config.action.TEST_FIREBASE : "testFirebase",
        source: config.source ? config.source.FIREBASE : "firebase",
        checkedAt
      },
      updatedAt: checkedAt,
      actualizadoEn: checkedAt
    };

    await refResult.ref.set(testPayload, { merge: true });

    return testPayload;
  }

  async function testFirebaseConnection() {
    const config = getConfig();
    const utils = getUtils();
    const time = utils.Time || {};
    const createResult = getCreateResult();
    const file = config.fileHints ? config.fileHints.FIREBASE_TEST : "modulos/telegram/firebase/tl-firebase-test.js";
    const action = config.action ? config.action.TEST_FIREBASE : "testFirebase";
    const source = config.source ? config.source.FIREBASE : "firebase";
    const checkedAt = typeof time.nowIso === "function" ? time.nowIso() : new Date().toISOString();

    const checks = {
      sdkLoaded: false,
      configValid: false,
      initialized: false,
      refCreated: false,
      documentRead: false,
      testMarkSaved: false
    };

    const configValidation = validateFirebaseConfigSafe();
    checks.configValid = Boolean(configValidation.ok);

    if (!checks.configValid) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: configValidation.message,
        error: {
          message: configValidation.message,
          file: config.fileHints ? config.fileHints.FIREBASE_CONFIG : "modulos/telegram/config/tl-firebase-config.js"
        },
        data: {
          checks,
          configValidation
        },
        checkedAt
      });
    }

    checks.sdkLoaded = Boolean(
      firebaseLayer.hasFirebaseSdk &&
      typeof firebaseLayer.hasFirebaseSdk === "function" &&
      firebaseLayer.hasFirebaseSdk()
    );

    if (!checks.sdkLoaded) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "El SDK de Firebase no está cargado en el HTML del módulo.",
        error: {
          message: "Faltan los scripts firebase-app-compat y firebase-firestore-compat.",
          file
        },
        data: {
          checks,
          configValidation
        },
        checkedAt
      });
    }

    if (!firebaseLayer.initializeFirebase || typeof firebaseLayer.initializeFirebase !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No existe initializeFirebase. Revisa tl-firebase-init.js.",
        error: {
          message: "Falta la función initializeFirebase.",
          file: config.fileHints ? config.fileHints.FIREBASE_INIT : "modulos/telegram/firebase/tl-firebase-init.js"
        },
        data: {
          checks,
          configValidation
        },
        checkedAt
      });
    }

    const initResult = firebaseLayer.initializeFirebase();
    checks.initialized = Boolean(initResult && initResult.ok);

    if (!checks.initialized) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "Firebase no pudo inicializarse para Telegram.",
        error: initResult ? initResult.error : null,
        data: {
          checks,
          configValidation,
          initResult
        },
        checkedAt
      });
    }

    if (!firebaseLayer.getTelegramDocRef || typeof firebaseLayer.getTelegramDocRef !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No existe getTelegramDocRef. Revisa tl-firebase-init.js.",
        error: {
          message: "Falta la referencia del documento Telegram.",
          file: config.fileHints ? config.fileHints.FIREBASE_INIT : "modulos/telegram/firebase/tl-firebase-init.js"
        },
        data: {
          checks,
          configValidation,
          initResult
        },
        checkedAt
      });
    }

    const refResult = firebaseLayer.getTelegramDocRef();
    checks.refCreated = Boolean(refResult && refResult.ok && refResult.ref);

    if (!checks.refCreated) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "No se pudo crear la referencia al documento Telegram en Firebase.",
        error: refResult ? refResult.initResult && refResult.initResult.error : null,
        data: {
          checks,
          configValidation,
          initResult,
          refResult
        },
        checkedAt
      });
    }

    try {
      const snapshot = await refResult.ref.get();
      checks.documentRead = true;

      const existsBeforeTest = Boolean(snapshot && snapshot.exists);
      const dataBeforeTest = existsBeforeTest && snapshot.data ? snapshot.data() : null;
      const testPayload = await writeFirebaseTestMark(refResult, checkedAt);
      checks.testMarkSaved = true;

      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action,
        source,
        file,
        message: "Firebase funciona correctamente para el módulo Telegram.",
        data: {
          checks,
          collection: refResult.collection,
          document: refResult.document,
          existsBeforeTest,
          dataBeforeTest,
          testPayload,
          initResult,
          configValidation
        },
        checkedAt
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: "Falló la prueba Firebase del módulo Telegram.",
        error: {
          message: error && error.message ? error.message : "Error desconocido probando Firebase.",
          file
        },
        data: {
          checks,
          collection: refResult.collection,
          document: refResult.document,
          initResult,
          configValidation
        },
        checkedAt
      });
    }
  }

  firebaseLayer.validateFirebaseConfigSafe = validateFirebaseConfigSafe;
  firebaseLayer.testFirebaseConnection = testFirebaseConnection;
})(window);
