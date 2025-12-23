# Script d'initialisation PostgreSQL pour BoulevardTCG (Windows PowerShell)
# Usage: .\scripts\init-postgres.ps1 [database_name] [username] [password]

param(
    [string]$DB_NAME = "boulevardtcg",
    [string]$DB_USER = "boulevardtcg_user",
    [string]$DB_PASSWORD = ""
)

Write-Host "🚀 Initialisation de PostgreSQL pour BoulevardTCG" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Base de données: $DB_NAME"
Write-Host "Utilisateur: $DB_USER"
Write-Host ""

# Vérifier si PostgreSQL est installé
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ PostgreSQL n'est pas dans le PATH." -ForegroundColor Red
    Write-Host "   Ajoutez PostgreSQL au PATH ou utilisez le chemin complet." -ForegroundColor Yellow
    Write-Host "   Exemple: C:\Program Files\PostgreSQL\15\bin\psql.exe" -ForegroundColor Yellow
    exit 1
}

# Générer un mot de passe si non fourni
if ([string]::IsNullOrEmpty($DB_PASSWORD)) {
    $DB_PASSWORD = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
}

Write-Host "✅ PostgreSQL trouvé: $($psqlPath.Source)" -ForegroundColor Green
Write-Host ""

# Demander le mot de passe postgres si nécessaire
$postgresPassword = Read-Host "Mot de passe de l'utilisateur 'postgres' (laissez vide si authentification Windows)" -AsSecureString
$postgresPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($postgresPassword))

# Créer la base de données
Write-Host "📦 Création de la base de données..." -ForegroundColor Yellow
$env:PGPASSWORD = $postgresPasswordPlain
$createDbQuery = "CREATE DATABASE $DB_NAME;"
try {
    & psql -U postgres -c $createDbQuery 2>&1 | Out-Null
    Write-Host "   ✅ Base de données créée" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Base de données existe déjà ou erreur (peut être ignoré)" -ForegroundColor Yellow
}

# Créer l'utilisateur
Write-Host "👤 Création de l'utilisateur..." -ForegroundColor Yellow
$createUserQuery = "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
try {
    & psql -U postgres -c $createUserQuery 2>&1 | Out-Null
    Write-Host "   ✅ Utilisateur créé" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Utilisateur existe déjà ou erreur (peut être ignoré)" -ForegroundColor Yellow
}

# Accorder les permissions
Write-Host "🔐 Configuration des permissions..." -ForegroundColor Yellow
$grantDbQuery = "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
$grantSchemaQuery = "GRANT ALL ON SCHEMA public TO $DB_USER;"

try {
    & psql -U postgres -c $grantDbQuery 2>&1 | Out-Null
    & psql -U postgres -d $DB_NAME -c $grantSchemaQuery 2>&1 | Out-Null
    Write-Host "   ✅ Permissions configurées" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Erreur lors de la configuration des permissions" -ForegroundColor Yellow
}

# Nettoyer
$env:PGPASSWORD = ""

Write-Host ""
Write-Host "✅ Initialisation terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Ajoutez ceci à votre fichier .env:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "DATABASE_URL=`"postgresql://$DB_USER`:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public`"" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Sauvegardez ce mot de passe en sécurité!" -ForegroundColor Yellow
Write-Host ""


