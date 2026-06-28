/*
  Nombre completo: ag-form-fill.js
  Ruta: modulos/agenda/form/ag-form-fill.js

  Función:
    - Llenar, limpiar y cambiar modo del formulario Agenda.
*/

(function initAgendaFormFill(global) {
  "use strict";

  const root = global.AgendaJeffModules = global.AgendaJeffModules || {};
  const agenda = root.Agenda = root.Agenda || {};

  function setValue(id, value) {
    const element = agenda.dom.getElement(id);
    if (element) element.value = value || "";
  }

  function setChecked(id, value) {
    const element = agenda.dom.getElement(id);
    if (element) element.checked = Boolean(value);
  }

  function fillForm(item) {
    const data = item && typeof item === "object" ? item : {};
    const recordatorios = data.recordatorios || {};
    const canales = data.canales || {};

    setValue("agIdLocal", data.idLocal || "");
    setValue("agType", data.tipo || "evento");
    setValue("agStatus", data.estado || "activo");
    setValue("agTitle", data.titulo || "");
    setValue("agDescription", data.descripcion || "");
    setValue("agStartDate", data.fechaInicio || "");
    setValue("agEndDate", data.fechaFin || "");
    setValue("agStartTime", data.horaInicio || "");
    setValue("agEndTime", data.horaFin || "");
    setChecked("agAllDay", data.todoDia);
    setValue("agCategory", data.categoriaId || "otro");
    setValue("agRepeat", data.repeticion && data.repeticion.tipo ? data.repeticion.tipo : "none");

    setChecked("agReminder5", recordatorios.cincoDiasAntes !== false);
    setChecked("agReminder3", recordatorios.tresDiasAntes !== false);
    setChecked("agReminder1", recordatorios.unDiaAntes !== false);
    setChecked("agReminderSameDay", recordatorios.mismoDia !== false);
    setChecked("agUseWorkdays", recordatorios.usarDiasLaborables);

    setChecked("agChannelDesktop", canales.escritorio !== false);
    setChecked("agChannelTelegram", canales.telegram !== false);
    setChecked("agChannelGoogle", canales.googleCalendar !== false);

    setFormMode("edit", data.idLocal || "");
  }

  function clearForm() {
    const form = agenda.dom.getElement("agEventForm");
    if (form && typeof form.reset === "function") form.reset();

    setValue("agIdLocal", "");
    setValue("agStatus", "activo");
    setChecked("agReminder5", true);
    setChecked("agReminder3", true);
    setChecked("agReminder1", true);
    setChecked("agReminderSameDay", true);
    setChecked("agUseWorkdays", false);
    setChecked("agChannelDesktop", true);
    setChecked("agChannelTelegram", true);
    setChecked("agChannelGoogle", true);
    setFormMode("create", "");
  }

  function setFormMode(mode, idLocal) {
    const title = agenda.dom.getElement("agFormTitle");
    const description = agenda.dom.getElement("agFormDescription");
    const saveButton = agenda.dom.getElement("agBtnSaveDraft");
    const cancelButton = agenda.dom.getElement("agBtnCancelEdit");

    if (mode === "edit") {
      if (title) title.textContent = "Editar registro";
      if (description) description.textContent = `Editando: ${idLocal}`;
      if (saveButton) saveButton.textContent = "Actualizar registro";
      if (cancelButton) cancelButton.hidden = false;
      return;
    }

    if (title) title.textContent = "Nuevo registro";
    if (description) description.textContent = "Un solo modelo para evento, recordatorio o pendiente.";
    if (saveButton) saveButton.textContent = "Guardar en base local";
    if (cancelButton) cancelButton.hidden = true;
  }

  agenda.formFill = Object.freeze({ fillForm, clearForm, setFormMode });
})(window);
