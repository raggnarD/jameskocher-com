'use client';

import { useLayoutEffect, useRef, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { profile } from '@/content/profile';
import { landingSections, type SectionLink } from '@/content/landing';
import { asset } from '@/lib/asset';
import { TOUR_PATH, writeTourHandoff } from '@/lib/tour-handoff';
import { LANDING_HEADER_ID } from '@/components/landing/LandingHeader';
import TourButtons from '@/components/landing/TourButtons';
import styles from '@/components/landing/Landing.module.css';

const IMG_W = 2500, IMG_H = 1406;          // public/assets/hero-mountain.jpg
const PEAK_X = 0.465, PEAK_Y = 0.387;      // summit of Wilson Peak in the photo
const HEADER = 56;                         // the photo runs this far up under the header

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rng = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // cubic in-out
const outQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const outExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
// html { scroll-behavior: smooth } in globals.css would turn every programmatic step into its own smooth scroll
const jump = (y: number) => window.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior });

function SectionLinkEl({ link }: { link: SectionLink }) {
  // Raw <a> for internal paths too: bundled sub-sites need a full navigation (no RSC payload exists for them).
  if (link.external) {
    return (
      <a className={styles.lk} href={link.href} target="_blank" rel="noopener noreferrer">
        {link.label}
      </a>
    );
  }
  return (
    <a className={styles.lk} href={asset(link.href)}>
      {link.label}
    </a>
  );
}

/**
 * Landing hero: the B&W Mt. Wilson photo, tagline and two ways in. Real page scroll drives a pinned stage
 * (0 -> 1 over ~0.9 viewport, lerped, soft-snapped); the photo slides up as one rigid layer and the section
 * links rise out of the black. "Guided tour" pushes in on the photo and hands its rect to /tour/.
 */
export default function Hero() {
  const router = useRouter();
  const r = {
    track: useRef<HTMLDivElement>(null),
    hero: useRef<HTMLElement>(null),
    photo: useRef<HTMLDivElement>(null),
    plate: useRef<HTMLDivElement>(null),
    ph: useRef<HTMLImageElement>(null),
    grad: useRef<HTMLDivElement>(null),
    blend: useRef<HTMLDivElement>(null),
    copy: useRef<HTMLDivElement>(null),
    mini: useRef<HTMLDivElement>(null),
    secs: useRef<HTMLDivElement>(null),
    explore: useRef<HTMLButtonElement>(null),
    back: useRef<HTMLButtonElement>(null),
    tour: useRef<HTMLAnchorElement>(null),
  };
  // set by the engine; the button handlers call into it
  const api = useRef<{ explore(): void; home(): void; launch(): void }>(null);

  useLayoutEffect(() => {
    const track = r.track.current!, hero = r.hero.current!, photo = r.photo.current!, plate = r.plate.current!,
      ph = r.ph.current!, grad = r.grad.current!, blend = r.blend.current!, copy = r.copy.current!,
      mini = r.mini.current!, secs = r.secs.current!, btn = r.explore.current!, back = r.back.current!;
    const hdr = document.getElementById(LANDING_HEADER_ID);
    const root = document.documentElement;
    const secEls = [...secs.querySelectorAll<HTMLElement>(`.${styles.sec}`)];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const g = { S: 0, D: 1, bh: 0, fade: 0, ty: 0 };
    const offs: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      addEventListener(type, fn, opts);
      offs.push(() => removeEventListener(type, fn, opts));
    };

    /* ---- geometry: measured once per real resize (not on mobile address-bar wobble) ---- */
    let lastW = 0, lastH = 0;
    function measure(force: boolean) {
      const w = root.clientWidth, h = innerHeight;
      if (!force && w === lastW && Math.abs(h - lastH) < 120) return; // ignore URL-bar show/hide
      lastW = w; lastH = h;
      const S = h - HEADER, mobile = w < 768;
      g.S = S; g.D = Math.round(S * 0.9);
      g.bh = Math.round(S * (mobile ? 0.36 : 0.56));
      g.fade = Math.round(g.bh * (mobile ? 0.45 : 0.36));
      // cover math at whole pixels, set once per resize and never animated: scale stays fixed
      const k = Math.max(w / IMG_W, S / IMG_H), iw = Math.ceil(IMG_W * k), ih = Math.ceil(IMG_H * k);
      const ox = Math.round(clamp(w / 2 - PEAK_X * iw, w - iw, 0)); // summit centred where cover allows
      const oy = Math.round((S - ih) * 0.55);
      const py = oy + PEAK_Y * ih;
      g.ty = Math.round(Math.min(g.bh * 0.3 - py, -oy)); // summit at ~30% of the band; whole-pixel rest position
      // re-cover HEADER px taller so the photo runs under the transparent header; the summit keeps its plate position
      const k2 = Math.max(iw / IMG_W, (S + HEADER) / IMG_H), iw2 = Math.ceil(IMG_W * k2), ih2 = Math.ceil(IMG_H * k2);
      const sx = ox + PEAK_X * iw;
      const ox2 = Math.round(Math.min(0, Math.max(w - iw2, sx - PEAK_X * iw2)));
      const oy2 = Math.round(Math.min(-HEADER, Math.max(S - ih2, py - PEAK_Y * ih2)));
      Object.assign(ph.style, { width: iw2 + 'px', height: ih2 + 'px', left: ox2 + 'px', top: oy2 + 'px', objectFit: 'fill' });
      track.style.setProperty('--blendtop', g.bh - g.fade - g.ty + 'px'); // in plate coords: lands at the band's foot
      track.style.setProperty('--S', S + 'px');
      track.style.setProperty('--bh', g.bh + 'px');
      track.style.setProperty('--fade', g.fade + 'px');
      // scroll track: one pinned viewport of scrub + whatever the deck needs below the fold
      const deckBottom = secs.offsetTop + secs.offsetHeight;
      track.style.height = g.D + Math.max(S, deckBottom) + 'px';
      render(cur);
    }

    /* ---- render: transforms + opacity only ---- */
    function render(p: number) {
      const e = inOut(p);
      hdr?.style.setProperty('--np', p.toFixed(4)); // header corner backgrounds follow the same progress
      plate.style.transform = `translate3d(0,${(g.ty * e).toFixed(2)}px,0)`; // the only thing that moves the photo
      grad.style.opacity = (1 - 0.35 * e).toFixed(3);
      blend.style.opacity = outQuart(rng(p, 0.04, 0.8)).toFixed(3);
      // copy leaves faster than the photo (parallax), fading as it goes
      const c = rng(p, 0, 0.5);
      copy.style.transform = `translate3d(0,${(g.ty * e * 1.4 - 24 * c).toFixed(2)}px,0)`;
      copy.style.opacity = (1 - c * c * (3 - 2 * c)).toFixed(3);
      copy.style.visibility = p > 0.55 ? 'hidden' : '';
      mini.style.setProperty('--p', p.toFixed(4));
      mini.style.visibility = p > 0.6 ? 'hidden' : '';
      secEls.forEach((el, i) => {
        const v = outExpo(rng(p, 0.42 + i * 0.08, 0.9 + i * 0.03));
        el.style.transform = v === 1 ? 'none' : `translate3d(0,${((1 - v) * 48).toFixed(2)}px,0)`;
        el.style.opacity = v.toFixed(3);
      });
      const b = rng(p, 0.82, 1);
      back.style.opacity = String(b);
      back.style.visibility = b > 0 ? 'visible' : 'hidden';
      const open = p > 0.6;
      if (secs.inert === open) {
        secs.inert = !open; back.inert = !open; mini.inert = open;
        btn.setAttribute('aria-expanded', String(open));
      }
    }

    /* ---- scroll -> target progress, lerped toward it every frame ---- */
    let cur = 0, tgt = 0, raf = 0, last = 0, lastY = scrollY, dir = 1;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let tween: { from: number; to: number; t0: number; ms: number } | null = null;
    function tick(t: number) {
      const dt = Math.min(64, t - last || 16); last = t;
      if (tween) stepTween(t);
      cur = reduce.matches ? tgt : cur + (tgt - cur) * (1 - Math.exp(-dt / 90));
      if (Math.abs(tgt - cur) < 0.0004) cur = tgt;
      render(cur);
      settle();
      raf = cur !== tgt || tween ? requestAnimationFrame(tick) : 0;
      if (!raf) hero.classList.remove(styles.moving); // drop will-change once at rest
    }
    const kick = () => {
      if (!raf) { hero.classList.add(styles.moving); last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    on('scroll', () => {
      const y = scrollY; if (y !== lastY) dir = y > lastY ? 1 : -1; lastY = y;
      tgt = clamp(y / g.D); kick();
      clearTimeout(idle);
      if (!tween && y > 0 && y < g.D) idle = setTimeout(snap, reduce.matches ? 0 : 260); // never rest half-way
    }, { passive: true });

    // soft snap to the nearest end, biased by the last scroll direction
    let touching = false;
    on('touchstart', () => { touching = true; tween = null; }, { passive: true });
    on('touchend', () => { touching = false; clearTimeout(idle); idle = setTimeout(snap, 260); }, { passive: true });
    function snap() {
      if (touching || tween) return;
      const y = scrollY; if (y <= 0 || y >= g.D) return;
      const p = y / g.D, goEnd = dir > 0 ? p > 0.06 : p > 0.94;
      scrollToY(goEnd ? g.D : 0, 700);
    }

    // eased programmatic scroll (cubic in-out); the lerp on top rounds off the start
    function scrollToY(y: number, ms: number) {
      if (reduce.matches || ms === 0) { tween = null; jump(y); tgt = clamp(y / g.D); kick(); return; }
      tween = { from: scrollY, to: y, t0: performance.now(), ms }; kick();
    }
    function stepTween(t: number) {
      const tw = tween!, k = clamp((t - tw.t0) / tw.ms), y = tw.from + (tw.to - tw.from) * inOut(k);
      jump(Math.round(y)); tgt = clamp(y / g.D);
      if (k >= 1) tween = null;
    }
    on('wheel', () => { tween = null; }, { passive: true });
    on('keydown', (e) => { if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') tween = null; });

    /* ---- state edges: focus + hash ---- */
    let state: 'intro' | 'explore' = 'intro';
    function settle() {
      if (cur === 1 && tgt === 1 && state !== 'explore') {
        state = 'explore'; hero.dataset.state = 'explore';
        if (!secs.contains(document.activeElement)) secs.querySelector('a')?.focus({ preventScroll: true });
      } else if (cur === 0 && tgt === 0 && state !== 'intro') {
        state = 'intro'; hero.dataset.state = 'intro';
        const a = document.activeElement;
        if (a === document.body || hero.contains(a)) btn.focus({ preventScroll: true });
      }
    }

    const goHome = () => { if (scrollY > 0) scrollToY(0, Math.min(1300, 700 + scrollY * 0.5)); };
    on('keydown', (e) => { if (e.key === 'Escape') goHome(); });
    on('resize', () => measure(false));

    /* ---- guided-tour hand-off: push in, fade the UI and tint, record the WHOLE photo's rect, route ---- */
    let launching = false, launchTimer: ReturnType<typeof setTimeout> | undefined;
    function launch() {
      if (launching) return;
      launching = true; tween = null;
      hero.classList.add(styles.launch); root.classList.add('launching');
      const go = () => {
        writeTourHandoff(ph.getBoundingClientRect()); // the <img> is the full image; includes plate + push-in transforms
        router.push(TOUR_PATH);
      };
      if (reduce.matches) { requestAnimationFrame(() => requestAnimationFrame(go)); return; } // no push-in: let the bare frame paint
      let done = false;
      const finish = () => { if (!done) { done = true; go(); } };
      const onEnd = (ev: TransitionEvent) => { if (ev.target === photo && ev.propertyName === 'transform') finish(); };
      photo.addEventListener('transitionend', onEnd);
      offs.push(() => photo.removeEventListener('transitionend', onEnd));
      launchTimer = setTimeout(finish, 900); // fallback if transitionend never fires
    }
    const unlaunch = () => {
      launching = false; clearTimeout(launchTimer);
      hero.classList.remove(styles.launch); root.classList.remove('launching');
    };
    on('pageshow', (e) => { if (e.persisted) unlaunch(); });

    api.current = { explore: () => scrollToY(g.D, 1300), home: goHome, launch };

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    measure(true);
    if (location.hash === '#explore') { jump(g.D); tgt = cur = 1; render(1); kick(); }
    else jump(0);

    return () => {
      offs.forEach((f) => f());
      cancelAnimationFrame(raf); clearTimeout(idle);
      unlaunch();
      hdr?.style.removeProperty('--np');
      api.current = null;
    };
    // refs are stable; router is stable for the page's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTour = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return; // new tab etc.: plain link
    e.preventDefault();
    api.current?.launch();
  };

  return (
    <div ref={r.track} className={styles.track}>
      <section ref={r.hero} className={styles.hero} id="top" data-state="intro">
        <div ref={r.photo} className={styles.photo} aria-hidden="true">
          <div ref={r.plate} className={styles.plate}>
            <img
              ref={r.ph}
              className={styles.ph}
              src={asset('/assets/hero-mountain.jpg')}
              alt=""
              width={IMG_W}
              height={IMG_H}
              decoding="sync"
              fetchPriority="high"
              draggable={false}
            />
            <div ref={r.grad} className={styles.grad} />
            <div ref={r.blend} className={styles.blend} />
          </div>
        </div>

        <div ref={r.copy} className={styles.wrap}>
          <h1 className={styles.tag}>{profile.tagline}</h1>
          <p className={styles.intro}>{profile.intro}</p>
        </div>

        <TourButtons
          groupRef={r.mini}
          tourRef={r.tour}
          exploreRef={r.explore}
          onTour={onTour}
          onExplore={() => api.current?.explore()}
        />

        <div ref={r.secs} className={styles.deck} id="landing-sections" inert>
          <div className={styles.deckIn}>
            {landingSections.map((s) => (
              <div key={s.id} className={styles.sec}>
                <h2>{s.title}</h2>
                <div className={styles.links}>
                  {s.links.map((l) => (
                    <SectionLinkEl key={l.href} link={l} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.shotRow}>
          <button ref={r.back} className={styles.back} type="button" inert onClick={() => api.current?.home()}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3.5 10l4.5-4.5L12.5 10" />
            </svg>
            Pull back <kbd>Esc</kbd>
          </button>
          <img className={styles.shot} src={asset('/assets/headshot.png')} alt={profile.name} width={88} height={88} />
        </div>
        <div className={styles.fade} aria-hidden="true" />
      </section>
    </div>
  );
}
