/*
  Nombre completo: tl-app.js
  Ruta: telegram/js/tl-app.js
  Función:
    - Controlador principal de la pantalla Telegram.
    - Conecta formularios, almacenamiento local, API de Telegram y Firebase.
    - Permite guardar conexión, probar conexión y enviar un evento de prueba.

  Se conecta con:
    - tl-config.js
    - tl-storage.js
    - tl-telegram-api.js
    - tl-event.service.js
    - tl-firebase-config.js
    - tl-firebase.service.js
    - tl-index.html
*/

(function initTlApp(global) {
  "use strict";

  const TL = global.TL;

  const elements = {
    statusBadge: document.getElementById("tlStatusBadge"),
    output: document.getElementById("tlOutput"),

    connectionForm: document.getElementById("tlConnectionForm"),
    botToken: document.getElementById("tlBotToken"),
    chatId: document.getElementById("tlChatId"),
    testConnectionBtn: document.getElementById("tlTestConnectionBtn"),
    clearConnectionBtn: document.getElementById("tlClearConnectionBtn"),

    eventForm: document.getElementById("tlEventForm"),
    eventTitle: document.getElementById("tlEventTitle"),
    eventDate: document.getElementById("tlEventDate"),
    eventTime: document.getElementById("tlEventTime"),
    eventDescription: document.getElementById("tlEventDescription")
  };

  function todayAsInputDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function setStatus(type, text) {
    elements.statusBadge.className = `tl-status tl-status--${type}`;
    elements.statusBadge.textContent = text;
  }

  function setOutput(data) {
    if (typeof data === "string") {
      elements.output.textContent = data;
      return;
    }

    elements.output.textContent = JSON.stringify(data, null, 2);
  }

  function setBusy(isBusy) {
    const buttons = document.querySelectorAll("button");

    buttons.forEach((button) => {
      button.disabled = isBusy;
    });
  }

  function readConnectionFromInputs() {
    return {
      botToken: elements.botToken.value,
      chatId: elements.chatId.value
    };
  }

  async function loadSavedConnection() {
    const connection = TL.Storage.readConnection();

    elements.botToken.value = connection.botToken || "";
    elements.chatId.value = connection.chatId || "";

    try {
      await TL.FirebaseService.checkFirebaseConnection();
    } catch (error) {
      setStatus("error", "Firebase error");
      setOutput({
        ok: false,
        message: "Telegram puede funcionar, pero Firebase no inicializó.",
        error: error.message
      });
      return;
    }

    if (connection.botToken && connection.chatId) {
      try {
        const firebaseStatus = await TL.FirebaseService.readTelegramConnectionStatus();

        setStatus("idle", "Guardado local");
        setOutput({
          ok: true,
          message: "Conexión cargada desde localStorage.",
          local: {
            botTokenSaved: true,
            chatId: connection.chatId,
            savedAt: connection.savedAt || null
          },
          firebase: firebaseStatus,
          note: "Aún puedes volver a probar Telegram para actualizar Firebase."
        });
      } catch (error) {
        setStatus("idle", "Guardado local");
        setOutput({
          ok: true,
          message: "Conexión cargada localmente, pero no se pudo leer Firebase.",
          local: {
            botTokenSaved: true,
            chatId: connection.chatId,
            savedAt: connection.savedAt || null
          },
          firebaseError: error.message
        });
      }

      return;
    }

    setStatus("idle", "Sin probar");
    setOutput({
      ok: true,
      message: "Esperando acción.",
      firebasePath: "conexiones/telegram"
    });
  }

  async function saveConnection(event) {
    event.preventDefault();

    setBusy(true);
    setStatus("loading", "Guardando");

    try {
      const connection = TL.Storage.saveConnection(readConnectionFromInputs());

      const firebasePayload = await TL.FirebaseService.saveTelegramSavedConnectionStatus({
        botToken: connection.botToken,
        chatId: connection.chatId,
        savedAt: connection.savedAt
      });

      setStatus("idle", "Guardado");

      setOutput({
        ok: true,
        message: "Conexión guardada en localStorage y Cloud Firestore.",
        firestorePath: "conexiones/telegram",
        savedAt: connection.savedAt,
        local: {
          botTokenSaved: true,
          chatId: connection.chatId
        },
        firebase: firebasePayload,
        note: "La conexión ya quedó guardada. Usa Probar conexión solo para validar Telegram."
      });
    } catch (error) {
      setStatus("error", "Error");
      setOutput({
        ok: false,
        message: error.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    setStatus("loading", "Probando");

    let connection = {
      botToken: "",
      chatId: ""
    };

    try {
      connection = TL.Storage.saveConnection(readConnectionFromInputs());

      const botInfo = await TL.TelegramApi.getMe(connection.botToken);

      const message = [
        "✅ <b>AgendaJeff conectado con Telegram</b>",
        "",
        "La conexión básica funciona correctamente.",
        `Bot: @${botInfo.username || "sin_username"}`,
        `Fecha de prueba: ${new Date().toLocaleString()}`
      ].join("\n");

      const sentMessage = await TL.TelegramApi.sendMessage({
        botToken: connection.botToken,
        chatId: connection.chatId,
        text: message
      });

      const firebasePayload = await TL.FirebaseService.saveTelegramConnectedStatus({
        botUsername: botInfo.username || "",
        chatId: connection.chatId,
        messageId: sentMessage.message_id
      });

      setStatus("ok", "Conectado");

      setOutput({
        ok: true,
        message: "Telegram funciona correctamente y Firebase fue actualizado.",
        firestorePath: "conexiones/telegram",
        bot: {
          id: botInfo.id,
          username: botInfo.username,
          firstName: botInfo.first_name
        },
        telegram: {
          sentMessageId: sentMessage.message_id
        },
        firebase: firebasePayload
      });
    } catch (error) {
      try {
        await TL.FirebaseService.saveTelegramErrorStatus({
          message: error.message,
          chatId: connection.chatId || normalizeText(elements.chatId.value)
        });
      } catch (firebaseError) {
        setStatus("error", "Error");
        setOutput({
          ok: false,
          message: error.message,
          firebaseError: firebaseError.message,
          help: "Telegram falló y además Firebase no pudo guardar el error."
        });
        return;
      }

      setStatus("error", "Error");
      setOutput({
        ok: false,
        message: error.message,
        firestorePath: "conexiones/telegram",
        help: "Revisa que el Bot Token sea correcto, que el Chat ID sea correcto y que hayas iniciado conversación con el bot."
      });
    } finally {
      setBusy(false);
    }
  }

  async function clearConnection() {
    setBusy(true);
    setStatus("loading", "Borrando");

    try {
      TL.Storage.clearConnection();

      elements.botToken.value = "";
      elements.chatId.value = "";

      const firebasePayload = await TL.FirebaseService.saveTelegramDisconnectedStatus();

      setStatus("idle", "Desconectado");

      setOutput({
        ok: true,
        message: "Datos de Telegram borrados del navegador y Firebase actualizado.",
        firestorePath: "conexiones/telegram",
        firebase: firebasePayload
      });
    } catch (error) {
      setStatus("error", "Error");
      setOutput({
        ok: false,
        message: error.message
      });
    } finally {
      setBusy(false);
    }
  }

  async function sendTestEvent(event) {
    event.preventDefault();

    setBusy(true);
    setStatus("loading", "Enviando");

    let connection = {
      botToken: "",
      chatId: ""
    };

    try {
      connection = TL.Storage.saveConnection(readConnectionFromInputs());

      const testEvent = TL.EventService.createTestEvent({
        title: elements.eventTitle.value,
        date: elements.eventDate.value,
        time: elements.eventTime.value,
        description: elements.eventDescription.value
      });

      const text = TL.EventService.formatEventForTelegram(testEvent);

      const sentMessage = await TL.TelegramApi.sendMessage({
        botToken: connection.botToken,
        chatId: connection.chatId,
        text
      });

      const firebasePayload = await TL.FirebaseService.saveTelegramEventTestStatus({
        chatId: connection.chatId,
        messageId: sentMessage.message_id,
        event: testEvent
      });

      setStatus("ok", "Evento enviado");

      setOutput({
        ok: true,
        message: "Evento de prueba enviado a Telegram y Firebase actualizado.",
        firestorePath: "conexiones/telegram",
        event: testEvent,
        telegram: {
          sentMessageId: sentMessage.message_id
        },
        firebase: firebasePayload
      });
    } catch (error) {
      try {
        await TL.FirebaseService.saveTelegramErrorStatus({
          message: error.message,
          chatId: connection.chatId || normalizeText(elements.chatId.value)
        });
      } catch (firebaseError) {
        setStatus("error", "Error");
        setOutput({
          ok: false,
          message: error.message,
          firebaseError: firebaseError.message
        });
        return;
      }

      setStatus("error", "Error");

      setOutput({
        ok: false,
        message: error.message,
        firestorePath: "conexiones/telegram"
      });
    } finally {
      setBusy(false);
    }
  }

  function bindEvents() {
    elements.connectionForm.addEventListener("submit", saveConnection);
    elements.testConnectionBtn.addEventListener("click", testConnection);
    elements.clearConnectionBtn.addEventListener("click", clearConnection);
    elements.eventForm.addEventListener("submit", sendTestEvent);
  }

  function init() {
    elements.eventDate.value = todayAsInputDate();

    bindEvents();
    loadSavedConnection();
  }

  init();
})(window);