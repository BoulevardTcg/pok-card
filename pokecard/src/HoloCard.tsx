import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import './pokeholo.css'


export type TradeCard = {
  id: string
  name: string
  number?: string | null
  rarity?: string | null
  imagesSmall?: string | null
  imagesLarge?: string | null
  setSeries?: string | null
  setCode?: string | null
}

type Props = {
  card: TradeCard
  onClick?: () => void
}

function mapFrenchRarityToEffect(card: TradeCard): {
  dataRarity?: string
  dataSubtypes?: string
  dataSupertype?: string
  dataTrainerGallery?: string
  dataIllusion2?: string
} {
  const name = (card.name || '').toUpperCase()
  const rarityFr = (card.rarity || '').toLowerCase()
  
  // Check if this is a Base 2 series card
  const setSeries = card.setSeries?.toLowerCase() || ''
  const isBase2Series = setSeries.includes('base 2') || 
                       setSeries.includes('base2') ||
                       setSeries.includes('base-2')



  // If it's Base 2 series, apply cosmos effect regardless of rarity
  if (isBase2Series) {
    return { dataRarity: 'base2 cosmos' }
  }

  // Heuristics for V/VMAX/VSTAR/Radiant
  if (name.includes('VMAX')) {
    return { dataRarity: 'rare holo vmax', dataSubtypes: 'vmax', dataSupertype: 'pokémon' }
  }
  if (name.includes('VSTAR')) {
    return { dataRarity: 'rare holo vstar', dataSubtypes: 'vstar', dataSupertype: 'pokémon' }
  }
  if (/\bV\b/.test(name)) {
    return { dataRarity: 'rare holo v', dataSubtypes: 'v', dataSupertype: 'pokémon' }
  }
  if (name.includes('RADIEUX') || name.includes('RADIEUSE')) {
    return { dataRarity: 'radiant rare' }
  }

  // Map known FR rarities with more comprehensive matching
  switch (rarityFr) {
    case 'reverse':
    case 'revers':
    case 'rare reverse':
    case 'peu commune reverse':
    case 'commune reverse':
    case 'rare holographique reverse':
      return { dataRarity: 'reverse holo' }
    case 'rare holo':
    case 'rare holographique':
      return { dataRarity: 'rare holo' }
    case 'rare holo cosmos':
    case 'rare holographique cosmos':
      return { dataRarity: 'rare holo cosmos' }
    case 'rare secrète':
      return { dataRarity: 'rare secret' }
    case 'rare arc-en-ciel':
    case 'rare rainbow':
      return { dataRarity: 'rare rainbow' }
    case 'hyper rare':
      return { dataRarity: 'rare secret' }
    case 'rare illustration':
    case 'rare illustration rare':
      // Alternate art style without extra foil
      return { dataRarity: 'rare rainbow alt' }
    case 'rare illustration spéciale':
    case 'rare illustration spéciale rare':
      // Alternate art with extra illusion2 foil
      return { dataRarity: 'rare rainbow alt', dataIllusion2: 'true' }
    case 'rare radieuse':
    case 'rare radiant':
      return { dataRarity: 'radiant rare' }
    case 'rare chromatique':
    case 'rare brillante':
      return { dataRarity: 'rare shiny' }
    case 'ultra rare':
      // Ultra rare often corresponds to full art / textured
      return { dataRarity: 'rare ultra', dataSupertype: 'pokémon' }
    case 'double rare':
      // Scarlet/Violet double rare (ex) — approximate with V regular effect
      return { dataRarity: 'rare holo v', dataSupertype: 'pokémon' }
    case 'commune':
    case 'peu commune':
    case 'rare':
    default:
      // Check for partial matches for illustration spéciale
      if (rarityFr.includes('illustration') && rarityFr.includes('spéciale')) {
        return { dataRarity: 'rare rainbow alt', dataIllusion2: 'true' }
      }
      if (rarityFr.includes('illustration') && rarityFr.includes('rare')) {
        return { dataRarity: 'rare rainbow alt' }
      }
      // Default to basic holo for any "rare" that doesn't match specific patterns
      if (rarityFr.includes('rare')) {
        return { dataRarity: 'rare holo' }
      }
      return {}
  }
}

export function HoloCard({ card, foilMap }: Props & { foilMap?: Map<string, string> | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rotatorRef = useRef<HTMLButtonElement | null>(null)
  const [interacting, setInteracting] = useState(false)
  const [active, setActive] = useState(false)

  const { dataRarity, dataSubtypes, dataSupertype, dataTrainerGallery, dataIllusion2 } = useMemo(() => mapFrenchRarityToEffect(card), [card])







  // Trouver l'URL du foil spécifique pour cette carte
  const cardFoilUrl = useMemo(() => {
    if (!foilMap || !card.setCode || !card.number) {
      return null
    }
    
    // Essayer d'abord avec le numéro exact
    const key = `${card.setCode.toLowerCase()}|${String(card.number).trim()}`
    let foilUrl = foilMap.get(key)
    
    // Si pas trouvé, essayer avec différentes variations
    if (!foilUrl) {
      const variations = [
        `${card.setCode.toLowerCase()}|${card.number}`,
        `${card.setCode.toLowerCase()}|${String(card.number).toLowerCase()}`,
        `${card.setCode.toLowerCase()}|${String(card.number).toUpperCase()}`
      ]
      
      for (const variation of variations) {
        const found = foilMap.get(variation)
        if (found) {
          foilUrl = found
          break
        }
      }
    }
    
    // Si pas trouvé, essayer avec le numéro 185 (cas spécial pour Giratina V)
    if (!foilUrl && card.setCode === 'swsh11' && card.number === '186') {
      const key185 = `${card.setCode.toLowerCase()}|185`
      foilUrl = foilMap.get(key185)
    }
    
    return foilUrl || null
  }, [foilMap, card.setCode, card.number])

  // Throttle pour limiter les mises à jour à ~60fps
  const lastUpdateRef = useRef<number>(0)
  const lastActiveUpdateRef = useRef<number>(0)

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current
    if (!el) return
    
    // Throttle différent selon le mode (actif ou non)
    // Mode actif : throttle plus agressif car la carte est plus grande
    const throttleMs = active ? 16 : 16 // ~60fps pour les deux modes
    const now = performance.now()
    const lastUpdate = active ? lastActiveUpdateRef.current : lastUpdateRef.current
    
    if (now - lastUpdate < throttleMs) {
      return
    }
    
    if (active) {
      lastActiveUpdateRef.current = now
    } else {
      lastUpdateRef.current = now
    }
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const px = Math.max(0, Math.min(100, (x / rect.width) * 100))
    const py = Math.max(0, Math.min(100, (y / rect.height) * 100))
    const cx = px - 50
    const cy = py - 50

    const style = el.style as any
    style.setProperty('--pointer-x', `${px}%`)
    style.setProperty('--pointer-y', `${py}%`)
    style.setProperty('--background-x', `${px}%`)
    style.setProperty('--background-y', `${py}%`)
    style.setProperty('--card-opacity', `1`)
    style.setProperty('--rotate-x', `${-(cx / 3.5)}deg`)
    style.setProperty('--rotate-y', `${cy / 2}deg`)
    if (!active) {
      style.setProperty('--translate-x', `0px`)
      style.setProperty('--translate-y', `-6px`)
      style.setProperty('--card-scale', interacting ? `1.05` : `1.02`)
    }
  }, [interacting, active])

  const handleEnter = useCallback(() => {
    setInteracting(true)
  }, [])

  const handleLeave = useCallback(() => {
    setInteracting(false)
    const el = containerRef.current
    if (!el) return
    const style = el.style as any
    style.setProperty('--pointer-x', `50%`)
    style.setProperty('--pointer-y', `50%`)
    style.setProperty('--background-x', `50%`)
    style.setProperty('--background-y', `50%`)
    style.setProperty('--card-opacity', active ? `1` : `0`)
    style.setProperty('--rotate-x', `0deg`)
    style.setProperty('--rotate-y', `0deg`)
    if (!active) {
      style.setProperty('--translate-x', `0px`)
      style.setProperty('--translate-y', `0px`)
      style.setProperty('--card-scale', `1`)
    }
  }, [active])

  // Throttle pour centerActive (évite les appels trop fréquents)
  const lastCenterUpdateRef = useRef<number>(0)
  const CENTER_THROTTLE_MS = 100 // 10 fois par seconde max

  const centerActive = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    
    // Throttle les appels à centerActive
    const now = performance.now()
    if (now - lastCenterUpdateRef.current < CENTER_THROTTLE_MS) {
      return
    }
    lastCenterUpdateRef.current = now
    
    // Éviter les redimensionnements multiples
    if (el.style.width && el.style.height) {
      return
    }
    
    const rect = el.getBoundingClientRect()
    const viewW = window.innerWidth
    const viewH = window.innerHeight
    
    // Calculate new dimensions (2x larger)
    const newWidth = rect.width * 2
    const newHeight = rect.height * 2
    
    // Calculate centering position
    const deltaX = Math.round(viewW / 2 - rect.x - newWidth / 2)
    const deltaY = Math.round(viewH / 2 - rect.y - newHeight / 2)
    
    const style = el.style as any
    style.setProperty('--translate-x', `${deltaX}px`)
    style.setProperty('--translate-y', `${deltaY}px`)
    style.setProperty('--card-scale', `1`) // Keep scale at 1
    style.setProperty('--card-opacity', `1`)
    
    // Set width and height directly to avoid rasterization
    el.style.width = `${newWidth}px`
    el.style.height = `${newHeight}px`
  }, [])

  const activate = useCallback(() => {
    setActive(true)
    // prevent background scroll
    const prev = document.body.style.overflow
    document.body.dataset.prevOverflow = prev
    document.body.style.overflow = 'hidden'
    // ensure centering after render
    requestAnimationFrame(() => centerActive())
  }, [centerActive])

  const deactivate = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const style = el.style as any
    style.setProperty('--translate-x', `0px`)
    style.setProperty('--translate-y', `0px`)
    style.setProperty('--card-scale', `1`)
    style.setProperty('--card-opacity', `0`)
    
    // Reset width and height to original size
    el.style.width = ''
    el.style.height = ''
    
    setActive(false)
    // restore background scroll
    const prev = document.body.dataset.prevOverflow || ''
    document.body.style.overflow = prev
  }, [])

  useEffect(() => {
    // initialize CSS vars
    const el = containerRef.current
    if (el) {
      const style = el.style as any
      
      style.setProperty('--pointer-x', `50%`)
      style.setProperty('--pointer-y', `50%`)
      style.setProperty('--background-x', `50%`)
      style.setProperty('--background-y', `50%`)
      style.setProperty('--pointer-from-top', `0.5`)
      style.setProperty('--pointer-from-left', `0.5`)
      style.setProperty('--pointer-from-center', `0`)
      style.setProperty('--card-opacity', `0`)
      style.setProperty('--rotate-x', `0deg`)
      style.setProperty('--rotate-y', `0deg`)
      style.setProperty('--translate-x', `0px`)
      style.setProperty('--translate-y', `0px`)
      style.setProperty('--card-scale', `1`)
      
      // Appliquer le foil spécifique si disponible
      if (cardFoilUrl) {
        style.setProperty('--foil', `url("${cardFoilUrl}")`)
        style.setProperty('--imgsize', 'cover')
      }
    }
  }, [cardFoilUrl, card.name, dataRarity, dataTrainerGallery])

  useEffect(() => {
    if (!active) return
    
    // Throttle pour resize et scroll
    let resizeTimeout: number | null = null
    let scrollTimeout: number | null = null
    
    const onResize = () => {
      if (resizeTimeout) return
      resizeTimeout = window.setTimeout(() => {
        centerActive()
        resizeTimeout = null
      }, 150) // Debounce de 150ms
    }
    
    // Empêcher le zoom infini lors du scroll avec la molette
    const onScroll = () => {
      if (scrollTimeout) return
      
      scrollTimeout = window.setTimeout(() => {
      // Ne recentrer que si la carte est vraiment active et visible
      if (active && containerRef.current) {
        // Vérifier que la carte n'a pas déjà la bonne taille
        const el = containerRef.current
        const currentWidth = el.style.width
        const currentHeight = el.style.height
        
        // Si la carte a déjà la bonne taille (2x), ne pas la redimensionner
        if (currentWidth && currentHeight) {
            scrollTimeout = null
          return
        }
        
        centerActive()
      }
        scrollTimeout = null
      }, 100) // Debounce de 100ms pour le scroll
    }
    
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') deactivate() }
    window.addEventListener('keydown', onKey)
    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      if (scrollTimeout) clearTimeout(scrollTimeout)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKey)
    }
  }, [active, centerActive, deactivate])

  const imageUrl = active ? (card.imagesLarge || card.imagesSmall || '') : (card.imagesSmall || card.imagesLarge || '')

  return (
    <div className="holoCardWrapper">
      {active && (
        <div
          onClick={deactivate}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999 }}
        />
      )}
      <div
        ref={containerRef}
        className={`card interactive ${active ? 'active' : ''}`}
        data-rarity={dataRarity}
        data-subtypes={dataSubtypes}
        data-supertype={dataSupertype}
        data-trainer-gallery={dataTrainerGallery}
        data-illus2={dataIllusion2}
        style={{ position: active ? 'relative' : undefined, zIndex: active ? 1000 : undefined, cursor: 'pointer' as const }}
      >
        <div className="card__translater">
          <button
            ref={rotatorRef}
            className="card__rotator"
            type="button"
            onMouseEnter={handleEnter}
            onMouseMove={(e) => {
              // Throttle pour les calculs de pointer-from-center
              const now = performance.now()
              const lastUpdate = active ? lastActiveUpdateRef.current : lastUpdateRef.current
              if (now - lastUpdate < 16) {
                // Utiliser les valeurs précédentes si on skip cette frame
                handleMove(e)
                return
              }
              
              // compute pointer-from-center and components for CSS
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top
              const px = Math.max(0, Math.min(100, (x / rect.width) * 100))
              const py = Math.max(0, Math.min(100, (y / rect.height) * 100))
              const dx = (px - 50) / 50
              const dy = (py - 50) / 50
              const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy))
              const el = containerRef.current
              if (el) {
                const style = el.style as any
                style.setProperty('--pointer-from-center', `${dist}`)
                style.setProperty('--pointer-from-top', `${py / 100}`)
                style.setProperty('--pointer-from-left', `${px / 100}`)
              }
              handleMove(e)
            }}
            onMouseLeave={handleLeave}
            onClick={(e) => { e.stopPropagation(); active ? deactivate() : activate() }}
          >
            {/* Only front image is necessary for effect; back is optional */}
            <img className="card__front" src={imageUrl} alt={card.name} loading="lazy" />
            <div className="card__shine" />
            <div className="card__glare" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default HoloCard




