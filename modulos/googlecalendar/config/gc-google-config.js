/*
  Nombre completo: gc-google-config.js
  Ruta: modulos/googlecalendar/config/gc-google-config.js

  Función:
    - Centralizar la configuración funcional de Google Calendar.
    - Definir scopes, modo de credencial, rutas OAuth y campos públicos de conexión.
    - No escribir credenciales privadas dentro del código del repositorio.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - futuras capas auth y api del módulo Google Calendar
*/

(function initGoogleCalendarGoogleConfig(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};

  const SCOPES = Object.freeze([
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly"
  ]);

  const CREDENTIAL_TYPES = Object.freeze({
    DESKTOP: "desktop",
    WEB: "web"
  });

  const CONNECTION_FIELDS = Object.freeze({
    ACTIVE_CREDENTIAL_TYPE: "activeCredentialType",
    CALENDAR_ID: "calendarId",
    CLIENT_ID_DESKTOP: "clientIdDesktop",
    CLIENT_ID_WEB: "clientIdWeb",
    CONFIGURED: "configured",
    CONFIGURADO: "configurado",
    STATUS: "status",
    ESTADO: "estado",
    LAST_ERROR: "lastError",
    ULTIMO_ERROR: "ultimoError",
    UPDATED_AT: "updatedAt",
    ACTUALIZADO_EN: "actualizadoEn"
  });

  function getGoogleRuntimeConfig() {
    const config = googleCalendar.CONFIG || {};
    const google = config.google || {};

    return {
      provider: google.provider || "googleCalendar",
      defaultCalendarId: google.defaultCalendarId || "primary",
      defaultCredentialType: google.defaultCredentialType || CREDENTIAL_TYPES.DESKTOP,
      runtimeMode: google.runtimeMode || "desktop",
      apiBaseUrl: google.apiBaseUrl || "https://www.googleapis.com/calendar/v3",
      oauthBaseUrl: google.oauthBaseUrl || "https://accounts.google.com/o/oauth2/v2/auth",
      exchangeUrl: google.exchangeUrl || "https://oauth2.googleapis.com/token",
      scopes: SCOPES.slice()
    };
  }

  function isSupportedCredentialType(value) {
    return Object.keys(CREDENTIAL_TYPES).some(function checkKey(key) {
      return CREDENTIAL_TYPES[key] === value;
    });
  }

  function normalizeCredentialType(value) {
    return isSupportedCredentialType(value) ? value : CREDENTIAL_TYPES.DESKTOP;
  }

  googleCalendar.GoogleConfig = Object.freeze({
    SCOPES,
    CREDENTIAL_TYPES,
    CONNECTION_FIELDS,
    getGoogleRuntimeConfig,
    isSupportedCredentialType,
    normalizeCredentialType
  });
})(window);
