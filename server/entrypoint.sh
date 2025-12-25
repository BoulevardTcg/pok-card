#!/bin/sh
set -e

echo "⏳ Attente de la base de données..."
# On peut ajouter une boucle d'attente ici si nécessaire, 
# mais le healthcheck dans docker-compose aide déjà beaucoup.

echo "🚀 Application des migrations Prisma..."
npx prisma migrate deploy

# Le seeding automatique est désactivé dans l'image de production 
# car les outils de compilation (tsx/tsc) ne sont pas installés.
# Il est recommandé de faire le seed manuellement depuis l'extérieur du conteneur :
# npx prisma db seed
echo "ℹ️ Seeding automatique ignoré (image de production)."

echo "✅ Base de données prête. Démarrage du serveur..."
exec "$@"
