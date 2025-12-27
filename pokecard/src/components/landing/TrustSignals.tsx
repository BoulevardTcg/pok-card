import { useEffect, useState, useRef } from 'react';
import styles from './TrustSignals.module.css';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

const STATS: StatItem[] = [
  { value: 30, suffix: '', label: 'Produits disponibles' },
  { value: 100, suffix: '+', label: 'Commandes honorées' },
  { value: 5, suffix: '', label: 'Univers TCG' },
  { value: 100, suffix: '%', label: 'Authenticité garantie' },
];

function AnimatedNumber({
  value,
  suffix,
  duration = 2000,
}: {
  value: number;
  suffix: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const isDecimal = value % 1 !== 0;

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = value * easeOutQuart;

            setDisplayValue(
              isDecimal ? parseFloat(currentValue.toFixed(1)) : Math.floor(currentValue)
            );

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  const formatValue = (val: number) => {
    if (val >= 1000) {
      return val.toLocaleString('fr-FR');
    }
    return val.toString();
  };

  return (
    <span ref={ref} className={styles.statValue}>
      {formatValue(displayValue)}
      {suffix}
    </span>
  );
}

export default function TrustSignals() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.statsGrid}>
          {STATS.map((stat, index) => (
            <div key={index} className={styles.statItem}>
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
