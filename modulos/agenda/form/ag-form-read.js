/*
  Nombre completo: ag-form-read.js
  Ruta: modulos/agenda/form/ag-form-read.js

  Función:
    - Leer el formulario de Agenda y convertirlo al modelo único de AgendaJeff.
*/

(function initAgendaFormRead(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const agenda = root.Agenda = root.Agenda || {};

  function value(id) {
    const element = agenda.dom.getElement(id);
    return element && typeof element.value === "string" ? element.value.trim() : "";
  }

  function checked(id, fallback) {
    const element = agenda.dom.getElement(id);
    return element ? Boolean(element.checked) : Boolean(fallback);
  }

  function readFormItem() {
    const idLocal = value("agIdLocal");

    return {
      idLocal,
      tipo: value("agType") || "evento",
      titulo: value("agTitle"),
      descripcion: value("agDescription"),
      fechaInicio: value("agStartDate"),
      fechaFin: value("agEndDate"),
      horaInicio: value("agStartTime"),
      horaFin: value("agEndTime"),
      todoDia: checked("agAllDay", false),
      estado: value("agStatus") || "activo",
      categoria: value("agCategory") || "otro",
      repeticion: {
        tipo: value("agRepeat") || "none"
      },
      canales: {
        escritorio: checked("agChannelDesktop", true),
        telegram: checked("agChannelTelegram", true),
        googleCalendar: checked("agChannelGoogle", true)
      },
      recordatorios: {
        cincoDiasAntes: checked("agReminder5", true),
        tresDiasAntes: checked("agReminder3", true),
        unDiaAntes: checked("agReminder1", true),
        mismoDia: checked("agReminderSameDay", true),
        usarDiasLaborables: checked("agUseWorkdays", false),
        horasSinHora: ["06:00", "13:00", "17:00"],
        horasPendiente: ["06:00", "17:00"]
      },
      origen: {
        tipo: "manual",
        archivo: "",
        textoOriginal: ""
      },
      creadoEn: new Date().toISOString()
    };
  }

  function validateFormItem(item) {
    const errors = [];
    const data = item && typeof item === "object" ? item : {};

    if (!data.titulo) errors.push("Falta la actividad.");
    if (!data.fechaInicio) errors.push("Falta la fecha de inicio.");
    if (data.horaInicio && data.horaFin && data.horaFin < data.horaInicio) errors.push("La hora fin no puede ser menor que la hora inicio.");

    return {
      ok: errors.length === 0,
      errors,
      message: errors.length ? "Corrige los campos marcados antes de guardar." : "Formulario válido."
    };
  }

  agenda.formRead = Object.freeze({ readFormItem, validateFormItem });
})(window);
