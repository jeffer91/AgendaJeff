/*
  Nombre completo: cm-options-panel.component.js
  Ruta: carga-masiva/js/componentes/cm-options-panel.component.js

  Función:
    - Controlar el panel de opciones de Carga Masiva.
    - Leer nombre del lote, tipo de carga, tamaño de página, recordatorios y canales.
    - Aplicar configuración guardada.
    - Preparar opciones que serán usadas por App, ParserService e ImportService.
    - No procesa ni importa eventos.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - cm-storage.js
    - servicios/cm-input.service.js
    - cm-app.js
    - cm-bindings.js
*/

(function initCmOptionsPanelComponent(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  CM.Components = CM.Components || {};

  const CONFIG = CM.CONFIG;

  function readBatchName() {
    return CM.UI.getValue(CONFIG.DOM_IDS.batchName);
  }

  function setBatchName(value) {
    CM.UI.setValue(CONFIG.DOM_IDS.batchName, value || "");
  }

  function readSourceType() {
    return CM.UI.getValue(CONFIG.DOM_IDS.sourceType) || CONFIG.SOURCE_TYPES.AUTO;
  }

  function setSourceType(value) {
    CM.UI.setValue(CONFIG.DOM_IDS.sourceType, value || CONFIG.SOURCE_TYPES.AUTO);
  }

  function readPageSize() {
    const value = Number(CM.UI.getValue(CONFIG.DOM_IDS.pageSize));

    if (!Number.isFinite(value) || value <= 0) {
      return CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
    }

    return value;
  }

  function setPageSize(value) {
    CM.UI.setValue(CONFIG.DOM_IDS.pageSize, String(value || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE));
  }

  function readReminders() {
    if (CM.InputService && typeof CM.InputService.readReminders === "function") {
      return CM.InputService.readReminders();
    }

    return {
      ...CONFIG.DEFAULT_SETTINGS.reminders
    };
  }

  function readChannels() {
    if (CM.InputService && typeof CM.InputService.readChannels === "function") {
      return CM.InputService.readChannels();
    }

    return {
      ...CONFIG.DEFAULT_CHANNELS
    };
  }

  function readOptions() {
    return {
      batchName: readBatchName(),
      sourceType: readSourceType(),
      pageSize: readPageSize(),
      reminders: readReminders(),
      channels: readChannels()
    };
  }

  function applySettings(settings) {
    const safeSettings = settings || CM.Storage.getSettings();

    if (CM.InputService && typeof CM.InputService.applySettings === "function") {
      CM.InputService.applySettings(safeSettings);
      return safeSettings;
    }

    setSourceType(safeSettings.sourceType || CONFIG.SOURCE_TYPES.AUTO);
    setPageSize(safeSettings.pageSize || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE);

    return safeSettings;
  }

  function saveCurrentSettings() {
    const options = readOptions();

    return CM.Storage.saveSettings({
      sourceType: options.sourceType,
      pageSize: options.pageSize,
      reminders: options.reminders,
      channels: options.channels
    });
  }

  function resetToDefaults() {
    const defaults = CONFIG.DEFAULT_SETTINGS;

    setBatchName("");
    setSourceType(defaults.sourceType);
    setPageSize(defaults.pageSize);

    CM.Storage.saveSettings(defaults);
    applySettings(defaults);

    return defaults;
  }

  function createAutomaticBatchName(sourceType) {
    const today = new Date().toLocaleDateString("es-EC");

    if (sourceType === CONFIG.SOURCE_TYPES.DEFENSE) {
      return `Carga de defensas ${today}`;
    }

    if (sourceType === CONFIG.SOURCE_TYPES.SCHEDULE) {
      return `Cronograma académico ${today}`;
    }

    if (sourceType === CONFIG.SOURCE_TYPES.IMAGE) {
      return `Carga desde imagen ${today}`;
    }

    if (sourceType === CONFIG.SOURCE_TYPES.EXCEL) {
      return `Carga desde Excel ${today}`;
    }

    return `Carga masiva ${today}`;
  }

  function ensureBatchName() {
    const current = readBatchName();

    if (current) {
      return current;
    }

    const sourceType = readSourceType();
    const name = createAutomaticBatchName(sourceType);
    setBatchName(name);

    return name;
  }

  CM.Components.OptionsPanel = {
    readBatchName,
    setBatchName,

    readSourceType,
    setSourceType,

    readPageSize,
    setPageSize,

    readReminders,
    readChannels,
    readOptions,

    applySettings,
    saveCurrentSettings,
    resetToDefaults,

    createAutomaticBatchName,
    ensureBatchName
  };
})(window);