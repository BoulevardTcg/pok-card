# Images des Produits

Ce dossier contient les images des produits enregistrés en base de données.

## Structure

Placez vos images de produits dans ce dossier avec des noms descriptifs, par exemple :
- `display-booster-pokemon-ecarlate-violet.png`
- `starter-deck-one-piece-luffy.png`
- `proteges-cartes-ultra-pro.png`

## Comment utiliser les images locales

### 1. Ajouter une image

Placez votre fichier image dans ce dossier (`pokecard/public/img/products/`).

### 2. Mettre à jour la base de données

Dans le fichier `seed.ts` ou via une mise à jour directe en base de données, utilisez un chemin relatif :

```typescript
images: [
  {
    url: '/img/products/nom-de-votre-image.png',  // Chemin relatif
    altText: 'Description de l\'image',
    position: 0
  }
]
```

### 3. Exemple concret

Au lieu de :
```typescript
url: 'https://res.cloudinary.com/demo/image/upload/v1710000000/pokecard/display-ecarlate-violet.png'
```

Utilisez :
```typescript
url: '/img/products/display-ecarlate-violet.png'
```

## Important

- Les images dans `public/img/products/` sont accessibles via `/img/products/nom-image.png`
- Fonctionne en développement (Vite) et en production (Nginx)
- Les formats supportés : `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`

## Migration depuis Cloudinary

Pour migrer les URLs Cloudinary existantes vers des chemins locaux :

1. Téléchargez les images depuis Cloudinary
2. Placez-les dans ce dossier avec un nom descriptif
3. Mettez à jour les URLs en base de données (voir exemple ci-dessus)

