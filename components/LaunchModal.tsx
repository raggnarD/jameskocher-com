'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Launch, OutletMark } from '@/content/launches';
import { asset } from '@/lib/asset';

/**
 * Launch modal ("press wall"): image with the title over its fade, a
 * caption that cycles through each outlet's short line, and an "As seen in"
 * grid of outlet names that link to the articles. Hover or focus a name to
 * show its line and pause the cycle. Used by the landing page (opens on
 * load) and the Notable launches "Learn more" button on /my-work. Closes on
 * the X, "Close", Escape or a backdrop click. Every link opens in a new tab.
 */

const CYCLE_MS = 3200;
const SWAP_MS = 220;

// Type-only treatments that hint at each outlet's wordmark.
const MARK: Record<OutletMark, string> = {
  amazon: 'font-bold',
  verge: 'font-bold uppercase tracking-tight text-[14px]',
  engadget: 'font-bold italic tracking-tight',
  toms: 'font-display font-semibold text-[15px]',
  pcmag: 'font-extrabold tracking-wide',
  cnet: 'font-mono font-medium text-[14px]',
  mashable: 'font-semibold lowercase',
  bloomberg: 'font-display font-semibold text-[15px]',
  biggo: 'font-semibold',
};

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
  const n = launch.coverage.length;
  // active: highlighted chip. shown: caption content, which trails active
  // by SWAP_MS so the old line can fade out first.
  const [active, setActive] = useState(-1);
  const [shown, setShown] = useState(-1);
  const [hold, setHold] = useState(false);
  const [reduce, setReduce] = useState(false);

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

  // Start the cycle shortly after the chips have risen in; reset on close.
  useEffect(() => {
    if (!open) {
      setActive(-1);
      setShown(-1);
      setHold(false);
      return;
    }
    const r = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduce(r);
    const t = setTimeout(() => setActive(0), r ? 0 : 500);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (active < 0) return;
    const t = setTimeout(() => setShown(active), reduce ? 0 : SWAP_MS);
    return () => clearTimeout(t);
  }, [active, reduce]);

  // Auto-advance unless the visitor is pointing at or focused on a chip, or
  // prefers reduced motion.
  useEffect(() => {
    if (!open || hold || reduce || active < 0) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % n), CYCLE_MS);
    return () => clearTimeout(t);
  }, [open, hold, reduce, active, n]);

  if (!open) return null;
  const l = launch;
  const cap = shown >= 0 ? l.coverage[shown] : null;
  const swapping = active !== shown;

  const point = (i: number) => {
    setHold(true);
    setActive(i);
  };
  const release = () => setHold(false);

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
        aria-describedby="launch-role"
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

        <div className="relative aspect-video w-full overflow-hidden bg-white">
          <img src={asset(l.image)} alt={l.imageAlt} className="h-full w-full object-cover" />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 top-[40%] bg-gradient-to-b from-transparent to-surface"
          />
        </div>

        <div className="relative -mt-16 px-6">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
            {l.eyebrow}
          </span>
          <h2
            id="launch-title"
            className="mt-2 mb-1 font-display text-[40px] font-semibold leading-none tracking-tight text-ink-900"
          >
            {l.title}
          </h2>
          <p id="launch-role" className="text-sm text-ink-600">
            {l.role}
          </p>
        </div>

        <div className="px-6 pt-5 pb-6">
          <div
            aria-live="polite"
            className="mb-4 flex min-h-[64px] flex-col justify-center border-l-2 border-accent py-0.5 pl-3.5"
          >
            <p
              className={`font-display text-[21px] italic leading-tight text-ink-900 transition-all duration-300 ${
                swapping ? 'translate-y-1 opacity-0' : 'opacity-100'
              }`}
            >
              {cap?.line}
            </p>
            <p
              className={`mt-1 text-xs uppercase tracking-wide text-ink-500 transition-opacity duration-300 ${
                swapping ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {cap?.outlet}
            </p>
          </div>

          <p className="eyebrow mb-2.5">As seen in</p>
          <ul className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {l.coverage.map((c, i) => {
              const on = i === active;
              return (
                <li key={c.href}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={c.headline}
                    aria-label={`${c.outlet}: ${c.headline} (opens in new tab)`}
                    onMouseEnter={() => point(i)}
                    onFocus={() => point(i)}
                    onMouseLeave={release}
                    onBlur={release}
                    style={{ animationDelay: `${150 + i * 60}ms` }}
                    className={`group relative grid h-[54px] place-items-center overflow-hidden rounded-[10px] border px-1 text-center text-[12.5px] leading-[1.05] opacity-0 animate-[chipIn_.45s_ease-out_forwards] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      on
                        ? 'border-accent bg-accent/10 text-ink-900'
                        : 'border-ink-100 bg-ink-50 text-ink-600 hover:border-accent hover:text-ink-900'
                    } ${MARK[c.mark]}`}
                  >
                    {c.outlet}
                    <span
                      aria-hidden
                      className="absolute top-0.5 right-1.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      ↗
                    </span>
                    {on && !hold && !reduce && (
                      <span
                        key={active}
                        aria-hidden
                        className="absolute bottom-0 left-0 h-0.5 bg-accent animate-[fillX_3.2s_linear_forwards]"
                      />
                    )}
                  </a>
                </li>
              );
            })}
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
