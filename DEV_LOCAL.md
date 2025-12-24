# Guide de Développement Local (Docker & PostgreSQL)

Ce guide explique comment lancer et configurer l'environnement de développement pour le projet Pok-Card.

---

## 🚀 Je veux run sur Docker ?

C'est la méthode recommandée pour avoir un environnement complet et identique à la production.

### 1. Démarrage rapide
```bash
docker compose up --build
```

### 2. Configuration du .env
Dans le fichier `server/.env`, assurez-vous que `DATABASE_URL` pointe vers `localhost` pour que vos commandes locales (comme le seed) puissent communiquer avec le conteneur Postgres :
```env
DATABASE_URL="postgresql://pokecard_user:passwd@localhost:5432/pokecard_db?schema=public"
```
*Note : À l'intérieur du réseau Docker, le backend utilise automatiquement `postgres:5432` grâce à la configuration du `docker-compose.yml`.*

### 3. Seeding (Remplissage de la base)
Le seeding doit être lancé depuis votre machine hôte vers la base de données qui tourne dans Docker :
```bash
cd server
npx prisma db seed
```

---

## 💻 Je veux run en local ? (sans Docker)

Si vous préférez lancer les services manuellement (plus rapide pour le debug du code).

### 1. Pré-requis
- Avoir un serveur PostgreSQL qui tourne (vous pouvez utiliser celui de Docker : `docker compose up -d postgres`).
- Node.js installé.

### 2. Lancement du Backend
```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev  # Si c'est la première fois
npm run dev             # Lance tsx watch sur src/index.ts
```

### 3. Lancement du Frontend
```bash
cd pokecard
npm install
npm run dev
```

---

## 🛠️ Base de données et Prisma

### Les deux types d'URL Database
- **Depuis votre PC vers Docker** : `postgresql://pokecard_user:passwd@localhost:5432/pokecard_db`
- **Entre deux conteneurs Docker** : `postgresql://pokecard_user:passwd@postgres:5432/pokecard_db`

### Réinitialiser la base
Si vous passez de SQLite à PostgreSQL :
1. Supprimez le dossier `server/prisma/migrations`.
2. Lancez `npx prisma migrate dev --name init_postgres`.

---

## 🔗 Accès aux services

- **Frontend (Docker)** : [http://localhost:3000](http://localhost:3000)
- **Frontend (Local)** : [http://localhost:5173](http://localhost:5173) (généralement)
- **Backend API** : [http://localhost:8080](http://localhost:8080)
- **Documentation API** : [http://localhost:8080/api-docs](http://localhost:8080/api-docs)
- **PostgreSQL** : `localhost:5432` (Utilisateur: `pokecard_user`, Pass: `passwd`)
