/* cm-start-v2.js · Carga Masiva funcional con revisión en pantalla completa */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};
  const state = carga.state = carga.state || { started: false, startedAt: "", sources: [], candidates: [], selectedCandidateId: "", duplicateReport: null };

  function sourceCard(source, index) {
    const safe = carga.dom.safe;
    return `<div class="cm-source-item"><strong>${index + 1}. ${safe(source.name)}</strong><br><span>Tipo: ${safe(source.type)} · Estado: ${safe(source.status)} · Tamaño: ${source.size || 0}</span><p>${safe(source.preview || "Sin vista previa")}</p></div>`;
  }

  function renderSources() {
    const sources = state.sources || [];
    carga.dom.text("cmSourceCount", String(sources.length));
    carga.dom.html("cmSourceList", sources.length ? sources.map(sourceCard).join("") : '<div class="cm-empty">Todavía no hay fuentes registradas.</div>');
  }

  function setReviewMode(active) {
    const page = carga.dom.el("cmPage");
    if (page) page.classList.toggle("is-review-mode", Boolean(active));
    document.body.classList.toggle("is-review-mode", Boolean(active));
  }

  function showReviewStep() {
    const step = carga.dom.el("cmReviewStep");
    if (step) {
      step.hidden = false;
      setReviewMode(true);
      setTimeout(function scrollLater() { step.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
    }
  }

  function hideReviewStep() {
    const step = carga.dom.el("cmReviewStep");
    if (step) step.hidden = true;
    setReviewMode(false);
  }

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

  function autoRegisterPastedTextIfNeeded() {
    const paste = carga.dom.el("cmPasteBox");
    const value = paste ? String(paste.value || "").trim() : "";
    if (!state.sources.length && value) return addText();
    return null;
  }

  async function process() {
    autoRegisterPastedTextIfNeeded();
    if (!state.sources.length) {
      carga.dom.status("Sin fuentes", "Registra texto o archivos antes de procesar.", "Pendiente");
      return [];
    }
    let candidates = carga.eventParser.parseSources(state.sources);
    const originalCount = candidates.length;
    candidates = await carga.duplicates.markDuplicates(candidates);
    const report = state.duplicateReport || { totalRemoved: Math.max(0, originalCount - candidates.length), internalRemoved: 0, existingRemoved: 0 };
    state.candidates = candidates;
    state.selectedCandidateId = candidates[0] ? candidates[0].id : "";
    carga.dom.text("cmDuplicateCount", String(report.totalRemoved || 0));
    carga.dom.text("cmSaveCount", "0");
    carga.reviewRender.renderReview();
    showReviewStep();

    const message = `Tabla generada: ${candidates.length} registro(s). Duplicados omitidos: ${report.totalRemoved || 0} (${report.internalRemoved || 0} repetidos del archivo, ${report.existingRemoved || 0} ya existentes).`;
    if (carga.reviewActions && typeof carga.reviewActions.reviewNotice === "function") carga.reviewActions.reviewNotice(message, report.totalRemoved ? "warning" : "success");
    carga.dom.status("Tabla generada", message, "Revisión");
    return candidates;
  }

  function clearAll() {
    const paste = carga.dom.el("cmPasteBox");
    const input = carga.dom.el("cmFileInput");
    if (paste) paste.value = "";
    if (input) input.value = "";
    carga.sources.clearSources();
    state.duplicateReport = null;
    renderSources();
    if (carga.reviewRender) carga.reviewRender.renderReview();
    hideReviewStep();
    carga.dom.text("cmDuplicateCount", "0");
    carga.dom.text("cmSaveCount", "0");
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
    const bBack = carga.dom.el("cmBtnBackToSources");
    const bClear = carga.dom.el("cmBtnClear");
    const input = carga.dom.el("cmFileInput");
    if (bText) bText.addEventListener("click", addText);
    if (bProcess) bProcess.addEventListener("click", process);
    if (bBack) bBack.addEventListener("click", function backToSources() {
      setReviewMode(false);
      const step = carga.dom.el("cmStepOne");
      if (step) step.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
    hideReviewStep();
    carga.dom.status("Carga lista", "Parser local preparado para cronogramas, defensas y tablas copiadas.", "Listo");
  }

  if (!global.document || global.document.readyState !== "loading") start();
  else global.document.addEventListener("DOMContentLoaded", start, { once: true });

  carga.start = start;
  carga.processSources = process;
})(window);