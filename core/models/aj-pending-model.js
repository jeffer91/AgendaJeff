/*
  Nombre completo: aj-pending-model.js
  Ruta: core/models/aj-pending-model.js

  Función:
    - Definir comportamiento base de pendientes: se mantienen activos hasta completarse.
*/

"use strict";

const { CORE_CONFIG } = require("../config/aj-core-config");
const { todayIsoDate } = require("../utils/aj-date");

function shouldCarryPendingToToday(item, referenceDate) {
  const data = item && typeof item === "object" ? item : {};
  if (data.tipo !== CORE_CONFIG.types.PENDIENTE) return false;
  if (data.estado === CORE_CONFIG.states.COMPLETADO || data.estado === CORE_CONFIG.states.CANCELADO) return false;
  if (!data.fechaInicio) return true;
  return data.fechaInicio < todayIsoDate(referenceDate);
}

function carryPendingToToday(item, referenceDate) {
  const data = item && typeof item === "object" ? item : {};
  const today = todayIsoDate(referenceDate);

  if (!shouldCarryPendingToToday(data, referenceDate)) {
    return { ...data };
  }

  return {
    ...data,
    fechaInicio: today,
    estado: CORE_CONFIG.states.ACTIVO,
    estadoSync: CORE_CONFIG.syncStates.PENDIENTE,
    auditoria: {
      ...(data.auditoria || {}),
      actualizadoEn: new Date().toISOString()
    }
  };
}

module.exports = Object.freeze({ shouldCarryPendingToToday, carryPendingToToday });
