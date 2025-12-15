import 'dotenv/config'
import express from 'express'
import fetch from 'node-fetch'
import cors from 'cors'

// Import des routes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import productRoutes from './routes/products.js'
import checkoutRoutes, { checkoutWebhookHandler } from './routes/checkout.js'

// Import des middlewares de sécurité
import { 
  helmetConfig, 
  corsOptions, 
  apiLimiter, 
  validateInput, 
  sanitizeInput, 
  secureLogging, 
  injectionProtection 
} from './middleware/security.js'

const app = express()

// Configuration CORS sécurisée
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || ['http://localhost:5173']
const isDevelopment = process.env.NODE_ENV === 'development'

app.use(cors({
  origin: (origin, callback) => {
    // En développement, permettre localhost et les origines configurées
    if (isDevelopment && (!origin || origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true)
    }
    // En production, vérifier strictement les origines autorisées
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`🚫 CORS bloqué pour l'origine: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}))

// Middleware de debug CORS (uniquement en développement)
if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.url} - Origin: ${req.headers.origin}`)
    next()
  })
}

// Webhook Stripe - doit utiliser express.raw avant express.json
app.post('/api/checkout/webhook', express.raw({ type: 'application/json' }), checkoutWebhookHandler)

// Middlewares de sécurité
app.use(helmetConfig)
app.use(express.json({ limit: '1mb' })) // Limite la taille des requêtes
app.use(secureLogging)
app.use(validateInput)
app.use(sanitizeInput)
app.use(injectionProtection)

// Rate limiting global (exclure le webhook Stripe)
app.use('/api/', (req, res, next) => {
  // Exempter le webhook Stripe du rate limiting
  if (req.path === '/checkout/webhook') {
    return next()
  }
  apiLimiter(req, res, next)
})

// Configuration du cache
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 60_000)
type CacheEntry = { time: number; data: any }
const cache = new Map<string, CacheEntry>()

const getCache = (key: string) => {
  const e = cache.get(key)
  if (!e) return null
  if (Date.now() - e.time > CACHE_TTL_MS) { 
    cache.delete(key); 
    return null 
  }
  return e.data
}

const setCache = (key: string, data: any) => cache.set(key, { time: Date.now(), data })

// Routes d'authentification
app.use('/api/auth', authRoutes)

// Routes des utilisateurs
app.use('/api/users', userRoutes)

// Routes produits
app.use('/api/products', productRoutes)

// Checkout Stripe
app.use('/api/checkout', checkoutRoutes)

// Route de santé
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Fonction pour récupérer les données depuis l'API REST de TCGdx
const fetchTCGdx = async (endpoint: string) => {
  const response = await fetch(`https://api.tcgdex.net/v2/fr/${endpoint}`)
  if (!response.ok) return null
  return response.json()
}

// Route pour récupérer les séries de cartes
app.get('/api/trade/sets', validateInput, async (_req, res) => {
  const key = 'sets:fr'
  const cached = getCache(key)
  if (cached) return res.json(cached)
  
  try {
    const data = await fetchTCGdx('sets')
    if (!data || !Array.isArray(data)) {
      res.json([])
      return
    }
    
    const mapped = data.map((s: any) => ({
      id: s.id,
      name: s.name,
      series: s.serie?.name ?? null,
      printedTotal: s.cardCount?.official ?? null,
      total: s.cardCount?.total ?? null,
      releaseDate: s.releaseDate ?? null,
      imagesLogo: s.logo || null,
      imagesSymbol: s.symbol || null,
    }))
    
    // Filtrer les séries qui n'ont ni logo ni symbole
    const filteredSets = mapped.filter((set: any) => {
      const hasLogo = set.imagesLogo && set.imagesLogo.trim() !== '' && set.imagesLogo !== 'null'
      const hasSymbol = set.imagesSymbol && set.imagesSymbol.trim() !== '' && set.imagesSymbol !== 'null'
      
      // Vérifier que l'URL n'est pas juste "null" ou vide
      const isValidLogo = hasLogo && !set.imagesLogo.includes('null')
      const isValidSymbol = hasSymbol && !set.imagesSymbol.includes('null')
      
      return isValidLogo || isValidSymbol
    })
    
    console.log(`📊 Séries trouvées: ${mapped.length}, Séries avec images: ${filteredSets.length}`)
    
    // Log des séries filtrées pour debug
    if (filteredSets.length < mapped.length) {
      const removedSets = mapped.filter((set: any) => {
        const hasLogo = set.imagesLogo && set.imagesLogo.trim() !== '' && set.imagesLogo !== 'null'
        const hasSymbol = set.imagesSymbol && set.imagesSymbol.trim() !== '' && set.imagesSymbol !== 'null'
        return !hasLogo && !hasSymbol
      })
      console.log(`🚫 Séries supprimées (pas d'images):`, removedSets.map((s: any) => s.name))
    }
    
    setCache(key, filteredSets)
    res.json(filteredSets)
  } catch (e) {
    console.error('Error fetching sets:', e)
    res.json([])
  }
})

// Route pour récupérer les cartes d'une série
app.get('/api/trade/sets/:id/cards', validateInput, async (req, res) => {
  const { id } = req.params
  const key = `set:${id}:fr`
  const cached = getCache(key)
  if (cached) return res.json(cached)
  
  try {
    // Récupère le set avec ses cartes
    const set = await fetchTCGdx(`sets/${id}`)
    if (!set || typeof set !== 'object' || !('cards' in set) || !Array.isArray((set as any).cards)) {
      res.json([])
      return
    }
    
    const setReleaseDate: string | null = (set as any).releaseDate ?? null
    const setSeries: string | null = (set as any).serie?.name ?? null
    
    const cards = await Promise.all(
      ((set as any).cards || []).map(async (cardResume: any) => {
        // Récupère la carte complète
        const card = await fetchTCGdx(`cards/${cardResume.id}`)
        if (!card || typeof card !== 'object') {
          return null
        }
        
        // Utilise la propriété image de l'objet carte selon la documentation TCGdex
        const baseImageUrl = (card as any).image || null
        const highQualityPng = baseImageUrl ? `${baseImageUrl}/high.png` : null
        const lowQualityWebp = baseImageUrl ? `${baseImageUrl}/low.webp` : null
        
        // Debug: afficher les URLs d'images (seulement en développement)
        if (process.env.NODE_ENV === 'development') {
          console.log(`Carte ${(card as any).name}:`, { baseImageUrl, highQualityPng, lowQualityWebp })
        }
        
        return {
          id: (card as any).id,
          name: (card as any).name,
          number: String((card as any).localId),
          rarity: (card as any).rarity ?? null,
          imagesSmall: lowQualityWebp,
          imagesLarge: highQualityPng,
          setReleaseDate,
          setSeries,
          // Ajouter aussi l'URL de base pour debug
          image: baseImageUrl,
        }
      })
    )
    
    const filteredCards = cards.filter((card: any) => card !== null)
    
    const rarityOrderFr: Record<string, number> = {
      'Commune': 1,
      'Peu commune': 2,
      'Rare': 3,
      'Rare Holographique': 4,
      'Double rare': 5,
      'Ultra rare': 6,
      'Rare Illustration': 7,
      'Rare Illustration spéciale': 8,
      'Hyper rare': 9,
      'Rare secrète': 10,
      'Rare arc-en-ciel': 10,
      'Promo': 0,
    }
    
    filteredCards.sort((a: any, b: any) => 
      (rarityOrderFr[a.rarity ?? ''] ?? 0) - (rarityOrderFr[b.rarity ?? ''] ?? 0) || 
      String(a.number).localeCompare(String(b.number))
    )
    
    setCache(key, filteredCards)
    res.json(filteredCards)
  } catch (e) {
    console.error(`Error fetching cards for set ${id}:`, e)
    res.json([])
  }
})

// Gestion des erreurs globales
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erreur globale:', err)
  res.status(500).json({
    error: 'Erreur interne du serveur',
    code: 'INTERNAL_SERVER_ERROR'
  })
})

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl
  })
})

const port = Number(process.env.PORT ?? 8080)
app.listen(port, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${port}`)
  console.log(`📚 API d'authentification: http://localhost:${port}/api/auth`)
  console.log(`👤 API utilisateurs: http://localhost:${port}/api/users`)
  console.log(`🛒 API produits: http://localhost:${port}/api/products`)
  console.log(`💳 API checkout: http://localhost:${port}/api/checkout`)
  console.log(`🃏 API trade: http://localhost:${port}/api/trade`)
  console.log(`💚 Santé: http://localhost:${port}/api/health`)
})