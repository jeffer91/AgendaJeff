/*
  Nombre completo: gc-firebase-test.js
  Ruta: modulos/googlecalendar/firebase/gc-firebase-test.js

  Función:
    - Probar SDK Firebase, configuración, inicialización, lectura y escritura mínima.
    - Confirmar acceso al documento conexiones/googleCalendar.
    - Devolver diagnóstico claro para UI y próximos bloques.

  Se conecta con:
    - modulos/googlecalendar/firebase/gc-firebase-init.js
    - modulos/googlecalendar/firebase/gc-firebase-read.js
    - modulos/googlecalendar/firebase/gc-firebase-save.js
*/

(function initGoogleCalendarFirebaseTest(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const firebaseLayer = googleCalendar.Firebase = googleCalendar.Firebase || {};

  function getConfig() {
    return googleCalendar.CONFIG || {};
  }

  function getCreateResult() {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult
      : function fallbackCreateResult(payload) {
          const data = payload && typeof payload === "object" ? payload : {};
          return {
            ok: Boolean(data.ok),
            status: data.status || (data.ok ? "ready" : "error"),
            action: data.action || "testFirebase",
            source: data.source || "firebase",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/firebase/gc-firebase-test.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  async function testFirebaseConnection() {
    const config = getConfig();
    const createResult = getCreateResult();
    const file = "modulos/googlecalendar/firebase/gc-firebase-test.js";
    const checkedAt = new Date().toISOString();
    const checks = {
      sdkLoaded: false,
      configValid: false,
      initialized: false,
      docRefOk: false,
      readOk: false,
      writeOk: false
    };

    const configValidation = googleCalendar.FirebaseConfig && typeof googleCalendar.FirebaseConfig.validateFirebaseConfig === "function"
      ? googleCalendar.FirebaseConfig.validateFirebaseConfig()
      : { ok: false, missingFields: ["FirebaseConfig"] };

    checks.configValid = Boolean(configValidation.ok);
    checks.sdkLoaded = Boolean(firebaseLayer.hasFirebaseSdk && firebaseLayer.hasFirebaseSdk());

    if (!firebaseLayer.initializeFirebase || typeof firebaseLayer.initializeFirebase !== "function") {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.TEST_FIREBASE : "testFirebase",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "No está disponible initializeFirebase. Revisa gc-firebase-init.js.",
        error: { message: "Falta initializeFirebase.", file: "modulos/googlecalendar/firebase/gc-firebase-init.js" },
        data: { checks, configValidation },
        checkedAt
      });
    }

    const initResult = firebaseLayer.initializeFirebase();
    checks.initialized = Boolean(initResult && initResult.ok);

    if (!initResult.ok) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.TEST_FIREBASE : "testFirebase",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "Firebase no pudo inicializarse para Google Calendar.",
        error: initResult.error,
        data: { checks, configValidation, initResult },
        checkedAt
      });
    }

    const refResult = firebaseLayer.getGoogleCalendarDocRef && typeof firebaseLayer.getGoogleCalendarDocRef === "function"
      ? firebaseLayer.getGoogleCalendarDocRef()
      : { ok: false, ref: null };

    checks.docRefOk = Boolean(refResult && refResult.ok && refResult.ref);

    if (!checks.docRefOk) {
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.TEST_FIREBASE : "testFirebase",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "No se pudo obtener referencia Firestore de Google Calendar.",
        error: refResult.initResult ? refResult.initResult.error : { message: "Referencia no disponible.", file },
        data: { checks, configValidation, initResult, refResult },
        checkedAt
      });
    }

    let readResult = null;
    let writeResult = null;

    if (firebaseLayer.readFirebaseConnection && typeof firebaseLayer.readFirebaseConnection === "function") {
      readResult = await firebaseLayer.readFirebaseConnection();
      checks.readOk = Boolean(readResult && (readResult.ok || readResult.status === "idle"));
    }

    if (firebaseLayer.saveFirebaseConnection && typeof firebaseLayer.saveFirebaseConnection === "function") {
      writeResult = await firebaseLayer.saveFirebaseConnection({
        configured: false,
        configurado: false,
        status: config.status ? config.status.PARTIAL : "partial",
        estado: config.status ? config.status.PARTIAL : "partial",
        lastAction: config.action ? config.action.TEST_FIREBASE : "testFirebase",
        ultimaAccion: config.action ? config.action.TEST_FIREBASE : "testFirebase",
        firebaseConnectionOk: true,
        firebaseConexionOk: true,
        firebaseLastCheckAt: checkedAt,
        firebaseUltimaRevisionEn: checkedAt,
        updatedAt: checkedAt,
        actualizadoEn: checkedAt
      }, {
        status: config.status ? config.status.PARTIAL : "partial",
        action: config.action ? config.action.TEST_FIREBASE : "testFirebase",
        source: config.source ? config.source.FIREBASE : "firebase"
      });
      checks.writeOk = Boolean(writeResult && writeResult.ok);
    }

    const ok = checks.sdkLoaded && checks.configValid && checks.initialized && checks.docRefOk && checks.writeOk;

    return createResult({
      ok,
      status: ok ? (config.status ? config.status.READY : "ready") : (config.status ? config.status.PARTIAL : "partial"),
      action: config.action ? config.action.TEST_FIREBASE : "testFirebase",
      source: config.source ? config.source.FIREBASE : "firebase",
      file,
      message: ok
        ? "Firebase Google Calendar funciona correctamente."
        : "Firebase Google Calendar respondió parcialmente; revisa JSON técnico.",
      error: ok ? null : {
        message: "Una o más pruebas Firebase no pasaron.",
        file
      },
      data: {
        checks,
        configValidation,
        initResult,
        readResult,
        writeResult
      },
      checkedAt
    });
  }

  firebaseLayer.testFirebaseConnection = testFirebaseConnection;
})(window);
