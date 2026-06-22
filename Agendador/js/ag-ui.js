/*
  Nombre completo: ag-ui.js
  Ruta: Agendador/js/ag-ui.js

  Función:
    - Leer datos de la pantalla.
    - Escribir datos en la pantalla.
    - Renderizar responsables, filtros, lista, contadores y estados superiores.
    - Mostrar modal de responsables externos.
    - Mostrar mensajes rápidos tipo toast.
    - No guarda datos directamente en localStorage.

  Se conecta con:
    - ag-config.js
    - ag-storage.js
    - servicios/ag-event.service.js
    - ag-app.js
    - ag-bindings.js
*/

(function initAgUi(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  let toastTimer = null;

  function getElements() {
    return {
      clock: document.getElementById("agClock"),
      connectionStatus: document.getElementById("agConnectionStatus"),

      nextEventTitle: document.getElementById("agNextEventTitle"),
      nextEventTime: document.getElementById("agNextEventTime"),
      todayCount: document.getElementById("agTodayCount"),
      tomorrowCount: document.getElementById("agTomorrowCount"),
      pendingCount: document.getElementById("agPendingCount"),

      itemForm: document.getElementById("agItemForm"),
      type: document.getElementById("agType"),
      title: document.getElementById("agTitle"),
      date: document.getElementById("agDate"),
      time: document.getElementById("agTime"),
      duration: document.getElementById("agDuration"),
      priority: document.getElementById("agPriority"),
      responsible: document.getElementById("agResponsible"),
      description: document.getElementById("agDescription"),

      openResponsibleModalBtn: document.getElementById("agOpenResponsibleModalBtn"),
      resetFormBtn: document.getElementById("agResetFormBtn"),
      seedDemoBtn: document.getElementById("agSeedDemoBtn"),

      filterSubtitle: document.getElementById("agFilterSubtitle"),
      itemList: document.getElementById("agItemList"),
      output: document.getElementById("agOutput"),

      responsibleModal: document.getElementById("agResponsibleModal"),
      closeResponsibleModalBtn: document.getElementById("agCloseResponsibleModalBtn"),
      cancelResponsibleBtn: document.getElementById("agCancelResponsibleBtn"),
      saveResponsibleBtn: document.getElementById("agSaveResponsibleBtn"),
      responsibleName: document.getElementById("agResponsibleName"),
      responsibleEmail: document.getElementById("agResponsibleEmail"),
      responsiblePhone: document.getElementById("agResponsiblePhone"),

      toast: document.getElementById("agToast")
    };
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDateTimeLabel(item) {
    const safeItem = item || {};
    const date = AG.Storage.normalizeText(safeItem.date);
    const time = AG.Storage.normalizeText(safeItem.time);

    if (!date && !time) {
      return "Sin fecha";
    }

    if (date && !time) {
      return date;
    }

    return `${date} · ${time}`;
  }

  function formatResponsibleLabel(responsible) {
    const safeResponsible = responsible || CONFIG.DEFAULT_RESPONSIBLE;

    if (safeResponsible.email) {
      return `${safeResponsible.name} · ${safeResponsible.email}`;
    }

    if (safeResponsible.phone) {
      return `${safeResponsible.name} · ${safeResponsible.phone}`;
    }

    return safeResponsible.name;
  }

  function setupInitialInputs() {
    const elements = getElements();
    const today = new Date();

    if (elements.date && !elements.date.value) {
      elements.date.value = AG.EventService.formatDateInput(today);
    }

    if (elements.time && !elements.time.value) {
      elements.time.value = AG.EventService.formatTimeInput(today);
    }
  }

  function readCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
      .map((input) => input.value);
  }

  function readForm() {
    const elements = getElements();

    return {
      type: elements.type.value,
      title: elements.title.value,
      date: elements.date.value,
      time: elements.time.value,
      durationMinutes: elements.duration.value,
      priority: elements.priority.value,
      responsibleId: elements.responsible.value,
      description: elements.description.value,
      reminders: readCheckedValues("agReminder"),
      channels: readCheckedValues("agChannel")
    };
  }

  function clearForm() {
    const elements = getElements();

    elements.itemForm.reset();
    setupInitialInputs();

    const defaultReminderValues = CONFIG.DEFAULT_REMINDERS;
    document.querySelectorAll('input[name="agReminder"]').forEach((input) => {
      input.checked = defaultReminderValues.includes(input.value);
    });

    document.querySelectorAll('input[name="agChannel"]').forEach((input) => {
      input.checked = CONFIG.DEFAULT_CHANNELS.includes(input.value);
    });

    elements.title.focus();
  }

  function renderResponsibles(responsibles, selectedId) {
    const elements = getElements();
    const safeResponsibles = Array.isArray(responsibles) ? responsibles : [];
    const selected = AG.Storage.normalizeText(selectedId) || CONFIG.DEFAULT_RESPONSIBLE.id;

    elements.responsible.innerHTML = safeResponsibles.map((responsible) => {
      const id = escapeHtml(responsible.id);
      const label = escapeHtml(formatResponsibleLabel(responsible));
      const isSelected = responsible.id === selected ? "selected" : "";

      return `<option value="${id}" ${isSelected}>${label}</option>`;
    }).join("");
  }

  function renderConnectionStatus(statusMap) {
    const elements = getElements();
    const safeStatusMap = statusMap || {};

    const orderedConnections = [
      CONFIG.CONNECTIONS.LOCAL,
      CONFIG.CONNECTIONS.FIREBASE,
      CONFIG.CONNECTIONS.TELEGRAM,
      CONFIG.CONNECTIONS.GOOGLE,
      CONFIG.CONNECTIONS.MICROSOFT,
      CONFIG.CONNECTIONS.DESKTOP
    ];

    elements.connectionStatus.innerHTML = orderedConnections.map((connectionName) => {
      const item = safeStatusMap[connectionName] || {};
      const status = item.status || CONFIG.CONNECTION_STATUS.IDLE;
      const label = item.label || CONFIG.CONNECTION_LABELS[connectionName] || connectionName;
      const message = item.message || "Sin probar";

      return [
        `<button class="ag-chip ag-chip--${escapeHtml(status)}" type="button" title="${escapeHtml(message)}">`,
        `<span class="ag-dot"></span>`,
        `${escapeHtml(label)}`,
        `</button>`
      ].join("");
    }).join("");
  }

  function renderSummary(summary) {
    const elements = getElements();
    const safeSummary = summary || {};
    const nextItem = safeSummary.nextItem || null;

    if (nextItem) {
      elements.nextEventTitle.textContent = nextItem.title;
      elements.nextEventTime.textContent = formatDateTimeLabel(nextItem);
    } else {
      elements.nextEventTitle.textContent = "Sin eventos próximos";
      elements.nextEventTime.textContent = "Crea un evento para verlo aquí.";
    }

    elements.todayCount.textContent = String(safeSummary.todayCount || 0);
    elements.tomorrowCount.textContent = String(safeSummary.tomorrowCount || 0);
    elements.pendingCount.textContent = String(safeSummary.pendingCount || 0);
  }

  function typeClass(itemType) {
    if (itemType === CONFIG.TYPES.PENDING) {
      return "ag-item--pending";
    }

    if (itemType === CONFIG.TYPES.REMINDER) {
      return "ag-item--reminder";
    }

    return "";
  }

  function renderItem(item) {
    const responsible = item.responsible || CONFIG.DEFAULT_RESPONSIBLE;
    const typeLabel = CONFIG.TYPE_LABELS[item.type] || item.type;
    const priorityLabel = CONFIG.PRIORITY_LABELS[item.priority] || item.priority;
    const isCompleted = item.status === CONFIG.STATUS.COMPLETED;
    const completedClass = isCompleted ? "ag-item--completed" : "";
    const priorityClass = item.priority === CONFIG.PRIORITIES.URGENT ? "ag-pill--urgent" : "";

    return `
      <article class="ag-item ${typeClass(item.type)} ${completedClass}">
        <div class="ag-item-header">
          <div>
            <h3 class="ag-item-title">${escapeHtml(item.title)}</h3>

            <div class="ag-item-meta">
              <span class="ag-pill ag-pill--${escapeHtml(item.type)}">${escapeHtml(typeLabel)}</span>
              <span class="ag-pill ${priorityClass}">${escapeHtml(priorityLabel)}</span>
              <span class="ag-pill">${escapeHtml(formatDateTimeLabel(item))}</span>
              <span class="ag-pill">${escapeHtml(responsible.name || "Yo")}</span>
            </div>
          </div>

          <span class="ag-pill">${isCompleted ? "Completado" : "Activo"}</span>
        </div>

        ${item.description ? `<p class="ag-item-description">${escapeHtml(item.description)}</p>` : ""}

        <div class="ag-item-actions">
          <button class="ag-mini-btn" type="button" data-action="complete" data-id="${escapeHtml(item.id)}">
            Completar
          </button>

          <button class="ag-mini-btn" type="button" data-action="duplicate" data-id="${escapeHtml(item.id)}">
            Duplicar
          </button>

          <button class="ag-mini-btn ag-mini-btn--danger" type="button" data-action="delete" data-id="${escapeHtml(item.id)}">
            Eliminar
          </button>
        </div>
      </article>
    `;
  }

  function renderItems(items, activeFilter) {
    const elements = getElements();
    const safeItems = Array.isArray(items) ? items : [];
    const filterLabel = CONFIG.FILTER_LABELS[activeFilter] || "Próximos";

    elements.filterSubtitle.textContent = `Mostrando: ${filterLabel}.`;

    document.querySelectorAll(".ag-filter-btn").forEach((button) => {
      button.classList.toggle(
        "ag-filter-btn--active",
        button.dataset.filter === activeFilter
      );
    });

    if (!safeItems.length) {
      elements.itemList.innerHTML = `
        <div class="ag-empty">
          No hay registros para este filtro.
        </div>
      `;
      return;
    }

    elements.itemList.innerHTML = safeItems.map(renderItem).join("");
  }

  function setOutput(payload) {
    const elements = getElements();

    if (typeof payload === "string") {
      elements.output.textContent = payload;
      return;
    }

    elements.output.textContent = JSON.stringify(payload, null, 2);
  }

  function showToast(message) {
    const elements = getElements();

    if (!elements.toast) {
      return;
    }

    clearTimeout(toastTimer);

    elements.toast.textContent = message;
    elements.toast.classList.remove("ag-hidden");

    toastTimer = setTimeout(() => {
      elements.toast.classList.add("ag-hidden");
    }, 2600);
  }

  function openResponsibleModal() {
    const elements = getElements();

    elements.responsibleModal.classList.remove("ag-hidden");
    elements.responsibleModal.setAttribute("aria-hidden", "false");
    elements.responsibleName.focus();
  }

  function closeResponsibleModal() {
    const elements = getElements();

    elements.responsibleModal.classList.add("ag-hidden");
    elements.responsibleModal.setAttribute("aria-hidden", "true");

    elements.responsibleName.value = "";
    elements.responsibleEmail.value = "";
    elements.responsiblePhone.value = "";
  }

  function readResponsibleModal() {
    const elements = getElements();

    return {
      name: elements.responsibleName.value,
      email: elements.responsibleEmail.value,
      phone: elements.responsiblePhone.value
    };
  }

  function setClock(date) {
    const elements = getElements();
    const safeDate = date instanceof Date ? date : new Date();

    elements.clock.textContent = safeDate.toLocaleTimeString(CONFIG.DATE_LOCALE, {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  AG.UI = {
    getElements,
    escapeHtml,

    setupInitialInputs,
    readForm,
    clearForm,

    renderResponsibles,
    renderConnectionStatus,
    renderSummary,
    renderItems,

    setOutput,
    showToast,

    openResponsibleModal,
    closeResponsibleModal,
    readResponsibleModal,

    setClock
  };
})(window);