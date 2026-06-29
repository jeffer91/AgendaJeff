@echo off
setlocal enabledelayedexpansion

echo ========================================
echo AgendaJeff - preparar APK Android
echo ========================================

echo.
echo 1. Preparando web Android
npm run android:prepare
if errorlevel 1 goto error

echo.
echo 2. Verificando proyecto nativo Android
if not exist android\app\build.gradle (
  echo Proyecto Android no encontrado. Se creara con Capacitor.
  npx cap add android
  if errorlevel 1 goto error
)

echo.
echo 3. Verificando Capacitor
npm run android:check
if errorlevel 1 goto missing

echo.
echo 4. Sincronizando Android
npx cap sync android
if errorlevel 1 goto error

echo.
echo 5. Construyendo APK debug
cd android
call gradlew assembleDebug
if errorlevel 1 goto error
cd ..

echo.
echo ========================================
echo APK generado. Revisa:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo ========================================
goto end

:missing
echo.
echo Faltan requisitos para Android.
echo Ejecuta npm install y confirma que Java JDK y Android Studio/SDK esten instalados.
echo Luego vuelve a ejecutar: npm run android:apk
echo.
exit /b 1

:error
echo.
echo ========================================
echo ERROR: no se pudo generar APK.
echo ========================================
exit /b 1

:end
endlocal
