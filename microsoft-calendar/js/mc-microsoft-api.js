/*
  Nombre completo: mc-microsoft-api.js
  Ruta: microsoft-calendar/js/mc-microsoft-api.js

  Función:
    - Centralizar llamadas reales a Microsoft Graph.
    - Obtener perfil de la cuenta Microsoft conectada.
    - Leer calendarios disponibles.
    - Leer próximos eventos.
    - Crear eventos solo cuando el origen autorizado sea Agendador o Carga Masiva.
    - Normalizar errores de Microsoft Graph.
*/

(function initMcMicrosoftApi(global) {
  "use strict";

  const MC = global.MC = global.MC || {};
  const CONFIG = MC.CONFIG;
  const Utils = MC.Utils;

  const ALLOWED_CREATE_SOURCES = ["agendador", "cargaMasiva", "agendador-sync", "carga-masiva"];

  function encodePathSegment(value) {
    return encodeURIComponent(Utils.cleanString(value));
  }

  function assertAuthorizedCreateSource(source) {
    const cleanSource = Utils.cleanString(source);

    if (!ALLOWED_CREATE_SOURCES.includes(cleanSource)) {
      throw new Error(
        "Creación bloqueada: Microsoft Calendar solo puede crear eventos enviados desde Agendador o Carga Masiva."
      );
    }

    return cleanSource;
  }

  function createGraphUrl(path, query) {
    const cleanPath = String(path || "").startsWith("/")
      ? String(path || "")
      : `/${String(path || "")}`;

    const url = new URL(`${CONFIG.GRAPH_BASE_URL}${cleanPath}`);

    if (query && typeof query === "object") {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          return;
        }

        url.searchParams.set(key, String(value));
      });
    }

    return url.toString();
  }

  function getBearerHeader(accessToken) {
    const token = Utils.cleanString(accessToken);

    if (!token) {
      throw new Error("No hay access token activo. Primero conecta la cuenta Microsoft.");
    }

    return `Bearer ${token}`;
  }

  async function parseGraphResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (response.status === 204) {
      return null;
    }

    if (isJson) {
      return response.json();
    }

    return response.text();
  }

  function getGraphErrorMessage(payload, fallbackMessage) {
    if (!payload) {
      return fallbackMessage;
    }

    if (typeof payload === "string") {
      return payload || fallbackMessage;
    }

    if (payload.error && payload.error.message) {
      return payload.error.message;
    }

    if (payload.message) {
      return payload.message;
    }

    return fallbackMessage;
  }

  async function graphRequest(options) {
    const safeOptions = options || {};
    const method = Utils.cleanString(safeOptions.method || "GET").toUpperCase();
    const accessToken = Utils.cleanString(safeOptions.accessToken);
    const path = Utils.cleanString(safeOptions.path);
    const query = safeOptions.query || null;
    const body = safeOptions.body;

    if (!path) {
      throw new Error("Falta la ruta de Microsoft Graph.");
    }

    const headers = {
      Authorization: getBearerHeader(accessToken),
      Accept: "application/json"
    };

    const requestOptions = {
      method,
      headers
    };

    if (body !== undefined && body !== null) {
      headers["Content-Type"] = "application/json";
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(createGraphUrl(path, query), requestOptions);
    const payload = await parseGraphResponse(response);

    if (!response.ok) {
      const message = getGraphErrorMessage(
        payload,
        `Microsoft Graph respondió con error ${response.status}.`
      );

      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  async function getMe(accessToken) {
    const payload = await graphRequest({
      method: "GET",
      accessToken,
      path: "/me",
      query: {
        "$select": "id,displayName,mail,userPrincipalName"
      }
    });

    return {
      id: Utils.cleanString(payload.id),
      displayName: Utils.cleanString(payload.displayName),
      mail: Utils.cleanString(payload.mail),
      userPrincipalName: Utils.cleanString(payload.userPrincipalName),
      email: Utils.cleanString(payload.mail || payload.userPrincipalName)
    };
  }

  async function listCalendars(options) {
    const safeOptions = options || {};
    const accessToken = safeOptions.accessToken;

    const payload = await graphRequest({
      method: "GET",
      accessToken,
      path: "/me/calendars",
      query: {
        "$top": safeOptions.maxResults || 25,
        "$select": "id,name,canEdit,canShare,canViewPrivateItems,changeKey,color,isDefaultCalendar,owner"
      }
    });

    const calendars = Array.isArray(payload.value) ? payload.value : [];

    return calendars.map((calendar) => ({
      id: Utils.cleanString(calendar.id),
      name: Utils.cleanString(calendar.name),
      canEdit: Boolean(calendar.canEdit),
      canShare: Boolean(calendar.canShare),
      canViewPrivateItems: Boolean(calendar.canViewPrivateItems),
      isDefaultCalendar: Boolean(calendar.isDefaultCalendar),
      owner: calendar.owner || null
    }));
  }

  function getEventsPath(calendarId) {
    const cleanCalendarId = Utils.cleanString(calendarId);

    if (!cleanCalendarId) {
      return "/me/calendar/events";
    }

    return `/me/calendars/${encodePathSegment(cleanCalendarId)}/events`;
  }

  function getDefaultEventSelectFields() {
    return [
      "id",
      "subject",
      "bodyPreview",
      "start",
      "end",
      "location",
      "webLink",
      "createdDateTime",
      "lastModifiedDateTime",
      "isCancelled",
      "organizer"
    ].join(",");
  }

  async function listUpcomingEvents(options) {
    const safeOptions = options || {};
    const accessToken = safeOptions.accessToken;
    const calendarId = Utils.cleanString(safeOptions.calendarId);
    const maxResults = Number(safeOptions.maxResults || CONFIG.MAX_EVENTS_TO_READ);
    const now = new Date();

    const payload = await graphRequest({
      method: "GET",
      accessToken,
      path: getEventsPath(calendarId),
      query: {
        "$top": Math.max(1, Math.min(maxResults, 50)),
        "$select": getDefaultEventSelectFields(),
        "$orderby": "start/dateTime",
        "$filter": `start/dateTime ge '${now.toISOString()}'`
      }
    });

    const events = Array.isArray(payload.value) ? payload.value : [];
    return events.map(normalizeMicrosoftEvent);
  }

  function normalizeMicrosoftEvent(event) {
    const safeEvent = event || {};

    return {
      id: Utils.cleanString(safeEvent.id),
      subject: Utils.cleanString(safeEvent.subject),
      bodyPreview: Utils.cleanString(safeEvent.bodyPreview),
      webLink: Utils.cleanString(safeEvent.webLink),
      start: safeEvent.start || null,
      end: safeEvent.end || null,
      location: safeEvent.location || null,
      createdDateTime: Utils.cleanString(safeEvent.createdDateTime),
      lastModifiedDateTime: Utils.cleanString(safeEvent.lastModifiedDateTime),
      isCancelled: Boolean(safeEvent.isCancelled),
      organizer: safeEvent.organizer || null
    };
  }

  function getInsertEventPath(calendarId) {
    const cleanCalendarId = Utils.cleanString(calendarId);

    if (!cleanCalendarId) {
      return "/me/calendar/events";
    }

    return `/me/calendars/${encodePathSegment(cleanCalendarId)}/events`;
  }

  async function insertEvent(options) {
    const safeOptions = options || {};
    const accessToken = safeOptions.accessToken;
    const calendarId = Utils.cleanString(safeOptions.calendarId);
    const event = safeOptions.event;

    assertAuthorizedCreateSource(safeOptions.source);

    if (!event || typeof event !== "object") {
      throw new Error("Falta el evento que se enviará a Microsoft Calendar.");
    }

    const createdEvent = await graphRequest({
      method: "POST",
      accessToken,
      path: getInsertEventPath(calendarId),
      body: event
    });

    return normalizeMicrosoftEvent(createdEvent);
  }

  async function deleteEvent(options) {
    const safeOptions = options || {};
    const accessToken = safeOptions.accessToken;
    const eventId = Utils.cleanString(safeOptions.eventId);

    if (!eventId) {
      throw new Error("Falta el ID del evento que se desea borrar.");
    }

    await graphRequest({
      method: "DELETE",
      accessToken,
      path: `/me/events/${encodePathSegment(eventId)}`
    });

    return {
      ok: true,
      deletedEventId: eventId
    };
  }

  MC.MicrosoftApi = {
    ALLOWED_CREATE_SOURCES,
    graphRequest,
    getMe,
    listCalendars,
    listUpcomingEvents,
    insertEvent,
    deleteEvent,
    normalizeMicrosoftEvent
  };
})(window);
