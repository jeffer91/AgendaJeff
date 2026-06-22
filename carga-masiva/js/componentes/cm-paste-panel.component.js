/*
  Nombre completo: cm-paste-panel.component.js
  Ruta: carga-masiva/js/componentes/cm-paste-panel.component.js

  Función:
    - Controlar el panel donde el usuario pega texto, tablas o cronogramas.
    - Leer contenido pegado.
    - Limpiar el textarea.
    - Detectar si el texto parece cronograma, defensa, tabla, flyer o texto libre.
    - Contar líneas útiles.
    - No procesa eventos directamente; solo maneja el bloque visual de pegado.

  Se conecta con:
    - cm-config.js
    - cm-ui.js
    - servicios/cm-input.service.js
    - cm-app.js
    - cm-bindings.js
*/

(function initCmPastePanelComponent(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  CM.Components = CM.Components || {};

  const CONFIG = CM.CONFIG;

  function getElement() {
    return CM.UI.byId(CONFIG.DOM_IDS.pasteText);
  }

  function readText() {
    const element = getElement();

    if (!element) {
      return "";
    }

    return String(element.value || "").trim();
  }

  function setText(value) {
    const element = getElement();

    if (!element) {
      return;
    }

    element.value = value || "";
  }

  function clear() {
    setText("");
  }

  function focus() {
    const element = getElement();

    if (element) {
      element.focus();
    }
  }

  function getUsefulLines(text) {
    return CM.safeString(text)
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function countUsefulLines() {
    return getUsefulLines(readText()).length;
  }

  function detectKind() {
    const text = readText();

    if (!text) {
      return CONFIG.SOURCE_TYPES.TEXT;
    }

    if (CM.InputService && typeof CM.InputService.detectTextKind === "function") {
      return CM.InputService.detectTextKind(text);
    }

    return CONFIG.SOURCE_TYPES.TEXT;
  }

  function hasContent() {
    return Boolean(readText());
  }

  function getPreview(maxLength) {
    const text = readText();
    const limit = Number(maxLength) || 240;

    if (text.length <= limit) {
      return text;
    }

    return `${text.slice(0, limit)}...`;
  }

  function getInfo() {
    const text = readText();
    const kind = detectKind();
    const lines = getUsefulLines(text);

    return {
      hasContent: Boolean(text),
      kind,
      lines: lines.length,
      characters: text.length,
      preview: getPreview(240)
    };
  }

  function showDetectedKind() {
    const info = getInfo();

    if (!info.hasContent) {
      CM.UI.toastWarning("No hay texto pegado.");
      return info;
    }

    const label = {
      auto: "Automático",
      schedule: "Cronograma académico",
      defense: "Defensas",
      flyer: "Flyer o aviso",
      table: "Tabla",
      text: "Texto libre"
    }[info.kind] || info.kind;

    CM.UI.toastInfo(`Texto detectado como: ${label}. Líneas útiles: ${info.lines}.`);
    return info;
  }

  CM.Components.PastePanel = {
    getElement,
    readText,
    setText,
    clear,
    focus,
    getUsefulLines,
    countUsefulLines,
    detectKind,
    hasContent,
    getPreview,
    getInfo,
    showDetectedKind
  };
})(window);