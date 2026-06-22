/*
  Nombre completo: cm-text.parser.js
  Ruta: carga-masiva/js/parsers/cm-text.parser.js

  Función:
    - Procesar texto libre pegado en Carga Masiva.
    - Detectar eventos simples desde líneas con fechas.
    - Detectar horarios escritos en texto.
    - Servir como parser de respaldo cuando otro parser no detecta eventos.
    - Devolver eventos crudos para que NormalizerService los convierta al formato estándar.
    - No valida ni guarda eventos.

  Se conecta con:
    - cm-config.js
    - servicios/cm-normalizer.service.js
    - servicios/cm-parser.service.js
    - cm-app.js
*/

(function initCmTextParser(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function splitLines(text) {
    return CM.safeString(text)
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function extractDate(line) {
    const match = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);

    return match ? match[1] : "";
  }

  function extractSecondDate(line) {
    const matches = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g);

    if (!matches || matches.length < 2) {
      return "";
    }

    return matches[1];
  }

  function extractTimeRange(line) {
    const value = line.toLowerCase();

    const rangeMatch = value.match(
      /(\d{1,2}\s*(?::|h)?\s*\d{0,2}\s*(?:am|pm|a\.m|p\.m)?)\s*(?:a|-|hasta)\s*(\d{1,2}\s*(?::|h)?\s*\d{0,2}\s*(?:am|pm|a\.m|p\.m)?)/i
    );

    if (rangeMatch) {
      return `${rangeMatch[1]} a ${rangeMatch[2]}`;
    }

    const singleMatch = value.match(/(\d{1,2}\s*(?::|h)\s*\d{2}\s*(?:am|pm|a\.m|p\.m)?|\d{1,2}\s*(?:am|pm|a\.m|p\.m))/i);

    return singleMatch ? singleMatch[1] : "";
  }

  function removeKnownTokens(line) {
    return line
      .replace(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g, "")
      .replace(/(\d{1,2}\s*(?::|h)?\s*\d{0,2}\s*(?:am|pm|a\.m|p\.m)?)\s*(?:a|-|hasta)\s*(\d{1,2}\s*(?::|h)?\s*\d{0,2}\s*(?:am|pm|a\.m|p\.m)?)/gi, "")
      .replace(/fecha límite/gi, "")
      .replace(/fecha limite/gi, "")
      .replace(/fecha/gi, "")
      .replace(/hora/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectTypeFromLine(line) {
    const value = line.toLowerCase();

    if (value.includes("defensa")) {
      return CONFIG.EVENT_TYPES.DEFENSE;
    }

    if (
      value.includes("metodología") ||
      value.includes("metodologia") ||
      value.includes("clase")
    ) {
      return CONFIG.EVENT_TYPES.CLASS;
    }

    if (
      value.includes("núcleo") ||
      value.includes("nucleo") ||
      value.includes("complexivo") ||
      value.includes("supletorio") ||
      value.includes("requisitos")
    ) {
      return CONFIG.EVENT_TYPES.ACADEMIC;
    }

    return CONFIG.EVENT_TYPES.EVENT;
  }

  function parseLine(line, index) {
    const date = extractDate(line);

    if (!date) {
      return null;
    }

    const secondDate = extractSecondDate(line);
    const timeRange = extractTimeRange(line);
    const title = removeKnownTokens(line) || `Evento detectado ${index + 1}`;

    return {
      id: CM.createId("cm_raw_text"),
      type: detectTypeFromLine(line),
      title,
      startDate: date,
      endDate: secondDate || date,
      timeRange,
      raw: line,
      line: index + 1,
      sourceType: CONFIG.SOURCE_TYPES.TEXT
    };
  }

  function parseFlyerStyleBlocks(lines) {
    const joined = lines.join(" ");
    const events = [];

    const metodologiaMatches = joined.match(/metodolog[ií]a\s*\d/gi);

    if (metodologiaMatches && metodologiaMatches.length > 1) {
      lines.forEach((line, index) => {
        const event = parseLine(line, index);

        if (event) {
          events.push({
            ...event,
            type: CONFIG.EVENT_TYPES.CLASS,
            title: event.title.toLowerCase().includes("metodolog")
              ? event.title
              : `Clase de metodología - ${event.title}`
          });
        }
      });
    }

    return events;
  }

  async function parse(text, payload) {
    const lines = splitLines(text);
    const warnings = [];

    if (!lines.length) {
      return {
        sourceType: CONFIG.SOURCE_TYPES.TEXT,
        events: [],
        warnings: ["No hay texto para procesar."]
      };
    }

    const flyerEvents = parseFlyerStyleBlocks(lines);

    if (flyerEvents.length) {
      return {
        sourceType: CONFIG.SOURCE_TYPES.TEXT,
        events: flyerEvents,
        warnings
      };
    }

    const events = lines
      .map((line, index) => parseLine(line, index))
      .filter(Boolean);

    if (!events.length) {
      warnings.push("Texto leído, pero no se encontraron fechas claras.");
    }

    return {
      sourceType: CONFIG.SOURCE_TYPES.TEXT,
      events,
      warnings,
      period: "",
      phase: ""
    };
  }

  CM.TextParser = {
    splitLines,
    extractDate,
    extractSecondDate,
    extractTimeRange,
    removeKnownTokens,
    detectTypeFromLine,
    parseLine,
    parse
  };
})(window);