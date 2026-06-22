/*
  Nombre completo: cm-excel.parser.js
  Ruta: carga-masiva/js/parsers/cm-excel.parser.js

  Función:
    - Procesar archivos Excel .xlsx o .xls.
    - Leer hojas con SheetJS.
    - Convertir hojas a texto tabulado.
    - Detectar si el Excel contiene cronogramas, defensas o tablas generales.
    - Delegar al parser correspondiente.
    - No valida ni guarda eventos.

  Se conecta con:
    - cm-config.js
    - servicios/cm-file.service.js
    - servicios/cm-parser.service.js
    - parsers/cm-table.parser.js
    - parsers/cm-schedule.parser.js
    - parsers/cm-defense.parser.js
    - cm-app.js
*/

(function initCmExcelParser(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function ensureXLSX() {
    if (!global.XLSX) {
      throw new Error("No está cargada la librería SheetJS/XLSX.");
    }

    return global.XLSX;
  }

  function sheetToRows(sheet) {
    const XLSX = ensureXLSX();

    return XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false
    });
  }

  function rowsToText(rows) {
    return (Array.isArray(rows) ? rows : [])
      .map((row) => {
        return (Array.isArray(row) ? row : [])
          .map((cell) => CM.safeString(cell))
          .join("\t");
      })
      .filter((line) => line.trim())
      .join("\n");
  }

  function detectKindFromText(text) {
    const lower = CM.safeString(text).toLowerCase();

    if (
      lower.includes("aula") &&
      lower.includes("hora") &&
      lower.includes("nombre") &&
      lower.includes("carrera")
    ) {
      return CONFIG.SOURCE_TYPES.DEFENSE;
    }

    if (
      lower.includes("actividad") &&
      lower.includes("fecha inicio") &&
      lower.includes("fecha fin")
    ) {
      return CONFIG.SOURCE_TYPES.SCHEDULE;
    }

    return CONFIG.SOURCE_TYPES.TABLE;
  }

  async function parseSheetText(text, payload) {
    const kind = detectKindFromText(text);

    if (kind === CONFIG.SOURCE_TYPES.DEFENSE && CM.DefenseParser) {
      const result = await CM.DefenseParser.parse(text, payload);
      return {
        ...result,
        sourceType: CONFIG.SOURCE_TYPES.EXCEL,
        events: result.events.map((event) => ({
          ...event,
          sourceType: CONFIG.SOURCE_TYPES.EXCEL
        }))
      };
    }

    if (kind === CONFIG.SOURCE_TYPES.SCHEDULE && CM.ScheduleParser) {
      const result = await CM.ScheduleParser.parse(text, payload);
      return {
        ...result,
        sourceType: CONFIG.SOURCE_TYPES.EXCEL,
        events: result.events.map((event) => ({
          ...event,
          sourceType: CONFIG.SOURCE_TYPES.EXCEL
        }))
      };
    }

    if (CM.TableParser) {
      const result = await CM.TableParser.parse(text, payload);
      return {
        ...result,
        sourceType: CONFIG.SOURCE_TYPES.EXCEL,
        events: result.events.map((event) => ({
          ...event,
          sourceType: CONFIG.SOURCE_TYPES.EXCEL
        }))
      };
    }

    return {
      sourceType: CONFIG.SOURCE_TYPES.EXCEL,
      events: [],
      warnings: ["No existe parser de tabla para procesar el Excel."]
    };
  }

  async function parse(filePayload, payload) {
    const XLSX = ensureXLSX();

    if (!filePayload || !filePayload.arrayBuffer) {
      throw new Error("No hay contenido de Excel para procesar.");
    }

    const workbook = XLSX.read(filePayload.arrayBuffer, {
      type: "array",
      cellDates: false
    });

    const allEvents = [];
    const warnings = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = sheetToRows(sheet);
      const text = rowsToText(rows);

      if (!text.trim()) {
        continue;
      }

      const result = await parseSheetText(text, {
        ...(payload || {}),
        sourceType: CONFIG.SOURCE_TYPES.EXCEL,
        sheetName
      });

      result.events.forEach((event) => {
        allEvents.push({
          ...event,
          sheet: sheetName,
          sourceType: CONFIG.SOURCE_TYPES.EXCEL
        });
      });

      warnings.push(...(result.warnings || []).map((warning) => `${sheetName}: ${warning}`));
    }

    if (!allEvents.length) {
      warnings.push("No se detectaron eventos en el Excel.");
    }

    return {
      sourceType: CONFIG.SOURCE_TYPES.EXCEL,
      events: allEvents,
      warnings,
      period: "",
      phase: ""
    };
  }

  CM.ExcelParser = {
    ensureXLSX,
    sheetToRows,
    rowsToText,
    detectKindFromText,
    parseSheetText,
    parse
  };
})(window);