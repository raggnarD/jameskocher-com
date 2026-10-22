'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { asset } from '@/lib/asset';
import { profile } from '@/content/profile';
import { takeTourHandoff } from '@/lib/tour-handoff';
import './tour.css';

/**
 * /tour/ guided flyover. Renders the static chrome; components/tour/scene.ts
 * (loaded with a dynamic import so three.js stays out of other routes) builds
 * the terrain, pins and tour logic into it and returns a full teardown.
 */
export default function Tour() {
  const rootRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Hand-off from the landing hero: paint the photo at the exact rect the
  // landing page drew it, before first paint. The <img> renders hidden
  // (.pending) so the static HTML never flashes the default framing.
  useLayoutEffect(() => {
    const img = imgRef.current, photo = photoRef.current;
    if (!img || !photo) return;
    const h = takeTourHandoff();
    if (h) {
      Object.assign(img.style, { left: h.x + 'px', top: h.y + 'px', width: h.w + 'px', height: h.h + 'px', objectFit: 'fill' });
      photo.classList.add('handoff');
    }
    img.classList.remove('pending');
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let dispose: (() => void) | null = null;
    let cancelled = false;
    const slow = window.setTimeout(() => photoRef.current?.classList.add('slow'), 600);
    import('@/components/tour/scene').then(({ startTour }) => {
      if (cancelled) return;
      dispose = startTour(root);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(slow);
      dispose?.();
    };
  }, []);

  const home = asset('/');

  return (
    <div className="recon touring" ref={rootRef}>
      <div id="stage" />
      <svg id="lead" className="overlay" aria-hidden="true" />
      <div id="pins" className="overlay" />
      <div className="vignette" />
      <div className="grain" />

      <header className="topbar">
        <a className="brand" href={home}>
          James Kocher<span>.</span>
        </a>
        <a className="home-pill" href={home}>
          ◂ Back to home
        </a>
      </header>

      <div className="hud">
        <div>Recon · Wilson massif · San Miguel Mtns</div>
        <div>
          Elevation model <b id="src">AWS Terrain Tiles z13</b> · 1.5× vert
        </div>
        <div className="cur">
          Cursor <b id="cur">—</b>
        </div>
      </div>
      <section className="hero">
        <div className="kicker">Pick an objective · drag to orbit</div>
        <h1>{profile.tagline}</h1>
        <p>{profile.intro}</p>
        <button className="hudbtn tourgo" id="tourGo">
          ▶ Take the guided tour
        </button>
      </section>
      <div className="hint">
        Drag · orbit
        <br />
        Scroll · zoom
        <br />
        1–4 · objectives
        <br />
        Esc · overview
      </div>
      <div className="compass">
        <svg viewBox="-30 -30 60 60">
          <g id="rose">
            <path d="M0 -24 L5 0 L0 -4 L-5 0Z" fill="#ff5e1a" />
            <path d="M0 24 L5 0 L0 4 L-5 0Z" fill="rgba(255,255,255,.5)" />
            <text x="0" y="-13" textAnchor="middle" dy="-12">
              N
            </text>
          </g>
        </svg>
      </div>

      <aside className="panel" id="panel" aria-live="polite">
        <div className="p-count" aria-hidden="true">
          <i id="pCount" />
        </div>
        <div className="kicker" id="pKick" />
        <h2 id="pTitle" />
        <div className="where" id="pWhere" />
        <p id="pBlurb" />
        <div className="stats">
          <div>
            Elev<b id="pElev" />
          </div>
          <div>
            Lat<b id="pLat" />
          </div>
          <div>
            Lon<b id="pLon" />
          </div>
        </div>
        <ul id="pLinks" />
        <div className="row">
          <button className="hudbtn" id="back">
            ◂ Overview
          </button>
          <button className="hudbtn" id="next">
            Next objective ▸
          </button>
        </div>
      </aside>

      <section className="tour" id="tour" aria-label="Guided tour" hidden>
        <div className="t-step">
          <b id="tStep">Guided tour</b>
          <span id="tName" />
        </div>
        <button className="hudbtn" id="tExit" aria-label="Exit tour">
          Exit<span className="wide">&nbsp;tour</span> ✕
        </button>
        <p className="t-cap" id="tCap" aria-live="polite" />
        <div className="t-seg" id="tSeg" aria-hidden="true">
          <i><b /></i>
          <i><b /></i>
          <i><b /></i>
          <i><b /></i>
        </div>
        <div className="t-ctl">
          <button className="hudbtn" id="tPrev" aria-label="Previous stop">
            ◂<span>Prev</span>
          </button>
          <button className="hudbtn pri" id="tPlay" aria-label="Pause tour">
            ❚❚<span>Pause</span>
          </button>
          <button className="hudbtn" id="tNext" aria-label="Next stop">
            <span>Next</span>▸
          </button>
        </div>
        <div className="t-end">
          <button className="hudbtn pri" id="tFree">
            Explore freely
          </button>
          <button className="hudbtn" id="tReplay">
            ↺ Replay
          </button>
          <a className="hudbtn" href={home}>
            ◂ Home
          </a>
        </div>
      </section>

      <div className="photo" id="photo" ref={photoRef}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="photoImg" className="pending" ref={imgRef} src={asset('/assets/hero-mountain.jpg')} alt="" />
        <i className="loadline" id="acqBar" />
      </div>
    </div>
  );
}
