import NavbarPremium from './components/landing/NavbarPremium';
import HeroSection from './components/landing/HeroSection';
import ClientLogos from './components/landing/ClientLogos';
import LatestProductsCarousel from './components/landing/LatestProductsCarousel';
import NewsSection from './components/landing/NewsSection';
import BenefitsSection from './components/landing/BenefitsSection';
import ProcessSection from './components/landing/ProcessSection';
import OffersSection from './components/landing/OffersSection';
import TestimonialsSection from './components/landing/TestimonialsSection';
import FAQSection from './components/landing/FAQSection';
import FinalCTA from './components/landing/FinalCTA';
import FooterPremium from './components/landing/FooterPremium';

export function Home() {
  return (
    <>
      <NavbarPremium />
      <HeroSection />
      <ClientLogos />
      <LatestProductsCarousel />
      <NewsSection />
      <BenefitsSection />
      <ProcessSection />
      <OffersSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTA />
      <FooterPremium />
    </>
  );
}
