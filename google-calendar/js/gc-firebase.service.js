/*
  Nombre completo: gc-firebase.service.js
  Ruta: google-calendar/js/gc-firebase.service.js
  Función:
    - Inicializar Firebase desde navegador usando CDN.
    - Guardar SOLO las credenciales permitidas de Google Calendar en Firestore:
      clientIdWeb, clientSecretWeb, clientIdDesktop y clientSecretDesktop.
    - Leer el documento de Google Calendar desde Firestore.
    - Evitar que estados, errores, eventos, máscaras o campos extra ensucien Firestore.
  Se conecta con:
    - gc-config.js
    - gc-firebase-config.js
    - gc-app.js

  Ruta Firestore:
    Colección: conexiones
    Documento: googleCalendar

  Importante:
    - Este archivo NO guarda accessToken.
    - Este archivo NO guarda refreshToken.
    - Este archivo NO guarda estados de conexión.
    - Este archivo NO guarda errores.
    - Este archivo NO guarda eventos.
*/

(function initGcFirebaseService(global) {
  "use strict";

  const GC = global.GC;
  const CONFIG = GC.CONFIG;

  let firebaseApp = null;
  let firestoreDb = null;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function ensureFirebaseSdkExists() {
    if (!global.firebase) {
      throw new Error(
        "Firebase SDK no está cargado. Revisa los scripts CDN en gc-index.html."
      );
    }

    if (!global.firebase.firestore) {
      throw new Error(
        "Firestore SDK no está cargado. Revisa firebase-firestore-compat.js."
      );
    }
  }

  function initFirebase() {
    ensureFirebaseSdkExists();

    if (firebaseApp && firestoreDb) {
      return {
        app: firebaseApp,
        db: firestoreDb
      };
    }

    const existingApps = global.firebase.apps || [];

    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
    } else {
      firebaseApp = global.firebase.initializeApp(GC.FirebaseConfig);
    }

    firestoreDb = global.firebase.firestore();

    return {
      app: firebaseApp,
      db: firestoreDb
    };
  }

  function googleCalendarDocRef() {
    const firebaseInstance = initFirebase();

    return firebaseInstance.db
      .collection(CONFIG.FIREBASE_COLLECTION_CONNECTIONS)
      .doc(CONFIG.FIREBASE_DOC_GOOGLE_CALENDAR);
  }

  function resolveCredentialFields(params) {
    params = params || {};

    const activeCredentialType = normalizeText(params.activeCredentialType);

    let clientIdWeb = normalizeText(params.clientIdWeb);
    let clientSecretWeb = normalizeText(params.clientSecretWeb);
    let clientIdDesktop = normalizeText(params.clientIdDesktop);
    let clientSecretDesktop = normalizeText(params.clientSecretDesktop);

    const legacyClientId = normalizeText(params.clientId);
    const legacyClientSecret = normalizeText(params.clientSecret);

    if (!clientIdWeb && !clientIdDesktop && legacyClientId) {
      if (activeCredentialType === "desktop") {
        clientIdDesktop = legacyClientId;
      } else {
        clientIdWeb = legacyClientId;
      }
    }

    if (!clientSecretWeb && !clientSecretDesktop && legacyClientSecret) {
      if (activeCredentialType === "desktop") {
        clientSecretDesktop = legacyClientSecret;
      } else {
        clientSecretWeb = legacyClientSecret;
      }
    }

    return {
      clientIdWeb,
      clientSecretWeb,
      clientIdDesktop,
      clientSecretDesktop
    };
  }

  async function readGoogleCalendarConnectionStatus() {
    const snapshot = await googleCalendarDocRef().get();

    if (!snapshot.exists) {
      return {
        exists: false,
        clientIdWeb: "",
        clientSecretWeb: "",
        clientIdDesktop: "",
        clientSecretDesktop: ""
      };
    }

    const data = snapshot.data() || {};

    return {
      exists: true,
      id: snapshot.id,
      clientIdWeb: normalizeText(data.clientIdWeb),
      clientSecretWeb: normalizeText(data.clientSecretWeb),
      clientIdDesktop: normalizeText(data.clientIdDesktop),
      clientSecretDesktop: normalizeText(data.clientSecretDesktop)
    };
  }

  async function saveGoogleCalendarSavedConnectionStatus(params) {
    const payload = resolveCredentialFields(params);

    await googleCalendarDocRef().set(payload);

    return {
      clientIdWeb: "",
      clientSecretWeb: "",
      clientIdDesktop: "",
      clientSecretDesktop: "",
      clientIdWebSaved: Boolean(payload.clientIdWeb),
      clientSecretWebSaved: Boolean(payload.clientSecretWeb),
      clientIdDesktopSaved: Boolean(payload.clientIdDesktop),
      clientSecretDesktopSaved: Boolean(payload.clientSecretDesktop)
    };
  }

  async function saveGoogleCalendarConnectedStatus() {
    return {
      skipped: true,
      message: "No se guardó estado de conexión en Firestore. Solo se guardan credenciales."
    };
  }

  async function saveGoogleCalendarEventsReadStatus() {
    return {
      skipped: true,
      message: "No se guardó lectura de eventos en Firestore. Solo se guardan credenciales."
    };
  }

  async function saveGoogleCalendarEventCreatedStatus() {
    return {
      skipped: true,
      message: "No se guardó evento creado en Firestore. Solo se guardan credenciales."
    };
  }

  async function saveGoogleCalendarErrorStatus() {
    return {
      skipped: true,
      message: "No se guardó error en Firestore. Solo se guardan credenciales."
    };
  }

  async function saveGoogleCalendarDisconnectedStatus() {
    await googleCalendarDocRef().set({
      clientIdWeb: "",
      clientSecretWeb: "",
      clientIdDesktop: "",
      clientSecretDesktop: ""
    });

    return {
      clientIdWeb: "",
      clientSecretWeb: "",
      clientIdDesktop: "",
      clientSecretDesktop: ""
    };
  }

  async function checkFirebaseConnection() {
    initFirebase();

    return {
      ok: true,
      message: "Firebase inicializado correctamente.",
      collection: CONFIG.FIREBASE_COLLECTION_CONNECTIONS,
      document: CONFIG.FIREBASE_DOC_GOOGLE_CALENDAR
    };
  }

  GC.FirebaseService = {
    readGoogleCalendarConnectionStatus,
    saveGoogleCalendarSavedConnectionStatus,
    saveGoogleCalendarConnectedStatus,
    saveGoogleCalendarEventsReadStatus,
    saveGoogleCalendarEventCreatedStatus,
    saveGoogleCalendarErrorStatus,
    saveGoogleCalendarDisconnectedStatus,
    checkFirebaseConnection
  };
})(window);