export type FoilEntry = {
  setCode: string
  number: string
  _foil_url?: string
  _foil_variant?: string
}

function z3(n: string): string {
  const m = n.match(/^\d+$/)
  return m ? String(parseInt(n, 10)).padStart(3, '0') : n
}

function unpad(n: string): string {
  const m = n.match(/^\d+$/)
  return m ? String(parseInt(n, 10)) : n
}

function normalizeSet(setCode: string | undefined | null): string {
  return String(setCode || '').trim().toLowerCase()
}

function buildLocalFoilUrl(setCode: string, number: string, variant?: string): string | undefined {
  if (!variant) return undefined
  const num = z3(number)
  // We downloaded many as .jpg; prefer .jpg path
  return `/img/foils/${normalizeSet(setCode)}/foils/${num}_${variant}.jpg`
}

/**
  * Load a map of foil URLs keyed by `${setCode}|${number}` with multiple number forms.
  * Fusionne tous les fichiers de foils disponibles :
  * - fr_enriched_with_swsh11_urls.json (contient les foils swsh11 + autres séries)
  * - fr_enriched.json (contient les foils des autres séries)
  * - cards.json (fallback optionnel)
  * 
  * Les foils sont fusionnés avec priorité au premier fichier trouvé pour chaque carte.
  */
export async function loadFoilMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>()

  async function tryFetch(path: string): Promise<any[] | null> {
    try {
      const res = await fetch(path)
      if (!res.ok) return null
      const data = await res.json()
      return Array.isArray(data) ? data : null
    } catch {
      return null
    }
  }

  const sources = [
    '/foils/fr_enriched_with_swsh11_urls.json',
    '/foils/fr_enriched.json',
    '/foils/cards.json' // fallback optionnel
  ]

  // Charger tous les fichiers et fusionner les foils valides
  for (const src of sources) {
    const arr = await tryFetch(src)
    if (!arr) continue
    
    for (const e of arr as FoilEntry[]) {
      // Skip invalid entries safely
      if (e == null || typeof e !== 'object') continue

      const anyE = e as any
      const setCode = normalizeSet(anyE.setCode || anyE.french_set || anyE.english_set)
      const number = String(anyE.number || anyE.french_number || anyE.english_number || '').trim()
      if (!setCode || !number) continue

      // Étendre la détection d'URL directes pour couvrir tous les champs présents dans l'enrichi
      const direct = (
        anyE._foil_url ||
        anyE.foil_url ||
        anyE.foil_verified_url ||
        anyE.foil_cdn_guess ||
        anyE.foil_cdn_fallback
      ) as string | undefined

      const derived = buildLocalFoilUrl(setCode, number, anyE._foil_variant || anyE.foil_variant)
      const foilUrl = direct || derived
      
      // Ne traiter que les entrées avec des foils valides (URL non vide)
      if (!foilUrl || foilUrl.trim() === '') continue

      const candidates = new Set<string>()
      
      // Ajouter la clé exacte
      candidates.add(`${setCode}|${number}`)
      
      // Pour les numéros numériques, ajouter les variations pad/unpad
      if (/^\d+$/.test(number)) {
        const n3 = z3(number)
        const nUnpadded = unpad(number)
        candidates.add(`${setCode}|${n3}`)
        candidates.add(`${setCode}|${nUnpadded}`)
      }
      
      // Pour les numéros TG (Trainer Gallery), ajouter des variations possibles
      if (number.startsWith('TG')) {
        // Garder TG17 tel quel, mais aussi essayer tg17 (lowercase)
        candidates.add(`${setCode}|${number.toLowerCase()}`)
        // Et essayer sans le préfixe TG
        const tgNumber = number.replace(/^TG/i, '')
        if (tgNumber) {
          candidates.add(`${setCode}|${tgNumber}`)
          candidates.add(`${setCode}|${z3(tgNumber)}`)
        }
      }

      for (const key of candidates) {
        // Ne pas écraser les foils déjà présents (priorité au premier fichier)
        if (!map.has(key)) {
          map.set(key, foilUrl)
        }
      }
    }
    // Continuer à charger tous les fichiers pour fusionner tous les foils valides
  }

  return map
}


