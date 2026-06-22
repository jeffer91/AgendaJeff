/*
  Nombre completo: cm-event-editor.component.js
  Ruta: carga-masiva/js/componentes/cm-event-editor.component.js

  Función:
    - Controlar el editor manual de eventos detectados.
    - Cargar un evento en el formulario de edición.
    - Leer correcciones realizadas por el usuario.
    - Limpiar y cerrar editor.
    - Validar campos mínimos visualmente antes de enviar a ReviewService.
    - No guarda en localStorage ni importa eventos.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - servicios/cm-validator.service.js
    - servicios/cm-review.service.js
    - componentes/cm-review-modal.component.js
    - cm-app.js
*/

(function initCmEventEditorComponent(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  CM.Components = CM.Components || {};

  const CONFIG = CM.CONFIG;

  function getBox() {
    return CM.UI.byId(CONFIG.DOM_IDS.editorBox);
  }

  function isOpen() {
    const box = getBox();

    return Boolean(box && !box.classList.contains("cm-hidden"));
  }

  function open(event) {
    if (!event) {
      CM.UI.toastWarning("No hay evento para editar.");
      return;
    }

    CM.UI.fillEditor(event);
  }

  function close() {
    CM.UI.clearEditor();
  }

  function read() {
    return CM.UI.readEditor();
  }

  function getEditingEventId() {
    const box = getBox();

    return box ? box.dataset.cmEditingEventId || "" : "";
  }

  function validateEditorData(data) {
    const errors = [];
    const warnings = [];

    if (!data || !data.id) {
      errors.push("No hay evento seleccionado.");
    }

    if (!data.title) {
      errors.push("Falta el título.");
    }

    if (!data.startDate) {
      errors.push("Falta la fecha de inicio.");
    } else if (!CM.ValidatorService.isValidISODate(data.startDate)) {
      errors.push("La fecha de inicio no es válida.");
    }

    if (data.endDate && !CM.ValidatorService.isValidISODate(data.endDate)) {
      errors.push("La fecha fin no es válida.");
    }

    if (data.startTime && !CM.ValidatorService.isValidTime(data.startTime)) {
      errors.push("La hora de inicio no es válida.");
    }

    if (data.endTime && !CM.ValidatorService.isValidTime(data.endTime)) {
      errors.push("La hora fin no es válida.");
    }

    if (!data.responsible) {
      warnings.push("No tiene responsable.");
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings
    };
  }

  function readAndValidate() {
    const data = read();
    const validation = validateEditorData(data);

    return {
      data,
      validation
    };
  }

  function showValidationResult(validation) {
    if (!validation) {
      return;
    }

    if (!validation.ok) {
      CM.UI.toastError(validation.errors[0] || "Hay errores en el editor.");
      return;
    }

    if (validation.warnings.length) {
      CM.UI.toastWarning(validation.warnings[0]);
      return;
    }

    CM.UI.toastSuccess("Evento listo para guardar.");
  }

  function focusTitle() {
    const input = CM.UI.byId(CONFIG.DOM_IDS.editTitle);

    if (input) {
      input.focus();
    }
  }

  CM.Components.EventEditor = {
    getBox,
    isOpen,
    open,
    close,
    read,
    getEditingEventId,
    validateEditorData,
    readAndValidate,
    showValidationResult,
    focusTitle
  };
})(window);