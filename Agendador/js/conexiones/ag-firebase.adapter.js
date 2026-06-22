/*
  Nombre completo: ag-firebase.adapter.js
  Ruta: Agendador/js/conexiones/ag-firebase.adapter.js

  Función:
    - Adaptador del Agendador para Firebase / Firestore.
    - Guarda eventos, pendientes y recordatorios en Firestore.
    - Usa Firebase compat si está cargado.
    - Inicializa Firebase si todavía no existe una app inicializada.
    - Reutiliza configuración pública Firebase desde GC, MC, TL o NT.
    - Guarda solo datos funcionales del Agendador.
    - No guarda tokens de Google, Microsoft ni Telegram.
    - No depende del HTML de otros módulos.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../../google-calendar/js/gc-firebase-config.js
    - ../../microsoft-calendar/js/mc-firebase-config.js
    - ../../telegram/js/tl-firebase-config.js
    - ../../notificaciones-desktop/js/nt-firebase-config.js

  Firestore:
    - Colección: conexiones
    - Documento: agendador
    - Subcolección: items
*/

(function initAgFirebaseAdapter(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Adapters = AG.Adapters || {};

  const FIRESTORE_COLLECTION = "conexiones";
  const FIRESTORE_DOC = "agendador";
  const FIRESTORE_ITEMS_SUBCOLLECTION = "items";
  const FIREBASE_APP_NAME = "AgendaJeffAgendadorLocal";

  let firebaseApp = null;
  let firestoreDb = null;

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function isFirebaseCompatAvailable() {
    return Boolean(
      global.firebase &&
      typeof global.firebase.initializeApp === "function" &&
      typeof global.firebase.firestore === "function"
    );
  }

  function getFirebaseApps() {
    if (!global.firebase || !Array.isArray(global.firebase.apps)) {
      return [];
    }

    return global.firebase.apps;
  }

  function getExistingNamedApp() {
    const apps = getFirebaseApps();

    return apps.find((app) => {
      return app && app.name === FIREBASE_APP_NAME;
    }) || null;
  }

  function getAnyExistingApp() {
    const apps = getFirebaseApps();

    return apps.length ? apps[0] : null;
  }

  function getFirebaseConfig() {
    const candidates = [
      global.AG && global.AG.FirebaseConfig,
      global.GC && global.GC.FirebaseConfig,
      global.MC && global.MC.FirebaseConfig,
      global.TL && global.TL.FirebaseConfig,
      global.NT && global.NT.FirebaseConfig
    ].filter(Boolean);

    const config = candidates.find((candidate) => {
      return candidate &&
        candidate.apiKey &&
        candidate.projectId &&
        candidate.appId;
    });

    if (!config) {
      throw new Error(
        "No encontré configuración Firebase. Carga gc-firebase-config.js, mc-firebase-config.js, tl-firebase-config.js o nt-firebase-config.js."
      );
    }

    return config;
  }

  function initFirebase() {
    if (!isFirebaseCompatAvailable()) {
      throw new Error("Firebase SDK compat no está cargado.");
    }

    if (firebaseApp && firestoreDb) {
      return {
        app: firebaseApp,
        db: firestoreDb
      };
    }

    const existingNamedApp = getExistingNamedApp();

    if (existingNamedApp) {
      firebaseApp = existingNamedApp;
      firestoreDb = firebaseApp.firestore();
      return {
        app: firebaseApp,
        db: firestoreDb
      };
    }

    const existingAnyApp = getAnyExistingApp();

    if (existingAnyApp) {
      firebaseApp = existingAnyApp;
      firestoreDb = global.firebase.firestore(firebaseApp);
      return {
        app: firebaseApp,
        db: firestoreDb
      };
    }

    firebaseApp = global.firebase.initializeApp(
      getFirebaseConfig(),
      FIREBASE_APP_NAME
    );

    firestoreDb = global.firebase.firestore(firebaseApp);

    return {
      app: firebaseApp,
      db: firestoreDb
    };
  }

  function getFirestoreDb() {
    return initFirebase().db;
  }

  function getMainDocumentRef() {
    return getFirestoreDb()
      .collection(FIRESTORE_COLLECTION)
      .doc(FIRESTORE_DOC);
  }

  function createPublicItem(item) {
    const safeItem = item || {};
    const responsible = safeItem.responsible || {};

    return {
      id: normalizeText(safeItem.id),
      type: normalizeText(safeItem.type),
      title: normalizeText(safeItem.title),
      date: normalizeText(safeItem.date),
      time: normalizeText(safeItem.time),
      durationMinutes: Number(safeItem.durationMinutes || CONFIG.DEFAULT_DURATION_MINUTES),
      priority: normalizeText(safeItem.priority),

      responsible: {
        id: normalizeText(responsible.id),
        name: normalizeText(responsible.name),
        email: normalizeText(responsible.email),
        phone: normalizeText(responsible.phone),
        type: normalizeText(responsible.type)
      },

      description: normalizeText(safeItem.description),
      reminders: Array.isArray(safeItem.reminders) ? safeItem.reminders : [],
      channels: Array.isArray(safeItem.channels) ? safeItem.channels : [],
      status: normalizeText(safeItem.status),
      syncStatus: safeItem.syncStatus || {},

      startAt: normalizeText(safeItem.startAt),
      endAt: normalizeText(safeItem.endAt),

      source: CONFIG.SOURCE,
      createdAt: normalizeText(safeItem.createdAt),
      updatedAt: normalizeText(safeItem.updatedAt),
      lastSyncedAt: normalizeText(safeItem.lastSyncedAt)
    };
  }

  async function saveMainStatus(extraData) {
    const ref = getMainDocumentRef();

    const payload = {
      provider: "agendador",
      moduleName: CONFIG.MODULE_NAME,
      source: CONFIG.SOURCE,
      configured: true,
      localItemsCount: AG.Storage.readItems().length,
      responsiblesCount: AG.Storage.readResponsibles().length,
      lastAction: "sync",
      lastSyncAt: new Date().toISOString(),
      ...(extraData || {})
    };

    await ref.set(payload, { merge: true });

    return {
      ok: true,
      firestorePath: `${FIRESTORE_COLLECTION}/${FIRESTORE_DOC}`,
      payload
    };
  }

  async function saveItem(item) {
    const publicItem = createPublicItem(item);
    const itemId = publicItem.id;

    if (!itemId) {
      throw new Error("No se puede guardar en Firebase un registro sin ID.");
    }

    const ref = getMainDocumentRef()
      .collection(FIRESTORE_ITEMS_SUBCOLLECTION)
      .doc(itemId);

    const payload = {
      ...publicItem,
      firebaseSavedAt: new Date().toISOString()
    };

    await ref.set(payload, { merge: true });

    await saveMainStatus({
      lastItemId: itemId,
      lastItemTitle: publicItem.title,
      lastItemType: publicItem.type
    });

    return {
      ok: true,
      firestorePath: `${FIRESTORE_COLLECTION}/${FIRESTORE_DOC}/${FIRESTORE_ITEMS_SUBCOLLECTION}/${itemId}`,
      item: payload
    };
  }

  async function syncItem(item) {
    if (!Array.isArray(item.channels) || !item.channels.includes(CONFIG.CONNECTIONS.FIREBASE)) {
      return {
        ok: true,
        status: "skipped",
        message: "Firebase no está seleccionado para este registro."
      };
    }

    const result = await saveItem(item);

    return {
      ok: true,
      status: "saved",
      message: "Registro guardado en Firebase.",
      data: result
    };
  }

  async function saveError(error, item) {
    const message = error && error.message
      ? error.message
      : String(error || "Error desconocido.");

    const ref = getMainDocumentRef();

    const payload = {
      provider: "agendador",
      moduleName: CONFIG.MODULE_NAME,
      source: CONFIG.SOURCE,
      lastAction: "error",
      lastError: {
        message,
        itemId: item && item.id ? item.id : "",
        at: new Date().toISOString()
      }
    };

    await ref.set(payload, { merge: true });

    return {
      ok: false,
      firestorePath: `${FIRESTORE_COLLECTION}/${FIRESTORE_DOC}`,
      message
    };
  }

  async function testAvailability() {
    try {
      if (!isFirebaseCompatAvailable()) {
        return {
          ok: false,
          status: "missing",
          message: "Firebase SDK compat no está cargado."
        };
      }

      initFirebase();

      await saveMainStatus({
        lastAction: "availability-check"
      });

      return {
        ok: true,
        status: "ready",
        message: "Firebase está listo para guardar registros del Agendador.",
        data: {
          firestorePath: `${FIRESTORE_COLLECTION}/${FIRESTORE_DOC}`
        }
      };
    } catch (error) {
      return {
        ok: false,
        status: "error",
        message: error.message
      };
    }
  }

  AG.Adapters.FirebaseAdapter = {
    isFirebaseCompatAvailable,
    getFirebaseConfig,
    initFirebase,
    getFirestoreDb,
    getMainDocumentRef,
    createPublicItem,
    saveMainStatus,
    saveItem,
    syncItem,
    saveError,
    testAvailability
  };
})(window);