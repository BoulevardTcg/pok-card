# 📦 Différence entre "Produits" et "Stock" dans le Panel Admin

## 🎯 Page "Produits" (`/admin/products`)

**Objectif** : Gestion complète des produits (CRUD)

### Fonctionnalités :
- ✅ **Création de produits** : Nom, description, catégorie, slug
- ✅ **Gestion des images** : Upload, ordre, alt text
- ✅ **Gestion des variantes** : Création, modification, suppression
  - Nom de la variante
  - Langue, édition
  - Prix (en centimes)
  - SKU
  - Statut actif/inactif
- ✅ **Modification des produits** : Toutes les propriétés
- ✅ **Suppression de produits** : Avec vérification des commandes associées

### Cas d'usage :
- Ajouter un nouveau produit au catalogue
- Modifier le nom ou la description d'un produit
- Ajouter/supprimer des variantes (ex: "Français", "Anglais")
- Changer le prix d'une variante
- Désactiver temporairement un produit

---

## 📊 Page "Stock" (`/admin/inventory`)

**Objectif** : Vue d'ensemble et gestion rapide des quantités en stock

### Fonctionnalités :
- ✅ **Vue d'ensemble** : Toutes les variantes avec leur stock actuel
- ✅ **Alertes visuelles** : 
  - Stock faible (≤ 10 unités) en jaune
  - Stock épuisé (0) en rouge
- ✅ **Ajustement rapide** : Modification du stock directement depuis la liste
- ✅ **Statistiques** :
  - Total de variantes
  - Nombre de produits en stock faible
  - Nombre de produits épuisés

### Cas d'usage :
- Vérifier rapidement quels produits sont en stock faible
- Ajuster le stock après réception de marchandise
- Ajuster le stock après inventaire
- Identifier les produits à réapprovisionner

---

## 🔄 Pourquoi deux pages séparées ?

### 1. **Séparation des responsabilités**
- **Produits** = Gestion du catalogue (contenu, prix, structure)
- **Stock** = Gestion des quantités (opérationnel, logistique)

### 2. **Workflows différents**
- **Produits** : Utilisé lors de l'ajout/modification de produits (moins fréquent)
- **Stock** : Utilisé quotidiennement pour suivre les quantités (très fréquent)

### 3. **Interface optimisée**
- **Produits** : Interface complète avec formulaires complexes
- **Stock** : Interface simple et rapide pour ajustements fréquents

### 4. **Permissions possibles**
- On pourrait donner accès "Stock" à un employé logistique
- Sans lui donner accès à "Produits" (modification des prix, etc.)

---

## 💡 Exemple concret

**Scénario** : Tu reçois une livraison de 50 "Display Booster Pokémon - Français"

1. **Page Stock** :
   - Tu vois que le stock actuel est de 5
   - Tu cliques sur "Modifier" et mets 55
   - ✅ Fait en 10 secondes

2. **Page Produits** :
   - Tu veux créer un nouveau produit "Display Booster One Piece"
   - Tu ajoutes nom, description, images, variantes, prix
   - ✅ Interface complète pour création

---

## 🎨 Analogie

- **Produits** = Le catalogue papier (contenu, prix, photos)
- **Stock** = Le tableau de bord du magasinier (quantités, alertes)

Les deux sont complémentaires mais servent des besoins différents ! 🚀

