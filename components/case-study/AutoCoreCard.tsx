'use client';

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import UnlockDialog from '@/components/case-study/UnlockDialog';
import { deckPath, hasStoredKey } from '@/lib/case-crypto';
import styles from './AutoCoreCard.module.css';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@900&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;600&display=swap';

const HEX = '46,0 23,39.8 -23,39.8 -46,0 -23,-39.8 23,-39.8';
const CORE = '-100,0 -50,-86.6 50,-86.6 100,0 50,86.6 -50,86.6';

// The deck's four product lines, pushed out to the corners of the master mark.
const LINES = [
  {
    at: '-93.5 -54',
    color: '#FF6B12',
    d: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  },
  {
    at: '93.5 -54',
    color: '#1FA995',
    d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M15.5 8.5l-2 5-5 2 2-5z',
  },
  {
    at: '93.5 54',
    color: '#4C8DF6',
    d: 'M12 3c3.5 4.5 6 7.8 6 11a6 6 0 0 1-12 0c0-3.2 2.5-6.5 6-11z',
  },
  {
    at: '-93.5 54',
    color: '#E23B4E',
    d: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.8 2.5-5 .3 1.6 1 2.5 2 3 0-3 .5-5.5.5-8z',
  },
];

// Delay before the card starts following the pointer, so the spring flip can settle first.
const SLUG = 'autocore';
const TITLE = 'Hold the Work Line';

// The three fixes are hidden behind a blur. Only filler of a rough shape is in the markup, so
// the answers can't be read from page source or by a screen reader; they stay in the deck.
const HIDDEN_ROWS = [
  { dt: '1 · Nmorse', dd: 'Vaxlu cidp' },
  { dt: '2 · Arwon', dd: 'Tesh im bnmo' },
  { dt: '3 · Rsevax', dd: 'Lucidparwon teshim' },
];

const LIVE_AFTER_MS = 700;
const MAX_TILT_DEG = 10;

export default function AutoCoreCard() {
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
        aria-labelledby="autocore-title autocore-cta"
        aria-describedby="autocore-summary"
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <span className={styles.shadow} aria-hidden="true" />
        <span className={styles.tilt}>
          <span className={styles.inner}>
            <span className={`${styles.face} ${styles.front}`} aria-hidden="true">
              <span className={styles.tape}>CASE STUDY</span>
              <svg className={styles.mark} viewBox="-160 -125 320 250">
                {LINES.map((l) => (
                  <g key={l.at} transform={`translate(${l.at})`}>
                    <polygon points={HEX} fill="#1A2536" stroke={l.color} strokeWidth="4.5" />
                    <svg
                      x="-21"
                      y="-21"
                      width="42"
                      height="42"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={l.color}
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    >
                      <path d={l.d} />
                    </svg>
                  </g>
                ))}
                <g transform="scale(.7)">
                  <polygon points={CORE} fill="#1A2536" />
                  <polygon points={CORE} fill="none" stroke="#EEF2F7" strokeWidth="8" />
                  <polygon
                    points="-82,0 -41,-71 41,-71 82,0 41,71 -41,71"
                    fill="none"
                    stroke="#C3CCD8"
                    strokeOpacity="0.5"
                    strokeWidth="2.5"
                    strokeDasharray="8 7"
                  />
                  <text
                    className={styles.markText}
                    x="0"
                    y="34"
                    textAnchor="middle"
                    fontSize="96"
                    fill="#EEF2F7"
                  >
                    AC
                  </text>
                </g>
              </svg>
              <span className={styles.word}>AutoCore</span>
              <span className={styles.frontFoot}>
                <span>WORK LINE STRATEGY</span>
                <span>01</span>
              </span>
              <span className={styles.sheen} />
            </span>
            <span className={`${styles.face} ${styles.back}`}>
              <span className={styles.kick}>AutoCore · Work rugged outerwear</span>
              <span className={styles.ttl} id="autocore-title">
                {TITLE}
              </span>
              <span id="autocore-summary" style={{ display: 'contents' }}>
                <span className={styles.sum}>
                  Losing about <b>a share point a year</b> in Work. Three fixes, in that order:
                </span>
                <span className={styles.rows}>
                  {HIDDEN_ROWS.map((r) => (
                    <span className={styles.row} key={r.dt}>
                      <span className={`${styles.dt} ${styles.hidden}`} aria-hidden="true">
                        {r.dt}
                      </span>
                      <svg className={styles.lock} viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
                      </svg>
                      <span className={`${styles.dd} ${styles.hidden}`} aria-hidden="true">
                        {r.dd}
                      </span>
                    </span>
                  ))}
                  <span className={styles.srOnly}>Hidden until the deck is unlocked.</span>
                </span>
              </span>
              <span className={styles.cta} id="autocore-cta">
                Open the deck <i aria-hidden="true">→</i>
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
