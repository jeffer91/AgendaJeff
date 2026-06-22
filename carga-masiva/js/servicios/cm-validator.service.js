/*
  Nombre completo: cm-validator.service.js
  Ruta: carga-masiva/js/servicios/cm-validator.service.js

  Función:
    - Validar eventos normalizados por Carga Masiva.
    - Marcar eventos como OK, Revisión o Error.
    - Bloquear importación si hay eventos seleccionados con error rojo.
    - Aplicar la regla actual:
      * Rojos: se deben corregir obligatoriamente.
      * Amarillos: se muestran como revisión visual, pero sí se pueden agregar.
      * Solo se bloquea Agregar eventos cuando hay errores rojos seleccionados.
    - No guarda ni importa eventos.

  Se conecta con:
    - cm-config.js
    - cm-normalizer.service.js
    - cm-ui.js
    - cm-review.service.js
    - cm-import.service.js
*/

(function initCmValidatorService(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function isValidISODate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  function isValidTime(value) {
    if (!value) {
      return true;
    }

    if (!/^\d{2}:\d{2}$/.test(value)) {
      return false;
    }

    const [hour, minute] = value.split(":").map(Number);

    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }

  function compareDates(startDate, endDate) {
    if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
      return 0;
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (start.getTime() === end.getTime()) {
      return 0;
    }

    return start.getTime() < end.getTime() ? -1 : 1;
  }

  function compareTimes(startTime, endTime) {
    if (!startTime || !endTime || !isValidTime(startTime) || !isValidTime(endTime)) {
      return 0;
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    if (start === end) {
      return 0;
    }

    return start < end ? -1 : 1;
  }

  function hasValue(value) {
    return String(value || "").trim() !== "";
  }

  function pushUnique(list, value) {
    if (value && !list.includes(value)) {
      list.push(value);
    }
  }

  function validateBase(event, errors, warnings) {
    if (!hasValue(event.title)) {
      pushUnique(errors, "Falta el título del evento.");
    }

    if (!event.startDate) {
      pushUnique(errors, "Falta la fecha de inicio.");
    } else if (!isValidISODate(event.startDate)) {
      pushUnique(errors, "La fecha de inicio no es válida.");
    }

    if (event.endDate && !isValidISODate(event.endDate)) {
      pushUnique(errors, "La fecha fin no es válida.");
    }

    if (event.startDate && event.endDate && compareDates(event.startDate, event.endDate) > 0) {
      pushUnique(errors, "La fecha fin no puede ser anterior a la fecha de inicio.");
    }

    if (!isValidTime(event.startTime)) {
      pushUnique(errors, "La hora de inicio no es válida.");
    }

    if (!isValidTime(event.endTime)) {
      pushUnique(errors, "La hora fin no es válida.");
    }

    if (
      !event.allDay &&
      event.startTime &&
      event.endTime &&
      compareTimes(event.startTime, event.endTime) >= 0
    ) {
      pushUnique(errors, "La hora fin debe ser posterior a la hora de inicio.");
    }

    if (!event.allDay && event.startTime && !event.endTime) {
      pushUnique(warnings, "Tiene hora de inicio, pero no hora fin.");
    }

    if (!event.allDay && !event.startTime && event.endTime) {
      pushUnique(warnings, "Tiene hora fin, pero no hora de inicio.");
    }
  }

  function validateDefense(event, errors, warnings) {
    if (event.type !== CONFIG.EVENT_TYPES.DEFENSE) {
      return;
    }

    if (!hasValue(event.studentName)) {
      pushUnique(errors, "La defensa no tiene nombre del estudiante.");
    }

    if (!hasValue(event.career)) {
      pushUnique(errors, "La defensa no tiene carrera.");
    }

    if (!hasValue(event.location)) {
      pushUnique(warnings, "La defensa no tiene aula, sede o modalidad.");
    }

    if (!hasValue(event.tribunal1)) {
      pushUnique(warnings, "La defensa no tiene Tribunal 1.");
    }

    if (!hasValue(event.tribunal2)) {
      pushUnique(warnings, "La defensa no tiene Tribunal 2.");
    }

    if (event.allDay) {
      pushUnique(warnings, "La defensa no tiene horario; revisa si debe ser todo el día.");
    }
  }

  function validateResponsible(event, warnings) {
    if (!hasValue(event.responsible)) {
      pushUnique(warnings, "No tiene responsable asignado.");
    }
  }

  function validateSource(event, warnings) {
    const sourceType = event.sourceMeta && event.sourceMeta.sourceType;

    if (sourceType === CONFIG.SOURCE_TYPES.IMAGE) {
      pushUnique(warnings, "Este evento viene de imagen/OCR; requiere revisión manual.");
    }

    if (sourceType === CONFIG.SOURCE_TYPES.PDF) {
      pushUnique(warnings, "Este evento viene de PDF; revisa que la lectura sea correcta.");
    }
  }

  function getReviewStatus(errors, warnings, manualReviewed) {
    if (errors.length) {
      return CONFIG.REVIEW_STATUS.ERROR;
    }

    if (warnings.length && !manualReviewed) {
      return CONFIG.REVIEW_STATUS.REVIEW;
    }

    return CONFIG.REVIEW_STATUS.OK;
  }

  function validateEvent(event) {
    const safeEvent = event || {};
    const errors = [];
    const warnings = [];

    validateBase(safeEvent, errors, warnings);
    validateDefense(safeEvent, errors, warnings);
    validateResponsible(safeEvent, warnings);
    validateSource(safeEvent, warnings);

    return {
      ...safeEvent,
      errors,
      warnings,
      reviewStatus: getReviewStatus(errors, warnings, Boolean(safeEvent.manualReviewed)),
      updatedAt: CM.nowISO()
    };
  }

  function validateEvents(events) {
    return (Array.isArray(events) ? events : []).map(validateEvent);
  }

  function getSummary(events) {
    const safeEvents = Array.isArray(events) ? events : [];
    const selectedEvents = safeEvents.filter((event) => event.selected !== false);

    return {
      total: safeEvents.length,
      selected: selectedEvents.length,

      ok: safeEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.OK).length,
      review: safeEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.REVIEW).length,
      error: safeEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.ERROR).length,

      selectedOk: selectedEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.OK).length,
      selectedReview: selectedEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.REVIEW).length,
      selectedError: selectedEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.ERROR).length
    };
  }

  function canImport(events) {
    const summary = getSummary(events);

    return {
      ok: summary.selected > 0 && summary.selectedError === 0,
      summary,
      message:
        summary.selected === 0
          ? "No hay eventos seleccionados."
          : summary.selectedError > 0
            ? CONFIG.MESSAGES.BLOCKED_BY_ERROR
            : CONFIG.MESSAGES.READY_TO_IMPORT
    };
  }

  function markManualReviewed(event) {
    const nextEvent = {
      ...(event || {}),
      manualReviewed: true
    };

    return validateEvent(nextEvent);
  }

  function markManyManualReviewed(events, eventIds) {
    const ids = Array.isArray(eventIds) ? eventIds : [];

    return (Array.isArray(events) ? events : []).map((event) => {
      if (!ids.includes(event.id)) {
        return event;
      }

      return markManualReviewed(event);
    });
  }

  CM.ValidatorService = {
    isValidISODate,
    isValidTime,
    compareDates,
    compareTimes,

    validateEvent,
    validateEvents,

    getSummary,
    canImport,

    markManualReviewed,
    markManyManualReviewed
  };
})(window);