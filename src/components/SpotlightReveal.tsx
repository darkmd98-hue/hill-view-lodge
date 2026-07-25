'use client';

import { useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

export default function SpotlightReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const mousePos = useRef({ x: -9999, y: -9999 });

  const updateMask = useCallback(() => {
    if (containerRef.current) {
      const { x, y } = mousePos.current;
      containerRef.current.style.maskImage = `radial-gradient(circle 200px at ${x}px ${y}px, black 0%, transparent 100%)`;
      containerRef.current.style.webkitMaskImage = `radial-gradient(circle 200px at ${x}px ${y}px, black 0%, transparent 100%)`;
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        mousePos.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updateMask);
      }
    },
    [updateMask]
  );

  const handleMouseLeave = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.style.maskImage =
        'radial-gradient(circle 200px at -9999px -9999px, black 0%, transparent 100%)';
      containerRef.current.style.webkitMaskImage =
        'radial-gradient(circle 200px at -9999px -9999px, black 0%, transparent 100%)';
    }
  }, []);

  useEffect(() => {
    // Skip effect on touch devices
    const isTouchDevice =
      'ontouchstart' in window ||
      window.matchMedia('(pointer: coarse)').matches;

    if (isTouchDevice) return;

    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    parent.addEventListener('mousemove', handleMouseMove);
    parent.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[1] pointer-events-none"
      style={{
        maskImage:
          'radial-gradient(circle 200px at -9999px -9999px, black 0%, transparent 100%)',
        WebkitMaskImage:
          'radial-gradient(circle 200px at -9999px -9999px, black 0%, transparent 100%)',
      }}
      aria-hidden="true"
    >
      <Image
        src="/images/hero-interior.png"
        alt=""
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
    </div>
  );
}
