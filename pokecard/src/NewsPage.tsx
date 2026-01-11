import { useState } from 'react';
import styles from './NewsPage.module.css';

type TCGCategory =
  | 'Pokémon'
  | 'One Piece'
  | 'Disney Lorcana'
  | 'Magic'
  | 'Yu-Gi-Oh!'
  | 'Flesh and Blood'
  | 'Riftbound';

interface NewsItem {
  id: string;
  title: string;
  category: TCGCategory;
  date: string;
  image: string;
  excerpt: string;
  content: string;
  type: 'latest' | 'upcoming';
  source?: string;
}

const mockNews: NewsItem[] = [
  // ═══════════════════════════════════════════════════════════════════
  // POKÉMON TCG
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'pkmn-1',
    title: 'Pokémon TCG — Mega Evolution : Ascended Heroes',
    category: 'Pokémon',
    date: '2026-01-30',
    image: '/actualiter/pokemon.png',
    excerpt:
      'Grosse extension annoncée avec 290+ cartes, nouvelles cartes et stratégies autour de la Mega Evolution.',
    content:
      "L'extension Mega Evolution — Ascended Heroes marque le début de la série Mega Evolution Series. Cette extension majeure comprend plus de 290 cartes avec de nouvelles mécaniques de jeu centrées sur la Mega Evolution. Les collectionneurs découvriront des cartes exclusives avec des illustrations exceptionnelles et des stratégies innovantes pour les tournois. Disponible le 30 janvier 2026.",
    type: 'upcoming',
    source: 'The Pokémon Company',
  },
  {
    id: 'pkmn-2',
    title: 'Pokémon TCG — Mega Evolution : Perfect Order',
    category: 'Pokémon',
    date: '2026-03-26',
    image: '/actualiter/pokemon.png',
    excerpt:
      'Deuxième extension de la série Mega Evolution, disponible en physique et en digital dès le 26 mars 2026.',
    content:
      "Annoncée officiellement le 8 janvier 2026, l'extension Mega Evolution — Perfect Order sera disponible le 26 mars 2026. Cette extension sera également disponible en version digitale à partir de la même date. Les produits Pokémon Center incluront des Elite Trainer Box et Booster Bundles avec des cartes exclusives et des goodies collector.",
    type: 'upcoming',
    source: 'TPCi Press Release',
  },
  {
    id: 'pkmn-3',
    title: 'Pokémon Center — Produits Ascended Heroes',
    category: 'Pokémon',
    date: '2026-04-24',
    image: '/actualiter/pokemon.png',
    excerpt:
      'Booster Bundle, Elite Trainer Box et autres produits exclusifs disponibles le 24 avril 2026.',
    content:
      "Le Pokémon Center UK annonce la disponibilité de plusieurs produits liés à l'extension Ascended Heroes le 24 avril 2026. Les collectionneurs pourront se procurer des Booster Bundles, Elite Trainer Box et d'autres produits exclusifs avec des cartes promo et des accessoires collector. Les pages produit sont déjà disponibles en précommande sur le site officiel.",
    type: 'upcoming',
    source: 'Pokémon Center UK',
  },
  {
    id: 'pkmn-4',
    title: 'Pokémon TCG Pocket — Mega Rising',
    category: 'Pokémon',
    date: '2025-10-30',
    image: '/actualiter/pokemon.png',
    excerpt: "L'arrivée de la Mega Evolution dans Pokémon TCG Pocket avec l'extension Mega Rising.",
    content:
      "L'extension Mega Rising introduit la Mega Evolution dans Pokémon TCG Pocket. Disponible depuis le 30 octobre 2025, cette extension apporte de nouvelles cartes et mécaniques de jeu adaptées à la version digitale. Les joueurs peuvent désormais utiliser la Mega Evolution dans leurs decks et découvrir de nouvelles stratégies compétitives.",
    type: 'latest',
    source: 'The Verge',
  },

  // ═══════════════════════════════════════════════════════════════════
  // ONE PIECE CARD GAME
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'op-1',
    title: "One Piece Card Game — THE AZURE SEA'S SEVEN [OP14-EB04]",
    category: 'One Piece',
    date: '2026-01-16',
    image: '/actualiter/one_piece.png',
    excerpt:
      'Nouveau booster pack mettant en avant les Seven Warlords of the Sea avec de nouveaux Leaders.',
    content:
      "Le booster pack THE AZURE SEA'S SEVEN [OP14-EB04] sort le 16 janvier 2026. Cette extension met en avant les Seven Warlords of the Sea avec de nouveaux Leaders incluant Law, Mihawk, Jinbe, Boa Hancock, Doflamingo, Crocodile et Gecko Moria. Les cartes présentent des illustrations exclusives et de nouvelles capacités stratégiques pour enrichir vos decks.",
    type: 'upcoming',
    source: 'Bandai',
  },
  {
    id: 'op-2',
    title: 'One Piece Card Game — Starter Deck Egghead [ST-29]',
    category: 'One Piece',
    date: '2026-01-16',
    image: '/actualiter/one_piece.png',
    excerpt:
      "Nouveau Starter Deck basé sur l'arc Egghead, disponible le 16 janvier 2026 avec un booster pack inclus.",
    content:
      "Le Starter Deck Egghead [ST-29] sort le 16 janvier 2026 au prix de 11,99$. Ce deck de départ comprend un booster pack OP14-EB04 inclus, permettant aux nouveaux joueurs de commencer avec un deck équilibré et des cartes supplémentaires. Parfait pour découvrir le jeu ou compléter votre collection avec des cartes de l'arc Egghead.",
    type: 'upcoming',
    source: 'Bandai',
  },
  {
    id: 'op-3',
    title: 'One Piece Card Game — Double Pack Set Vol.9 [DP-09]',
    category: 'One Piece',
    date: '2026-01-16',
    image: '/actualiter/one_piece.png',
    excerpt:
      'Double Pack Set contenant 2 boosters OP14-EB04 + DON!!, disponible le 16 janvier 2026.',
    content:
      "Le Double Pack Set Vol.9 [DP-09] sort le 16 janvier 2026 au prix de 9,99$. Ce set comprend 2 boosters OP14-EB04 ainsi que des cartes DON!!. Idéal pour les joueurs qui souhaitent obtenir plus de cartes de l'extension THE AZURE SEA'S SEVEN tout en bénéficiant d'un prix avantageux.",
    type: 'upcoming',
    source: 'Bandai',
  },
  {
    id: 'op-4',
    title: 'One Piece Card Game — OP14-EB04 Release Event',
    category: 'One Piece',
    date: '2026-01-09',
    image: '/actualiter/one_piece.png',
    excerpt: 'Événement de pré-release du 9 au 15 janvier 2026 avec tournois et goodies exclusifs.',
    content:
      "L'événement de pré-release OP14-EB04 se déroule du 9 au 15 janvier 2026 dans les boutiques participantes. Les formats disponibles incluent Constructed ou Sealed, avec des packs d'événement et des goodies exclusifs. Bonus spécial : 1 Release Event Pack offert pour chaque booster box achetée. Inscrivez-vous dès maintenant dans votre boutique locale !",
    type: 'upcoming',
    source: 'Bandai',
  },
  {
    id: 'op-5',
    title: 'One Piece Card Game — Championship 26–27 : Nouveaux formats',
    category: 'One Piece',
    date: '2026-03-01',
    image: '/actualiter/one_piece.png',
    excerpt:
      'Changements majeurs pour la saison 26–27 : tournois offline uniquement, nouveaux formats Standard et Extra Regulation.',
    content:
      'La saison 26–27 du Championship One Piece Card Game apporte des changements majeurs. La saison est divisée en Season 1 (démarre en mars 2026) et Season 2. Tous les tournois officiels seront désormais offline uniquement. Le Standard Regulation autorise les cartes Block Icon 2+. Un nouveau format Extra Regulation sera introduit le 1er avril 2026, où la plupart des cartes sont légales sauf certaines bannies. Plusieurs cartes seront dé-bannies en Extra à partir du 1er avril (Great Eruption, Moby Dick, Enies Lobby, Ice Age...).',
    type: 'upcoming',
    source: 'Bandai Official Letter',
  },
  {
    id: 'op-6',
    title: 'One Piece Card Game — Banlist et restrictions',
    category: 'One Piece',
    date: '2025-09-05',
    image: '/actualiter/one_piece.png',
    excerpt:
      'Mise à jour officielle de la banlist et des restrictions de cartes (dernière mise à jour : 5 septembre 2025).',
    content:
      "La page officielle 'Banned/Restricted Card Addition Notice' a été mise à jour le 5 septembre 2025. Elle contient tous les détails sur les cartes bannies, les paires bannies et l'historique complet des restrictions. Consultez régulièrement cette page pour rester informé des changements qui affectent le format compétitif et vos stratégies de deck.",
    type: 'latest',
    source: 'Bandai Official',
  },

  // ═══════════════════════════════════════════════════════════════════
  // DISNEY LORCANA
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'lorcana-1',
    title: "Disney Lorcana — Collector's Guides Sets 1–4 & 5–8",
    category: 'Disney Lorcana',
    date: '2026-02-01',
    image: '/actualiter/lorcana.png',
    excerpt:
      'Guides collector officiels pour les sets 1 à 8, disponibles le 1er février 2026 en France.',
    content:
      "Ravensburger annonce la sortie des Collector's Guides officiels Disney Lorcana. Le premier volume couvre les Sets 1 à 4, et le second les Sets 5 à 8. Ces guides complets contiennent toutes les informations sur les cartes, les stratégies et l'univers Lorcana. Disponibles le 1er février 2026 dans les territoires incluant la France.",
    type: 'upcoming',
    source: 'Ravensburger',
  },
  {
    id: 'lorcana-2',
    title: 'Disney Lorcana — Notebook Officiel',
    category: 'Disney Lorcana',
    date: '2026-02-01',
    image: '/actualiter/lorcana.png',
    excerpt: 'Notebook officiel Disney Lorcana disponible le 1er février 2026.',
    content:
      'Un notebook officiel Disney Lorcana sera disponible le 1er février 2026. Ce produit fait partie des nouvelles offres annoncées par Ravensburger pour 2026, permettant aux fans de noter leurs stratégies, collections et souvenirs de parties dans un format premium aux couleurs de Lorcana.',
    type: 'upcoming',
    source: 'Ravensburger',
  },
  {
    id: 'lorcana-3',
    title: 'Disney Lorcana — Scrooge McDuck Gift Box & Stitch Starter Set',
    category: 'Disney Lorcana',
    date: '2026-03-13',
    image: '/actualiter/lorcana.png',
    excerpt:
      'Coffret cadeau Scrooge McDuck et Starter Set Collection Stitch disponibles le 13 mars 2026.',
    content:
      "Deux nouveaux produits Disney Lorcana arrivent le 13 mars 2026 : le Scrooge McDuck Gift Box, un coffret cadeau premium avec des cartes exclusives et des accessoires collector, et le Stitch Collection Starter Set, un deck de démarrage parfait pour les nouveaux joueurs ou les fans de Stitch. Ces produits font partie de l'annonce 'Exciting New Offerings for 2026' de Ravensburger.",
    type: 'upcoming',
    source: 'Ravensburger',
  },
  {
    id: 'lorcana-4',
    title: 'Disney Lorcana — 2-Player Starter Set',
    category: 'Disney Lorcana',
    date: '2026-05-08',
    image: '/actualiter/lorcana.png',
    excerpt: 'Nouveau Starter Set 2 joueurs disponible le 8 mai 2026 pour débuter à Lorcana.',
    content:
      "Ravensburger lance un nouveau 2-Player Starter Set le 8 mai 2026. Ce produit d'initiation contient tout le nécessaire pour deux joueurs souhaitant découvrir Disney Lorcana ensemble : deux decks équilibrés, des règles simplifiées et des accessoires de jeu. Parfait pour initier famille et amis à l'univers Lorcana.",
    type: 'upcoming',
    source: 'Ravensburger',
  },

  // ═══════════════════════════════════════════════════════════════════
  // MAGIC: THE GATHERING
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'mtg-1',
    title: 'Magic: The Gathering — Calendrier 2026',
    category: 'Magic',
    date: '2026-01-01',
    image: '/actualiter/magic.png',
    excerpt: 'Wizards of the Coast maintient un calendrier officiel des sorties Magic pour 2026.',
    content:
      "Le calendrier officiel 'Magic Story & Release Calendar 2026' de Wizards of the Coast liste toutes les extensions, produits et événements prévus pour l'année. Consultez régulièrement ce calendrier pour ne manquer aucune sortie importante et planifier vos achats de boosters, decks et produits collector Magic: The Gathering.",
    type: 'latest',
    source: 'Wizards of the Coast',
  },

  // ═══════════════════════════════════════════════════════════════════
  // YU-GI-OH!
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'ygo-1',
    title: 'Yu-Gi-Oh! — Produits et sorties officielles',
    category: 'Yu-Gi-Oh!',
    date: '2026-01-01',
    image: '/actualiter/yugioh-cover2.jpg',
    excerpt:
      'Consultez la page officielle Yu-Gi-Oh! TCG pour les dernières sorties et informations produits.',
    content:
      "Konami maintient une page officielle dédiée aux produits et informations Yu-Gi-Oh! Trading Card Game. Retrouvez toutes les annonces d'extensions, de structures decks, de tins collector et d'événements compétitifs directement sur le site officiel. Les joueurs compétitifs peuvent également consulter les mises à jour de la banlist et les règles de tournoi.",
    type: 'latest',
    source: 'Konami Official',
  },

  // ═══════════════════════════════════════════════════════════════════
  // FLESH AND BLOOD
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'fab-1',
    title: 'Flesh and Blood — Releases et annonces officielles',
    category: 'Flesh and Blood',
    date: '2026-01-01',
    image: '/actualiter/flesh-and-blood.png',
    excerpt: 'Retrouvez toutes les annonces officielles Flesh and Blood sur fabtcg.com.',
    content:
      "Legend Story Studios publie régulièrement des annonces sur fabtcg.com concernant les nouvelles extensions, les événements compétitifs (Calling, Pro Tour, World Championship) et les produits collector Flesh and Blood. Le site officiel est la source de référence pour suivre l'actualité du TCG et découvrir les nouveaux héros et mécaniques de jeu.",
    type: 'latest',
    source: 'Legend Story Studios',
  },

  // ═══════════════════════════════════════════════════════════════════
  // RIFTBOUND (Riot Games TCG)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'riftbound-1',
    title: 'Riftbound — Spiritforged (Set 2) disponible le 13 février',
    category: 'Riftbound',
    date: '2026-02-13',
    image: '/actualiter/riftbound.png',
    excerpt:
      'Le Set 2 Spiritforged arrive le 13 février 2026 en anglais. Précommandes ouvertes depuis le 13 janvier.',
    content:
      "Spiritforged, le Set 2 de Riftbound, sera disponible le 13 février 2026 en version anglaise. Les précommandes ont ouvert le 13 janvier 2026 à 18h00 (heure de Paris) sur le Riot Merch Store officiel. Le set inclut les Booster Display ainsi que les decks préconstruits Rumble & Fiora. Riot vise un démarrage d'expédition aligné sur la sortie anglaise, sans le garantir à 100%.",
    type: 'upcoming',
    source: 'Riot Games - PAX Unplugged',
  },
  {
    id: 'riftbound-2',
    title: 'Riftbound — Unleashed (Set 3) prévu en mai 2026',
    category: 'Riftbound',
    date: '2026-05-01',
    image: '/actualiter/riftbound.png',
    excerpt: 'Le Set 3 Unleashed arrive en mai 2026 selon la roadmap officielle Riot.',
    content:
      "Unleashed, le Set 3 de Riftbound, est prévu pour mai 2026. Ce set fait partie de la roadmap 2026 annoncée par Riot lors du récap' PAX Unplugged. Plus de détails sur le contenu du set seront communiqués ultérieurement.",
    type: 'upcoming',
    source: 'Riot Games - PAX Unplugged',
  },
  {
    id: 'riftbound-3',
    title: 'Riftbound — Vendetta & Radiance (Sets 4 & 5) fin 2026',
    category: 'Riftbound',
    date: '2026-12-01',
    image: '/actualiter/riftbound.png',
    excerpt: 'Deux nouveaux sets prévus fin 2026 : Vendetta puis Radiance.',
    content:
      'Riot a annoncé deux sets supplémentaires pour fin 2026 : Vendetta (Set 4) suivi de Radiance (Set 5). Riot indique viser une convergence des dates de sortie mondiales à partir de Vendetta, mais précise que le calendrier peut encore évoluer. Ces sets marqueront une année riche en contenu pour Riftbound.',
    type: 'upcoming',
    source: 'Riot Games - PAX Unplugged',
  },
  {
    id: 'riftbound-4',
    title: 'Riftbound en français — Origins FR arrive mi-2026',
    category: 'Riftbound',
    date: '2026-06-01',
    image: '/actualiter/riftbound.png',
    excerpt:
      'Riftbound arrive enfin en français ! Origins (Set 1) FR prévu mi-2026, puis Spiritforged et les sets suivants.',
    content:
      "Grande nouvelle pour les joueurs français : Riot a confirmé l'arrivée de Riftbound en français pour mi-2026. Le déploiement sera progressif : Origins (Set 1) en français d'abord vers mi-2026, puis Spiritforged et les sets suivants. L'objectif est de rattraper la parité mondiale au plus vite. Une excellente nouvelle pour la communauté francophone !",
    type: 'upcoming',
    source: 'Riot Games',
  },
  {
    id: 'riftbound-5',
    title: 'Riftbound — Précommandes Spiritforged ouvertes',
    category: 'Riftbound',
    date: '2026-01-13',
    image: '/actualiter/riftbound.png',
    excerpt:
      'Les précommandes Spiritforged sont ouvertes depuis le 13 janvier 2026 sur le Riot Merch Store.',
    content:
      "Les précommandes pour Spiritforged (Set 2) sont disponibles depuis le 13 janvier 2026 à 9:00 PT (18:00 heure de Paris) sur le Riot Merch Store officiel. Vous pouvez précommander les Booster Display ainsi que les decks préconstruits Rumble & Fiora. L'expédition est prévue pour s'aligner sur la sortie anglaise du 13 février 2026.",
    type: 'latest',
    source: 'Riot Merch Store',
  },
  {
    id: 'riftbound-6',
    title: 'Riftbound — Lunar Revel Bundle 2026 (édition chinoise)',
    category: 'Riftbound',
    date: '2026-02-17',
    image: '/actualiter/riftbound.png',
    excerpt:
      'Bundle spécial Lunar Revel 2026 disponible le 17 février, uniquement en chinois simplifié.',
    content:
      "Le Lunar Revel Bundle 2026 sera disponible à la commande le 17 février 2026 sur le Riot Merch Store au prix de $39.99. Attention : ce bundle est uniquement disponible en chinois simplifié (pas de version anglaise). L'expédition est annoncée pour mai 2026. Un produit collector pour les amateurs de l'édition chinoise.",
    type: 'upcoming',
    source: 'Riot Merch Store',
  },
  {
    id: 'riftbound-7',
    title: 'Riftbound — Circuit compétitif 2026 : 12 Regional Qualifiers',
    category: 'Riftbound',
    date: '2026-02-01',
    image: '/actualiter/riftbound.png',
    excerpt:
      'Riot annonce 12 Regional Qualifiers en 2026 et un premier Regional Championship fin 2026.',
    content:
      "Le circuit compétitif Riftbound 2026 s'annonce ambitieux ! Riot a annoncé 12 Regional Qualifiers (RQs) répartis sur l'Amérique du Nord, l'Europe, l'Asie du Sud-Est et l'Australie. Un premier Regional Championship est prévu fin 2026. Le prochain RQ en Europe est prévu pour février 2026, avec les détails (date et ville) à venir. Utilisez le Riftbound Play Network pour trouver des events près de chez vous (Nexus Nights, Summoner Skirmish, etc.).",
    type: 'upcoming',
    source: 'Riot Games',
  },
  {
    id: 'riftbound-8',
    title: 'Riftbound — Restocks Origins & Proving Grounds',
    category: 'Riftbound',
    date: '2026-01-01',
    image: '/actualiter/riftbound.png',
    excerpt: 'Réimpressions confirmées pour Proving Grounds ($40 MSRP) et Origins. Dates à venir.',
    content:
      "Bonne nouvelle pour l'approvisionnement : Riot confirme une réimpression de Proving Grounds avec un MSRP annoncé à $40 pour la nouvelle impression (timing encore flou). Pour Origins, Riot confirme que 'plus d'Origins arrive' en LGS et sur le Riot Merch Store, mais sans date ferme pour le moment. Restez à l'affût des annonces officielles.",
    type: 'latest',
    source: 'Riot Games',
  },
];

// Couleurs des catégories pour les badges
const categoryColors: Record<TCGCategory, { bg: string; text: string; glow: string }> = {
  Pokémon: { bg: 'rgba(255, 203, 5, 0.15)', text: '#FFCB05', glow: 'rgba(255, 203, 5, 0.3)' },
  'One Piece': { bg: 'rgba(220, 38, 38, 0.15)', text: '#ef4444', glow: 'rgba(220, 38, 38, 0.3)' },
  'Disney Lorcana': {
    bg: 'rgba(139, 92, 246, 0.15)',
    text: '#a78bfa',
    glow: 'rgba(139, 92, 246, 0.3)',
  },
  Magic: { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', glow: 'rgba(249, 115, 22, 0.3)' },
  'Yu-Gi-Oh!': { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', glow: 'rgba(34, 197, 94, 0.3)' },
  'Flesh and Blood': {
    bg: 'rgba(236, 72, 153, 0.15)',
    text: '#f472b6',
    glow: 'rgba(236, 72, 153, 0.3)',
  },
  Riftbound: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', glow: 'rgba(56, 189, 248, 0.3)' },
};

const allCategories: TCGCategory[] = [
  'Pokémon',
  'One Piece',
  'Disney Lorcana',
  'Magic',
  'Yu-Gi-Oh!',
  'Flesh and Blood',
  'Riftbound',
];

export function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | TCGCategory>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'latest' | 'upcoming'>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const filteredNews = mockNews
    .filter((news) => {
      if (selectedCategory !== 'all' && news.category !== selectedCategory) return false;
      if (selectedType !== 'all' && news.type !== selectedType) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleNewsClick = (news: NewsItem) => {
    setSelectedNews(news);
  };

  const handleBackToList = () => {
    setSelectedNews(null);
  };

  if (selectedNews) {
    const colors = categoryColors[selectedNews.category];
    return (
      <div className={styles.page}>
        <div className={styles.backgroundEffects}>
          <div className={styles.gradientOrb}></div>
          <div className={styles.noiseOverlay}></div>
        </div>
        <div className={styles.container}>
          <button onClick={handleBackToList} className={styles.backButton}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Retour aux actualités
          </button>
          <article className={styles.newsDetail}>
            <div className={styles.newsDetailHeader}>
              <div className={styles.newsDetailMeta}>
                <span
                  className={styles.categoryBadgeLarge}
                  style={{
                    background: colors.bg,
                    color: colors.text,
                    boxShadow: `0 0 20px ${colors.glow}`,
                  }}
                >
                  {selectedNews.category}
                </span>
                <span className={styles.typeBadge}>
                  {selectedNews.type === 'latest' ? '✓ Disponible' : '📅 À venir'}
                </span>
                <span className={styles.dateBadge}>
                  {new Date(selectedNews.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <h1 className={styles.newsDetailTitle}>{selectedNews.title}</h1>
              {selectedNews.source && (
                <p className={styles.newsSource}>Source : {selectedNews.source}</p>
              )}
            </div>
            <div className={styles.newsDetailImageContainer}>
              <img
                src={selectedNews.image}
                alt={selectedNews.title}
                className={styles.newsDetailImage}
              />
              <div className={styles.imageOverlay}></div>
            </div>
            <div className={styles.newsDetailContent}>
              <p className={styles.newsDetailText}>{selectedNews.content}</p>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.backgroundEffects}>
        <div className={styles.gradientOrb}></div>
        <div className={styles.noiseOverlay}></div>
      </div>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerBadge}>
            <span className={styles.badgeDot}></span>
            Actualités TCG
          </div>
          <h1 className={styles.title}>Actualités</h1>
          <div className={styles.divider}></div>
          <p className={styles.description}>
            Restez informé des dernières sorties et des prochaines nouveautés de tous les jeux de
            cartes à collectionner
          </p>
        </header>

        <div className={styles.filtersContainer}>
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Univers</span>
            <div className={styles.filterPills}>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`${styles.filterPill} ${selectedCategory === 'all' ? styles.active : ''}`}
              >
                Tous
              </button>
              {allCategories.map((cat) => {
                const colors = categoryColors[cat];
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`${styles.filterPill} ${isActive ? styles.active : ''}`}
                    style={
                      isActive
                        ? { background: colors.bg, color: colors.text, borderColor: colors.text }
                        : {}
                    }
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Statut</span>
            <div className={styles.filterPills}>
              <button
                onClick={() => setSelectedType('all')}
                className={`${styles.filterPill} ${selectedType === 'all' ? styles.active : ''}`}
              >
                Tous
              </button>
              <button
                onClick={() => setSelectedType('latest')}
                className={`${styles.filterPill} ${selectedType === 'latest' ? styles.active : ''}`}
              >
                ✓ Disponible
              </button>
              <button
                onClick={() => setSelectedType('upcoming')}
                className={`${styles.filterPill} ${selectedType === 'upcoming' ? styles.active : ''}`}
              >
                📅 À venir
              </button>
            </div>
          </div>
        </div>

        <div className={styles.resultsCount}>
          {filteredNews.length} actualité{filteredNews.length > 1 ? 's' : ''}
        </div>

        {filteredNews.length > 0 ? (
          <div className={styles.newsGrid}>
            {filteredNews.map((news, index) => {
              const colors = categoryColors[news.category];
              return (
                <article
                  key={news.id}
                  className={styles.newsCard}
                  onClick={() => handleNewsClick(news)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={styles.cardImageWrapper}>
                    <img src={news.image} alt={news.title} className={styles.cardImage} />
                    <div className={styles.cardImageOverlay}></div>
                    <div className={styles.cardBadges}>
                      <span
                        className={styles.categoryBadge}
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {news.category}
                      </span>
                    </div>
                    <div className={styles.cardDate}>
                      {new Date(news.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTypeBadge} data-type={news.type}>
                      {news.type === 'latest' ? '✓ Disponible' : '📅 À venir'}
                    </div>
                    <h3 className={styles.cardTitle}>{news.title}</h3>
                    <p className={styles.cardExcerpt}>{news.excerpt}</p>
                    <div className={styles.cardFooter}>
                      <span className={styles.readMore}>
                        Lire la suite
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <p className={styles.emptyText}>Aucune actualité trouvée avec ces filtres.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedType('all');
              }}
              className={styles.resetButton}
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
