/**
 * @deprecated Ce composant est déprécié et n'est plus utilisé dans la landing page.
 * Ce fichier peut être supprimé lors du prochain nettoyage.
 */

import styles from './ClientLogos.module.css';

export default function ClientLogos() {
  const logos = [
    { name: 'Partenaire Premium', label: 'Premium' },
    { name: 'Certification Qualité', label: 'Qualité' },
    { name: 'Marque Reconnue', label: 'Reconnue' },
    { name: 'Expertise TCG', label: 'Expertise' },
    { name: 'Service Certifié', label: 'Service' },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <p className={styles.label}>Reconnu par les meilleurs</p>

        <div className={styles.logosGrid}>
          {logos.map((logo, index) => (
            <div key={index} className={styles.logoItem}>
              <div className={styles.logoText}>{logo.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
