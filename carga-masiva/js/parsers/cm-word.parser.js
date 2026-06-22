/*
  Nombre completo: cm-word.parser.js
  Ruta: carga-masiva/js/parsers/cm-word.parser.js

  Función:
    - Procesar archivos Word .docx.
    - Extraer texto con Mammoth.js.
    - Detectar cronogramas, defensas, flyers, tablas o texto libre.
    - Delegar al parser correspondiente.
    - No valida ni guarda eventos.

  Se conecta con:
    - cm-config.js
    - servicios/cm-file.service.js
    - servicios/cm-parser.service.js
    - parsers/cm-table.parser.js
    - parsers/cm-schedule.parser.js
    - parsers/cm-defense.parser.js
    - parsers/cm-flyer.parser.js
    - parsers/cm-text.parser.js
    - cm-app.js
*/

(function initCmWordParser(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function ensureMammoth() {
    if (!global.mammoth) {
      throw new Error("No está cargada la librería Mammoth.js.");
    }

    return global.mammoth;
  }

  async function extractTextFromWord(arrayBuffer) {
    const mammoth = ensureMammoth();
    const result = await mammoth.extractRawText({
      arrayBuffer
    });

    return {
      text: result.value || "",
      messages: result.messages || []
    };
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

    if (
      lower.includes("metodología") ||
      lower.includes("metodologia") ||
      lower.includes("tutoría") ||
      lower.includes("tutoria") ||
      lower.includes("interrogante")
    ) {
      return CONFIG.SOURCE_TYPES.FLYER;
    }

    if (lower.includes("\t") || lower.includes("|")) {
      return CONFIG.SOURCE_TYPES.TABLE;
    }

    return CONFIG.SOURCE_TYPES.TEXT;
  }

  async function parseExtractedText(text, payload) {
    const kind = detectKindFromText(text);
    let result = null;

    if (kind === CONFIG.SOURCE_TYPES.DEFENSE && CM.DefenseParser) {
      result = await CM.DefenseParser.parse(text, payload);
    } else if (kind === CONFIG.SOURCE_TYPES.SCHEDULE && CM.ScheduleParser) {
      result = await CM.ScheduleParser.parse(text, payload);
    } else if (kind === CONFIG.SOURCE_TYPES.FLYER && CM.FlyerParser) {
      result = await CM.FlyerParser.parse(text, payload);
    } else if (kind === CONFIG.SOURCE_TYPES.TABLE && CM.TableParser) {
      result = await CM.TableParser.parse(text, payload);
    } else if (CM.TextParser) {
      result = await CM.TextParser.parse(text, payload);
    } else {
      result = {
        events: [],
        warnings: ["No hay parser disponible para el texto del Word."]
      };
    }

    return {
      ...result,
      sourceType: CONFIG.SOURCE_TYPES.WORD,
      events: (result.events || []).map((event) => ({
        ...event,
        sourceType: CONFIG.SOURCE_TYPES.WORD
      }))
    };
  }

  async function parse(filePayload, payload) {
    if (!filePayload || !filePayload.arrayBuffer) {
      throw new Error("No hay contenido Word para procesar.");
    }

    const extracted = await extractTextFromWord(filePayload.arrayBuffer);
    const warnings = extracted.messages.map((message) => message.message || String(message));

    if (!extracted.text.trim()) {
      return {
        sourceType: CONFIG.SOURCE_TYPES.WORD,
        events: [],
        warnings: [
          "No se pudo extraer texto útil del Word.",
          ...warnings
        ]
      };
    }

    const result = await parseExtractedText(extracted.text, {
      ...(payload || {}),
      sourceType: CONFIG.SOURCE_TYPES.WORD,
      extractedText: extracted.text
    });

    return {
      ...result,
      warnings: [
        ...warnings,
        ...(result.warnings || [])
      ],
      period: result.period || "",
      phase: result.phase || ""
    };
  }

  CM.WordParser = {
    ensureMammoth,
    extractTextFromWord,
    detectKindFromText,
    parseExtractedText,
    parse
  };
})(window);