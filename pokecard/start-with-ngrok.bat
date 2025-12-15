@echo off
echo ========================================
echo   Lancement de PokeCard avec Ngrok
echo ========================================
echo.

echo [1/3] Demarrage des services Docker...
docker-compose up -d

echo.
echo [2/3] Attente du demarrage des services...
timeout /t 10 /nobreak >nul

echo.
echo [3/3] Lancement de Ngrok pour le frontend...
start "Ngrok Frontend" cmd /k "ngrok http 3000 --domain=your-domain.ngrok.io"

echo.
echo [4/4] Lancement de Ngrok pour le backend...
start "Ngrok Backend" cmd /k "ngrok http 5000 --domain=your-backend-domain.ngrok.io"

echo.
echo ========================================
echo   Application accessible via Ngrok !
echo ========================================
echo.
echo Frontend: https://your-domain.ngrok.io
echo Backend:  https://your-backend-domain.ngrok.io
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
