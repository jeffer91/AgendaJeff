/*
  Nombre completo: gc-ui-render.js
  Ruta: modulos/googlecalendar/ui/gc-ui-render.js

  Función:
    - Renderizar estados, resultados, errores y JSON técnico en Google Calendar.
    - Mantener la UI separada de conexión, Firebase, Auth y API.

  Se conecta con:
    - modulos/googlecalendar/ui/gc-ui-dom.js
    - modulos/googlecalendar/ui/gc-ui-events.js
    - modulos/googlecalendar/startup/gc-start.js
*/

(function initGoogleCalendarUiRender(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const ui = googleCalendar.UI = googleCalendar.UI || {};

  function getDom() {
    return ui.Dom || {};
  }

  function getElements() {
    return getDom().getElements ? getDom().getElements() : {};
  }

  function safeJson(data) {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return JSON.stringify({ ok: false, message: "No se pudo renderizar JSON.", error: String(error) }, null, 2);
    }
  }

  function setBadge(element, status) {
    if (!element) {
      return;
    }

    element.classList.remove("is-idle", "is-ready", "is-error");

    if (status === "ready" || status === "authorized") {
      element.classList.add("is-ready");
    } else if (status === "error") {
      element.classList.add("is-error");
    } else {
      element.classList.add("is-idle");
    }
  }

  function renderStatus(payload) {
    const elements = getElements();
    const data = payload && typeof payload === "object" ? payload : {};
    const status = data.status || (data.ok ? "ready" : "partial");

    if (elements.statusBadge) {
      elements.statusBadge.textContent = data.badge || status || "estado";
      setBadge(elements.statusBadge, status);
    }

    if (elements.statusTitle) {
      elements.statusTitle.textContent = data.title || "Google Calendar";
    }

    if (elements.statusDescription) {
      elements.statusDescription.textContent = data.message || "Módulo Google Calendar cargado.";
    }

    if (elements.statusSource) {
      elements.statusSource.textContent = data.source || "sistema";
    }

    if (elements.statusUpdatedAt) {
      elements.statusUpdatedAt.textContent = data.checkedAt || new Date().toISOString();
    }
  }

  function renderResult(result) {
    const elements = getElements();
    const data = result && typeof result === "object" ? result : {};

    renderStatus({
      ok: data.ok,
      status: data.status,
      title: data.ok ? "Acción completada" : "Acción con pendiente",
      message: data.message || "Resultado actualizado.",
      source: data.source || "módulo",
      checkedAt: data.checkedAt || new Date().toISOString()
    });

    if (elements.resultBox) {
      elements.resultBox.textContent = data.message || safeJson(data);
    }

    if (elements.jsonBox) {
      elements.jsonBox.textContent = safeJson(data);
    }

    if (elements.errorBox) {
      const hasError = Boolean(data.error);
      elements.errorBox.hidden = !hasError;
      elements.errorBox.textContent = hasError ? safeJson(data.error) : "";
    }
  }

  function renderDiagnostic(result) {
    const elements = getElements();

    if (elements.diagnosticBox) {
      elements.diagnosticBox.textContent = safeJson(result || {});
    }

    renderResult(result);
  }

  function renderLayerStatus() {
    const elements = getElements();
    const firebaseConfig = googleCalendar.FirebaseConfig || {};
    const validation = firebaseConfig.validateFirebaseConfig ? firebaseConfig.validateFirebaseConfig() : { ok: false };

    if (elements.firebaseStatus) {
      elements.firebaseStatus.textContent = validation.ok ? "Listo" : "Config pendiente";
      elements.firebaseStatus.className = validation.ok ? "is-ready" : "is-idle";
    }

    if (elements.authStatus) {
      elements.authStatus.textContent = googleCalendar.Auth ? "Preparado" : "Pendiente";
      elements.authStatus.className = googleCalendar.Auth ? "is-ready" : "is-idle";
    }

    if (elements.apiStatus) {
      elements.apiStatus.textContent = googleCalendar.Api && googleCalendar.Api.Client ? "Preparado" : "Pendiente";
      elements.apiStatus.className = googleCalendar.Api && googleCalendar.Api.Client ? "is-ready" : "is-idle";
    }

    if (elements.connectorStatus) {
      elements.connectorStatus.textContent = global.AgendaJeffGoogleCalendar ? "Preparado" : "Pendiente";
      elements.connectorStatus.className = global.AgendaJeffGoogleCalendar ? "is-ready" : "is-idle";
    }
  }

  function setBusy(isBusy, text) {
    const elements = getElements();
    const buttons = [
      elements.btnSave,
      elements.btnLoad,
      elements.btnClear,
      elements.btnConnect,
      elements.btnExchangeCode,
      elements.btnTestFirebase,
      elements.btnTestGoogle,
      elements.btnCreateTestEvent,
      elements.btnDiagnostic
    ].filter(Boolean);

    buttons.forEach(function eachButton(button) {
      button.disabled = Boolean(isBusy);
    });

    if (isBusy && elements.resultBox) {
      elements.resultBox.textContent = text || "Procesando...";
    }
  }

  function enableUi() {
    setBusy(false);
  }

  ui.Render = Object.freeze({
    safeJson,
    setBadge,
    renderStatus,
    renderResult,
    renderDiagnostic,
    renderLayerStatus,
    setBusy,
    enableUi
  });
})(window);
