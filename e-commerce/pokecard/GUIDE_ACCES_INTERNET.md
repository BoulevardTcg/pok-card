# 🌐 Guide d'accès Internet à PokeCard

## 📋 **Vue d'ensemble**

Ce guide vous explique comment rendre votre application PokeCard accessible depuis Internet tout en l'hébergeant sur votre PC personnel.

## 🚀 **Option 1 : Ngrok (Recommandé pour les tests)**

### **Avantages :**
- ✅ Configuration simple et rapide
- ✅ HTTPS automatique
- ✅ Pas de configuration réseau
- ✅ Idéal pour les démonstrations

### **Inconvénients :**
- ❌ URLs temporaires (changent à chaque redémarrage)
- ❌ Limites de bande passante (version gratuite)
- ❌ Pas de nom de domaine personnalisé

### **Installation et utilisation :**

1. **Installer Ngrok :**
   ```bash
   winget install ngrok.ngrok
   ```

2. **Créer un compte Ngrok :**
   - Aller sur [ngrok.com](https://ngrok.com)
   - Créer un compte gratuit
   - Récupérer votre authtoken

3. **Configurer Ngrok :**
   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```

4. **Lancer l'application :**
   ```bash
   # Double-cliquer sur start-with-ngrok.bat
   # Ou exécuter le script PowerShell
   ```

5. **Partager les URLs :**
   - Frontend : `https://abc123.ngrok.io`
   - Backend : `https://def456.ngrok.io`

## 🏠 **Option 2 : Configuration du routeur (Solution permanente)**

### **Avantages :**
- ✅ URLs stables et personnalisables
- ✅ Pas de limitations de bande passante
- ✅ Contrôle total sur votre infrastructure

### **Inconvénients :**
- ❌ Configuration réseau complexe
- ❌ Nécessite un routeur compatible
- ❌ Risques de sécurité si mal configuré

### **Étapes de configuration :**

#### **Étape 1 : Trouver votre IP publique**
```bash
# Dans PowerShell
Invoke-RestMethod -Uri "https://api.ipify.org"
```

#### **Étape 2 : Configurer la redirection de ports**
1. Ouvrir l'interface web de votre routeur
2. Aller dans "Port Forwarding" ou "Redirection de ports"
3. Ajouter les règles suivantes :

| Port Externe | Port Interne | Protocole | IP Interne | Description |
|--------------|--------------|-----------|------------|-------------|
| 80           | 3000         | TCP       | 192.168.x.x| Frontend    |
| 443          | 3000         | TCP       | 192.168.x.x| Frontend HTTPS |
| 5000         | 5000         | TCP       | 192.168.x.x| Backend     |

#### **Étape 3 : Configurer le pare-feu Windows**
```powershell
# Autoriser le trafic entrant sur les ports
New-NetFirewallRule -DisplayName "PokeCard Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "PokeCard Backend" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

#### **Étape 4 : Tester l'accès**
- Depuis votre PC : `http://localhost:3000`
- Depuis Internet : `http://VOTRE_IP_PUBLIQUE:80`

## 🔒 **Sécurité et bonnes pratiques**

### **Recommandations de sécurité :**
1. **Utiliser HTTPS** quand possible
2. **Limiter l'accès** aux IPs autorisées
3. **Surveiller les logs** d'accès
4. **Mettre à jour** régulièrement vos services
5. **Utiliser des mots de passe forts**

### **Configuration CORS pour la production :**
```typescript
// Dans server/src/index.ts
app.use(cors({ 
  origin: [
    'https://votre-domaine.com',
    'https://www.votre-domaine.com'
  ],
  credentials: true
}))
```

## 🌍 **Option 3 : Services cloud (Alternative)**

### **Alternatives à l'auto-hébergement :**
- **Heroku** : Déploiement simple, gratuit pour les petits projets
- **Vercel** : Idéal pour les applications React
- **Netlify** : Hébergement statique gratuit
- **Railway** : Déploiement automatique depuis GitHub

## 📱 **Test de l'application**

### **Depuis votre téléphone :**
1. Connecter votre téléphone au même réseau WiFi
2. Ouvrir le navigateur
3. Aller sur `http://IP_DE_VOTRE_PC:3000`

### **Depuis Internet :**
1. Utiliser Ngrok : `https://abc123.ngrok.io`
2. Ou votre IP publique : `http://VOTRE_IP:80`

## 🆘 **Dépannage**

### **Problèmes courants :**

#### **L'application ne se charge pas depuis Internet :**
- Vérifier la redirection de ports sur le routeur
- Vérifier le pare-feu Windows
- Tester depuis le réseau local d'abord

#### **Erreurs CORS :**
- Vérifier la configuration CORS dans le backend
- S'assurer que l'URL d'origine est autorisée

#### **Ngrok ne fonctionne pas :**
- Vérifier que l'authtoken est configuré
- Redémarrer Ngrok
- Vérifier les logs d'erreur

## 📞 **Support**

Pour toute question ou problème :
1. Vérifier les logs Docker : `docker-compose logs`
2. Vérifier les logs Ngrok dans les fenêtres ouvertes
3. Tester la connectivité réseau

---

**Note :** Ce guide est destiné à un usage personnel et de test. Pour un usage en production, considérez un hébergement professionnel.
