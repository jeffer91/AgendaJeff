# AgendaJeff · Revisión y corrección 01

## Objetivo

Revisar conexiones principales, variables críticas y puntos de integración entre módulos.

## Revisado

- Arranque Electron.
- Cierre de ventana con X.
- Bandeja del sistema.
- Segundo plano.
- IPC local.
- Puente móvil Android/WebView.
- Verificador `npm run check`.
- Conexión Agenda -> LocalDB -> Servicios.
- Variables de canales: `escritorio`, `telegram`, `googleCalendar`.

## Correcciones aplicadas

### 1. `electron/main.js`

Se corrigió el cierre con X para que no mate la aplicación.

Ahora:

- Si el usuario cierra con X, la ventana se oculta.
- AgendaJeff sigue activo en segundo plano.
- Se muestra aviso de que la app quedó en bandeja.
- Solo se cierra completamente cuando se usa salir desde la bandeja o cierre real del proceso.

### 2. `electron/localdb/aj-local-ipc.js`

Se corrigió la conexión entre IPC local, segundo plano y bandeja.

Ahora:

- La bandeja puede abrir la ventana.
- La bandeja puede ocultar la ventana.
- La bandeja puede revisar recordatorios.
- La bandeja puede pausar y reanudar segundo plano.
- La bandeja puede salir completamente de AgendaJeff.

### 3. `core/mobile/aj-mobile-bridge.js`

Se completó la interfaz móvil para que sea compatible con los módulos que esperan `AgendaJeffElectron`.

Ahora incluye:

- Base móvil local.
- CRUD local.
- Ajustes móviles.
- Respaldo móvil.
- Estado de segundo plano móvil visual.
- Métodos de OAuth Google Calendar como pendientes controlados.
- Listener dummy de notificaciones de segundo plano para compatibilidad.

### 4. `scripts/aj-check.js`

Se amplió la verificación para incluir:

- Android.
- Puente móvil.
- Guía Android.
- Bridge Android adicional.
- Sintaxis de `mobile/android/bridge`.
- Prefijo `aj-` en bridge Android.

## Variables revisadas

Variables de canales correctas:

```text
canales.escritorio
canales.telegram
canales.googleCalendar
```

Se confirma que coinciden con:

- Formulario Agenda.
- Modelo local.
- Adaptador Telegram.
- Adaptador Google Calendar.
- Adaptador Notificaciones.

## Pendiente para revisión 02

- Revisar flujo completo de Google Calendar OAuth.
- Revisar carga masiva con ejemplos reales.
- Revisar si Firebase guarda todos los campos normalizados.
- Revisar si la cola de sincronización debe vaciarse después de éxito real.
- Revisar actualizador y manifiesto contra GitHub Releases.
