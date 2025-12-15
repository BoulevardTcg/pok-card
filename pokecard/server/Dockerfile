# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Build de l'application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer seulement les dépendances de production
RUN npm ci --only=production

# Copier le build depuis l'étape précédente
COPY --from=build /app/dist ./dist

# Exposer le port 5000
EXPOSE 5000

# Démarrer le serveur
CMD ["npm", "start"]
