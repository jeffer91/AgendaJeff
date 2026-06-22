/*
  Nombre completo: cm-parser.service.js
  Ruta: carga-masiva/js/servicios/cm-parser.service.js

  Función:
    - Decidir qué parser usar según texto, archivo o tipo seleccionado.
    - Ejecutar parser de cronograma, defensas, flyer, tabla, texto, Excel, PDF, Word o imagen.
    - Unificar respuesta de todos los parsers.
    - Devolver eventos crudos listos para normalizar.
    - No valida ni guarda eventos.

  Se conecta con:
    - cm-config.js
    - servicios/cm-input.service.js
    - parsers/cm-text.parser.js
    - parsers/cm-table.parser.js
    - parsers/cm-schedule.parser.js
    - parsers/cm-defense.parser.js
    - parsers/cm-flyer.parser.js
    - parsers/cm-excel.parser.js
    - parsers/cm-pdf.parser.js
    - parsers/cm-word.parser.js
    - parsers/cm-image.parser.js
    - cm-app.js
*/

(function initCmParserService(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function emptyResult(sourceType, warnings) {
    return {
      sourceType: sourceType || CONFIG.SOURCE_TYPES.TEXT,
      events: [],
      warnings: warnings || [],
      period: "",
      phase: ""
    };
  }

  function normalizeParserResult(result, sourceType) {
    const safeResult = result || {};

    return {
      sourceType: safeResult.sourceType || sourceType || CONFIG.SOURCE_TYPES.TEXT,
      events: Array.isArray(safeResult.events) ? safeResult.events : [],
      warnings: Array.isArray(safeResult.warnings) ? safeResult.warnings : [],
      period: safeResult.period || "",
      phase: safeResult.phase || ""
    };
  }

  function detectSourceType(payload) {
    const selected = payload.sourceType || CONFIG.SOURCE_TYPES.AUTO;

    if (selected && selected !== CONFIG.SOURCE_TYPES.AUTO) {
      return selected;
    }

    if (payload.file && payload.file.sourceType) {
      return payload.file.sourceType;
    }

    return CM.InputService.detectTextKind(payload.text || "");
  }

  async function parseByType(sourceType, payload) {
    if (sourceType === CONFIG.SOURCE_TYPES.EXCEL && CM.ExcelParser) {
      return CM.ExcelParser.parse(payload.file, payload);
    }

    if (sourceType === CONFIG.SOURCE_TYPES.PDF && CM.PdfParser) {
      return CM.PdfParser.parse(payload.file, payload);
    }

    if (sourceType === CONFIG.SOURCE_TYPES.WORD && CM.WordParser) {
      return CM.WordParser.parse(payload.file, payload);
    }

    if (sourceType === CONFIG.SOURCE_TYPES.IMAGE && CM.ImageParser) {
      return CM.ImageParser.parse(payload.file, payload);
    }

    if (sourceType === CONFIG.SOURCE_TYPES.DEFENSE && CM.DefenseParser) {
      return CM.DefenseParser.parse(payload.text || "", payload);
    }

    if (sourceType === CONFIG.SOURCE_TYPES.SCHEDULE && CM.ScheduleParser) {
      return CM.ScheduleParser.parse(payload.text || "", payload);
    }

    if (sourceType === CONFIG.SOURCE_TYPES.FLYER && CM.FlyerParser) {
      return CM.FlyerParser.parse(payload.text || "", payload);
    }

    if (sourceType === CONFIG.SOURCE_TYPES.TABLE && CM.TableParser) {
      return CM.TableParser.parse(payload.text || "", payload);
    }

    if (CM.TextParser) {
      return CM.TextParser.parse(payload.text || "", payload);
    }

    return emptyResult(sourceType, ["No hay parser disponible para este tipo de carga."]);
  }

  async function parse(payload) {
    const safePayload = payload || {};
    let sourceType = detectSourceType(safePayload);

    if (safePayload.file && safePayload.file.sourceType) {
      sourceType = safePayload.file.sourceType;
    }

    const result = await parseByType(sourceType, safePayload);
    const normalized = normalizeParserResult(result, sourceType);

    if (!normalized.events.length && sourceType !== CONFIG.SOURCE_TYPES.TEXT && CM.TextParser) {
      const fallbackResult = await CM.TextParser.parse(safePayload.text || "", safePayload);
      const fallback = normalizeParserResult(fallbackResult, CONFIG.SOURCE_TYPES.TEXT);

      return {
        ...fallback,
        warnings: [
          ...normalized.warnings,
          `No se detectaron eventos con el parser ${sourceType}; se intentó con texto libre.`,
          ...fallback.warnings
        ]
      };
    }

    return normalized;
  }

  CM.ParserService = {
    emptyResult,
    normalizeParserResult,
    detectSourceType,
    parseByType,
    parse
  };
})(window);