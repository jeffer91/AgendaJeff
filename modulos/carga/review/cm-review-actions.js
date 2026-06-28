/* cm-review-actions.js · Acciones del modal de revisión */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  function findCandidate(id) {
    return carga.state.candidates.find(function (item) { return item.id === id; }) || null;
  }

  function refreshStatus(candidate) {
    if (!candidate) return;
    candidate.status = carga.eventParser.statusFor(candidate);
    if (candidate.duplicate && candidate.status === "listo") candidate.status = "posible_duplicado";
  }

  function candidateToAgendaItem(candidate) {
    return {
      tipo: candidate.tipo || "evento",
      titulo: candidate.titulo,
      descripcion: candidate.descripcion,
      fechaInicio: candidate.fechaInicio,
      fechaFin: candidate.fechaFin,
      horaInicio: candidate.horaInicio,
      horaFin: candidate.horaFin,
      todoDia: !candidate.horaInicio,
      categoria: candidate.categoria || "trabajo",
      canales: candidate.canales || { escritorio: true, telegram: true, googleCalendar: true },
      recordatorios: candidate.recordatorios,
      origen: candidate.origen,
      estado: "activo"
    };
  }

  function handleFieldChange(event) {
    const input = event.target && event.target.closest ? event.target.closest("input[data-field]") : null;
    if (!input) return;
    const item = findCandidate(input.dataset.id);
    if (!item) return;
    item[input.dataset.field] = input.value;
    refreshStatus(item);
    carga.reviewRender.renderReview();
  }

  function handleClick(event) {
    const target = event.target && event.target.closest ? event.target.closest("button[data-action],input[data-action]") : null;
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    const item = findCandidate(id);

    if (action === "select" && item) item.selected = Boolean(target.checked);
    if (action === "detail" && item) {
      carga.state.selectedCandidateId = id;
      carga.reviewRender.renderDetail(item);
    }
    if (action === "remove") {
      carga.state.candidates = carga.state.candidates.filter(function (candidate) { return candidate.id !== id; });
      carga.reviewRender.renderReview();
    }
  }

  async function approveSelected() {
    const bridge = carga.dom.bridge();
    if (!bridge || typeof bridge.saveAgendaItem !== "function") {
      carga.dom.status("Sin Electron", "Abre la app como escritorio para guardar en la base local.", "Pendiente");
      return { ok: false, message: "Puente Electron no disponible." };
    }

    const selected = carga.state.candidates.filter(function (item) {
      return item.selected && item.fechaInicio && item.titulo;
    });
    const results = [];

    for (const candidate of selected) {
      const result = await bridge.saveAgendaItem(candidateToAgendaItem(candidate));
      results.push({ candidateId: candidate.id, result });
    }

    carga.dom.status("Carga guardada", `${results.length} registros enviados a la base local.`, "Guardado");
    carga.dom.text("cmSaveCount", String(results.length));
    return { ok: true, saved: results.length, results };
  }

  function attach() {
    const table = carga.dom.el("cmReviewTable");
    if (table) {
      table.addEventListener("change", handleFieldChange);
      table.addEventListener("click", handleClick);
    }

    const approve = carga.dom.el("cmBtnApproveSelected");
    if (approve) approve.addEventListener("click", approveSelected);
  }

  carga.reviewActions = Object.freeze({ attach, approveSelected, candidateToAgendaItem });
})(window);
