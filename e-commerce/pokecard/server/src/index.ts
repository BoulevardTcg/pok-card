import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'] }))
app.use(express.json())

const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 60_000)
type CacheEntry = { time: number; data: any }
const cache = new Map<string, CacheEntry>()
const getCache = (key: string) => {
  const e = cache.get(key)
  if (!e) return null
  if (Date.now() - e.time > CACHE_TTL_MS) { cache.delete(key); return null }
  return e.data
}
const setCache = (key: string, data: any) => cache.set(key, { time: Date.now(), data })

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Fonction pour récupérer les données depuis l'API REST de TCGdx
const fetchTCGdx = async (endpoint: string) => {
  const response = await fetch(`https://api.tcgdex.net/v2/fr/${endpoint}`)
  if (!response.ok) return null
  return response.json()
}

app.get('/api/trade/sets', async (_req, res) => {
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
    setCache(key, mapped)
    res.json(mapped)
  } catch (e) {
    console.error('Error fetching sets:', e)
    res.json([])
  }
})

app.get('/api/trade/sets/:id/cards', async (req, res) => {
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
        
        // Debug: afficher les URLs d'images
        console.log(`Carte ${(card as any).name}:`, { baseImageUrl, highQualityPng, lowQualityWebp })
        
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
    filteredCards.sort((a: any, b: any) => (rarityOrderFr[a.rarity ?? ''] ?? 0) - (rarityOrderFr[b.rarity ?? ''] ?? 0) || String(a.number).localeCompare(String(b.number)))
    setCache(key, filteredCards)
    res.json(filteredCards)
  } catch (e) {
    console.error(`Error fetching cards for set ${id}:`, e)
    res.json([])
  }
})

const port = Number(process.env.PORT ?? 8080)
app.listen(port, () => console.log(`[server] http://localhost:${port}`))