'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { pageFade } from '@/lib/animations';

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      variants={pageFade}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
