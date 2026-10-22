/**
 * Seamless hand-off from the landing hero to the /tour/ flyover.
 *
 * As "Guided tour" launches, the landing page records where the WHOLE hero
 * photo is drawn on screen (CSS px, after its push-in transform). The tour
 * paints its first frame with the photo at exactly that rect, then dissolves
 * into the 3D terrain, so the route change is invisible.
 */
export type TourHandoff = { x: number; y: number; w: number; h: number; vw: number; vh: number; t: number };

const KEY = 'tourHandoff';
const MAX_AGE_MS = 8000;

export function writeTourHandoff(rect: DOMRect): void {
  const h: TourHandoff = { x: rect.left, y: rect.top, w: rect.width, h: rect.height, vw: innerWidth, vh: innerHeight, t: Date.now() };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(h));
  } catch {}
}

/** Reads and clears the hand-off; null if missing, stale, or the viewport changed. */
export function takeTourHandoff(): TourHandoff | null {
  try {
    const h = JSON.parse(sessionStorage.getItem(KEY) || 'null') as TourHandoff | null;
    sessionStorage.removeItem(KEY);
    if (!h || Date.now() - h.t > MAX_AGE_MS) return null;
    if (Math.abs(h.vw - innerWidth) > 2 || Math.abs(h.vh - innerHeight) > 2) return null;
    return h;
  } catch {
    return null;
  }
}

/** Route of the flyover; the landing button links here. */
export const TOUR_PATH = '/tour/';
