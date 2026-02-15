# Génération des clés JWT (RS256)

Pour que la **Boutique** signe les tokens en RS256 et que le **Marketplace** les vérifie avec la clé publique :

1. Générer une paire RSA (ex. 2048 bits) :

   **Linux / macOS / Git Bash :**
   ```bash
   mkdir -p server/keys
   openssl genrsa -out server/keys/jwt_private.pem 2048
   openssl rsa -in server/keys/jwt_private.pem -pubout -out server/keys/jwt_public.pem
   ```

   **Windows (PowerShell, avec OpenSSL installé) :**
   ```powershell
   New-Item -ItemType Directory -Force -Path server\keys
   openssl genrsa -out server\keys\jwt_private.pem 2048
   openssl rsa -in server\keys\jwt_private.pem -pubout -out server\keys\jwt_public.pem
   ```

2. **Boutique** (`server/.env`) :
   - `JWT_PRIVATE_KEY` : contenu de `server/keys/jwt_private.pem` (PEM complet, sur une seule ligne remplacer les retours à la ligne par `\n` si besoin, ou passer le fichier en multi-ligne selon comment votre config charge les variables).
   - `JWT_PUBLIC_KEY` : contenu de `server/keys/jwt_public.pem` (pour vérifier ses propres tokens).

   Exemple avec des variables multi-ligne (selon votre chargement d’env) :
   ```
   JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
   MIIEowIBAAKCAQEA...
   -----END RSA PRIVATE KEY-----"
   JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
   MIIBIjANBgkqhkiG9w0BAQEF...
   -----END PUBLIC KEY-----"
   ```

3. **Marketplace** (`marketplace/server/.env`) :
   - `JWT_PUBLIC_KEY` : **même** valeur que `JWT_PUBLIC_KEY` de la Boutique (contenu de `jwt_public.pem`).
   - Ne pas exposer la clé privée côté Marketplace.

4. Ajouter `server/keys/` (ou le chemin des fichiers PEM) à `.gitignore` pour ne pas versionner les clés.

Après redémarrage des deux serveurs : login sur la Boutique → token RS256 → GET `/me` et `/trade/offers` sur le Marketplace avec ce token doivent retourner 200.
