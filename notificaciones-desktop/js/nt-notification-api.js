/*
  Nombre completo: nt-notification-api.js
  Ruta: notificaciones-desktop/js/nt-notification-api.js
  Función:
    - Probar notificaciones web usando la API Notification del navegador.
    - Pedir permiso de notificaciones.
    - Probar notificación simple.
    - Probar notificación de evento.
    - Probar notificación de pendiente urgente.
    - Probar notificación de defensa.
    - Probar sonido local desde el navegador.
    - Guardar resultado de prueba en localStorage y Firebase.

  Se conecta con:
    - nt-config.js
    - nt-storage.js
    - nt-firebase.service.js
    - nt-environment.service.js
    - nt-ui.js
    - nt-actions.js

  Importante:
    - Esto funciona en modo Web si el navegador permite notificaciones.
    - Esto NO controla icono junto al reloj ni bandeja de Windows.
    - Las funciones reales de Windows/Electron van por nt-electron-bridge.js.
*/

(function initNtNotificationApi(global) {
  "use strict";

  const NT = global.NT = global.NT || {};
  const CONFIG = NT.CONFIG;
  const Utils = NT.Utils;

  function isSupported() {
    return typeof global.Notification === "function";
  }

  function getPermission() {
    if (!isSupported()) {
      return "unsupported";
    }

    return Utils.normalizePermission(global.Notification.permission);
  }

  function buildBaseResult(extraData) {
    const environment = NT.EnvironmentService
      ? NT.EnvironmentService.detectEnvironment()
      : {};

    return {
      ok: true,
      appName: CONFIG.APP_NAME,
      moduleName: CONFIG.MODULE_NAME,
      environmentMode: environment.environmentMode || CONFIG.ENVIRONMENT_WEB,
      electronAvailable: Boolean(environment.electronAvailable),
      webNotificationsSupported: isSupported(),
      webNotificationsPermission: getPermission(),
      createdAt: Utils.nowIso(),
      ...(Utils.isPlainObject(extraData) ? extraData : {})
    };
  }

  function assertNotificationSupport() {
    if (!isSupported()) {
      throw new Error(
        "Este navegador no soporta notificaciones web. En Electron se probará con el puente real."
      );
    }
  }

  async function requestPermission() {
    assertNotificationSupport();

    let permission = getPermission();

    if (permission === "default") {
      permission = await global.Notification.requestPermission();
    }

    const result = buildBaseResult({
      testType: CONFIG.TEST_WEB_PERMISSION,
      permission,
      ok: permission === "granted",
      message: permission === "granted"
        ? "Permiso de notificaciones concedido."
        : "Permiso de notificaciones no concedido."
    });

    await saveTestResult(CONFIG.TEST_WEB_PERMISSION, result.ok ? "ok" : "error", {
      webNotificationsPermission: permission
    });

    return result;
  }

  async function ensurePermission() {
    assertNotificationSupport();

    let permission = getPermission();

    if (permission === "default") {
      const permissionResult = await requestPermission();
      permission = permissionResult.permission;
    }

    if (permission !== "granted") {
      throw new Error(
        "No hay permiso para mostrar notificaciones. Presiona primero 'Pedir permiso de notificaciones'."
      );
    }

    return permission;
  }

  function createNotification(title, options) {
    return new global.Notification(title, options);
  }

  async function showWebNotification(payload) {
    await ensurePermission();

    const title = Utils.cleanString(payload && payload.title)
      || "AgendaJeff";

    const body = Utils.cleanString(payload && payload.body)
      || "Notificación de prueba desde AgendaJeff.";

    const tag = Utils.cleanString(payload && payload.tag)
      || `agendajeff-${Date.now()}`;

    const notification = createNotification(title, {
      body,
      tag,
      requireInteraction: false,
      silent: false
    });

    notification.onclick = function handleNotificationClick() {
      try {
        global.focus();
      } catch (error) {
        // No hacemos nada si el navegador no permite focus.
      }

      notification.close();
    };

    return buildBaseResult({
      testType: Utils.cleanString(payload && payload.testType),
      title,
      body,
      tag,
      message: "Notificación web enviada correctamente."
    });
  }

  async function testWebSimple() {
    const result = await showWebNotification({
      testType: CONFIG.TEST_WEB_SIMPLE,
      title: "AgendaJeff",
      body: "Esta es una notificación web simple de prueba.",
      tag: "nt-web-simple"
    });

    await saveTestResult(CONFIG.TEST_WEB_SIMPLE, "ok", result);

    return result;
  }

  async function testWebEvent() {
    const result = await showWebNotification({
      testType: CONFIG.TEST_WEB_EVENT,
      title: "AgendaJeff - Evento próximo",
      body: "Tienes un evento de prueba en 30 minutos.",
      tag: "nt-web-event"
    });

    await saveTestResult(CONFIG.TEST_WEB_EVENT, "ok", result);

    return result;
  }

  async function testWebTask() {
    const result = await showWebNotification({
      testType: CONFIG.TEST_WEB_TASK,
      title: "AgendaJeff - Pendiente urgente",
      body: "Tienes un pendiente urgente marcado como importante.",
      tag: "nt-web-task"
    });

    await saveTestResult(CONFIG.TEST_WEB_TASK, "ok", result);

    return result;
  }

  async function testWebDefense() {
    const result = await showWebNotification({
      testType: CONFIG.TEST_WEB_DEFENSE,
      title: "AgendaJeff - Defensa",
      body: "Defensa de prueba: estudiante, carrera, aula y hora configuradas.",
      tag: "nt-web-defense"
    });

    await saveTestResult(CONFIG.TEST_WEB_DEFENSE, "ok", result);

    return result;
  }

  async function testSound() {
    const AudioContextClass = global.AudioContext || global.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("Este navegador no permite probar sonido con AudioContext.");
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.24);

    const result = buildBaseResult({
      testType: CONFIG.TEST_WEB_SOUND,
      message: "Sonido de prueba ejecutado correctamente."
    });

    await saveTestResult(CONFIG.TEST_WEB_SOUND, "ok", result);

    return result;
  }

  async function saveTestResult(testType, status, extraData) {
    const environment = NT.EnvironmentService
      ? NT.EnvironmentService.detectEnvironment()
      : {};

    const payload = {
      ...(Utils.isPlainObject(extraData) ? extraData : {}),
      environmentMode: environment.environmentMode || CONFIG.ENVIRONMENT_WEB,
      electronAvailable: Boolean(environment.electronAvailable),
      webNotificationsSupported: isSupported(),
      webNotificationsPermission: getPermission(),
      originMode: environment.originMode || CONFIG.ORIGIN_UNKNOWN,
      lastTestAt: Utils.nowIso(),
      lastTestType: Utils.cleanString(testType),
      lastTestStatus: Utils.cleanString(status || "ok"),
      lastErrorMessage: ""
    };

    if (NT.Storage) {
      NT.Storage.updateSettings(payload);
    }

    if (NT.FirebaseService && typeof NT.FirebaseService.saveLastTestStatus === "function") {
      try {
        await NT.FirebaseService.saveLastTestStatus(testType, status, payload);
      } catch (error) {
        payload.firebaseWarning = error.message;
      }
    }

    return payload;
  }

  async function saveError(error, testType) {
    const message = error && error.message
      ? error.message
      : String(error || "Error desconocido.");

    const environment = NT.EnvironmentService
      ? NT.EnvironmentService.detectEnvironment()
      : {};

    const payload = {
      ok: false,
      message,
      environmentMode: environment.environmentMode || CONFIG.ENVIRONMENT_WEB,
      electronAvailable: Boolean(environment.electronAvailable),
      webNotificationsSupported: isSupported(),
      webNotificationsPermission: getPermission(),
      originMode: environment.originMode || CONFIG.ORIGIN_UNKNOWN,
      lastTestAt: Utils.nowIso(),
      lastTestType: Utils.cleanString(testType || "notification-error"),
      lastTestStatus: "error",
      lastErrorMessage: message
    };

    if (NT.Storage) {
      NT.Storage.updateSettings(payload);
    }

    if (NT.FirebaseService && typeof NT.FirebaseService.saveErrorStatus === "function") {
      try {
        await NT.FirebaseService.saveErrorStatus(error, payload);
      } catch (firebaseError) {
        payload.firebaseWarning = firebaseError.message;
      }
    }

    return payload;
  }

  NT.NotificationApi = {
    isSupported,
    getPermission,
    requestPermission,
    ensurePermission,
    showWebNotification,
    testWebSimple,
    testWebEvent,
    testWebTask,
    testWebDefense,
    testSound,
    saveTestResult,
    saveError
  };
})(window);