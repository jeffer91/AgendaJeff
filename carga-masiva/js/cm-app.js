/*
  Nombre completo: cm-app.js
  Ruta: carga-masiva/js/cm-app.js

  Función:
    - Coordinar el flujo principal del módulo Carga Masiva.
    - Leer texto pegado, archivos, opciones, canales y nombre del lote.
    - Procesar la carga usando servicios y parsers.
    - Normalizar eventos detectados.
    - Validar eventos.
    - Guardar lote y borrador local.
    - Abrir pop-up de revisión.
    - Confirmar importación solo cuando todo esté OK.
    - Enviar eventos confirmados al Agendador mediante ImportService.

  Se conecta con:
    - cm-config.js
    - cm-storage.js
    - cm-ui.js
    - servicios/cm-input.service.js
    - servicios/cm-file.service.js
    - servicios/cm-parser.service.js
    - servicios/cm-normalizer.service.js
    - servicios/cm-validator.service.js
    - servicios/cm-review.service.js
    - servicios/cm-import.service.js
    - parsers/*
    - componentes/*
    - conexiones/cm-agendador.adapter.js
    - conexiones/cm-firebase-batch.adapter.js
    - cm-bindings.js
*/

(function initCmApp(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  const state = {
    batch: null,
    events: [],
    page: 1,
    pageSize: CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
    selectedEventId: "",
    isProcessing: false,
    lastFilePayload: null
  };

  function getState() {
    return {
      ...state,
      events: Array.isArray(state.events) ? [...state.events] : []
    };
  }

  function setEvents(events) {
    state.events = Array.isArray(events) ? events : [];
    CM.Storage.saveDraftEventsForBatch(state.batch ? state.batch.id : "", state.events);
    CM.UI.updateSummary(state.events);
  }

  function getCurrentBatchName(inputData) {
    const name = CM.safeString(inputData && inputData.batchName);

    if (name) {
      return name;
    }

    const today = new Date().toLocaleDateString("es-EC");

    if (inputData && inputData.sourceType === CONFIG.SOURCE_TYPES.DEFENSE) {
      return `Carga de defensas ${today}`;
    }

    if (inputData && inputData.sourceType === CONFIG.SOURCE_TYPES.SCHEDULE) {
      return `Cronograma académico ${today}`;
    }

    return `Carga masiva ${today}`;
  }

  function createOrUpdateBatch(inputData, validatedEvents) {
    const summary = CM.ValidatorService.getSummary(validatedEvents);
    const payload = {
      id: state.batch ? state.batch.id : undefined,
      name: getCurrentBatchName(inputData),
      status: CONFIG.BATCH_STATUS.REVIEW,
      sourceType: inputData.sourceType || CONFIG.SOURCE_TYPES.AUTO,
      sourceFileName: inputData.fileName || "",
      totalDetected: summary.total,
      totalOk: summary.ok,
      totalReview: summary.review,
      totalError: summary.error,
      totalSelected: summary.selected,
      channels: inputData.channels,
      notes: inputData.text ? "Carga procesada desde texto pegado." : "Carga procesada desde archivo."
    };

    if (state.batch && state.batch.id) {
      state.batch = CM.Storage.saveBatch({
        ...state.batch,
        ...payload
      });
    } else {
      state.batch = CM.Storage.createBatch(payload);
    }

    return state.batch;
  }

  async function processLoad() {
    if (state.isProcessing) {
      return;
    }

    state.isProcessing = true;
    CM.UI.setProcessing(true, CONFIG.MESSAGES.PROCESSING);

    try {
      const inputData = CM.InputService.readInput();

      if (!inputData.text && !inputData.file) {
        throw new Error(CONFIG.MESSAGES.EMPTY_INPUT);
      }

      CM.Storage.saveSettings({
        pageSize: inputData.pageSize,
        sourceType: inputData.sourceType,
        reminders: inputData.reminders,
        channels: inputData.channels
      });

      let filePayload = null;

      if (inputData.file) {
        filePayload = await CM.FileService.readFile(inputData.file);
        state.lastFilePayload = filePayload;
      }

      const parsePayload = {
        text: inputData.text,
        file: filePayload,
        sourceType: inputData.sourceType,
        fileName: inputData.fileName,
        settings: {
          reminders: inputData.reminders,
          channels: inputData.channels,
          pageSize: inputData.pageSize
        }
      };

      const parseResult = await CM.ParserService.parse(parsePayload);

      if (!parseResult.events.length) {
        throw new Error("No se detectaron eventos en la carga.");
      }

      const tempBatchId = state.batch ? state.batch.id : CM.createId("cm_batch");

      const normalizedEvents = CM.NormalizerService.normalizeEvents(parseResult.events, {
        batchId: tempBatchId,
        sourceType: parseResult.sourceType || inputData.sourceType,
        channels: inputData.channels,
        settings: {
          reminders: inputData.reminders,
          channels: inputData.channels
        },
        period: parseResult.period || "",
        phase: parseResult.phase || ""
      });

      const validatedEvents = CM.ValidatorService.validateEvents(normalizedEvents);

      state.batch = {
        id: tempBatchId
      };

      createOrUpdateBatch(inputData, validatedEvents);

      const eventsWithBatch = validatedEvents.map((event) => ({
        ...event,
        batchId: state.batch.id
      }));

      state.page = 1;
      state.pageSize = inputData.pageSize || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
      state.selectedEventId = "";

      setEvents(eventsWithBatch);

      CM.Storage.setCurrentPage(state.page);

      CM.ReviewService.openReview({
        batch: state.batch,
        events: state.events,
        page: state.page,
        pageSize: state.pageSize
      });

      const validation = CM.ValidatorService.canImport(state.events);

      CM.UI.setOutput({
        ok: true,
        message: CONFIG.MESSAGES.REVIEW_REQUIRED,
        batch: state.batch,
        parse: {
          sourceType: parseResult.sourceType,
          detected: parseResult.events.length,
          warnings: parseResult.warnings || []
        },
        validation
      });

      CM.UI.toastInfo(CONFIG.MESSAGES.REVIEW_REQUIRED);
    } catch (error) {
      CM.UI.toastError(error.message);
      CM.UI.setOutput({
        ok: false,
        message: error.message
      });
    } finally {
      state.isProcessing = false;
      CM.UI.setProcessing(false);
    }
  }

  function clearAll() {
    state.batch = null;
    state.events = [];
    state.page = 1;
    state.selectedEventId = "";
    state.lastFilePayload = null;

    CM.Storage.resetModule();
    CM.UI.clearMainForm();
    CM.UI.clearEditor();
    CM.UI.closeReviewModal();
    CM.UI.toastInfo("Carga masiva limpiada.");
  }

  function openLastBatch() {
    const batchId = CM.Storage.getLastBatchId();

    if (!batchId) {
      CM.UI.toastWarning("No hay una revisión anterior guardada.");
      return;
    }

    const batch = CM.Storage.findBatchById(batchId);
    const events = CM.Storage.getDraftEventsByBatch(batchId);

    if (!batch || !events.length) {
      CM.UI.toastWarning("No se encontró la última revisión.");
      return;
    }

    state.batch = batch;
    state.events = events;
    state.page = CM.Storage.getCurrentPage();
    state.pageSize = Number(batch.pageSize || CM.Storage.getSettings().pageSize || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE);
    state.selectedEventId = "";

    CM.ReviewService.openReview({
      batch: state.batch,
      events: state.events,
      page: state.page,
      pageSize: state.pageSize
    });

    CM.UI.setOutput({
      ok: true,
      message: "Última revisión abierta.",
      batch: state.batch
    });
  }

  function refreshReview() {
    if (!state.batch) {
      CM.UI.updateSummary([]);
      return;
    }

    CM.ReviewService.openReview({
      batch: state.batch,
      events: state.events,
      page: state.page,
      pageSize: state.pageSize
    });
  }

  function setPage(page) {
    const totalPages = Math.max(1, Math.ceil(state.events.length / state.pageSize));
    state.page = Math.min(Math.max(1, Number(page) || 1), totalPages);
    CM.Storage.setCurrentPage(state.page);
    refreshReview();
  }

  function nextPage() {
    setPage(state.page + 1);
  }

  function previousPage() {
    setPage(state.page - 1);
  }

  function selectAll() {
    state.events = CM.ReviewService.setSelection(state.events, true);
    setEvents(state.events);
    refreshReview();
  }

  function unselectAll() {
    state.events = CM.ReviewService.setSelection(state.events, false);
    setEvents(state.events);
    refreshReview();
  }

  function toggleEventSelection(eventId, selected) {
    state.events = CM.ReviewService.toggleSelection(state.events, eventId, selected);
    setEvents(state.events);
    refreshReview();
  }

  function removeEvent(eventId) {
    const eventToRemove = state.events.find((item) => item.id === eventId);

    if (!eventToRemove) {
      CM.UI.toastWarning("No se encontró el evento para quitar.");
      return;
    }

    const title = eventToRemove.title || "este evento";
    const shouldRemove = global.confirm
      ? global.confirm(`¿Quitar "${title}" de esta revisión?`)
      : true;

    if (!shouldRemove) {
      return;
    }

    state.events = state.events.filter((item) => item.id !== eventId);

    if (state.selectedEventId === eventId) {
      state.selectedEventId = "";
      CM.UI.clearEditor();
    }

    const totalPages = Math.max(1, Math.ceil(state.events.length / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    CM.Storage.setCurrentPage(state.page);

    setEvents(state.events);
    refreshReview();

    CM.UI.toastSuccess("Evento quitado de la revisión.");
  }

  function editEvent(eventId) {
    const event = state.events.find((item) => item.id === eventId);

    if (!event) {
      CM.UI.toastWarning("No se encontró el evento para editar.");
      return;
    }

    state.selectedEventId = eventId;
    CM.UI.fillEditor(event);
  }

  function saveEditedEvent() {
    const edited = CM.UI.readEditor();

    if (!edited.id) {
      CM.UI.toastWarning("No hay evento seleccionado para editar.");
      return;
    }

    state.events = CM.ReviewService.updateEventFromEditor(state.events, edited);
    setEvents(state.events);
    CM.UI.clearEditor();
    refreshReview();

    CM.UI.toastSuccess("Corrección guardada.");
  }

  function cancelEdit() {
    state.selectedEventId = "";
    CM.UI.clearEditor();
  }

  function confirmWarningsManually() {
    const edited = CM.UI.readEditor();

    if (!edited.id) {
      CM.UI.toastWarning("Selecciona un evento para confirmar manualmente.");
      return;
    }

    state.events = CM.ReviewService.confirmWarnings(state.events, edited.id);
    setEvents(state.events);
    CM.UI.clearEditor();
    refreshReview();

    CM.UI.toastSuccess("Advertencias confirmadas manualmente.");
  }

  async function importSelectedEvents() {
    if (!state.batch) {
      CM.UI.toastWarning("No hay lote activo.");
      return;
    }

    const validation = CM.ValidatorService.canImport(state.events);

    if (!validation.ok) {
      CM.UI.toastWarning(validation.message);
      CM.UI.setOutput({
        ok: false,
        message: validation.message,
        validation
      });
      return;
    }

    state.isProcessing = true;
    CM.UI.setProcessing(true, "Agregando eventos...");

    try {
      CM.Storage.updateBatchStatus(state.batch.id, CONFIG.BATCH_STATUS.IMPORTING);

      const selectedEvents = state.events.filter((event) => event.selected !== false);

      const result = await CM.ImportService.importEvents({
        batch: state.batch,
        events: selectedEvents
      });

      state.batch = CM.Storage.updateBatchStatus(state.batch.id, CONFIG.BATCH_STATUS.IMPORTED, {
        importedAt: CM.nowISO()
      }) || state.batch;

      CM.UI.toastSuccess(CONFIG.MESSAGES.IMPORT_SUCCESS);
      CM.UI.setOutput({
        ok: true,
        message: CONFIG.MESSAGES.IMPORT_SUCCESS,
        result
      });

      CM.UI.closeReviewModal();
    } catch (error) {
      CM.Storage.updateBatchStatus(state.batch.id, CONFIG.BATCH_STATUS.ERROR, {
        errorMessage: error.message
      });

      CM.UI.toastError(error.message);
      CM.UI.setOutput({
        ok: false,
        message: error.message
      });
    } finally {
      state.isProcessing = false;
      CM.UI.setProcessing(false);
    }
  }

  function init() {
    const settings = CM.Storage.getSettings();

    state.pageSize = Number(settings.pageSize || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE);
    CM.UI.updateSummary([]);
    CM.UI.setOutput(CONFIG.MESSAGES.WAITING);
  }

  CM.App = {
    init,
    getState,

    processLoad,
    clearAll,
    openLastBatch,

    refreshReview,
    setPage,
    nextPage,
    previousPage,

    selectAll,
    unselectAll,
    toggleEventSelection,
    removeEvent,

    editEvent,
    saveEditedEvent,
    cancelEdit,
    confirmWarningsManually,

    importSelectedEvents
  };
})(window);