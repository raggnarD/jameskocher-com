'use client';

import { useEffect, type MouseEvent, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import { asset } from '@/lib/asset';
import { TOUR_PATH } from '@/lib/tour-handoff';
import TerrainGlyph from './TerrainGlyph';
import styles from './Landing.module.css';

type Props = {
  groupRef: Ref<HTMLDivElement>;
  tourRef: Ref<HTMLAnchorElement>;
  exploreRef: Ref<HTMLButtonElement>;
  onTour: (e: MouseEvent<HTMLAnchorElement>) => void;
  onExplore: () => void;
};

let warmed = false;

/** Warm the tour so the click lands on a cache: route, 3D chunk and terrain. Once per page load. */
function useWarmTour() {
  const router = useRouter();
  const warm = () => {
    if (warmed) return;
    warmed = true;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    try { router.prefetch(TOUR_PATH); } catch {}
    try {
      import('@/components/tour/scene').catch(() => {});
    } catch {}
    try {
      fetch(asset('/assets/tour/terrain.bin')).catch(() => {});
    } catch {}
  };

  // or idle ~2 s after load
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;
    const schedule = () => {
      t = setTimeout(() => {
        if ('requestIdleCallback' in window) idleId = requestIdleCallback(warm, { timeout: 3000 });
        else warm();
      }, 2000);
    };
    if (document.readyState === 'complete') schedule();
    else addEventListener('load', schedule, { once: true });
    return () => {
      removeEventListener('load', schedule);
      clearTimeout(t);
      if (idleId !== undefined) cancelIdleCallback(idleId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return warm;
}

/** "Two ways in" (option 13 "Alive"): a live terrain render leads the tour; a ticking wheel leads exploring. */
export default function TourButtons({ groupRef, tourRef, exploreRef, onTour, onExplore }: Props) {
  const warm = useWarmTour();
  return (
    <div ref={groupRef} className={styles.mini} role="group" aria-label="Ways in">
      <span className={styles.k} aria-hidden="true">Two ways in</span>
      <a
        ref={tourRef}
        href={asset(TOUR_PATH)}
        onClick={onTour}
        onPointerEnter={warm}
        onFocus={warm}
        onTouchStart={warm}
      >
        <TerrainGlyph />
        <span className={styles.lbl}>Guided tour</span>
      </a>
      <span className={styles.sep} aria-hidden="true" />
      <button
        ref={exploreRef}
        type="button"
        aria-controls="landing-sections"
        aria-expanded="false"
        onClick={onExplore}
      >
        <span className={styles.mouse} aria-hidden="true" />
        <span className={styles.lbl}>Start exploring</span>
      </button>
    </div>
  );
}
