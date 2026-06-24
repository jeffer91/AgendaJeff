/*
  Nombre completo: cm-config.js
  Ruta: carga-masiva/js/cm-config.js

  Función:
    - Crear el namespace global window.CM.
    - Definir configuración general del módulo Carga Masiva.
    - Definir claves de localStorage, estados, tipos, canales, reglas y campos.
    - Centralizar IDs del DOM usados por UI, componentes y bindings.
    - No procesa archivos ni eventos; solo configura.
*/

(function initCmConfig(global) {
  "use strict";

  const CM = global.CM = global.CM || {};

  const CONFIG = {
    MODULE_NAME: "Carga Masiva",
    MODULE_CODE: "CM",
    VERSION: "1.1.0",

    NAMESPACE: "CM",

    STORAGE_KEYS: {
      SETTINGS: "agendajeff_cm_settings_v1",
      BATCHES: "agendajeff_cm_batches_v1",
      DRAFT_EVENTS: "agendajeff_cm_draft_events_v1",
      LAST_BATCH_ID: "agendajeff_cm_last_batch_id_v1",
      CURRENT_PAGE: "agendajeff_cm_current_page_v1",
      UNDO_HISTORY: "agendajeff_cm_undo_history_v1"
    },

    DOM_IDS: {
      batchName: "cmBatchName",
      sourceType: "cmSourceType",
      pageSize: "cmPageSize",
      pasteText: "cmPasteText",
      fileInput: "cmFileInput",
      fileName: "cmFileName",

      reminderDefault: "cmReminderDefault",
      reminderAllDay: "cmReminderAllDay",
      reminderDefense: "cmReminderDefense",

      processBtn: "cmProcessBtn",
      clearBtn: "cmClearBtn",
      openLastBatchBtn: "cmOpenLastBatchBtn",
      undoLastBatchBtn: "cmUndoLastBatchBtn",

      detectedCount: "cmDetectedCount",
      okCount: "cmOkCount",
      reviewCount: "cmReviewCount",
      errorCount: "cmErrorCount",

      output: "cmOutput",
      toast: "cmToast",

      reviewModal: "cmReviewModal",
      reviewModalTitle: "cmReviewModalTitle",
      reviewSummary: "cmReviewSummary",
      reviewTableBody: "cmReviewTableBody",

      modalOkCount: "cmModalOkCount",
      modalReviewCount: "cmModalReviewCount",
      modalErrorCount: "cmModalErrorCount",
      selectedCount: "cmSelectedCount",

      selectAllBtn: "cmSelectAllBtn",
      unselectAllBtn: "cmUnselectAllBtn",

      prevPageBtn: "cmPrevPageBtn",
      nextPageBtn: "cmNextPageBtn",
      pageInfo: "cmPageInfo",

      closeReviewBtn: "cmCloseReviewBtn",
      cancelReviewBtn: "cmCancelReviewBtn",
      addEventsBtn: "cmAddEventsBtn",

      editorBox: "cmEditorBox",
      editTitle: "cmEditTitle",
      editType: "cmEditType",
      editStartDate: "cmEditStartDate",
      editEndDate: "cmEditEndDate",
      editStartTime: "cmEditStartTime",
      editEndTime: "cmEditEndTime",
      editLocation: "cmEditLocation",
      editResponsible: "cmEditResponsible",
      editDescription: "cmEditDescription",
      saveEditBtn: "cmSaveEditBtn",
      confirmWarningBtn: "cmConfirmWarningBtn",
      cancelEditBtn: "cmCancelEditBtn"
    },

    SOURCE_TYPES: {
      AUTO: "auto",
      SCHEDULE: "schedule",
      DEFENSE: "defense",
      FLYER: "flyer",
      TABLE: "table",
      TEXT: "text",
      EXCEL: "excel",
      PDF: "pdf",
      WORD: "word",
      IMAGE: "image"
    },

    EVENT_TYPES: {
      EVENT: "event",
      PENDING: "pending",
      REMINDER: "reminder",
      DEFENSE: "defense",
      CLASS: "class",
      ACADEMIC: "academic"
    },

    EVENT_TYPE_LABELS: {
      event: "Evento",
      pending: "Pendiente",
      reminder: "Recordatorio",
      defense: "Defensa",
      class: "Clase",
      academic: "Académico"
    },

    REVIEW_STATUS: {
      OK: "ok",
      REVIEW: "review",
      ERROR: "error"
    },

    REVIEW_LABELS: {
      ok: "OK",
      review: "Revisar",
      error: "Error"
    },

    BATCH_STATUS: {
      DRAFT: "draft",
      REVIEW: "review",
      READY: "ready",
      IMPORTING: "importing",
      IMPORTED: "imported",
      UNDONE: "undone",
      ERROR: "error",
      CANCELLED: "cancelled"
    },

    CHANNELS: {
      LOCAL: "local",
      FIREBASE: "firebase",
      GOOGLE: "googleCalendar",
      MICROSOFT: "microsoftCalendar",
      TELEGRAM: "telegram",
      DESKTOP: "desktopNotifications"
    },

    CHANNEL_LABELS: {
      local: "Local",
      firebase: "Firebase",
      googleCalendar: "Google Calendar",
      microsoftCalendar: "Microsoft Calendar",
      telegram: "Telegram",
      desktopNotifications: "Notificaciones"
    },

    DEFAULT_CHANNELS: {
      local: true,
      firebase: true,
      googleCalendar: true,
      microsoftCalendar: true,
      telegram: true,
      desktopNotifications: true
    },

    DEFAULT_SETTINGS: {
      pageSize: 20,
      sourceType: "auto",
      reminders: {
        default: true,
        allDay: true,
        defense: true
      },
      channels: {
        local: true,
        firebase: true,
        googleCalendar: true,
        microsoftCalendar: true,
        telegram: true,
        desktopNotifications: true
      },
      requireReviewForWarnings: true,
      blockImportIfReviewOrError: true
    },

    REQUIRED_FIELDS: {
      BASE: ["title", "startDate"],
      DEFENSE: ["title", "startDate", "studentName", "career"]
    },

    DEFAULT_EVENT_VALUES: {
      type: "event",
      priority: "normal",
      selected: true,
      allDay: false,
      manualReviewed: false,
      source: "cargaMasiva",
      origin: "cargaMasiva",
      status: "active"
    },

    REMINDERS: {
      DEFAULT_OFFSETS: [
        { key: "5d", amount: -5, unit: "day", label: "5 días antes", time: "09:00" },
        { key: "3d", amount: -3, unit: "day", label: "3 días antes", time: "09:00" },
        { key: "1d", amount: -1, unit: "day", label: "1 día antes", time: "09:00" },
        { key: "0d", amount: 0, unit: "day", label: "Mismo día", time: "09:00" }
      ],

      ALL_DAY_TIMES: [
        { key: "allDay06", label: "Todo el día 06:00", time: "06:00" },
        { key: "allDay09", label: "Todo el día 09:00", time: "09:00" },
        { key: "allDay13", label: "Todo el día 13:00", time: "13:00" },
        { key: "allDay17", label: "Todo el día 17:00", time: "17:00" }
      ],

      DEFENSE_OFFSETS: [
        { key: "2d", amount: -2, unit: "day", label: "2 días antes", time: "09:00" },
        { key: "1d", amount: -1, unit: "day", label: "1 día antes", time: "09:00" },
        { key: "0d", amount: 0, unit: "day", label: "Mismo día", time: "07:00" }
      ]
    },

    FILES: {
      MAX_SIZE_MB: 30,
      ACCEPTED_EXTENSIONS: ["xlsx", "xls", "pdf", "docx", "png", "jpg", "jpeg", "webp"],
      IMAGE_EXTENSIONS: ["png", "jpg", "jpeg", "webp"],
      EXCEL_EXTENSIONS: ["xlsx", "xls"],
      PDF_EXTENSIONS: ["pdf"],
      WORD_EXTENSIONS: ["docx"]
    },

    PAGINATION: {
      DEFAULT_PAGE_SIZE: 20,
      PAGE_SIZE_OPTIONS: [10, 20, 30]
    },

    MESSAGES: {
      WAITING: "Esperando carga masiva...",
      PROCESSING: "Procesando información...",
      REVIEW_REQUIRED: "Revisa los eventos detectados antes de agregarlos.",
      EMPTY_INPUT: "Pega texto o selecciona un archivo antes de procesar.",
      IMPORT_OK: "Eventos agregados correctamente.",
      UNDO_OK: "Última carga masiva deshecha correctamente."
    }
  };

  CM.CONFIG = CONFIG;

  CM.safeString = function safeString(value) {
    return String(value || "").trim();
  };

  CM.nowISO = function nowISO() {
    return new Date().toISOString();
  };

  CM.createId = function createId(prefix) {
    const safePrefix = CM.safeString(prefix) || "cm";
    const random = Math.random().toString(36).slice(2, 9);
    return `${safePrefix}_${Date.now()}_${random}`;
  };

  CM.clone = function clone(value) {
    return JSON.parse(JSON.stringify(value));
  };
})(window);
