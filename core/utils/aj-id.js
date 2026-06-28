/*
  Nombre completo: aj-id.js
  Ruta: core/utils/aj-id.js

  Función:
    - Generar identificadores locales estables para AgendaJeff.
*/

"use strict";

function randomChunk() {
  return Math.random().toString(36).slice(2, 10);
}

function createLocalId(prefix) {
  const cleanPrefix = typeof prefix === "string" && prefix.trim() ? prefix.trim() : "aj";
  return `${cleanPrefix}_${Date.now()}_${randomChunk()}`;
}

function ensureLocalId(value, prefix) {
  return typeof value === "string" && value.trim() ? value.trim() : createLocalId(prefix);
}

module.exports = Object.freeze({ createLocalId, ensureLocalId });
