@echo off
setlocal enabledelayedexpansion

echo ========================================
echo AgendaJeff - preparar release
echo ========================================

set VERSION_MODE=%1
if "%VERSION_MODE%"=="" set VERSION_MODE=patch

echo.
echo 1. Subiendo version: %VERSION_MODE%
node scripts\version\aj-version-bump.js %VERSION_MODE%
if errorlevel 1 goto error

echo.
echo 2. Verificando proyecto
npm run check
if errorlevel 1 goto error

echo.
echo 3. Preparando manifiesto y notas
npm run release:prepare
if errorlevel 1 goto error

echo.
echo 4. Construyendo instalador Windows
npm run build:win
if errorlevel 1 goto error

echo.
echo ========================================
echo Release preparado correctamente.
echo Revisa la carpeta dist y publica en GitHub Releases.
echo ========================================
goto end

:error
echo.
echo ========================================
echo ERROR: no se pudo preparar el release.
echo ========================================
exit /b 1

:end
endlocal
