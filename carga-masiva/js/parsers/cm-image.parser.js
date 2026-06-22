/*
  Nombre completo: cm-image.parser.js
  Ruta: carga-masiva/js/parsers/cm-image.parser.js

  Función:
    - Procesar imágenes .png, .jpg, .jpeg o .webp.
    - Leer texto con Tesseract.js.
    - Delegar el texto detectado a FlyerParser, ScheduleParser, DefenseParser o TextParser.
    - Marcar todos los eventos como provenientes de imagen/OCR.
    - Obligar revisión manual mediante ValidatorService.
    - No valida ni guarda eventos.

  Se conecta con:
    - cm-config.js
    - servicios/cm-file.service.js
    - servicios/cm-parser.service.js
    - parsers/cm-flyer.parser.js
    - parsers/cm-schedule.parser.js
    - parsers/cm-defense.parser.js
    - parsers/cm-text.parser.js
    - cm-app.js
*/

(function initCmImageParser(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function ensureTesseract() {
    if (!global.Tesseract) {
      throw new Error("No está cargada la librería Tesseract.js para OCR.");
    }

    return global.Tesseract;
  }

  async function extractTextFromImage(dataUrl) {
    const Tesseract = ensureTesseract();

    if (!dataUrl) {
      throw new Error("No hay imagen para procesar.");
    }

    const result = await Tesseract.recognize(dataUrl, "spa+eng", {
      logger: () => {}
    });

    return result && result.data && result.data.text
      ? result.data.text
      : "";
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
      lower.includes("interrogante") ||
      lower.includes("supletorio") ||
      lower.includes("fecha límite") ||
      lower.includes("fecha limite")
    ) {
      return CONFIG.SOURCE_TYPES.FLYER;
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
    } else if (CM.TextParser) {
      result = await CM.TextParser.parse(text, payload);
    } else {
      result = {
        events: [],
        warnings: ["No hay parser disponible para el texto OCR."]
      };
    }

    return {
      ...result,
      sourceType: CONFIG.SOURCE_TYPES.IMAGE,
      events: (result.events || []).map((event) => ({
        ...event,
        sourceType: CONFIG.SOURCE_TYPES.IMAGE,
        notes: `${event.notes || ""}\nTexto leído desde imagen/OCR.`.trim()
      })),
      warnings: [
        "El contenido viene de imagen/OCR; revisar manualmente antes de importar.",
        ...(result.warnings || [])
      ]
    };
  }

  async function parse(filePayload, payload) {
    if (!filePayload || !filePayload.dataUrl) {
      throw new Error("No hay imagen válida para procesar.");
    }

    const text = await extractTextFromImage(filePayload.dataUrl);

    if (!text.trim()) {
      return {
        sourceType: CONFIG.SOURCE_TYPES.IMAGE,
        events: [],
        warnings: ["No se pudo leer texto útil desde la imagen."]
      };
    }

    const result = await parseExtractedText(text, {
      ...(payload || {}),
      sourceType: CONFIG.SOURCE_TYPES.IMAGE,
      extractedText: text
    });

    return {
      ...result,
      period: result.period || "",
      phase: result.phase || ""
    };
  }

  CM.ImageParser = {
    ensureTesseract,
    extractTextFromImage,
    detectKindFromText,
    parseExtractedText,
    parse
  };
})(window);