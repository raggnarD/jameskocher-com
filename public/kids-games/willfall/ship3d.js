// WillFall — low-poly 3D ships ("Explore" style)
// A tiny flat-shaded mesh renderer on the plain 2D canvas, plus a 3D model for
// every ship in SHIP_SKINS. Explore runs draw these everywhere a ship shows up —
// the belt, the landing and launch, the parked rocket, the shop and the start
// screen previews. Classic keeps the flat 2D ships.
//
// Axes: x = forward (the nose), y = sideways (+y is "down" in the 2D belt),
// z = up. A view is an orthographic camera: yaw about z, then tilted down by its
// elevation. Screen x runs right, screen y runs down, depth grows toward the eye.
//
// Loaded BEFORE game.js — the start screen previews render while game.js boots
// — so nothing at the top level here may touch game.js / planet.js globals.

// ── Views ────────────────────────────────────────────────────────────────────
function makeView(yawDeg, elevDeg) {
    const y = yawDeg * Math.PI / 180, e = elevDeg * Math.PI / 180;
    return { yaw: y, elev: e, c: Math.cos(y), s: Math.sin(y), ce: Math.cos(e), se: Math.sin(e) };
}
const VIEW_BELT = makeView(18, 50);   // the belt: nose to the right, looking down on the flight plane
const VIEW_ISO  = makeView(45, 30);   // matches planet-iso.js (tile 64×32 ⇒ 30° elevation)

function lerpView(a, b, t) {
    const y = a.yaw + (b.yaw - a.yaw) * t, e = a.elev + (b.elev - a.elev) * t;
    return { yaw: y, elev: e, c: Math.cos(y), s: Math.sin(y), ce: Math.cos(e), se: Math.sin(e) };
}

// Light in view space (screen right, screen down, toward the eye): upper left, in front
const LIGHT_X = -0.45, LIGHT_Y = -0.55, LIGHT_Z = 0.70;

function isExplore() {
    return state.planetStyle !== 'side';
}

// ── Colour ───────────────────────────────────────────────────────────────────
// Flat shading makes a lot of fillStyle strings — cache them by colour and a
// quantised light level. The lift term keeps near-black tiers (Obsidian) visible.
const litCache = new Map();
function litColor(hex, lam) {
    const q = Math.max(0, Math.min(24, Math.round(lam * 24)));
    const key = hex + '|' + q;
    let out = litCache.get(key);
    if (out) return out;
    let h = hex.charAt(0) === '#' ? hex.slice(1) : 'ffffff';
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h.slice(0, 6), 16) || 0;
    const l = q / 24;
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v =>
        Math.max(0, Math.min(255, Math.round(v * (0.38 + 0.78 * l) + 46 * l * l * l))));
    out = `rgb(${ch[0]},${ch[1]},${ch[2]})`;
    litCache.set(key, out);
    return out;
}

function matColor(m, pal) {
    switch (m) {
        case 'accent': case 'glass': return pal.accent || pal.fill;
        case 'trim':   return pal.trim || pal.accent || pal.fill;
        case 'dome':   return pal.dome || pal.fill;
        case 'metal':  return '#8b93a7';
        case 'dark':   return '#2a2f3a';
        default:       return pal.fill;
    }
}

// ── Mesh building ────────────────────────────────────────────────────────────
// A part is { v: [[x,y,z]], f: [{ i: [vertex idx], m: material, d: dim }], bias }.
// Parts are convex (or close), so after back-face culling a part's own faces
// never overlap and only the parts need depth-sorting.

// Normals (Newell's method) pointing away from the part's centre. Builders
// don't have to care about winding.
function finishPart(P) {
    let cx = 0, cy = 0, cz = 0;
    for (const p of P.v) { cx += p[0]; cy += p[1]; cz += p[2]; }
    cx /= P.v.length; cy /= P.v.length; cz /= P.v.length;
    P.f = P.f.filter(face => {
        let nx = 0, ny = 0, nz = 0, fx = 0, fy = 0, fz = 0;
        const k = face.i.length;
        for (let j = 0; j < k; j++) {
            const a = P.v[face.i[j]], b = P.v[face.i[(j + 1) % k]];
            nx += (a[1] - b[1]) * (a[2] + b[2]);
            ny += (a[2] - b[2]) * (a[0] + b[0]);
            nz += (a[0] - b[0]) * (a[1] + b[1]);
            fx += a[0]; fy += a[1]; fz += a[2];
        }
        const len = Math.hypot(nx, ny, nz);
        if (len < 1e-6) return false;
        nx /= len; ny /= len; nz /= len;
        if (nx * (fx / k - cx) + ny * (fy / k - cy) + nz * (fz / k - cz) < 0) {
            face.i.reverse();
            nx = -nx; ny = -ny; nz = -nz;
        }
        face.n = [nx, ny, nz];
        return true;
    });
    P.bias = P.bias || 0;
    return P;
}

// Cross-sections along x. Each section is { x, pts: [[y, z], …], mat? } with the
// points in ring order; a one-point section is a tip. Neighbouring rings must
// have the same point count (or one of them be a tip).
function loft(sections, mat, bias) {
    const P = { v: [], f: [], bias };
    const rings = sections.map(s => s.pts.map(([y, z]) => P.v.push([s.x, y, z]) - 1));
    for (let k = 0; k < rings.length - 1; k++) {
        const A = rings[k], B = rings[k + 1], m = sections[k].mat || mat;
        if (A.length === 1 && B.length === 1) continue;
        if (A.length === 1) {
            for (let j = 0; j < B.length; j++) P.f.push({ i: [A[0], B[j], B[(j + 1) % B.length]], m });
        } else if (B.length === 1) {
            for (let j = 0; j < A.length; j++) P.f.push({ i: [A[j], A[(j + 1) % A.length], B[0]], m });
        } else {
            for (let j = 0; j < A.length; j++) {
                const j1 = (j + 1) % A.length;
                P.f.push({ i: [A[j], A[j1], B[j1], B[j]], m });
            }
        }
    }
    const first = rings[0], last = rings[rings.length - 1];
    if (first.length > 2) P.f.push({ i: first.slice(), m: mat });
    if (last.length > 2) P.f.push({ i: last.slice(), m: sections[sections.length - 1].mat || mat });
    return finishPart(P);
}

// A flat convex polygon extruded into a slab. axis 'z': poly is (x, y), thick in
// z. axis 'y': poly is (x, z), thick in y — for upright fins.
function slab(poly, a0, a1, mat, axis = 'z', opts = {}) {
    const P = { v: [], f: [], bias: opts.bias };
    const pt = axis === 'y' ? (u, v, w) => [u, w, v] : (u, v, w) => [u, v, w];
    const n = poly.length;
    for (const [u, v] of poly) P.v.push(pt(u, v, a0));
    for (const [u, v] of poly) P.v.push(pt(u, v, a1));
    P.f.push({ i: poly.map((_, j) => j), m: mat });
    P.f.push({ i: poly.map((_, j) => n + j), m: mat });
    for (let j = 0; j < n; j++) {
        const j1 = (j + 1) % n;
        P.f.push({ i: [j, j1, n + j1, n + j], m: (opts.sideMat && opts.sideMat(j)) || mat });
    }
    return finishPart(P);
}

function box(x0, x1, y0, y1, z0, z1, mat, opts = {}) {
    // Side 2 of this rectangle is the back (x0) face — handy for nozzles
    return slab([[x1, y0], [x1, y1], [x0, y1], [x0, y0]], z0, z1, mat, 'z', {
        bias: opts.bias,
        sideMat: opts.backMat ? j => (j === 2 ? opts.backMat : null) : null
    });
}

// Spun around a vertical axis through (cx, cy). profile: [[radius, z], …] bottom
// to top; radius 0 is a tip. mats[k] colours the band between rings k and k+1.
function lathe(profile, segs, mat, opts = {}) {
    const cx = opts.cx || 0, cy = opts.cy || 0, sx = opts.sx || 1, sy = opts.sy || 1;
    const sections = profile.map(([r, z], k) => ({
        x: z,
        pts: r === 0 ? [[0, 0]] : Array.from({ length: segs }, (_, j) => {
            const a = (j / segs) * Math.PI * 2;
            return [r * Math.cos(a), r * Math.sin(a)];
        }),
        mat: opts.mats ? opts.mats[k] : null
    }));
    // Build along x with loft, then swing x → z
    const P = loft(sections, mat, opts.bias);
    P.v = P.v.map(([z, a, b]) => [cx + a * sx, cy + b * sy, z]);
    for (const f of P.f) delete f.n;
    return finishPart(P);
}

const mirrorY = poly => poly.map(([x, y]) => [x, -y]).reverse();

// Regular ring of `n` points in the (y, z) plane
function ring(n, ry, rz, z0 = 0, phase = Math.PI / n) {
    return Array.from({ length: n }, (_, j) => {
        const a = phase + (j / n) * Math.PI * 2;
        return [ry * Math.cos(a), z0 + rz * Math.sin(a)];
    });
}

// ── Drawing ──────────────────────────────────────────────────────────────────
function poseRotator(pose) {
    const cr = Math.cos(pose.roll || 0),  sr = Math.sin(pose.roll || 0);
    const cp = Math.cos(pose.pitch || 0), sp = Math.sin(pose.pitch || 0);
    const cy = Math.cos(pose.yaw || 0),   sy = Math.sin(pose.yaw || 0);
    // roll about the nose axis, then pitch the nose up, then yaw
    return (v) => {
        const y1 = v[1] * cr - v[2] * sr, z1 = v[1] * sr + v[2] * cr;
        const x2 = v[0] * cp - z1 * sp,   z2 = v[0] * sp + z1 * cp;
        return [x2 * cy - y1 * sy, x2 * sy + y1 * cy, z2];
    };
}

// World point (already posed and scaled) → { x, y, depth } around the origin
function viewPoint(view, x, y, z) {
    const yr = x * view.s + y * view.c;
    return { x: x * view.c - y * view.s, y: yr * view.se - z * view.ce, depth: yr * view.ce + z * view.se };
}

function tracePoly(c, sv, idx) {
    c.moveTo(sv[idx[0]].x, sv[idx[0]].y);
    for (let j = 1; j < idx.length; j++) c.lineTo(sv[idx[j]].x, sv[idx[j]].y);
    c.closePath();
}

// Draws parts centred on the canvas origin.
// o: { view, pose, scale, pal, stroke (edge colour or null), sortFaces, patternZ }
function drawMeshParts(c, parts, o) {
    const view = o.view || VIEW_BELT;
    const rot = poseRotator(o.pose || {});
    const s = o.scale || 1;
    const pal = o.pal;

    const drawn = [];
    for (const P of parts) {
        const sv = new Array(P.v.length);
        let dsum = 0;
        for (let i = 0; i < P.v.length; i++) {
            const w = rot(P.v[i]);
            sv[i] = viewPoint(view, w[0] * s, w[1] * s, w[2] * s);
            dsum += sv[i].depth;
        }
        drawn.push({ P, sv, depth: dsum / P.v.length + P.bias * s });
    }
    drawn.sort((a, b) => a.depth - b.depth);

    c.lineJoin = 'round';
    for (const { P, sv } of drawn) {
        const faces = [];
        for (const f of P.f) {
            const n = rot(f.n);
            const yr = n[0] * view.s + n[1] * view.c;
            const tow = yr * view.ce + n[2] * view.se;
            if (tow <= 0.01) continue;
            const nsx = n[0] * view.c - n[1] * view.s;
            const nsy = yr * view.se - n[2] * view.ce;
            let lam = Math.max(0, Math.min(1, LIGHT_X * nsx + LIGHT_Y * nsy + LIGHT_Z * tow)) * (f.d || 1);
            if (f.m === 'glass') lam = Math.min(1, lam + 0.25);
            let depth = 0;
            if (o.sortFaces) { for (const k of f.i) depth += sv[k].depth; depth /= f.i.length; }
            faces.push({ f, lam, depth });
        }
        if (!faces.length) continue;
        if (o.sortFaces) faces.sort((a, b) => a.depth - b.depth);

        for (const { f, lam } of faces) {
            const col = litColor(matColor(f.m, pal), lam);
            c.fillStyle = col;
            c.beginPath();
            tracePoly(c, sv, f.i);
            c.fill();
            if (!o.stroke) {                // rocks: seal the hairline seams between faces
                c.strokeStyle = col;
                c.lineWidth = 0.8;
                c.stroke();
            }
        }

        // Paint patterns are drawn in ship-local (x, y) — the same ±32 × ±22 units
        // as the 2D hulls. An orthographic projection maps that plane with a plain
        // affine transform, so each pattern lands on the 3D hull unchanged.
        const hull = faces.filter(e => e.f.m === 'hull');
        if (pal.pattern && hull.length && o.patternZ !== undefined) {
            const pz = o.patternZ;
            const at = (x, y) => { const w = rot([x, y, pz]); return viewPoint(view, w[0] * s, w[1] * s, w[2] * s); };
            const O = at(0, 0), X = at(1, 0), Y = at(0, 1);
            const ax = X.x - O.x, ay = X.y - O.y, bx = Y.x - O.x, by = Y.y - O.y;
            if (Math.abs(ax * by - ay * bx) > 0.08 * s * s) {
                c.save();
                c.beginPath();
                for (const e of hull) tracePoly(c, sv, e.f.i);
                c.clip();
                c.transform(ax, ay, bx, by, O.x, O.y);
                pal.pattern(c, pal);
                c.restore();
                // Re-apply the shading the pattern painted over
                for (const e of hull) {
                    c.fillStyle = `rgba(0,0,0,${((1 - e.lam) * 0.45).toFixed(3)})`;
                    c.beginPath();
                    tracePoly(c, sv, e.f.i);
                    c.fill();
                }
            }
        }

        if (o.stroke) {
            c.strokeStyle = o.stroke;
            c.lineWidth = o.lineWidth || 1;
            c.globalAlpha *= 0.85;
            c.beginPath();
            for (const e of faces) tracePoly(c, sv, e.f.i);
            c.stroke();
            c.globalAlpha /= 0.85;
        }
    }
}

// ── Ship models ──────────────────────────────────────────────────────────────
// SHIP_MODELS[i] is SHIP_SKINS[i] (game.js) in 3D — keep the two lists in the
// same order. Sized to the 2D footprint: nose at x = +28, tail at −28, about
// ±18 across. `engines` are [x, y, z, radius] nozzle points for the flame.
const SHIP_MODEL_BUILDERS = [
    // ── 0 · Viper ── swept-wing fighter
    () => {
        const hex = (w, top, bot) => [[0, top], [w, top * 0.5], [w, bot * 0.55], [0, bot], [-w, bot * 0.55], [-w, top * 0.5]];
        const wing = [[8, 4], [-17, 18], [-25, 18], [-23, 4]];
        return {
            patternZ: 3,
            flame: ['255,80,0', '255,190,40'],
            engines: [[-29, 0, 0, 4]],
            parts: [
                loft([
                    { x: 28, pts: [[0, 0.5]] },
                    { x: 10, pts: hex(5, 5, -3.5) },
                    { x: -14, pts: hex(7, 6, -4) },
                    { x: -26, pts: hex(6, 5, -3.5) }
                ], 'hull'),
                slab(wing, -1.4, 0.8, 'hull'),
                slab(mirrorY(wing), -1.4, 0.8, 'hull'),
                loft([
                    { x: 18, pts: [[0, 4]] },
                    { x: 10, pts: [[0, 8.5], [3, 7], [3.6, 4.2], [-3.6, 4.2], [-3, 7]] },
                    { x: 1, pts: [[0, 8], [3, 6.8], [4, 4.8], [-4, 4.8], [-3, 6.8]] },
                    { x: -5, pts: [[0, 5.5]] }
                ], 'glass', 2),
                slab([[-12, 5], [-24, 14], [-28, 14], [-26, 4]], -0.9, 0.9, 'hull', 'y', { bias: 1 }),
                box(-30, -25, -3.5, 3.5, -2.5, 2.5, 'metal', { backMat: 'dark' })
            ]
        };
    },

    // ── 1 · Falcon ── wide delta bomber
    () => {
        const tip = [[4, 12], [0, 18], [-24, 18], [-20, 12]];
        const fin = [[-12, 2], [-21, 9], [-25, 9], [-23, 2]];
        const pod = side => box(-28, -15, side > 0 ? 5 : -13, side > 0 ? 13 : -5, -3.2, 3, 'trim', { backMat: 'dark', bias: 1 });
        return {
            patternZ: 2.5,
            flame: ['255,120,0', '255,225,70'],
            engines: [[-28, 9, 0, 4], [-28, -9, 0, 4]],
            parts: [
                slab([[28, 0], [4, 12], [-20, 12], [-20, -12], [4, -12]], -2, 2.5, 'hull'),
                slab(tip, -1.4, 1.4, 'hull'),
                slab(mirrorY(tip), -1.4, 1.4, 'hull'),
                loft([
                    { x: 22, pts: [[0, 2.5]] },
                    { x: 6, pts: [[0, 6], [5, 2.5], [-5, 2.5]] },
                    { x: -20, pts: [[0, 5.5], [6, 2.5], [-6, 2.5]] }
                ], 'hull', 0.5),
                loft([
                    { x: 18, pts: [[0, 5]] },
                    { x: 11, pts: [[0, 9], [3, 7.8], [4, 5.5], [-4, 5.5], [-3, 7.8]] },
                    { x: 4, pts: [[0, 6.5]] }
                ], 'glass', 2),
                pod(1), pod(-1),
                slab(fin.map(([x, z]) => [x, z + 1]), 11.2, 12.8, 'hull', 'y', { bias: 1 }),
                slab(fin.map(([x, z]) => [x, z + 1]), -12.8, -11.2, 'hull', 'y', { bias: 1 })
            ]
        };
    },

    // ── 2 · Dart ── needle interceptor with tail fins
    () => {
        const fin = [[-6, 3], [-12, 15], [-17, 15], [-19, 3]];
        return {
            patternZ: 3,
            flame: ['0,200,80', '140,255,190'],
            engines: [[-31, 0, 0, 2.8]],
            parts: [
                loft([
                    { x: 28, pts: [[0, 0]] },
                    { x: 14, pts: ring(8, 3.6, 3.2) },
                    { x: -14, pts: ring(8, 4.6, 4.0) },
                    { x: -28, pts: ring(8, 3.2, 2.8) }
                ], 'hull'),
                slab(fin, -0.8, 0.8, 'hull'),
                slab(mirrorY(fin), -0.8, 0.8, 'hull'),
                slab([[-12, 3], [-23, 12], [-28, 12], [-27, 2]], -0.7, 0.7, 'hull', 'y', { bias: 1 }),
                loft([
                    { x: 21, pts: [[0, 2.6]] },
                    { x: 15, pts: [[0, 5], [2.2, 4], [2.8, 2.4], [-2.8, 2.4], [-2.2, 4]] },
                    { x: 7, pts: [[0, 3.8]] }
                ], 'glass', 2),
                loft([
                    { x: -27.5, pts: ring(8, 3.1, 2.7) },
                    { x: -31, pts: ring(8, 2.4, 2.1) }
                ], 'metal')
            ]
        };
    },

    // ── 3 · Saucer ── alien disc scout
    () => {
        const lights = [];
        for (let j = 0; j < 10; j++) {
            const a = (j / 10) * Math.PI * 2;
            lights.push({ p: [23.8 * Math.cos(a), 23.8 * Math.sin(a) * 0.8, 0], n: [Math.cos(a), Math.sin(a), 0] });
        }
        return {
            flat: true,        // a disc never stands on its tail — it lands and lifts off level
            patternZ: 3,
            flame: ['140,0,255', '210,120,255'],
            engines: [[-23.5, 0, 0, 4]],
            lights,
            parts: [
                lathe([[8, -5], [20, -3.2], [23.5, -0.8], [23.5, 0.8], [20, 2.8], [11, 4.6]], 16, 'hull',
                      { sy: 0.8, mats: ['hull', 'hull', 'accent', 'hull', 'hull'] }),
                lathe([[10, 4.2], [9.4, 7.5], [7, 10.5], [3.6, 12.6], [0, 13.2]], 12, 'dome',
                      { cx: 2, sy: 0.9, mats: ['dome', 'glass', 'dome', 'dome'], bias: 3 })
            ]
        };
    }
];

const shipModelCache = [];
function shipModel(idx) {
    if (!shipModelCache[idx]) shipModelCache[idx] = SHIP_MODEL_BUILDERS[idx]();
    return shipModelCache[idx];
}

function drawShipFlames(c, model, rot, view, s) {
    const fl = 0.6 + Math.random() * 0.4;
    const back = rot([-1, 0, 0]);
    const d = viewPoint(view, back[0], back[1], back[2]);   // screen direction of "aft"
    const dl = Math.hypot(d.x, d.y) || 1;
    for (const [x, y, z, r] of model.engines) {
        const w = rot([x, y, z]);
        const p = viewPoint(view, w[0] * s, w[1] * s, w[2] * s);
        const len = (8 + 16 * dl) * fl * s;
        const tx = p.x + (d.x / dl) * len, ty = p.y + (d.y / dl) * len;
        const px = (-d.y / dl) * r * s, py = (d.x / dl) * r * s;

        const g = c.createLinearGradient(p.x, p.y, tx, ty);
        g.addColorStop(0, `rgba(${model.flame[1]},${fl})`);
        g.addColorStop(1, `rgba(${model.flame[0]},0)`);
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(p.x + px, p.y + py);
        c.lineTo(tx, ty);
        c.lineTo(p.x - px, p.y - py);
        c.closePath();
        c.fill();

        const glow = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2 * s);
        glow.addColorStop(0, `rgba(${model.flame[1]},${0.55 * fl})`);
        glow.addColorStop(1, `rgba(${model.flame[0]},0)`);
        c.fillStyle = glow;
        c.beginPath(); c.arc(p.x, p.y, r * 2 * s, 0, Math.PI * 2); c.fill();
    }
}

// The 3D twin of drawShipSkin(): same palette routing (equipped paint, or `pal`
// as a shop preview override), drawn around the canvas origin.
// pose: { yaw, pitch, roll, view, scale }
function drawShip3D(c, thrusting, skinIdx, pal, pose = {}) {
    const idx = skinIdx === undefined ? state.shipSkin : skinIdx;
    const skin = SHIP_SKINS[idx];
    const palette = pal ||
        (typeof activePalette === 'function' ? activePalette(skin) : skin.palette);
    const model = shipModel(idx);
    if (model.flat && pose.pitch) pose = Object.assign({}, pose, { pitch: 0 });
    const view = pose.view || VIEW_BELT;
    const s = pose.scale || 1;
    const rot = poseRotator(pose);

    c.save();
    if (thrusting) drawShipFlames(c, model, rot, view, s);
    drawMeshParts(c, model.parts, {
        view, pose, scale: s, pal: palette,
        stroke: palette.stroke, lineWidth: 1, patternZ: model.patternZ
    });
    if (model.lights) {
        const blink = Math.floor(Date.now() / 180);
        model.lights.forEach((l, j) => {
            const n = rot(l.n);
            const nv = viewPoint(view, n[0], n[1], n[2]);
            if (nv.depth <= 0.05) return;
            const w = rot(l.p);
            const p = viewPoint(view, w[0] * s, w[1] * s, w[2] * s);
            c.fillStyle = (j + blink) % 3 === 0 ? '#ffffff' : '#fff1a0';
            c.beginPath(); c.arc(p.x, p.y, 1.5 * s, 0, Math.PI * 2); c.fill();
        });
    }
    c.restore();
}

// Every ship render outside the belt goes through here. Classic keeps the 2D
// ship turned by `angle`; Explore draws the 3D model in `pose`.
// o: { angle, pose, skinIdx, pal }
function drawShipStyled(c, thrusting, o = {}) {
    if (!isExplore()) {
        if (o.angle) c.rotate(o.angle);
        drawShipSkin(c, thrusting, o.skinIdx, o.pal);
        return;
    }
    drawShip3D(c, thrusting, o.skinIdx, o.pal, o.pose || {});
}
