/* cm-review-actions.js · Acciones de la subpantalla de revisión */
(function (global) {
  "use strict";
  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const carga = root.CargaMasiva = root.CargaMasiva || {};

  function candidates() {
    carga.state.candidates = Array.isArray(carga.state.candidates) ? carga.state.candidates : [];
    return carga.state.candidates;
  }

  function findCandidate(id) {
    return candidates().find(function (item) { return item.id === id; }) || null;
  }

  function reviewNotice(message, type) {
    const box = carga.dom.el("cmReviewNotice");
    if (box) {
      box.hidden = false;
      box.className = `cm-review-notice is-${type || "info"}`;
      box.textContent = message;
    }
  }

  function refreshStatus(candidate) {
    if (!candidate) return;
    if (candidate.status === "guardado") return;
    if (candidate.actividad) candidate.titulo = candidate.actividad;
    candidate.status = carga.eventParser.statusFor(candidate);
    if (candidate.duplicate && candidate.status === "listo") candidate.status = "posible_duplicado";
  }

  function candidateToAgendaItem(candidate) {
    const actividad = candidate.actividad || candidate.titulo || "";
    return {
      tipo: candidate.tipo || "evento",
      titulo: actividad,
      descripcion: candidate.descripcion || actividad,
      fechaInicio: candidate.fechaInicio,
      fechaFin: candidate.fechaFin || candidate.fechaInicio,
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

  function updateCandidateFromInput(input) {
    const item = findCandidate(input.dataset.id);
    if (!item) return null;
    const field = input.dataset.field;
    item[field] = input.value;
    if (field === "actividad") item.titulo = input.value;
    if (field === "fechaInicio" && !item.fechaFin) item.fechaFin = input.value;
    if (item.status === "guardado") item.status = "listo";
    refreshStatus(item);
    return item;
  }

  function handleFieldChange(event) {
    const input = event.target && event.target.closest ? event.target.closest("input[data-field],textarea[data-field]") : null;
    if (!input) return;
    const item = updateCandidateFromInput(input);
    if (!item) return;
    carga.state.selectedCandidateId = item.id;
    carga.reviewRender.renderReview();
  }

  function handleSelect(event) {
    const target = event.target && event.target.closest ? event.target.closest("input[data-action='select']") : null;
    if (!target) return;
    const item = findCandidate(target.dataset.id);
    if (!item) return;
    item.selected = Boolean(target.checked);
    carga.state.selectedCandidateId = item.id;
  }

  async function saveCandidate(candidate, options) {
    const opts = options || {};
    const bridge = carga.dom.bridge();
    if (!candidate) return { ok: false, message: "Registro no encontrado." };
    if (candidate.status !== "guardado") refreshStatus(candidate);
    if (!candidate.fechaInicio || !(candidate.actividad || candidate.titulo)) {
      const message = "Completa actividad y fecha inicio antes de guardar.";
      if (!opts.silent) reviewNotice(message, "warning");
      carga.dom.status("Falta información", message, "Revisión");
      return { ok: false, message: "Falta actividad o fecha.", invalid: true };
    }
    if (!bridge || typeof bridge.saveAgendaItem !== "function") {
      const message = "Abre la app como escritorio para guardar en la base local.";
      if (!opts.silent) reviewNotice(message, "warning");
      carga.dom.status("Sin Electron", message, "Pendiente");
      return { ok: false, message: "Puente Electron no disponible." };
    }

    const duplicate = carga.duplicates && typeof carga.duplicates.findExistingDuplicate === "function" ? await carga.duplicates.findExistingDuplicate(candidate) : null;
    if (duplicate) {
      candidate.duplicate = true;
      candidate.status = "posible_duplicado";
      const message = "No se guardó porque ya existe un evento igual en la base local.";
      if (!opts.silent) reviewNotice(message, "warning");
      carga.dom.status("Duplicado omitido", message, "Depurado");
      return { ok: false, skipped: true, duplicate: true, message };
    }

    const result = await bridge.saveAgendaItem(candidateToAgendaItem(candidate));
    if (result && result.ok !== false) {
      candidate.status = "guardado";
      candidate.selected = false;
      candidate.duplicate = false;
    }
    return result;
  }

  function exportRows(rows, filename) {
    const headers = ["Actividad", "Fecha inicio", "Fecha fin", "Hora inicio", "Hora fin"];
    const escapeCsv = function escapeCsv(value) {
      const clean = String(value == null ? "" : value).replace(/\r?\n/g, " ");
      return /[",;\n]/.test(clean) ? `"${clean.replace(/"/g, '""')}"` : clean;
    };
    const body = rows.map(function mapRow(item) {
      refreshStatus(item);
      return [
        item.actividad || item.titulo || "",
        item.fechaInicio || "",
        item.fechaFin || item.fechaInicio || "",
        item.horaInicio || "",
        item.horaFin || ""
      ].map(escapeCsv).join(";");
    });
    const csv = [headers.join(";"), ...body].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "agendaJeff-carga-masiva.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function revoke() { URL.revokeObjectURL(url); }, 1500);
  }

  function safeFilename(text) {
    return String(text || "registro")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "registro";
  }

  function exportAll() {
    const rows = candidates();
    if (!rows.length) {
      reviewNotice("No hay filas para exportar.", "warning");
      carga.dom.status("Sin registros", "No hay filas para exportar.", "Revisión");
      return;
    }
    exportRows(rows, `agendaJeff-carga-masiva-${new Date().toISOString().slice(0, 10)}.csv`);
    reviewNotice(`${rows.length} fila(s) exportadas en CSV.`, "success");
    carga.dom.status("Exportación lista", `${rows.length} fila(s) exportadas en CSV.`, "Exportado");
  }

  function exportOne(candidate) {
    if (!candidate) return;
    exportRows([candidate], `agendaJeff-${safeFilename(candidate.actividad || candidate.titulo)}.csv`);
    reviewNotice("Se exportó la fila seleccionada en CSV.", "success");
    carga.dom.status("Fila exportada", "Se exportó la fila seleccionada en CSV.", "Exportado");
  }

  async function handleClick(event) {
    const target = event.target && event.target.closest ? event.target.closest("button[data-action]") : null;
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    const item = findCandidate(id);

    if (action === "detail" && item) {
      carga.state.selectedCandidateId = id;
      carga.reviewRender.renderDetail(item);
      return;
    }

    if (action === "remove") {
      carga.state.candidates = candidates().filter(function (candidate) { return candidate.id !== id; });
      carga.reviewRender.renderReview();
      reviewNotice("Fila eliminada de la revisión.", "info");
      return;
    }

    if (action === "export-row" && item) {
      exportOne(item);
      return;
    }

    if (action === "save-row" && item) {
      const result = await saveCandidate(item);
      if (result && result.ok !== false) {
        const saved = Number((carga.dom.el("cmSaveCount") || {}).textContent || 0) + 1;
        carga.dom.text("cmSaveCount", String(saved));
        reviewNotice("Fila guardada correctamente. Ya no queda seleccionada para evitar doble guardado.", "success");
        carga.dom.status("Fila guardada", "El registro seleccionado fue enviado a la base local.", "Guardado");
        carga.reviewRender.renderReview();
      } else if (result && result.skipped) {
        const dup = Number((carga.dom.el("cmDuplicateCount") || {}).textContent || 0) + 1;
        carga.dom.text("cmDuplicateCount", String(dup));
        carga.reviewRender.renderReview();
      }
    }
  }

  function createBlankCandidate() {
    return {
      id: carga.dom.id("cand"),
      sourceId: "manual",
      sourceName: "Fila manual",
      sourceType: "manual",
      row: candidates().length + 1,
      tipo: "evento",
      actividad: "",
      titulo: "",
      descripcion: "Fila creada manualmente en revisión de carga masiva.",
      fechaInicio: "",
      fechaFin: "",
      horaInicio: "",
      horaFin: "",
      todoDia: true,
      categoria: "trabajo",
      canales: { escritorio: true, telegram: true, googleCalendar: true },
      recordatorios: { cincoDiasAntes: true, tresDiasAntes: true, unDiaAntes: true, mismoDia: true, usarDiasLaborables: false, horasSinHora: ["06:00", "13:00", "17:00"], horasPendiente: ["06:00", "17:00"] },
      origen: { tipo: "manual", archivo: "Carga masiva", textoOriginal: "" },
      status: "requiere_revision",
      duplicate: false,
      duplicateScore: 0,
      selected: true
    };
  }

  function addManualRow() {
    const item = createBlankCandidate();
    candidates().push(item);
    carga.state.selectedCandidateId = item.id;
    carga.reviewRender.renderReview();
    reviewNotice("Fila agregada. Completa la información antes de guardar.", "info");
    carga.dom.status("Fila agregada", "Completa la fila manual en la tabla editable.", "Revisión");
  }

  async function approveSelected() {
    const allSelected = candidates().filter(function (item) { return item.selected; });
    if (!allSelected.length) {
      reviewNotice("No hay filas seleccionadas para guardar.", "warning");
      return { ok: false, saved: 0, skipped: 0 };
    }

    const seen = new Set();
    const validUnique = [];
    let invalid = 0;
    let repeatedInsideSelection = 0;

    allSelected.forEach(function eachSelected(item) {
      refreshStatus(item);
      if (!item.fechaInicio || !(item.actividad || item.titulo)) {
        invalid += 1;
        return;
      }
      const key = carga.duplicates && typeof carga.duplicates.uniqueKey === "function" ? carga.duplicates.uniqueKey(item) : `${item.fechaInicio}|${item.actividad || item.titulo}`;
      if (seen.has(key)) {
        repeatedInsideSelection += 1;
        item.selected = false;
        item.duplicate = true;
        item.status = "posible_duplicado";
        return;
      }
      seen.add(key);
      validUnique.push(item);
    });

    const results = [];
    for (const candidate of validUnique) {
      const result = await saveCandidate(candidate, { silent: true });
      results.push({ candidateId: candidate.id, result });
    }

    const saved = results.filter(function (item) { return item.result && item.result.ok !== false; }).length;
    const skippedExisting = results.filter(function (item) { return item.result && item.result.skipped; }).length;
    const previousSaved = Number((carga.dom.el("cmSaveCount") || {}).textContent || 0);
    const previousDuplicates = Number((carga.dom.el("cmDuplicateCount") || {}).textContent || 0);
    const totalSkipped = skippedExisting + repeatedInsideSelection;

    carga.dom.text("cmSaveCount", String(previousSaved + saved));
    carga.dom.text("cmDuplicateCount", String(previousDuplicates + totalSkipped));

    const message = `Guardado: ${saved}. Omitidos por duplicado: ${totalSkipped}. Incompletos: ${invalid}.`;
    reviewNotice(message, saved > 0 ? "success" : "warning");
    carga.dom.status("Carga procesada", message, "Guardado");
    carga.reviewRender.renderReview();
    return { ok: true, saved, skipped: totalSkipped, invalid, results };
  }

  function attach() {
    const table = carga.dom.el("cmReviewTable");
    if (table) {
      table.addEventListener("change", handleFieldChange);
      table.addEventListener("change", handleSelect);
      table.addEventListener("click", handleClick);
    }

    const approve = carga.dom.el("cmBtnApproveSelected");
    if (approve) approve.addEventListener("click", approveSelected);

    const add = carga.dom.el("cmBtnAddReviewRow");
    if (add) add.addEventListener("click", addManualRow);

    const exportButton = carga.dom.el("cmBtnExportAll");
    if (exportButton) exportButton.addEventListener("click", exportAll);
  }

  carga.reviewActions = Object.freeze({ attach, approveSelected, candidateToAgendaItem, addManualRow, saveCandidate, exportAll, exportOne, reviewNotice });
})(window);