/*
  Nombre completo: tl-firebase-init.js
  Ruta: modulos/telegram/firebase/tl-firebase-init.js

  Función:
    - Inicializar Firebase exclusivamente para el módulo Telegram.
    - Validar que la configuración Firebase exista y esté completa.
    - Detectar si el SDK Firebase está cargado en la ventana.
    - Exponer acceso controlado a Firestore y al documento de Telegram.

  Se conecta con:
    - modulos/telegram/config/tl-config.js
    - modulos/telegram/config/tl-firebase-config.js
    - modulos/telegram/firebase/tl-firebase-read.js
    - modulos/telegram/firebase/tl-firebase-save.js
    - modulos/telegram/firebase/tl-firebase-test.js
    - modulos/telegram/diagnostic/tl-diagnostic-firebase.js
*/

(function initTelegramFirebaseInit(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const firebaseLayer = telegram.Firebase = telegram.Firebase || {};

  const state = {
    initialized: false,
    app: null,
    db: null,
    lastError: null,
    lastCheckAt: ""
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
        source: data.source || "firebase",
        message: data.message || "",
        file: data.file || "modulos/telegram/firebase/tl-firebase-init.js",
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
    const config = getConfig();
    const file = config.fileHints ? config.fileHints.FIREBASE_CONFIG : "modulos/telegram/config/tl-firebase-config.js";

    if (!telegram.FirebaseConfig || typeof telegram.FirebaseConfig.getFirebaseConfig !== "function") {
      return {
        ok: false,
        file,
        config: null,
        validation: null,
        message: "No se encontró telegram.FirebaseConfig."
      };
    }

    const firebaseConfig = telegram.FirebaseConfig.getFirebaseConfig();
    const validation = typeof telegram.FirebaseConfig.validateFirebaseConfig === "function"
      ? telegram.FirebaseConfig.validateFirebaseConfig()
      : { ok: true, missingFields: [] };

    if (!validation.ok) {
      return {
        ok: false,
        file,
        config: firebaseConfig,
        validation,
        message: "La configuración Firebase de Telegram está incompleta."
      };
    }

    return {
      ok: true,
      file,
      config: firebaseConfig,
      validation,
      message: "Configuración Firebase válida."
    };
  }

  function findExistingFirebaseApp(firebaseSdk, projectId) {
    if (!firebaseSdk || !Array.isArray(firebaseSdk.apps)) {
      return null;
    }

    if (firebaseSdk.apps.length === 0) {
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
    const file = config.fileHints ? config.fileHints.FIREBASE_INIT : "modulos/telegram/firebase/tl-firebase-init.js";
    const action = config.action ? config.action.INIT : "init";
    const source = config.source ? config.source.FIREBASE : "firebase";
    const checkedAt = new Date().toISOString();

    state.lastCheckAt = checkedAt;

    if (state.initialized && state.app && state.db) {
      return createResult({
        ok: true,
        status: config.status ? config.status.READY : "ready",
        action,
        source,
        file,
        message: "Firebase ya estaba inicializado para Telegram.",
        data: getFirebaseState(),
        checkedAt
      });
    }

    const configResult = getFirebaseConfigResult();

    if (!configResult.ok) {
      state.lastError = {
        message: configResult.message,
        file: configResult.file
      };

      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: configResult.message,
        error: state.lastError,
        data: {
          validation: configResult.validation
        },
        checkedAt
      });
    }

    const firebaseSdk = getFirebaseSdk();

    if (!hasFirebaseSdk()) {
      state.lastError = {
        message: "El SDK de Firebase no está cargado. Deben cargarse firebase-app-compat y firebase-firestore-compat en el HTML del módulo.",
        file
      };

      return createResult({
        ok: false,
        status: config.status ? config.status.ERROR : "error",
        action,
        source,
        file,
        message: state.lastError.message,
        error: state.lastError,
        data: {
          sdkLoaded: false
        },
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
        action,
        source,
        file,
        message: existingApp
          ? "Firebase existente reutilizado para Telegram."
          : "Firebase inicializado correctamente para Telegram.",
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
        action,
        source,
        file,
        message: "No se pudo inicializar Firebase para Telegram.",
        error: state.lastError,
        data: getFirebaseState(),
        checkedAt
      });
    }
  }

  function getFirestore() {
    const initResult = initializeFirebase();

    if (!initResult.ok) {
      return {
        ok: false,
        db: null,
        initResult
      };
    }

    return {
      ok: true,
      db: state.db,
      initResult
    };
  }

  function getTelegramDocRef() {
    const config = getConfig();
    const firestoreResult = getFirestore();
    const collectionName = config.firebase ? config.firebase.collection : "conexiones";
    const documentName = config.firebase ? config.firebase.document : "telegram";

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
  firebaseLayer.getTelegramDocRef = getTelegramDocRef;
})(window);
