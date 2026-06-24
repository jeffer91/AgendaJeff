/*
  Nombre completo: gc-google-api.js
  Ruta: google-calendar/js/gc-google-api.js

  Función:
    - Comunicarse con Google Identity Services.
    - Pedir access token temporal para Google Calendar.
    - Comunicarse con Google Calendar API por REST.
    - Leer calendario principal o calendario configurado.
    - Leer próximos eventos.
    - Crear eventos solo cuando el origen autorizado sea Agendador o Carga Masiva.

  Se conecta con:
    - gc-config.js
    - gc-storage.js
    - gc-event.service.js
    - ag-google.adapter.js

  Importante:
    - Este archivo NO guarda accessToken en localStorage.
    - Este archivo NO guarda accessToken en Firebase.
    - El token vive solo en memoria mientras la página está abierta.
    - Este archivo NO crea eventos desde gc-index.html.
*/

(function initGcGoogleApi(global) {
  "use strict";

  const GC = global.GC;
  const CONFIG = GC.CONFIG;

  const ALLOWED_CREATE_SOURCES = ["agendador", "cargaMasiva", "agendador-sync", "carga-masiva"];

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeCalendarId(value) {
    const calendarId = normalizeText(value);

    if (!calendarId) {
      return CONFIG.DEFAULT_CALENDAR_ID;
    }

    return calendarId;
  }

  function delay(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function buildCalendarApiUrl(path, query) {
    const safePath = String(path || "").startsWith("/")
      ? String(path || "")
      : `/${String(path || "")}`;

    const url = new URL(`${CONFIG.GOOGLE_CALENDAR_API_BASE_URL}${safePath}`);
    const safeQuery = query && typeof query === "object" ? query : {};

    Object.keys(safeQuery).forEach((key) => {
      const value = safeQuery[key];

      if (value === undefined || value === null || value === "") {
        return;
      }

      url.searchParams.set(key, String(value));
    });

    return url.toString();
  }

  function encodePathValue(value) {
    return encodeURIComponent(normalizeText(value));
  }

  function ensureAccessToken(accessToken) {
    const safeAccessToken = normalizeText(accessToken);

    if (!safeAccessToken) {
      throw new Error("Falta autorización de Google. Presiona Conectar / Probar primero.");
    }

    return safeAccessToken;
  }

  function assertAuthorizedCreateSource(source) {
    const cleanSource = normalizeText(source);

    if (!ALLOWED_CREATE_SOURCES.includes(cleanSource)) {
      throw new Error(
        "Creación bloqueada: Google Calendar solo puede crear eventos enviados desde Agendador o Carga Masiva."
      );
    }

    return cleanSource;
  }

  async function waitForGoogleIdentityServices() {
    const maxAttempts = 80;
    const waitMs = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (
        global.google &&
        global.google.accounts &&
        global.google.accounts.oauth2 &&
        typeof global.google.accounts.oauth2.initTokenClient === "function"
      ) {
        return true;
      }

      await delay(waitMs);
    }

    throw new Error(
      "Google Identity Services no cargó. Revisa internet y el script https://accounts.google.com/gsi/client."
    );
  }

  async function requestAccessToken(params) {
    const safeParams = params || {};
    const clientId = normalizeText(safeParams.clientId);
    const scope = normalizeText(safeParams.scope) || CONFIG.GOOGLE_AUTH_SCOPES;
    const prompt = safeParams.prompt === "" ? "" : normalizeText(safeParams.prompt) || "consent";

    if (!clientId) {
      throw new Error("Falta el Google OAuth Client ID.");
    }

    await waitForGoogleIdentityServices();

    return new Promise((resolve, reject) => {
      let tokenClient = null;

      try {
        tokenClient = global.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope,
          callback: (tokenResponse) => {
            if (!tokenResponse) {
              reject(new Error("Google no devolvió respuesta de autorización."));
              return;
            }

            if (tokenResponse.error) {
              reject(
                new Error(
                  tokenResponse.error_description ||
                    tokenResponse.error ||
                    "Google rechazó la autorización."
                )
              );
              return;
            }

            if (!tokenResponse.access_token) {
              reject(new Error("Google no devolvió access token."));
              return;
            }

            resolve({
              accessToken: tokenResponse.access_token,
              expiresIn: tokenResponse.expires_in || null,
              scope: tokenResponse.scope || scope,
              tokenType: tokenResponse.token_type || "Bearer",
              issuedAt: new Date().toISOString()
            });
          },
          error_callback: (error) => {
            const message = error && error.message
              ? error.message
              : "No se pudo abrir o completar la ventana de autorización de Google.";

            reject(new Error(message));
          }
        });

        tokenClient.requestAccessToken({ prompt });
      } catch (error) {
        reject(error);
      }
    });
  }

  function revokeAccessToken(accessToken) {
    const safeAccessToken = normalizeText(accessToken);

    if (
      !safeAccessToken ||
      !global.google ||
      !global.google.accounts ||
      !global.google.accounts.oauth2 ||
      typeof global.google.accounts.oauth2.revoke !== "function"
    ) {
      return;
    }

    global.google.accounts.oauth2.revoke(safeAccessToken, function noop() {});
  }

  async function parseGoogleApiResponse(response) {
    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      const apiMessage = payload &&
        payload.error &&
        typeof payload.error === "object" &&
        payload.error.message
        ? payload.error.message
        : "";

      const fallbackMessage = `Google Calendar rechazó la solicitud. HTTP ${response.status}.`;
      throw new Error(apiMessage || fallbackMessage);
    }

    return payload;
  }

  async function apiFetch(params) {
    const safeParams = params || {};
    const accessToken = ensureAccessToken(safeParams.accessToken);
    const method = normalizeText(safeParams.method) || "GET";
    const path = normalizeText(safeParams.path);
    const query = safeParams.query || {};
    const body = safeParams.body;
    const url = buildCalendarApiUrl(path, query);

    if (!path) {
      throw new Error("Falta la ruta de Google Calendar API.");
    }

    const requestOptions = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    };

    if (body !== undefined && body !== null) {
      requestOptions.headers["Content-Type"] = "application/json";
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);
    return parseGoogleApiResponse(response);
  }

  async function getCalendar(params) {
    const safeParams = params || {};
    const calendarId = normalizeCalendarId(safeParams.calendarId);

    return apiFetch({
      accessToken: safeParams.accessToken,
      method: "GET",
      path: `/calendars/${encodePathValue(calendarId)}`
    });
  }

  async function listUpcomingEvents(params) {
    const safeParams = params || {};
    const calendarId = normalizeCalendarId(safeParams.calendarId);
    const maxResults = Number(safeParams.maxResults || CONFIG.MAX_EVENTS_TO_READ);

    return apiFetch({
      accessToken: safeParams.accessToken,
      method: "GET",
      path: `/calendars/${encodePathValue(calendarId)}/events`,
      query: {
        maxResults: Number.isFinite(maxResults) && maxResults > 0
          ? Math.min(maxResults, 50)
          : CONFIG.MAX_EVENTS_TO_READ,
        orderBy: "startTime",
        singleEvents: true,
        timeMin: new Date().toISOString()
      }
    });
  }

  async function insertEvent(params) {
    const safeParams = params || {};
    const calendarId = normalizeCalendarId(safeParams.calendarId);
    const event = safeParams.event;

    assertAuthorizedCreateSource(safeParams.source);

    if (!event || typeof event !== "object") {
      throw new Error("Falta el evento para crear en Google Calendar.");
    }

    return apiFetch({
      accessToken: safeParams.accessToken,
      method: "POST",
      path: `/calendars/${encodePathValue(calendarId)}/events`,
      body: event
    });
  }

  GC.GoogleApi = {
    ALLOWED_CREATE_SOURCES,
    waitForGoogleIdentityServices,
    requestAccessToken,
    revokeAccessToken,
    getCalendar,
    listUpcomingEvents,
    insertEvent
  };
})(window);
