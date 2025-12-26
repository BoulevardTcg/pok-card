/**
 * @deprecated Ce composant est déprécié et n'est plus utilisé dans la landing page.
 * La landing page utilise désormais : TrustSignals, FeaturedCards, ProcessSection
 * Ce fichier peut être supprimé lors du prochain nettoyage.
 */

import styles from './BenefitsSection.module.css';

const benefits = [
  {
    icon: '🛡️',
    title: 'Confiance Absolue',
    description:
      'Authentification garantie, sourcing vérifié. Chaque carte est authentifiée par nos experts pour vous garantir une qualité irréprochable.',
  },
  {
    icon: '🏆',
    title: 'Excellence Premium',
    description:
      'Sélection rigoureuse des meilleures collections. Nous ne proposons que le meilleur du marché TCG, trié sur le volet pour les collectionneurs exigeants.',
  },
  {
    icon: '✨',
    title: 'Expérience Luxe',
    description:
      "Emballages soignés, livraison soignée, service client d'exception. BoulevardTCG transforme chaque achat en moment privilégié.",
  },
  {
    icon: '❤️',
    title: 'Passion Partagée',
    description:
      "Une équipe de passionnés à votre écoute. Nous comprenons votre passion et partageons votre quête de l'excellence.",
  },
];

export default function BenefitsSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Pourquoi choisir BoulevardTCG ?</h2>
          <div className={styles.divider}></div>
        </div>

        <div className={styles.grid}>
          {benefits.map((benefit, index) => (
            <div key={index} className={styles.card}>
              {/* Icône Art Déco dorée */}
              <div className={styles.iconWrapper}>
                <span className={styles.icon}>{benefit.icon}</span>
              </div>

              <h3 className={styles.cardTitle}>{benefit.title}</h3>

              <p className={styles.cardDescription}>{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
