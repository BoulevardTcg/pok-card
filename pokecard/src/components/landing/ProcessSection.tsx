import { useRef, useEffect, useState } from 'react';
import { ShieldCheckIcon, CertificateIcon, PackageIcon } from '../icons/Icons';
import styles from './ProcessSection.module.css';

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Authentification',
    description: 'Chaque carte passe par un processus de vérification rigoureux. Nos experts analysent l\'authenticité, l\'état et l\'origine de chaque pièce.',
    icon: ShieldCheckIcon,
  },
  {
    number: '02',
    title: 'Certification',
    description: 'Les cartes sont envoyées aux laboratoires de grading reconnus (PSA, CGC, BGS) pour obtenir une certification officielle et un grade objectif.',
    icon: CertificateIcon,
  },
  {
    number: '03',
    title: 'Livraison sécurisée',
    description: 'Emballage protecteur premium, assurance complète et suivi en temps réel. Votre investissement arrive dans un état parfait.',
    icon: PackageIcon,
  },
];

export default function ProcessSection() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepIndex = parseInt(entry.target.getAttribute('data-step') || '0');
            setActiveStep(stepIndex);
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-20% 0px -20% 0px',
      }
    );

    const steps = sectionRef.current?.querySelectorAll('[data-step]');
    steps?.forEach((step) => observer.observe(step));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.overline}>Notre processus</span>
          <h2 className={styles.title}>
            De l'authentification<br />à votre collection
          </h2>
        </div>

        {/* Process Steps */}
        <div className={styles.processGrid}>
          {/* Timeline */}
          <div className={styles.timeline}>
            <div className={styles.timelineLine}>
              <div 
                className={styles.timelineProgress}
                style={{ height: `${((activeStep + 1) / PROCESS_STEPS.length) * 100}%` }}
              />
            </div>
            {PROCESS_STEPS.map((step, index) => (
              <div
                key={step.number}
                className={`${styles.timelineDot} ${index <= activeStep ? styles.active : ''}`}
              />
            ))}
          </div>

          {/* Steps */}
          <div className={styles.steps}>
            {PROCESS_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  data-step={index}
                  className={`${styles.step} ${index === activeStep ? styles.active : ''}`}
                >
                  <div className={styles.stepIcon}>
                    <Icon size={24} strokeWidth={1.5} />
                  </div>
                  <div className={styles.stepContent}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepDescription}>{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
