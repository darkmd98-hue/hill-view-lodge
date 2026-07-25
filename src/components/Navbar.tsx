'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_LINKS } from '@/lib/types';
import MotionButton from './MotionButton';
import MobileMenu from './MobileMenu';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isLightPage = pathname === '/rooms-booking' || pathname.startsWith('/rooms-booking/');

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 40);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const textColorClass = isLightPage && !scrolled ? 'text-text-primary' : 'text-white';
  const hamburgerBgClass = isLightPage && !scrolled ? 'hover:bg-black/5 text-text-primary' : 'hover:bg-white/10 text-white';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
          scrolled ? 'glass py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between">
          {/* Wordmark */}
          <Link
            href="/"
            className={`font-display italic text-xl md:text-2xl font-semibold tracking-tight hover:opacity-80 transition-all ${textColorClass}`}
          >
            Hill View
          </Link>

          {/* Desktop Nav Pill */}
          <nav className="hidden md:block" aria-label="Main navigation">
            <div className="nav-pill flex items-center gap-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={pathname === link.href ? 'active' : ''}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Desktop Book Now */}
          <div className="hidden md:block">
            <MotionButton href="/rooms-booking" variant="primary" size="sm">
              Book Now
            </MotionButton>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className={`md:hidden p-2 rounded-lg transition-colors ${hamburgerBgClass}`}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
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
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
