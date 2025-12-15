# Script PowerShell pour lancer PokeCard avec Ngrok
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Lancement de PokeCard avec Ngrok" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Demarrage des services Docker..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "[2/3] Attente du demarrage des services..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "[3/3] Lancement de Ngrok pour le frontend..." -ForegroundColor Yellow
Start-Process -FilePath "ngrok" -ArgumentList "http 3000 --domain=your-domain.ngrok.io" -WindowStyle Normal

Write-Host ""
Write-Host "[4/4] Lancement de Ngrok pour le backend..." -ForegroundColor Yellow
Start-Process -FilePath "ngrok" -ArgumentList "http 5000 --domain=your-backend-domain.ngrok.io" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Application accessible via Ngrok !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: https://your-domain.ngrok.io" -ForegroundColor White
Write-Host "Backend:  https://your-backend-domain.ngrok.io" -ForegroundColor White
Write-Host ""
Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
