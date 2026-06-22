/*
  Nombre completo: cm-normalizer.service.js
  Ruta: carga-masiva/js/servicios/cm-normalizer.service.js

  Función:
    - Normalizar eventos detectados por parsers.
    - Convertir fechas a formato ISO yyyy-mm-dd.
    - Convertir horas como 8 pm, 20h00, 11: 00 o 10:30 a formato HH:mm.
    - Detectar rangos de hora: 10:30 a 11:00.
    - Crear títulos estándar, especialmente para defensas.
    - Preparar eventos compatibles con AgendaJeff.
    - Adjuntar recordatorios según reglas configuradas.

  Se conecta con:
    - cm-config.js
    - cm-reminder.service.js
    - cm-validator.service.js
    - parsers/cm-schedule.parser.js
    - parsers/cm-defense.parser.js
    - parsers/cm-flyer.parser.js
    - conexiones/cm-agendador.adapter.js
*/

(function initCmNormalizerService(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function cleanText(value) {
    return CM.safeString(value)
      .replace(/\s+/g, " ")
      .replace(/\s+:/g, ":")
      .replace(/:\s+/g, ": ")
      .trim();
  }

  function cleanCell(value) {
    return CM.safeString(value)
      .replace(/\u00a0/g, " ")
      .replace(/\t+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeUpperName(value) {
    const text = cleanCell(value);

    if (!text) {
      return "";
    }

    return text
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function parseDate(value) {
    const text = cleanCell(value);

    if (!text) {
      return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    const slashMatch = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);

    if (slashMatch) {
      const day = Number(slashMatch[1]);
      const month = Number(slashMatch[2]);
      let year = Number(slashMatch[3]);

      if (year < 100) {
        year += 2000;
      }

      const date = new Date(year, month - 1, day);

      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return `${year}-${pad2(month)}-${pad2(day)}`;
      }
    }

    return "";
  }

  function normalizeTime(value) {
    let text = cleanCell(value).toLowerCase();

    if (!text) {
      return "";
    }

    text = text
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .replace(/(\d{1,2})\s*:\s*(\d{2})/g, "$1:$2")
      .replace(/(\d{1,2})\s*h\s*(\d{2})/g, "$1:$2")
      .replace(/(\d{1,2})\s*h\b/g, "$1:00")
      .trim();

    const pm = /\bpm\b/.test(text) || /\bp\.m\b/.test(text);
    const am = /\bam\b/.test(text) || /\ba\.m\b/.test(text);

    text = text.replace(/\b(am|pm|a\.m|p\.m)\b/g, "").trim();

    const match = text.match(/^(\d{1,2})(?::(\d{1,2}))?$/);

    if (!match) {
      return "";
    }

    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);

    if (pm && hour < 12) {
      hour += 12;
    }

    if (am && hour === 12) {
      hour = 0;
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return "";
    }

    return `${pad2(hour)}:${pad2(minute)}`;
  }

  function parseTimeRange(value) {
    const text = cleanCell(value).toLowerCase();

    if (!text) {
      return {
        startTime: "",
        endTime: ""
      };
    }

    const normalized = text
      .replace(/\s+/g, " ")
      .replace(/(\d{1,2})\s*:\s*(\d{2})/g, "$1:$2")
      .replace(/(\d{1,2})\s*h\s*(\d{2})/g, "$1:$2")
      .replace(/(\d{1,2})\s*h\b/g, "$1:00")
      .replace(/\s*a\s*/g, " a ")
      .replace(/\s*-\s*/g, " a ")
      .replace(/\s*hasta\s*/g, " a ")
      .trim();

    const parts = normalized.split(/\s+a\s+/);

    if (parts.length >= 2) {
      const firstPart = parts[0];
      const secondPart = parts[1];

      const secondHasMeridian = /\b(am|pm|a\.m|p\.m)\b/i.test(secondPart);
      const firstHasMeridian = /\b(am|pm|a\.m|p\.m)\b/i.test(firstPart);

      let startCandidate = firstPart;
      let endCandidate = secondPart;

      if (!firstHasMeridian && secondHasMeridian) {
        const meridian = secondPart.match(/\b(am|pm|a\.m|p\.m)\b/i);
        if (meridian) {
          startCandidate = `${firstPart} ${meridian[1]}`;
        }
      }

      return {
        startTime: normalizeTime(startCandidate),
        endTime: normalizeTime(endCandidate)
      };
    }

    return {
      startTime: normalizeTime(normalized),
      endTime: ""
    };
  }

  function normalizeLocation(raw) {
    const aula = cleanCell(raw.aula || raw.classroom || "");
    const sede = cleanCell(raw.sede || raw.campus || "");
    const modalidad = cleanCell(raw.modalidad || raw.mode || "");
    const lugar = cleanCell(raw.lugar || raw.location || "");

    if (lugar) {
      return lugar;
    }

    if (/virtual/i.test(sede) || /virtual/i.test(modalidad)) {
      return aula ? `Virtual - Aula ${aula}` : "Virtual";
    }

    if (aula && sede) {
      return `Aula ${aula} - ${sede}`;
    }

    if (aula) {
      return `Aula ${aula}`;
    }

    if (sede) {
      return sede;
    }

    return "";
  }

  function normalizeTitle(raw) {
    const type = raw.type || raw.tipo || CONFIG.EVENT_TYPES.EVENT;

    if (type === CONFIG.EVENT_TYPES.DEFENSE) {
      return normalizeDefenseTitle(raw);
    }

    const title =
      raw.title ||
      raw.titulo ||
      raw.actividad ||
      raw.activity ||
      raw.nombreActividad ||
      "";

    return cleanText(title);
  }

  function normalizeDefenseTitle(raw) {
    const name = normalizeUpperName(raw.studentName || raw.nombre || raw.estudiante || "");
    const career = cleanCell(raw.career || raw.carrera || "");
    const base = "Defensa";

    if (name && career) {
      return `${base} - ${name} - ${career}`;
    }

    if (name) {
      return `${base} - ${name}`;
    }

    if (career) {
      return `${base} - ${career}`;
    }

    return base;
  }

  function buildDescription(raw, normalized) {
    const parts = [];

    const fase = cleanCell(raw.phase || raw.fase || "");
    const periodo = cleanCell(raw.period || raw.periodo || "");
    const cedula = cleanCell(raw.idNumber || raw.cedula || raw.cédula || "");
    const carrera = cleanCell(raw.career || raw.carrera || "");
    const tribunal1 = cleanCell(raw.tribunal1 || raw["tribunal 1"] || "");
    const tribunal2 = cleanCell(raw.tribunal2 || raw["tribunal 2"] || "");
    const notes = cleanCell(raw.notes || raw.observacion || raw.observación || "");
    const originalDescription = cleanCell(raw.description || raw.descripcion || "");

    if (fase) {
      parts.push(`Fase: ${fase}`);
    }

    if (periodo) {
      parts.push(`Periodo: ${periodo}`);
    }

    if (cedula) {
      parts.push(`Cédula: ${cedula}`);
    }

    if (carrera) {
      parts.push(`Carrera: ${carrera}`);
    }

    if (tribunal1) {
      parts.push(`Tribunal 1: ${tribunal1}`);
    }

    if (tribunal2) {
      parts.push(`Tribunal 2: ${tribunal2}`);
    }

    if (originalDescription) {
      parts.push(originalDescription);
    }

    if (notes) {
      parts.push(`Observación: ${notes}`);
    }

    parts.push("Origen: Carga masiva");

    return parts.join("\n");
  }

  function normalizeChannels(channels) {
    return {
      ...CONFIG.DEFAULT_CHANNELS,
      ...(channels || {})
    };
  }

  function detectType(raw) {
    const explicitType = raw.type || raw.tipo;

    if (explicitType) {
      return explicitType;
    }

    const text = `${raw.title || raw.titulo || raw.actividad || ""}`.toLowerCase();

    if (text.includes("defensa")) {
      return CONFIG.EVENT_TYPES.DEFENSE;
    }

    if (text.includes("clase") || text.includes("metodología") || text.includes("metodologia")) {
      return CONFIG.EVENT_TYPES.CLASS;
    }

    if (
      text.includes("núcleo") ||
      text.includes("nucleo") ||
      text.includes("requisitos") ||
      text.includes("complexivo") ||
      text.includes("supletorio")
    ) {
      return CONFIG.EVENT_TYPES.ACADEMIC;
    }

    return CONFIG.EVENT_TYPES.EVENT;
  }

  function normalizeEvent(raw, context) {
    const safeRaw = raw || {};
    const safeContext = context || {};
    const timeRange = parseTimeRange(
      safeRaw.timeRange ||
      safeRaw.hora ||
      safeRaw.hour ||
      safeRaw.horario ||
      safeRaw.schedule ||
      ""
    );

    const startDate = parseDate(
      safeRaw.startDate ||
      safeRaw.fechaInicio ||
      safeRaw["fecha inicio"] ||
      safeRaw.dia ||
      safeRaw.día ||
      safeRaw.fecha ||
      ""
    );

    const endDate = parseDate(
      safeRaw.endDate ||
      safeRaw.fechaFin ||
      safeRaw["fecha fin"] ||
      safeRaw.fechaFinal ||
      ""
    ) || startDate;

    const type = detectType(safeRaw);
    const allDay = !timeRange.startTime && !timeRange.endTime;
    const title = normalizeTitle({
      ...safeRaw,
      type
    });

    const normalized = {
      ...CONFIG.DEFAULT_EVENT_VALUES,
      id: safeRaw.id || CM.createId("cm_event"),
      batchId: safeContext.batchId || safeRaw.batchId || "",
      type,
      title,
      startDate,
      endDate,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      allDay,
      location: normalizeLocation(safeRaw),
      responsible: cleanCell(safeRaw.responsible || safeRaw.responsable || ""),
      priority: safeRaw.priority || safeRaw.prioridad || "normal",
      selected: safeRaw.selected !== false,
      manualReviewed: Boolean(safeRaw.manualReviewed),
      studentName: normalizeUpperName(safeRaw.studentName || safeRaw.nombre || safeRaw.estudiante || ""),
      idNumber: cleanCell(safeRaw.idNumber || safeRaw.cedula || safeRaw.cédula || ""),
      career: cleanCell(safeRaw.career || safeRaw.carrera || ""),
      tribunal1: cleanCell(safeRaw.tribunal1 || safeRaw["tribunal 1"] || ""),
      tribunal2: cleanCell(safeRaw.tribunal2 || safeRaw["tribunal 2"] || ""),
      phase: cleanCell(safeRaw.phase || safeRaw.fase || safeContext.phase || ""),
      period: cleanCell(safeRaw.period || safeRaw.periodo || safeContext.period || ""),
      channels: normalizeChannels(safeContext.channels || safeRaw.channels),
      sourceMeta: {
        sourceType: safeContext.sourceType || safeRaw.sourceType || CONFIG.SOURCE_TYPES.AUTO,
        line: safeRaw.line || "",
        sheet: safeRaw.sheet || "",
        raw: safeRaw.raw || safeRaw
      },
      createdAt: safeRaw.createdAt || CM.nowISO(),
      updatedAt: CM.nowISO(),
      warnings: [],
      errors: [],
      reviewStatus: CONFIG.REVIEW_STATUS.OK
    };

    normalized.description = buildDescription(safeRaw, normalized);

    if (CM.ReminderService && typeof CM.ReminderService.attachReminders === "function") {
      return CM.ReminderService.attachReminders(normalized, safeContext.settings);
    }

    return normalized;
  }

  function normalizeEvents(rawEvents, context) {
    return (Array.isArray(rawEvents) ? rawEvents : []).map((rawEvent) => normalizeEvent(rawEvent, context));
  }

  CM.NormalizerService = {
    cleanText,
    cleanCell,
    normalizeUpperName,

    parseDate,
    normalizeTime,
    parseTimeRange,

    normalizeLocation,
    normalizeTitle,
    normalizeDefenseTitle,
    buildDescription,

    detectType,
    normalizeChannels,
    normalizeEvent,
    normalizeEvents
  };
})(window);