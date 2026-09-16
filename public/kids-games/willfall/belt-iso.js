// WillFall — isometric asteroid belt ("Explore" style)
// The same belt as Classic — same ship, rocks, hitboxes and camera, all still
// simulated on the flat 2D plane in game.js — drawn through a 3D camera
// (VIEW_BELT in ship3d.js) with low-poly rocks and the 3D ship. A faint grid
// below the flight plane carries a footprint for every rock and for the ship,
// which is what makes "will that one hit me?" readable from above.
//
// Loaded AFTER game.js — cross-file references stay inside function bodies.

// ── Tunables ─────────────────────────────────────────────────────────────────
const BELT_PIVOT_X = 120;          // the ship's fixed world x (state.ship.x)…
const BELT_PIVOT_SX = 150;         // …and the screen x it sits at when centred
const BELT_PLANE_DROP = 70;        // how far below the flight plane the grid lies
const BELT_GRID = 80;              // grid spacing (world px)
const BELT_GRID_SPEED = 160;       // grid scroll px/s at full thrust
const BELT_BANK = 0.4;             // radians the ship rolls while steering
const BELT_BAND_MARGIN = 90;       // world px of rock-spawning sky beyond the visible corners
const BELT_ROCK_LOD = 28;          // rocks at least this big get the 80-face mesh

const beltIso = { bank: 0, gridX: 0, lat: null };

// ─────────────────────────────────────────────────────────────────────────────
// Projection — world (x, y, z) → screen, pivoting on the ship's lane
// ─────────────────────────────────────────────────────────────────────────────
function beltCamMid(camY) {
    return (camY === undefined ? state.camY : camY) + CANVAS_H / 2;
}

function beltIsoProject(x, y, z, camY) {
    const p = viewPoint(VIEW_BELT, x - BELT_PIVOT_X, y - beltCamMid(camY), z);
    return { x: BELT_PIVOT_SX + p.x, y: CANVAS_H / 2 + p.y, depth: p.depth };
}

// Screen x of a flight-plane point. Classic draws x as-is.
function beltScreenX(x, y) {
    return isExplore() ? beltIsoProject(x, y, 0).x : x;
}

// The world x that lands at screen x `sx` in row `y` — rocks spawn and despawn
// at the visible edge of their own row.
function beltWorldXAtScreen(sx, y) {
    if (!isExplore()) return sx;
    const v = VIEW_BELT;
    return BELT_PIVOT_X + (sx - BELT_PIVOT_SX + (y - beltCamMid()) * v.s) / v.c;
}

// Sideways (y) span of the flight plane the screen shows, relative to the
// camera middle. The view is fixed, so it's worked out once.
function beltLatBounds() {
    if (beltIso.lat) return beltIso.lat;
    const v = VIEW_BELT;
    let min = Infinity, max = -Infinity;
    for (const sx of [0, CANVAS_W]) {
        for (const sy of [0, CANVAS_H]) {
            const xr = sx - BELT_PIVOT_SX, yr = (sy - CANVAS_H / 2) / v.se;
            const dy = -xr * v.s + yr * v.c;
            min = Math.min(min, dy);
            max = Math.max(max, dy);
        }
    }
    beltIso.lat = { min, max };
    return beltIso.lat;
}

function beltIsoBandTop() {
    return beltCamMid() + beltLatBounds().min - BELT_BAND_MARGIN;
}

function beltIsoBandHeight() {
    const b = beltLatBounds();
    return b.max - b.min + 2 * BELT_BAND_MARGIN;
}

// Where the ship is on screen right now, in either style — the descent starts here
function shipScreenPos() {
    if (!isExplore()) return { x: state.ship.x, y: shipScreenY() };
    return beltIsoProject(state.ship.x, state.ship.y, 0);
}

// Where the next belt's ship will sit — the ascent eases into this
function beltLaunchScreenPos() {
    if (!isExplore()) return { x: BELT_PIVOT_X, y: CANVAS_H / 2 };
    return beltIsoProject(BELT_PIVOT_X, CANVAS_H / 2, 0, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Update — visual only; the simulation is game.js's
// ─────────────────────────────────────────────────────────────────────────────
function beltIsoTick(dt, steer, scrollRate) {
    const target = -steer * BELT_BANK;     // steering toward +y dips that wing
    beltIso.bank += (target - beltIso.bank) * (1 - Math.exp(-dt * 8));
    beltIso.gridX = (beltIso.gridX - BELT_GRID_SPEED * scrollRate * dt) % BELT_GRID;
}

function beltIsoReset() {
    beltIso.bank = 0;
    beltIso.gridX = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rock meshes — a jittered icosphere per rock, built the first time it's drawn
// ─────────────────────────────────────────────────────────────────────────────
const icoCache = [];
function icoBase(subdiv) {
    if (icoCache[subdiv]) return icoCache[subdiv];
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
               [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
        .map(p => { const l = Math.hypot(...p); return p.map(c => c / l); });
    let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4],
             [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8],
             [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let s = 0; s < subdiv; s++) {
        const mid = new Map();
        const m = (a, b) => {
            const key = a < b ? a + ',' + b : b + ',' + a;
            if (!mid.has(key)) {
                const p = v[a].map((c, k) => (c + v[b][k]) / 2);
                const l = Math.hypot(...p);
                mid.set(key, v.push(p.map(c => c / l)) - 1);
            }
            return mid.get(key);
        };
        f = f.flatMap(([a, b, c]) => {
            const ab = m(a, b), bc = m(b, c), ca = m(c, a);
            return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
        });
    }
    icoCache[subdiv] = { v, f };
    return icoCache[subdiv];
}

function beltRockMesh(a) {
    const base = icoBase(a.r < BELT_ROCK_LOD ? 0 : 1);
    const v = base.v.map(p => {
        const j = a.r * (0.78 + Math.random() * 0.34);
        return [p[0] * j, p[1] * j, p[2] * j * 0.85];
    });
    // A few darker faces read as craters
    const f = base.f.map(i => ({ i: i.slice(), m: 'hull', d: Math.random() < 0.18 ? 0.7 : 1 }));
    a.tilt = Math.random() * Math.PI;
    a.tumble = 0.4 + Math.random() * 0.8;
    return finishPart({ v, f });
}

// Unit tetrahedron for explosion shards, scaled per shard
let shardMesh = null;
function beltShardMesh() {
    if (!shardMesh) {
        shardMesh = finishPart({
            v: [[1, 1, 0.8], [-1, -1, 0.8], [-1, 1, -0.8], [1, -1, -0.8]],
            f: [{ i: [0, 1, 2], m: 'hull' }, { i: [0, 3, 1], m: 'hull' },
                { i: [0, 2, 3], m: 'hull' }, { i: [1, 3, 2], m: 'hull' }]
        });
    }
    return shardMesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────
// Transforms the canvas so a circle drawn at the origin lies flat on the
// plane `z` at world (x, y).
function beltPlaneAt(x, y, z) {
    const s = beltIsoProject(x, y, z);
    const v = VIEW_BELT;
    ctx.translate(s.x, s.y);
    ctx.transform(v.c, v.s * v.se, -v.s, v.c * v.se, 0, 0);
}

function drawBeltIso() {
    ctx.fillStyle = '#02020a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const tier = TIERS[state.beltIndex];
    ctx.fillStyle = tier.color + '22';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackdrop({ camY: state.camY });

    drawBeltGrid(tier);

    const ship = state.ship;
    const thrusting = keyHeld('arrowright', 'd') && state.gasMiles > 0;

    // Footprints on the grid — the ship's is its actual hitbox
    ctx.save();
    for (const a of state.asteroids) {
        ctx.save();
        beltPlaneAt(a.x, a.y, -BELT_PLANE_DROP);
        ctx.fillStyle = a.glow + '1c';
        ctx.strokeStyle = a.glow + '40';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, a.r * 0.85, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }
    const m = hitboxMult();
    ctx.save();
    beltPlaneAt(ship.x, ship.y, -BELT_PLANE_DROP);
    ctx.fillStyle = 'rgba(122,168,255,0.16)';
    ctx.strokeStyle = 'rgba(122,168,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, SHIP_W * m / 2, SHIP_H * m / 2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
    // A faint drop line ties the ship to its footprint
    const top = beltIsoProject(ship.x, ship.y, 0), foot = beltIsoProject(ship.x, ship.y, -BELT_PLANE_DROP);
    ctx.strokeStyle = 'rgba(122,168,255,0.25)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(foot.x, foot.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Rocks, shards and the ship, back to front
    const items = [];
    for (const a of state.asteroids) {
        const s = beltIsoProject(a.x, a.y, 0);
        if (s.x < -a.r * 2 || s.x > CANVAS_W + a.r * 2 || s.y < -a.r * 2 || s.y > CANVAS_H + a.r * 2) continue;
        items.push({ depth: s.depth, draw: () => drawBeltRock(a, s) });
    }
    for (const sh of state.shards) {
        const s = beltIsoProject(sh.x, sh.y, 0);
        items.push({ depth: s.depth + (sh.ring ? -1000 : 0), draw: () => drawBeltShard(sh, s) });
    }
    const ss = beltIsoProject(ship.x, ship.y, 0);
    items.push({ depth: ss.depth, draw: () => {
        ctx.save();
        ctx.translate(ss.x, ss.y);
        drawShip3D(ctx, thrusting, undefined, undefined, { roll: beltIso.bank, view: VIEW_BELT });
        ctx.restore();
    } });
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    drawBeltLabels(tier);
}

function drawBeltGrid(tier) {
    const b = beltLatBounds(), mid = beltCamMid();
    const y0 = mid + b.min - 160, y1 = mid + b.max + 160;
    const xs = [beltWorldXAtScreen(-160, y0), beltWorldXAtScreen(CANVAS_W + 160, y0),
                beltWorldXAtScreen(-160, y1), beltWorldXAtScreen(CANVAS_W + 160, y1)];
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const z = -BELT_PLANE_DROP;

    ctx.save();
    ctx.strokeStyle = tier.glow;
    ctx.globalAlpha = 0.09;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor((x0 - beltIso.gridX) / BELT_GRID) * BELT_GRID + beltIso.gridX; x <= x1; x += BELT_GRID) {
        const a = beltIsoProject(x, y0, z), c = beltIsoProject(x, y1, z);
        ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y);
    }
    for (let y = Math.floor(y0 / BELT_GRID) * BELT_GRID; y <= y1; y += BELT_GRID) {
        const a = beltIsoProject(x0, y, z), c = beltIsoProject(x1, y, z);
        ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y);
    }
    ctx.stroke();
    ctx.restore();
}

function drawBeltRock(a, s) {
    if (!a.mesh) a.mesh = beltRockMesh(a);
    ctx.save();
    ctx.translate(s.x, s.y);
    const grd = ctx.createRadialGradient(0, 0, a.r * 0.3, 0, 0, a.r * 1.4);
    grd.addColorStop(0, a.glow + 'aa');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, a.r * 1.4, 0, Math.PI * 2); ctx.fill();
    drawMeshParts(ctx, [a.mesh], {
        view: VIEW_BELT,
        pose: { yaw: a.rot, pitch: a.tilt + a.rot * a.tumble },
        pal: { fill: a.color },
        sortFaces: true
    });
    ctx.restore();
}

function drawBeltShard(sh, s) {
    const t = Math.max(0, sh.life / sh.maxLife);
    ctx.save();
    if (sh.ring) {
        beltPlaneAt(sh.x, sh.y, 0);
        ctx.globalAlpha = t * 0.8;
        ctx.strokeStyle = sh.glow;
        ctx.lineWidth = 2 + 4 * t;
        ctx.beginPath();
        ctx.arc(0, 0, sh.r * (1 + (1 - t) * 2.2), 0, Math.PI * 2);
        ctx.stroke();
    } else {
        ctx.globalAlpha = Math.min(1, t * 1.6);
        ctx.translate(s.x, s.y);
        drawMeshParts(ctx, [beltShardMesh()], {
            view: VIEW_BELT,
            pose: { yaw: sh.rot, pitch: sh.rot * 0.7, roll: sh.r },
            scale: sh.r * 0.8,
            pal: { fill: sh.color }
        });
    }
    ctx.restore();
}
