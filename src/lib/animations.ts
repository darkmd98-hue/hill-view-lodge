import type { Variants } from 'framer-motion';

/** Fade in + 24px rise + blur-to-sharp */
export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.7,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

/** Fade up with extra delay — used for elements that should appear after a preceding animation completes */
export const fadeUpDelayed: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.7,
      delay: 0.3,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

/** Stagger for confirmation page — wider spacing so summary card arrives after checkmark settles */
export const confirmationStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.15,
    },
  },
};

/** Orchestrates children stagger (0.15s delay) */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

/** Opacity + slight Y-slide for route transitions */
export const pageFade: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/** Scale-up on hover, scale-down on tap */
export const scaleButton = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.97 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 17 },
};

/** Subtle ring glow + scale on focus */
export const formFieldFocus: Variants = {
  idle: { scale: 1 },
  focused: {
    scale: 1.01,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
};

/** Error message slide-in */
export const errorSlide: Variants = {
  hidden: { opacity: 0, y: -8, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    height: 0,
    transition: { duration: 0.2 },
  },
};

/** Success icon entrance */
export const successPop: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
      delay: 0.1,
    },
  },
};

/** Mobile menu slide */
export const menuSlide: Variants = {
  closed: {
    x: '100%',
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  open: {
    x: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

/** Mobile menu overlay */
export const overlayFade: Variants = {
  closed: {
    opacity: 0,
    transition: { duration: 0.25 },
  },
  open: {
    opacity: 1,
    transition: { duration: 0.25 },
  },
};

/** Menu items stagger */
export const menuItemStagger: Variants = {
  closed: { opacity: 0 },
  open: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.15,
    },
  },
};

export const menuItem: Variants = {
  closed: { opacity: 0, x: 24 },
  open: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};
