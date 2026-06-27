/*
  Nombre completo: gc-time.js
  Ruta: modulos/googlecalendar/utils/gc-time.js

  Función:
    - Centralizar utilidades de fecha y hora para Google Calendar.
    - Generar fechas ISO consistentes para Firebase, localStorage y diagnóstico.
    - Preparar funciones reutilizables para eventos de calendario.

  Se conecta con:
    - modulos/googlecalendar/config/gc-config.js
    - futuras capas storage, Firebase, API y diagnóstico
*/

(function initGoogleCalendarTimeUtils(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const googleCalendar = root.GoogleCalendar = root.GoogleCalendar || {};
  const utils = googleCalendar.Utils = googleCalendar.Utils || {};

  function nowIso() {
    return new Date().toISOString();
  }

  function isValidDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    return !Number.isNaN(date.getTime());
  }

  function toIso(value, fallback) {
    if (isValidDate(value)) {
      return new Date(value).toISOString();
    }

    if (fallback && isValidDate(fallback)) {
      return new Date(fallback).toISOString();
    }

    return "";
  }

  function toDateInputValue(value) {
    if (!isValidDate(value)) {
      return "";
    }

    return new Date(value).toISOString().slice(0, 10);
  }

  function toTimeInputValue(value) {
    if (!isValidDate(value)) {
      return "";
    }

    return new Date(value).toISOString().slice(11, 16);
  }

  function addMinutes(value, minutes) {
    const date = isValidDate(value) ? new Date(value) : new Date();
    const safeMinutes = Number.isFinite(Number(minutes)) ? Number(minutes) : 0;

    date.setMinutes(date.getMinutes() + safeMinutes);
    return date.toISOString();
  }

  function createTimestampPayload(value) {
    const checkedAt = toIso(value) || nowIso();

    return {
      checkedAt,
      updatedAt: checkedAt,
      actualizadoEn: checkedAt
    };
  }

  utils.Time = Object.freeze({
    nowIso,
    isValidDate,
    toIso,
    toDateInputValue,
    toTimeInputValue,
    addMinutes,
    createTimestampPayload
  });
})(window);
