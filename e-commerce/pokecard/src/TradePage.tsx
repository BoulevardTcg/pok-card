import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Set = { id: string; name: string; series?: string | null; imagesLogo?: string | null; imagesSymbol?: string | null; releaseDate?: string | null }

function ensurePng(url?: string | null): string | null {
  if (!url) return null
  return url.endsWith('.png') ? url : `${url}.png`
}

export function TradePage() {
  const [sets, setSets] = useState<Set[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('https://api.tcgdex.net/v2/fr/sets')
      .then(r => r.json())
      .then((data: any[]) => {
        const mapped: Set[] = data.map(s => ({
          id: s.id,
          name: s.name,
          series: s.serie?.name ?? null,
          imagesLogo: ensurePng(s.logo),
          imagesSymbol: ensurePng(s.symbol),
          releaseDate: s.releaseDate ?? null,
        }))
        setSets(mapped)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 40 }}>Chargement des séries…</div>

  return (
    <div style={{ padding: 24 }}>
      <h1>Échanges — Séries Pokémon</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {sets.map((s) => (
          <div key={s.id} onClick={() => navigate(`/trade/set/${s.id}`)} style={{ cursor: 'pointer', border: '1px solid #eee', borderRadius: 12, padding: 16, background: '#fff' }}>
            {s.imagesLogo ? (
              <img src={s.imagesLogo} alt={s.name} style={{ width: '100%', height: 100, objectFit: 'contain' }} />
            ) : s.imagesSymbol ? (
              <img src={s.imagesSymbol} alt={s.name} style={{ width: 60, height: 60, objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '100%', height: 100, display: 'grid', placeItems: 'center', background: '#f5f7fb', color: '#889' }}>Pas de logo</div>
            )}
            <div style={{ marginTop: 8, fontWeight: 600 }}>{s.name}</div>
            <div style={{ color: '#667', fontSize: 12 }}>{s.series}</div>
            <div style={{ color: '#889', fontSize: 12 }}>{s.releaseDate}</div>
          </div>
        ))}
      </div>
    </div>
  )
}


