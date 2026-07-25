'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Loader2, ArrowUpRight } from 'lucide-react';
import { getSupabase } from '@/lib/supabaseClient';
import { fadeUp, staggerContainer, scaleButton } from '@/lib/animations';

export default function ContactPage() {
  const [gmapLink, setGmapLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch public site setting link
  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('site_settings')
          .select('gmap_link')
          .limit(1);

        if (!error && data && data.length > 0) {
          setGmapLink(data[0].gmap_link);
        }
      } catch (err) {
        console.error('Failed to load site settings coordinates:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const fallbackMapLink = 'https://maps.google.com/?q=Sringeri';

  return (
    <main className="min-h-dvh bg-surface text-text-primary py-24 sm:py-28 px-5 flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto space-y-12">
        
        {/* Header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="text-center max-w-xl mx-auto space-y-4"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider">
            <span>👋</span> Contact Us
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="font-display italic text-4xl sm:text-5xl font-bold tracking-tight"
          >
            Get in Touch
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-text-muted text-sm sm:text-base font-light leading-relaxed"
          >
            Have questions about bookings, amenities, or route coordinates? Our team is here to assist you.
          </motion.p>
        </motion.div>

        {/* Contact Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Phones Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Phone className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display italic text-xl font-bold">Call Property Care</h2>
                <p className="text-text-muted text-xs">Reach out directly to arrange confirmation details or query availability.</p>
              </div>
            </div>

            <div className="space-y-3 mt-6 pt-4 border-t border-black/5">
              <a
                href="tel:8050153736"
                className="flex items-center justify-between p-3 rounded-2xl bg-[#f7f4ef]/60 hover:bg-[#f7f4ef] border border-black/5 transition-colors font-mono text-sm font-semibold"
              >
                <span>8050153736</span>
                <span className="text-xs uppercase text-accent font-sans font-bold">Call Now</span>
              </a>
              <a
                href="tel:8618160939"
                className="flex items-center justify-between p-3 rounded-2xl bg-[#f7f4ef]/60 hover:bg-[#f7f4ef] border border-black/5 transition-colors font-mono text-sm font-semibold"
              >
                <span>8618160939</span>
                <span className="text-xs uppercase text-accent font-sans font-bold">Call Now</span>
              </a>
            </div>
          </motion.div>

          {/* Email & Location Link Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Mail className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display italic text-xl font-bold">Electronic Mail</h2>
                <p className="text-text-muted text-xs">Send detailed letters or booking queries to our mailbox.</p>
              </div>
            </div>

            <div className="space-y-3 mt-6 pt-4 border-t border-black/5 flex-1 flex flex-col justify-end">
              <a
                href="mailto:hillviewsringeri@gmail.com"
                className="flex items-center justify-between p-3 rounded-2xl bg-[#f7f4ef]/60 hover:bg-[#f7f4ef] border border-black/5 transition-colors font-mono text-sm font-semibold"
              >
                <span className="truncate pr-4">hillviewsringeri@gmail.com</span>
                <span className="text-xs uppercase text-accent font-sans font-bold">Mail Us</span>
              </a>
            </div>
          </motion.div>

        </div>

        {/* Location Section */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="bg-white p-6 sm:p-8 rounded-3xl border border-black/5 shadow-xs space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display italic text-xl font-bold">Property Location</h2>
                <p className="text-text-muted text-xs">Navigate your way to the serene heights of Hill View.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                Loading map coords...
              </div>
            ) : (
              <motion.a
                href={gmapLink || fallbackMapLink}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={scaleButton.whileHover}
                whileTap={scaleButton.whileTap}
                transition={scaleButton.transition}
                className="inline-flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-accent/20 transition-all cursor-pointer w-full sm:w-auto"
              >
                Get Directions
                <ArrowUpRight className="w-3.5 h-3.5" />
              </motion.a>
            )}
          </div>
        </motion.div>

      </div>
    </main>
  );
}
