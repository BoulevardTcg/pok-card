import { type ReactNode, useState, useEffect, useMemo } from 'react';
import { LiquidMetal } from '@paper-design/shaders-react';
import styles from './LiquidMetalIconButton.module.css';

interface LiquidMetalIconButtonProps {
  size?: number;
  borderThickness?: number;
  intensity?: 'soft' | 'normal';
  isActive?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  ariaPressed?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function LiquidMetalIconButton({
  size = 40,
  borderThickness = 3,
  intensity = 'soft',
  isActive = false,
  disabled = false,
  ariaLabel,
  ariaPressed,
  onClick,
  children,
  className = '',
}: LiquidMetalIconButtonProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isLowPerf, setIsLowPerf] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const dm =
      'deviceMemory' in navigator
        ? (navigator as { deviceMemory?: number }).deviceMemory
        : undefined;
    const hasLowMemory = typeof dm === 'number' ? dm < 4 : false;

    setIsLowPerf(isMobile && hasLowMemory);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const useFallback = prefersReducedMotion || isLowPerf;

  const shader = useMemo(() => {
    // plus vivant + réaliste, sans rainbow agressif
    if (intensity === 'normal') {
      return {
        colorBack: 'rgba(170,175,185,0.22)',
        colorTint: 'rgba(255,255,255,0.92)',
        repetition: 3.2,
        softness: 0.08,
        shiftRed: 0.1,
        shiftBlue: 0.1,
        distortion: hovered ? 0.55 : 0.42,
        contour: hovered ? 0.7 : 0.58,
        angle: 78,
        scale: 0.82,
        speed: hovered ? 1.35 : 1.05,
      };
    }

    // soft (déjà visible)
    return {
      colorBack: 'rgba(185,190,200,0.20)',
      colorTint: 'rgba(255,255,255,0.90)',
      repetition: 2.7,
      softness: 0.1,
      shiftRed: 0.08,
      shiftBlue: 0.08,
      distortion: hovered ? 0.45 : 0.32,
      contour: hovered ? 0.6 : 0.48,
      angle: 76,
      scale: 0.84,
      speed: hovered ? 1.15 : 0.9,
    };
  }, [intensity, hovered]);

  return (
    <button
      type="button"
      className={`${styles.button} ${isActive ? styles.active : ''} ${className}`}
      style={{ width: size, height: size, '--bt': `${borderThickness}px` } as React.CSSProperties}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Fond intérieur */}
      <span className={styles.innerBackground} />

      {/* Ring shader ou fallback */}
      {useFallback ? (
        <span className={styles.fallbackRing} aria-hidden="true" />
      ) : (
        <span className={styles.shaderRing} aria-hidden="true">
          <LiquidMetal
            className={styles.shaderCanvas}
            colorBack={shader.colorBack}
            colorTint={shader.colorTint}
            distortion={shader.distortion}
            speed={shader.speed}
            minPixelRatio={1}
            maxPixelCount={120000}
          />
        </span>
      )}

      {/* Icône */}
      <span className={styles.iconWrapper}>{children}</span>
    </button>
  );
}

export default LiquidMetalIconButton;
