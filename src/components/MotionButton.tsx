'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import Link from 'next/link';
import { scaleButton } from '@/lib/animations';

type MotionButtonProps = {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  children: React.ReactNode;
  className?: string;
} & Omit<HTMLMotionProps<'button'>, 'children' | 'className'>;

export default function MotionButton({
  variant = 'primary',
  size = 'md',
  href,
  children,
  className = '',
  ...props
}: MotionButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-full transition-colors duration-200 cursor-pointer';

  const variantStyles = {
    primary:
      'bg-accent text-white hover:bg-accent-hover font-bold shadow-xl shadow-accent/30 tracking-wide border border-accent/40',
    secondary:
      'bg-white/15 text-white border border-white/40 hover:bg-white/30 backdrop-blur-md font-semibold',
    outline:
      'bg-transparent text-accent border-2 border-accent hover:bg-accent hover:text-white font-bold',
  };

  const sizeStyles = {
    sm: 'px-5 py-2.5 text-sm gap-1.5',
    md: 'px-7 py-3 text-base gap-2',
    lg: 'px-9 py-4 text-lg gap-2.5',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (href) {
    return (
      <motion.div
        whileHover={scaleButton.whileHover}
        whileTap={scaleButton.whileTap}
        transition={scaleButton.transition}
      >
        <Link href={href} className={combinedClassName}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={scaleButton.whileHover}
      whileTap={scaleButton.whileTap}
      transition={scaleButton.transition}
      className={combinedClassName}
      {...props}
    >
      {children}
    </motion.button>
  );
}
