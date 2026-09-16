// WillFall — hidden treasure caves (Explore planets only)
// Every isometric planet hides one cave mouth in the cliff of a rock mesa,
// 15–30 tiles from the landing spot. Walking into it fades to a torch-lit maze
// with a treasure chest in the middle. Spike traps on the way ask a math
// problem: right disarms the trap, wrong sends the spaceman back to the maze
// entrance. The chest pays bonus miles and joins the collection that floats in
// the ship's cabin at the Trading Post (shop.js).
//
// The maze is a p-like world hung off the planet as p.maze, with its own
// pre-built chunks, so planet-iso.js moves, collides, sorts and draws it
// unchanged. While it's set, updatePlanet / drawPlanetScene route here and the
// surface holds still underneath.
//
// Loaded AFTER planet-iso.js — cross-file references stay inside function
// bodies.

// ── Tunables ─────────────────────────────────────────────────────────────────
const CAVE_MIN_D = 15, CAVE_MAX_D = 30;   // tiles from the landing spot to the mouth
const CAVE_SEARCH_R = 34;                  // tiles around the landing spot built up front to find it
const CAVE_BONUS = 5000;                   // bonus miles for the chest
const CAVE_WALL = 3;                       // maze wall height in levels — too tall to jump, even with boots
const CAVE_TORCH_R = 150;                  // px radius of the torchlight
const CAVE_RETURN_INVULN = 2;              // seconds of mercy back on the surface
const CAVE_FADE = 0.35;                    // seconds per half of the fade to black and back
const CAVE_FOUND_TIME = 1.8;               // seconds the open chest shows before heading back up
const CAVE_WRONG_DELAY = 1400;             // ms the right answer stays up after a wrong one

// Open-side bits per maze cell, and [dx, dy, bit, opposite bit] per direction
const CAVE_N = 1, CAVE_S = 2, CAVE_W = 4, CAVE_E = 8;
const CAVE_DIRS = [[0, -1, CAVE_N, CAVE_S], [0, 1, CAVE_S, CAVE_N], [-1, 0, CAVE_W, CAVE_E], [1, 0, CAVE_E, CAVE_W]];

// ─────────────────────────────────────────────────────────────────────────────
// Placement — called at the end of isoGenerate
// ─────────────────────────────────────────────────────────────────────────────
function cavePlace(p) {
    const R = CAVE_SEARCH_R, N = ISO_CHUNK;
    for (let cy = Math.floor(-R / N); cy <= Math.floor(R / N); cy++) {
        for (let cx = Math.floor(-R / N); cx <= Math.floor(R / N); cx++) isoChunk(p, cx, cy);
    }
    const seen = caveReachable(p, R);
    const reachable = (tx, ty) => Math.abs(tx) <= R && Math.abs(ty) <= R &&
        seen[(ty + R) * (2 * R + 1) + tx + R] === 1;

    const m = caveBestMouth(p, reachable) || caveStampFallback(p, reachable);
    p.cave = Object.assign(m, { drop: ISO_MESA_RISE * ISO_LH, sealed: false, armed: true, layout: null });
    isoSetLevel(p, m.atx, m.aty, m.level);    // clears any prop out of the doorway
    p.tileDecor = caveSurfaceDecor;
    p.extraSprites = caveSurfaceSprites;
}

// Tiles the spaceman can walk to from the landing spot without Grav Boots:
// one level up at a time (a plain jump), any drop down, never onto a mesa.
function caveReachable(p, R) {
    const S = 2 * R + 1;
    const seen = new Uint8Array(S * S);
    const queue = [R * S + R];
    seen[queue[0]] = 1;
    for (let n = 0; n < queue.length; n++) {
        const k = queue[n];
        const tx = k % S - R, ty = Math.floor(k / S) - R;
        const L = isoLevelAt(p, tx, ty);
        for (const [dx, dy] of CAVE_DIRS) {
            const nx = tx + dx, ny = ty + dy;
            if (Math.abs(nx) > R || Math.abs(ny) > R) continue;
            const nk = (ny + R) * S + nx + R;
            if (seen[nk] || isoIsMesa(p, nx, ny) || isoLevelAt(p, nx, ny) > L + 1) continue;
            seen[nk] = 1;
            queue.push(nk);
        }
    }
    return seen;
}

// Low ground first, then about 22 tiles out, then a seeded tie-break
function caveBestMouth(p, reachable) {
    const R = CAVE_SEARCH_R - 1;
    let best = null, bestScore = Infinity;
    for (let ty = -R; ty <= R; ty++) {
        for (let tx = -R; tx <= R; tx++) {
            if (!isoIsMesa(p, tx, ty)) continue;
            for (const face of ['y', 'x']) {
                const m = caveMouthAt(p, tx, ty, face);
                if (!m || !reachable(m.atx, m.aty)) continue;
                const d = Math.hypot(m.mx, m.my);
                if (d < CAVE_MIN_D || d > CAVE_MAX_D) continue;
                const score = m.level * 10 + Math.abs(d - 22) + isoHash(tx, ty, p.seed + 77) * 4;
                if (score < bestScore) { best = m; bestScore = score; }
            }
        }
    }
    return best;
}

// A cliff face of mesa tile (tx, ty) that the camera sees — its +y side ('y',
// drawn front-left) or its +x side ('x', front-right) — with a flat, rock-free
// 3×2 apron in front. Those are the only tiles drawn later that could cover
// the face, and the room he needs to walk up to it.
function caveMouthAt(p, tx, ty, face) {
    const fy = face === 'y';
    const atx = fy ? tx : tx + 1, aty = fy ? ty + 1 : ty;     // the tile in front
    const level = isoLevelAt(p, atx, aty);
    if (isoIsMesa(p, atx, aty) || isoLevelAt(p, tx, ty) - level !== ISO_MESA_RISE) return null;
    for (let a = -1; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
            const x = fy ? tx + a : atx + b, y = fy ? aty + b : ty + a;
            if (isoIsMesa(p, x, y) || isoLevelAt(p, x, y) !== level) return null;
        }
    }
    return {
        tx, ty, face, atx, aty, level,
        mx: fy ? tx + 0.5 : tx + 1, my: fy ? ty + 1 : ty + 0.5,      // foot of the cliff, mid-face
        ax: fy ? tx + 0.5 : tx + 1.5, ay: fy ? ty + 1.5 : ty + 0.5    // centre of the tile in front
    };
}

// No usable mesa in range (rare): raise a small one on reachable flat ground
function caveStampFallback(p, reachable) {
    const spin = isoHash(1, 2, p.seed + 91) * Math.PI * 2;
    for (const dist of [20, 17, 24, 27]) {
        for (let k = 0; k < 32; k++) {
            const ang = spin + k * Math.PI / 16;
            const cx = Math.round(Math.cos(ang) * dist), cy = Math.round(Math.sin(ang) * dist);
            if (!reachable(cx, cy) || !caveFlatPatch(p, cx, cy)) continue;
            caveStampMesa(p, cx, cy, isoLevelAt(p, cx, cy));
            const m = caveMouthAt(p, cx, cy + 2, 'y');
            if (m) return m;
        }
    }
    // Hilly everywhere: level a gentle patch (one level of give, so its new
    // edges are still plain one-level ledges) and build there
    for (const dist of [20, 17, 24, 27]) {
        for (let k = 0; k < 32; k++) {
            const ang = spin + k * Math.PI / 16;
            const cx = Math.round(Math.cos(ang) * dist), cy = Math.round(Math.sin(ang) * dist);
            if (!reachable(cx, cy) || !caveGentlePatch(p, cx, cy)) continue;
            const L = isoLevelAt(p, cx, cy);
            for (let j = -3; j <= 4; j++) for (let i = -3; i <= 3; i++) caveTile(p, cx + i, cy + j, L, 0);
            caveStampMesa(p, cx, cy, L);
            return caveMouthAt(p, cx, cy + 2, 'y');
        }
    }
    // Last resort: flatten a patch just past the landing ground and build there
    const cx = Math.round(Math.cos(spin) * 10), cy = Math.round(Math.sin(spin) * 10);
    for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) caveTile(p, cx + i, cy + j, 0, 0);
    caveStampMesa(p, cx, cy, 0);
    return caveMouthAt(p, cx, cy + 2, 'y');
}

// Room for the stamped mesa (radius 2) plus its +y doorway and apron
function caveFlatPatch(p, cx, cy) {
    const L = isoLevelAt(p, cx, cy);
    for (let j = -3; j <= 4; j++) {
        for (let i = -3; i <= 3; i++) {
            if (isoIsMesa(p, cx + i, cy + j) || isoLevelAt(p, cx + i, cy + j) !== L) return false;
        }
    }
    return true;
}

// Same footprint, but the ground may wander one level either side of the centre
function caveGentlePatch(p, cx, cy) {
    const L = isoLevelAt(p, cx, cy);
    for (let j = -3; j <= 4; j++) {
        for (let i = -3; i <= 3; i++) {
            if (isoIsMesa(p, cx + i, cy + j) || Math.abs(isoLevelAt(p, cx + i, cy + j) - L) > 1) return false;
        }
    }
    return true;
}

function caveStampMesa(p, cx, cy, L) {
    for (let j = -2; j <= 2; j++) {
        for (let i = -2; i <= 2; i++) if (i * i + j * j <= 4) caveTile(p, cx + i, cy + j, L + ISO_MESA_RISE, 1);
    }
    // Nothing left stuck inside the new rock
    p.items = p.items.filter(it => Math.hypot(it.x - cx - 0.5, it.y - cy - 0.5) > 2.8);
}

// isoSetLevel doesn't touch the mesa flag, so stamps write the chunk directly
function caveTile(p, tx, ty, h, mesa) {
    const cx = Math.floor(tx / ISO_CHUNK), cy = Math.floor(ty / ISO_CHUNK);
    const ch = isoChunk(p, cx, cy);
    const k = (ty - cy * ISO_CHUNK) * ISO_CHUNK + (tx - cx * ISO_CHUNK);
    ch.h[k] = h;
    ch.mesa[k] = mesa;
    ch.prop[k] = 0;
}

// Keeps the build site from being levelled over the cave's doorway
function caveNear(p, tx, ty) {
    const c = p.cave;
    return !!c && Math.abs(tx - c.atx) <= 3 && Math.abs(ty - c.aty) <= 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Surface — the mouth, its rubble once looted, and the way in
// ─────────────────────────────────────────────────────────────────────────────
// isoDraw's per-tile hook. The mouth is painted onto the mesa tile's own cliff
// face, so the ground and anyone in front of it (the next row) still cover it.
function caveSurfaceDecor(p, tx, ty, L, cx, cy) {
    const c = p.cave;
    if (tx !== c.tx || ty !== c.ty) return;
    ctx.save();
    // Origin at the middle of the face's bottom edge, sheared along the face
    if (c.face === 'y') {
        ctx.translate(cx - ISO_TW / 4, cy + ISO_TH * 0.75 + c.drop);
        ctx.transform(1, 0.5, 0, 1, 0, 0);
    } else {
        ctx.translate(cx + ISO_TW / 4, cy + ISO_TH * 0.75 + c.drop);
        ctx.transform(1, -0.5, 0, 1, 0, 0);
    }
    caveDrawMouth(p.pal, c.sealed);
    ctx.restore();
}

function caveArch(w, h) {
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(-w, -h * 0.5);
    ctx.quadraticCurveTo(-w, -h, 0, -h);
    ctx.quadraticCurveTo(w, -h, w, -h * 0.5);
    ctx.lineTo(w, 0);
    ctx.closePath();
}

function caveDrawMouth(pal, sealed) {
    ctx.fillStyle = pal.rock;                 // rough stone lip
    caveArch(13, 30);
    ctx.fill();
    if (!sealed) {
        const g = ctx.createLinearGradient(0, -26, 0, 0);
        g.addColorStop(0, '#000000');
        g.addColorStop(1, '#140c1c');
        ctx.fillStyle = g;
        caveArch(10.5, 26);
        ctx.fill();
        return;
    }
    // Caved in: boulders packed into the arch
    for (const [x, y, r] of [[-6, -5, 5.5], [5, -4, 6], [-1, -13, 5], [-6, -18, 3.5], [5, -16, 4], [0, -22, 3.5]]) {
        ctx.fillStyle = pal.rockHi;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pal.rock;
        ctx.beginPath(); ctx.ellipse(x + 1, y + 1.2, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    caveArch(10.5, 26);
    ctx.stroke();
}

// A spill of rocks on the ground in front of a sealed mouth. It has to be a
// sprite: drawn with the mesa tile, the ground row in front would paint over it.
function caveSurfaceSprites(p, add, onScreen) {
    const c = p.cave;
    if (!c.sealed) return;
    const x = c.face === 'y' ? c.mx : c.mx + 0.15;
    const y = c.face === 'y' ? c.my + 0.15 : c.my;
    const s = isoProject(p, x, y, c.level);
    if (!onScreen(s, 40)) return;
    add(x, y, -9, () => {
        for (const [ox, oy, r] of [[-9, 1, 4], [7, 2, 4.5], [-1, 4, 3.5], [13, -1, 2.5], [-14, -1, 2.5]]) {
            ctx.fillStyle = p.pal.rock;
            ctx.beginPath(); ctx.ellipse(s.x + ox, s.y + oy, r * 1.3, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.pal.rockHi;
            ctx.beginPath(); ctx.ellipse(s.x + ox - 1, s.y + oy - 1, r * 0.7, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        }
    });
}

// Called from isoUpdate: step into the doorway on foot to go in. Coming back
// out disarms it until he's walked a tile away, so he doesn't bounce straight in.
function caveUpdateSurface(p) {
    const c = p.cave;
    if (!c || c.sealed || p.caveFade || p.mathOpen || p.man.hidden) return;
    const m = p.man;
    const along = c.face === 'y' ? m.x - c.mx : m.y - c.my;
    const out = c.face === 'y' ? m.y - c.my : m.x - c.mx;
    if (!c.armed) {
        if (Math.hypot(along, out) > 1) c.armed = true;
        return;
    }
    if (m.onGround && Math.abs(m.z - c.level) < 0.5 && Math.abs(along) < 0.45 && out >= 0 && out < 0.5) {
        caveEnter(p);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Going in and out — a fade to black, swapping worlds while the screen is dark
// ─────────────────────────────────────────────────────────────────────────────
function caveEnter(p) {
    if (p.maze || p.caveFade) return;
    p.man.kx = p.man.ky = 0;
    caveStartFade(p, () => {
        if (!p.cave.layout) p.cave.layout = caveLayout(p);   // same maze every visit
        p.maze = caveMakeWorld(p);                          // fresh start every visit
    });
}

function caveExit(p) {
    if (!p.maze || p.caveFade) return;
    caveStartFade(p, () => caveReturn(p));
}

function caveReturn(p) {
    const c = p.cave, m = p.man;
    p.maze = null;
    Object.assign(m, { x: c.ax, y: c.ay, z: c.level, vz: 0, kx: 0, ky: 0, onGround: true });
    m.invuln = CAVE_RETURN_INVULN;
    p.aliens = p.aliens.filter(a => Math.hypot(a.x - c.ax, a.y - c.ay) > 5);
    p.banner = 0;
    c.armed = false;
    const s = isoRaw(m.x, m.y, m.z);
    p.cam.x = s.x;
    p.cam.y = s.y;
    p.camZ = m.z;
    updatePlanetHUD();                        // chips back — the ascent never refreshes the HUD itself
}

function caveStartFade(p, swap) {
    p.caveFade = { t: 0, swapped: false, swap };
}

function caveTickFade(p, dt) {
    const f = p.caveFade;
    f.t += dt;
    if (!f.swapped && f.t >= CAVE_FADE) {
        f.swapped = true;
        f.swap();
    }
    if (f.t >= CAVE_FADE * 2) p.caveFade = null;
}

function caveDrawFade(p) {
    const t = p.caveFade.t;
    const a = t < CAVE_FADE ? t / CAVE_FADE : Math.max(0, 1 - (t - CAVE_FADE) / CAVE_FADE);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Maze layout — built once per planet and kept, so every visit is the same maze
// ─────────────────────────────────────────────────────────────────────────────
// 7×7 cells on Rock up to 15×15 on Obsidian. Always odd, so there's a true
// centre cell for the chest.
function caveCells(tierIndex) {
    return 7 + 2 * Math.round(tierIndex * 4 / 9);
}

// mulberry32 — the maze has to come out the same from the planet's seed
function caveRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function caveLayout(p) {
    const rng = caveRng(p.seed ^ 0x5CA7E);
    const N = caveCells(p.tierIndex), h = (N - 1) / 2;
    const open = new Uint8Array(N * N);

    // Recursive backtracker from the centre: a perfect maze, so exactly one
    // route reaches the chest and a trap on it can't be walked around.
    const seen = new Uint8Array(N * N);
    const stack = [h * N + h];
    seen[stack[0]] = 1;
    while (stack.length) {
        const k = stack[stack.length - 1];
        const i = k % N, j = (k - i) / N;
        const opts = CAVE_DIRS.filter(([dx, dy]) => {
            const ni = i + dx, nj = j + dy;
            return ni >= 0 && nj >= 0 && ni < N && nj < N && !seen[nj * N + ni];
        });
        if (!opts.length) { stack.pop(); continue; }
        const [dx, dy, bit, back] = opts[Math.floor(rng() * opts.length)];
        const nk = (j + dy) * N + i + dx;
        open[k] |= bit;
        open[nk] |= back;
        seen[nk] = 1;
        stack.push(nk);
    }

    // Tiles: each cell is a 2×2 floor inside a 1-tile wall grid, T tiles
    // across. The entry hall is 2 more rows past the front (+y) wall, below
    // the middle cell of the front row.
    const T = 3 * N + 1, H = T + 2;
    const floor = new Uint8Array(T * H);
    for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
            const x = 3 * i + 1, y = 3 * j + 1, o = open[j * N + i];
            for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) floor[(y + b) * T + x + a] = 1;
            if (o & CAVE_E) for (let b = 0; b < 2; b++) floor[(y + b) * T + x + 2] = 1;
            if (o & CAVE_S) for (let a = 0; a < 2; a++) floor[(y + 2) * T + x + a] = 1;
        }
    }
    for (let y = T - 1; y < H; y++) for (let a = 1; a <= 2; a++) floor[y * T + 3 * h + a] = 1;

    // The one route from the entrance cell to the chest
    const start = (N - 1) * N + h, goal = h * N + h;
    const prev = new Int32Array(N * N).fill(-1);
    prev[start] = start;
    const queue = [start];
    for (let n = 0; n < queue.length && prev[goal] < 0; n++) {
        const k = queue[n], i = k % N, j = (k - i) / N;
        for (const [dx, dy, bit] of CAVE_DIRS) {
            if (!(open[k] & bit)) continue;
            const nk = (j + dy) * N + i + dx;
            if (prev[nk] >= 0) continue;
            prev[nk] = k;
            queue.push(nk);
        }
    }
    const path = [];
    for (let k = goal; k !== start; k = prev[k]) path.push(k);
    path.push(start);
    path.reverse();

    // Traps spread evenly along that route — never in the first two cells (a
    // wrong answer sends him back there) or the chest's — plus a few in dead ends
    const traps = [];
    const room = path.length - 3;
    const onPath = Math.max(0, Math.min(room, 2 + Math.floor(p.tierIndex / 3)));
    for (let n = 0; n < onPath; n++) traps.push(path[2 + Math.floor((n + 0.5) * room / onPath)]);
    const deadEnds = [];
    for (let k = 0; k < N * N; k++) {
        const o = open[k];
        if (k !== start && k !== goal && (o & (o - 1)) === 0) deadEnds.push(k);
    }
    for (let n = deadEnds.length - 1; n > 0; n--) {
        const r = Math.floor(rng() * (n + 1));
        [deadEnds[n], deadEnds[r]] = [deadEnds[r], deadEnds[n]];
    }
    traps.push(...deadEnds.slice(0, 1 + Math.floor(p.tierIndex / 4)));

    // Tile → trap number + 1, covering the trap cell's whole floor
    const trapTile = new Int16Array(T * H);
    traps.forEach((k, n) => {
        const i = k % N, j = (k - i) / N;
        for (let b = 1; b <= 2; b++) for (let a = 1; a <= 2; a++) trapTile[(3 * j + b) * T + 3 * i + a] = n + 1;
    });

    return { N, T, H, h, floor, traps, trapTile };
}

// ─────────────────────────────────────────────────────────────────────────────
// Maze world — shaped like a surface planet so the iso engine runs it as-is
// ─────────────────────────────────────────────────────────────────────────────
function caveMakeWorld(p) {
    const lay = p.cave.layout;
    const mz = {
        tier: p.tier, tierIndex: p.tierIndex, seed: p.seed + 101,
        dark: true, noJump: true,
        chunks: new Map(), lastChunkKey: null, lastChunk: null,
        solidChunk: caveSolidChunk(),           // everything outside the maze is rock
        pal: cavePalette(p.tier),
        items: [], aliens: [], debris: [], pad: null, rocketLanded: false, bootHint: 0,
        man: null, cam: { x: 0, y: 0 }, camZ: 0,
        layout: lay,
        armed: lay.traps.map(() => true),
        chest: { x: 3 * lay.h + 2, y: 3 * lay.h + 2, open: 0 },
        mathOpen: false,
        found: 0,                               // countdown after grabbing the chest
        t: 0,
        torch: { x: 0, y: 0, r: CAVE_TORCH_R },
        banner: 3,
        bannerText: '🔦 Find the treasure!',
        bannerSub: 'It\'s in the middle of the maze — watch out for spike traps',
        tileDecor: caveMazeDecor,
        extraSprites: caveMazeSprites
    };

    const N = ISO_CHUNK;
    for (let cy = 0; cy * N < lay.H; cy++) {
        for (let cx = 0; cx * N < lay.T; cx++) {
            const ch = {
                h: new Uint8Array(N * N).fill(CAVE_WALL), v: new Uint8Array(N * N),
                prop: new Uint8Array(N * N), mesa: new Uint8Array(N * N)
            };
            for (let j = 0; j < N; j++) {
                for (let i = 0; i < N; i++) {
                    const tx = cx * N + i, ty = cy * N + j, k = j * N + i;
                    ch.v[k] = Math.floor(isoHash(tx, ty, mz.seed) * 3);
                    if (tx < lay.T && ty < lay.H && lay.floor[ty * lay.T + tx]) ch.h[k] = 0;
                }
            }
            mz.chunks.set((cx + 32768) * 65536 + (cy + 32768), ch);   // isoChunk's key
        }
    }
    caveToEntrance(mz);
    return mz;
}

// Shared by every chunk outside the maze, so it can't hold anything positional
function caveSolidChunk() {
    const n = ISO_CHUNK * ISO_CHUNK;
    const ch = { h: new Uint8Array(n).fill(CAVE_WALL), v: new Uint8Array(n), prop: new Uint8Array(n), mesa: new Uint8Array(n) };
    for (let k = 0; k < n; k++) ch.v[k] = (k * 7 + (k >> 4) * 5) % 3;
    return ch;
}

function caveToEntrance(mz) {
    const lay = mz.layout;
    mz.man = {
        x: 3 * lay.h + 2, y: lay.T + 1, z: 0, vz: 0, onGround: true, face: 1, walk: 0,
        invuln: 0, hidden: false, kx: 0, ky: 0, hx: 0, hy: -1
    };
    const c = isoRaw(mz.man.x, mz.man.y, 0);
    mz.cam.x = c.x;
    mz.cam.y = c.y;
    mz.camZ = 0;
}

// The tier's rock, darker underfoot. Dark tiers get lifted so the torchlit
// floor still reads against the walls (Obsidian would be solid black).
function cavePalette(tier) {
    const n = parseInt(tier.color.slice(1), 16);
    const lum = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    const lift = Math.max(0, 0.4 - lum) * 0.9;
    const tone = (amt, v = 0) => shade(tier.color, amt + lift + v);
    const pal = isoPalette(tier);
    const wallTop = [-0.02, 0, 0.02].map(v => tone(-0.06, v));
    pal.top = pal.top.map(() => wallTop);
    pal.top[0] = [-0.02, 0, 0.02].map(v => tone(-0.3, v));
    pal.left = tone(-0.14);
    pal.right = tone(-0.22);
    pal.strata = tone(-0.32);
    pal.rim = tier.glow + '55';
    return pal;
}

// ─────────────────────────────────────────────────────────────────────────────
// Maze update
// ─────────────────────────────────────────────────────────────────────────────
function caveUpdate(p, dt) {
    const mz = p.maze, m = mz.man;
    mz.t += dt;
    if (mz.banner > 0) mz.banner = Math.max(0, mz.banner - dt);

    if (mz.found > 0) {                         // lid opening, then back up top
        mz.found -= dt;
        mz.chest.open = Math.min(1, mz.chest.open + dt * 2.5);
        isoUpdateCamera(mz, dt);
        if (mz.found <= 0) caveExit(p);
        return;
    }
    if (mz.mathOpen) return;

    isoUpdateSpaceman(mz, dt);
    isoUpdateCamera(mz, dt);

    const lay = mz.layout;
    const tx = Math.floor(m.x), ty = Math.floor(m.y);
    if (tx >= 0 && ty >= 0 && tx < lay.T && ty < lay.T) {
        const n = lay.trapTile[ty * lay.T + tx];
        if (n && mz.armed[n - 1]) { caveTrap(p, n - 1); return; }
    }
    if (Math.hypot(m.x - mz.chest.x, m.y - mz.chest.y) < 0.8) caveTreasure(p);
}

function caveTrap(p, i) {
    const mz = p.maze;
    mz.mathOpen = true;
    showMath({
        reason: '⚠️ Spike trap! Solve it to disarm the spikes.',
        onCorrect: () => {
            mz.armed[i] = false;
            mz.mathOpen = false;
            flashCanvas('#4ade80');
        },
        onWrong: () => {
            // Leave the right answer up for a moment, with nothing to submit,
            // then back to the entrance. The trap stays armed.
            state.mathCurrent = null;
            const fb = document.getElementById('mathFeedback');
            fb.textContent = fb.textContent.replace('New problem!', 'Back to the cave entrance!');
            setTimeout(() => {
                if (!state.planet || state.planet.maze !== mz) return;
                hideMath();
                mz.mathOpen = false;
                caveToEntrance(mz);
                flashCanvas('#ff6b6b');
            }, CAVE_WRONG_DELAY);
            return true;
        }
    });
}

function caveTreasure(p) {
    const mz = p.maze;
    state.bonusMiles += CAVE_BONUS;
    if (!state.chests.includes(p.tierIndex)) state.chests.push(p.tierIndex);
    p.cave.sealed = true;
    mz.found = CAVE_FOUND_TIME;
    mz.banner = CAVE_FOUND_TIME;
    mz.bannerText = '🧰 Treasure found!';
    mz.bannerSub = `+${CAVE_BONUS.toLocaleString()} bonus miles — the chest is waiting in your ship`;
    flashCanvas('#ffd700');
}

// ─────────────────────────────────────────────────────────────────────────────
// Maze rendering
// ─────────────────────────────────────────────────────────────────────────────
function caveDraw(p) {
    const mz = p.maze, m = mz.man;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const s = isoProject(mz, m.x, m.y, m.z);
    const torch = mz.torch;
    torch.x = s.x;
    torch.y = s.y - 22;
    torch.r = CAVE_TORCH_R * (1 + 0.03 * Math.sin(mz.t * 13) + 0.02 * Math.sin(mz.t * 7.3));

    isoDraw(mz);
    // A wall in front can hide him completely — keep a ghost of him on top
    drawSpacemanAt(mz, s.x, s.y - (MAN_H / 2 - 2), 0.3 * sceneAlpha);

    // Darkness everywhere but the torchlight. Past the gradient's edge the
    // last stop carries on, so the rest of the screen is solid black.
    const dark = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, torch.r);
    dark.addColorStop(0, 'rgba(0,0,0,0)');
    dark.addColorStop(0.45, 'rgba(0,0,0,0.1)');
    dark.addColorStop(0.8, 'rgba(0,0,0,0.82)');
    dark.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const warm = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, torch.r * 0.7);
    warm.addColorStop(0, 'rgba(255,170,60,0.12)');
    warm.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Daylight spilling in at the entrance, so the way in stays findable
    const lay = mz.layout;
    const e = isoProject(mz, 3 * lay.h + 2, lay.T + 1.5, 0);
    const day = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 60);
    day.addColorStop(0, 'rgba(255,240,200,0.22)');
    day.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = day;
    ctx.fillRect(e.x - 60, e.y - 60, 120, 120);

    caveDrawBanner(mz);
}

// isoDraw's per-tile hook: spike plates, faint and only near the torch. Drawn
// with the floor tile so a wall in front still covers them.
function caveMazeDecor(mz, tx, ty, L, cx, cy) {
    if (L !== 0) return;
    const lay = mz.layout;
    if (tx < 0 || ty < 0 || tx >= lay.T || ty >= lay.T) return;
    const n = lay.trapTile[ty * lay.T + tx];
    if (!n) return;
    const torch = mz.torch, y = cy + ISO_TH / 2;
    const k = 1 - Math.hypot(cx - torch.x, y - torch.y) / (torch.r * 0.85);
    if (k <= 0) return;
    const armed = mz.armed[n - 1];

    ctx.save();
    ctx.globalAlpha = sceneAlpha * Math.min(1, k * 1.6) * (armed ? 0.6 : 0.3);
    ctx.fillStyle = armed ? '#9aa3b5' : '#4b5160';
    ctx.strokeStyle = '#1b1e26';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, y - 12); ctx.lineTo(cx + 24, y); ctx.lineTo(cx, y + 12); ctx.lineTo(cx - 24, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (armed) {
        ctx.fillStyle = '#e2e8f0';
        for (const [ox, oy] of [[-10, 0], [10, 0], [0, -5], [0, 5]]) {
            ctx.beginPath();
            ctx.moveTo(cx + ox - 3, y + oy + 1); ctx.lineTo(cx + ox, y + oy - 8); ctx.lineTo(cx + ox + 3, y + oy + 1);
            ctx.closePath();
            ctx.fill();
        }
    } else {                                   // disarmed: just cracks
        ctx.beginPath();
        ctx.moveTo(cx - 12, y - 2); ctx.lineTo(cx - 2, y + 2); ctx.lineTo(cx + 10, y - 3);
        ctx.stroke();
    }
    ctx.restore();
}

function caveMazeSprites(mz, add, onScreen) {
    const c = mz.chest;
    const s = isoProject(mz, c.x, c.y, 0);
    if (!onScreen(s, 80)) return;
    add(c.x, c.y, -0.1, () => {
        isoShadow(mz, c.x, c.y, 0, 22);
        caveDrawChestSprite(s.x, s.y, c.open, mz.tier);
    });
}

// (x, gy) is where the chest sits on the floor
function caveDrawChestSprite(x, gy, open, tier) {
    ctx.save();
    ctx.translate(x, gy);
    const glow = ctx.createRadialGradient(0, -16, 2, 0, -16, 46);
    glow.addColorStop(0, 'rgba(255,215,0,0.45)');
    glow.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, -16, 46, 0, Math.PI * 2); ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#451a03';
    if (open > 0) {
        // Lid tipped back, and the gold heaped inside
        const lh = 16 * open;
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(-18, -22); ctx.lineTo(-20, -26 - lh); ctx.lineTo(20, -26 - lh); ctx.lineTo(18, -22);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.ellipse(0, -22, 16, 4 + 5 * open, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = tier.color;
        for (const [gx, gy, r] of [[-7, -26, 3], [6, -28, 3.5], [0, -24, 2.5]]) {
            ctx.beginPath();
            ctx.moveTo(gx, gy - r * open); ctx.lineTo(gx + r, gy); ctx.lineTo(gx, gy + r); ctx.lineTo(gx - r, gy);
            ctx.closePath(); ctx.fill();
        }
    }
    ctx.fillStyle = '#92400e';
    ctx.beginPath(); ctx.roundRect(-18, -22, 36, 22, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-18, -23, 36, 4);
    ctx.fillRect(-12, -22, 4, 22);
    ctx.fillRect(8, -22, 4, 22);
    if (open === 0) {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(-18, -22); ctx.lineTo(-18, -27);
        ctx.quadraticCurveTo(0, -40, 18, -27);
        ctx.lineTo(18, -22);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-12, -31, 4, 9);
        ctx.fillRect(8, -31, 4, 9);
    }
    // Lock, set with the planet's gem
    ctx.fillStyle = '#fde68a';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-5, -20, 10, 10, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tier.color;
    ctx.beginPath();
    ctx.moveTo(0, -18.5); ctx.lineTo(3, -15); ctx.lineTo(0, -11.5); ctx.lineTo(-3, -15);
    ctx.closePath(); ctx.fill();
    ctx.restore();
}

function caveDrawBanner(mz) {
    if (mz.banner <= 0) return;
    ctx.save();
    ctx.globalAlpha = sceneAlpha * Math.min(1, mz.banner);
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(mz.bannerText, CANVAS_W / 2, 70);
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffd98a';
    ctx.fillText(mz.bannerSub, CANVAS_W / 2, 98);
    ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Wiring — Exit button, Esc, and the CAVE cheat
// ─────────────────────────────────────────────────────────────────────────────
function caveLeavable() {
    const p = state.planet;
    if (!state.running || state.paused || state.phase !== 'planet' || !p || !p.maze) return null;
    return p.caveFade || p.maze.found > 0 ? null : p;
}

document.getElementById('caveExitBtn').addEventListener('click', (e) => {
    e.currentTarget.blur();                   // or Space would press it again
    const p = caveLeavable();
    if (p) caveExit(p);
});

// Type C-A-V-E on an Explore planet to jump to the cave's doorway. Like TURBO,
// it takes the run off the leaderboard. It keeps its own buffer because the
// TURBO one resets on A.
const CAVE_CODE = 'cave';
let caveBuffer = '';

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') {
        const p = caveLeavable();
        if (p) caveExit(p);
        return;
    }
    if (!state.running || state.paused || !/^[a-z]$/.test(k)) return;
    caveBuffer = (caveBuffer + k).slice(-CAVE_CODE.length);
    const p = state.planet;
    if (caveBuffer !== CAVE_CODE || state.phase !== 'planet' || !p || !p.cave ||
        p.maze || p.caveFade || p.mathOpen || p.baseBuilt) return;
    caveBuffer = '';
    state.cheated = true;
    flashCanvas('#9966ff');
    const c = p.cave, m = p.man;
    Object.assign(m, { x: c.ax, y: c.ay, z: c.level, vz: 0, kx: 0, ky: 0, onGround: true });
    c.armed = true;
    const s = isoRaw(m.x, m.y, m.z);
    p.cam.x = s.x;
    p.cam.y = s.y;
    p.camZ = m.z;
});
