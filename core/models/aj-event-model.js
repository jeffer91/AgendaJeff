/*
  Nombre completo: aj-event-model.js
  Ruta: core/models/aj-event-model.js

  Función:
    - Normalizar el modelo único de AgendaJeff para evento, recordatorio y pendiente.
*/

"use strict";

const { CORE_CONFIG } = require("../config/aj-core-config");
const { ensureLocalId } = require("../utils/aj-id");
const { normalizeDate, normalizeTime } = require("../utils/aj-date");
const { DEFAULT_CATEGORIES, findCategory } = require("./aj-category-model");

function cleanText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeType(value) {
  const type = cleanText(value);
  const allowed = Object.values(CORE_CONFIG.types);
  return allowed.includes(type) ? type : CORE_CONFIG.types.EVENTO;
}

function normalizeState(value) {
  const state = cleanText(value);
  const allowed = Object.values(CORE_CONFIG.states);
  return allowed.includes(state) ? state : CORE_CONFIG.states.ACTIVO;
}

function normalizeRepeat(input) {
  const data = input && typeof input === "object" ? input : {};
  const type = cleanText(data.tipo || data.type || data.repeat || "none");
  const allowed = Object.values(CORE_CONFIG.repeatTypes);
  const finalType = allowed.includes(type) ? type : CORE_CONFIG.repeatTypes.NONE;

  return {
    activa: finalType !== CORE_CONFIG.repeatTypes.NONE,
    tipo: finalType,
    hasta: normalizeDate(data.hasta || data.until || "")
  };
}

function normalizeChannels(input) {
  return {
    escritorio: input && typeof input.escritorio === "boolean" ? input.escritorio : CORE_CONFIG.defaultChannels.escritorio,
    telegram: input && typeof input.telegram === "boolean" ? input.telegram : CORE_CONFIG.defaultChannels.telegram,
    googleCalendar: input && typeof input.googleCalendar === "boolean" ? input.googleCalendar : CORE_CONFIG.defaultChannels.googleCalendar
  };
}

function normalizeReminders(input) {
  const data = input && typeof input === "object" ? input : {};

  return {
    cincoDiasAntes: typeof data.cincoDiasAntes === "boolean" ? data.cincoDiasAntes : CORE_CONFIG.defaultReminders.cincoDiasAntes,
    tresDiasAntes: typeof data.tresDiasAntes === "boolean" ? data.tresDiasAntes : CORE_CONFIG.defaultReminders.tresDiasAntes,
    unDiaAntes: typeof data.unDiaAntes === "boolean" ? data.unDiaAntes : CORE_CONFIG.defaultReminders.unDiaAntes,
    mismoDia: typeof data.mismoDia === "boolean" ? data.mismoDia : CORE_CONFIG.defaultReminders.mismoDia,
    usarDiasLaborables: typeof data.usarDiasLaborables === "boolean" ? data.usarDiasLaborables : CORE_CONFIG.defaultReminders.usarDiasLaborables,
    horasSinHora: Array.isArray(data.horasSinHora) && data.horasSinHora.length ? data.horasSinHora.map(normalizeTime).filter(Boolean) : CORE_CONFIG.defaultReminders.horasSinHora.slice(),
    horasPendiente: Array.isArray(data.horasPendiente) && data.horasPendiente.length ? data.horasPendiente.map(normalizeTime).filter(Boolean) : CORE_CONFIG.defaultReminders.horasPendiente.slice()
  };
}

function normalizeAgendaItem(input, options) {
  const data = input && typeof input === "object" ? input : {};
  const opts = options && typeof options === "object" ? options : {};
  const categories = Array.isArray(opts.categories) && opts.categories.length ? opts.categories : DEFAULT_CATEGORIES;
  const type = normalizeType(data.tipo || data.type);
  const category = findCategory(categories, data.categoriaId || data.categoria || data.categoryId);
  const now = new Date().toISOString();
  const idPrefix = type === CORE_CONFIG.types.PENDIENTE ? "pen" : type === CORE_CONFIG.types.RECORDATORIO ? "rec" : "evt";

  const fechaInicio = normalizeDate(data.fechaInicio || data.startDate || data.date);
  const fechaFin = normalizeDate(data.fechaFin || data.endDate || "");
  const horaInicio = normalizeTime(data.horaInicio || data.startTime || "");
  const horaFin = normalizeTime(data.horaFin || data.endTime || "");
  const todoDia = Boolean(data.todoDia || data.allDay || (!horaInicio && type !== CORE_CONFIG.types.PENDIENTE));

  return {
    idLocal: ensureLocalId(data.idLocal, idPrefix),
    idFirebase: cleanText(data.idFirebase),
    idGoogleCalendar: cleanText(data.idGoogleCalendar),
    tipo: type,
    titulo: cleanText(data.titulo || data.title || data.actividad),
    descripcion: cleanText(data.descripcion || data.description),
    fechaInicio,
    fechaFin,
    horaInicio,
    horaFin,
    todoDia,
    estado: normalizeState(data.estado),
    estadoSync: cleanText(data.estadoSync) || CORE_CONFIG.syncStates.PENDIENTE,
    categoriaId: category.id,
    categoriaNombre: category.nombre,
    color: cleanText(data.color) || category.color,
    icono: cleanText(data.icono) || category.icono,
    canales: normalizeChannels(data.canales || {}),
    recordatorios: normalizeReminders(data.recordatorios || {}),
    repeticion: normalizeRepeat(data.repeticion || { tipo: data.repeticion || data.repeat }),
    origen: {
      tipo: cleanText(data.origen && data.origen.tipo) || cleanText(data.origenTipo) || "manual",
      archivo: cleanText(data.origen && data.origen.archivo) || cleanText(data.archivo),
      textoOriginal: cleanText(data.origen && data.origen.textoOriginal) || cleanText(data.textoOriginal)
    },
    auditoria: {
      creadoEn: cleanText(data.auditoria && data.auditoria.creadoEn) || cleanText(data.creadoEn) || now,
      actualizadoEn: now,
      creadoPorDispositivo: cleanText(data.auditoria && data.auditoria.creadoPorDispositivo) || cleanText(data.creadoPorDispositivo),
      actualizadoPorDispositivo: cleanText(data.auditoria && data.auditoria.actualizadoPorDispositivo) || cleanText(data.actualizadoPorDispositivo)
    }
  };
}

function validateAgendaItem(item) {
  const normalized = normalizeAgendaItem(item);
  const errors = [];

  if (!normalized.titulo) errors.push({ field: "titulo", message: "Falta la actividad o título." });
  if (!normalized.fechaInicio) errors.push({ field: "fechaInicio", message: "Falta la fecha de inicio." });
  if (normalized.horaFin && normalized.horaInicio && normalized.horaFin < normalized.horaInicio) {
    errors.push({ field: "horaFin", message: "La hora de fin no puede ser menor que la hora de inicio." });
  }

  return {
    ok: errors.length === 0,
    item: normalized,
    errors,
    message: errors.length ? "Registro requiere revisión." : "Registro válido."
  };
}

module.exports = Object.freeze({ normalizeAgendaItem, validateAgendaItem });
