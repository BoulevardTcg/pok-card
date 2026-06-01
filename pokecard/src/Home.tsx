/* ===================================================================
   HOME — Landing Page BoulevardTCG
   Design équilibré : Premium + Passion Collectionneur
   =================================================================== */

import NavbarGlass from './components/navbar/NavbarGlass';
import HeroSection from './components/landing/HeroSection';
import TrustSignals from './components/landing/TrustSignals';
import FeaturedCards from './components/landing/FeaturedCards';
import NewReleases from './components/landing/NewReleases';
import ProcessSection from './components/landing/ProcessSection';
import FinalCTA from './components/landing/FinalCTA';
import FooterPremium from './components/landing/FooterPremium';
import { Seo } from './components/Seo';
import { SITE_URL, SITE_NAME, absoluteUrl } from './lib/site';

const homeJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/favicon.png'),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/produits?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
];

export function Home() {
  return (
    <>
      <Seo
        title="Cartes à collectionner & produits scellés"
        description="BoulevardTCG, votre boutique TCG par des passionnés : produits scellés et cartes à collectionner Pokémon, One Piece, Magic, Yu-Gi-Oh! et Lorcana."
        canonical="/"
        jsonLd={homeJsonLd}
      />
      <NavbarGlass />
      <main>
        {/* Hero — Accroche émotionnelle + rotation de cartes */}
        <HeroSection />

        {/* Trust — Chiffres clés pour rassurer */}
        <TrustSignals />

        {/* Produits phares — Produits scellés */}
        <FeaturedCards />

        {/* Nouvelles sorties — Pour les chasseurs de boosters */}
        <NewReleases />

        {/* Process — Authentification, certification, livraison */}
        <ProcessSection />

        {/* CTA Final */}
        <FinalCTA />
      </main>
      <FooterPremium />
    </>
  );
}
