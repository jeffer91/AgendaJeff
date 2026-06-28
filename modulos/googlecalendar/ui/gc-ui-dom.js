/*
  Nombre completo: gc-ui-dom.js
  Ruta: modulos/googlecalendar/ui/gc-ui-dom.js

  Función:
    - Centralizar referencias DOM del módulo Google Calendar.
    - Leer y escribir datos del formulario sin mezclar lógica de conexión.
    - Cargar todos los campos disponibles desde Firebase: desktop, web, redirect y secretos.
    - Preparar datos para guardar, conectar, intercambiar código y crear eventos.

  Se conecta con:
    - modulos/googlecalendar/gc-module.html
    - modulos/googlecalendar/ui/gc-ui-events.js
    - modulos/googlecalendar/ui/gc-ui-render.js
*/

(function initGoogleCalendarUiDom(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const ui = googleCalendar.UI = googleCalendar.UI || {};

  function byId(id) {
    return document.getElementById(id);
  }

  function valueOf(id) {
    const element = byId(id);
    return element && typeof element.value === "string" ? element.value.trim() : "";
  }

  function checkedOf(id) {
    const element = byId(id);
    return element ? Boolean(element.checked) : false;
  }

  function firstText(data, keys, fallback) {
    const source = data && typeof data === "object" ? data : {};

    for (let index = 0; index < keys.length; index += 1) {
      const value = source[keys[index]];

      if (value !== null && value !== undefined && String(value).trim()) {
        return String(value).trim();
      }
    }

    return fallback || "";
  }

  function setValue(id, value) {
    const element = byId(id);

    if (element) {
      element.value = value || "";
    }
  }

  function setChecked(id, value) {
    const element = byId(id);

    if (element) {
      element.checked = Boolean(value);
    }
  }

  function setDetailsOpen(id, value) {
    const element = byId(id);

    if (element && element.tagName && element.tagName.toLowerCase() === "details") {
      element.open = Boolean(value);
    }
  }

  function getElements() {
    return {
      statusBadge: byId("gcStatusBadge"),
      statusTitle: byId("gcStatusTitle"),
      statusDescription: byId("gcStatusDescription"),
      statusSource: byId("gcStatusSource"),
      statusUpdatedAt: byId("gcStatusUpdatedAt"),
      firebaseStatus: byId("gcFirebaseStatus"),
      authStatus: byId("gcAuthStatus"),
      apiStatus: byId("gcApiStatus"),
      connectorStatus: byId("gcConnectorStatus"),
      resultBox: byId("gcResultBox"),
      errorBox: byId("gcErrorBox"),
      diagnosticBox: byId("gcDiagnosticBox"),
      jsonBox: byId("gcJsonBox"),
      advancedAuthDetails: byId("gcAdvancedAuthDetails"),
      advancedJsonDetails: byId("gcAdvancedJsonDetails"),
      btnSave: byId("gcBtnSave"),
      btnLoad: byId("gcBtnLoad"),
      btnClear: byId("gcBtnClear"),
      btnConnect: byId("gcBtnConnect"),
      btnExchangeCode: byId("gcBtnExchangeCode"),
      btnTestFirebase: byId("gcBtnTestFirebase"),
      btnTestGoogle: byId("gcBtnTestGoogle"),
      btnCreateTestEvent: byId("gcBtnCreateTestEvent"),
      btnDiagnostic: byId("gcBtnDiagnostic")
    };
  }

  function readConnectionForm() {
    return {
      enabled: checkedOf("gcEnabled"),
      activeCredentialType: valueOf("gcActiveCredentialType") || "desktop",
      calendarId: valueOf("gcCalendarId") || "primary",
      clientIdDesktop: valueOf("gcClientIdDesktop"),
      clientSecretDesktop: valueOf("gcClientSecretDesktop"),
      redirectUriDesktop: valueOf("gcRedirectUriDesktop"),
      clientIdWeb: valueOf("gcClientIdWeb"),
      clientSecretWeb: valueOf("gcClientSecretWeb"),
      redirectUriWeb: valueOf("gcRedirectUriWeb"),
      updatedAt: new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    };
  }

  function readAuthInput() {
    const connection = readConnectionForm();
    const credentialType = connection.activeCredentialType || "desktop";

    return {
      ...connection,
      code: valueOf("gcAuthorizationCode"),
      clientId: credentialType === "web" ? connection.clientIdWeb : connection.clientIdDesktop,
      clientSecret: credentialType === "web" ? connection.clientSecretWeb : connection.clientSecretDesktop,
      redirectUri: credentialType === "web" ? connection.redirectUriWeb : connection.redirectUriDesktop
    };
  }

  function readEventDraft() {
    const connection = readConnectionForm();
    return {
      title: valueOf("gcTestEventTitle") || "Prueba AgendaJeff · Google Calendar",
      description: valueOf("gcTestEventDescription") || "Evento de prueba creado desde AgendaJeff.",
      location: valueOf("gcTestEventLocation") || "AgendaJeff",
      calendarId: connection.calendarId || "primary"
    };
  }

  function getLoadedFields(connection) {
    const data = connection && typeof connection === "object" ? connection : {};
    const fields = {
      activeCredentialType: firstText(data, ["activeCredentialType", "tipoCredencialActiva"]),
      calendarId: firstText(data, ["calendarId", "idCalendario"], "primary"),
      clientIdDesktop: firstText(data, ["clientIdDesktop", "desktopClientId"]),
      clientSecretDesktop: firstText(data, ["clientSecretDesktop", "desktopClientSecret", "clientSecret"]),
      redirectUriDesktop: firstText(data, ["redirectUriDesktop", "desktopRedirectUri", "redirectUri"]),
      clientIdWeb: firstText(data, ["clientIdWeb", "webClientId"]),
      clientSecretWeb: firstText(data, ["clientSecretWeb", "webClientSecret"]),
      redirectUriWeb: firstText(data, ["redirectUriWeb", "webRedirectUri"])
    };

    return fields;
  }

  function fillConnectionForm(connection) {
    const data = connection && typeof connection === "object" ? connection : {};
    const fields = getLoadedFields(data);
    const hasWebData = Boolean(fields.clientIdWeb || fields.clientSecretWeb || fields.redirectUriWeb);

    setChecked("gcEnabled", data.enabled !== false);
    setValue("gcActiveCredentialType", fields.activeCredentialType || "desktop");
    setValue("gcCalendarId", fields.calendarId || "primary");
    setValue("gcClientIdDesktop", fields.clientIdDesktop || "");
    setValue("gcClientSecretDesktop", fields.clientSecretDesktop || "");
    setValue("gcRedirectUriDesktop", fields.redirectUriDesktop || "");
    setValue("gcClientIdWeb", fields.clientIdWeb || "");
    setValue("gcClientSecretWeb", fields.clientSecretWeb || "");
    setValue("gcRedirectUriWeb", fields.redirectUriWeb || "");

    if (hasWebData) {
      setDetailsOpen("gcAdvancedAuthDetails", true);
    }

    return {
      ok: true,
      hasWebData,
      loadedFields: {
        activeCredentialType: Boolean(fields.activeCredentialType),
        calendarId: Boolean(fields.calendarId),
        clientIdDesktop: Boolean(fields.clientIdDesktop),
        clientSecretDesktop: Boolean(fields.clientSecretDesktop),
        redirectUriDesktop: Boolean(fields.redirectUriDesktop),
        clientIdWeb: Boolean(fields.clientIdWeb),
        clientSecretWeb: Boolean(fields.clientSecretWeb),
        redirectUriWeb: Boolean(fields.redirectUriWeb)
      }
    };
  }

  function clearSensitiveFields() {
    setValue("gcClientSecretDesktop", "");
    setValue("gcClientSecretWeb", "");
    setValue("gcAuthorizationCode", "");
  }

  ui.Dom = Object.freeze({
    byId,
    valueOf,
    checkedOf,
    firstText,
    setValue,
    setChecked,
    setDetailsOpen,
    getElements,
    readConnectionForm,
    readAuthInput,
    readEventDraft,
    getLoadedFields,
    fillConnectionForm,
    clearSensitiveFields
  });
})(window);
