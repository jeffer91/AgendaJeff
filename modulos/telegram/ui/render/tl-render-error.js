/*
  Nombre completo: tl-render-error.js
  Ruta: modulos/telegram/ui/render/tl-render-error.js

  Función:
    - Pintar errores del módulo Telegram de forma clara.
    - Extraer mensaje, archivo probable y detalle técnico.
    - Enviar el error también a la caja JSON para depuración.

  Se conecta con:
    - modulos/telegram/ui/dom/tl-dom-result.js
    - modulos/telegram/ui/render/tl-render-result.js
    - modulos/telegram/ui/events/*
*/

(function initTelegramRenderError(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const telegram = root.Telegram = root.Telegram || {};
  const ui = telegram.UI = telegram.UI || {};
  const render = ui.Render = ui.Render || {};

  function getDomResult() {
    return ui.Dom && ui.Dom.Result ? ui.Dom.Result : null;
  }

  function extractError(input) {
    if (!input) {
      return {
        message: "Error desconocido.",
        file: "",
        detail: null
      };
    }

    if (input.error) {
      return {
        message: input.error.message || input.message || "Error desconocido.",
        file: input.error.file || input.file || "",
        detail: input
      };
    }

    if (input instanceof Error) {
      return {
        message: input.message || "Error desconocido.",
        file: input.file || "",
        detail: {
          stack: input.stack || ""
        }
      };
    }

    if (typeof input === "string") {
      return {
        message: input,
        file: "",
        detail: null
      };
    }

    return {
      message: input.message || "Error desconocido.",
      file: input.file || "",
      detail: input
    };
  }

  function renderError(errorInput) {
    const domResult = getDomResult();

    if (!domResult) {
      return false;
    }

    const error = extractError(errorInput);
    const lines = [
      "Error detectado en Telegram",
      `Mensaje: ${error.message}`
    ];

    if (error.file) {
      lines.push(`Archivo probable: ${error.file}`);
    }

    domResult.showError(lines.join("\n"));
    domResult.writeText("resultBox", lines.join("\n"));
    domResult.writeJson("jsonBox", error.detail || error);

    return true;
  }

  function renderResultError(result) {
    if (result && result.ok) {
      return false;
    }

    return renderError(result);
  }

  render.extractError = extractError;
  render.renderError = renderError;
  render.renderResultError = renderResultError;
})(window);
