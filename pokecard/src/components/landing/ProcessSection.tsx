import { useRef, useEffect, useState, useCallback } from 'react';
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
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const calculateProgress = useCallback(() => {
    if (!sectionRef.current || !stepsRef.current) return;

    const stepsContainer = stepsRef.current;
    const stepElements = stepsContainer.querySelectorAll('[data-step]');
    
    if (stepElements.length === 0) return;

    const viewportHeight = window.innerHeight;
    const triggerPoint = viewportHeight * 0.5; // Point de déclenchement au milieu de l'écran

    // Calculer la progression globale basée sur les positions des étapes
    let currentStep = 0;
    let stepProgress = 0;

    stepElements.forEach((step, index) => {
      const rect = step.getBoundingClientRect();
      const stepCenter = rect.top + rect.height / 2;
      
      if (stepCenter <= triggerPoint) {
        currentStep = index;
        // Calculer la progression vers l'étape suivante
        if (index < stepElements.length - 1) {
          const nextStep = stepElements[index + 1];
          const nextRect = nextStep.getBoundingClientRect();
          const nextCenter = nextRect.top + nextRect.height / 2;
          const distance = nextCenter - stepCenter;
          const traveled = triggerPoint - stepCenter;
          stepProgress = Math.min(1, Math.max(0, traveled / distance));
        } else {
          stepProgress = 1;
        }
      }
    });

    // Calculer la progression totale (0 à 100%)
    const totalProgress = ((currentStep + stepProgress) / (PROCESS_STEPS.length - 1)) * 100;
    
    setActiveStep(currentStep);
    setProgress(Math.min(100, Math.max(0, totalProgress)));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Annuler le frame précédent pour éviter les accumulations
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      rafRef.current = requestAnimationFrame(calculateProgress);
    };

    // Calcul initial
    calculateProgress();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [calculateProgress]);

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
                style={{ height: `${progress}%` }}
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
          <div ref={stepsRef} className={styles.steps}>
            {PROCESS_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= activeStep;
              const isCurrent = index === activeStep;
              return (
                <div
                  key={step.number}
                  data-step={index}
                  className={`${styles.step} ${isActive ? styles.active : ''} ${isCurrent ? styles.current : ''}`}
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
