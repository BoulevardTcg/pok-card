# Build stage
FROM node:24.12-alpine AS build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour le build)
RUN npm ci

# Copier le code source
COPY . .

# Build de l'application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copier le build depuis l'étape précédente
COPY --from=build /app/dist /usr/share/nginx/html

# Copier les images et assets publics
COPY --from=build /app/public /usr/share/nginx/html/public

# Copier la configuration nginx personnalisée
COPY nginx.conf /etc/nginx/nginx.conf

# Exposer le port 80
EXPOSE 80

# Démarrer nginx
CMD ["nginx", "-g", "daemon off;"]
