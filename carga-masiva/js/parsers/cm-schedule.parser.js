/*
  Nombre completo: cm-schedule.parser.js
  Ruta: carga-masiva/js/parsers/cm-schedule.parser.js

  Función:
    - Procesar cronogramas académicos.
    - Reconocer formatos:
      * Actividad | Fecha inicio | Fecha fin
      * Actividad | Fecha inicio | Fecha fin | Responsable
      * Cronogramas por fases.
      * Cronogramas con periodo y grupo.
    - Crear un evento crudo por cada fila.
    - Guardar fase, periodo y responsable como contexto.
    - No valida ni guarda eventos.

  Se conecta con:
    - cm-config.js
    - servicios/cm-normalizer.service.js
    - servicios/cm-parser.service.js
    - parsers/cm-table.parser.js
    - cm-app.js
*/

(function initCmScheduleParser(global) {
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

  function splitRow(line) {
    if (line.includes("\t")) {
      return line.split("\t").map((cell) => cell.trim());
    }

    if (line.includes("|")) {
      return line.split("|").map((cell) => cell.trim());
    }

    if (line.includes(";")) {
      return line.split(";").map((cell) => cell.trim());
    }

    return line.split(/\s{2,}/).map((cell) => cell.trim());
  }

  function isDate(value) {
    return /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(CM.safeString(value));
  }

  function isHeader(cells) {
    const joined = cells.map(normalizeHeader).join(" ");

    return (
      joined.includes("actividad") &&
      joined.includes("fecha inicio") &&
      joined.includes("fecha fin")
    );
  }

  function isPhaseLine(line) {
    return /^fase\s+\d+/i.test(CM.safeString(line));
  }

  function isPeriodLine(line) {
    const text = CM.safeString(line);

    return (
      /\d{4}/.test(text) &&
      (
        text.includes(":::") ||
        /enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i.test(text)
      )
    );
  }

  function detectPeriod(line) {
    const text = CM.safeString(line);

    if (!isPeriodLine(text)) {
      return "";
    }

    return text;
  }

  function mapHeaderIndexes(headers) {
    const normalized = headers.map(normalizeHeader);

    return {
      activity: normalized.findIndex((header) => header === "actividad" || header.includes("actividad")),
      startDate: normalized.findIndex((header) => header === "fecha inicio" || header.includes("fecha inicio")),
      endDate: normalized.findIndex((header) => header === "fecha fin" || header.includes("fecha fin")),
      responsible: normalized.findIndex((header) => header === "responsable" || header.includes("responsable"))
    };
  }

  function includesAny(text, words) {
    return words.some((word) => text.includes(word));
  }

  function isFinalizationOfClasses(text) {
    return (
      text.includes("finalización de clase") ||
      text.includes("finalizacion de clase") ||
      text.includes("finalización de clases") ||
      text.includes("finalizacion de clases") ||
      text.includes("fin de clases") ||
      text.includes("fin de clase")
    );
  }

  function isClassActivity(text) {
    if (isFinalizationOfClasses(text)) {
      return false;
    }

    return includesAny(text, [
      "clase",
      "tutoría",
      "tutoria"
    ]);
  }

  function isAcademicActivity(text) {
    return includesAny(text, [
      "defensa",
      "inducción",
      "induccion",
      "entrega",
      "evaluación",
      "evaluacion",
      "revisión",
      "revision",
      "coordinador",
      "coordinadores",
      "cumplimiento",
      "requisitos",
      "borrador",
      "artículo",
      "articulo",
      "titulación",
      "titulacion",
      "supletorio",
      "finalización",
      "finalizacion",
      "núcleo",
      "nucleo",
      "complexivo",
      "interrogante"
    ]);
  }

  function detectEventType(activity) {
    const text = CM.safeString(activity).toLowerCase();

    if (!text) {
      return CONFIG.EVENT_TYPES.EVENT;
    }

    /*
      Importante:
      En cronogramas académicos, "Defensa oral" es una actividad del cronograma,
      no una defensa individual de estudiante.

      Por eso este parser NO debe devolver CONFIG.EVENT_TYPES.DEFENSE.
      Las defensas reales deben entrar por cm-defense.parser.js.
    */

    if (isClassActivity(text)) {
      return CONFIG.EVENT_TYPES.CLASS;
    }

    if (isAcademicActivity(text)) {
      return CONFIG.EVENT_TYPES.ACADEMIC;
    }

    return CONFIG.EVENT_TYPES.EVENT;
  }

  function parseWithHeaders(text) {
    const lines = splitLines(text);
    const events = [];
    const warnings = [];
    let headers = [];
    let headerMap = null;
    let currentPhase = "";
    let period = "";

    lines.forEach((line, index) => {
      const cells = splitRow(line);

      if (!cells.length) {
        return;
      }

      if (isPeriodLine(line) && !isHeader(cells)) {
        period = detectPeriod(line);
        return;
      }

      if (isPhaseLine(line)) {
        currentPhase = line;
        return;
      }

      if (isHeader(cells)) {
        headers = cells;
        headerMap = mapHeaderIndexes(headers);
        return;
      }

      if (!headerMap) {
        return;
      }

      const activity = cells[headerMap.activity] || "";
      const startDate = cells[headerMap.startDate] || "";
      const endDate = cells[headerMap.endDate] || "";
      const responsible = headerMap.responsible >= 0 ? cells[headerMap.responsible] || "" : "";

      if (!activity && !startDate && !endDate) {
        return;
      }

      if (!isDate(startDate) && !isDate(endDate)) {
        warnings.push(`Fila ${index + 1}: no se detectó fecha válida.`);
      }

      events.push({
        id: CM.createId("cm_raw_schedule"),
        type: detectEventType(activity),
        title: activity,
        startDate,
        endDate: endDate || startDate,
        responsible,
        phase: currentPhase,
        period,
        raw: line,
        line: index + 1,
        sourceType: CONFIG.SOURCE_TYPES.SCHEDULE
      });
    });

    return {
      sourceType: CONFIG.SOURCE_TYPES.SCHEDULE,
      events,
      warnings,
      period,
      phase: ""
    };
  }

  function parseFromTableObject(table) {
    const events = [];
    const warnings = [];
    let period = "";

    table.rows.forEach((row, index) => {
      const activity =
        CM.TableParser.getValue(row, ["Actividad"]) ||
        "";

      const startDate =
        CM.TableParser.getValue(row, ["Fecha inicio"]) ||
        "";

      const endDate =
        CM.TableParser.getValue(row, ["Fecha fin"]) ||
        startDate;

      const responsible =
        CM.TableParser.getValue(row, ["Responsable"]) ||
        "";

      if (!activity && !startDate && !endDate) {
        return;
      }

      events.push({
        id: CM.createId("cm_raw_schedule"),
        type: detectEventType(activity),
        title: activity,
        startDate,
        endDate,
        responsible,
        phase: "",
        period,
        raw: row.__raw || row,
        line: row.__line || index + 1,
        sourceType: CONFIG.SOURCE_TYPES.SCHEDULE
      });
    });

    return {
      sourceType: CONFIG.SOURCE_TYPES.SCHEDULE,
      events,
      warnings,
      period,
      phase: ""
    };
  }

  async function parse(text, payload) {
    const safePayload = payload || {};

    if (safePayload.table && Array.isArray(safePayload.table.rows)) {
      return parseFromTableObject(safePayload.table);
    }

    const result = parseWithHeaders(text);

    if (!result.events.length) {
      result.warnings.push("No se detectaron actividades en el cronograma.");
    }

    return result;
  }

  CM.ScheduleParser = {
    normalizeHeader,
    splitLines,
    splitRow,
    isDate,
    isHeader,
    isPhaseLine,
    isPeriodLine,
    detectPeriod,
    mapHeaderIndexes,
    detectEventType,
    parseWithHeaders,
    parseFromTableObject,
    parse
  };
})(window);