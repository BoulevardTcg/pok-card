import React, { useEffect, useRef } from 'react';
import { HoloCard } from '../HoloCard';
import type { TradeCard } from '../HoloCard';

interface ScrollProtectedCardProps {
  card: TradeCard;
  foilMap?: Map<string, string> | null;
}

/**
 * Composant wrapper qui protège les cartes 3D des transformations non désirées lors du scroll
 * Empêche le zoom et les changements d'échelle des cartes pendant le défilement de la page
 */
export function ScrollProtectedCard({ card, foilMap }: ScrollProtectedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    // Fonction pour empêcher les transformations non désirées lors du scroll
    const preventScrollTransform = () => {
      const cardContainer = cardElement.querySelector('.card') as HTMLElement;
      if (cardContainer && !cardContainer.classList.contains('active')) {
        // Forcer les valeurs par défaut pour les cartes non actives
        const style = cardContainer.style as any;
        style.setProperty('--card-scale', '1');
        style.setProperty('--translate-x', '0px');
        style.setProperty('--translate-y', '0px');
        style.setProperty('--rotate-x', '0deg');
        style.setProperty('--rotate-y', '0deg');
      }
    };

    // Écouter le scroll avec throttling pour de meilleures performances
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          preventScrollTransform();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Ajouter l'écouteur d'événement
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Nettoyer l'écouteur
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div ref={cardRef}>
      <HoloCard card={card} foilMap={foilMap} />
    </div>
  );
}
