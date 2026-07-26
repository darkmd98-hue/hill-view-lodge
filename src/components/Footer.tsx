'use client';

import Link from 'next/link';
import { Mountain, Mail, Phone, MapPin } from 'lucide-react';
import { NAV_LINKS } from '@/lib/types';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-hero-dark text-white border-t border-white/5 py-16 px-5 sm:px-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-16">
        
        {/* Brand Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-accent">
            <Mountain className="w-6 h-6" />
            <span className="font-display italic text-xl font-bold tracking-wider">Hill View</span>
          </div>
          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            Escape to the serene heights of Hill View. Wake up above the clouds and experience a luxury boutique hillside retreat surrounded by pristine nature.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h3 className="font-display italic text-lg font-bold text-accent">Quick Links</h3>
          <ul className="space-y-2.5 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-white/60 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/profile"
                className="text-white/60 hover:text-white transition-colors duration-200"
              >
                Profile Dashboard
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="font-display italic text-lg font-bold text-accent">Contact Details</h3>
          <ul className="space-y-3.5 text-sm text-white/60">
            <li className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>Hill View Lodge, Sringeri Road, Koppa, Karnataka, India</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-accent shrink-0" />
              <span>+91 94812 73000</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-accent shrink-0" />
              <span>care@hillviewlodge.com</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Copyright Bar */}
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/40">
        <p>© {currentYear} Hill View Lodge. All rights reserved.</p>
        <p className="italic">Crafted with care in the Western Ghats.</p>
      </div>
    </footer>
  );
}
