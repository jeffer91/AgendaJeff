/*
  Nombre completo: tl-firebase.service.js
  Ruta: telegram/js/tl-firebase.service.js
  Función:
    - Inicializar Firebase desde navegador usando CDN.
    - Guardar estado limpio de Telegram en Firestore.
    - Leer estado de Telegram desde Firestore.
    - Marcar Telegram como desconectado.

  Se conecta con:
    - tl-config.js
    - tl-firebase-config.js
    - tl-app.js

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

  function ensureFirebaseSdkExists() {
    if (!global.firebase) {
      throw new Error(
        "Firebase SDK no está cargado. Revisa los scripts CDN en tl-index.html."
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
      firebaseApp = global.firebase.initializeApp(TL.FirebaseConfig);
    }

    firestoreDb = global.firebase.firestore();

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

  async function readTelegramConnectionStatus() {
    const snapshot = await telegramDocRef().get();

    if (!snapshot.exists) {
      return {
        exists: false,
        provider: CONFIG.PROVIDER_TELEGRAM,
        status: CONFIG.STATUS_IDLE,
        enabled: false
      };
    }

    return {
      exists: true,
      id: snapshot.id,
      ...snapshot.data()
    };
  }

  async function saveTelegramSavedConnectionStatus(params) {
    params = params || {};

    const botToken = normalizeText(params.botToken);
    const chatId = normalizeText(params.chatId);
    const savedAt = normalizeText(params.savedAt) || nowIso();

    const payload = {
      provider: CONFIG.PROVIDER_TELEGRAM,
      enabled: true,
      status: CONFIG.STATUS_IDLE,

      botConfigured: Boolean(botToken),
      chatConfigured: Boolean(chatId),

      botToken,
      botTokenMasked: maskValue(botToken),
      chatId,
      chatIdMasked: maskValue(chatId),

      savedAt,
      source: CONFIG.SOURCE,
      updatedAt: nowIso()
    };

    await telegramDocRef().set(payload, { merge: true });

    return {
      ...payload,
      botToken: "",
      botTokenSaved: Boolean(botToken)
    };
  }

  async function saveTelegramConnectedStatus(params) {
    const botUsername = normalizeText(params.botUsername);
    const chatId = normalizeText(params.chatId);
    const messageId = params.messageId || null;

    const payload = {
      provider: CONFIG.PROVIDER_TELEGRAM,
      enabled: true,
      status: CONFIG.STATUS_CONNECTED,

      botConfigured: Boolean(botUsername),
      chatConfigured: Boolean(chatId),

      botUsername,
      chatId,
      chatIdMasked: maskValue(chatId),

      lastTestAt: nowIso(),
      lastMessageId: messageId,

      source: CONFIG.SOURCE,
      updatedAt: nowIso()
    };

    await telegramDocRef().set(payload, { merge: true });

    return payload;
  }

  async function saveTelegramEventTestStatus(params) {
    const chatId = normalizeText(params.chatId);
    const messageId = params.messageId || null;
    const event = params.event || null;

    const payload = {
      provider: CONFIG.PROVIDER_TELEGRAM,
      enabled: true,
      status: CONFIG.STATUS_CONNECTED,

      chatConfigured: Boolean(chatId),
      chatId,
      chatIdMasked: maskValue(chatId),

      lastEventTestAt: nowIso(),
      lastEventTitle: event && event.title ? normalizeText(event.title) : "",
      lastEventDate: event && event.date ? normalizeText(event.date) : "",
      lastEventTime: event && event.time ? normalizeText(event.time) : "",
      lastEventId: event && event.id ? normalizeText(event.id) : "",

      lastMessageId: messageId,

      source: CONFIG.SOURCE,
      updatedAt: nowIso()
    };

    await telegramDocRef().set(payload, { merge: true });

    return payload;
  }

  async function saveTelegramErrorStatus(params) {
    const message = normalizeText(params.message);
    const chatId = normalizeText(params.chatId);

    const payload = {
      provider: CONFIG.PROVIDER_TELEGRAM,
      enabled: false,
      status: CONFIG.STATUS_ERROR,

      chatConfigured: Boolean(chatId),
      chatId,
      chatIdMasked: maskValue(chatId),

      lastError: message || "Error desconocido.",
      lastErrorAt: nowIso(),

      source: CONFIG.SOURCE,
      updatedAt: nowIso()
    };

    await telegramDocRef().set(payload, { merge: true });

    return payload;
  }

  async function saveTelegramDisconnectedStatus() {
    const payload = {
      provider: CONFIG.PROVIDER_TELEGRAM,
      enabled: false,
      status: CONFIG.STATUS_DISCONNECTED,

      botConfigured: false,
      chatConfigured: false,

      botUsername: "",
      botToken: "",
      botTokenMasked: "",
      chatId: "",
      chatIdMasked: "",

      disconnectedAt: nowIso(),

      source: CONFIG.SOURCE,
      updatedAt: nowIso()
    };

    await telegramDocRef().set(payload, { merge: true });

    return payload;
  }

  async function checkFirebaseConnection() {
    initFirebase();

    return {
      ok: true,
      message: "Firebase inicializado correctamente.",
      collection: CONFIG.FIREBASE_COLLECTION_CONNECTIONS,
      document: CONFIG.FIREBASE_DOC_TELEGRAM
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