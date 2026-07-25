'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { fadeUp, staggerContainer } from '@/lib/animations';
import MotionButton from './MotionButton';
import SpotlightReveal from './SpotlightReveal';
import PromoBanner from './PromoBanner';

export default function HeroSection() {
  return (
    <section className="relative w-full h-dvh overflow-hidden bg-hero-dark">
      {/* Base Layer — Ken Burns Background */}
      <div className="absolute inset-0 z-0 animate-ken-burns">
        <Image
          src="/images/hero-exterior.png"
          alt="Hill View lodge exterior at golden hour"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </div>

      {/* Spotlight Reveal Layer */}
      <SpotlightReveal />

      {/* Dark Overlay for text readability */}
      <div
        className="absolute inset-0 z-[2] bg-gradient-to-b from-hero-dark-80 via-hero-dark-60 to-hero-dark-80"
        aria-hidden="true"
      />

      {/* Content Layer */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-[3] flex flex-col items-center justify-center h-full text-center px-5"
      >
        {/* Promo Banner */}
        <PromoBanner />

        {/* Lodge Name */}
        <motion.h1
          variants={fadeUp}
          className="font-display italic text-white mt-8 mb-4 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight"
        >
          Hill
          <br />
          <span className="text-accent">View</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          variants={fadeUp}
          className="text-white/70 text-lg sm:text-xl md:text-2xl font-light max-w-2xl mb-10 leading-relaxed"
        >
          Wake up above the clouds — your peaceful hillside escape
          awaits.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <MotionButton href="/rooms-booking" variant="primary" size="lg">
            Rooms Booking
          </MotionButton>
          <MotionButton href="/adventure-booking" variant="secondary" size="lg">
            Adventure Booking
          </MotionButton>
        </motion.div>

        {/* Scroll Hint */}
        <motion.div
          variants={fadeUp}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          aria-hidden="true"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
            <motion.div
              className="w-1 h-2.5 bg-white/60 rounded-full"
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
