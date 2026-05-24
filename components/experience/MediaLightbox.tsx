'use client';

import { useEffect, useState } from 'react';
import { asset } from '@/lib/asset';
import type { MediaItem } from '@/content/experience';

/**
 * Lightbox modal for media items. We track the open item in module-level
 * state via a custom event so any MediaThumb on the page can open it
 * without prop drilling.
 */
const OPEN_EVENT = 'experience-lightbox-open';

function emitOpen(item: MediaItem | null) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: item }));
  }
}

export function MediaThumb({ item }: { item: MediaItem }) {
  const thumbSrc =
    item.kind === 'image' ? item.src : item.poster;
  // Videos link out to YouTube/Vimeo. Open in new tab from the thumb;
  // images open in the in-page lightbox.
  if (item.kind === 'video') {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${item.caption} (opens in new tab)`}
        className="group relative block w-full sm:w-64 shrink-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg cursor-pointer"
      >
        <div className="relative overflow-hidden rounded-lg border border-ink-100 bg-ink-50 aspect-video">
          <img
            src={asset(item.poster)}
            alt={item.alt}
            loading="lazy"
            decoding="async"
            className="block w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm ring-1 ring-white/30 group-hover:bg-black/85 transition-colors">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="white"
                aria-hidden
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-ink-500 leading-snug">
          {item.caption}
        </p>
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => emitOpen(item)}
      aria-label={`Open ${item.caption}`}
      className="group relative block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg cursor-zoom-in"
    >
      <div className="relative overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
        <img
          src={asset(thumbSrc)}
          alt={item.alt}
          loading="lazy"
          decoding="async"
          className="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-500 leading-snug">
        {item.caption}
      </p>
    </button>
  );
}

export default function MediaLightbox() {
  const [open, setOpen] = useState<MediaItem | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const item = (e as CustomEvent<MediaItem | null>).detail;
      setOpen(item);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null);
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || open.kind !== 'image') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={open.caption}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_.15s_ease-out]"
      onClick={() => setOpen(null)}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => setOpen(null)}
        className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" />
        </svg>
      </button>
      <figure
        className="max-w-5xl max-h-[82vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={asset(open.src)}
          alt={open.alt}
          className="max-h-[82vh] max-w-full h-auto w-auto object-contain rounded-md shadow-2xl"
        />
        <figcaption className="text-sm text-white/90 text-center">
          {open.caption}
        </figcaption>
      </figure>
    </div>
  );
}
