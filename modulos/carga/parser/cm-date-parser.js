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

  function allDates(text) {
    const value = String(text || "");
    const output = [];
    const seen = new Set();
    const patterns = [
      /\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/g,
      /\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/g
    ];

    patterns.forEach(function eachPattern(pattern, index) {
      let match = pattern.exec(value);
      while (match) {
        const date = index === 0 ? normalizeDate(match[3], match[2], match[1]) : normalizeDate(match[1], match[2], match[3]);
        if (date && !seen.has(date)) {
          seen.add(date);
          output.push(date);
        }
        match = pattern.exec(value);
      }
    });

    return output;
  }

  function meridianOf(token) {
    const match = String(token || "").toLowerCase().match(/\b(am|pm)\b/);
    return match ? match[1] : "";
  }

  function normalizeTimeToken(token, fallbackMeridian) {
    const value = String(token || "").toLowerCase().replace(/\./g, "").trim();
    const match = value.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
    if (!match) return "";
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridian = match[3] || fallbackMeridian || "";
    if (hour > 24 || minute > 59) return "";
    if (meridian === "pm" && hour < 12) hour += 12;
    if (meridian === "am" && hour === 12) hour = 0;
    if (hour === 24 && minute === 0) hour = 0;
    if (hour > 23) return "";
    return `${pad(hour)}:${pad(minute)}`;
  }

  function allTimes(text) {
    const output = [];
    const seen = new Set();
    const value = String(text || "").toLowerCase().replace(/\./g, "");
    const pattern = /\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\b/g;
    let match = pattern.exec(value);
    while (match) {
      const time = normalizeTimeToken(match[1]);
      if (time && !seen.has(time)) {
        seen.add(time);
        output.push(time);
      }
      match = pattern.exec(value);
    }
    return output;
  }

  function timeRange(text) {
    const value = String(text || "").toLowerCase().replace(/\./g, "");
    const range = value.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:a|hasta|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/);
    if (range) {
      const firstMeridian = meridianOf(range[1]);
      const secondMeridian = meridianOf(range[2]);
      const inferredForStart = firstMeridian || secondMeridian;
      const inferredForEnd = secondMeridian || firstMeridian;
      const start = normalizeTimeToken(range[1], inferredForStart);
      const end = normalizeTimeToken(range[2], inferredForEnd);
      if (start || end) return { horaInicio: start, horaFin: end };
    }
    const times = allTimes(value);
    return { horaInicio: times[0] || "", horaFin: times[1] || "" };
  }

  function removeKnownDateTime(text) {
    return String(text || "")
      .replace(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/g, " ")
      .replace(/\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/g, " ")
      .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:a|hasta|-)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, " ")
      .replace(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi, " ")
      .replace(/\b\d{1,2}\s*(?:am|pm)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  carga.dateParser = Object.freeze({ normalizeDate, firstDate, allDates, normalizeTimeToken, allTimes, timeRange, removeKnownDateTime });
})(window);
