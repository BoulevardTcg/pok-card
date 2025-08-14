import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import './pokeholo.css'
import { loadFoilMap } from './foilMap'

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

export function HoloCard({ card, onClick, foilMap }: Props & { foilMap?: Map<string, string> | null }) {
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
    
    // Debug: afficher les informations de la carte
    console.log(`HoloCard: recherche foil pour ${card.name} avec clé "${card.setCode.toLowerCase()}|${String(card.number).trim()}"`)
    
    // Essayer d'abord avec le numéro exact
    const key = `${card.setCode.toLowerCase()}|${String(card.number).trim()}`
    let foilUrl = foilMap.get(key)
    
    // Debug: afficher si trouvé
    if (foilUrl) {
      console.log(`✅ Foil trouvé pour ${card.name}: ${foilUrl}`)
    } else {
      console.log(`❌ Aucun foil trouvé pour ${card.name} avec la clé "${key}"`)
      
      // Debug: afficher quelques clés disponibles dans le foilMap
      const availableKeys = Array.from(foilMap.keys()).slice(0, 10)
      console.log(`🔑 Quelques clés disponibles dans foilMap:`, availableKeys)
      
      // Debug: vérifier si la clé existe avec différentes variations
      const variations = [
        key,
        `${card.setCode.toLowerCase()}|${card.number}`,
        `${card.setCode.toLowerCase()}|${String(card.number).toLowerCase()}`,
        `${card.setCode.toLowerCase()}|${String(card.number).toUpperCase()}`
      ]
      
      for (const variation of variations) {
        const found = foilMap.get(variation)
        if (found) {
          console.log(`✅ Foil trouvé avec variation "${variation}": ${found}`)
          foilUrl = found
          break
        }
      }
    }
    
    // Si pas trouvé, essayer avec le numéro 185 (cas spécial pour Giratina V)
    if (!foilUrl && card.setCode === 'swsh11' && card.number === '186') {
      const key185 = `${card.setCode.toLowerCase()}|185`
      foilUrl = foilMap.get(key185)
      if (foilUrl) {
        console.log(`✅ Foil trouvé avec clé spéciale 185: ${foilUrl}`)
      }
    }
    
    return foilUrl || null
  }, [foilMap, card.setCode, card.number])

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current
    if (!el) return
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

  const centerActive = useCallback(() => {
    const el = containerRef.current
    if (!el) return
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
      
      // Appliquer le foil spécifique si disponible, sinon utiliser un fallback selon la rareté
      if (cardFoilUrl) {
        style.setProperty('--foil', `url("${cardFoilUrl}")`)
        style.setProperty('--imgsize', 'cover')
        console.log(`🎨 Foil appliqué pour ${card.name}: ${cardFoilUrl}`)
        
        // Debug spécial pour les cartes TG
        if (dataTrainerGallery === 'true') {
          console.log(`🎭 CARTE TRAINER GALLERY DÉTECTÉE: ${card.name}`)
          console.log(`🔑 Attributs: rarity="${dataRarity}", trainer-gallery="${dataTrainerGallery}"`)
          console.log(`🎨 Variables CSS: --foil="${style.getPropertyValue('--foil')}", --imgsize="${style.getPropertyValue('--imgsize')}"`)
        }
      } else {
        // Fallback selon la rareté de la carte
        let fallbackFoil = ''
        if (dataRarity?.includes('vmax')) {
          fallbackFoil = '/img/vmaxbg.jpg'
        } else if (dataRarity?.includes('vstar')) {
          fallbackFoil = '/img/vmaxbg.jpg' // Utiliser le même que VMAX pour l'instant
        } else if (dataRarity?.includes('v')) {
          fallbackFoil = '/img/vmaxbg.jpg' // Utiliser le même que VMAX pour l'instant
        } else {
          fallbackFoil = '/img/vmaxbg.jpg' // Fallback général
        }
        
        style.setProperty('--foil', `url("${fallbackFoil}")`)
        style.setProperty('--imgsize', 'cover')
        console.log(`🎨 Fallback foil appliqué pour ${card.name}: ${fallbackFoil}`)
        
        // Debug spécial pour les cartes TG sans foil
        if (dataTrainerGallery === 'true') {
          console.log(`⚠️ CARTE TRAINER GALLERY SANS FOIL: ${card.name}`)
          console.log(`🔑 Attributs: rarity="${dataRarity}", trainer-gallery="${dataTrainerGallery}"`)
          console.log(`🎨 Fallback appliqué: ${fallbackFoil}`)
        }
      }
    }
  }, [cardFoilUrl, card.name, dataRarity, dataTrainerGallery])

  useEffect(() => {
    if (!active) return
    const onResize = () => centerActive()
    const onScroll = () => centerActive()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') deactivate() }
    window.addEventListener('keydown', onKey)
    return () => {
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




