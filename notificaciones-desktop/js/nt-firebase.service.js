/*
  Nombre completo: nt-firebase.service.js
  Ruta: notificaciones-desktop/js/nt-firebase.service.js
  Función:
    - Inicializar Firebase desde navegador usando CDN.
    - Guardar estado limpio de Notificaciones Desktop en Firestore.
    - Leer estado guardado de Notificaciones Desktop desde Firestore.
    - Actualizar última prueba.
    - Guardar último error limpio.
    - NO guardar tokens.
    - NO guardar datos sensibles.

  Se conecta con:
    - nt-config.js
    - nt-storage.js
    - nt-firebase-config.js
    - nt-environment.service.js
    - nt-index.html

  Firestore:
    - Colección: conexiones
    - Documento: notificacionesDesktop
*/

(function initNtFirebaseService(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const CONFIG = NT.CONFIG;
  const Utils = NT.Utils;

  let firebaseApp = null;
  let firestoreDb = null;

  function assertFirebaseSdk() {
    if (!global.firebase) {
      throw new Error(
        "Firebase SDK no está cargado. Revisa los scripts CDN en nt-index.html."
      );
    }

    if (!global.firebase.firestore) {
      throw new Error(
        "Firestore SDK no está cargado. Revisa firebase-firestore-compat en nt-index.html."
      );
    }

    if (!NT.FirebaseConfig) {
      throw new Error(
        "Falta NT.FirebaseConfig. Revisa nt-firebase-config.js."
      );
    }
  }

  function getExistingNamedApp(appName) {
    if (!global.firebase || !Array.isArray(global.firebase.apps)) {
      return null;
    }

    return global.firebase.apps.find((app) => app && app.name === appName) || null;
  }

  function getFirebaseApp() {
    assertFirebaseSdk();

    if (firebaseApp) {
      return firebaseApp;
    }

    const existingNamedApp = getExistingNamedApp(CONFIG.FIREBASE_APP_NAME);

    if (existingNamedApp) {
      firebaseApp = existingNamedApp;
      return firebaseApp;
    }

    firebaseApp = global.firebase.initializeApp(
      NT.FirebaseConfig,
      CONFIG.FIREBASE_APP_NAME
    );

    return firebaseApp;
  }

  function getFirestoreDb() {
    if (firestoreDb) {
      return firestoreDb;
    }

    firestoreDb = getFirebaseApp().firestore();

    return firestoreDb;
  }

  function getDocumentRef() {
    return getFirestoreDb()
      .collection(CONFIG.FIREBASE_COLLECTION_CONNECTIONS)
      .doc(CONFIG.FIREBASE_DOC_NOTIFICATIONS);
  }

  function cleanFirebasePayload(input) {
    const source = Utils.isPlainObject(input) ? input : {};

    return {
      provider: CONFIG.PROVIDER_NOTIFICATIONS,
      moduleName: CONFIG.MODULE_NAME,

      configured: Utils.toBoolean(source.configured, false),
      desktopNotificationsEnabled: Utils.toBoolean(
        source.desktopNotificationsEnabled,
        true
      ),
      trayEnabled: Utils.toBoolean(source.trayEnabled, true),
      soundEnabled: Utils.toBoolean(source.soundEnabled, true),
      remindersEnabled: Utils.toBoolean(source.remindersEnabled, true),

      environmentMode: Utils.normalizeEnvironmentMode(source.environmentMode),
      electronAvailable: Utils.toBoolean(source.electronAvailable, false),
      webNotificationsSupported: Utils.toBoolean(
        source.webNotificationsSupported,
        false
      ),
      webNotificationsPermission: Utils.normalizePermission(
        source.webNotificationsPermission
      ),
      originMode: Utils.cleanString(source.originMode),

      lastTestAt: Utils.cleanString(source.lastTestAt),
      lastTestType: Utils.cleanString(source.lastTestType),
      lastTestStatus: Utils.cleanString(source.lastTestStatus),
      lastErrorMessage: Utils.cleanString(source.lastErrorMessage),

      source: Utils.cleanString(source.source || CONFIG.DEFAULT_SOURCE),
      updatedAt: Utils.nowIso()
    };
  }

  async function readNotificationSettings() {
    const snapshot = await getDocumentRef().get();

    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() || null;
  }

  async function saveNotificationSettings(settings) {
    const payload = cleanFirebasePayload({
      ...settings,
      configured: true,
      updatedAt: Utils.nowIso()
    });

    await getDocumentRef().set(payload, {
      merge: true
    });

    return payload;
  }

  async function saveEnvironmentStatus(environmentStatus) {
    const payload = cleanFirebasePayload({
      ...(NT.Storage ? NT.Storage.readSettings() : {}),
      ...(Utils.isPlainObject(environmentStatus) ? environmentStatus : {}),
      configured: true,
      lastTestAt: Utils.nowIso(),
      lastTestType: "environment-detection",
      lastTestStatus: "ok",
      lastErrorMessage: ""
    });

    await getDocumentRef().set(payload, {
      merge: true
    });

    return payload;
  }

  async function saveLastTestStatus(testType, testStatus, extraData) {
    const payload = cleanFirebasePayload({
      ...(NT.Storage ? NT.Storage.readSettings() : {}),
      ...(Utils.isPlainObject(extraData) ? extraData : {}),
      configured: true,
      lastTestAt: Utils.nowIso(),
      lastTestType: Utils.cleanString(testType),
      lastTestStatus: Utils.cleanString(testStatus || "ok"),
      lastErrorMessage: ""
    });

    await getDocumentRef().set(payload, {
      merge: true
    });

    return payload;
  }

  async function saveErrorStatus(error, extraData) {
    const message = error && error.message
      ? error.message
      : String(error || "Error desconocido.");

    const payload = cleanFirebasePayload({
      ...(NT.Storage ? NT.Storage.readSettings() : {}),
      ...(Utils.isPlainObject(extraData) ? extraData : {}),
      configured: true,
      lastTestAt: Utils.nowIso(),
      lastTestType: "error",
      lastTestStatus: "error",
      lastErrorMessage: Utils.cleanString(message)
    });

    await getDocumentRef().set(payload, {
      merge: true
    });

    return payload;
  }

  async function markNotificationsDisconnected() {
    const payload = cleanFirebasePayload({
      configured: false,
      desktopNotificationsEnabled: false,
      trayEnabled: false,
      soundEnabled: false,
      remindersEnabled: false,
      environmentMode: CONFIG.ENVIRONMENT_UNKNOWN,
      electronAvailable: false,
      webNotificationsSupported: false,
      webNotificationsPermission: "unknown",
      originMode: CONFIG.ORIGIN_UNKNOWN,
      lastTestAt: Utils.nowIso(),
      lastTestType: "clear",
      lastTestStatus: "ok",
      lastErrorMessage: ""
    });

    await getDocumentRef().set(payload, {
      merge: true
    });

    return payload;
  }

  async function checkFirebaseConnection() {
    const payload = {
      ok: true,
      message: "Firebase conectado correctamente.",
      collection: CONFIG.FIREBASE_COLLECTION_CONNECTIONS,
      document: CONFIG.FIREBASE_DOC_NOTIFICATIONS,
      checkedAt: Utils.nowIso()
    };

    await getDocumentRef().set(
      {
        provider: CONFIG.PROVIDER_NOTIFICATIONS,
        firebaseConnectionOk: true,
        firebaseLastCheckAt: payload.checkedAt,
        updatedAt: payload.checkedAt
      },
      {
        merge: true
      }
    );

    return payload;
  }

  NT.FirebaseService = {
    getFirebaseApp,
    getFirestoreDb,
    getDocumentRef,
    cleanFirebasePayload,
    readNotificationSettings,
    saveNotificationSettings,
    saveEnvironmentStatus,
    saveLastTestStatus,
    saveErrorStatus,
    markNotificationsDisconnected,
    checkFirebaseConnection
  };
})(window);