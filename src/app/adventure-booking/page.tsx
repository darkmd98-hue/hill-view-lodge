'use client';

import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';
import { fadeUp, staggerContainer } from '@/lib/animations';
import MotionButton from '@/components/MotionButton';

export default function AdventureBookingPage() {
  return (
    <main className="min-h-dvh bg-hero-dark flex items-center justify-center px-5">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="text-center max-w-lg"
      >
        {/* Icon */}
        <motion.div variants={fadeUp} className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Compass className="w-10 h-10 text-accent" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={fadeUp}
          className="font-display italic text-4xl sm:text-5xl font-bold text-white mb-4"
        >
          Coming Soon
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={fadeUp}
          className="text-white/60 text-lg mb-10 leading-relaxed"
        >
          Our adventure experiences are being curated. Stay tuned for exciting
          outdoor activities, guided treks, and unforgettable experiences across
          the hills.
        </motion.p>

        {/* CTA */}
        <motion.div variants={fadeUp}>
          <MotionButton href="/" variant="primary" size="md">
            Back to Home
          </MotionButton>
        </motion.div>
      </motion.div>
    </main>
  );
}
