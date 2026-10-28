'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Launch } from '@/content/launches';
import { asset } from '@/lib/asset';

/**
 * Launch modal: image, blurb, a summary of press coverage with links, and a
 * CTA. Used by the landing page (opens on load) and the Notable launches
 * "Learn more" button on /my-work. Closes on the X, "Close", Escape or a
 * backdrop click. Every link opens in a new tab.
 */
export default function LaunchModal({
  launch,
  open,
  onClose,
}: {
  launch: Launch;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Keep Tab inside the dialog.
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const els = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button');
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;
  const l = launch;

  // Portal to <body>: an ancestor with a transform (e.g. Reveal) would
  // otherwise trap position:fixed inside the card.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_.2s_ease-out]"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-title"
        aria-describedby="launch-blurb"
        className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-ink-100 bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" />
          </svg>
        </button>
        <div className="aspect-[2/1] w-full overflow-hidden bg-white">
          <img src={asset(l.image)} alt={l.imageAlt} className="h-full w-full object-cover" />
        </div>
        <div className="p-6">
          <span className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
            {l.eyebrow}
          </span>
          <h2 id="launch-title" className="font-serif text-2xl text-ink-900 tracking-tight mb-2">
            {l.title}
          </h2>
          <p id="launch-blurb" className="text-[15px] leading-relaxed text-ink-700 mb-6">
            {l.blurb}
          </p>

          <p className="eyebrow mb-3">In the news</p>
          <ul className="mb-6 divide-y divide-ink-100 border-y border-ink-100">
            {l.coverage.map((c) => (
              <li key={c.href}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
                >
                  <span className="flex items-baseline justify-between gap-3 text-xs text-ink-500">
                    <span className="font-medium uppercase tracking-wide text-accent">{c.outlet}</span>
                    <span>{c.date}</span>
                  </span>
                  <span className="mt-1 block text-[15px] font-medium leading-snug text-ink-900 group-hover:underline">
                    {c.headline}
                    <span aria-hidden> ↗</span>
                    <span className="sr-only"> (opens in new tab)</span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-600">{c.summary}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={l.cta.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {l.cta.label}
              <span aria-hidden>↗</span>
              <span className="sr-only">(opens in new tab)</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2.5 text-sm text-ink-600 transition-colors hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
