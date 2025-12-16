/* ===================================================================
   HOME — Landing Page BoulevardTCG
   Design équilibré : Premium + Passion Collectionneur
   =================================================================== */

import NavbarPremium from './components/landing/NavbarPremium';
import HeroSection from './components/landing/HeroSection';
import TrustSignals from './components/landing/TrustSignals';
import FeaturedCards from './components/landing/FeaturedCards';
import NewReleases from './components/landing/NewReleases';
import ProcessSection from './components/landing/ProcessSection';
import CollectionHighlight from './components/landing/CollectionHighlight';
import FinalCTA from './components/landing/FinalCTA';
import FooterPremium from './components/landing/FooterPremium';

export function Home() {
  return (
    <>
      <NavbarPremium />
      <main>
        {/* Hero — Accroche émotionnelle + rotation de cartes */}
        <HeroSection />
        
        {/* Trust — Chiffres clés pour rassurer */}
        <TrustSignals />
        
        {/* Pépites — Mix cartes gradées + produits scellés */}
        <FeaturedCards />
        
        {/* Nouvelles sorties — Pour les chasseurs de boosters */}
        <NewReleases />
        
        {/* Explorer — Collections par univers (Pokémon/One Piece) */}
        <CollectionHighlight />
        
        {/* Process — Authentification, certification, livraison */}
        <ProcessSection />
        
        {/* CTA Final */}
        <FinalCTA />
      </main>
      <FooterPremium />
    </>
  );
}
