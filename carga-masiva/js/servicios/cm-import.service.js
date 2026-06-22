/*
  Nombre completo: cm-import.service.js
  Ruta: carga-masiva/js/servicios/cm-import.service.js

  Función:
    - Importar eventos confirmados desde Carga Masiva hacia el Agendador.
    - Validar que no existan eventos seleccionados con revisión o error.
    - Guardar primero mediante el adaptador del Agendador.
    - Guardar resumen compacto del lote en Firebase si el adaptador existe.
    - Respetar el orden:
      Local → Firebase → Google/Microsoft/Telegram/Notificaciones.
    - No procesa texto ni archivos.

  Se conecta con:
    - cm-config.js
    - cm-storage.js
    - servicios/cm-validator.service.js
    - conexiones/cm-agendador.adapter.js
    - conexiones/cm-firebase-batch.adapter.js
    - cm-app.js
*/

(function initCmImportService(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function ensureCanImport(events) {
    const validation = CM.ValidatorService.canImport(events);

    if (!validation.ok) {
      throw new Error(validation.message);
    }

    return validation;
  }

  async function saveToAgendador(batch, events) {
    if (!CM.AgendadorAdapter || typeof CM.AgendadorAdapter.importEvents !== "function") {
      throw new Error("No está disponible cm-agendador.adapter.js.");
    }

    return CM.AgendadorAdapter.importEvents({
      batch,
      events
    });
  }

  async function saveBatchSummaryToFirebase(batch, events, agendadorResult) {
    if (!CM.FirebaseBatchAdapter || typeof CM.FirebaseBatchAdapter.saveBatchSummary !== "function") {
      return {
        ok: false,
        skipped: true,
        message: "FirebaseBatchAdapter no está disponible."
      };
    }

    return CM.FirebaseBatchAdapter.saveBatchSummary({
      batch,
      events,
      agendadorResult
    });
  }

  async function importEvents(payload) {
    const safePayload = payload || {};
    const batch = safePayload.batch;

    if (!batch || !batch.id) {
      throw new Error("No hay lote válido para importar.");
    }

    const events = Array.isArray(safePayload.events) ? safePayload.events : [];

    ensureCanImport(events);

    const selectedEvents = events.filter((event) => event.selected !== false);

    if (!selectedEvents.length) {
      throw new Error("No hay eventos seleccionados para importar.");
    }

    const agendadorResult = await saveToAgendador(batch, selectedEvents);
    const firebaseBatchResult = await saveBatchSummaryToFirebase(batch, selectedEvents, agendadorResult);

    return {
      ok: true,
      batchId: batch.id,
      total: selectedEvents.length,
      agendador: agendadorResult,
      firebaseBatch: firebaseBatchResult,
      importedAt: CM.nowISO()
    };
  }

  CM.ImportService = {
    ensureCanImport,
    saveToAgendador,
    saveBatchSummaryToFirebase,
    importEvents
  };
})(window);