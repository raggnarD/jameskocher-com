'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { profile } from '@/content/profile';
import { asset } from '@/lib/asset';
import styles from './LandingHeader.module.css';

/** The hero's scroll engine finds the header by this id and writes --np on it each frame. */
export const LANDING_HEADER_ID = 'landing-header';

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43A2.06 2.06 0 1 1 5.33 3.3a2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.35.78 1.05.78 2.12v3.14c0 .31.21.68.8.56C20.22 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function ArrowNE() {
  return (
    <svg width="16" height="16" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 7.5l5-5M3.5 2.5h4v4" />
    </svg>
  );
}

const menuLinks: { label: string; href: string; external?: boolean }[] = [
  { label: 'Home', href: '/' },
  { label: 'Contact', href: '/contact/' },
  { label: 'LinkedIn', href: profile.links.linkedin, external: true },
  { label: 'GitHub', href: profile.links.github, external: true },
];

export default function LandingHeader() {
  const [open, setOpen] = useState(false);
  const hdr = useRef<HTMLElement>(null);
  const brand = useRef<HTMLAnchorElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const ovLinks = useRef<(HTMLAnchorElement | null)[]>([]);
  const wasOpen = useRef(false);

  // Open: inert everything but the header and focus the first overlay link. Close: restore, focus the button.
  useEffect(() => {
    const h = hdr.current;
    if (!h || open === wasOpen.current) return;
    wasOpen.current = open;
    if (!open) {
      menuBtn.current?.focus({ preventScroll: true });
      return;
    }
    const saved = [...(h.parentElement?.children ?? [])]
      .filter((el): el is HTMLElement => el !== h && el instanceof HTMLElement && el.tagName !== 'SCRIPT')
      .map((el) => [el, el.inert] as const);
    saved.forEach(([el]) => { el.inert = true; });
    const t = setTimeout(() => ovLinks.current[0]?.focus({ preventScroll: true }), 60);
    return () => {
      clearTimeout(t);
      saved.forEach(([el, was]) => { el.inert = was; });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Esc closes the menu before the page's own Esc handler can scroll home (capture + stop).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); setOpen(false); }
    };
    window.addEventListener('keydown', onKey, true);
    // close when the viewport grows past the phone breakpoint
    const mq = matchMedia('(min-width: 640px)');
    const onMq = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false); };
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      mq.removeEventListener('change', onMq);
    };
  }, [open]);

  // keep Tab inside brand / menu button / overlay links
  const onKeyDown = useCallback((e: ReactKeyboardEvent) => {
    if (!open || e.key !== 'Tab') return;
    const f = [brand.current, menuBtn.current, ...ovLinks.current].filter(Boolean) as HTMLElement[];
    const i = f.indexOf(document.activeElement as HTMLElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }, [open]);

  // the page must not scrub behind the overlay
  useEffect(() => {
    const ov = hdr.current?.querySelector<HTMLElement>(`.${styles.ov}`);
    if (!ov) return;
    const stop = (e: Event) => { if (wasOpen.current) e.preventDefault(); };
    ov.addEventListener('wheel', stop, { passive: false });
    ov.addEventListener('touchmove', stop, { passive: false });
    return () => {
      ov.removeEventListener('wheel', stop);
      ov.removeEventListener('touchmove', stop);
    };
  }, []);

  return (
    <header
      id={LANDING_HEADER_ID}
      ref={hdr}
      className={`${styles.jn} ${open ? styles.open : ''}`}
      onKeyDown={onKeyDown}
    >
      <div className={styles.scrim} aria-hidden="true" />
      <nav className={styles.inner} aria-label="Site">
        <a ref={brand} className={`${styles.chip} ${styles.brand}`} href={asset('/')}>
          <span className={styles.mk} aria-hidden="true">
            <span className={styles.roll}><span>JK</span><span>JK</span></span>
          </span>
          <span>{profile.name}</span>
        </a>
        <div className={`${styles.chip} ${styles.right}`}>
          <a className={styles.link} href={asset('/contact/')}>Contact</a>
          <span className={styles.sep} aria-hidden="true" />
          <a className={styles.ic} href={profile.links.linkedin} {...ext} aria-label="LinkedIn"><LinkedInIcon /></a>
          <a className={styles.ic} href={profile.links.github} {...ext} aria-label="GitHub"><GitHubIcon /></a>
        </div>
        <button
          ref={menuBtn}
          className={`${styles.chip} ${styles.menu}`}
          type="button"
          aria-expanded={open}
          aria-controls="landing-menu"
          aria-label={open ? 'Close menu' : 'Menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.bars} aria-hidden="true"><i /><i /></span>
        </button>
      </nav>
      <div className={styles.ov} id="landing-menu" role="dialog" aria-modal="true" aria-label="Menu">
        <p className={styles.kicker} aria-hidden="true">Menu</p>
        <ul>
          {menuLinks.map((l, i) => (
            <li key={l.label} style={{ '--i': i } as CSSProperties}>
              <a
                ref={(el) => { ovLinks.current[i] = el; }}
                href={l.external ? l.href : asset(l.href)}
                {...(l.external ? ext : {})}
                onClick={() => setOpen(false)}
              >
                {l.label}
                {l.external && <span className={styles.arrow}><ArrowNE /></span>}
              </a>
            </li>
          ))}
        </ul>
        <p className={`${styles.kicker} ${styles.foot}`} aria-hidden="true">jameskocher.com</p>
      </div>
    </header>
  );
}
