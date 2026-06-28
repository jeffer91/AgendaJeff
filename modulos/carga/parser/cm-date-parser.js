/* cm-date-parser.js · Fechas y horas locales para Carga Masiva */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  function pad(value) { return String(value).padStart(2, "0"); }

  function normalizeDate(day, month, year) {
    const d = Number(day);
    const m = Number(month);
    let y = Number(year);
    if (!d || !m || !y) return "";
    if (y < 100) y += 2000;
    if (m < 1 || m > 12 || d < 1 || d > 31) return "";
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  function firstDate(text) {
    const value = String(text || "");
    let match = value.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
    if (match) return normalizeDate(match[3], match[2], match[1]);
    match = value.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/);
    if (match) return normalizeDate(match[1], match[2], match[3]);
    return "";
  }

  function firstTime(text) {
    const match = String(text || "").match(/\b(\d{1,2}):(\d{2})\b/);
    if (!match) return "";
    const hour = Math.max(0, Math.min(23, Number(match[1])));
    const minute = Math.max(0, Math.min(59, Number(match[2])));
    return `${pad(hour)}:${pad(minute)}`;
  }

  function allTimes(text) {
    const output = [];
    const pattern = /\b(\d{1,2}):(\d{2})\b/g;
    let match = pattern.exec(String(text || ""));
    while (match) {
      output.push(`${pad(Math.max(0, Math.min(23, Number(match[1]))))}:${pad(Math.max(0, Math.min(59, Number(match[2]))))}`);
      match = pattern.exec(String(text || ""));
    }
    return output;
  }

  function removeKnownDateTime(text) {
    return String(text || "")
      .replace(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/g, " ")
      .replace(/\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/g, " ")
      .replace(/\b\d{1,2}:\d{2}\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  carga.dateParser = Object.freeze({ firstDate, firstTime, allTimes, removeKnownDateTime });
})(window);
