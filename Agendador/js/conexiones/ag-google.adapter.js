/*
  Nombre completo: ag-google.adapter.js
  Ruta: Agendador/js/conexiones/ag-google.adapter.js

  Función:
    - Adaptador del Agendador para Google Calendar.
    - Recibe un registro local del Agendador.
    - Lo convierte al formato de Google Calendar.
    - Usa el módulo Google Calendar existente si está cargado en la página.
    - No depende del HTML de Google Calendar.
    - No presiona botones ni usa IDs de gc-index.html.

  Se conecta con:
    - ../ag-config.js
    - ../ag-storage.js
    - ../servicios/ag-reminder.service.js
    - ../../google-calendar/js/gc-config.js
    - ../../google-calendar/js/gc-storage.js
    - ../../google-calendar/js/gc-token.service.js
    - ../../google-calendar/js/gc-google-api.js

  Requisitos para funcionar:
    - Cargar antes los scripts necesarios del módulo Google Calendar.
    - Tener credenciales Google guardadas desde google-calendar/gc-index.html.
    - Tener una autorización/token válido o permitir que Google pida autorización.
*/

(function initAgGoogleAdapter(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Adapters = AG.Adapters || {};

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function isGoogleModuleAvailable() {
    return Boolean(
      global.GC &&
      global.GC.Storage &&
      global.GC.TokenService &&
      global.GC.GoogleApi
    );
  }

  function readGoogleConnection() {
    if (!isGoogleModuleAvailable()) {
      return null;
    }

    if (typeof global.GC.Storage.readConnection !== "function") {
      return null;
    }

    return global.GC.Storage.readConnection();
  }

  function hasValidConnection(connection) {
    return Boolean(
      connection &&
      normalizeText(connection.clientId) &&
      normalizeText(connection.calendarId)
    );
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatGoogleDateTime(date) {
    if (!(date instanceof Date)) {
      return "";
    }

    return [
      date.getFullYear(),
      pad2(date.getMonth() + 1),
      pad2(date.getDate())
    ].join("-") + "T" + [
      pad2(date.getHours()),
      pad2(date.getMinutes()),
      pad2(date.getSeconds())
    ].join(":");
  }

  function getBrowserTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ||
        CONFIG.DEFAULT_TIMEZONE;
    } catch (error) {
      return CONFIG.DEFAULT_TIMEZONE;
    }
  }

  function parseItemStartDate(item) {
    const safeItem = item || {};
    const date = normalizeText(safeItem.date);
    const time = normalizeText(safeItem.time) || "08:00";

    if (!date) {
      return null;
    }

    const parsedDate = new Date(`${date}T${time}:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  function addMinutes(date, minutes) {
    const safeDate = new Date(date.getTime());
    safeDate.setMinutes(safeDate.getMinutes() + Number(minutes || 30));
    return safeDate;
  }

  function getTypeLabel(itemType) {
    return CONFIG.TYPE_LABELS[itemType] || "Registro";
  }

  function createDescription(item) {
    const safeItem = item || {};
    const responsible = safeItem.responsible || CONFIG.DEFAULT_RESPONSIBLE;
    const reminders = AG.ReminderService
      ? AG.ReminderService.buildReminderSchedule(safeItem)
      : [];

    return [
      normalizeText(safeItem.description) || "Sin descripción.",
      "",
      "Creado desde AgendaJeff - Agendador.",
      `Tipo: ${getTypeLabel(safeItem.type)}`,
      `Responsable: ${responsible.name || "Yo"}`,
      responsible.email ? `Correo responsable: ${responsible.email}` : "",
      reminders.length ? `Recordatorios configurados: ${reminders.map((item) => item.label).join(", ")}` : "",
      `ID local Agendador: ${safeItem.id || ""}`
    ].filter(Boolean).join("\n");
  }

  function toGoogleEvent(item) {
    const safeItem = item || {};
    const startDate = parseItemStartDate(safeItem);

    if (!startDate) {
      throw new Error("Google Calendar no puede crear el evento porque falta fecha válida.");
    }

    const durationMinutes = Number(safeItem.durationMinutes || CONFIG.DEFAULT_DURATION_MINUTES);
    const endDate = addMinutes(startDate, durationMinutes);
    const timeZone = getBrowserTimeZone();

    if (safeItem.type === CONFIG.TYPES.PENDING && !normalizeText(safeItem.time)) {
      return {
        summary: `[Pendiente] ${safeItem.title || "Sin título"}`,
        description: createDescription(safeItem),
        start: {
          date: safeItem.date
        },
        end: {
          date: safeItem.date
        },
        reminders: {
          useDefault: true
        }
      };
    }

    return {
      summary: `[${getTypeLabel(safeItem.type)}] ${safeItem.title || "Sin título"}`,
      description: createDescription(safeItem),
      start: {
        dateTime: formatGoogleDateTime(startDate),
        timeZone
      },
      end: {
        dateTime: formatGoogleDateTime(endDate),
        timeZone
      },
      reminders: {
        useDefault: true
      }
    };
  }

  function normalizeGoogleCreatedEvent(event) {
    const safeEvent = event || {};
    const start = safeEvent.start || {};
    const end = safeEvent.end || {};

    return {
      id: normalizeText(safeEvent.id),
      title: normalizeText(safeEvent.summary),
      status: normalizeText(safeEvent.status),
      htmlLink: normalizeText(safeEvent.htmlLink),
      start: normalizeText(start.dateTime) || normalizeText(start.date),
      end: normalizeText(end.dateTime) || normalizeText(end.date),
      created: normalizeText(safeEvent.created),
      updated: normalizeText(safeEvent.updated)
    };
  }

  async function syncItem(item) {
    if (!Array.isArray(item.channels) || !item.channels.includes(CONFIG.CONNECTIONS.GOOGLE)) {
      return {
        ok: true,
        status: "skipped",
        message: "Google Calendar no está seleccionado para este registro."
      };
    }

    if (!isGoogleModuleAvailable()) {
      return {
        ok: false,
        status: "missingAdapterDependency",
        message: "El módulo Google Calendar no está cargado en esta pantalla."
      };
    }

    const connection = readGoogleConnection();

    if (!hasValidConnection(connection)) {
      return {
        ok: false,
        status: "notConfigured",
        message: "Google Calendar no tiene configuración guardada."
      };
    }

    const token = await global.GC.TokenService.ensureToken(connection);
    const googleEvent = toGoogleEvent(item);

    const createdEvent = await global.GC.GoogleApi.insertEvent({
      accessToken: token.accessToken,
      calendarId: connection.calendarId,
      event: googleEvent
    });

    const normalizedEvent = global.GC.EventService &&
      typeof global.GC.EventService.normalizeGoogleEvent === "function"
      ? global.GC.EventService.normalizeGoogleEvent(createdEvent)
      : normalizeGoogleCreatedEvent(createdEvent);

    return {
      ok: true,
      status: "created",
      message: "Evento creado en Google Calendar.",
      data: {
        calendarId: connection.calendarId,
        googleEvent: normalizedEvent
      }
    };
  }

  async function testAvailability() {
    if (!isGoogleModuleAvailable()) {
      return {
        ok: false,
        status: "missing",
        message: "Google Calendar no está cargado."
      };
    }

    const connection = readGoogleConnection();

    if (!hasValidConnection(connection)) {
      return {
        ok: false,
        status: "notConfigured",
        message: "Google Calendar no está configurado."
      };
    }

    return {
      ok: true,
      status: "ready",
      message: "Google Calendar está listo para sincronizar.",
      data: {
        calendarId: connection.calendarId,
        activeCredentialType: connection.activeCredentialType || "",
        runtimeMode: connection.runtimeMode || ""
      }
    };
  }

  AG.Adapters.GoogleAdapter = {
    isGoogleModuleAvailable,
    readGoogleConnection,
    toGoogleEvent,
    syncItem,
    testAvailability
  };
})(window);