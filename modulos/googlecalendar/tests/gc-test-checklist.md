# gc-test-checklist.md

Ruta: `modulos/googlecalendar/tests/gc-test-checklist.md`

## Objetivo

Verificar que el módulo Google Calendar funcione de forma independiente y sin depender de Telegram.

## Checklist por capas

### 1. Carga del módulo

- [ ] Abrir `modulos/googlecalendar/gc-module.html` desde el shell.
- [ ] Confirmar que aparece la pantalla Google Calendar.
- [ ] Confirmar que el JSON técnico muestra `storage`, `firebase`, `auth`, `api`, `connection`, `diagnostic` y `connector`.

### 2. Local

- [ ] Ingresar `Calendar ID`.
- [ ] Ingresar `Client ID Desktop`.
- [ ] Ingresar `Redirect URI Desktop`.
- [ ] Guardar conexión.
- [ ] Cargar conexión.
- [ ] Confirmar que la conexión aparece en el formulario.
- [ ] Limpiar conexión.

### 3. Firebase

- [ ] Completar configuración Firebase segura antes de probar.
- [ ] Ejecutar prueba Firebase.
- [ ] Confirmar documento `conexiones/googleCalendar`.
- [ ] Verificar que no se borren campos futuros por uso de merge.

### 4. OAuth sin popup

- [ ] Presionar `Conectar Google`.
- [ ] Confirmar que no se abre popup interno bloqueado.
- [ ] Confirmar apertura externa o URL manual.
- [ ] Copiar código de autorización.
- [ ] Pegar código en el campo correspondiente.
- [ ] Procesar código.

### 5. API Google Calendar

- [ ] Probar Google Calendar sin crear evento.
- [ ] Leer calendario `primary`.
- [ ] Leer eventos próximos.
- [ ] Crear evento de prueba solo cuando sea necesario.

### 6. Conector público

- [ ] Confirmar existencia de `window.AgendaJeffGoogleCalendar`.
- [ ] Probar `getStatus()`.
- [ ] Probar `listEvents()`.
- [ ] Probar `createEvent()` con datos controlados.
- [ ] Probar `diagnostic()`.

### 7. Integración shell

- [ ] Abrir AgendaJeff desde Electron.
- [ ] Ver botón Telegram.
- [ ] Ver botón Google Calendar.
- [ ] Abrir Google Calendar en iframe.
- [ ] Volver a Inicio.
- [ ] Abrir Telegram nuevamente y confirmar que no se rompió.

## Resultado esperado

Google Calendar queda como módulo independiente, con carpeta propia, archivos `gc-*`, conexión local/Firebase, OAuth sin popup, API Calendar, diagnóstico y conector público para futuros módulos de AgendaJeff.
