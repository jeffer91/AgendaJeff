/*
  Nombre completo: gc-diagnostic-local.js
  Ruta: modulos/googlecalendar/diagnostic/gc-diagnostic-local.js

  Función:
    - Diagnosticar lectura local y respaldo local de Google Calendar.
    - No modifica datos, solo verifica disponibilidad.

  Se conecta con:
    - modulos/googlecalendar/storage/gc-local-read.js
*/

(function initGoogleCalendarDiagnosticLocal(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const diagnostic = googleCalendar.Diagnostic = googleCalendar.Diagnostic || {};

  function createResult(payload) {
    return typeof googleCalendar.createResult === "function"
      ? googleCalendar.createResult(payload)
      : { ok: Boolean(payload && payload.ok), ...(payload || {}) };
  }

  function diagnoseLocalStorage() {
    const storage = googleCalendar.Storage || {};
    const mainResult = storage.readLocalConnection ? storage.readLocalConnection() : null;
    const backupResult = storage.readLocalBackup ? storage.readLocalBackup() : null;
    const fallbackResult = storage.readLocalConnectionWithFallback ? storage.readLocalConnectionWithFallback() : null;
    const ok = Boolean((mainResult && mainResult.ok) || (backupResult && backupResult.ok));

    return createResult({
      ok,
      status: ok ? "ready" : "idle",
      action: "diagnosticLocal",
      source: "diagnostic",
      file: "modulos/googlecalendar/diagnostic/gc-diagnostic-local.js",
      message: ok ? "Existe conexión o respaldo local Google Calendar." : "No existe conexión local Google Calendar.",
      data: { mainResult, backupResult, fallbackResult }
    });
  }

  diagnostic.diagnoseLocalStorage = diagnoseLocalStorage;
})(window);
