# Checklist de verificación · Notificaciones

Ruta: `modulos/notificaciones/tests/nt-test-checklist.md`

## Objetivo

Verificar que el módulo Notificaciones funcione correctamente con cuatro modos de visualización:

1. Nativa Windows
2. Toast interno arriba derecha
3. Banner superior interno
4. Alerta central interna

## Comandos previos

```bash
git pull
npm run check
npm start
```

Resultado esperado:

```txt
AgendaJeff check OK
```

## Verificación de carga

- [ ] Abrir AgendaJeff.
- [ ] Entrar al módulo Notificaciones.
- [ ] Confirmar que carga el selector `Tipo de visualización`.
- [ ] Confirmar que aparecen estas opciones:
  - [ ] Nativa Windows
  - [ ] Toast interno arriba derecha
  - [ ] Banner superior interno
  - [ ] Alerta central interna
- [ ] Presionar `Diagnóstico`.
- [ ] Confirmar que el diagnóstico no genera una notificación de prueba.
- [ ] Confirmar que el JSON técnico muestra capas internas y estado de Electron.

## Prueba 1 · Nativa Windows

Seleccionar `Nativa Windows` y probar:

- [ ] Probar normal.
- [ ] Probar con sonido.
- [ ] Probar silenciosa.
- [ ] Probar mensaje largo.
- [ ] Probar recordatorio simulado.
- [ ] Probar éxito.
- [ ] Probar error.

Resultado esperado:

- La notificación aparece en Windows, junto al reloj o centro de notificaciones.
- No se abre una tarjeta interna dentro del módulo.
- El resultado JSON indica `source: desktop`.

## Prueba 2 · Toast interno arriba derecha

Seleccionar `Toast interno arriba derecha` y probar:

- [ ] Probar normal.
- [ ] Probar mensaje largo.
- [ ] Probar recordatorio simulado.
- [ ] Probar éxito.
- [ ] Probar error.

Resultado esperado:

- La notificación aparece dentro de AgendaJeff, arriba a la derecha.
- No depende del centro de notificaciones de Windows.
- El resultado JSON indica `source: visual` y `visualType: toast`.

## Prueba 3 · Banner superior interno

Seleccionar `Banner superior interno` y probar:

- [ ] Probar normal.
- [ ] Probar mensaje largo.
- [ ] Probar recordatorio simulado.
- [ ] Probar éxito.
- [ ] Probar error.

Resultado esperado:

- La notificación aparece como una franja superior dentro del módulo.
- El resultado JSON indica `source: visual` y `visualType: banner`.

## Prueba 4 · Alerta central interna

Seleccionar `Alerta central interna` y probar:

- [ ] Probar normal.
- [ ] Probar mensaje largo.
- [ ] Probar recordatorio simulado.
- [ ] Probar éxito.
- [ ] Probar error.

Resultado esperado:

- La notificación aparece como tarjeta central grande dentro del módulo.
- El resultado JSON indica `source: visual` y `visualType: center`.

## Validaciones finales

- [ ] El botón `Diagnóstico` no cambia la última prueba como si fuera una notificación.
- [ ] El recordatorio simulado respeta el tiempo seleccionado.
- [ ] Las pruebas normales salen inmediatamente.
- [ ] No hay errores en consola.
- [ ] Telegram sigue abriendo correctamente.
- [ ] Google Calendar sigue abriendo correctamente.

## Resultado final

Marcar como aprobado solo si las cuatro versiones funcionan y `npm run check` termina con `AgendaJeff check OK`.
