# Nombre completo: tl-test-checklist.md
# Ruta: modulos/telegram/tests/tl-test-checklist.md

## Función

- Probar la integración completa del módulo Telegram.
- Confirmar que `index.html` abre `modulos/telegram/tl-module.html`.
- Verificar Firebase, localStorage, Telegram API, diagnóstico y limpieza.
- Servir como guía de prueba manual después de reconstruir la app por bloques.

## Se conecta con

- `index.html`
- `modulos/telegram/tl-module.html`
- `modulos/telegram/firebase/tl-firebase-test.js`
- `modulos/telegram/connection/tl-connection-save.js`
- `modulos/telegram/connection/tl-connection-read.js`
- `modulos/telegram/connection/tl-connection-clear.js`
- `modulos/telegram/connection/tl-connection-test.js`
- `modulos/telegram/diagnostic/tl-diagnostic-report.js`

---

# Checklist de prueba general Telegram

## 1. Abrir la app

Ejecutar:

```bash
npm install
npm start
```

Resultado esperado:

- Abre la ventana de Electron.
- El encabezado muestra `Electron activo`.
- El menú lateral muestra `Telegram` como módulo listo.

---

## 2. Abrir módulo Telegram

Acción:

- Clic en `Telegram` en el menú lateral.

Resultado esperado:

- Se carga `modulos/telegram/tl-module.html` dentro del panel principal.
- Se ve la pantalla `Conexión Telegram`.
- Se ven botones: Guardar, Cargar, Limpiar, Probar Firebase, Probar Telegram, Enviar mensaje de prueba, Diagnóstico completo y Ping conector.

---

## 3. Probar Firebase

Acción:

- Clic en `Probar Firebase`.

Resultado esperado:

- Debe indicar que Firebase funciona.
- En Firestore debe existir o actualizarse:

```txt
colección: conexiones
documento: telegram
```

Campos esperados:

```txt
firebaseConnectionOk: true
firebaseConexionOk: true
firebaseLastCheck: fecha ISO
lastFirebaseTest.ok: true
updatedAt: fecha ISO
actualizadoEn: fecha ISO
```

Si falla:

- Revisar `modulos/telegram/config/tl-firebase-config.js`.
- Revisar `modulos/telegram/firebase/tl-firebase-init.js`.
- Revisar reglas de Firestore.

---

## 4. Guardar conexión Telegram

Acción:

- Escribir Bot Token.
- Escribir Chat ID.
- Clic en `Guardar`.

Resultado esperado:

- Guarda en Firebase.
- Guarda respaldo local.
- Muestra estado `Lista` o `ready`.

Firestore debe tener, mínimo:

```txt
botToken
chatId
botTokenMasked
chatIdMasked
botConfigured: true
chatConfigured: true
status: ready
estado: ready
provider: telegram
appName: AgendaJeff
aplicacion: AgendaJeff
updatedAt
actualizadoEn
```

---

## 5. Cargar conexión

Acción:

- Clic en `Cargar`.

Resultado esperado:

- Lee primero Firebase.
- Si Firebase falla, usa respaldo local.
- Rellena Bot Token y Chat ID en el formulario.
- Muestra el estado de conexión.

---

## 6. Probar Telegram

Acción:

- Clic en `Probar Telegram`.

Resultado esperado:

- Valida el bot con `getMe`.
- Envía mensaje de prueba al chat configurado.
- Actualiza Firebase y respaldo local con:

```txt
telegramConnectionOk: true
telegramLastCheck: fecha ISO
status: ready
estado: ready
```

Si falla:

- Revisar `modulos/telegram/api/tl-api-getme.js` si el botToken no sirve.
- Revisar `modulos/telegram/api/tl-api-send.js` si no envía mensaje.
- Revisar Chat ID si el error indica `chat not found`.

---

## 7. Diagnóstico completo

Acción:

- Clic en `Diagnóstico completo`.

Resultado esperado:

- Muestra resumen por capas:

```txt
estado
localStorage
firebase
telegramApi
```

Si algo falla, debe mostrar archivo probable del error.

---

## 8. Limpiar conexión

Acción:

- Clic en `Limpiar`.
- Confirmar limpieza.

Resultado esperado:

- Limpia formulario.
- Limpia localStorage principal y respaldo.
- Marca Firebase como limpiado sin borrar el documento:

```txt
enabled: false
status: cleared
estado: cleared
botToken: ""
chatId: ""
botConfigured: false
chatConfigured: false
```

---

## 9. Revisión de seguridad visual

Resultado esperado:

- El JSON técnico de la pantalla no debe mostrar Bot Token completo.
- El JSON técnico de la pantalla no debe mostrar Chat ID completo.
- Debe mostrar valores enmascarados.

Archivo relacionado:

```txt
modulos/telegram/ui/dom/tl-dom-result.js
```

---

## 10. Resultado final esperado

La prueba completa es correcta si:

```txt
Electron abre.
Index carga Telegram.
Firebase prueba OK.
Guardar conexión OK.
Cargar conexión OK.
Telegram API OK.
Mensaje de prueba llega.
Diagnóstico completo identifica todo OK.
Limpiar deja Firebase en cleared.
JSON técnico no expone credenciales completas.
```
