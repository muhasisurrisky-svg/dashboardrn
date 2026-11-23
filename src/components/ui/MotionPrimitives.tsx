import React from 'react';
import { motion, type HTMLMotionProps, type Variants } from 'motion/react';

export const DASHBOARD_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Top-level page/tab wrapper variants that cascade sections smoothly
 * when switching tabs, changing unit/year, or loading fresh data.
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.14,
      ease: 'easeIn',
    },
  },
};

/**
 * Nested grid/row container (KPI rows, multi-column chart rows)
 * so sibling cards inside a row stagger sequentially into view.
 */
export const staggerGroupVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.01,
    },
  },
};

/**
 * Standard GPU-composited card/chart entrance (opacity + subtle translateY).
 * Avoids width/height/scale transforms on Chart.js wrappers so ResizeObserver stays calm.
 */
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: DASHBOARD_EASE,
    },
  },
};

export const MotionStaggerGrid: React.FC<HTMLMotionProps<'div'>> = ({
  children,
  className = '',
  ...rest
}) => (
  <motion.div variants={staggerGroupVariants} className={className} {...rest}>
    {children}
  </motion.div>
);

export const MotionCard: React.FC<HTMLMotionProps<'div'>> = ({
  children,
  className = '',
  ...rest
}) => (
  <motion.div variants={staggerItemVariants} className={className} {...rest}>
    {children}
  </motion.div>
);

interface MotionFillBarProps {
  pct: number;
  color: string;
  className?: string;
  delay?: number;
}

export const MotionFillBar: React.FC<MotionFillBarProps> = ({
  pct,
  color,
  className = 'h-full rounded-full',
  delay = 0.14,
}) => {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <motion.div
      className={className}
      style={{
        width: `${clamped}%`,
        backgroundColor: color,
        transformOrigin: 'left center',
      }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.62, ease: DASHBOARD_EASE, delay }}
    />
  );
};
