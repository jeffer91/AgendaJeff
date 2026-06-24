/*
  Nombre completo: gc-firebase.service.js
  Ruta: google-calendar/js/gc-firebase.service.js

  Función:
    - Inicializar Firebase desde navegador usando CDN.
    - Guardar configuración y estado limpio de Google Calendar en Firestore.
    - Leer el documento de Google Calendar desde Firestore.
    - NO guardar accessToken ni refreshToken.

  Ruta Firestore:
    Colección: conexiones
    Documento: googleCalendar
*/

(function initGcFirebaseService(global) {
  "use strict";

  const GC = global.GC;
  const CONFIG = GC.CONFIG;

  let firebaseApp = null;
  let firestoreDb = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function maskValue(value) {
    const text = normalizeText(value);
    if (!text) return "";
    if (text.length <= 8) return "********";
    return `${"*".repeat(Math.max(0, text.length - 8))}${text.slice(-8)}`;
  }

  function sanitizeForFirestore(value) {
    if (value === undefined || typeof value === "function") {
      return null;
    }

    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map(sanitizeForFirestore);
    }

    if (value && typeof value === "object") {
      const cleanObject = {};
      Object.entries(value).forEach(([key, entryValue]) => {
        if (entryValue !== undefined && typeof entryValue !== "function") {
          cleanObject[key] = sanitizeForFirestore(entryValue);
        }
      });
      return cleanObject;
    }

    return value;
  }

  function ensureFirebaseSdkExists() {
    if (!global.firebase) {
      throw new Error("Firebase SDK no está cargado. Revisa los scripts CDN en gc-index.html.");
    }

    if (!global.firebase.firestore) {
      throw new Error("Firestore SDK no está cargado. Revisa firebase-firestore-compat.js.");
    }

    if (!GC.FirebaseConfig || !GC.FirebaseConfig.apiKey || !GC.FirebaseConfig.projectId || !GC.FirebaseConfig.appId) {
      throw new Error("Falta GC.FirebaseConfig válido. Revisa gc-firebase-config.js.");
    }
  }

  function getExistingNamedApp() {
    if (!global.firebase || !Array.isArray(global.firebase.apps)) {
      return null;
    }

    return global.firebase.apps.find((app) => app && app.name === CONFIG.FIREBASE_APP_NAME) || null;
  }

  function initFirebase() {
    ensureFirebaseSdkExists();

    if (firebaseApp && firestoreDb) {
      return {
        app: firebaseApp,
        db: firestoreDb
      };
    }

    const existingNamedApp = getExistingNamedApp();

    if (existingNamedApp) {
      firebaseApp = existingNamedApp;
      firestoreDb = global.firebase.firestore(firebaseApp);
      return {
        app: firebaseApp,
        db: firestoreDb
      };
    }

    firebaseApp = global.firebase.initializeApp(GC.FirebaseConfig, CONFIG.FIREBASE_APP_NAME);
    firestoreDb = global.firebase.firestore(firebaseApp);

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

  function addCommonFields(payload) {
    const safePayload = payload || {};
    const updatedAt = safePayload.updatedAt || nowIso();

    return sanitizeForFirestore({
      ...safePayload,
      provider: CONFIG.PROVIDER_GOOGLE_CALENDAR,
      proveedor: CONFIG.PROVIDER_GOOGLE_CALENDAR,
      source: CONFIG.SOURCE,
      updatedAt,
      actualizadoEn: updatedAt,
      firestoreCollection: CONFIG.FIREBASE_COLLECTION_CONNECTIONS,
      firestoreDocument: CONFIG.FIREBASE_DOC_GOOGLE_CALENDAR
    });
  }

  function resolveCredentialFields(params) {
    params = params || {};

    const activeCredentialType = normalizeText(params.activeCredentialType);
    const runtimeMode = normalizeText(params.runtimeMode);
    const fallbackUsed = Boolean(params.fallbackUsed);

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
      clientSecretDesktop,
      clientIdWebMasked: maskValue(clientIdWeb),
      clientSecretWebMasked: maskValue(clientSecretWeb),
      clientIdDesktopMasked: maskValue(clientIdDesktop),
      clientSecretDesktopMasked: maskValue(clientSecretDesktop),
      activeCredentialType,
      runtimeMode,
      fallbackUsed,
      calendarId: normalizeText(params.calendarId) || CONFIG.DEFAULT_CALENDAR_ID,
      savedAt: normalizeText(params.savedAt) || nowIso()
    };
  }

  async function readGoogleCalendarConnectionStatus() {
    const snapshot = await googleCalendarDocRef().get();

    if (!snapshot.exists) {
      return {
        exists: false,
        provider: CONFIG.PROVIDER_GOOGLE_CALENDAR,
        proveedor: CONFIG.PROVIDER_GOOGLE_CALENDAR,
        status: CONFIG.STATUS_IDLE,
        estado: CONFIG.STATUS_IDLE,
        clientIdWeb: "",
        clientSecretWeb: "",
        clientIdDesktop: "",
        clientSecretDesktop: "",
        calendarId: CONFIG.DEFAULT_CALENDAR_ID
      };
    }

    const data = snapshot.data() || {};
    const status = normalizeText(data.status || data.estado || CONFIG.STATUS_IDLE);

    return {
      exists: true,
      id: snapshot.id,
      ...data,
      status,
      estado: status,
      clientIdWeb: normalizeText(data.clientIdWeb),
      clientSecretWeb: normalizeText(data.clientSecretWeb),
      clientIdDesktop: normalizeText(data.clientIdDesktop),
      clientSecretDesktop: normalizeText(data.clientSecretDesktop),
      calendarId: normalizeText(data.calendarId) || CONFIG.DEFAULT_CALENDAR_ID,
      updatedAt: normalizeText(data.updatedAt || data.actualizadoEn),
      actualizadoEn: normalizeText(data.actualizadoEn || data.updatedAt)
    };
  }

  async function saveGoogleCalendarSavedConnectionStatus(params) {
    const credentials = resolveCredentialFields(params);
    const payload = addCommonFields({
      ...credentials,
      configured: Boolean(
        (credentials.clientIdWeb && credentials.clientSecretWeb) ||
        (credentials.clientIdDesktop && credentials.clientSecretDesktop)
      ),
      configurado: Boolean(
        (credentials.clientIdWeb && credentials.clientSecretWeb) ||
        (credentials.clientIdDesktop && credentials.clientSecretDesktop)
      ),
      status: CONFIG.STATUS_IDLE,
      estado: CONFIG.STATUS_IDLE,
      lastAction: "savedConnection",
      ultimaAccion: "conexionGuardada"
    });

    await googleCalendarDocRef().set(payload, { merge: true });

    return {
      clientIdWeb: "",
      clientSecretWeb: "",
      clientIdDesktop: "",
      clientSecretDesktop: "",
      clientIdWebSaved: Boolean(payload.clientIdWeb),
      clientSecretWebSaved: Boolean(payload.clientSecretWeb),
      clientIdDesktopSaved: Boolean(payload.clientIdDesktop),
      clientSecretDesktopSaved: Boolean(payload.clientSecretDesktop),
      calendarId: payload.calendarId,
      status: payload.status,
      estado: payload.estado,
      firestorePath: `${CONFIG.FIREBASE_COLLECTION_CONNECTIONS}/${CONFIG.FIREBASE_DOC_GOOGLE_CALENDAR}`
    };
  }

  async function saveGoogleCalendarConnectedStatus(params) {
    params = params || {};

    const connectedAt = nowIso();
    const payload = addCommonFields({
      enabled: true,
      habilitado: true,
      configured: true,
      configurado: true,
      status: CONFIG.STATUS_CONNECTED,
      estado: CONFIG.STATUS_CONNECTED,
      calendarId: normalizeText(params.calendarId) || CONFIG.DEFAULT_CALENDAR_ID,
      accountEmail: normalizeText(params.accountEmail),
      primaryCalendarId: normalizeText(params.primaryCalendarId),
      calendarSummary: normalizeText(params.calendarSummary),
      timeZone: normalizeText(params.timeZone),
      lastConnectedAt: connectedAt,
      conectadoEn: connectedAt,
      lastAction: "connected",
      ultimaAccion: "conectado"
    });

    await googleCalendarDocRef().set(payload, { merge: true });

    return payload;
  }

  async function saveGoogleCalendarEventsReadStatus(params) {
    params = params || {};
    const readAt = nowIso();

    const payload = addCommonFields({
      status: CONFIG.STATUS_CONNECTED,
      estado: CONFIG.STATUS_CONNECTED,
      calendarId: normalizeText(params.calendarId) || CONFIG.DEFAULT_CALENDAR_ID,
      lastEventsReadAt: readAt,
      eventosLeidosEn: readAt,
      lastEventsCount: Number(params.eventsCount || 0),
      totalEventosLeidos: Number(params.eventsCount || 0),
      lastAction: "readEvents",
      ultimaAccion: "leerEventos"
    });

    await googleCalendarDocRef().set(payload, { merge: true });

    return payload;
  }

  async function saveGoogleCalendarEventCreatedStatus(params) {
    params = params || {};
    const createdAt = nowIso();

    const payload = addCommonFields({
      status: CONFIG.STATUS_CONNECTED,
      estado: CONFIG.STATUS_CONNECTED,
      calendarId: normalizeText(params.calendarId) || CONFIG.DEFAULT_CALENDAR_ID,
      lastCreatedEventId: normalizeText(params.eventId),
      ultimoEventoCreadoId: normalizeText(params.eventId),
      lastCreatedEventHtmlLink: normalizeText(params.htmlLink),
      ultimoEventoCreadoLink: normalizeText(params.htmlLink),
      lastEventCreatedAt: createdAt,
      ultimoEventoCreadoEn: createdAt,
      lastAction: "createdEvent",
      ultimaAccion: "crearEvento"
    });

    await googleCalendarDocRef().set(payload, { merge: true });

    return payload;
  }

  async function saveGoogleCalendarErrorStatus(params) {
    params = params || {};
    const errorAt = nowIso();
    const message = normalizeText(params.message) || "Error desconocido.";

    const payload = addCommonFields({
      status: CONFIG.STATUS_ERROR,
      estado: CONFIG.STATUS_ERROR,
      calendarId: normalizeText(params.calendarId) || CONFIG.DEFAULT_CALENDAR_ID,
      lastError: message,
      ultimoError: message,
      lastErrorAt: errorAt,
      ultimoErrorEn: errorAt,
      lastAction: "error",
      ultimaAccion: "error"
    });

    await googleCalendarDocRef().set(payload, { merge: true });

    return payload;
  }

  async function saveGoogleCalendarDisconnectedStatus() {
    const disconnectedAt = nowIso();

    const payload = addCommonFields({
      enabled: false,
      habilitado: false,
      configured: false,
      configurado: false,
      status: CONFIG.STATUS_DISCONNECTED,
      estado: CONFIG.STATUS_DISCONNECTED,
      clientIdWeb: "",
      clientSecretWeb: "",
      clientIdDesktop: "",
      clientSecretDesktop: "",
      calendarId: CONFIG.DEFAULT_CALENDAR_ID,
      disconnectedAt,
      desconectadoEn: disconnectedAt,
      lastAction: "disconnected",
      ultimaAccion: "desconectado"
    });

    await googleCalendarDocRef().set(payload, { merge: true });

    return payload;
  }

  async function checkFirebaseConnection() {
    initFirebase();

    const checkedAt = nowIso();

    await googleCalendarDocRef().set(addCommonFields({
      firebaseConnectionOk: true,
      firebaseConexionOk: true,
      firebaseLastCheckAt: checkedAt,
      firebaseUltimaRevisionEn: checkedAt,
      lastAction: "firebaseCheck",
      ultimaAccion: "revisionFirebase"
    }), { merge: true });

    return {
      ok: true,
      message: "Firebase inicializado correctamente.",
      collection: CONFIG.FIREBASE_COLLECTION_CONNECTIONS,
      document: CONFIG.FIREBASE_DOC_GOOGLE_CALENDAR,
      checkedAt
    };
  }

  GC.FirebaseService = {
    initFirebase,
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
