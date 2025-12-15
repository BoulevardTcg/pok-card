import { useNavigate } from 'react-router-dom';
import styles from './ProcessSection.module.css';

const steps = [
  {
    number: '01',
    icon: '🔍',
    title: 'Explorez le Boulevard',
    description: 'Parcourez nos collections soigneusement sélectionnées. Filtrez par univers, rareté ou budget pour trouver votre prochaine pépite.',
  },
  {
    number: '02',
    icon: '🛒',
    title: 'Choisissez vos produits',
    description: 'Sélectionnez vos cartes favorites en toute sérénité. Photos haute définition, descriptions détaillées, tout est pensé pour votre confiance.',
  },
  {
    number: '03',
    icon: '📦',
    title: 'Recevez-les avec style',
    description: 'Emballage premium, protection optimale, livraison rapide et suivie. Chaque commande est préparée avec le plus grand soin.',
  },
];

export default function ProcessSection() {
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Comment ça marche
          </h2>
          <p className={styles.subtitle}>
            Un processus simple et élégant pour une expérience d'achat exceptionnelle
          </p>
          <div className={styles.divider}></div>
        </div>

        <div className={styles.grid}>
          {steps.map((step, index) => (
            <div
              key={index}
              className={styles.step}
            >
              {/* Numéro */}
              <div className={styles.stepNumber}>
                {step.number}
              </div>

              {/* Icône */}
              <div className={styles.stepIconWrapper}>
                <div className={styles.stepIcon}>
                  <span className={styles.iconEmoji}>{step.icon}</span>
                </div>
              </div>

              {/* Contenu */}
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  {step.title}
                </h3>
                <p className={styles.stepDescription}>
                  {step.description}
                </p>
              </div>

              {/* Ligne de connexion (sauf dernier) */}
              {index < steps.length - 1 && (
                <div className={styles.connector}></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

