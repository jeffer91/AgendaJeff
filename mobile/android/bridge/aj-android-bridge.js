/*
  Nombre completo: aj-android-bridge.js
  Ruta: mobile/android/bridge/aj-android-bridge.js

  Función:
    - Puente local para Android/WebView cuando no existe Electron.
    - Permite que Inicio, Agenda, Carga Masiva, Ajustes y Diagnóstico funcionen con localStorage.
    - No reemplaza la sincronización completa; prepara el APK manual inicial.
*/

(function initAgendaJeffAndroidBridge(global) {
  "use strict";

  if (global.AgendaJeffElectron) return;

  const STORAGE_KEY = "agendaJeff.android.localdb.v1";
  const SETTINGS_KEY = "agendaJeff.android.settings.v1";

  function now() {
    return new Date().toISOString();
  }

  function todayIso() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function createId() {
    return `and_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function baseData() {
    return {
      version: 1,
      createdAt: now(),
      updatedAt: now(),
      items: [],
      syncQueue: [],
      backups: [],
      platform: "android-webview"
    };
  }

  function result(ok, message, data) {
    return Promise.resolve({
      ok: Boolean(ok),
      source: "android-bridge",
      message: message || "",
      data: data || null,
      checkedAt: now()
    });
  }

  function readDataSync() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const data = baseData();
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
      const parsed = JSON.parse(raw);
      parsed.items = Array.isArray(parsed.items) ? parsed.items : [];
      parsed.syncQueue = Array.isArray(parsed.syncQueue) ? parsed.syncQueue : [];
      parsed.backups = Array.isArray(parsed.backups) ? parsed.backups : [];
      return parsed;
    } catch (error) {
      const data = baseData();
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  }

  function saveDataSync(data) {
    const next = data && typeof data === "object" ? data : baseData();
    next.updatedAt = now();
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function readSettingsSync() {
    try {
      const raw = global.localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function filterItems(items, filters) {
    const query = filters && typeof filters === "object" ? filters : {};
    const view = query.view || "all";
    const today = todayIso();
    const list = Array.isArray(items) ? items.slice() : [];

    if (view === "today") return list.filter((item) => item.fechaInicio === today);
    if (view === "upcoming") return list.filter((item) => item.fechaInicio && item.fechaInicio > today && item.estado !== "completado" && item.estado !== "cancelado");
    if (view === "pending") return list.filter((item) => item.tipo === "pendiente" && item.estado !== "completado" && item.estado !== "cancelado");
    return list;
  }

  function normalizeItem(input) {
    const item = input && typeof input === "object" ? { ...input } : {};
    item.idLocal = item.idLocal || createId();
    item.tipo = item.tipo || "evento";
    item.titulo = item.titulo || "Sin título";
    item.descripcion = item.descripcion || "";
    item.estado = item.estado || "activo";
    item.estadoSync = item.estadoSync || "pendiente_sincronizar";
    item.canales = item.canales || { escritorio: true, telegram: true, googleCalendar: true };
    item.recordatorios = item.recordatorios || {
      cincoDiasAntes: true,
      tresDiasAntes: true,
      unDiaAntes: true,
      mismoDia: true,
      usarDiasLaborables: false,
      horasSinHora: ["06:00", "13:00", "17:00"],
      horasPendiente: ["06:00", "17:00"]
    };
    item.auditoria = item.auditoria || {};
    item.auditoria.actualizadoEn = now();
    item.auditoria.plataforma = "android-webview";
    if (!item.auditoria.creadoEn) item.auditoria.creadoEn = now();
    return item;
  }

  const bridge = Object.freeze({
    isElectron: false,
    isAndroidBridge: true,
    platform: "android-webview",
    versions: Object.freeze({ node: "", chrome: "webview", electron: "" }),

    ping() {
      return result(true, "Puente Android local activo.", { platform: "android-webview" });
    },

    getEnvironment() {
      return result(true, "Entorno Android/WebView activo.", {
        mode: "android-webview",
        app: { name: "AgendaJeff", version: "0.0.1" },
        platform: "android"
      });
    },

    openExternal(url) {
      if (url) global.open(url, "_blank");
      return result(true, "URL abierta desde Android/WebView.", { url });
    },

    sendDesktopNotification(payload) {
      const data = payload || {};
      if (global.Notification && Notification.permission === "granted") {
        try { new Notification(data.title || "AgendaJeff", { body: data.body || data.message || "" }); } catch (error) { /* no-op */ }
      }
      return result(true, "Notificación Android/WebView solicitada.", data);
    },

    checkDesktopNotifications() {
      return result(true, "Notificaciones web disponibles según permisos del WebView.", { supported: Boolean(global.Notification) });
    },

    ensureLocalDatabase() {
      const data = readDataSync();
      saveDataSync(data);
      return result(true, "Base local Android verificada.", { items: data.items.length });
    },

    readAgendaData() {
      return result(true, "Base local Android leída.", { data: readDataSync() });
    },

    queryAgendaItems(filters) {
      const data = readDataSync();
      return result(true, "Registros Android consultados.", { items: filterItems(data.items, filters) });
    },

    saveAgendaItem(input) {
      const data = readDataSync();
      const item = normalizeItem(input);
      const index = data.items.findIndex((existing) => existing.idLocal === item.idLocal);
      const action = index >= 0 ? "update" : "create";
      if (index >= 0) data.items[index] = { ...data.items[index], ...item };
      else data.items.push(item);
      data.syncQueue.push({ id: createId(), itemId: item.idLocal, action, status: "pending", createdAt: now() });
      saveDataSync(data);
      return result(true, "Registro guardado en Android local.", { item, action });
    },

    completeAgendaItem(idLocal) {
      const data = readDataSync();
      const item = data.items.find((existing) => existing.idLocal === idLocal);
      if (!item) return result(false, "Registro no encontrado.", { idLocal });
      item.estado = "completado";
      item.estadoSync = "pendiente_sincronizar";
      item.auditoria = item.auditoria || {};
      item.auditoria.actualizadoEn = now();
      data.syncQueue.push({ id: createId(), itemId: idLocal, action: "complete", status: "pending", createdAt: now() });
      saveDataSync(data);
      return result(true, "Registro completado en Android local.", { item });
    },

    removeAgendaItem(idLocal) {
      const data = readDataSync();
      const before = data.items.length;
      data.items = data.items.filter((item) => item.idLocal !== idLocal);
      data.syncQueue.push({ id: createId(), itemId: idLocal, action: "delete", status: "pending", createdAt: now() });
      saveDataSync(data);
      return result(before !== data.items.length, "Registro eliminado en Android local.", { idLocal });
    },

    createLocalBackup() {
      const data = readDataSync();
      data.backups.push({ id: createId(), createdAt: now(), snapshot: JSON.stringify(data) });
      saveDataSync(data);
      return result(true, "Respaldo Android local creado.", { backups: data.backups.length });
    },

    readAgendaSettings() {
      return result(true, "Ajustes Android leídos.", { settings: readSettingsSync() });
    },

    saveAgendaSettings(settings) {
      const next = settings && typeof settings === "object" ? settings : {};
      global.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return result(true, "Ajustes Android guardados.", { settings: next });
    },

    getBackgroundStatus() {
      return result(true, "Segundo plano Android preparado para fase nativa posterior.", { running: false, paused: false, platform: "android-webview" });
    },
    startBackground() { return bridge.getBackgroundStatus(); },
    pauseBackground() { return bridge.getBackgroundStatus(); },
    resumeBackground() { return bridge.getBackgroundStatus(); },
    checkBackgroundNow() { return bridge.getBackgroundStatus(); },

    startGoogleCalendarReturn() { return result(false, "OAuth móvil se implementará con flujo Android nativo posterior."); },
    getGoogleCalendarReturn() { return result(false, "OAuth móvil pendiente."); },
    clearGoogleCalendarReturn() { return result(true, "OAuth móvil limpio."); },
    stopGoogleCalendarReturn() { return result(true, "OAuth móvil detenido."); }
  });

  global.AgendaJeffElectron = bridge;
})(window);
