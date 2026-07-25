'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_LINKS } from '@/lib/types';
import {
  menuSlide,
  overlayFade,
  menuItemStagger,
  menuItem,
} from '@/lib/animations';
import MotionButton from './MotionButton';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            variants={overlayFade}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-in Panel */}
          <motion.nav
            variants={menuSlide}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed top-0 right-0 bottom-0 z-50 w-[280px] bg-hero-dark border-l border-white/10 flex flex-col md:hidden"
            aria-label="Mobile navigation"
          >
            {/* Close Button */}
            <div className="flex justify-end p-5">
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors p-2"
                aria-label="Close menu"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Links */}
            <motion.ul
              variants={menuItemStagger}
              initial="closed"
              animate="open"
              className="flex flex-col gap-1 px-5 flex-1"
            >
              {NAV_LINKS.map((link) => (
                <motion.li key={link.href} variants={menuItem}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={`block py-3 px-4 rounded-xl text-lg font-medium transition-colors ${
                      pathname === link.href
                        ? 'text-white bg-white/10'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>

            {/* Book Now CTA */}
            <motion.div
              variants={menuItem}
              className="p-5 border-t border-white/10"
            >
              <MotionButton
                href="/rooms-booking"
                variant="primary"
                size="md"
                className="w-full"
              >
                Book Now
              </MotionButton>
            </motion.div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
