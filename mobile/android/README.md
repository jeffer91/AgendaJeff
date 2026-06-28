# AgendaJeff Android APK

Esta carpeta documenta la primera preparación Android de AgendaJeff.

## Objetivo

Generar un APK manual usando Capacitor, sin cambiar la lógica principal de escritorio.

## Flujo recomendado en Windows

```bat
npm install
npm run android:prepare
npx cap add android
npm run android:sync
npm run android:open
```

Desde Android Studio:

```text
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

También puedes intentar el BAT:

```bat
npm run android:apk
```

El APK debug normalmente queda en:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

## Qué funciona en esta primera versión móvil

- Shell principal.
- Inicio.
- Agenda.
- Carga Masiva.
- Ajustes.
- Diagnóstico.
- Base local usando almacenamiento del WebView.
- Crear, editar, completar y eliminar registros de forma local.
- Cola local pendiente para sincronización posterior.

## Qué queda para fase Android nativa posterior

- Notificaciones Android nativas reales.
- Segundo plano Android real.
- OAuth móvil nativo para Google Calendar.
- Sincronización robusta móvil con Firebase.
- Instalación silenciosa de actualizaciones no se permite; el usuario debe confirmar la instalación del APK.

## Regla importante

No edites manualmente `android-web/`. Esa carpeta se genera con:

```bat
npm run android:prepare
```

Edita siempre los archivos fuente reales:

```text
index.html
core/
modulos/
release/
```
