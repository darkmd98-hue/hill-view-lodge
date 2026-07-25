'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { getSupabase } from '@/lib/supabaseClient';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { Loader2, X, ChevronLeft, ChevronRight, Play, Eye } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  title: string;
  type: 'photo' | 'video';
  category: string; // original folder name, e.g. 'rooms'
}

export default function GalleryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering & Lightbox States
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Dynamic fetch of folders and files from Supabase Storage
  useEffect(() => {
    async function loadGalleryData() {
      try {
        const supabase = getSupabase();
        
        // 1. List items at root of 'gallery' bucket to identify directories/folders
        const { data: rootItems, error: rootError } = await supabase
          .storage
          .from('gallery')
          .list('', { limit: 100 });

        if (rootError) {
          throw new Error(rootError.message);
        }

        // Find folders (in Supabase storage, folders don't have id/metadata)
        let folders = rootItems
          ? rootItems.filter(item => !item.id && !item.metadata).map(item => item.name)
          : [];

        // Fallback to specced folders if root list doesn't yield folder structures
        if (folders.length === 0) {
          folders = ['rooms', 'exterior', 'surroundings', 'others'];
        }

        setCategories(folders);

        const loadedMedia: MediaItem[] = [];

        // 2. Fetch files for each folder
        for (const folder of folders) {
          const { data: files, error: filesError } = await supabase
            .storage
            .from('gallery')
            .list(folder, { limit: 100 });

          if (filesError) {
            console.error(`Error listing folder ${folder}:`, filesError.message);
            continue;
          }

          if (files) {
            for (const file of files) {
              // Skip empty folder placeholder files if any
              if (file.name === '.emptyFolderPlaceholder') continue;

              const ext = file.name.split('.').pop()?.toLowerCase() || '';
              const isPhoto = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
              const isVideo = ['mp4', 'mov', 'webm'].includes(ext);

              if (isPhoto || isVideo) {
                const path = `${folder}/${file.name}`;
                const publicUrl = supabase.storage.from('gallery').getPublicUrl(path).data.publicUrl;

                // Format filename into friendly title (e.g. deluxe_room -> Deluxe Room)
                const baseName = file.name.split('.')[0];
                const title = baseName
                  .replace(/[-_]/g, ' ')
                  .replace(/\b\w/g, c => c.toUpperCase());

                loadedMedia.push({
                  id: `${folder}-${file.name}`,
                  url: publicUrl,
                  title,
                  type: isVideo ? 'video' : 'photo',
                  category: folder,
                });
              }
            }
          }
        }

        setMedia(loadedMedia);
      } catch (err) {
        console.error('Gallery load error:', err);
        setError('Unable to load gallery content. Please ensure the Supabase bucket configuration is valid.');
      } finally {
        setLoading(false);
      }
    }

    loadGalleryData();
  }, []);

  // Format category slugs (e.g., surroundings -> Surroundings)
  const formatCategoryName = (category: string) => {
    return category
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Get currently filtered list of items in the grid
  const filteredMedia = media.filter(item => {
    if (activeCategory === 'All') return true;
    return item.category === activeCategory;
  });

  // Filters only photos for lightbox navigation
  const filteredPhotos = filteredMedia.filter(item => item.type === 'photo');

  // Lightbox navigation helpers
  const handlePrevPhoto = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev === 0 ? filteredPhotos.length - 1 : prev - 1;
    });
  }, [lightboxIndex, filteredPhotos.length]);

  const handleNextPhoto = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return prev === filteredPhotos.length - 1 ? 0 : prev + 1;
    });
  }, [lightboxIndex, filteredPhotos.length]);

  // Keyboard controls for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'Escape') setLightboxIndex(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, handlePrevPhoto, handleNextPhoto]);

  // Trigger lightbox on a specific item
  const openLightbox = (item: MediaItem) => {
    const photoIdx = filteredPhotos.findIndex(p => p.id === item.id);
    if (photoIdx !== -1) {
      setLightboxIndex(photoIdx);
    }
  };

  return (
    <main className="min-h-dvh bg-surface text-text-primary py-24 sm:py-28 px-5">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="text-center max-w-2xl mx-auto space-y-4"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wider">
            <span>📷</span> Experience Hill View
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="font-display italic text-4xl sm:text-5xl font-bold tracking-tight text-text-primary"
          >
            Gallery
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-text-muted text-sm sm:text-base font-light leading-relaxed"
          >
            Take a visual tour of Hill View Lodge. Browse real photos of our rooms, coordinates, and scenery.
          </motion.p>
        </motion.div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-xs text-text-muted">Loading gallery media...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12 max-w-md mx-auto">
            <div className="text-error bg-error-bg border border-error/10 p-4 rounded-3xl text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Content Section */}
        {!loading && !error && (
          <div className="space-y-10">
            
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  setActiveCategory('All');
                  setLightboxIndex(null);
                }}
                className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider transition-all cursor-pointer border ${
                  activeCategory === 'All'
                    ? 'bg-accent border-accent text-white shadow-md'
                    : 'bg-white border-black/5 text-text-muted hover:bg-[#f1eeeb]'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setLightboxIndex(null);
                  }}
                  className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider transition-all cursor-pointer border ${
                    activeCategory === cat
                      ? 'bg-accent border-accent text-white shadow-md'
                      : 'bg-white border-black/5 text-text-muted hover:bg-[#f1eeeb]'
                  }`}
                >
                  {formatCategoryName(cat)}
                </button>
              ))}
            </div>

            {/* Media Grid */}
            {filteredMedia.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-black/5 max-w-md mx-auto">
                <p className="text-text-muted text-sm italic font-medium">Photos coming soon</p>
                <p className="text-[10px] text-text-muted/70 mt-1">This category does not contain any images yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredMedia.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.5, delay: (idx % 4) * 0.08, ease: 'easeOut' }}
                    className="group relative bg-white rounded-2xl overflow-hidden border border-black/5 shadow-xs flex flex-col aspect-square w-full"
                  >
                    {item.type === 'photo' ? (
                      // ── PHOTO TILES ──
                      <div
                        onClick={() => openLightbox(item)}
                        className="relative w-full h-full cursor-zoom-in overflow-hidden"
                      >
                        <Image
                          src={item.url}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white stroke-1" />
                        </div>
                      </div>
                    ) : (
                      // ── VIDEO TILES ──
                      <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
                        <video
                          src={item.url}
                          controls
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                        {/* Play badge indicators overlay when controls are idle */}
                        <div className="absolute top-3 right-3 pointer-events-none bg-black/50 text-white rounded-full p-1.5 backdrop-blur-xs">
                          <Play className="w-3.5 h-3.5 fill-white" />
                        </div>
                      </div>
                    )}

                    {/* Simple Bottom Description */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pointer-events-none">
                      <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      {/* ── LIGHTBOX MODAL FOR PHOTOS ── */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredPhotos[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 sm:p-10 select-none"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close trigger button */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Navigate button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevPhoto();
              }}
              className="absolute left-4 sm:left-8 p-3 bg-white/5 hover:bg-white/15 text-white rounded-full transition-colors cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>

            {/* Lightbox Central Display */}
            <div
              className="relative max-w-5xl max-h-[80dvh] w-full h-full flex flex-col justify-center items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full">
                <Image
                  src={filteredPhotos[lightboxIndex].url}
                  alt={filteredPhotos[lightboxIndex].title}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>

              {/* Title descriptions */}
              <div className="text-center mt-4">
                <h3 className="text-white text-sm font-semibold tracking-wide">
                  {filteredPhotos[lightboxIndex].title}
                </h3>
                <span className="text-[10px] text-white/50 font-mono mt-1 block">
                  Image {lightboxIndex + 1} of {filteredPhotos.length}
                </span>
              </div>
            </div>

            {/* Right Navigate button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextPhoto();
              }}
              className="absolute right-4 sm:right-8 p-3 bg-white/5 hover:bg-white/15 text-white rounded-full transition-colors cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
