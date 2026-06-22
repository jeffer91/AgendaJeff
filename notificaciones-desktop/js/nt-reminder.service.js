/*
  Nombre completo: nt-reminder.service.js
  Ruta: notificaciones-desktop/js/nt-reminder.service.js
  Función:
    - Preparar prueba de recordatorio automático.
    - En modo Web responde que el recordatorio real de escritorio solo funcionará en Electron.
    - En modo Electron enviará la prueba al puente real.
    - Deja listo el formato de datos para futuros eventos/pendientes de AgendaJeff.

  Se conecta con:
    - nt-config.js
    - nt-electron-bridge.js
    - nt-actions.js
    - nt-ui.js

  Importante:
    - Todavía no lee eventos reales de Google Calendar ni Microsoft Calendar.
    - Todavía no lee la agenda principal.
    - Solo prueba la estructura de recordatorio.
*/

(function initNtReminderService(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const CONFIG = NT.CONFIG;
  const Utils = NT.Utils;

  function assertElectronBridgeService() {
    if (!NT.ElectronBridge || typeof NT.ElectronBridge.runElectronTest !== "function") {
      throw new Error("No está cargado nt-electron-bridge.js.");
    }
  }

  function createSampleReminder() {
    const now = new Date();
    const reminderDate = new Date(now.getTime() + 60 * 1000);

    return {
      id: `nt-reminder-${Date.now()}`,
      title: "Recordatorio de prueba AgendaJeff",
      description: "Este recordatorio confirma que el motor de avisos está preparado para Electron.",
      type: "recordatorio-prueba",
      label: "Prueba",
      priority: "normal",
      reminderAt: reminderDate.toISOString(),
      createdAt: Utils.nowIso()
    };
  }

  async function testAutomaticReminder() {
    assertElectronBridgeService();

    const sampleReminder = createSampleReminder();

    return await NT.ElectronBridge.runElectronTest(CONFIG.TEST_REMINDER, {
      title: "AgendaJeff - Recordatorio automático",
      body: "Prueba de recordatorio automático para evento o pendiente.",
      reminder: sampleReminder,
      requestedAt: Utils.nowIso()
    });
  }

  NT.ReminderService = {
    createSampleReminder,
    testAutomaticReminder
  };
})(window);