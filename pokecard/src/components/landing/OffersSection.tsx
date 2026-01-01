/**
 * @deprecated Ce composant est déprécié et n'est plus utilisé dans la landing page.
 * Les offres promotionnelles ont été supprimées pour un positionnement plus haut de gamme.
 * Ce fichier peut être supprimé lors du prochain nettoyage.
 */

import { useNavigate } from 'react-router-dom';
import styles from './OffersSection.module.css';

const offers = [
  {
    icon: '🚚',
    title: 'Livraison Rapide',
    description:
      "Expédition sous 24-48h pour toutes les commandes en stock. Suivi en temps réel de votre colis premium jusqu'à votre domicile.",
    highlight: 'Expédition express',
  },
  {
    icon: '🎁',
    title: 'Emballages Premium',
    description:
      'Protection optimale dans des coffrets élégants. Chaque carte est soigneusement conditionnée pour préserver sa valeur et sa beauté.',
    highlight: 'Présentation soignée',
  },
  {
    icon: '🎧',
    title: 'Service Client Réactif',
    description:
      'Une équipe dédiée à votre écoute 6j/7. Réponse garantie sous 24h pour toutes vos questions et besoins spécifiques.',
    highlight: "Support d'exception",
  },
];

export default function OffersSection() {
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Nos Engagements</h2>
          <p className={styles.subtitle}>Des services premium qui font la différence</p>
          <div className={styles.divider}></div>
        </div>

        <div className={styles.grid}>
          {offers.map((offer, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.iconWrapper}>
                <span className={styles.icon}>{offer.icon}</span>
              </div>

              <div className={styles.badge}>{offer.highlight}</div>

              <h3 className={styles.cardTitle}>{offer.title}</h3>

              <p className={styles.cardDescription}>{offer.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={styles.cta}>
          <button onClick={() => navigate('/produits')} className={styles.ctaButton}>
            Découvrir nos services
            <span className={styles.ctaArrow}>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
