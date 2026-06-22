/*
  Nombre completo: cm-pdf.parser.js
  Ruta: carga-masiva/js/parsers/cm-pdf.parser.js

  Función:
    - Procesar archivos PDF.
    - Extraer texto con PDF.js si está disponible.
    - Detectar cronogramas, defensas, flyers o texto libre.
    - Delegar el texto extraído al parser correspondiente.
    - Marcar los eventos como origen PDF para revisión manual.
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

(function initCmPdfParser(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function getPdfJs() {
    if (global.pdfjsLib) {
      return global.pdfjsLib;
    }

    if (global["pdfjs-dist/build/pdf"]) {
      return global["pdfjs-dist/build/pdf"];
    }

    return null;
  }

  async function extractTextFromPdf(arrayBuffer) {
    const pdfjsLib = getPdfJs();

    if (!pdfjsLib) {
      throw new Error("No está cargada la librería PDF.js.");
    }

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer
    });

    const pdf = await loadingTask.promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => item.str || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) {
        pages.push(pageText);
      }
    }

    return pages.join("\n");
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
    } else if (CM.TableParser && (text.includes("\t") || text.includes("|"))) {
      result = await CM.TableParser.parse(text, payload);
    } else if (CM.TextParser) {
      result = await CM.TextParser.parse(text, payload);
    } else {
      result = {
        events: [],
        warnings: ["No hay parser disponible para el texto del PDF."]
      };
    }

    return {
      ...result,
      sourceType: CONFIG.SOURCE_TYPES.PDF,
      events: (result.events || []).map((event) => ({
        ...event,
        sourceType: CONFIG.SOURCE_TYPES.PDF
      })),
      warnings: [
        "El contenido viene de PDF; revisar lectura antes de importar.",
        ...(result.warnings || [])
      ]
    };
  }

  async function parse(filePayload, payload) {
    if (!filePayload || !filePayload.arrayBuffer) {
      throw new Error("No hay contenido PDF para procesar.");
    }

    const text = await extractTextFromPdf(filePayload.arrayBuffer);

    if (!text.trim()) {
      return {
        sourceType: CONFIG.SOURCE_TYPES.PDF,
        events: [],
        warnings: [
          "El PDF no entregó texto. Si es escaneado, intenta subirlo como imagen o usar OCR."
        ]
      };
    }

    const result = await parseExtractedText(text, {
      ...(payload || {}),
      sourceType: CONFIG.SOURCE_TYPES.PDF,
      extractedText: text
    });

    return {
      ...result,
      period: result.period || "",
      phase: result.phase || ""
    };
  }

  CM.PdfParser = {
    getPdfJs,
    extractTextFromPdf,
    detectKindFromText,
    parseExtractedText,
    parse
  };
})(window);