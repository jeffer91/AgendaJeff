/*
  Nombre completo: cm-input.service.js
  Ruta: carga-masiva/js/servicios/cm-input.service.js

  Función:
    - Leer los datos ingresados en la pantalla de Carga Masiva.
    - Obtener texto pegado, archivo seleccionado, nombre del lote y tipo de carga.
    - Leer opciones de recordatorios.
    - Leer canales seleccionados.
    - Guardar configuración base para futuras cargas.
    - No procesa ni valida eventos.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - cm-storage.js
    - cm-app.js
*/

(function initCmInputService(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function readChannels() {
    const checks = CM.UI.qsa('input[name="cmChannel"]');
    const channels = {
      ...CONFIG.DEFAULT_CHANNELS
    };

    checks.forEach((check) => {
      channels[check.value] = Boolean(check.checked);
    });

    channels.local = true;

    return channels;
  }

  function readReminders() {
    const reminderDefault = CM.UI.byId(CONFIG.DOM_IDS.reminderDefault);
    const reminderAllDay = CM.UI.byId(CONFIG.DOM_IDS.reminderAllDay);
    const reminderDefense = CM.UI.byId(CONFIG.DOM_IDS.reminderDefense);

    return {
      default: reminderDefault ? reminderDefault.checked : true,
      allDay: reminderAllDay ? reminderAllDay.checked : true,
      defense: reminderDefense ? reminderDefense.checked : true
    };
  }

  function readFile() {
    const input = CM.UI.byId(CONFIG.DOM_IDS.fileInput);

    if (!input || !input.files || !input.files.length) {
      return null;
    }

    return input.files[0];
  }

  function readPageSize() {
    const value = Number(CM.UI.getValue(CONFIG.DOM_IDS.pageSize));

    if (!Number.isFinite(value) || value <= 0) {
      return CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
    }

    return value;
  }

  function readInput() {
    const file = readFile();

    return {
      batchName: CM.UI.getValue(CONFIG.DOM_IDS.batchName),
      sourceType: CM.UI.getValue(CONFIG.DOM_IDS.sourceType) || CONFIG.SOURCE_TYPES.AUTO,
      pageSize: readPageSize(),
      text: CM.UI.getValue(CONFIG.DOM_IDS.pasteText),
      file,
      fileName: file ? file.name : "",
      channels: readChannels(),
      reminders: readReminders()
    };
  }

  function applySettings(settings) {
    const safeSettings = settings || CONFIG.DEFAULT_SETTINGS;

    CM.UI.setValue(CONFIG.DOM_IDS.sourceType, safeSettings.sourceType || CONFIG.SOURCE_TYPES.AUTO);
    CM.UI.setValue(CONFIG.DOM_IDS.pageSize, String(safeSettings.pageSize || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE));

    const reminderDefault = CM.UI.byId(CONFIG.DOM_IDS.reminderDefault);
    const reminderAllDay = CM.UI.byId(CONFIG.DOM_IDS.reminderAllDay);
    const reminderDefense = CM.UI.byId(CONFIG.DOM_IDS.reminderDefense);

    if (reminderDefault) {
      reminderDefault.checked = safeSettings.reminders.default !== false;
    }

    if (reminderAllDay) {
      reminderAllDay.checked = safeSettings.reminders.allDay !== false;
    }

    if (reminderDefense) {
      reminderDefense.checked = safeSettings.reminders.defense !== false;
    }

    const checks = CM.UI.qsa('input[name="cmChannel"]');

    checks.forEach((check) => {
      if (check.value === CONFIG.CHANNELS.LOCAL) {
        check.checked = true;
        return;
      }

      check.checked = safeSettings.channels[check.value] !== false;
    });
  }

  function detectTextKind(text) {
    const value = CM.safeString(text).toLowerCase();

    if (!value) {
      return CONFIG.SOURCE_TYPES.TEXT;
    }

    if (
      value.includes("aula") &&
      value.includes("cédula") &&
      value.includes("tribunal")
    ) {
      return CONFIG.SOURCE_TYPES.DEFENSE;
    }

    if (
      value.includes("actividad") &&
      value.includes("fecha inicio") &&
      value.includes("fecha fin")
    ) {
      return CONFIG.SOURCE_TYPES.SCHEDULE;
    }

    if (
      value.includes("metodología") ||
      value.includes("metodologia") ||
      value.includes("tutoría") ||
      value.includes("tutoria")
    ) {
      return CONFIG.SOURCE_TYPES.FLYER;
    }

    if (value.includes("\t") || value.includes("|")) {
      return CONFIG.SOURCE_TYPES.TABLE;
    }

    return CONFIG.SOURCE_TYPES.TEXT;
  }

  CM.InputService = {
    readChannels,
    readReminders,
    readFile,
    readPageSize,
    readInput,
    applySettings,
    detectTextKind
  };
})(window);