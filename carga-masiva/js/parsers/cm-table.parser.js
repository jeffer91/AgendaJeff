/*
  Nombre completo: cm-table.parser.js
  Ruta: carga-masiva/js/parsers/cm-table.parser.js

  Función:
    - Procesar tablas pegadas desde Excel, Word, PDF, páginas web o texto.
    - Detectar encabezados.
    - Convertir filas en objetos crudos.
    - Delegar a parser de cronograma o defensas si detecta esas estructuras.
    - Servir como parser general para tablas no específicas.
    - No valida ni guarda eventos.

  Se conecta con:
    - cm-config.js
    - servicios/cm-normalizer.service.js
    - servicios/cm-parser.service.js
    - parsers/cm-schedule.parser.js
    - parsers/cm-defense.parser.js
    - parsers/cm-text.parser.js
    - cm-app.js
*/

(function initCmTableParser(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function normalizeHeader(value) {
    return CM.safeString(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function splitLines(text) {
    return CM.safeString(text)
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function detectSeparator(line) {
    if (line.includes("\t")) {
      return "\t";
    }

    if (line.includes("|")) {
      return "|";
    }

    if (line.includes(";")) {
      return ";";
    }

    if (line.includes(",")) {
      const commaCount = (line.match(/,/g) || []).length;
      if (commaCount >= 2) {
        return ",";
      }
    }

    return "multiSpace";
  }

  function splitRow(line, separator) {
    const safeLine = CM.safeString(line);

    if (!safeLine) {
      return [];
    }

    if (separator === "multiSpace") {
      return safeLine
        .split(/\s{2,}/)
        .map((cell) => cell.trim());
    }

    return safeLine
      .split(separator)
      .map((cell) => cell.trim());
  }

  function looksLikeHeader(cells) {
    const headers = cells.map(normalizeHeader).join(" ");

    const hasScheduleHeaders =
      headers.includes("actividad") &&
      headers.includes("fecha inicio") &&
      headers.includes("fecha fin");

    const hasDefenseHeaders =
      headers.includes("aula") &&
      (headers.includes("dia") || headers.includes("día")) &&
      headers.includes("hora") &&
      headers.includes("nombre") &&
      headers.includes("carrera");

    return hasScheduleHeaders || hasDefenseHeaders;
  }

  function detectTableTypeFromHeaders(headers) {
    const normalized = headers.map(normalizeHeader);
    const joined = normalized.join(" ");

    if (
      joined.includes("aula") &&
      joined.includes("hora") &&
      joined.includes("nombre") &&
      joined.includes("carrera")
    ) {
      return CONFIG.SOURCE_TYPES.DEFENSE;
    }

    if (
      joined.includes("actividad") &&
      joined.includes("fecha inicio") &&
      joined.includes("fecha fin")
    ) {
      return CONFIG.SOURCE_TYPES.SCHEDULE;
    }

    return CONFIG.SOURCE_TYPES.TABLE;
  }

  function buildRowsFromTable(text) {
    const lines = splitLines(text);
    const rows = [];
    let headers = [];
    let separator = "";

    lines.forEach((line, index) => {
      const detectedSeparator = detectSeparator(line);
      const cells = splitRow(line, detectedSeparator);

      if (!cells.length) {
        return;
      }

      if (looksLikeHeader(cells)) {
        headers = cells;
        separator = detectedSeparator;
        return;
      }

      if (!headers.length) {
        if (cells.length >= 3 && index === 0) {
          headers = cells;
          separator = detectedSeparator;
        }

        return;
      }

      const activeSeparator = separator || detectedSeparator;
      const activeCells = splitRow(line, activeSeparator);

      if (!activeCells.length) {
        return;
      }

      const row = {};

      headers.forEach((header, headerIndex) => {
        row[header] = activeCells[headerIndex] || "";
      });

      row.__line = index + 1;
      row.__raw = line;
      rows.push(row);
    });

    return {
      headers,
      rows,
      tableType: detectTableTypeFromHeaders(headers)
    };
  }

  function getValue(row, possibleHeaders) {
    const keys = Object.keys(row || {});

    for (const possibleHeader of possibleHeaders) {
      const normalizedPossible = normalizeHeader(possibleHeader);
      const foundKey = keys.find((key) => normalizeHeader(key) === normalizedPossible);

      if (foundKey) {
        return row[foundKey];
      }
    }

    return "";
  }

  function parseGenericRows(rows) {
    return rows.map((row, index) => {
      const title =
        getValue(row, ["Actividad", "Título", "Titulo", "Nombre", "Descripción", "Descripcion"]) ||
        `Evento de tabla ${index + 1}`;

      const startDate =
        getValue(row, ["Fecha inicio", "Fecha", "Día", "Dia", "Inicio"]) ||
        "";

      const endDate =
        getValue(row, ["Fecha fin", "Fin", "Fecha final"]) ||
        startDate;

      const timeRange =
        getValue(row, ["Hora", "Horario", "Tiempo"]) ||
        "";

      return {
        id: CM.createId("cm_raw_table"),
        type: CONFIG.EVENT_TYPES.EVENT,
        title,
        startDate,
        endDate,
        timeRange,
        location: getValue(row, ["Lugar", "Ubicación", "Ubicacion", "Sede", "Aula"]),
        responsible: getValue(row, ["Responsable", "Encargado"]),
        notes: getValue(row, ["Observación", "Observacion", "Notas"]),
        raw: row.__raw || row,
        line: row.__line || index + 1,
        sourceType: CONFIG.SOURCE_TYPES.TABLE
      };
    });
  }

  async function parse(text, payload) {
    const safeText = CM.safeString(text);
    const warnings = [];

    if (!safeText) {
      return {
        sourceType: CONFIG.SOURCE_TYPES.TABLE,
        events: [],
        warnings: ["No hay tabla para procesar."]
      };
    }

    const table = buildRowsFromTable(safeText);

    if (!table.rows.length) {
      warnings.push("No se encontraron filas útiles en la tabla.");

      if (CM.TextParser) {
        return CM.TextParser.parse(safeText, payload);
      }

      return {
        sourceType: CONFIG.SOURCE_TYPES.TABLE,
        events: [],
        warnings
      };
    }

    if (table.tableType === CONFIG.SOURCE_TYPES.DEFENSE && CM.DefenseParser) {
      return CM.DefenseParser.parse(safeText, {
        ...(payload || {}),
        table
      });
    }

    if (table.tableType === CONFIG.SOURCE_TYPES.SCHEDULE && CM.ScheduleParser) {
      return CM.ScheduleParser.parse(safeText, {
        ...(payload || {}),
        table
      });
    }

    return {
      sourceType: CONFIG.SOURCE_TYPES.TABLE,
      events: parseGenericRows(table.rows),
      warnings,
      period: "",
      phase: ""
    };
  }

  CM.TableParser = {
    normalizeHeader,
    splitLines,
    detectSeparator,
    splitRow,
    looksLikeHeader,
    detectTableTypeFromHeaders,
    buildRowsFromTable,
    getValue,
    parseGenericRows,
    parse
  };
})(window);