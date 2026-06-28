# AgendaJeff Android APK

## Objetivo

Preparar una primera versión Android manual usando Capacitor. Esta fase permite crear un APK de prueba sin reescribir la aplicación.

## Qué hace esta preparación

- Crea `android-web/` con los archivos web necesarios.
- Inyecta `core/mobile/aj-mobile-bridge.js` para que la app funcione sin Electron.
- Usa almacenamiento local del WebView para eventos, pendientes, ajustes y respaldos básicos.
- Permite generar un APK debug manual.

## Primera configuración en la PC

```bash
npm install
npm run android:prepare
npx cap add android
npx cap sync android
```

## Generar APK debug

```bash
npm run android:apk
```

El APK queda en:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Publicación manual

Cuando el APK esté listo, se puede subir manualmente a GitHub Releases con el nombre del manifiesto:

```text
AgendaJeff-0.0.1.apk
```

## Limitaciones de esta fase

- Android usa almacenamiento local del WebView, no el JSON de Electron.
- Las notificaciones Android reales requieren capa nativa posterior.
- La instalación del APK requiere confirmación del usuario.
- No hay instalación silenciosa.

## Regla de actualización Android

La app puede detectar que existe un APK nuevo, pero Android debe pedir confirmación del usuario para instalarlo.
