# Build stage
FROM node:24.12-alpine AS build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

RUN rm -rf dist

# Build de l'application
RUN npm run build

# Production stage
FROM node:24.12-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer seulement les dépendances de production
RUN npm ci --omit=dev

# Générer le client Prisma pour la production
RUN npx prisma generate

# Copier le build depuis l'étape précédente
COPY --from=build /app/dist ./dist

# Copier le script d'entrée
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Exposer le port 8080
EXPOSE 8080

# Démarrer le serveur via le script d'entrée
ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "start"]
