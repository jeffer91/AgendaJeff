/*
  Nombre completo: aj-date.js
  Ruta: core/utils/aj-date.js

  Función:
    - Normalizar fechas y horas para consultas locales de AgendaJeff.
*/

"use strict";

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayIsoDate(referenceDate) {
  const date = referenceDate instanceof Date ? referenceDate : new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeDate(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return todayIsoDate(date);
}

function normalizeTime(value) {
  if (!value) return "";
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hour = Math.max(0, Math.min(23, Number(match[1])));
  const minute = Math.max(0, Math.min(59, Number(match[2])));
  return `${pad(hour)}:${pad(minute)}`;
}

function compareIsoDate(a, b) {
  return normalizeDate(a).localeCompare(normalizeDate(b));
}

function isDateBetween(dateValue, startValue, endValue) {
  const date = normalizeDate(dateValue);
  const start = normalizeDate(startValue);
  const end = normalizeDate(endValue);

  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

module.exports = Object.freeze({ todayIsoDate, normalizeDate, normalizeTime, compareIsoDate, isDateBetween });
