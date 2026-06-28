/*
  Nombre completo: aj-result.js
  Ruta: core/utils/aj-result.js

  Función:
    - Crear respuestas estándar para operaciones de AgendaJeff.
*/

"use strict";

function createResult(payload) {
  const data = payload && typeof payload === "object" ? payload : {};

  return {
    ok: Boolean(data.ok),
    status: data.status || (data.ok ? "ready" : "error"),
    action: data.action || "",
    source: data.source || "core",
    message: data.message || "",
    data: data.data || null,
    error: data.error || null,
    checkedAt: data.checkedAt || new Date().toISOString()
  };
}

function createOk(message, data, extra) {
  return createResult({
    ok: true,
    status: "ready",
    message,
    data,
    ...(extra || {})
  });
}

function createError(message, error, extra) {
  return createResult({
    ok: false,
    status: "error",
    message,
    error: error || { message },
    ...(extra || {})
  });
}

module.exports = Object.freeze({ createResult, createOk, createError });
