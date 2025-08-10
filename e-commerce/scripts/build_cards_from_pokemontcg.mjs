// scripts/build_cards_from_pokemontcg.mjs
// Récupère tous les sets + cartes depuis api.pokemontcg.io/v2
// et génère scripts/cards.json compatible avec fetch_foils.py
//
// Usage:
//   POKEMONTCG_API_KEY=xxxxx node scripts/build_cards_from_pokemontcg.mjs
//
// Requiert Node 18+ (fetch natif)

import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE = 'https://api.pokemontcg.io/v2';
const API_KEY  = process.env.POKEMONTCG_API_KEY || ''; // ← mets ta clé en variable d'env
const PAGE_SIZE = 250;
const SLEEP_MS  = 120; // évite de spammer

const headers = API_KEY ? { 'X-Api-Key': API_KEY } : {};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchAllSets() {
  // Pagination sur /sets
  let page = 1;
  let out = [];
  while (true) {
    const url = `${API_BASE}/sets?page=${page}&pageSize=${PAGE_SIZE}&orderBy=releaseDate`;
    const json = await getJson(url);
    const data = json.data || [];
    out = out.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
    await sleep(SLEEP_MS);
  }
  return out; // [{ id, name, ptcgoCode, releaseDate, ... }]
}

async function fetchCardsForSet(setId) {
  // Pagination sur /cards?q=set.id:<setId>
  let page = 1;
  let out = [];
  while (true) {
    const q = encodeURIComponent(`set.id:${setId}`);
    const url = `${API_BASE}/cards?q=${q}&page=${page}&pageSize=${PAGE_SIZE}`;
    const json = await getJson(url);
    const data = json.data || [];
    out = out.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
    await sleep(SLEEP_MS);
  }
  return out; // [{ number, name, rarity, set: { id }, ... }]
}

function pickSetCode(set) {
  // Le CDN de simey colle généralement à set.id (sv04, sv4, swsh12pt5…)
  // On renvoie set.id en lowercase par sécurité
  return String(set.id || set.ptcgoCode || '').toLowerCase();
}

function normalizeNumber(n) {
  // On garde tel quel. (Le script foil génère ses candidats 029/29/etc.)
  return String(n ?? '').trim();
}

// Filtrer pour ne garder que les sets récents avec des foils probables
function isModernSet(set) {
  const setCode = (set.id || '').toLowerCase();
  const releaseDate = set.releaseDate || '';
  
  // Sets récents avec foils (SWSH, SV, quelques autres)
  const modernPrefixes = ['swsh', 'sv', 'pgo', 'cel25', 'mcd19', 'mcd20', 'mcd21', 'mcd22'];
  
  // Ou sets depuis 2020
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 0;
  
  return modernPrefixes.some(prefix => setCode.startsWith(prefix)) || year >= 2020;
}

async function main() {
  if (!API_KEY) {
    console.warn('⚠️  POKEMONTCG_API_KEY non défini. Mets ta clé dans la variable d\'environnement.');
  }

  console.log('📋 Récupération des sets…');
  const allSets = await fetchAllSets();
  
  // Filtrer pour les sets modernes seulement
  const sets = allSets.filter(isModernSet);
  console.log(`✅ ${sets.length} sets modernes trouvés (sur ${allSets.length} total)`);

  const out = [];
  let processed = 0;

  // Créer le dossier de sortie
  await fs.mkdir('scripts', { recursive: true });
  const output = path.resolve('scripts/cards.json');

  for (const s of sets) {
    const setCode = pickSetCode(s);
    if (!setCode) continue;

    console.log(`📦 Set ${setCode} (${s.releaseDate || 'N/A'}) — cartes…`);
    try {
      const cards = await fetchCardsForSet(s.id);
      let added = 0;
      for (const c of cards) {
        const number = normalizeNumber(c.number);
        if (!number) continue;
        out.push({
          setCode,
          number,
          _meta: {
            name: c.name || '',
            rarity: c.rarity || ''
          }
        });
        added++;
      }
      console.log(`   → ${added} cartes ajoutées`);
      processed++;
      
      // Sauvegarde progressive toutes les 5 sets
      if (processed % 5 === 0) {
        await fs.writeFile(output, JSON.stringify(out, null, 2), 'utf-8');
        console.log(`💾 Sauvegarde intermédiaire: ${out.length} cartes`);
      }
      
    } catch (err) {
      console.warn(`   ⚠️ Erreur set ${setCode}: ${err.message}`);
    }
    await sleep(SLEEP_MS);
  }

  // Sauvegarde finale
  await fs.writeFile(output, JSON.stringify(out, null, 2), 'utf-8');

  console.log('\n🎉 Terminé');
  console.log(`📄 Fichier généré: ${output}`);
  console.log(`📊 Sets traités: ${processed}/${sets.length} — Cartes: ${out.length}`);
  console.log(`\nProchaine étape:`);
  console.log(`  python fetch_foils.py ${output} --out public/foils`);
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
