'use client';

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import UnlockDialog from '@/components/case-study/UnlockDialog';
import { deckPath, hasStoredKey } from '@/lib/case-crypto';
import styles from './PharmaSalesStudyCard.module.css';

const FONTS =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@600;700&family=Source+Sans+3:wght@400;600&display=swap';

const SLUG = 'pharma-sales-study';
const TITLE = 'Pharma Sales Reporting Study Guide';

// Delay before the card starts following the pointer, so the spring flip can settle first.
const LIVE_AFTER_MS = 700;
const MAX_TILT_DEG = 10;

const ROWS = [
  {
    dt: 'Guide',
    dd: '6 modules, 5 diagrams',
    icon: (
      <>
        <path d="M12 6.5C10.4 5.3 8 4.7 4 4.8V18c4 0 6.4.6 8 1.8 1.6-1.2 4-1.8 8-1.8V4.8c-4-.1-6.4.5-8 1.7z" />
        <path d="M12 6.5v13.3" />
      </>
    ),
  },
  {
    dt: 'Terms',
    dd: '132 term tips',
    icon: (
      <>
        <path d="M4 5h16v10h-7l-4 4v-4H4z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
  },
  {
    dt: 'Drills',
    dd: '98 in 12 modules',
    icon: (
      <>
        <circle cx="12" cy="12" r="9.5" />
        <path d="M7.5 12.5l3 3 6-6.5" />
      </>
    ),
  },
];

export default function PharmaSalesStudyCard() {
  const ref = useRef<HTMLAnchorElement>(null);
  const liveTimer = useRef<number | undefined>(undefined);
  const [flipped, setFlipped] = useState(false);
  const [live, setLive] = useState(false);
  const [asking, setAsking] = useState(false);

  // A tap outside closes a tap-flipped card.
  useEffect(() => {
    if (!flipped) return;
    function onDocClick(e: globalThis.MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setFlipped(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [flipped]);

  useEffect(() => () => window.clearTimeout(liveTimer.current), []);

  function tracks(e: PointerEvent) {
    return (
      e.pointerType === 'mouse' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function track(e: PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty('--px', px.toFixed(3));
    el.style.setProperty('--py', py.toFixed(3));
    el.style.setProperty('--ty', `${((px - 0.5) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    el.style.setProperty('--tx', `${((0.5 - py) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
  }

  function onPointerEnter(e: PointerEvent) {
    if (!tracks(e)) return;
    track(e);
    window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => setLive(true), LIVE_AFTER_MS);
  }

  function onPointerMove(e: PointerEvent) {
    if (tracks(e)) track(e);
  }

  function onPointerLeave() {
    window.clearTimeout(liveTimer.current);
    setLive(false);
    const el = ref.current;
    if (!el) return;
    for (const p of ['--px', '--py', '--tx', '--ty']) el.style.removeProperty(p);
  }

  // On touch the first tap flips the card and the second opens it. Keyboard activation
  // (detail === 0) always opens it, since focus has already flipped the card.
  // Opening asks for the password unless this tab already unlocked the deck.
  function onClick(e: MouseEvent) {
    const touch = !window.matchMedia('(hover: hover)').matches;
    if (touch && e.detail !== 0 && !flipped) {
      e.preventDefault();
      setFlipped(true);
      return;
    }
    if (!hasStoredKey(SLUG)) {
      e.preventDefault();
      setAsking(true);
    }
  }

  return (
    <>
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <a
        ref={ref}
        href={deckPath(SLUG)}
        className={styles.card}
        data-flipped={flipped || asking}
        data-live={live}
        aria-labelledby="pss-title pss-cta"
        aria-describedby="pss-summary"
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <span className={styles.shadow} aria-hidden="true" />
        <span className={styles.tilt}>
          <span className={styles.inner}>
            <span className={`${styles.face} ${styles.markFace}`} aria-hidden="true">
              <span className={styles.tape}>3-DAY CASE PREP</span>
              <svg className={styles.mark} viewBox="0 0 240 150">
                <rect x="6" y="6" width="228" height="138" rx="14" fill="#141d2a" stroke="#a8b3c4" strokeWidth="2.5" />
                <text x="20" y="30" fill="#a8b3c4" fontSize="13" fontWeight="500" letterSpacing="1">
                  TRx
                </text>
                <rect x="20" y="42" width="58" height="88" rx="9" fill="#1a2536" stroke="#5d6a7e" strokeWidth="2" />
                <path d="M36 64h26M36 76h26M36 88h18" stroke="#5d6a7e" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="90" y="42" width="130" height="88" rx="9" fill="#1a2536" stroke="#a8b3c4" strokeWidth="2" />
                <text x="102" y="62" fill="#e6ebf2" fontSize="13" fontWeight="500" letterSpacing="1">
                  NRx
                </text>
                <rect x="102" y="72" width="66" height="46" rx="7" fill="#f5933a" />
                <text x="135" y="100" fill="#17233a" fontSize="13" fontWeight="600" textAnchor="middle" letterSpacing=".5">
                  NBRx
                </text>
                <rect x="176" y="72" width="32" height="46" rx="7" fill="#141d2a" stroke="#5d6a7e" strokeWidth="2" />
              </svg>
              <span className={styles.word}>
                Pharma Sales
                <br />
                Reporting
              </span>
              <span className={styles.markFoot}>
                <span>STUDY GUIDE</span>
                <span>02</span>
              </span>
              <span className={styles.sheen} />
            </span>
            <span className={`${styles.face} ${styles.copy}`}>
              <span className={styles.kick}>Study guide · Practice drills</span>
              <span className={styles.ttl} id="pss-title">
                Pharma Sales Reporting
              </span>
              <span id="pss-summary" style={{ display: 'contents' }}>
                <span className={styles.sum}>
                  Three days to get fluent in pharma sales reporting before a{' '}
                  <b>live design interview</b>. What&apos;s inside:
                </span>
                <span className={styles.rows}>
                  {ROWS.map((r) => (
                    <span className={styles.row} key={r.dt}>
                      <span className={styles.dt}>{r.dt}</span>
                      <svg className={styles.pic} viewBox="0 0 24 24" aria-hidden="true">
                        {r.icon}
                      </svg>
                      <span className={styles.dd}>{r.dd}</span>
                    </span>
                  ))}
                </span>
              </span>
              <span className={styles.cta} id="pss-cta">
                Open the guide <i aria-hidden="true">→</i>
              </span>
              <span className={styles.sheen} />
              <span className={styles.glare} />
            </span>
          </span>
        </span>
      </a>
      {asking && <UnlockDialog slug={SLUG} title={TITLE} onClose={() => setAsking(false)} />}
    </>
  );
}
