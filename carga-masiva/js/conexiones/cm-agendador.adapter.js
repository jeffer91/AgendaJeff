/*
  Nombre completo: cm-agendador.adapter.js
  Ruta: carga-masiva/js/conexiones/cm-agendador.adapter.js

  Función:
    - Conectar Carga Masiva con el Agendador.
    - Convertir eventos confirmados de CM al formato compatible con AG.
    - Guardar primero en local mediante AG.Storage.saveItem.
    - Sincronizar canales externos sin enviar Telegram uno por uno en cargas masivas.
    - Enviar un solo resumen de lote por Telegram al finalizar la carga.
*/

(function initCmAgendadorAdapter(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function getAG() {
    return global.AG || null;
  }

  function isAgendadorAvailable() {
    const AG = getAG();

    return Boolean(
      AG &&
      AG.Storage &&
      typeof AG.Storage.saveItem === "function"
    );
  }

  function ensureAgendadorAvailable() {
    if (!isAgendadorAvailable()) {
      throw new Error("El Agendador no está cargado. Revisa las dependencias mínimas de Agendador en Carga Masiva.");
    }

    return getAG();
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function toAGType(cmType) {
    const type = normalizeText(cmType);

    if (type === "pending") return "pending";
    if (type === "reminder") return "reminder";

    return "event";
  }

  function toAGPriority(priority) {
    const value = normalizeText(priority);

    if (["low", "normal", "high", "urgent"].includes(value)) {
      return value;
    }

    return "normal";
  }

  function mapChannels(channels) {
    const safeChannels = channels || {};

    return Object.keys(CONFIG.CHANNELS)
      .map((key) => CONFIG.CHANNELS[key])
      .filter((channel) => {
        if (channel === CONFIG.CHANNELS.LOCAL) {
          return true;
        }

        return safeChannels[channel] !== false;
      });
  }

  function removeTelegramChannel(channels) {
    return (Array.isArray(channels) ? channels : [])
      .filter((channel) => channel !== CONFIG.CHANNELS.TELEGRAM);
  }

  function calculateDurationMinutes(event) {
    const safeEvent = event || {};

    if (safeEvent.allDay) {
      return 60;
    }

    if (!safeEvent.startTime || !safeEvent.endTime) {
      return 30;
    }

    const startParts = safeEvent.startTime.split(":").map(Number);
    const endParts = safeEvent.endTime.split(":").map(Number);

    if (startParts.length !== 2 || endParts.length !== 2) {
      return 30;
    }

    const start = (startParts[0] * 60) + startParts[1];
    const end = (endParts[0] * 60) + endParts[1];
    const duration = end - start;

    if (!Number.isFinite(duration) || duration <= 0) {
      return 30;
    }

    return Math.max(15, Math.min(duration, 1440));
  }

  function getAGDate(event) {
    return normalizeText(event && event.startDate);
  }

  function getAGTime(event) {
    const safeEvent = event || {};

    if (safeEvent.startTime) {
      return safeEvent.startTime;
    }

    if (safeEvent.allDay) {
      return "06:00";
    }

    return "09:00";
  }

  function mapReminderKeys(event) {
    const safeEvent = event || {};

    if (Array.isArray(safeEvent.reminders) && safeEvent.reminders.length) {
      const valid = safeEvent.reminders
        .map((reminder) => normalizeText(reminder.key || reminder.code || reminder))
        .filter((key) => ["5d", "3d", "2d", "1d", "0d", "30m"].includes(key));

      if (valid.length) {
        return Array.from(new Set(valid));
      }
    }

    if (safeEvent.type === CONFIG.EVENT_TYPES.DEFENSE) {
      return ["2d", "1d", "0d"];
    }

    if (safeEvent.allDay) {
      return ["0d"];
    }

    return ["5d", "3d", "1d", "0d"];
  }

  function createSyncStatus(channels) {
    const status = {};

    channels.forEach((channel) => {
      if (channel === CONFIG.CHANNELS.LOCAL) {
        status[channel] = {
          ok: true,
          status: "ok",
          message: "Guardado localmente desde carga masiva.",
          updatedAt: CM.nowISO()
        };
        return;
      }

      status[channel] = {
        ok: false,
        status: "pending",
        message: "Pendiente de sincronización.",
        updatedAt: ""
      };
    });

    return status;
  }

  function findResponsibleByName(name) {
    const AG = getAG();
    const safeName = normalizeText(name);

    if (!AG || !safeName) {
      return null;
    }

    if (AG.ResponsibleService && typeof AG.ResponsibleService.findByName === "function") {
      const found = AG.ResponsibleService.findByName(safeName);
      if (found) return found;
    }

    if (AG.Storage && typeof AG.Storage.readResponsibles === "function") {
      const responsibles = AG.Storage.readResponsibles();
      const normalized = safeName.toLowerCase();

      return responsibles.find((responsible) => {
        return normalizeText(responsible.name).toLowerCase() === normalized;
      }) || null;
    }

    return null;
  }

  function createResponsibleIfNeeded(name) {
    const AG = getAG();
    const safeName = normalizeText(name);

    if (!AG) {
      return null;
    }

    if (!safeName) {
      return AG.CONFIG && AG.CONFIG.DEFAULT_RESPONSIBLE
        ? AG.CONFIG.DEFAULT_RESPONSIBLE
        : { id: "default", name: "Titulación", email: "", phone: "", type: "internal" };
    }

    const existing = findResponsibleByName(safeName);
    if (existing) return existing;

    const input = { name: safeName, email: "", phone: "" };

    try {
      if (AG.ResponsibleService && typeof AG.ResponsibleService.createResponsible === "function") {
        return AG.ResponsibleService.createResponsible(input);
      }

      if (AG.Storage && typeof AG.Storage.createResponsible === "function") {
        return AG.Storage.createResponsible(input);
      }
    } catch (error) {
      console.warn("[CM AgendadorAdapter] No se pudo crear responsable:", error);
    }

    return {
      id: `cm-responsible-${safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: safeName,
      email: "",
      phone: "",
      type: "external"
    };
  }

  function buildDescription(event) {
    const safeEvent = event || {};
    const parts = [];

    if (safeEvent.description) parts.push(safeEvent.description);

    if (safeEvent.type === CONFIG.EVENT_TYPES.DEFENSE) {
      if (safeEvent.studentName) parts.push(`Estudiante: ${safeEvent.studentName}`);
      if (safeEvent.idNumber) parts.push(`Cédula: ${safeEvent.idNumber}`);
      if (safeEvent.career) parts.push(`Carrera: ${safeEvent.career}`);
      if (safeEvent.tribunal1) parts.push(`Tribunal 1: ${safeEvent.tribunal1}`);
      if (safeEvent.tribunal2) parts.push(`Tribunal 2: ${safeEvent.tribunal2}`);
    }

    if (safeEvent.phase) parts.push(`Fase: ${safeEvent.phase}`);
    if (safeEvent.period) parts.push(`Periodo: ${safeEvent.period}`);

    if (safeEvent.endDate && safeEvent.endDate !== safeEvent.startDate) {
      parts.push(`Rango de fechas: ${safeEvent.startDate} a ${safeEvent.endDate}`);
    }

    if (safeEvent.allDay) {
      parts.push("Evento de todo el día. Avisos sugeridos: 06:00, 09:00, 13:00 y 17:00.");
    }

    parts.push("Origen: Carga masiva");
    parts.push(`Lote: ${safeEvent.batchId || "sin lote"}`);

    return parts.filter(Boolean).join("\n");
  }

  function createAGFormData(event) {
    const safeEvent = event || {};

    return {
      type: toAGType(safeEvent.type),
      title: normalizeText(safeEvent.title) || "Evento de carga masiva",
      date: getAGDate(safeEvent),
      time: getAGTime(safeEvent),
      durationMinutes: calculateDurationMinutes(safeEvent),
      priority: toAGPriority(safeEvent.priority),
      description: buildDescription(safeEvent),
      reminders: mapReminderKeys(safeEvent),
      channels: mapChannels(safeEvent.channels)
    };
  }

  function createManualAGItem(event, responsible) {
    const AG = ensureAgendadorAvailable();
    const formData = createAGFormData(event);
    const channels = formData.channels;

    const id = AG.Storage && typeof AG.Storage.createId === "function"
      ? AG.Storage.createId("ag-item")
      : CM.createId("ag-item");

    const now = AG.Storage && typeof AG.Storage.nowIso === "function"
      ? AG.Storage.nowIso()
      : CM.nowISO();

    return {
      id,
      type: formData.type,
      title: formData.title,
      date: formData.date,
      time: formData.time,
      durationMinutes: formData.durationMinutes,
      priority: formData.priority,
      responsible,
      description: formData.description,
      reminders: formData.reminders,
      channels,
      status: AG.CONFIG && AG.CONFIG.STATUS ? AG.CONFIG.STATUS.ACTIVE : "active",
      syncStatus: createSyncStatus(channels),
      startAt: `${formData.date}T${formData.time}:00`,
      endAt: "",
      source: "cargaMasiva",
      origin: "cargaMasiva",
      createdAt: now,
      updatedAt: now,
      cm: {
        batchId: event.batchId || "",
        cmEventId: event.id || "",
        realType: event.type || "",
        allDay: Boolean(event.allDay),
        startDate: event.startDate || "",
        endDate: event.endDate || event.startDate || "",
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        location: event.location || "",
        reminders: event.reminders || [],
        sourceMeta: event.sourceMeta || {},
        studentName: event.studentName || "",
        idNumber: event.idNumber || "",
        career: event.career || "",
        tribunal1: event.tribunal1 || "",
        tribunal2: event.tribunal2 || "",
        suppressIndividualTelegram: true
      }
    };
  }

  function createAGItem(event) {
    const AG = ensureAgendadorAvailable();
    const responsible = createResponsibleIfNeeded(event.responsible || "Titulación");
    const formData = createAGFormData(event);

    let agItem = null;

    if (AG.EventService && typeof AG.EventService.createItem === "function") {
      try {
        agItem = AG.EventService.createItem(formData, responsible);
      } catch (error) {
        console.warn("[CM AgendadorAdapter] createItem falló, se usará item manual:", error);
      }
    }

    if (!agItem) {
      agItem = createManualAGItem(event, responsible);
    }

    return {
      ...agItem,
      description: formData.description,
      source: "cargaMasiva",
      origin: "cargaMasiva",
      cm: {
        ...(agItem.cm || {}),
        batchId: event.batchId || "",
        cmEventId: event.id || "",
        realType: event.type || "",
        allDay: Boolean(event.allDay),
        startDate: event.startDate || "",
        endDate: event.endDate || event.startDate || "",
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        location: event.location || "",
        reminders: event.reminders || [],
        sourceMeta: event.sourceMeta || {},
        studentName: event.studentName || "",
        idNumber: event.idNumber || "",
        career: event.career || "",
        tribunal1: event.tribunal1 || "",
        tribunal2: event.tribunal2 || "",
        suppressIndividualTelegram: true
      }
    };
  }

  function saveLocalItem(agItem) {
    const AG = ensureAgendadorAvailable();

    if (!AG.Storage || typeof AG.Storage.saveItem !== "function") {
      throw new Error("AG.Storage.saveItem no está disponible.");
    }

    return AG.Storage.saveItem(agItem);
  }

  async function syncItem(savedItem, options) {
    const AG = ensureAgendadorAvailable();
    const safeOptions = options || {};

    if (!AG.SyncService || typeof AG.SyncService.syncItem !== "function") {
      return {
        ok: false,
        skipped: true,
        message: "AG.SyncService.syncItem no está disponible.",
        itemId: savedItem.id
      };
    }

    try {
      const itemForSync = safeOptions.suppressIndividualTelegram
        ? {
            ...savedItem,
            channels: removeTelegramChannel(savedItem.channels)
          }
        : savedItem;

      return await AG.SyncService.syncItem(itemForSync);
    } catch (error) {
      return {
        ok: false,
        skipped: false,
        message: error.message,
        itemId: savedItem.id
      };
    }
  }

  async function importOneEvent(event, options) {
    const agItem = createAGItem(event);
    const savedItem = saveLocalItem(agItem);
    const syncResult = await syncItem(savedItem, options);

    return {
      ok: true,
      cmEventId: event.id,
      agItemId: savedItem.id,
      title: savedItem.title,
      local: {
        ok: true,
        message: "Guardado localmente."
      },
      sync: syncResult,
      savedItem
    };
  }

  async function sendBulkTelegramSummary(batch, events, results) {
    const AG = ensureAgendadorAvailable();
    const success = results.filter((result) => result.ok);
    const savedItems = success.map((result) => result.savedItem).filter(Boolean);
    const failed = results.filter((result) => !result.ok);

    if (!AG.Adapters || !AG.Adapters.TelegramAdapter || typeof AG.Adapters.TelegramAdapter.syncBulkImportSummary !== "function") {
      return {
        ok: false,
        skipped: true,
        message: "TelegramAdapter no tiene resumen de carga masiva disponible."
      };
    }

    try {
      return await AG.Adapters.TelegramAdapter.syncBulkImportSummary({
        batch,
        events,
        results,
        savedItems,
        total: events.length,
        saved: savedItems.length,
        failed: failed.length
      });
    } catch (error) {
      return {
        ok: false,
        skipped: false,
        message: error.message
      };
    }
  }

  async function syncBackgroundReminders() {
    const AG = ensureAgendadorAvailable();

    if (AG.Storage && typeof AG.Storage.syncBackgroundNow === "function") {
      try {
        return await AG.Storage.syncBackgroundNow();
      } catch (error) {
        return {
          ok: false,
          message: error.message
        };
      }
    }

    return {
      ok: false,
      skipped: true,
      message: "AG.Storage.syncBackgroundNow no está disponible."
    };
  }

  async function importEvents(payload) {
    const safePayload = payload || {};
    const batch = safePayload.batch || {};
    const events = Array.isArray(safePayload.events) ? safePayload.events : [];

    ensureAgendadorAvailable();

    if (!batch.id) {
      throw new Error("Falta el ID del lote para importar al Agendador.");
    }

    if (!events.length) {
      throw new Error("No hay eventos para importar al Agendador.");
    }

    const results = [];

    for (const event of events) {
      try {
        const result = await importOneEvent({
          ...event,
          batchId: event.batchId || batch.id
        }, {
          suppressIndividualTelegram: true
        });

        results.push(result);
      } catch (error) {
        results.push({
          ok: false,
          cmEventId: event.id,
          title: event.title || "Sin título",
          message: error.message
        });
      }
    }

    const success = results.filter((result) => result.ok);
    const failed = results.filter((result) => !result.ok);
    const telegramSummary = await sendBulkTelegramSummary(batch, events, results);
    const backgroundSync = await syncBackgroundReminders();

    return {
      ok: failed.length === 0,
      batchId: batch.id,
      total: events.length,
      saved: success.length,
      failed: failed.length,
      results,
      savedItems: success.map((result) => result.savedItem).filter(Boolean),
      telegramSummary,
      backgroundSync,
      importedAt: CM.nowISO()
    };
  }

  CM.AgendadorAdapter = {
    getAG,
    isAgendadorAvailable,
    ensureAgendadorAvailable,

    toAGType,
    toAGPriority,
    mapChannels,
    calculateDurationMinutes,
    getAGDate,
    getAGTime,
    mapReminderKeys,

    findResponsibleByName,
    createResponsibleIfNeeded,

    buildDescription,
    createAGFormData,
    createManualAGItem,
    createAGItem,

    saveLocalItem,
    syncItem,
    sendBulkTelegramSummary,
    syncBackgroundReminders,
    importOneEvent,
    importEvents
  };
})(window);
