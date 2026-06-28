/*
  Nombre completo: aj-mobile-bridge.js
  Ruta: core/mobile/aj-mobile-bridge.js

  Función:
    - Crear un puente compatible con AgendaJeffElectron cuando la app corre fuera de Electron.
    - Permitir que la versión Android/Capacitor use almacenamiento local del WebView.
    - Mantener la misma interfaz básica usada por Inicio, Agenda, Carga Masiva, Ajustes y Diagnóstico.
*/

(function initAgendaJeffMobileBridge(global) {
  "use strict";

  if (global.AgendaJeffElectron) return;

  const DB_KEY = "agendaJeff.mobile.localdb.v1";
  const SETTINGS_KEY = "agendaJeff.mobile.settings.v1";
  const BACKUP_KEY = "agendaJeff.mobile.backups.v1";

  function now() { return new Date().toISOString(); }

  function result(ok, message, data) {
    return Promise.resolve({ ok: Boolean(ok), message: message || "", data: data || null, checkedAt: now(), source: "mobile-bridge" });
  }

  function emptyDb() {
    return { version: 1, createdAt: now(), updatedAt: now(), items: [], syncQueue: [], deletedItems: [] };
  }

  function readJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    global.localStorage.setItem(key, JSON.stringify(value));
  }

  function readDb() {
    const db = readJson(DB_KEY, null) || emptyDb();
    db.items = Array.isArray(db.items) ? db.items : [];
    db.syncQueue = Array.isArray(db.syncQueue) ? db.syncQueue : [];
    db.deletedItems = Array.isArray(db.deletedItems) ? db.deletedItems : [];
    return db;
  }

  function writeDb(db) {
    db.updatedAt = now();
    writeJson(DB_KEY, db);
    return db;
  }

  function makeId() {
    return `mobile_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function todayIso() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function normalizeItem(item) {
    const data = item && typeof item === "object" ? item : {};
    return {
      ...data,
      idLocal: data.idLocal || makeId(),
      idFirebase: data.idFirebase || "",
      tipo: data.tipo || "evento",
      titulo: data.titulo || "Sin título",
      descripcion: data.descripcion || "",
      fechaInicio: data.fechaInicio || "",
      fechaFin: data.fechaFin || "",
      horaInicio: data.horaInicio || "",
      horaFin: data.horaFin || "",
      todoDia: Boolean(data.todoDia || !data.horaInicio),
      estado: data.estado || "activo",
      estadoSync: data.estadoSync || "pendiente_sincronizar",
      creadoEn: data.creadoEn || now(),
      actualizadoEn: now(),
      canales: data.canales || { escritorio: true, telegram: true, googleCalendar: true },
      recordatorios: data.recordatorios || {
        cincoDiasAntes: true,
        tresDiasAntes: true,
        unDiaAntes: true,
        mismoDia: true,
        usarDiasLaborables: false,
        horasSinHora: ["06:00", "13:00", "17:00"],
        horasPendiente: ["06:00", "17:00"]
      }
    };
  }

  function filterItems(items, filters) {
    const data = filters && typeof filters === "object" ? filters : {};
    const view = data.view || "all";
    const today = todayIso();
    return items.filter(function each(item) {
      if (view === "today") return item.fechaInicio === today;
      if (view === "upcoming") return item.fechaInicio && item.fechaInicio > today && item.estado !== "completado" && item.estado !== "cancelado";
      if (view === "pending") return item.tipo === "pendiente" && item.estado !== "completado" && item.estado !== "cancelado";
      return true;
    });
  }

  async function ensureLocalDatabase() {
    const db = readDb();
    writeDb(db);
    return result(true, "Base móvil verificada.", { mode: "mobile-localstorage", items: db.items.length });
  }

  async function readAgendaData() {
    const db = readDb();
    return result(true, "Base móvil leída.", { data: db });
  }

  async function queryAgendaItems(filters) {
    const db = readDb();
    const items = filterItems(db.items, filters);
    return result(true, "Consulta móvil ejecutada.", { items, total: items.length });
  }

  async function saveAgendaItem(item) {
    const db = readDb();
    const normalized = normalizeItem(item);
    const index = db.items.findIndex(function find(existing) { return existing.idLocal === normalized.idLocal; });
    const action = index >= 0 ? "update" : "create";
    if (index >= 0) db.items[index] = { ...db.items[index], ...normalized };
    else db.items.push(normalized);
    db.syncQueue.push({ id: makeId(), action, idLocal: normalized.idLocal, createdAt: now(), status: "pending" });
    writeDb(db);
    return result(true, "Registro guardado en almacenamiento móvil.", { item: normalized, action });
  }

  async function completeAgendaItem(idLocal) {
    const db = readDb();
    const item = db.items.find(function find(existing) { return existing.idLocal === idLocal; });
    if (!item) return result(false, "Registro no encontrado.", { idLocal });
    item.estado = "completado";
    item.estadoSync = "pendiente_sincronizar";
    item.actualizadoEn = now();
    db.syncQueue.push({ id: makeId(), action: "complete", idLocal, createdAt: now(), status: "pending" });
    writeDb(db);
    return result(true, "Registro completado en móvil.", { item });
  }

  async function removeAgendaItem(idLocal) {
    const db = readDb();
    const before = db.items.length;
    db.items = db.items.filter(function keep(item) { return item.idLocal !== idLocal; });
    db.deletedItems.push({ idLocal, deletedAt: now() });
    db.syncQueue.push({ id: makeId(), action: "delete", idLocal, createdAt: now(), status: "pending" });
    writeDb(db);
    return result(before !== db.items.length, before !== db.items.length ? "Registro eliminado en móvil." : "Registro no encontrado.", { idLocal });
  }

  async function createLocalBackup() {
    const db = readDb();
    const backups = readJson(BACKUP_KEY, []);
    const backup = { id: makeId(), createdAt: now(), data: db };
    backups.push(backup);
    writeJson(BACKUP_KEY, backups.slice(-10));
    return result(true, "Respaldo móvil creado.", { backupId: backup.id, totalBackups: backups.length });
  }

  async function readAgendaSettings() {
    const settings = readJson(SETTINGS_KEY, {});
    return result(true, "Ajustes móviles leídos.", { settings });
  }

  async function saveAgendaSettings(settings) {
    writeJson(SETTINGS_KEY, settings || {});
    return result(true, "Ajustes móviles guardados.", { settings: settings || {} });
  }

  async function getEnvironment() {
    return result(true, "Entorno móvil/web activo.", { app: { name: "AgendaJeff", version: "0.0.1" }, mode: "mobile-webview", platform: "android-web" });
  }

  async function sendDesktopNotification(payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    if (!global.Notification) return result(false, "Notificaciones Web no disponibles.", { payload: data });
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission !== "granted") return result(false, "Permiso de notificaciones no concedido.", { payload: data });
    new Notification(data.title || "AgendaJeff", { body: data.body || data.message || "Recordatorio" });
    return result(true, "Notificación Web enviada.", { payload: data });
  }

  async function checkDesktopNotifications() {
    return result(Boolean(global.Notification), global.Notification ? "Notificaciones Web disponibles." : "Notificaciones Web no disponibles.", { permission: global.Notification ? Notification.permission : "unsupported" });
  }

  const bridge = Object.freeze({
    isElectron: false,
    isMobileBridge: true,
    platform: "android-web",
    versions: Object.freeze({ mobileBridge: "1.0.0" }),
    ping: function ping() { return result(true, "Puente móvil responde.", { mode: "mobile" }); },
    getEnvironment,
    openExternal: function openExternal(url) { global.open(url, "_blank"); return result(true, "URL abierta.", { url }); },
    sendDesktopNotification,
    checkDesktopNotifications,
    ensureLocalDatabase,
    readAgendaData,
    queryAgendaItems,
    saveAgendaItem,
    completeAgendaItem,
    removeAgendaItem,
    createLocalBackup,
    readAgendaSettings,
    saveAgendaSettings,
    getBackgroundStatus: function getBackgroundStatus() { return result(true, "Segundo plano móvil pendiente de capa nativa.", { running: false, paused: false }); },
    startBackground: function startBackground() { return result(true, "Segundo plano móvil pendiente de capa nativa.", { running: false }); },
    pauseBackground: function pauseBackground() { return result(true, "Segundo plano móvil pausado visualmente.", { paused: true }); },
    resumeBackground: function resumeBackground() { return result(true, "Segundo plano móvil reanudado visualmente.", { paused: false }); },
    checkBackgroundNow: function checkBackgroundNow() { return result(true, "Revisión móvil manual ejecutada visualmente.", {}); }
  });

  global.AgendaJeffElectron = bridge;
})(window);
