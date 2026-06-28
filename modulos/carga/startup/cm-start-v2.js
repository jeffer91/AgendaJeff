/* cm-start-v2.js · Carga Masiva funcional */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};
  const state = carga.state = carga.state || { started: false, startedAt: "", sources: [], candidates: [], selectedCandidateId: "" };

  function sourceCard(source, index) {
    const safe = carga.dom.safe;
    return `<div class="cm-source-item"><strong>${index + 1}. ${safe(source.name)}</strong><br><span>Tipo: ${safe(source.type)} · Estado: ${safe(source.status)} · Tamaño: ${source.size || 0}</span><p>${safe(source.preview || "Sin vista previa")}</p></div>`;
  }

  function renderSources() {
    const sources = state.sources || [];
    carga.dom.text("cmSourceCount", String(sources.length));
    carga.dom.html("cmSourceList", sources.length ? sources.map(sourceCard).join("") : '<div class="cm-empty">Todavía no hay fuentes registradas.</div>');
  }

  function openModal() { const modal = carga.dom.el("cmReviewModal"); if (modal) modal.hidden = false; }
  function closeModal() { const modal = carga.dom.el("cmReviewModal"); if (modal) modal.hidden = true; }

  function addText() {
    const paste = carga.dom.el("cmPasteBox");
    const source = carga.sources.addTextSource(paste ? paste.value : "");
    if (!source) {
      carga.dom.status("Sin texto", "Pega texto o una tabla antes de registrar.", "Revisión");
      return null;
    }
    renderSources();
    carga.dom.status("Fuente registrada", "Texto agregado para procesamiento local.", "Listo");
    return source;
  }

  async function addFiles() {
    const input = carga.dom.el("cmFileInput");
    const added = await carga.sources.addFiles(input && input.files ? input.files : []);
    renderSources();
    carga.dom.status("Archivos registrados", `${added.length} fuente(s) agregada(s).`, "Listo");
    return added;
  }

  async function process() {
    if (!state.sources.length) {
      carga.dom.status("Sin fuentes", "Registra texto o archivos antes de procesar.", "Pendiente");
      return [];
    }
    let candidates = carga.eventParser.parseSources(state.sources);
    candidates = await carga.duplicates.markDuplicates(candidates);
    state.candidates = candidates;
    state.selectedCandidateId = candidates[0] ? candidates[0].id : "";
    carga.reviewRender.renderReview();
    openModal();
    carga.dom.status("Eventos detectados", `${candidates.length} registro(s) enviados a revisión.`, "Revisión");
    return candidates;
  }

  function clearAll() {
    const paste = carga.dom.el("cmPasteBox");
    const input = carga.dom.el("cmFileInput");
    if (paste) paste.value = "";
    if (input) input.value = "";
    carga.sources.clearSources();
    renderSources();
    if (carga.reviewRender) carga.reviewRender.renderReview();
    carga.dom.status("Carga limpia", "Se borraron fuentes y eventos detectados.", "Listo");
  }

  function dragDrop() {
    const box = carga.dom.el("cmDropzone");
    if (!box) return;
    box.addEventListener("dragover", function (event) { event.preventDefault(); box.classList.add("is-dragover"); });
    box.addEventListener("dragleave", function () { box.classList.remove("is-dragover"); });
    box.addEventListener("drop", async function (event) {
      event.preventDefault();
      box.classList.remove("is-dragover");
      await carga.sources.addFiles(event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files : []);
      renderSources();
    });
  }

  function attach() {
    const bText = carga.dom.el("cmBtnRegisterText");
    const bProcess = carga.dom.el("cmBtnProcess");
    const bClose = carga.dom.el("cmBtnCloseModal");
    const bClear = carga.dom.el("cmBtnClear");
    const input = carga.dom.el("cmFileInput");
    if (bText) bText.addEventListener("click", addText);
    if (bProcess) bProcess.addEventListener("click", process);
    if (bClose) bClose.addEventListener("click", closeModal);
    if (bClear) bClear.addEventListener("click", clearAll);
    if (input) input.addEventListener("change", addFiles);
    if (carga.reviewActions) carga.reviewActions.attach();
    dragDrop();
  }

  function start() {
    state.started = true;
    state.startedAt = new Date().toISOString();
    attach();
    renderSources();
    carga.dom.status("Carga lista", "Parser local preparado para texto, TXT y CSV. Otros archivos quedan para revisión.", "Listo");
  }

  if (!global.document || global.document.readyState !== "loading") start();
  else global.document.addEventListener("DOMContentLoaded", start, { once: true });

  carga.start = start;
  carga.processSources = process;
})(window);
