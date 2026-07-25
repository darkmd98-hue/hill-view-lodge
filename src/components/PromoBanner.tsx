'use client';

import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/animations';

export default function PromoBanner() {
  return (
    <motion.div variants={fadeUp} className="promo-banner">
      <span>🏔️</span>
      <span>Monsoon Special — 20% off all rooms this season</span>
    </motion.div>
  );
}
