# 🎨 LIGHT MODE — Palette E-commerce TCG

## Vue d'ensemble

Palette light mode moderne et punchy conçue pour un site e-commerce TCG (Trading Card Game). Design optimisé pour la conversion et la confiance, avec une ambiance "papier premium" chaleureuse.

---

## 🎯 Objectifs

- ✅ Visuellement attractif et dynamique
- ✅ Donne envie de cliquer et d'acheter
- ✅ Cohérent avec l'univers TCG (collection, nouveautés, drops)
- ✅ Rassurant et fiable (paiement, livraison, authenticité)
- ✅ Haut de gamme, sans être "luxe froid"
- ✅ Palette limitée (7-8 couleurs max)

---

## 🎨 PALETTE COMPLÈTE

### Fonds — Papier Premium

| Variable | Couleur | Usage |
|----------|---------|-------|
| `--color-bg-primary` | `#faf8f3` | Fond principal (papier ivoire chaud) |
| `--color-bg-elevated` | `#ffffff` | Blanc pur pour surfaces |
| `--color-bg-subtle` | `#f5f2eb` | Ivoire plus foncé pour zones subtiles |
| `--color-bg-hover` | `#f0ede5` | État hover doux |

**Philosophie** : Fonds chaleureux type "papier premium", pas de blanc pur (#ffffff) sauf pour les surfaces (cards).

---

### CTA Principal — Une Seule Couleur d'Action

| Variable | Couleur | Usage |
|----------|---------|-------|
| `--color-cta-primary` | `#4f46e5` | **Indigo moderne** — Boutons d'achat principaux |
| `--color-cta-primary-hover` | `#4338ca` | État hover |
| `--color-cta-primary-active` | `#3730a3` | État actif |
| `--color-cta-primary-light` | `#e0e7ff` | Fond léger pour badges CTA |
| `--color-cta-primary-muted` | `rgba(79, 70, 229, 0.1)` | Fond très léger |

**Règle stricte** : Tous les boutons d'achat ("Explorer", "Ajouter", "Commander", "Voir X produits") utilisent cette couleur unique.

**Pourquoi indigo ?**
- Évoque confiance et modernité
- Se distingue immédiatement sur fond clair
- Pas de rouge (évite l'agressivité)
- Pas de gris/beige/doré (pas assez visible)

---

### Texte — Sombre mais Doux

| Variable | Couleur | Usage |
|----------|---------|-------|
| `--color-text-primary` | `#1a1625` | Texte principal (presque noir mais chaleureux) |
| `--color-text-secondary` | `#4b5563` | Texte secondaire (gris moyen) |
| `--color-text-muted` | `#6b7280` | Texte muted (gris clair) |
| `--color-text-inverse` | `#ffffff` | Blanc pour texte sur CTA |

**Philosophie** : Pas de noir pur (#000000), toujours des nuances chaleureuses.

---

### Badges Produits — États Distincts

#### 🆕 Nouveau — Bleu/Indigo Premium
- **Couleur** : `#3b82f6` (Bleu moderne)
- **Fond** : `rgba(59, 130, 246, 0.1)`
- **Texte** : `#1e40af`
- **Usage** : Produits récemment ajoutés

#### 📦 Précommande — Violet/Cyan Élégant
- **Couleur** : `#8b5cf6` (Violet moderne)
- **Fond** : `rgba(139, 92, 246, 0.1)`
- **Texte** : `#6d28d9`
- **Usage** : Produits en précommande

#### 🔥 Promo — Corail/Rose Doux Contrôlé
- **Couleur** : `#f472b6` (Rose doux)
- **Fond** : `rgba(244, 114, 182, 0.1)`
- **Texte** : `#be185d`
- **Usage** : Promotions, réductions

#### ⚠️ Stock Faible — Amber/Orange Doux
- **Couleur** : `#f59e0b` (Amber)
- **Fond** : `rgba(245, 158, 11, 0.1)`
- **Texte** : `#b45309`
- **Usage** : Stock limité

#### ❌ Rupture — Rouge Réservé
- **Couleur** : `#dc2626` (Rouge réservé)
- **Fond** : `rgba(220, 38, 38, 0.1)`
- **Texte** : `#991b1b`
- **Usage** : **Uniquement** pour rupture de stock (pas pour CTA)

---

### Bordures — Subtiles et Douces

| Variable | Couleur | Usage |
|----------|---------|-------|
| `--color-border-subtle` | `rgba(0, 0, 0, 0.06)` | Très subtil |
| `--color-border-default` | `rgba(0, 0, 0, 0.1)` | Standard |
| `--color-border-hover` | `rgba(0, 0, 0, 0.15)` | Hover |
| `--color-border-accent` | `rgba(79, 70, 229, 0.2)` | Accent indigo |

---

### Ombres — Adaptées au Light Mode

| Variable | Ombre | Usage |
|----------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` | Petites ombres |
| `--shadow-md` | `0 4px 12px rgba(0, 0, 0, 0.08)` | Ombres moyennes |
| `--shadow-lg` | `0 8px 24px rgba(0, 0, 0, 0.12)` | Grandes ombres |
| `--shadow-glow` | `0 0 40px rgba(79, 70, 229, 0.15)` | Glow indigo pour CTA |
| `--shadow-card-hover` | `0 20px 40px rgba(0, 0, 0, 0.12), 0 0 60px rgba(79, 70, 229, 0.08)` | Hover cards |

---

## 🚫 INTERDICTIONS

- ❌ Pas de light mode qui ressemble à une inversion du dark
- ❌ Pas de saturation excessive
- ❌ Pas de rainbow UI
- ❌ Pas de CTA qui se confond avec le décor
- ❌ Pas de bouton principal gris, beige ou doré
- ❌ Pas de rouge pour CTA (réservé à la rupture)

---

## 📦 UTILISATION

### Activation

Le light mode s'active automatiquement via le `DarkModeProvider` :

```tsx
// Le contexte applique la classe .light au document
<DarkModeProvider>
  <App />
</DarkModeProvider>
```

### Classes CSS

Tous les styles utilisent les variables CSS définies dans `design-tokens.css`. Le light mode est activé via la classe `.light` sur `document.documentElement`.

### Exemple de Badge Produit

```tsx
<span className="productBadge new absolute">
  Nouveau
</span>
```

Classes disponibles :
- `.productBadge.new` — Badge nouveau
- `.productBadge.preorder` — Badge précommande
- `.productBadge.promo` — Badge promo
- `.productBadge.lowstock` — Badge stock faible
- `.productBadge.outofstock` — Badge rupture
- `.absolute` — Positionnement absolu (pour cards)
- `.pulse` — Animation pulse

---

## 🎯 COMPOSANTS ADAPTÉS

- ✅ HeroSection — CTA et fonds adaptés
- ✅ ShopSection — Cards produits, filtres, boutons
- ✅ ProductBadges — Système complet de badges
- ✅ Boutons — Tous les CTA utilisent `--color-cta-primary`
- ✅ Navbar — À adapter (en cours)

---

## 📝 NOTES DE DESIGN

1. **Le produit est la star** : Les cards produits ressortent sur le fond ivoire grâce au blanc pur.

2. **Hiérarchie visuelle claire** : Le CTA indigo ressort immédiatement, les badges sont distincts mais élégants.

3. **Cohérence** : Une seule couleur d'action (indigo) pour tous les boutons d'achat.

4. **Chaleur** : Les fonds ivoire créent une ambiance chaleureuse, pas froide comme un blanc pur.

5. **Confiance** : L'indigo évoque modernité et fiabilité, essentiel pour l'e-commerce.

---

## 🔄 PROCHAINES ÉTAPES

- [ ] Adapter la navbar complètement
- [ ] Adapter le footer
- [ ] Adapter les modales
- [ ] Adapter les formulaires
- [ ] Tests sur différents écrans
- [ ] Ajustements finaux selon retours utilisateurs

---

**Créé le** : 2025-01-27  
**Version** : 1.0.0  
**Statut** : ✅ Prêt pour intégration

