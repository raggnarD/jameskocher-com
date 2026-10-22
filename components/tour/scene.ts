/**
 * /tour/ flyover scene: real 3D terrain of the Wilson massif with a contour
 * shader, four objective pins, a dashed route and the guided tour.
 *
 * Ported nearly verbatim from the "Recon" prototype. Loaded only through a
 * dynamic import() from components/tour/Tour.tsx (and warmed by the landing
 * page with import('@/components/tour/scene')), so three.js stays out of every
 * other route's bundle.
 *
 * startTour(root) builds into the markup Tour.tsx rendered and returns a
 * dispose function that tears down the renderer, controls, rAF loop,
 * listeners, timers and any in-flight terrain fetch.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { sections, type Section } from '@/content/landing';
import { asset } from '@/lib/asset';

// ---------- real terrain: AWS Terrain Tiles (Terrarium encoding)
// Keep BBOX/Z/GW/GH/DEM_MAGIC/DEM_OFFSET in sync with scripts/bake_terrain.py.
const BBOX = { w: -108.078, e: -107.922, s: 37.8, n: 37.896 };
const Z = 13, GW = 280, GH = 220, VEX = 1.5;
const DEM_MAGIC = 0xd3e1, DEM_OFFSET = 1000;
const MID = { lat: (BBOX.n + BBOX.s) / 2, lon: (BBOX.w + BBOX.e) / 2 };
const WKM = (BBOX.e - BBOX.w) * 111.32 * Math.cos((MID.lat * Math.PI) / 180);
const HKM = (BBOX.n - BBOX.s) * 111.32;
const lon2x = (lon: number) => ((lon + 180) / 360) * 2 ** Z;
const lat2y = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** Z;
};

type Obj = {
  name: string; lat: number; lon: number; peak?: boolean; official?: number; sec: Section;
  w: THREE.Vector3; top: THREE.Vector3; elevFt: number; lift: number;
  el: HTMLButtonElement; line: SVGLineElement; dot: SVGCircleElement;
  nx?: number; ny?: number;
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function startTour(root: HTMLElement): () => void {
  let disposed = false;
  let raf = 0;
  const abort = new AbortController();
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };
  const offs: (() => void)[] = [];
  function on<K extends keyof WindowEventMap>(t: Window, type: K, fn: (e: WindowEventMap[K]) => void): void;
  function on(t: EventTarget, type: string, fn: (e: any) => void): void; // eslint-disable-line @typescript-eslint/no-explicit-any
  function on(t: EventTarget, type: string, fn: (e: any) => void) { // eslint-disable-line @typescript-eslint/no-explicit-any
    t.addEventListener(type, fn);
    offs.push(() => t.removeEventListener(type, fn));
  }
  const $ = <T extends Element = HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;

  let renderer: THREE.WebGLRenderer | null = null;
  let controls: OrbitControls | null = null;
  let scene: THREE.Scene | null = null;
  const pinsEl = $('pins'), lead = $<SVGSVGElement>('lead');

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    abort.abort();
    cancelAnimationFrame(raf);
    timers.forEach((id) => clearTimeout(id)); timers.clear();
    offs.forEach((f) => f()); offs.length = 0;
    controls?.dispose();
    scene?.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
    pinsEl.replaceChildren();
    lead.replaceChildren();
  };

  main().catch((err) => { if (!disposed) console.error('[tour]', err); });
  return dispose;

  async function main() {
    const acqBar = $('acqBar');

    async function loadLiveDEM() {
      const x0 = lon2x(BBOX.w), x1 = lon2x(BBOX.e), y0 = lat2y(BBOX.n), y1 = lat2y(BBOX.s);
      const tx0 = Math.floor(x0), tx1 = Math.floor(x1), ty0 = Math.floor(y0), ty1 = Math.floor(y1);
      void x1; void y1;
      const cv = document.createElement('canvas');
      cv.width = (tx1 - tx0 + 1) * 256; cv.height = (ty1 - ty0 + 1) * 256;
      const ctx = cv.getContext('2d', { willReadFrequently: true })!;
      const jobs: [number, number][] = [];
      for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) jobs.push([tx, ty]);
      let done = 0;
      await Promise.all(jobs.map(([tx, ty]) => new Promise<void>((res, rej) => {
        const im = new Image(); im.crossOrigin = 'anonymous';
        im.onload = () => { ctx.drawImage(im, (tx - tx0) * 256, (ty - ty0) * 256); acqBar.style.width = (++done / jobs.length) * 100 + '%'; res(); };
        im.onerror = rej;
        im.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`;
      })));
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const px = (x: number, y: number) => { const i = (y * cv.width + x) * 4; return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768; };
      const g = new Float32Array((GW + 1) * (GH + 1));
      for (let j = 0; j <= GH; j++) for (let i = 0; i <= GW; i++) {
        const fx = (lon2x(BBOX.w + ((BBOX.e - BBOX.w) * i) / GW) - tx0) * 256;
        const fy = (lat2y(BBOX.n - ((BBOX.n - BBOX.s) * j) / GH) - ty0) * 256;
        const ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
        g[j * (GW + 1) + i] = (px(ix, iy) * (1 - u) + px(ix + 1, iy) * u) * (1 - v) + (px(ix, iy + 1) * (1 - u) + px(ix + 1, iy + 1) * u) * v;
      }
      $('src').textContent = 'AWS Terrain Tiles z13';
      return g;
    }
    function fakeDEM() { // offline fallback: gaussian peaks at the real summit positions
      $('src').textContent = 'procedural fallback';
      const peaks = [[37.8392, -107.9916, 1500, 0.9], [37.8603, -107.9847, 1400, 0.8], [37.8394, -108.0053, 1350, 0.8], [37.8467, -107.9883, 1300, 0.7]];
      const g = new Float32Array((GW + 1) * (GH + 1));
      for (let j = 0; j <= GH; j++) for (let i = 0; i <= GW; i++) {
        const lat = BBOX.n - ((BBOX.n - BBOX.s) * j) / GH, lon = BBOX.w + ((BBOX.e - BBOX.w) * i) / GW;
        let e = 2850 + Math.sin(i * 0.11) * 25 + Math.cos(j * 0.13) * 25;
        for (const [pl, pn, h, r] of peaks) { const dk = Math.hypot((lat - pl) * 111, (lon - pn) * 88); e += h * Math.exp(-(dk * dk) / (2 * r * r)); }
        g[j * (GW + 1) + i] = e;
      }
      return g;
    }
    // Baked grid from scripts/bake_terrain.py: one ~124 KB file instead of a dozen tile fetches.
    async function loadBakedDEM() {
      const r = await fetch(asset('/assets/tour/terrain.bin'), { signal: abort.signal });
      if (!r.ok) throw new Error('no baked DEM');
      const a = new Uint16Array(await r.arrayBuffer());
      if (a[0] !== DEM_MAGIC || a[1] !== GW || a[2] !== GH || a.length !== 4 + (GW + 1) * (GH + 1)) throw new Error('baked DEM out of date');
      const g = new Float32Array((GW + 1) * (GH + 1));
      for (let k = 0; k < g.length; k++) g[k] = a[k + 4] / 10 + DEM_OFFSET;
      $('src').textContent = 'AWS Terrain Tiles z13 (baked)';
      return g;
    }

    let dem: Float32Array;
    try { dem = await loadBakedDEM(); } catch {
      if (disposed) return;
      try { dem = await loadLiveDEM(); } catch { dem = fakeDEM(); }
    }
    if (disposed) return;
    acqBar.style.width = '100%';

    // ---------- scene
    const stage = $('stage');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    stage.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0a09, 14, 34);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.minDistance = 2.2; controls.maxDistance = 22; controls.maxPolarAngle = 1.32; controls.enablePan = false;
    controls.autoRotateSpeed = 0.35;
    const R = renderer, C = controls, S = scene;

    const hY = (m: number) => ((m - 3000) / 1000) * VEX;
    const geo = new THREE.PlaneGeometry(WKM, HKM, GW, GH);
    geo.rotateX(-Math.PI / 2); // north = -Z, east = +X
    const elevAttr = new Float32Array(geo.attributes.position.count);
    for (let k = 0; k < elevAttr.length; k++) { elevAttr[k] = dem[k]; geo.attributes.position.setY(k, hY(dem[k])); }
    geo.setAttribute('elev', new THREE.BufferAttribute(elevAttr, 1));
    geo.computeVertexNormals();

    const terrainMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }, brand: { value: new THREE.Color(0xff5e1a) },
        focus: { value: new THREE.Vector3(0, 0, 0) }, focusOn: { value: 0 },
        halfSize: { value: new THREE.Vector2(WKM / 2, HKM / 2) },
        fogColor: { value: new THREE.Color(0x0b0a09) }, fogNear: { value: 14 }, fogFar: { value: 34 },
      },
      vertexShader: `attribute float elev; varying float vE; varying vec3 vN; varying vec3 vP; varying float vDepth;
        void main(){ vE=elev; vN=normal; vP=position; vec4 mv=modelViewMatrix*vec4(position,1.); vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float time; uniform vec3 brand; uniform vec3 focus; uniform float focusOn; uniform vec2 halfSize;
        uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
        varying float vE; varying vec3 vN; varying vec3 vP; varying float vDepth;
        float iso(float v, float w){ float f=abs(fract(v-.5)-.5)/fwidth(v); return 1.-min(f/w,1.); }
        void main(){
          vec3 n=normalize(vN);
          float sun=clamp(dot(n, normalize(vec3(.45,.75,.35))),0.,1.);
          float snow=smoothstep(3700.,4100.,vE)*smoothstep(.55,.85,n.y);
          vec3 base=mix(vec3(.004,.004,.004), vec3(.055,.05,.047), sun*sun);
          base=mix(base, vec3(.3,.3,.32)*(.2+.8*sun), snow*.5);
          float minor=iso(vE/40., 1.)*.13, major=iso(vE/200., 1.5)*.75;
          vec3 c=base + brand*(minor+major)*(.35+.65*sun);
          float gx=iso(vP.x, .8), gz=iso(vP.z, .8);
          c+=vec3(1.)*max(gx,gz)*.025;
          float d=distance(vP.xz, focus.xz);
          float ring=smoothstep(.05,0.,abs(d-mod(time*1.6, 3.5)))*(1.-mod(time*1.6,3.5)/3.5);
          c+=brand*ring*focusOn*.9;
          c+=brand*smoothstep(.7,.0,d)*.07*focusOn;
          vec2 e=halfSize-abs(vP.xz); float edge=smoothstep(0.,.9,min(e.x,e.y));
          c*=edge;
          float fogF=smoothstep(fogNear,fogFar,vDepth);
          gl_FragColor=vec4(mix(c,fogColor,fogF), edge);
          #include <colorspace_fragment>
        }`,
      transparent: true,
    });
    const terrain = new THREE.Mesh(geo, terrainMat);
    S.add(terrain);

    // grid table under the terrain
    const table = new THREE.GridHelper(40, 40, 0x3a302a, 0x1d1916);
    table.position.y = hY(2500);
    S.add(table);

    // ---------- geo helpers
    function heightAt(x: number, z: number) {
      const fi = (x / WKM + 0.5) * GW, fj = (z / HKM + 0.5) * GH;
      const i = Math.max(0, Math.min(GW - 1, Math.floor(fi))), j = Math.max(0, Math.min(GH - 1, Math.floor(fj)));
      const u = fi - i, v = fj - j, a = dem[j * (GW + 1) + i], b = dem[j * (GW + 1) + i + 1], c = dem[(j + 1) * (GW + 1) + i], d = dem[(j + 1) * (GW + 1) + i + 1];
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    }
    const toWorld = (lat: number, lon: number) => {
      const x = ((lon - MID.lon) / (BBOX.e - BBOX.w)) * WKM, z = ((MID.lat - lat) / (BBOX.n - BBOX.s)) * HKM;
      return new THREE.Vector3(x, hY(heightAt(x, z)), z);
    };
    const toLatLon = (x: number, z: number) => ({ lat: MID.lat - (z / HKM) * (BBOX.n - BBOX.s), lon: MID.lon + (x / WKM) * (BBOX.e - BBOX.w) });
    function snapPeak(v: THREE.Vector3, r = 0.25) { // nudge onto the true local summit
      const best = v.clone(); let be = -1e9;
      for (let dx = -r; dx <= r; dx += 0.025) for (let dz = -r; dz <= r; dz += 0.025) {
        const e = heightAt(v.x + dx, v.z + dz); if (e > be) { be = e; best.set(v.x + dx, hY(e), v.z + dz); }
      }
      return best;
    }

    // ---------- objectives (approximate real locations)
    const secById = (id: Section['id']) => sections.find((s) => s.id === id)!;
    const OBJ = [
      { name: 'Silver Pick Basin', lat: 37.8705, lon: -107.96, sec: secById('experience') },
      { name: 'Wilson Peak', lat: 37.8603, lon: -107.9847, peak: true, official: 14017, sec: secById('projects') },
      { name: 'Navajo Basin', lat: 37.8505, lon: -108.0125, sec: secById('founder') },
      { name: 'Mt. Wilson', lat: 37.8392, lon: -107.9916, peak: true, official: 14246, sec: secById('contact') },
    ] as Obj[];
    const FEATURES: [string, number, number][] = [['El Diente', 37.8394, -108.0053], ['Gladstone Pk', 37.8467, -107.9883], ['Dolores Peak', 37.8203, -108.0475]];
    OBJ.forEach((o) => { o.w = toWorld(o.lat, o.lon); if (o.peak) o.w = snapPeak(o.w); const ll = toLatLon(o.w.x, o.w.z); o.lat = ll.lat; o.lon = ll.lon; o.elevFt = o.official || Math.round(heightAt(o.w.x, o.w.z) * 3.28084); });

    // dashed route draped over the terrain, objective to objective
    const routePts: THREE.Vector3[] = [];
    for (let k = 0; k < OBJ.length - 1; k++) {
      const a = OBJ[k].w, b = OBJ[k + 1].w;
      for (let s = 0; s < 1; s += 0.02) { const x = a.x + (b.x - a.x) * s, z = a.z + (b.z - a.z) * s; routePts.push(new THREE.Vector3(x, hY(heightAt(x, z)) + 0.04, z)); }
    }
    routePts.push(OBJ[OBJ.length - 1].w.clone().setY(OBJ[OBJ.length - 1].w.y + 0.04));
    const routeCurve = new THREE.CatmullRomCurve3(routePts);
    const routeLen = routeCurve.getLength();
    const routeMat = new THREE.ShaderMaterial({
      transparent: true, uniforms: { time: { value: 0 }, brand: { value: new THREE.Color(0xff5e1a) }, len: { value: routeLen }, prog: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float time; uniform vec3 brand; uniform float len; uniform float prog; varying vec2 vUv;
        void main(){ float d=fract(vUv.x*len*5.-time*1.2); if(d>.55) discard; vec3 c = vUv.x<prog ? brand : vec3(1.); gl_FragColor=vec4(c, vUv.x<prog?1.:.55);
        #include <colorspace_fragment>
        }`,
    });
    S.add(new THREE.Mesh(new THREE.TubeGeometry(routeCurve, 600, 0.014, 5), routeMat));

    // ---------- HTML pins + leader lines
    const NS = 'http://www.w3.org/2000/svg';
    OBJ.forEach((o, k) => {
      o.el = document.createElement('button'); o.el.className = 'pin';
      o.el.innerHTML = `<span class="box"><span class="k">${k + 1}</span><span><b>${esc(o.sec.title)}</b><small>${esc(o.name)} · ${o.elevFt.toLocaleString()} ft</small></span></span>`;
      o.el.setAttribute('aria-label', `Objective ${k + 1}: ${o.sec.title} at ${o.name}`);
      o.el.addEventListener('click', () => { if (tour.on) { tourGo(k); setPaused(true); } else select(k); });
      pinsEl.appendChild(o.el);
      o.line = document.createElementNS(NS, 'line'); lead.appendChild(o.line);
      o.dot = document.createElementNS(NS, 'circle'); o.dot.setAttribute('r', '3'); lead.appendChild(o.dot);
      o.lift = [0.7, 0.55, 1.0, 1.2][k]; o.top = o.w.clone(); // lift follows the place (peaks need less)
    });
    const feats = FEATURES.map(([n, lat, lon]) => { const el = document.createElement('div'); el.className = 'feat'; el.textContent = n; pinsEl.appendChild(el); return { el, w: snapPeak(toWorld(lat, lon), 0.2).add(new THREE.Vector3(0, 0.08, 0)) }; });

    const v3 = new THREE.Vector3();
    function project(w: THREE.Vector3) { v3.copy(w).project(camera); return { x: ((v3.x + 1) / 2) * innerWidth, y: ((1 - v3.y) / 2) * innerHeight, ok: v3.z < 1 }; }

    // ---------- camera choreography
    const OVER = { pos: new THREE.Vector3(3.2, 12.5, -9), target: new THREE.Vector3(-0.3, -0.9, 1.2) };
    let tw: { t: number; dur: number; p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3 } | null = null;
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function flyTo(pos: THREE.Vector3, target: THREE.Vector3, dur = 1.8) {
      C.enabled = false; C.autoRotate = false;
      if (RM) dur = Math.min(dur, 0.45);
      tw = { t: 0, dur, p0: camera.position.clone(), t0: C.target.clone(), p1: pos.clone(), t1: target.clone() };
    }
    const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    let sel = -1;
    const panel = $('panel');
    function select(k: number) {
      sel = k; const o = OBJ[k];
      root.classList.add('focus');
      OBJ.forEach((p, i) => p.el.classList.toggle('on', i === k));
      // approach from the camera's current side, framed so the panel doesn't cover it
      const dir = camera.position.clone().sub(C.target).setY(0).normalize();
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const wide = innerWidth > 760;
      const target = o.w.clone().add(right.clone().multiplyScalar(wide ? -0.9 : 0)).add(new THREE.Vector3(0, wide ? 0 : -0.7, 0));
      const pos = o.w.clone().add(dir.multiplyScalar(4.6)).add(new THREE.Vector3(0, 3.2, 0)).add(right.multiplyScalar(wide ? -0.9 : 0));
      flyTo(pos, target);
      terrainMat.uniforms.focus.value.copy(o.w); terrainMat.uniforms.focusOn.value = 1;
      routeMat.uniforms.prog.value = k / (OBJ.length - 1);
      panel.classList.remove('show');
      $('pKick').textContent = `Objective ${k + 1} / ${OBJ.length}`;
      $('pTitle').textContent = o.sec.title;
      $('pWhere').textContent = o.name;
      $('pBlurb').textContent = o.sec.blurb;
      $('pElev').textContent = o.elevFt.toLocaleString() + ' ft';
      $('pLat').textContent = o.lat.toFixed(4) + '°N';
      $('pLon').textContent = Math.abs(o.lon).toFixed(4) + '°W';
      $('pLinks').innerHTML = o.sec.links.map((l, i) => {
        const href = l.external ? l.href : asset(l.href);
        const attrs = l.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<li><a href="${esc(href)}"${attrs}><i>${String(i + 1).padStart(2, '0')}</i><span><b>${esc(l.label)}</b><small>${esc(l.note)}</small></span><span class="go">${l.external ? 'OPEN ↗' : 'GO →'}</span></a></li>`;
      }).join('');
      $('next').textContent = k === OBJ.length - 1 ? 'Back to start ▸' : 'Next objective ▸';
      later(() => { if (sel === k) { panel.scrollTop = 0; panel.classList.add('show'); panelMore(); } }, RM ? 150 : 900);
    }
    function overview() {
      sel = -1; root.classList.remove('focus'); panel.classList.remove('show');
      OBJ.forEach((p) => p.el.classList.remove('on'));
      terrainMat.uniforms.focusOn.value = 0; routeMat.uniforms.prog.value = 0;
      flyTo(OVER.pos, OVER.target, 1.6);
    }
    $('back').onclick = overview;
    $('next').onclick = () => select((sel + 1) % OBJ.length);

    // ---------- guided tour (the route always opens in tour mode)
    let introDone = false;
    const DWELL = 5.5; // seconds at each stop once the panel is open
    const CAPTIONS = [
      'This is where it started: the products I’ve shipped, from Ring to RoboKiller, and the roles behind them.',
      'Wilson Peak holds the things I build for fun and to learn, like résumés as products and games for my kids.',
      'Down in Navajo Basin is the studio I run, Rational Mind Studios, where I make small, useful software experiments.',
      'Mt. Wilson is the summit and the end of the route. If you got this far, say hello.',
    ];
    const TOUR_INTRO = RM ? 'Four stops, one for each part of this site. Press Play when you’re ready.'
      : 'A short flight over the four parts of this site. Drag, or press any key, to take over.';
    const TOUR_END = 'That’s the whole route. Drag to look around, or pick any objective to go back to it.';
    const tourBox = $('tour');
    const tStepEl = $('tStep'), tNameEl = $('tName'), tCapEl = $('tCap');
    const tPlay = $<HTMLButtonElement>('tPlay'), tPrev = $<HTMLButtonElement>('tPrev'), tNext = $<HTMLButtonElement>('tNext');
    const segs = [...root.querySelectorAll<HTMLElement>('#tSeg i')];
    // step: -1 = intro (before stop 1), 0..3 = stops, 4 = finale
    const tour = { on: true, step: -1, paused: RM, el: 0 };

    const pCount = $('pCount');
    function setProgress() { // the one place stop progress is drawn; fed by the auto-advance timer
      const f = Math.min(1, tour.el / DWELL), s = tour.step;
      if (s >= 0 && s < OBJ.length) (segs[s].firstChild as HTMLElement).style.width = f * 100 + '%';
      pCount.style.transform = `scaleX(${RM ? 1 : 1 - f})`; // reduced motion: static full bar
    }
    function panelMore() { panel.classList.toggle('more', panel.scrollHeight - panel.scrollTop - panel.clientHeight > 4); }
    on(panel, 'scroll', panelMore); on(window, 'resize', panelMore);
    function tourRender() {
      const s = tour.step, end = s >= OBJ.length;
      tourBox.classList.toggle('end', end);
      tourBox.classList.toggle('paused', tour.paused);
      tStepEl.textContent = s < 0 ? 'Guided tour' : end ? 'Route complete' : `Stop ${s + 1}/${OBJ.length}${tour.paused ? ' · paused' : ''}`;
      tNameEl.textContent = s < 0 ? `${OBJ.length} stops${tour.paused ? ' · paused' : ''}` : end ? '' : `${OBJ[s].sec.title} · ${OBJ[s].name}`;
      tCapEl.textContent = s < 0 ? TOUR_INTRO : end ? TOUR_END : CAPTIONS[s];
      segs.forEach((g, i) => { g.classList.toggle('cur', i === s); (g.firstChild as HTMLElement).style.width = (end || i < s ? 100 : i === s ? Math.min(100, (tour.el / DWELL) * 100) : 0) + '%'; });
      root.classList.toggle('tour-paused', tour.paused);
      setProgress();
      const play = tour.paused;
      tPlay.innerHTML = play ? '▶<span>Play</span>' : '❚❚<span>Pause</span>';
      tPlay.setAttribute('aria-label', play ? 'Play tour' : 'Pause tour');
      tPrev.disabled = s <= 0;
    }
    function tourGo(k: number) {
      tour.step = Math.max(0, Math.min(OBJ.length, k)); tour.el = 0;
      if (tour.step >= OBJ.length) overview(); else select(tour.step);
      tourRender();
    }
    function setPaused(p: boolean) { tour.paused = p; tourRender(); }
    function tourPause() { if (tour.on && !tour.paused && tour.step < OBJ.length) setPaused(true); }
    function togglePlay() {
      if (tour.step >= OBJ.length) return;
      if (tour.step < 0) { tour.paused = false; tourGo(0); return; }
      setPaused(!tour.paused);
    }
    function startGuided() {
      tour.on = true; root.classList.add('touring'); tourBox.hidden = false;
      tour.paused = false; tourGo(0);
    }
    function exitTour() {
      tour.on = false; root.classList.remove('touring'); tourBox.hidden = true;
      if (sel < 0 && !tw) C.autoRotate = true;
      const f = panel.classList.contains('show') ? $('back') : $('tourGo');
      f.focus({ preventScroll: true });
    }
    tPlay.onclick = togglePlay;
    tNext.onclick = () => tourGo(tour.step + 1);
    tPrev.onclick = () => tourGo(tour.step - 1);
    $('tExit').onclick = exitTour;
    $('tFree').onclick = exitTour;
    $('tReplay').onclick = () => { tour.paused = false; tourGo(0); };
    $('tourGo').onclick = startGuided;
    C.addEventListener('start', tourPause); // user orbit / zoom takes over
    on($('pLinks'), 'pointerdown', tourPause);
    on($('pLinks'), 'focusin', tourPause);
    root.classList.add('touring'); tourBox.hidden = false; tourRender();

    on(window, 'keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === ' ' || e.key === 'Enter') && (e.target as Element | null)?.closest?.('button, a')) return; // native activation
      const n = +e.key;
      if (tour.on) {
        if (e.key === ' ') { e.preventDefault(); togglePlay(); return; }
        if (e.key === 'ArrowRight') { tourGo(tour.step + 1); return; }
        if (e.key === 'ArrowLeft') { if (tour.step > 0) tourGo(tour.step - 1); return; }
        if (e.key === 'Escape') { exitTour(); overview(); return; }
        if (n >= 1 && n <= OBJ.length) { tourGo(n - 1); setPaused(true); return; }
        tourPause(); return;
      }
      if (e.key === 'Escape') overview();
      if (n >= 1 && n <= OBJ.length) select(n - 1);
    });

    // cursor readout
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), curEl = $('cur');
    on(R.domElement, 'pointermove', (e: PointerEvent) => {
      mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObject(terrain)[0];
      if (hit) { const ll = toLatLon(hit.point.x, hit.point.z); curEl.textContent = `${ll.lat.toFixed(4)}N ${Math.abs(ll.lon).toFixed(4)}W · ${Math.round(heightAt(hit.point.x, hit.point.z) * 3.28084).toLocaleString()} FT`; }
    });

    function resize() {
      if (!innerWidth || !innerHeight) return;
      R.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.fov = innerWidth < 760 ? 55 : 40;
      camera.updateProjectionMatrix();
    }
    on(window, 'resize', resize); resize();

    // intro: start low from the north (the photo's viewpoint), then rise to the table view
    const MW = OBJ[3].w;
    camera.position.set(MW.x + 0.6, MW.y - 0.6, MW.z - 9.5);
    C.target.copy(MW);
    C.update();

    // pins: project, then nudge labels in screen space so they don't sit on each
    // other, the tour bar or the open panel. The leader line stretches to follow.
    type Rect = { x: number; y: number; r: number; b: number };
    const GAP = 6, heroEl = root.querySelector<HTMLElement>('.hero')!, hudEl = root.querySelector<HTMLElement>('.hud')!;
    const overlap = (a: Rect, b: Rect) => a.x < b.r && a.r > b.x && a.y < b.b && a.b > b.y;
    function rectOf(el: Element): Rect { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, r: b.right, b: b.bottom }; }
    function obstacleRects() {
      const out: Rect[] = [];
      const add = (el: Element) => { const b = el.getBoundingClientRect(); out.push({ x: b.left - GAP, y: b.top - GAP, r: b.right + GAP, b: b.bottom + GAP }); };
      if (!tourBox.hidden) add(tourBox);
      if (panel.classList.contains('show')) add(panel);
      if (!root.classList.contains('focus') && tourBox.hidden) add(heroEl); // headline in free overview
      if (getComputedStyle(hudEl).display !== 'none') add(hudEl);
      return out;
    }
    function layoutPins() {
      const W = innerWidth, H = innerHeight, minY = 58, placed = obstacleRects();
      const order = OBJ.map((o, k) => k).sort((a, b) => (+OBJ[b].el.classList.contains('on') - +OBJ[a].el.classList.contains('on')) || a - b);
      for (const k of order) {
        const o = OBJ[k];
        o.top.copy(o.w); o.top.y += o.lift * Math.min(1, Math.max(0.3, camera.position.distanceTo(o.w) / 13));
        const top = project(o.top), g = project(o.w);
        const w = o.el.offsetWidth, h = o.el.offsetHeight;
        // desired box: anchored 12px in from its left edge, sitting on the leader top
        let x = top.x - 12, y = top.y - h, buried = false;
        if (top.ok) {
          // keep the label on screen; if its place is off screen the leader points the way
          x = Math.max(4, Math.min(W - 4 - w, x)); y = Math.max(minY, Math.min(H - 4 - h, y));
          for (let it = 0; it < 7; it++) {
            const hit = placed.find((p) => overlap({ x, y, r: x + w, b: y + h }, p));
            if (!hit) break;
            if (it === 6) { buried = true; break; }
            // smallest move that clears this rect and stays on screen
            const c = ([[0, hit.y - GAP - (y + h)], [0, hit.b + GAP - y], [hit.x - GAP - (x + w), 0], [hit.r + GAP - x, 0]] as [number, number][])
              .filter(([dx, dy]) => (dx ? x + dx >= 4 && x + dx + w <= W - 4 : y + dy >= minY && y + dy + h <= H - 4))
              .sort((p, q) => Math.hypot(...p) - Math.hypot(...q));
            if (!c.length) { buried = true; break; }
            x += c[0][0]; y += c[0][1];
          }
          // no clear spot: hide this label for the frame rather than draw it under something
          if (o.el.classList.contains('on')) buried = false;
          if (!buried) placed.push({ x: x - GAP, y: y - GAP, r: x + w + GAP, b: y + h + GAP });
        }
        // ease the nudge so labels glide instead of popping
        const dx = x - (top.x - 12), dy = y - (top.y - h);
        o.nx = o.nx == null ? dx : o.nx + (dx - o.nx) * (RM ? 1 : 0.25);
        o.ny = o.ny == null ? dy : o.ny + (dy - o.ny) * (RM ? 1 : 0.25);
        const bx = top.x - 12 + o.nx, by = top.y - h + o.ny;
        const show = top.ok && !buried;
        o.el.style.opacity = show ? '1' : '0'; o.el.style.pointerEvents = show ? '' : 'none';
        o.line.style.opacity = o.dot.style.opacity = show ? '' : '0';
        o.el.style.transform = `translate(${bx}px, ${by}px)`;
        const ax = bx + 12, ay = by + h; // leader leaves from the box's bottom-left anchor
        o.line.setAttribute('x1', String(ax)); o.line.setAttribute('y1', String(ay)); o.line.setAttribute('x2', String(g.x)); o.line.setAttribute('y2', String(g.y));
        o.line.classList.toggle('hot', o.el.classList.contains('on'));
        o.dot.setAttribute('cx', String(g.x)); o.dot.setAttribute('cy', String(g.y));
      }
    }

    const t0 = performance.now();
    let last = t0;
    const rose = $('rose');
    function loop() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000), t = (now - t0) / 1000;
      last = now;
      terrainMat.uniforms.time.value = t; routeMat.uniforms.time.value = t;
      if (tw) {
        tw.t = Math.min(1, tw.t + dt / tw.dur); const e = easeIO(tw.t);
        camera.position.lerpVectors(tw.p0, tw.p1, e); if (!RM) camera.position.y += Math.sin(tw.t * Math.PI) * 1.2;
        C.target.lerpVectors(tw.t0, tw.t1, e);
        if (tw.t >= 1) { tw = null; C.enabled = true; if (sel < 0) C.autoRotate = !RM; }
      }
      if (tour.on && !tour.paused && !tw) {
        if (tour.step < 0 && introDone) tourGo(0);
        else if (tour.step >= 0 && tour.step < OBJ.length && panel.classList.contains('show')) {
          tour.el += dt;
          if (tour.el >= DWELL) tourGo(tour.step + 1);
          else setProgress();
        }
      }
      C.update();
      R.render(S, camera);
      // overlays
      layoutPins();
      const featBlock = obstacleRects();
      feats.forEach((f) => {
        const q = project(f.w), fw = f.el.offsetWidth, fh = f.el.offsetHeight, r = { x: q.x - 6, y: q.y - fh, r: q.x - 6 + fw, b: q.y };
        f.el.style.transform = `translate(${q.x}px, ${q.y}px) translate(-6px, -100%)`;
        f.el.style.opacity = q.ok && !featBlock.some((b) => overlap(r, b)) && !OBJ.some((o) => o.el.style.opacity === '1' && overlap(r, rectOf(o.el))) ? '1' : '0';
      });
      const az = Math.atan2(camera.position.x - C.target.x, camera.position.z - C.target.z);
      rose.setAttribute('transform', `rotate(${(az * 180) / Math.PI})`);
      raf = requestAnimationFrame(loop);
    }
    loop();
    // no fixed hold: dissolve as soon as the terrain has actually been drawn
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => {
      if (disposed) return;
      $('photo').classList.add('out'); flyTo(OVER.pos, OVER.target, 3.2);
      later(() => { introDone = true; }, RM ? 600 : 3800); // beat on the overview before stop 1
    }); });
  }
}
