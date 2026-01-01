/**
 * @deprecated Ce composant est déprécié et n'est plus utilisé dans la landing page.
 * Les témoignages ont été remplacés par des données factuelles (TrustSignals).
 * Ce fichier peut être supprimé lors du prochain nettoyage.
 */

import styles from './TestimonialsSection.module.css';

const testimonials = [
  {
    name: 'Alexandre M.',
    role: 'Collectionneur Premium',
    content:
      'BoulevardTCG a transformé ma façon de collectionner. La qualité est au rendez-vous, le service irréprochable. Une référence absolue.',
    rating: 5,
  },
  {
    name: 'Sophie L.',
    role: 'Passionnée de TCG',
    content:
      "Enfin une boutique qui comprend les collectionneurs exigeants. Les emballages sont soignés, l'authentification garantie. Parfait !",
    rating: 5,
  },
  {
    name: 'Thomas R.',
    role: 'Investisseur TCG',
    content:
      'Professionnalisme et expertise remarquables. BoulevardTCG est devenu mon partenaire de confiance pour mes acquisitions premium.',
    rating: 5,
  },
  {
    name: 'Camille D.',
    role: 'Nouvelle Collectionneuse',
    content:
      "Accompagnement parfait pour mes premiers achats. L'équipe est patiente, pédagogue et toujours disponible. Je recommande !",
    rating: 5,
  },
  {
    name: 'Marc P.',
    role: 'Expert TCG',
    content:
      'La sélection de BoulevardTCG est exceptionnelle. Chaque carte est vérifiée, chaque collection soigneusement choisie. Excellence !',
    rating: 5,
  },
  {
    name: 'Julie B.',
    role: 'Acheteuse Occasionnelle',
    content:
      "Livraison rapide, emballage soigné, communication parfaite. Une expérience d'achat premium du début à la fin. Bravo !",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Ils ont choisi BoulevardTCG</h2>
          <p className={styles.subtitle}>Découvrez ce que nos clients disent de leur expérience</p>
          <div className={styles.divider}></div>
        </div>

        <div className={styles.grid}>
          {testimonials.map((testimonial, index) => (
            <div key={index} className={styles.card}>
              {/* Étoiles */}
              <div className={styles.stars}>
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className={styles.star}>
                    ⭐
                  </span>
                ))}
              </div>

              {/* Contenu */}
              <p className={styles.content}>"{testimonial.content}"</p>

              {/* Auteur */}
              <div className={styles.author}>
                {/* Portrait rond avec glow champagne */}
                <div className={styles.avatar}>
                  <div className={styles.avatarInner}>
                    <span className={styles.avatarInitials}>
                      {testimonial.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </span>
                  </div>
                  <div className={styles.avatarGlow}></div>
                </div>

                <div className={styles.authorInfo}>
                  <div className={styles.authorName}>{testimonial.name}</div>
                  <div className={styles.authorRole}>{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
