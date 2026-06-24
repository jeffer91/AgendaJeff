/*
  Nombre completo: tl-firebase.service.js
  Ruta: telegram/js/tl-firebase.service.js

  Función:
    - Inicializar Firebase desde navegador usando CDN.
    - Guardar estado limpio de Telegram en Firestore.
    - Leer estado de Telegram desde Firestore.
    - Marcar Telegram como desconectado.
    - Mantener aliases español/inglés para que otros módulos puedan leer sin romperse.

  Ruta Firestore:
    Colección: conexiones
    Documento: telegram
*/

(function initTlFirebaseService(global) {
  "use strict";

  const TL = global.TL;
  const CONFIG = TL.CONFIG;

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

    if (!text) {
      return "";
    }

    if (text.length <= 4) {
      return "****";
    }

    return `${"*".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
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
      throw new Error("Firebase SDK no está cargado. Revisa los scripts CDN en tl-index.html.");
    }

    if (!global.firebase.firestore) {
      throw new Error("Firestore SDK no está cargado. Revisa firebase-firestore-compat.js.");
    }

    if (!TL.FirebaseConfig || !TL.FirebaseConfig.apiKey || !TL.FirebaseConfig.projectId || !TL.FirebaseConfig.appId) {
      throw new Error("Falta TL.FirebaseConfig válido. Revisa tl-firebase-config.js.");
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

    firebaseApp = global.firebase.initializeApp(TL.FirebaseConfig, CONFIG.FIREBASE_APP_NAME);
    firestoreDb = global.firebase.firestore(firebaseApp);

    return {
      app: firebaseApp,
      db: firestoreDb
    };
  }

  function telegramDocRef() {
    const firebaseInstance = initFirebase();

    return firebaseInstance.db
      .collection(CONFIG.FIREBASE_COLLECTION_CONNECTIONS)
      .doc(CONFIG.FIREBASE_DOC_TELEGRAM);
  }

  function addCommonFields(payload) {
    const safePayload = payload || {};
    const updatedAt = safePayload.updatedAt || nowIso();

    return sanitizeForFirestore({
      ...safePayload,
      provider: CONFIG.PROVIDER_TELEGRAM,
      proveedor: CONFIG.PROVIDER_TELEGRAM,
      source: CONFIG.SOURCE,
      updatedAt,
      actualizadoEn: updatedAt,
      firestoreCollection: CONFIG.FIREBASE_COLLECTION_CONNECTIONS,
      firestoreDocument: CONFIG.FIREBASE_DOC_TELEGRAM
    });
  }

  async function readTelegramConnectionStatus() {
    const snapshot = await telegramDocRef().get();

    if (!snapshot.exists) {
      return {
        exists: false,
        provider: CONFIG.PROVIDER_TELEGRAM,
        proveedor: CONFIG.PROVIDER_TELEGRAM,
        status: CONFIG.STATUS_IDLE,
        estado: CONFIG.STATUS_IDLE,
        enabled: false,
        habilitado: false
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
      enabled: Boolean(data.enabled ?? data.habilitado),
      habilitado: Boolean(data.enabled ?? data.habilitado),
      botToken: normalizeText(data.botToken),
      chatId: normalizeText(data.chatId),
      updatedAt: normalizeText(data.updatedAt || data.actualizadoEn),
      actualizadoEn: normalizeText(data.actualizadoEn || data.updatedAt)
    };
  }

  async function saveTelegramSavedConnectionStatus(params) {
    params = params || {};

    const botToken = normalizeText(params.botToken);
    const chatId = normalizeText(params.chatId);
    const savedAt = normalizeText(params.savedAt) || nowIso();

    const payload = addCommonFields({
      enabled: true,
      habilitado: true,
      status: CONFIG.STATUS_IDLE,
      estado: CONFIG.STATUS_IDLE,

      botConfigured: Boolean(botToken),
      botConfigurado: Boolean(botToken),
      chatConfigured: Boolean(chatId),
      chatConfigurado: Boolean(chatId),

      botToken,
      botTokenMasked: maskValue(botToken),
      botTokenEnmascarado: maskValue(botToken),
      chatId,
      chatIdMasked: maskValue(chatId),
      chatIdEnmascarado: maskValue(chatId),

      savedAt,
      guardadoEn: savedAt,
      lastAction: "savedConnection",
      ultimaAccion: "conexionGuardada"
    });

    await telegramDocRef().set(payload, { merge: true });

    return {
      ...payload,
      botToken: "",
      botTokenSaved: Boolean(botToken),
      botTokenGuardado: Boolean(botToken)
    };
  }

  async function saveTelegramConnectedStatus(params) {
    params = params || {};

    const botUsername = normalizeText(params.botUsername);
    const chatId = normalizeText(params.chatId);
    const messageId = params.messageId || null;
    const testedAt = nowIso();

    const payload = addCommonFields({
      enabled: true,
      habilitado: true,
      status: CONFIG.STATUS_CONNECTED,
      estado: CONFIG.STATUS_CONNECTED,

      botConfigured: Boolean(botUsername),
      botConfigurado: Boolean(botUsername),
      chatConfigured: Boolean(chatId),
      chatConfigurado: Boolean(chatId),

      botUsername,
      botUsuario: botUsername,
      chatId,
      chatIdMasked: maskValue(chatId),
      chatIdEnmascarado: maskValue(chatId),

      lastTestAt: testedAt,
      ultimaPruebaEn: testedAt,
      lastMessageId: messageId,
      ultimoMensajeId: messageId,
      lastAction: "connected",
      ultimaAccion: "conectado"
    });

    await telegramDocRef().set(payload, { merge: true });

    return payload;
  }

  async function saveTelegramEventTestStatus(params) {
    params = params || {};

    const chatId = normalizeText(params.chatId);
    const messageId = params.messageId || null;
    const event = params.event || null;
    const testedAt = nowIso();

    const payload = addCommonFields({
      enabled: true,
      habilitado: true,
      status: CONFIG.STATUS_CONNECTED,
      estado: CONFIG.STATUS_CONNECTED,

      chatConfigured: Boolean(chatId),
      chatConfigurado: Boolean(chatId),
      chatId,
      chatIdMasked: maskValue(chatId),
      chatIdEnmascarado: maskValue(chatId),

      lastEventTestAt: testedAt,
      ultimaPruebaEventoEn: testedAt,
      lastEventTitle: event && event.title ? normalizeText(event.title) : "",
      ultimoEventoTitulo: event && event.title ? normalizeText(event.title) : "",
      lastEventDate: event && event.date ? normalizeText(event.date) : "",
      ultimoEventoFecha: event && event.date ? normalizeText(event.date) : "",
      lastEventTime: event && event.time ? normalizeText(event.time) : "",
      ultimoEventoHora: event && event.time ? normalizeText(event.time) : "",
      lastEventId: event && event.id ? normalizeText(event.id) : "",
      ultimoEventoId: event && event.id ? normalizeText(event.id) : "",

      lastMessageId: messageId,
      ultimoMensajeId: messageId,
      lastAction: "eventTest",
      ultimaAccion: "pruebaEvento"
    });

    await telegramDocRef().set(payload, { merge: true });

    return payload;
  }

  async function saveTelegramErrorStatus(params) {
    params = params || {};

    const message = normalizeText(params.message);
    const chatId = normalizeText(params.chatId);
    const errorAt = nowIso();

    const payload = addCommonFields({
      enabled: false,
      habilitado: false,
      status: CONFIG.STATUS_ERROR,
      estado: CONFIG.STATUS_ERROR,

      chatConfigured: Boolean(chatId),
      chatConfigurado: Boolean(chatId),
      chatId,
      chatIdMasked: maskValue(chatId),
      chatIdEnmascarado: maskValue(chatId),

      lastError: message || "Error desconocido.",
      ultimoError: message || "Error desconocido.",
      lastErrorAt: errorAt,
      ultimoErrorEn: errorAt,
      lastAction: "error",
      ultimaAccion: "error"
    });

    await telegramDocRef().set(payload, { merge: true });

    return payload;
  }

  async function saveTelegramDisconnectedStatus() {
    const disconnectedAt = nowIso();

    const payload = addCommonFields({
      enabled: false,
      habilitado: false,
      status: CONFIG.STATUS_DISCONNECTED,
      estado: CONFIG.STATUS_DISCONNECTED,

      botConfigured: false,
      botConfigurado: false,
      chatConfigured: false,
      chatConfigurado: false,

      botUsername: "",
      botUsuario: "",
      botToken: "",
      botTokenMasked: "",
      botTokenEnmascarado: "",
      chatId: "",
      chatIdMasked: "",
      chatIdEnmascarado: "",

      disconnectedAt,
      desconectadoEn: disconnectedAt,
      lastAction: "disconnected",
      ultimaAccion: "desconectado"
    });

    await telegramDocRef().set(payload, { merge: true });

    return payload;
  }

  async function checkFirebaseConnection() {
    initFirebase();

    const checkedAt = nowIso();

    await telegramDocRef().set(addCommonFields({
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
      document: CONFIG.FIREBASE_DOC_TELEGRAM,
      checkedAt
    };
  }

  TL.FirebaseService = {
    initFirebase,
    checkFirebaseConnection,
    readTelegramConnectionStatus,
    saveTelegramSavedConnectionStatus,
    saveTelegramConnectedStatus,
    saveTelegramEventTestStatus,
    saveTelegramErrorStatus,
    saveTelegramDisconnectedStatus
  };
})(window);
