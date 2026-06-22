/*
  Nombre completo: cm-ui.js
  Ruta: carga-masiva/js/cm-ui.js

  Función:
    - Manejar funciones visuales base del módulo Carga Masiva.
    - Leer elementos del DOM de forma segura.
    - Mostrar salida, toast, resumen y modal de revisión.
    - Renderizar tabla de eventos detectados con estados OK, revisión y error.
    - Controlar habilitación del botón Agregar eventos según validación.
    - No procesa archivos ni crea eventos.

  Se conecta con:
    - cm-config.js
    - cm-storage.js
    - servicios/cm-validator.service.js
    - componentes/cm-review-modal.component.js
    - componentes/cm-detected-event-list.component.js
    - componentes/cm-toast.component.js
    - cm-app.js
    - cm-bindings.js
*/

(function initCmUI(global) {
  "use strict";

  const CM = global.CM = global.CM || {};
  const CONFIG = CM.CONFIG;

  function byId(id) {
    return document.getElementById(id);
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function escapeHTML(value) {
    return String(value === null || value === undefined ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setText(id, value) {
    const element = byId(id);

    if (element) {
      element.textContent = value;
    }
  }

  function setValue(id, value) {
    const element = byId(id);

    if (element) {
      element.value = value || "";
    }
  }

  function getValue(id) {
    const element = byId(id);

    if (!element) {
      return "";
    }

    return String(element.value || "").trim();
  }

  function setOutput(payload) {
    const element = byId(CONFIG.DOM_IDS.output);

    if (!element) {
      return;
    }

    if (typeof payload === "string") {
      element.textContent = payload;
      return;
    }

    try {
      element.textContent = JSON.stringify(payload || {}, null, 2);
    } catch (error) {
      element.textContent = String(payload || "");
    }
  }

  function setProcessing(isProcessing, message) {
    const button = byId(CONFIG.DOM_IDS.processBtn);

    if (button) {
      button.disabled = Boolean(isProcessing);
      button.textContent = isProcessing ? "Procesando..." : "Procesar carga";
    }

    if (message) {
      setOutput(message);
    }
  }

  function showToast(message, type) {
    const element = byId(CONFIG.DOM_IDS.toast);

    if (!element) {
      return;
    }

    element.textContent = message || "";
    element.className = "cm-toast";
    element.classList.add(`cm-toast--${type || "info"}`);
    element.classList.remove("cm-hidden");

    global.clearTimeout(showToast.timer);

    showToast.timer = global.setTimeout(() => {
      element.classList.add("cm-hidden");
    }, 3200);
  }

  function hideToast() {
    const element = byId(CONFIG.DOM_IDS.toast);

    if (element) {
      element.classList.add("cm-hidden");
    }
  }

  function toastSuccess(message) {
    showToast(message, "success");
  }

  function toastError(message) {
    showToast(message, "error");
  }

  function toastWarning(message) {
    showToast(message, "warning");
  }

  function toastInfo(message) {
    showToast(message, "info");
  }

  function getStatusSummary(events) {
    const safeEvents = Array.isArray(events) ? events : [];
    const selectedEvents = safeEvents.filter((event) => event.selected !== false);

    return {
      total: safeEvents.length,
      selected: selectedEvents.length,
      ok: safeEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.OK).length,
      review: safeEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.REVIEW).length,
      error: safeEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.ERROR).length,
      selectedOk: selectedEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.OK).length,
      selectedReview: selectedEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.REVIEW).length,
      selectedError: selectedEvents.filter((event) => event.reviewStatus === CONFIG.REVIEW_STATUS.ERROR).length
    };
  }

  function updateSummary(events) {
    const summary = getStatusSummary(events);

    setText(CONFIG.DOM_IDS.detectedCount, summary.total);
    setText(CONFIG.DOM_IDS.okCount, summary.ok);
    setText(CONFIG.DOM_IDS.reviewCount, summary.review);
    setText(CONFIG.DOM_IDS.errorCount, summary.error);

    setText(CONFIG.DOM_IDS.modalOkCount, summary.ok);
    setText(CONFIG.DOM_IDS.modalReviewCount, summary.review);
    setText(CONFIG.DOM_IDS.modalErrorCount, summary.error);
    setText(CONFIG.DOM_IDS.selectedCount, summary.selected);

    const addButton = byId(CONFIG.DOM_IDS.addEventsBtn);

    if (addButton) {
      const canImport = summary.selected > 0 && summary.selectedError === 0;
      addButton.disabled = !canImport;
    }

    return summary;
  }

  function setFileName(file) {
    const element = byId(CONFIG.DOM_IDS.fileName);

    if (!element) {
      return;
    }

    if (!file) {
      element.textContent = "Ningún archivo seleccionado";
      return;
    }

    element.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
  }

  function clearMainForm() {
    setValue(CONFIG.DOM_IDS.batchName, "");
    setValue(CONFIG.DOM_IDS.pasteText, "");

    const fileInput = byId(CONFIG.DOM_IDS.fileInput);
    if (fileInput) {
      fileInput.value = "";
    }

    setFileName(null);
    setOutput(CONFIG.MESSAGES.WAITING);
    updateSummary([]);
  }

  function openReviewModal() {
    const modal = byId(CONFIG.DOM_IDS.reviewModal);

    if (!modal) {
      return;
    }

    modal.classList.remove("cm-hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeReviewModal() {
    const modal = byId(CONFIG.DOM_IDS.reviewModal);

    if (!modal) {
      return;
    }

    modal.classList.add("cm-hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  function statusClass(status) {
    if (status === CONFIG.REVIEW_STATUS.ERROR) {
      return "error";
    }

    if (status === CONFIG.REVIEW_STATUS.REVIEW) {
      return "review";
    }

    return "ok";
  }

  function statusLabel(status) {
    return CONFIG.REVIEW_LABELS[status] || "OK";
  }

  function typeLabel(type) {
    return CONFIG.EVENT_TYPE_LABELS[type] || type || "Evento";
  }

  function formatDateRange(event) {
    const start = event.startDate || "Sin fecha";
    const end = event.endDate && event.endDate !== event.startDate ? event.endDate : "";

    return end ? `${start} → ${end}` : start;
  }

  function formatTimeRange(event) {
    if (event.allDay) {
      return "Todo el día";
    }

    if (event.startTime && event.endTime) {
      return `${event.startTime} - ${event.endTime}`;
    }

    if (event.startTime) {
      return event.startTime;
    }

    return "Sin hora";
  }

  function buildObservationHTML(event) {
    const warnings = Array.isArray(event.warnings) ? event.warnings : [];
    const errors = Array.isArray(event.errors) ? event.errors : [];

    if (!warnings.length && !errors.length) {
      return `<span class="cm-text-muted">Sin observaciones</span>`;
    }

    const errorHTML = errors.length
      ? `<ul class="cm-error-list">${errors.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`
      : "";

    const warningHTML = warnings.length
      ? `<ul class="cm-warning-list">${warnings.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`
      : "";

    return `${errorHTML}${warningHTML}`;
  }

  function renderEventsTable(events, page, pageSize) {
    const tbody = byId(CONFIG.DOM_IDS.reviewTableBody);
    const safeEvents = Array.isArray(events) ? events : [];
    const safePageSize = Number(pageSize) || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(safeEvents.length / safePageSize));
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = (safePage - 1) * safePageSize;
    const visibleEvents = safeEvents.slice(start, start + safePageSize);

    if (!tbody) {
      return {
        page: safePage,
        totalPages
      };
    }

    if (!visibleEvents.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="cm-table-empty">
            No hay eventos detectados.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = visibleEvents.map((event) => {
        const rowStatusClass = statusClass(event.reviewStatus);
        const checked = event.selected === false ? "" : "checked";
        const selectedDisabled = event.locked ? "disabled" : "";

        return `
          <tr class="cm-row--${rowStatusClass}" data-cm-event-id="${escapeHTML(event.id)}">
            <td>
              <input
                type="checkbox"
                class="cm-event-select"
                data-cm-event-id="${escapeHTML(event.id)}"
                ${checked}
                ${selectedDisabled}
              />
            </td>

            <td>
              <span class="cm-status-pill cm-status-pill--${rowStatusClass}">
                ${escapeHTML(statusLabel(event.reviewStatus))}
              </span>
            </td>

            <td>
              <span class="cm-type-pill">
                ${escapeHTML(typeLabel(event.type))}
              </span>
            </td>

            <td>
              <span class="cm-text-strong">${escapeHTML(event.title || "Sin título")}</span>
            </td>

            <td>${escapeHTML(formatDateRange(event))}</td>

            <td>${escapeHTML(formatTimeRange(event))}</td>

            <td>${escapeHTML(event.location || "Sin lugar")}</td>

            <td>${escapeHTML(event.responsible || "Sin responsable")}</td>

            <td>${buildObservationHTML(event)}</td>

            <td>
              <div class="cm-actions">
                <button
                  class="cm-mini-btn cm-mini-btn--primary cm-edit-event-btn"
                  type="button"
                  data-cm-event-id="${escapeHTML(event.id)}"
                >
                  Editar
                </button>

                <button
                  class="cm-mini-btn cm-mini-btn--danger cm-remove-event-btn"
                  type="button"
                  data-cm-event-id="${escapeHTML(event.id)}"
                >
                  Quitar
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }

    setText(CONFIG.DOM_IDS.pageInfo, `Página ${safePage} de ${totalPages}`);

    const prevButton = byId(CONFIG.DOM_IDS.prevPageBtn);
    const nextButton = byId(CONFIG.DOM_IDS.nextPageBtn);

    if (prevButton) {
      prevButton.disabled = safePage <= 1;
    }

    if (nextButton) {
      nextButton.disabled = safePage >= totalPages;
    }

    return {
      page: safePage,
      totalPages
    };
  }

  function renderReview(events, options) {
    const safeOptions = options || {};
    const batchName = safeOptions.batchName || "Carga masiva";
    const page = safeOptions.page || 1;
    const pageSize = safeOptions.pageSize || CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
    const summary = updateSummary(events);

    setText(CONFIG.DOM_IDS.reviewModalTitle, batchName);
    setText(
      CONFIG.DOM_IDS.reviewSummary,
            `Detectados: ${summary.total}. Seleccionados: ${summary.selected}. Los eventos amarillos se pueden agregar; solo los errores rojos bloquean la carga.`
    );

    const pageResult = renderEventsTable(events, page, pageSize);
    openReviewModal();

    return {
      summary,
      page: pageResult.page,
      totalPages: pageResult.totalPages
    };
  }

  function fillEditor(event) {
    if (!event) {
      return;
    }

    setValue(CONFIG.DOM_IDS.editTitle, event.title || "");
    setValue(CONFIG.DOM_IDS.editType, event.type || CONFIG.EVENT_TYPES.EVENT);
    setValue(CONFIG.DOM_IDS.editStartDate, event.startDate || "");
    setValue(CONFIG.DOM_IDS.editEndDate, event.endDate || "");
    setValue(CONFIG.DOM_IDS.editStartTime, event.startTime || "");
    setValue(CONFIG.DOM_IDS.editEndTime, event.endTime || "");
    setValue(CONFIG.DOM_IDS.editLocation, event.location || "");
    setValue(CONFIG.DOM_IDS.editResponsible, event.responsible || "");
    setValue(CONFIG.DOM_IDS.editDescription, event.description || "");

    const editor = byId(CONFIG.DOM_IDS.editorBox);
    if (editor) {
      editor.classList.remove("cm-hidden");
      editor.dataset.cmEditingEventId = event.id || "";
    }
  }

  function readEditor() {
    const editor = byId(CONFIG.DOM_IDS.editorBox);

    return {
      id: editor ? editor.dataset.cmEditingEventId || "" : "",
      title: getValue(CONFIG.DOM_IDS.editTitle),
      type: getValue(CONFIG.DOM_IDS.editType),
      startDate: getValue(CONFIG.DOM_IDS.editStartDate),
      endDate: getValue(CONFIG.DOM_IDS.editEndDate),
      startTime: getValue(CONFIG.DOM_IDS.editStartTime),
      endTime: getValue(CONFIG.DOM_IDS.editEndTime),
      location: getValue(CONFIG.DOM_IDS.editLocation),
      responsible: getValue(CONFIG.DOM_IDS.editResponsible),
      description: getValue(CONFIG.DOM_IDS.editDescription)
    };
  }

  function clearEditor() {
    const editor = byId(CONFIG.DOM_IDS.editorBox);

    if (editor) {
      editor.classList.add("cm-hidden");
      editor.dataset.cmEditingEventId = "";
    }

    [
      CONFIG.DOM_IDS.editTitle,
      CONFIG.DOM_IDS.editStartDate,
      CONFIG.DOM_IDS.editEndDate,
      CONFIG.DOM_IDS.editStartTime,
      CONFIG.DOM_IDS.editEndTime,
      CONFIG.DOM_IDS.editLocation,
      CONFIG.DOM_IDS.editResponsible,
      CONFIG.DOM_IDS.editDescription
    ].forEach((id) => setValue(id, ""));

    setValue(CONFIG.DOM_IDS.editType, CONFIG.EVENT_TYPES.EVENT);
  }

  CM.UI = {
    byId,
    qs,
    qsa,
    escapeHTML,

    setText,
    setValue,
    getValue,

    setOutput,
    setProcessing,

    showToast,
    hideToast,
    toastSuccess,
    toastError,
    toastWarning,
    toastInfo,

    getStatusSummary,
    updateSummary,

    setFileName,
    clearMainForm,

    openReviewModal,
    closeReviewModal,
    renderEventsTable,
    renderReview,

    fillEditor,
    readEditor,
    clearEditor
  };
})(window);