/*
  Nombre completo: cm-flyer.parser.js
  Ruta: carga-masiva/js/parsers/cm-flyer.parser.js

  Función:
    - Procesar textos de flyers, imágenes institucionales o avisos pegados.
    - Detectar eventos únicos o múltiples dentro del mismo texto.
    - Detectar clases de metodología, tutorías, entregas, evaluaciones y defensas.
    - Detectar fechas, rangos de fechas y horarios.
    - Crear eventos crudos para normalización posterior.
    - No valida ni guarda eventos.

  Se conecta con:
    - cm-config.js
    - servicios/cm-normalizer.service.js
    - servicios/cm-parser.service.js
    - parsers/cm-text.parser.js
    - parsers/cm-image.parser.js
    - cm-app.js
*/

(function initCmFlyerParser(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  const MONTHS = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre"
  ];

  function splitLines(text) {
    return CM.safeString(text)
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function extractDates(text) {
    return CM.safeString(text).match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g) || [];
  }

  function extractTimeRange(text) {
    if (CM.TextParser && typeof CM.TextParser.extractTimeRange === "function") {
      return CM.TextParser.extractTimeRange(text);
    }

    const match = CM.safeString(text).match(/(\d{1,2}[:h]\s*\d{2}|\d{1,2}\s*(?:am|pm))\s*(?:a|-|hasta)\s*(\d{1,2}[:h]\s*\d{2}|\d{1,2}\s*(?:am|pm))/i);

    return match ? `${match[1]} a ${match[2]}` : "";
  }

  function detectPeriod(lines) {
    const line = lines.find((item) => {
      const lower = item.toLowerCase();

      return (
        /\d{4}/.test(lower) &&
        MONTHS.some((month) => lower.includes(month))
      );
    });

    return line || "";
  }

  function detectGroupOrCareer(lines) {
    const careerLine = lines.find((line) => /carrera|universitaria|universitarias|tecnolog/i.test(line));
    return careerLine || "";
  }

  function detectMainTopic(lines) {
    const candidates = [
      "metodología",
      "metodologia",
      "tutoría",
      "tutoria",
      "entrega",
      "evaluación",
      "evaluacion",
      "defensa",
      "interrogante",
      "supletorio"
    ];

    const found = lines.find((line) => {
      const lower = line.toLowerCase();
      return candidates.some((candidate) => lower.includes(candidate));
    });

    return found || "Evento institucional";
  }

  function detectEventType(title) {
    const lower = CM.safeString(title).toLowerCase();

    if (lower.includes("defensa")) {
      return CONFIG.EVENT_TYPES.DEFENSE;
    }

    if (
      lower.includes("metodología") ||
      lower.includes("metodologia") ||
      lower.includes("clase") ||
      lower.includes("tutoría") ||
      lower.includes("tutoria")
    ) {
      return CONFIG.EVENT_TYPES.CLASS;
    }

    if (
      lower.includes("entrega") ||
      lower.includes("evaluación") ||
      lower.includes("evaluacion") ||
      lower.includes("supletorio") ||
      lower.includes("interrogante")
    ) {
      return CONFIG.EVENT_TYPES.ACADEMIC;
    }

    return CONFIG.EVENT_TYPES.EVENT;
  }

  function titleFromLine(line, fallbackTopic, group) {
    let title = CM.safeString(line)
      .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, "")
      .replace(/(\d{1,2}[:h]\s*\d{2}|\d{1,2}\s*(?:am|pm))\s*(?:a|-|hasta)\s*(\d{1,2}[:h]\s*\d{2}|\d{1,2}\s*(?:am|pm))/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!title || title.length < 4) {
      title = fallbackTopic;
    }

    if (group && !title.toLowerCase().includes(group.toLowerCase())) {
      title = `${title} - ${group}`;
    }

    return title;
  }

  function parseLineEvents(lines, context) {
    const events = [];

    lines.forEach((line, index) => {
      const dates = extractDates(line);

      if (!dates.length) {
        return;
      }

      const timeRange = extractTimeRange(line);
      const title = titleFromLine(line, context.topic, context.group);

      events.push({
        id: CM.createId("cm_raw_flyer"),
        type: detectEventType(title),
        title,
        startDate: dates[0],
        endDate: dates[1] || dates[0],
        timeRange,
        period: context.period,
        notes: `Detectado desde flyer o imagen institucional.`,
        raw: line,
        line: index + 1,
        sourceType: context.sourceType || CONFIG.SOURCE_TYPES.FLYER
      });
    });

    return events;
  }

  function parseGlobalDates(lines, context) {
    const joined = lines.join(" ");
    const dates = extractDates(joined);
    const timeRange = extractTimeRange(joined);

    if (!dates.length) {
      return [];
    }

    const topic = context.topic;
    const group = context.group;
    const title = group ? `${topic} - ${group}` : topic;

    if (dates.length >= 2 && /evaluaci[oó]n/i.test(joined)) {
      return [
        {
          id: CM.createId("cm_raw_flyer"),
          type: detectEventType(topic),
          title: title.includes("Entrega") ? title : `Entrega - ${title}`,
          startDate: dates[0],
          endDate: dates[0],
          timeRange,
          period: context.period,
          raw: joined,
          line: 1,
          sourceType: context.sourceType || CONFIG.SOURCE_TYPES.FLYER
        },
        {
          id: CM.createId("cm_raw_flyer"),
          type: detectEventType(topic),
          title: `Evaluación - ${title}`,
          startDate: dates[1],
          endDate: dates[2] || dates[1],
          timeRange: "",
          period: context.period,
          raw: joined,
          line: 1,
          sourceType: context.sourceType || CONFIG.SOURCE_TYPES.FLYER
        }
      ];
    }

    return [
      {
        id: CM.createId("cm_raw_flyer"),
        type: detectEventType(topic),
        title,
        startDate: dates[0],
        endDate: dates[1] || dates[0],
        timeRange,
        period: context.period,
        raw: joined,
        line: 1,
        sourceType: context.sourceType || CONFIG.SOURCE_TYPES.FLYER
      }
    ];
  }

  async function parse(text, payload) {
    const lines = splitLines(text);
    const warnings = [];

    if (!lines.length) {
      return {
        sourceType: CONFIG.SOURCE_TYPES.FLYER,
        events: [],
        warnings: ["No hay texto de flyer para procesar."]
      };
    }

    const period = detectPeriod(lines);
    const group = detectGroupOrCareer(lines);
    const topic = detectMainTopic(lines);
    const sourceType = payload && payload.sourceType ? payload.sourceType : CONFIG.SOURCE_TYPES.FLYER;

    const context = {
      period,
      group,
      topic,
      sourceType
    };

    let events = parseLineEvents(lines, context);

    if (!events.length) {
      events = parseGlobalDates(lines, context);
    }

    if (!events.length && CM.TextParser) {
      const fallback = await CM.TextParser.parse(text, payload);
      return {
        ...fallback,
        sourceType: CONFIG.SOURCE_TYPES.FLYER,
        warnings: [
          ...warnings,
          "No se reconoció estructura de flyer; se intentó como texto libre.",
          ...(fallback.warnings || [])
        ]
      };
    }

    return {
      sourceType: CONFIG.SOURCE_TYPES.FLYER,
      events,
      warnings,
      period,
      phase: ""
    };
  }

  CM.FlyerParser = {
    splitLines,
    extractDates,
    extractTimeRange,
    detectPeriod,
    detectGroupOrCareer,
    detectMainTopic,
    detectEventType,
    titleFromLine,
    parseLineEvents,
    parseGlobalDates,
    parse
  };
})(window);