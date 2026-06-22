/*
  Nombre completo: ag-event-form.component.js
  Ruta: Agendador/js/componentes/ag-event-form.component.js

  Función:
    - Componente para manejar comportamiento visual del formulario.
    - Cambia campos según tipo: Evento, Pendiente o Recordatorio.
    - Lee recordatorios y canales seleccionados.
    - Restaura valores por defecto.
    - No guarda datos directamente.

  Se conecta con:
    - ../ag-config.js
    - ../ag-ui.js
    - ../ag-storage.js
    - ../servicios/ag-event.service.js
*/

(function initAgEventFormComponent(global) {
  "use strict";

  const AG = global.AG = global.AG || {};
  const CONFIG = AG.CONFIG;

  AG.Components = AG.Components || {};

  function getElements() {
    return {
      form: document.getElementById("agItemForm"),
      type: document.getElementById("agType"),
      title: document.getElementById("agTitle"),
      date: document.getElementById("agDate"),
      time: document.getElementById("agTime"),
      duration: document.getElementById("agDuration"),
      priority: document.getElementById("agPriority"),
      responsible: document.getElementById("agResponsible"),
      description: document.getElementById("agDescription")
    };
  }

  function readCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
      .map((input) => input.value);
  }

  function setCheckedValues(name, values) {
    const selectedValues = Array.isArray(values) ? values : [];

    document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = selectedValues.includes(input.value);
    });
  }

  function applyTypeRules(typeValue) {
    const elements = getElements();
    const type = typeValue || elements.type.value;

    if (type === CONFIG.TYPES.PENDING) {
      elements.time.required = false;
      elements.time.placeholder = "Opcional";
      elements.duration.disabled = true;
      elements.duration.value = String(CONFIG.DEFAULT_DURATION_MINUTES);
      return {
        type,
        timeRequired: false,
        durationDisabled: true
      };
    }

    elements.time.required = true;
    elements.time.placeholder = "";
    elements.duration.disabled = false;

    return {
      type,
      timeRequired: true,
      durationDisabled: false
    };
  }

  function setDefaultDateTime() {
    const elements = getElements();
    const now = new Date();

    if (!elements.date.value && AG.EventService) {
      elements.date.value = AG.EventService.formatDateInput(now);
    }

    if (!elements.time.value && AG.EventService) {
      elements.time.value = AG.EventService.formatTimeInput(now);
    }
  }

  function reset() {
    const elements = getElements();

    elements.form.reset();

    setDefaultDateTime();
    setCheckedValues("agReminder", CONFIG.DEFAULT_REMINDERS);
    setCheckedValues("agChannel", CONFIG.DEFAULT_CHANNELS);
    applyTypeRules(elements.type.value);

    elements.title.focus();

    return {
      ok: true,
      message: "Formulario reiniciado."
    };
  }

  function read() {
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

  function write(data) {
    const elements = getElements();
    const safeData = data || {};

    elements.type.value = safeData.type || CONFIG.TYPES.EVENT;
    elements.title.value = safeData.title || "";
    elements.date.value = safeData.date || "";
    elements.time.value = safeData.time || "";
    elements.duration.value = String(safeData.durationMinutes || CONFIG.DEFAULT_DURATION_MINUTES);
    elements.priority.value = safeData.priority || CONFIG.PRIORITIES.NORMAL;
    elements.responsible.value = safeData.responsibleId ||
      safeData.responsible && safeData.responsible.id ||
      CONFIG.DEFAULT_RESPONSIBLE.id;
    elements.description.value = safeData.description || "";

    setCheckedValues("agReminder", safeData.reminders || CONFIG.DEFAULT_REMINDERS);
    setCheckedValues("agChannel", safeData.channels || CONFIG.DEFAULT_CHANNELS);
    applyTypeRules(elements.type.value);

    return safeData;
  }

  function validate(data) {
    const safeData = data || read();

    if (!String(safeData.title || "").trim()) {
      throw new Error("Escribe un título.");
    }

    if (!String(safeData.date || "").trim()) {
      throw new Error("Selecciona una fecha.");
    }

    if (safeData.type !== CONFIG.TYPES.PENDING && !String(safeData.time || "").trim()) {
      throw new Error("Selecciona una hora.");
    }

    if (!Array.isArray(safeData.channels) || !safeData.channels.length) {
      throw new Error("Selecciona al menos un canal.");
    }

    if (!Array.isArray(safeData.reminders) || !safeData.reminders.length) {
      throw new Error("Selecciona al menos un recordatorio.");
    }

    return safeData;
  }

  function bindTypeChange() {
    const elements = getElements();

    elements.type.addEventListener("change", () => {
      applyTypeRules(elements.type.value);
    });
  }

  AG.Components.EventForm = {
    getElements,
    readCheckedValues,
    setCheckedValues,
    applyTypeRules,
    setDefaultDateTime,
    reset,
    read,
    write,
    validate,
    bindTypeChange
  };
})(window);