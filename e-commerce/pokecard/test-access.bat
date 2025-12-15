@echo off
echo ========================================
echo   Test d'accessibilite PokeCard
echo ========================================
echo.

echo [1/4] Test de l'IP locale...
ipconfig | findstr "IPv4"
echo.

echo [2/4] Test de l'IP publique...
powershell -Command "Invoke-RestMethod -Uri 'https://api.ipify.org'"
echo.

echo [3/4] Test de l'accessibilite locale...
echo Test frontend: http://localhost:3000
echo Test backend:  http://localhost:5000
echo.

echo [4/4] Test de l'accessibilite reseau...
echo Test depuis votre telephone: http://[VOTRE_IP_LOCALE]:3000
echo.

echo ========================================
echo   Instructions pour l'acces Internet
echo ========================================
echo.
echo 1. Utiliser Ngrok (recommandé):
echo    - Double-cliquer sur start-with-ngrok.bat
echo    - Partager l'URL Ngrok fournie
echo.
echo 2. Configuration routeur (permanent):
echo    - Suivre le guide GUIDE_ACCES_INTERNET.md
echo    - Configurer la redirection de ports
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
