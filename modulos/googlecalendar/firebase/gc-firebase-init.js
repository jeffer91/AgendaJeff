/*
  Nombre completo: gc-firebase-init.js
  Ruta: modulos/googlecalendar/firebase/gc-firebase-init.js

  Función:
    - Inicializar Firebase exclusivamente para el módulo Google Calendar.
    - Validar que la configuración Firebase exista y esté completa.
    - Detectar si el SDK Firebase está cargado en la ventana.
    - Exponer acceso controlado a Firestore y al documento conexiones/googleCalendar.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - modulos/googlecalendar/config/gc-firebase-config.js
    - modulos/googlecalendar/firebase/gc-firebase-read.js
    - modulos/googlecalendar/firebase/gc-firebase-save.js
    - modulos/googlecalendar/firebase/gc-firebase-test.js
*/

(function initGoogleCalendarFirebaseInit(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const firebaseLayer = googleCalendar.Firebase = googleCalendar.Firebase || {};

  const state = {
    initialized: false,
    app: null,
    db: null,
    lastError: null,
    lastCheckAt: ""
  };

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
            action: data.action || "init",
            source: data.source || "firebase",
            message: data.message || "",
            file: data.file || "modulos/googlecalendar/firebase/gc-firebase-init.js",
            data: data.data || null,
            error: data.error || null,
            checkedAt: data.checkedAt || new Date().toISOString()
          };
        };
  }

  function getFirebaseSdk() {
    if (global.firebase && typeof global.firebase === "object") {
      return global.firebase;
    }

    return null;
  }

  function hasFirebaseSdk() {
    const sdk = getFirebaseSdk();

    return Boolean(
      sdk &&
      typeof sdk.initializeApp === "function" &&
      typeof sdk.firestore === "function"
    );
  }

  function getFirebaseConfigResult() {
    if (!googleCalendar.FirebaseConfig || typeof googleCalendar.FirebaseConfig.getFirebaseConfig !== "function") {
      return {
        ok: false,
        config: null,
        validation: null,
        message: "No se encontró GoogleCalendar.FirebaseConfig."
      };
    }

    const firebaseConfig = googleCalendar.FirebaseConfig.getFirebaseConfig();
    const validation = typeof googleCalendar.FirebaseConfig.validateFirebaseConfig === "function"
      ? googleCalendar.FirebaseConfig.validateFirebaseConfig()
      : { ok: true, missingFields: [] };

    if (!validation.ok) {
      return {
        ok: false,
        config: firebaseConfig,
        validation,
        message: "La configuración Firebase de Google Calendar está incompleta."
      };
    }

    return {
      ok: true,
      config: firebaseConfig,
      validation,
      message: "Configuración Firebase válida."
    };
  }

  function findExistingFirebaseApp(firebaseSdk, projectId) {
    if (!firebaseSdk || !Array.isArray(firebaseSdk.apps) || firebaseSdk.apps.length === 0) {
      return null;
    }

    const matchingApp = firebaseSdk.apps.find(function findApp(app) {
      return app && app.options && app.options.projectId === projectId;
    });

    return matchingApp || firebaseSdk.apps[0] || null;
  }

  function getFirebaseState() {
    return {
      initialized: state.initialized,
      hasApp: Boolean(state.app),
      hasDb: Boolean(state.db),
      lastError: state.lastError,
      lastCheckAt: state.lastCheckAt
    };
  }

  function initializeFirebase() {
    const config = getConfig();
    const createResult = getCreateResult();
    const checkedAt = new Date().toISOString();
    const file = "modulos/googlecalendar/firebase/gc-firebase-init.js";

    state.lastCheckAt = checkedAt;

    if (state.initialized && state.app && state.db) {
      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: config.action ? config.action.INIT : "init",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "Firebase ya estaba inicializado para Google Calendar.",
        data: getFirebaseState(),
        checkedAt
      });
    }

    const configResult = getFirebaseConfigResult();

    if (!configResult.ok) {
      state.lastError = { message: configResult.message, file: "modulos/googlecalendar/config/gc-firebase-config.js" };
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.INIT : "init",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: configResult.message,
        error: state.lastError,
        data: { validation: configResult.validation },
        checkedAt
      });
    }

    const firebaseSdk = getFirebaseSdk();

    if (!hasFirebaseSdk()) {
      state.lastError = {
        message: "El SDK de Firebase no está cargado en gc-module.html.",
        file
      };
      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.INIT : "init",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: state.lastError.message,
        error: state.lastError,
        data: { sdkLoaded: false },
        checkedAt
      });
    }

    try {
      const existingApp = findExistingFirebaseApp(firebaseSdk, configResult.config.projectId);
      const app = existingApp || firebaseSdk.initializeApp(configResult.config);
      const db = firebaseSdk.firestore(app);

      state.initialized = true;
      state.app = app;
      state.db = db;
      state.lastError = null;

      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action: config.action ? config.action.INIT : "init",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: existingApp ? "Firebase existente reutilizado para Google Calendar." : "Firebase inicializado para Google Calendar.",
        data: {
          ...getFirebaseState(),
          projectId: configResult.config.projectId,
          reusedExistingApp: Boolean(existingApp)
        },
        checkedAt
      });
    } catch (error) {
      state.initialized = false;
      state.app = null;
      state.db = null;
      state.lastError = {
        message: error && error.message ? error.message : "No se pudo inicializar Firebase.",
        file
      };

      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action: config.action ? config.action.INIT : "init",
        source: config.source ? config.source.FIREBASE : "firebase",
        file,
        message: "No se pudo inicializar Firebase para Google Calendar.",
        error: state.lastError,
        data: getFirebaseState(),
        checkedAt
      });
    }
  }

  function getFirestore() {
    const initResult = initializeFirebase();

    if (!initResult.ok) {
      return { ok: false, db: null, initResult };
    }

    return { ok: true, db: state.db, initResult };
  }

  function getGoogleCalendarDocRef() {
    const config = getConfig();
    const firestoreResult = getFirestore();
    const collectionName = config.firebase ? config.firebase.collection : "conexiones";
    const documentName = config.firebase ? config.firebase.document : "googleCalendar";

    if (!firestoreResult.ok || !firestoreResult.db) {
      return {
        ok: false,
        ref: null,
        collection: collectionName,
        document: documentName,
        initResult: firestoreResult.initResult
      };
    }

    return {
      ok: true,
      ref: firestoreResult.db.collection(collectionName).doc(documentName),
      collection: collectionName,
      document: documentName,
      initResult: firestoreResult.initResult
    };
  }

  firebaseLayer.getFirebaseSdk = getFirebaseSdk;
  firebaseLayer.hasFirebaseSdk = hasFirebaseSdk;
  firebaseLayer.getFirebaseState = getFirebaseState;
  firebaseLayer.initializeFirebase = initializeFirebase;
  firebaseLayer.getFirestore = getFirestore;
  firebaseLayer.getGoogleCalendarDocRef = getGoogleCalendarDocRef;
})(window);
