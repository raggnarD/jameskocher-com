// WillFall — isometric planet surface ("Explore" style, the default)
// An endless tiled world seen from above at an angle. Walk anywhere with the
// arrows / WASD, jump up one-level ledges, and the ground keeps generating in
// every direction as you go. Aliens run at the spaceman; walkers can't climb,
// so high ground is a refuge. Same quota, rewards, sprites and tier palette as
// the classic side-scroller — see planet.js for everything the styles share.
//
// World units: x / y in tiles, z in height levels. The screen is
// isoProject(x, y, z): x runs down-right, y runs down-left, z lifts straight up.
//
// Loaded AFTER game.js and planet.js — cross-file references stay inside
// function bodies.

// ── Tunables ─────────────────────────────────────────────────────────────────
const ISO_TW = 64, ISO_TH = 32;    // tile diamond size (px)
const ISO_LH = 18;                 // px per height level
const ISO_LEVELS = 4;              // rolling terrain heights 0..3
const ISO_CHUNK = 16;              // tiles per chunk side — generated lazily, kept all stage
const ISO_MESA_CHANCE = 0.45;      // share of chunks with a tall rock mesa in them
const ISO_MESA_RISE = 2;           // levels a mesa stands above everything around it
const ISO_MESA_CLEAR = 12;         // tiles from the landing spot before mesas appear
const ISO_MESA_ITEMS = 3;          // crystals waiting on top — the Grav Boots payoff
const ISO_MAX_LEVEL = ISO_LEVELS - 1 + ISO_MESA_RISE;   // tallest tile anywhere
const ISO_NOISE = 0.08;            // terrain noise frequency per tile — lower = broader plateaus
const ISO_NOISE_T0 = 0.33;         // noise value where level 1 starts…
const ISO_NOISE_STEP = 0.12;       // …and the noise span of each level above it
const ISO_FLAT_R = 4;              // tiles around the landing spot kept at level 0
const ISO_CAM_Y = 0.56;            // fraction of canvas height the spaceman sits at

const ISO_MAN_SPEED = 4.5;         // tiles/s (≈200 px/s across the screen, same as Classic)
const ISO_MAN_R = 0.22;            // foot radius (tiles)
const ISO_MAN_LV = 2.4;            // spaceman height in levels (MAN_H / ISO_LH)
const ISO_GRAVITY = 23;            // levels/s²
// levels/s. The apex is ≈1.5 levels, which clears a 1-level ledge but not a
// mesa. One pair of Grav Boots lifts it to ≈2.0 and two to ≈2.5, enough for
// a 2-level mesa.
const ISO_JUMP_V = 8.3;
const ISO_STEP = 0.3;              // highest lip you can walk up without jumping
const ISO_KNOCK = 5;               // tiles/s shove away from an alien that hits you

const ISO_ITEMS_PER_CHUNK = 7;
const ISO_HOVER_CHANCE = 0.3;      // share of crystals floating high enough to need a jump
const ISO_ALIEN_SPEED = 2.0;       // tiles/s at Rock — always slower than the spaceman
const ISO_ALIEN_GAP = 1.7;         // seconds between spawns at Rock
const ISO_ALIEN_R = 0.25;          // alien foot radius (tiles)
const ISO_ALIEN_DESPAWN = 20;      // tiles — further than this and they give up
const ISO_ALIEN_RETREAT = 2.2;     // seconds an alien backs off after landing a hit
const ISO_HOP_V = 7;               // levels/s — a hopper clears one level, never two
const ISO_PAD_DIST = [12, 11, 13, 10, 14];   // tiles ahead the build site is looked for

// Foot samples (unit circle) — collision and "what am I standing on"
const ISO_FOOT = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
                  [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];

const ISO_SURFACE = {
    generate: isoGenerate,
    update: isoUpdate,
    draw: isoDraw,
    prepareLaunch: isoPrepareLaunch,
    launchAnchor: isoLaunchAnchor
};

// ─────────────────────────────────────────────────────────────────────────────
// Projection
// ─────────────────────────────────────────────────────────────────────────────
// The camera stores the raw (pre-offset) screen point it's centred on.
function isoRaw(x, y, z) {
    return { x: (x - y) * (ISO_TW / 2), y: (x + y) * (ISO_TH / 2) - z * ISO_LH };
}

function isoProject(p, x, y, z) {
    return {
        x: (x - y) * (ISO_TW / 2) + CANVAS_W / 2 - p.cam.x,
        y: (x + y) * (ISO_TH / 2) - z * ISO_LH + CANVAS_H * ISO_CAM_Y - p.cam.y
    };
}

// Screen point → world point on the z = 0 plane
function isoUnproject(p, sx, sy) {
    const rx = sx - CANVAS_W / 2 + p.cam.x;
    const ry = sy - CANVAS_H * ISO_CAM_Y + p.cam.y;
    return { x: rx / ISO_TW + ry / ISO_TH, y: ry / ISO_TH - rx / ISO_TW };
}

// ─────────────────────────────────────────────────────────────────────────────
// World generation
// ─────────────────────────────────────────────────────────────────────────────
function isoGenerate(p) {
    const mult = difficultyMult(p.tierIndex);
    Object.assign(p, {
        seed: (Math.random() * 1e9) | 0,
        chunks: new Map(),         // chunk key → { h, v, prop } per-tile arrays
        lastChunkKey: null,        // one-entry cache — most lookups hit the same chunk
        lastChunk: null,
        pal: isoPalette(p.tier),
        alienSpeed: ISO_ALIEN_SPEED * (0.5 + 0.5 * mult),
        alienGap: ISO_ALIEN_GAP / mult,
        alienTimer: 1.5,           // a moment to find your feet before the first one
        alienMax: 3 + Math.floor(p.tierIndex / 2),
        pad: null,                 // { x, y, level } once the quota is met
        launch: null,              // where the rocket lifts off from
        rocket: { x: -1.0, y: 2.0 },   // just screen-left of where he lands
        man: {
            x: 0.5, y: 0.5, z: 0, vz: 0, onGround: true, face: 1, walk: 0,
            invuln: 0, hidden: false,
            kx: 0, ky: 0,          // knockback velocity, decays
            hx: Math.SQRT1_2, hy: -Math.SQRT1_2   // last heading — the build site goes this way
        },
        cam: { x: 0, y: 0 },
        camZ: 0,                   // ground level the camera frames — ignores jumps
        bootHint: 0                // seconds the "need Grav Boots" tip stays up
    });
    const c = isoRaw(p.man.x, p.man.y, 0);
    p.cam.x = c.x;
    p.cam.y = c.y;
}

// Every colour is sampled from Classic's ground gradient: tile tops at the tone
// Classic's surface line sits at, cliff faces further down it. Higher levels
// only lift the top a touch so the tier colour always reads the same.
const ISO_TOP_T = 0.35;            // where Classic's surface line sits in its ground gradient
function isoPalette(tier) {
    return {
        top: Array.from({ length: ISO_MAX_LEVEL + 1 }, (_, L) =>
            [-0.015, 0, 0.015].map(v => groundAt(tier, ISO_TOP_T, Math.min(L, 3) * 0.015 + v))),
        left: groundAt(tier, 0.65),
        right: groundDeep(tier),
        strata: groundAt(tier, 1.25),     // layer lines on a mesa's tall cliffs
        rim: groundRim(tier),
        rock: shade(tier.color, -0.22),
        rockHi: shade(tier.color, -0.05),
        crater: shade(tier.color, -0.1)
    };
}

function isoHash(ix, iy, seed) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

// Smooth value noise in [0, 1)
function isoNoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = isoHash(ix, iy, seed), b = isoHash(ix + 1, iy, seed);
    const c = isoHash(ix, iy + 1, seed), d = isoHash(ix + 1, iy + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Two octaves quantised into terraces. At these settings neighbouring tiles
// almost never differ by more than one level, so every plateau can be climbed.
function isoHeight(seed, tx, ty) {
    const f = ISO_NOISE;
    let n = 0.65 * isoNoise(tx * f, ty * f, seed) +
            0.35 * isoNoise(tx * f * 2.3 + 31.7, ty * f * 2.3 - 11.3, seed + 1);
    // Fade to flat ground around the landing spot
    const d = Math.hypot(tx, ty);
    const t = Math.max(0, Math.min(1, (d - ISO_FLAT_R) / 5));
    n *= t * t * (3 - 2 * t);
    return Math.max(0, Math.min(ISO_LEVELS - 1, Math.floor((n - ISO_NOISE_T0) / ISO_NOISE_STEP) + 1));
}

function isoChunk(p, cx, cy) {
    const key = (cx + 32768) * 65536 + (cy + 32768);
    if (key === p.lastChunkKey) return p.lastChunk;
    let ch = p.chunks.get(key);
    if (!ch) {
        ch = isoMakeChunk(p, cx, cy);
        p.chunks.set(key, ch);
    }
    p.lastChunkKey = key;
    p.lastChunk = ch;
    return ch;
}

// Integer tile coords → terrain level. Generates the chunk on first touch, so
// anything that looks at the ground (draw, collision, spawns) grows the world.
function isoLevelAt(p, tx, ty) {
    const cx = Math.floor(tx / ISO_CHUNK), cy = Math.floor(ty / ISO_CHUNK);
    return isoChunk(p, cx, cy).h[(ty - cy * ISO_CHUNK) * ISO_CHUNK + (tx - cx * ISO_CHUNK)];
}

function isoSetLevel(p, tx, ty, L) {
    const cx = Math.floor(tx / ISO_CHUNK), cy = Math.floor(ty / ISO_CHUNK);
    const ch = isoChunk(p, cx, cy);
    const i = (ty - cy * ISO_CHUNK) * ISO_CHUNK + (tx - cx * ISO_CHUNK);
    ch.h[i] = L;
    ch.prop[i] = 0;
}

function isoIsMesa(p, tx, ty) {
    const cx = Math.floor(tx / ISO_CHUNK), cy = Math.floor(ty / ISO_CHUNK);
    return isoChunk(p, cx, cy).mesa[(ty - cy * ISO_CHUNK) * ISO_CHUNK + (tx - cx * ISO_CHUNK)] === 1;
}

function isoMakeChunk(p, cx, cy) {
    const N = ISO_CHUNK;
    const ch = {
        h: new Uint8Array(N * N), v: new Uint8Array(N * N), prop: new Uint8Array(N * N),
        mesa: new Uint8Array(N * N)
    };
    for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
            const tx = cx * N + i, ty = cy * N + j;
            const k = j * N + i;
            ch.h[k] = isoHeight(p.seed, tx, ty);
            const r = isoHash(tx, ty, p.seed + 7);
            ch.v[k] = Math.floor(r * 3);                      // top-face shade variant
            // Decorations — never under the landed rocket
            const r2 = isoHash(tx, ty, p.seed + 13);
            if (Math.hypot(tx, ty) > 3.5) ch.prop[k] = r2 < 0.035 ? 1 : r2 < 0.055 ? 2 : r2 < 0.07 ? 3 : 0;
        }
    }

    const mesaTop = isoMakeMesa(p, ch, cx, cy);

    // Crystals are seeded as the ground is — none once the build site is out
    if (!p.sitePlaced) {
        // A cluster on top of the mesa — only a Grav Boots jump reaches them
        for (let n = 0; n < ISO_MESA_ITEMS && mesaTop.length; n++) {
            const k = mesaTop[Math.floor(Math.random() * mesaTop.length)];
            const i = k % N, j = Math.floor(k / N);
            p.items.push({
                x: cx * N + i + 0.25 + Math.random() * 0.5, y: cy * N + j + 0.25 + Math.random() * 0.5,
                z: ch.h[k] + 0.9, r: 13, type: pickResourceType(p), spin: Math.random() * 6
            });
        }
        for (let n = 0; n < ISO_ITEMS_PER_CHUNK; n++) {
            const x = cx * N + Math.random() * N, y = cy * N + Math.random() * N;
            if (Math.hypot(x, y) < 2.5) continue;             // keep the landing clear
            const L = ch.h[Math.floor(y - cy * N) * N + Math.floor(x - cx * N)];
            const hover = Math.random() < ISO_HOVER_CHANCE ? 2.2 + Math.random() * 0.8 : 0;
            p.items.push({ x, y, z: L + 0.9 + hover, r: 13, type: pickResourceType(p), spin: Math.random() * 6 });
        }
    }
    return ch;
}

// A tall rock mesa: an irregular blob standing ISO_MESA_RISE levels above the
// ground around it, so no terrace ever leads up to it — only a Grav Boots
// jump does. It only goes where that ground is level, so every side is the
// same climb. Its centre sits at least 4 tiles inside the chunk, so the whole
// footprint and its ring are decided without touching neighbours.
// Returns the chunk indices of its top tiles.
function isoMakeMesa(p, ch, cx, cy) {
    const N = ISO_CHUNK;
    if (isoHash(cx, cy, p.seed + 31) >= ISO_MESA_CHANCE) return [];

    // A few tries at a spot on level ground
    for (let attempt = 0; attempt < 4; attempt++) {
        const s = p.seed + 32 + attempt * 5;
        const mx = 4 + isoHash(cx, cy, s) * (N - 8);
        const my = 4 + isoHash(cx, cy, s + 1) * (N - 8);
        if (Math.hypot(cx * N + mx, cy * N + my) < ISO_MESA_CLEAR) continue;
        const radius = 1.3 + isoHash(cx, cy, s + 2) * 0.9;

        const top = [];
        for (let j = 0; j < N; j++) {
            for (let i = 0; i < N; i++) {
                const wobble = (isoHash(cx * N + i, cy * N + j, p.seed + 35) - 0.5) * 0.6;
                if (Math.hypot(i + 0.5 - mx, j + 0.5 - my) < radius + wobble) top.push(j * N + i);
            }
        }

        // Footprint plus a one-tile ring must all be one level
        const base = ch.h[top[0]];
        let flat = true;
        for (const k of top) {
            const i = k % N, j = Math.floor(k / N);
            for (let dj = -1; dj <= 1 && flat; dj++) {
                for (let di = -1; di <= 1; di++) {
                    if (ch.h[(j + dj) * N + i + di] !== base) { flat = false; break; }
                }
            }
            if (!flat) break;
        }
        if (!flat) continue;

        for (const k of top) {
            ch.h[k] = base + ISO_MESA_RISE;
            ch.mesa[k] = 1;
            ch.prop[k] = 0;
        }
        return top;
    }
    return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Movement & collision (shared by the spaceman and the aliens)
// ─────────────────────────────────────────────────────────────────────────────
function isoBlocked(p, x, y, z, r) {
    for (const [ox, oy] of ISO_FOOT) {
        if (isoLevelAt(p, Math.floor(x + ox * r), Math.floor(y + oy * r)) > z + ISO_STEP) return true;
    }
    return false;
}

// Highest ground under the footprint — you stay up until you're fully off a ledge
function isoGround(p, x, y, r) {
    let g = 0;
    for (const [ox, oy] of ISO_FOOT) {
        g = Math.max(g, isoLevelAt(p, Math.floor(x + ox * r), Math.floor(y + oy * r)));
    }
    return g;
}

// Axis-separated so walls slide rather than stick. Returns false if blocked.
function isoMove(p, e, dx, dy, r) {
    let clear = true;
    if (dx) { if (!isoBlocked(p, e.x + dx, e.y, e.z, r)) e.x += dx; else clear = false; }
    if (dy) { if (!isoBlocked(p, e.x, e.y + dy, e.z, r)) e.y += dy; else clear = false; }
    return clear;
}

function isoFall(p, e, dt, r) {
    e.vz -= ISO_GRAVITY * dt;
    e.z += e.vz * dt;
    const ground = isoGround(p, e.x, e.y, r);
    if (e.z <= ground) {
        e.z = ground;
        e.vz = 0;
        e.onGround = true;
    } else {
        e.onGround = false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────
function isoUpdate(p, dt) {
    isoUpdateSpaceman(p, dt);
    isoSpawnAliens(p, dt);
    isoUpdateItems(p, dt);
    isoUpdateAliens(p, dt);
    isoUpdateDebris(p, dt);
    isoUpdatePad(p);
    isoUpdateCamera(p, dt);
}

function isoUpdateSpaceman(p, dt) {
    const m = p.man;
    let sx = 0, sy = 0;
    if (keyHeld('arrowleft', 'a')) sx -= 1;
    if (keyHeld('arrowright', 'd')) sx += 1;
    if (keyHeld('arrowup', 'w')) sy -= 1;
    if (keyHeld('arrowdown', 's')) sy += 1;
    const jump = keyHeld(' ', 'spacebar');

    // Keys are SCREEN directions (↑ walks up the screen). Screen-right is
    // world +x −y, screen-down is +x +y.
    let wx = sx + sy, wy = sy - sx;
    const len = Math.hypot(wx, wy);
    if (len > 0) {
        wx /= len; wy /= len;
        m.hx = wx; m.hy = wy;
    }
    if (sx !== 0) m.face = sx;

    const decay = Math.exp(-dt * 7);
    m.kx *= decay;
    m.ky *= decay;
    const clear = isoMove(p, m, (wx * ISO_MAN_SPEED + m.kx) * dt, (wy * ISO_MAN_SPEED + m.ky) * dt, ISO_MAN_R);

    // Walking into a mesa without Grav Boots — say what would get him up it
    if (p.bootHint > 0) p.bootHint = Math.max(0, p.bootHint - dt);
    if (!clear && len > 0 && upgLevel('gravBoots') === 0) {
        const tx = Math.floor(m.x + wx * (ISO_MAN_R + 0.15));
        const ty = Math.floor(m.y + wy * (ISO_MAN_R + 0.15));
        if (isoIsMesa(p, tx, ty) && isoLevelAt(p, tx, ty) > m.z + 1) p.bootHint = 1.6;
    }

    // Jump — ground only, no double jump. Releasing early cuts the arc short.
    if (jump && m.onGround) {
        m.vz = ISO_JUMP_V * jumpV() / PLANET_JUMP_V;
        m.onGround = false;
    }
    if (!jump && m.vz > 0) m.vz *= Math.pow(JUMP_CUT, dt * 12);
    isoFall(p, m, dt, ISO_MAN_R);

    m.walk += (m.onGround && len > 0 ? 9 : 0) * dt;
    if (m.invuln > 0) m.invuln = Math.max(0, m.invuln - dt);
}

function isoSpawnAliens(p, dt) {
    if (p.sitePlaced) return;          // the run-in to the build site stays clear
    p.alienTimer -= dt;
    if (p.alienTimer > 0 || p.aliens.length >= p.alienMax) return;
    p.alienTimer = p.alienGap * (0.7 + Math.random() * 0.6);

    // Just past a random screen edge, far enough out that a raised tile can't
    // lift it into view
    const pad = 90;
    let sx, sy;
    const edge = Math.floor(Math.random() * 4);
    if (edge < 2) { sx = edge === 0 ? -pad : CANVAS_W + pad; sy = Math.random() * CANVAS_H; }
    else          { sx = Math.random() * CANVAS_W; sy = edge === 2 ? -pad : CANVAS_H + pad; }
    const w = isoUnproject(p, sx, sy);

    const kind = Math.random() < 0.35 ? 'hopper' : 'walker';
    p.aliens.push({
        x: w.x, y: w.y, z: isoGround(p, w.x, w.y, ISO_ALIEN_R), vz: 0, onGround: true,
        w: 34, h: 32, kind, phase: Math.random() * 6,
        speed: p.alienSpeed * (0.85 + Math.random() * 0.3),
        hopTimer: 0.4 + Math.random(),
        retreat: 0
    });
}

function isoUpdateItems(p, dt) {
    const m = p.man;
    const forgive = pickupForgive();
    const reach = 0.6 * forgive;
    const slack = 0.3 * forgive;       // vertical give above the helmet / below the boots
    p.items = p.items.filter(it => {
        it.spin += dt * 2;
        const dx = it.x - m.x, dy = it.y - m.y;
        if (dx * dx + dy * dy < reach * reach &&
            it.z > m.z - slack && it.z < m.z + ISO_MAN_LV + slack) {
            collectResource(p, it.type);
            return false;
        }
        return true;
    });
}

function isoUpdateAliens(p, dt) {
    const m = p.man;
    for (const a of p.aliens) {
        a.phase += dt * 8;
        // Run straight at the spaceman, with a lazy weave so a pack doesn't
        // collapse into single file. One that just landed a hit backs off for
        // a while instead of camping on him.
        let ang = Math.atan2(m.y - a.y, m.x - a.x) + Math.sin(a.phase * 0.18) * 0.45;
        if (a.retreat > 0) {
            a.retreat -= dt;
            ang += Math.PI;
        }
        const clear = isoMove(p, a, Math.cos(ang) * a.speed * dt, Math.sin(ang) * a.speed * dt, ISO_ALIEN_R);

        // Walkers can't climb, so high ground is safe from them. Hoppers bounce
        // along and jump straight away when a ledge stops them.
        if (a.kind === 'hopper') {
            a.hopTimer -= dt;
            if (a.onGround && (a.hopTimer <= 0 || !clear)) {
                a.vz = ISO_HOP_V;
                a.hopTimer = 0.7 + Math.random() * 0.6;
            }
        }
        isoFall(p, a, dt, ISO_ALIEN_R);

        if (m.invuln <= 0 && !m.hidden && isoTouching(m, a)) isoHitByAlien(p, a);
    }
    // Nudge apart any that bunch up, so a pack reads as a pack, not one blob
    for (let i = 0; i < p.aliens.length; i++) {
        for (let j = i + 1; j < p.aliens.length; j++) {
            const a = p.aliens[i], b = p.aliens[j];
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
            if (d > 0.001 && d < 0.7) {
                const push = (0.7 - d) * 0.5 / d;
                isoMove(p, a, -dx * push, -dy * push, ISO_ALIEN_R);
                isoMove(p, b, dx * push, dy * push, ISO_ALIEN_R);
            }
        }
    }
    p.aliens = p.aliens.filter(a => Math.hypot(a.x - m.x, a.y - m.y) < ISO_ALIEN_DESPAWN);
}

// Forgiving on height: clear an alien's head with a jump and it misses
function isoTouching(m, a) {
    return Math.hypot(m.x - a.x, m.y - a.y) < 0.55 && m.z < a.z + 1.0 && a.z < m.z + 1.8;
}

function isoHitByAlien(p, a) {
    const m = p.man;
    const dx = m.x - a.x, dy = m.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    m.kx = dx / d * ISO_KNOCK;
    m.ky = dy / d * ISO_KNOCK;
    m.vz = 6;
    m.onGround = false;
    a.retreat = ISO_ALIEN_RETREAT;
    const drop = alienHit(p);
    if (drop) isoSpawnDebris(p, drop.type, drop.lost);
}

// One full-size cracked chunk per unit lost, plus a couple of small shards,
// sprayed out in a ring around the spaceman.
function isoSpawnDebris(p, type, lost) {
    const m = p.man;
    for (let i = 0; i < lost; i++) {
        push(11, true);
        push(4 + Math.random() * 3, false);
        push(4 + Math.random() * 3, false);
    }

    function push(r, chunk) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.2 + Math.random() * 1.8;
        p.debris.push({
            x: m.x, y: m.y, z: m.z + 1.4,
            vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            vz: 5 + Math.random() * 2.5,
            r,
            chunk,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 11,
            life: 1.9,
            maxLife: 1.9,
            type
        });
    }
}

function isoUpdateDebris(p, dt) {
    for (const d of p.debris) {
        d.vz -= ISO_GRAVITY * 0.6 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        d.rot += d.rotSpeed * dt;
        const g = isoLevelAt(p, Math.floor(d.x), Math.floor(d.y));
        if (d.z < g) {                      // bounce, then settle
            d.z = g;
            d.vz *= -0.32;
            d.vx *= 0.55;
            d.vy *= 0.55;
            d.rotSpeed *= 0.55;
        }
        d.life -= dt;
    }
    // Purely decorative — never picked up, and gone once they fade
    p.debris = p.debris.filter(d => d.life > 0);
}

function isoUpdatePad(p) {
    if (p.baseBuilt || p.mathOpen) return;
    if (!p.pad) {
        if (quotaMet(p)) {
            isoPlacePad(p);
            siteReady(p);
        }
        return;
    }
    const m = p.man;
    if (Math.hypot(m.x - p.pad.x, m.y - p.pad.y) < 1.1 && Math.abs(m.z - p.pad.level) < 0.6) {
        openBaseMath(p);
    }
}

// Look ahead of the way he's walking for a naturally flat 3×3, lowest first.
// If the terrain there is all slopes, level a patch out instead. Never on a
// mesa — the build site has to be reachable without Grav Boots.
function isoPlacePad(p) {
    const m = p.man;
    const heading = Math.atan2(m.hy, m.hx);
    let best = null, fallback = null;
    for (const dist of ISO_PAD_DIST) {
        for (const off of [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05]) {
            const tx = Math.floor(m.x + Math.cos(heading + off) * dist);
            const ty = Math.floor(m.y + Math.sin(heading + off) * dist);
            if (isoMesaNear(p, tx, ty)) continue;
            const L = isoLevelAt(p, tx, ty);
            if (fallback === null) fallback = { tx, ty, level: L };
            if ((best === null || L < best.level) && isoFlat3(p, tx, ty, L)) best = { tx, ty, level: L };
        }
    }
    if (!best) {
        // Mesas are never more than ~5 tiles across, so one of the candidates
        // is always clear; the straight-ahead spot is only a last resort.
        best = fallback || {
            tx: Math.floor(m.x + Math.cos(heading) * ISO_PAD_DIST[0]),
            ty: Math.floor(m.y + Math.sin(heading) * ISO_PAD_DIST[0]),
            level: 0
        };
    }
    // Clear the pad of props even when it was already flat
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) isoSetLevel(p, best.tx + i, best.ty + j, best.level);
    p.pad = { x: best.tx + 0.5, y: best.ty + 0.5, level: best.level };
}

function isoMesaNear(p, tx, ty) {
    for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) if (isoIsMesa(p, tx + i, ty + j)) return true;
    }
    return false;
}

function isoFlat3(p, tx, ty, L) {
    for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) if (isoLevelAt(p, tx + i, ty + j) !== L) return false;
    }
    return true;
}

// Follows the spaceman across the ground. Height only follows him when he
// lands, so a jump reads as a jump instead of the world bobbing under him.
function isoUpdateCamera(p, dt) {
    const m = p.man;
    if (m.onGround) p.camZ += (m.z - p.camZ) * (1 - Math.exp(-dt * 4));
    const t = isoRaw(m.x, m.y, p.camZ);
    const k = 1 - Math.exp(-dt * 6);
    p.cam.x += (t.x - p.cam.x) * k;
    p.cam.y += (t.y - p.cam.y) * k;
}

// ─────────────────────────────────────────────────────────────────────────────
// Launch
// ─────────────────────────────────────────────────────────────────────────────
function isoPrepareLaunch(p) {
    // Lift off from the pad's screen-left corner, beside the base
    p.launch = p.pad ? { x: p.pad.x - 1.1, y: p.pad.y + 1.1 } : { x: p.man.x, y: p.man.y };
}

function isoLaunchAnchor(p) {
    const l = p.launch || p.man;
    const s = isoProject(p, l.x, l.y, isoGround(p, l.x, l.y, 0));
    return { x: s.x, groundY: s.y };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────
// Painter's order: tiles go back-to-front one diagonal row (tx + ty) at a
// time, and every sprite is drawn straight after the row its footprint reaches
// furthest forward into — so a taller tile in front covers it, and ground
// behind never does.
function isoDraw(p) {
    const W = CANVAS_W, H = CANVAS_H;
    const hw = ISO_TW / 2, hh = ISO_TH / 2;
    const ox = W / 2 - p.cam.x, oy = H * ISO_CAM_Y - p.cam.y;   // raw → screen

    // Rows / columns that can reach the screen (raised tiles poke up from below)
    const dMin = Math.floor(-oy / hh) - 2;
    const dMax = Math.ceil((H - oy + ISO_MAX_LEVEL * ISO_LH) / hh) + 1;
    const eMin = Math.floor(-ox / hw) - 2;
    const eMax = Math.ceil((W - ox) / hw) + 2;

    const sprites = isoCollectSprites(p);
    let si = 0;
    const pal = p.pal;

    // Anything filed behind the first visible row still draws, first
    while (si < sprites.length && sprites[si].row < dMin) sprites[si++].draw();

    for (let d = dMin; d <= dMax; d++) {
        let e = eMin;
        if (((d - e) & 1) !== 0) e++;          // tx, ty integral ⇔ d, e same parity
        for (; e <= eMax; e += 2) {
            const tx = (d + e) >> 1, ty = (d - e) >> 1;
            const L = isoLevelAt(p, tx, ty);
            const cx = e * hw + ox;
            const cy = d * hh + oy - L * ISO_LH;   // top vertex of the top face
            if (cy > H || cx < -hw || cx > W + hw) continue;

            // Top face
            const ch = p.lastChunk;
            const k = (ty - Math.floor(ty / ISO_CHUNK) * ISO_CHUNK) * ISO_CHUNK + (tx - Math.floor(tx / ISO_CHUNK) * ISO_CHUNK);
            const variant = ch.v[k], prop = ch.prop[k];
            ctx.fillStyle = pal.top[L][variant];
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + hw, cy + hh);
            ctx.lineTo(cx, cy + ISO_TH);
            ctx.lineTo(cx - hw, cy + hh);
            ctx.closePath();
            ctx.fill();

            // Cliff faces down to whichever front neighbour is lower
            if (L > 0) {
                const Lf = isoLevelAt(p, tx, ty + 1);     // front-left neighbour
                const Lr = isoLevelAt(p, tx + 1, ty);     // front-right neighbour
                if (L > Lf) {
                    const drop = (L - Lf) * ISO_LH;
                    ctx.fillStyle = pal.left;
                    ctx.beginPath();
                    ctx.moveTo(cx - hw, cy + hh);
                    ctx.lineTo(cx, cy + ISO_TH);
                    ctx.lineTo(cx, cy + ISO_TH + drop);
                    ctx.lineTo(cx - hw, cy + hh + drop);
                    ctx.closePath();
                    ctx.fill();
                    isoStrata(pal, L - Lf, cx - hw, cy + hh, cx, cy + ISO_TH);
                }
                if (L > Lr) {
                    const drop = (L - Lr) * ISO_LH;
                    ctx.fillStyle = pal.right;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy + ISO_TH);
                    ctx.lineTo(cx + hw, cy + hh);
                    ctx.lineTo(cx + hw, cy + hh + drop);
                    ctx.lineTo(cx, cy + ISO_TH + drop);
                    ctx.closePath();
                    ctx.fill();
                    isoStrata(pal, L - Lr, cx, cy + ISO_TH, cx + hw, cy + hh);
                }
                // Glowing lip along every ledge edge, like Classic's ground line
                if (L > Lf || L > Lr) {
                    ctx.strokeStyle = pal.rim;
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    if (L > Lf) { ctx.moveTo(cx - hw, cy + hh); ctx.lineTo(cx, cy + ISO_TH); }
                    else ctx.moveTo(cx, cy + ISO_TH);
                    if (L > Lr) ctx.lineTo(cx + hw, cy + hh);
                    ctx.stroke();
                }
            }

            if (prop) isoDrawProp(pal, prop, cx, cy + hh, tx, ty, p.seed);
        }
        while (si < sprites.length && sprites[si].row <= d) sprites[si++].draw();
    }
    while (si < sprites.length) sprites[si++].draw();

    isoDrawHaze(p);
    if (p.pad && !p.baseBuilt) isoDrawPadArrow(p);
    if (p.bootHint > 0 && !p.man.hidden) isoDrawBootHint(p);
}

// Layer lines across a cliff face `levels` tall — only mesas are taller than
// one level, so this is what marks them out as rock you can't just step up.
// (x1, y1)–(x2, y2) is the face's top edge.
function isoStrata(pal, levels, x1, y1, x2, y2) {
    if (levels < 2) return;
    ctx.strokeStyle = pal.strata;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let s = 1; s < levels; s++) {
        const off = s * ISO_LH;
        ctx.moveTo(x1, y1 + off);
        ctx.lineTo(x2, y2 + off);
    }
    ctx.stroke();
}

// Tip over his helmet while he walks into a mesa without Grav Boots
function isoDrawBootHint(p) {
    const m = p.man;
    const s = isoProject(p, m.x, m.y, m.z);
    const text = '🥾 Grav Boots needed to climb';
    ctx.save();
    ctx.globalAlpha = sceneAlpha * Math.min(1, p.bootHint * 2);
    ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 18;
    const y = s.y - MAN_H - 22;
    ctx.fillStyle = 'rgba(5,5,26,0.8)';
    ctx.beginPath(); ctx.roundRect(s.x - w / 2, y - 12, w, 24, 12); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, s.x, y + 1);
    ctx.restore();
}

// Small flat decorations on a tile top: (x, y) is the tile centre
function isoDrawProp(pal, prop, x, y, tx, ty, seed) {
    const jx = (isoHash(tx, ty, seed + 21) - 0.5) * 20;
    const jy = (isoHash(tx, ty, seed + 22) - 0.5) * 8;
    x += jx; y += jy;
    if (prop === 1) {            // pebbles
        ctx.fillStyle = pal.rock;
        ctx.beginPath(); ctx.ellipse(x - 6, y, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 5, y + 3, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 2, y - 4, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    } else if (prop === 2) {     // boulder
        ctx.fillStyle = pal.rock;
        ctx.beginPath();
        ctx.moveTo(x - 11, y + 3);
        ctx.lineTo(x - 7, y - 8);
        ctx.lineTo(x + 3, y - 11);
        ctx.lineTo(x + 11, y - 3);
        ctx.lineTo(x + 9, y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = pal.rockHi;
        ctx.beginPath();
        ctx.moveTo(x - 7, y - 8);
        ctx.lineTo(x + 3, y - 11);
        ctx.lineTo(x + 1, y - 4);
        ctx.closePath();
        ctx.fill();
    } else {                     // crater
        ctx.fillStyle = pal.crater;
        ctx.beginPath(); ctx.ellipse(x, y, 13, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = pal.rockHi;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(x, y + 1, 13, 6.5, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    }
}

// Which row a sprite at (x, y) is drawn after — the front-most tile its
// footprint touches. The build site bumps anything standing on it to its
// front row, so the pad decal never paints over their boots.
function isoSpriteRow(p, x, y) {
    let row = Math.floor(x + 0.25) + Math.floor(y + 0.25);
    const pad = p.pad;
    if (pad && Math.abs(x - pad.x) < 1.6 && Math.abs(y - pad.y) < 1.6) {
        row = Math.max(row, Math.floor(pad.x) + Math.floor(pad.y) + 2);
    }
    return row;
}

function isoCollectSprites(p) {
    const list = [];
    const onScreen = (s, m) => s.x > -m && s.x < CANVAS_W + m && s.y > -m && s.y < CANVAS_H + m * 2;
    const add = (x, y, depth, draw) => list.push({ row: isoSpriteRow(p, x, y), depth: x + y + depth, draw });

    if (p.pad) {
        const pad = p.pad;
        const s = isoProject(p, pad.x, pad.y, pad.level);
        if (onScreen(s, 200)) add(pad.x, pad.y, -9, () => drawBaseAt(p, s.x, s.y, 28));   // under anyone on it
    }

    if (p.rocketLanded) {
        const r = p.rocket;
        const s = isoProject(p, r.x, r.y, isoGround(p, r.x, r.y, 0));
        if (onScreen(s, 140)) add(r.x, r.y, 0, () => drawRocketAt(s.x, s.y));
    }

    for (const it of p.items) {
        const s = isoProject(p, it.x, it.y, it.z);
        if (!onScreen(s, 40)) continue;
        add(it.x, it.y, 0, () => {
            isoShadow(p, it.x, it.y, it.z, 9);
            drawResourceAt(s.x, s.y, it);
        });
    }

    for (const d of p.debris) {
        const s = isoProject(p, d.x, d.y, d.z);
        if (!onScreen(s, 40)) continue;
        add(d.x, d.y, 0.1, () => drawDebrisAt(s.x, s.y - d.r, d));
    }

    for (const a of p.aliens) {
        const s = isoProject(p, a.x, a.y, a.z);
        if (!onScreen(s, 60)) continue;
        add(a.x, a.y, 0.2, () => {
            isoShadow(p, a.x, a.y, a.z, 15);
            drawAlienAt(s.x, s.y - (a.h / 2 + 6), a);   // legs end at the ground point
        });
    }

    const m = p.man;
    if (!m.hidden) {
        const s = isoProject(p, m.x, m.y, m.z);
        add(m.x, m.y, 0.3, () => {
            isoShadow(p, m.x, m.y, m.z, 13);
            drawSpacemanAt(p, s.x, s.y - (MAN_H / 2 - 2));   // boots on the ground point
        });
    }

    list.sort((a, b) => a.row - b.row || a.depth - b.depth);
    return list;
}

// A soft shadow on the ground below — it's what makes height readable from
// above. Shrinks and fades the higher the thing is off the ground.
function isoShadow(p, x, y, z, rx) {
    const g = isoGround(p, x, y, 0);
    const lift = Math.max(0, z - g);
    const k = 1 / (1 + lift * 0.35);
    const s = isoProject(p, x, y, g);
    ctx.save();
    ctx.globalAlpha = sceneAlpha * 0.32 * k;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, rx * k, rx * 0.5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// The tier sky, pulled down over the far edge of the ground like a horizon
// haze, with the same faint stars Classic shows above its hills.
function isoDrawHaze(p) {
    const band = CANVAS_H * 0.26;
    const sky = shade(p.tier.color, -0.30);            // the sky gradient's middle stop
    const g = ctx.createLinearGradient(0, 0, 0, band);
    g.addColorStop(0, 'rgba(5,5,26,0.92)');             // the sky's top, #05051a
    g.addColorStop(0.5, isoAlpha(sky, 0.6));
    g.addColorStop(1, isoAlpha(sky, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, band);
    drawBackdrop({ alpha: 0.5 * sceneAlpha, starsOnly: true, maxY: band * 0.45 });
    ctx.globalAlpha = sceneAlpha;
}

// 'rgb(r,g,b)' from shade() → 'rgba(r,g,b,a)'
function isoAlpha(rgb, a) {
    return rgb.replace('rgb(', 'rgba(').replace(')', `,${a})`);
}

// Pulsing arrow on the screen edge pointing at an off-screen build site
function isoDrawPadArrow(p) {
    const s = isoProject(p, p.pad.x, p.pad.y, p.pad.level);
    const margin = 44;
    if (s.x > margin && s.x < CANVAS_W - margin && s.y > margin + 30 && s.y < CANVAS_H - margin) return;

    const cx = CANVAS_W / 2, cy = CANVAS_H * ISO_CAM_Y;
    const dx = s.x - cx, dy = s.y - cy;
    const kx = dx > 0 ? (CANVAS_W - margin - cx) / dx : dx < 0 ? (margin - cx) / dx : Infinity;
    const ky = dy > 0 ? (CANVAS_H - margin - cy) / dy : dy < 0 ? (margin + 30 - cy) / dy : Infinity;
    const k = Math.min(kx, ky);
    const ax = cx + dx * k, ay = cy + dy * k;
    const ang = Math.atan2(dy, dx);
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);

    ctx.save();
    ctx.globalAlpha = sceneAlpha * (0.7 + 0.3 * pulse);
    ctx.translate(ax, ay);
    ctx.font = '20px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏗️', -Math.cos(ang) * 26, -Math.sin(ang) * 26);
    ctx.rotate(ang);
    ctx.fillStyle = '#4ade80';
    ctx.strokeStyle = '#0a2a14';
    ctx.lineWidth = 2;
    const grow = 1 + 0.15 * pulse;
    ctx.beginPath();
    ctx.moveTo(14 * grow, 0);
    ctx.lineTo(-8 * grow, -11 * grow);
    ctx.lineTo(-3 * grow, 0);
    ctx.lineTo(-8 * grow, 11 * grow);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}
