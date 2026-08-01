'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Compass, Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabaseClient';
import { fadeUp, staggerContainer } from '@/lib/animations';
import MotionButton from '@/components/MotionButton';

export default function AdventureBookingPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login?redirect=/adventure-booking');
      } else {
        setAuthLoading(false);
      }
    });
  }, [router]);

  if (authLoading) {
    return (
      <div className="min-h-dvh bg-hero-dark flex flex-col items-center justify-center gap-3 text-white/80">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-xs font-semibold tracking-wider font-mono">Authenticating...</p>
      </div>
    );
  }

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
          className="text-slate-200 text-lg sm:text-xl font-normal mb-10 leading-relaxed max-w-md mx-auto"
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
