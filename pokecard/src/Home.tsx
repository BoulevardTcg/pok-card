/* ===================================================================
   HOME — Landing Page BoulevardTCG
   Design équilibré : Premium + Passion Collectionneur
   =================================================================== */

import NavbarPremium from './components/landing/NavbarPremium';
import HeroSection from './components/landing/HeroSection';
import ShopSection from './components/landing/ShopSection';
import TrustSignals from './components/landing/TrustSignals';
import FeaturedCards from './components/landing/FeaturedCards';
import NewReleases from './components/landing/NewReleases';
import ProcessSection from './components/landing/ProcessSection';
import FinalCTA from './components/landing/FinalCTA';
import FooterPremium from './components/landing/FooterPremium';

export function Home() {
  return (
    <>
      <NavbarPremium />
      <main>
        {/* Hero — Accroche émotionnelle + rotation de cartes */}
        <HeroSection />

        {/* Shop — Section boutique avec tous les produits */}
        <ShopSection />

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
