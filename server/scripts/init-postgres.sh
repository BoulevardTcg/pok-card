#!/bin/bash

# Script d'initialisation PostgreSQL pour BoulevardTCG
# Usage: ./scripts/init-postgres.sh [database_name] [username] [password]

set -e

DB_NAME=${1:-boulevardtcg}
DB_USER=${2:-boulevardtcg_user}
DB_PASSWORD=${3:-$(openssl rand -base64 32)}

echo "🚀 Initialisation de PostgreSQL pour BoulevardTCG"
echo "=================================================="
echo ""
echo "Base de données: $DB_NAME"
echo "Utilisateur: $DB_USER"
echo ""

# Vérifier si PostgreSQL est installé
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si le serveur PostgreSQL est en cours d'exécution
if ! pg_isready -q; then
    echo "❌ Le serveur PostgreSQL n'est pas en cours d'exécution."
    echo "   Démarrez-le avec: sudo systemctl start postgresql (Linux)"
    echo "   ou: brew services start postgresql (macOS)"
    exit 1
fi

echo "✅ PostgreSQL est en cours d'exécution"
echo ""

# Créer la base de données
echo "📦 Création de la base de données..."
psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "   Base de données existe déjà"

# Créer l'utilisateur
echo "👤 Création de l'utilisateur..."
psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "   Utilisateur existe déjà"

# Accorder les permissions
echo "🔐 Configuration des permissions..."
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
psql -U postgres -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

echo ""
echo "✅ Initialisation terminée!"
echo ""
echo "📝 Ajoutez ceci à votre fichier .env:"
echo "======================================"
echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public\""
echo ""
echo "⚠️  IMPORTANT: Sauvegardez ce mot de passe en sécurité!"
echo ""


