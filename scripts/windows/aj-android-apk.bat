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
echo 2. Verificando Capacitor
npm run android:check
if errorlevel 1 goto missing

echo.
echo 3. Sincronizando Android
npx cap sync android
if errorlevel 1 goto error

echo.
echo 4. Construyendo APK debug
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
echo Si es primera vez ejecuta:
echo npm install
echo npx cap add android
echo Luego vuelve a ejecutar este BAT.
exit /b 1

:error
echo.
echo ========================================
echo ERROR: no se pudo generar APK.
echo ========================================
exit /b 1

:end
endlocal
