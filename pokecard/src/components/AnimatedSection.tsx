import { motion } from 'framer-motion';
import { useInView } from '../hooks/useInView';
import type { ReactNode } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  animation?: 'fadeUp' | 'fadeIn' | 'slideLeft' | 'slideRight' | 'scale' | 'stagger';
}

const animations = {
  fadeUp: {
    hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
  },
  fadeIn: {
    hidden: { opacity: 0, filter: 'blur(4px)' },
    visible: { opacity: 1, filter: 'blur(0px)' },
  },
  slideLeft: {
    hidden: { opacity: 0, x: -20, filter: 'blur(6px)' },
    visible: { opacity: 1, x: 0, filter: 'blur(0px)' },
  },
  slideRight: {
    hidden: { opacity: 0, x: 20, filter: 'blur(6px)' },
    visible: { opacity: 1, x: 0, filter: 'blur(0px)' },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.95, filter: 'blur(4px)' },
    visible: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  },
  stagger: {
    hidden: { opacity: 0, y: 10, filter: 'blur(3px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
  },
};

export function AnimatedSection({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
  animation = 'fadeUp',
}: AnimatedSectionProps) {
  const [ref, isInView] = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={animations[animation]}
      transition={{
        duration: duration * 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}
