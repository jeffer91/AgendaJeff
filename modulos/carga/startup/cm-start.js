/*
  Nombre completo: cm-start.js
  Ruta: modulos/carga/startup/cm-start.js

  Función:
    - Iniciar la pantalla Carga Masiva.
    - Registrar fuentes visuales de texto y archivos sin procesarlas todavía.
    - Preparar modal de revisión para bloques posteriores.
*/

(function initCargaMasivaModule(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  const state = {
    started: false,
    startedAt: "",
    sources: []
  };

  function getElement(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function createSource(source) {
    return {
      id: `src_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: source.type || "text",
      name: source.name || "Texto pegado",
      size: source.size || 0,
      status: "registrado",
      createdAt: new Date().toISOString()
    };
  }

  function renderSources() {
    const list = getElement("cmSourceList");
    if (!list) return;

    if (!state.sources.length) {
      list.innerHTML = '<div class="cm-empty">Todavía no hay fuentes registradas.</div>';
      return;
    }

    list.innerHTML = state.sources.map(function mapSource(source, index) {
      return `<div class="cm-source-item"><strong>${index + 1}. ${source.name}</strong><br><span>Tipo: ${source.type} · Estado: ${source.status}</span></div>`;
    }).join("");
  }

  function registerTextSource() {
    const pasteBox = getElement("cmPasteBox");
    const text = pasteBox ? pasteBox.value.trim() : "";

    if (!text) {
      renderStatus("cmStatusTitle", "Sin texto");
      renderStatus("cmStatusDescription", "Pega texto o una tabla antes de registrar una fuente.");
      return null;
    }

    const source = createSource({ type: "texto", name: "Texto pegado", size: text.length });
    source.preview = text.slice(0, 180);
    state.sources.push(source);
    renderSources();
    return source;
  }

  function registerFileSources() {
    const input = getElement("cmFileInput");
    const files = input && input.files ? Array.from(input.files) : [];

    files.forEach(function eachFile(file) {
      state.sources.push(createSource({ type: "archivo", name: file.name, size: file.size || 0 }));
    });

    renderSources();
  }

  function renderStatus(titleId, text) {
    const element = getElement(titleId);
    if (element) element.textContent = text;
  }

  function openReviewModal() {
    const modal = getElement("cmReviewModal");
    if (modal) modal.hidden = false;
  }

  function closeReviewModal() {
    const modal = getElement("cmReviewModal");
    if (modal) modal.hidden = true;
  }

  function clearAll() {
    const pasteBox = getElement("cmPasteBox");
    const fileInput = getElement("cmFileInput");
    if (pasteBox) pasteBox.value = "";
    if (fileInput) fileInput.value = "";
    state.sources = [];
    renderSources();
  }

  function attachEvents() {
    const registerTextButton = getElement("cmBtnRegisterText");
    const processButton = getElement("cmBtnProcess");
    const closeButton = getElement("cmBtnCloseModal");
    const clearButton = getElement("cmBtnClear");
    const fileInput = getElement("cmFileInput");

    if (registerTextButton) registerTextButton.addEventListener("click", registerTextSource);
    if (processButton) processButton.addEventListener("click", openReviewModal);
    if (closeButton) closeButton.addEventListener("click", closeReviewModal);
    if (clearButton) clearButton.addEventListener("click", clearAll);
    if (fileInput) fileInput.addEventListener("change", registerFileSources);
  }

  function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();
    attachEvents();
    renderSources();
    return getState();
  }

  function getState() {
    return {
      started: state.started,
      startedAt: state.startedAt,
      sources: state.sources.slice()
    };
  }

  function autoStart() {
    if (!global.document || global.document.readyState !== "loading") {
      start();
      return;
    }
    global.document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  carga.start = start;
  carga.getState = getState;
  carga.registerTextSource = registerTextSource;
  autoStart();
})(window);
