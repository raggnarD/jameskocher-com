// WillFall — parallax space backdrop
//
// Loaded BEFORE game.js. Every reference to a game.js global (CANVAS_W/H, ctx,
// TIERS, state) happens INSIDE a function, never at module top level — game.js
// declares those with `const`, so touching them while this file is evaluating
// would hit the temporal dead zone.
//
// Everything here tiles: each layer holds points inside one tile and is drawn
// 2×2 with the scroll offsets taken modulo the tile size. That gives an endless
// field in both axes — horizontally as the ship thrusts, vertically as the
// camera climbs — with zero allocation per frame.

const BG = {
    stars: [],      // [{ z, alpha, pts: [{ x, y, s, tint }] }]
    nebulae: [],    // { x, y, r, color, alpha, z }
    planets: [],    // { x, y, r, color, glow, lit, z }
    dust: [],       // { x, y, s, tint }
    scrollX: 0,
    tierIndex: 0
};

// Depth layers: far/dim/small → near/bright/big. Parallax z doubles as the
// draw alpha multiplier so distance reads even on a still frame.
const STAR_LAYERS = [
    { z: 0.20, n: 80, size: [0.6, 1.3], alpha: 0.38 },
    { z: 0.50, n: 46, size: [0.9, 1.8], alpha: 0.62 },
    { z: 0.90, n: 26, size: [1.2, 2.4], alpha: 0.95 }
];
const DUST_Z = 0.66;
const STAR_TINTS = ['#ffe9c4', '#cfe0ff', '#ffd6e6', '#d8fff0'];

function bgMod(v, m) { return ((v % m) + m) % m; }
function bgRnd(a, b) { return a + Math.random() * (b - a); }
function bgPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function bgRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Blend two hex colours — used to pull nebula/planet colours toward the belt's
// tier colour without ever landing on the exact asteroid colour.
function bgMix(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
    const ch = i => Math.round((((a >> i) & 255) * (1 - t)) + (((b >> i) & 255) * t));
    return `#${[16, 8, 0].map(i => ch(i).toString(16).padStart(2, '0')).join('')}`;
}

// Re-rolled for every belt so no two belts share a sky.
function initBackdrop(tierIndex = 0) {
    const W = CANVAS_W, H = CANVAS_H;
    const tier = TIERS[tierIndex] || TIERS[0];
    BG.tierIndex = tierIndex;
    BG.scrollX = 0;

    BG.stars = STAR_LAYERS.map(L => ({
        z: L.z,
        alpha: L.alpha,
        pts: Array.from({ length: L.n }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            s: bgRnd(L.size[0], L.size[1]),
            tint: Math.random() < 0.18 ? bgPick(STAR_TINTS) : '#ffffff'
        }))
    }));

    // Faint drifting motes between the star layers — reads as depth, not clutter.
    BG.dust = Array.from({ length: 34 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        s: bgRnd(0.5, 1.1),
        tint: bgMix('#8899cc', tier.glow, 0.35)
    }));

    // 2–4 soft clouds on a 2×2-screen tile, tinted toward this belt's colour.
    const nebCount = 2 + Math.floor(Math.random() * 3);
    BG.nebulae = Array.from({ length: nebCount }, () => ({
        x: Math.random() * W * 2,
        y: Math.random() * H * 2,
        r: bgRnd(210, 460),
        color: bgMix(bgPick(['#3a2a7a', '#22406e', '#5a2060', '#1f4a55']), tier.color, bgRnd(0.3, 0.6)),
        alpha: bgRnd(0.11, 0.22),
        z: bgRnd(0.30, 0.42)
    }));

    // 0–2 distant worlds, dimmer than anything the player has to dodge.
    const planetCount = Math.floor(Math.random() * 3);
    BG.planets = Array.from({ length: planetCount }, () => {
        const base = bgPick(['#6a5a8a', '#4a6a8a', '#8a6a5a', '#5a7a6a']);
        return {
            x: Math.random() * W * 2,
            y: Math.random() * H * 2,
            r: bgRnd(26, 72),
            color: bgMix(base, tier.color, 0.3),
            glow: tier.glow,
            lit: bgRnd(-0.8, 0.8),      // which side the star light falls on
            z: bgRnd(0.45, 0.58)
        };
    });
}

// Horizontal drift, driven by the belt's own scroll rate.
function advanceBackdrop(dt, driftPxPerSec) {
    BG.scrollX += driftPxPerSec * dt;
}

// opts: { camY, alpha, starsOnly, maxY }
//   camY      world-y of the screen top (0 for the fixed-camera transitions)
//   alpha     global multiplier — the descent/ascent crossfades pass sceneAlpha
//   starsOnly skip nebulae/planets (the planet sky only wants pinpricks)
//   maxY      cull stars below this screen y (thin-atmosphere sky)
function drawBackdrop(opts = {}) {
    const camY = opts.camY || 0;
    const alpha = opts.alpha === undefined ? 1 : opts.alpha;
    if (alpha <= 0) return;
    ctx.save();
    if (!opts.starsOnly) {
        drawNebulaLayer(camY, alpha);
        drawPlanetLayer(camY, alpha);
    }
    drawStarLayers(camY, alpha, opts.maxY === undefined ? Infinity : opts.maxY);
    ctx.restore();
}

function drawStarLayers(camY, alpha, maxY) {
    const W = CANVAS_W, H = CANVAS_H;
    const layers = BG.stars.concat([{ z: DUST_Z, alpha: 0.3, pts: BG.dust }]);
    for (const layer of layers) {
        const ox = bgMod(BG.scrollX * layer.z, W);
        const oy = bgMod(camY * layer.z, H);
        ctx.globalAlpha = alpha * layer.alpha;
        for (const p of layer.pts) {
            const bx = p.x - ox, by = p.y - oy;
            ctx.fillStyle = p.tint;
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    const y = by + j * H;
                    if (y < -4 || y > maxY || y > H + 4) continue;
                    ctx.fillRect(bx + i * W, y, p.s, p.s);
                }
            }
        }
    }
}

function drawNebulaLayer(camY, alpha) {
    const TW = CANVAS_W * 2, TH = CANVAS_H * 2;
    for (const n of BG.nebulae) {
        const ox = bgMod(BG.scrollX * n.z, TW);
        const oy = bgMod(camY * n.z, TH);
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                const x = n.x - ox + i * TW;
                const y = n.y - oy + j * TH;
                if (x < -n.r || x > CANVAS_W + n.r || y < -n.r || y > CANVAS_H + n.r) continue;
                const g = ctx.createRadialGradient(x, y, n.r * 0.05, x, y, n.r);
                g.addColorStop(0, bgRgba(n.color, n.alpha * alpha));
                g.addColorStop(0.55, bgRgba(n.color, n.alpha * alpha * 0.45));
                g.addColorStop(1, bgRgba(n.color, 0));
                ctx.globalAlpha = 1;
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(x, y, n.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawPlanetLayer(camY, alpha) {
    const TW = CANVAS_W * 2, TH = CANVAS_H * 2;
    for (const p of BG.planets) {
        const ox = bgMod(BG.scrollX * p.z, TW);
        const oy = bgMod(camY * p.z, TH);
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                const x = p.x - ox + i * TW;
                const y = p.y - oy + j * TH;
                const pad = p.r * 1.6;
                if (x < -pad || x > CANVAS_W + pad || y < -pad || y > CANVAS_H + pad) continue;
                ctx.globalAlpha = alpha * 0.45;   // dim enough to never read as an asteroid
                // Halo
                const halo = ctx.createRadialGradient(x, y, p.r, x, y, p.r * 1.55);
                halo.addColorStop(0, bgRgba(p.glow, 0.10));
                halo.addColorStop(1, bgRgba(p.glow, 0));
                ctx.fillStyle = halo;
                ctx.beginPath(); ctx.arc(x, y, p.r * 1.55, 0, Math.PI * 2); ctx.fill();
                // Disc, lit from one side
                const g = ctx.createRadialGradient(
                    x + p.lit * p.r * 0.5, y - p.r * 0.35, p.r * 0.1, x, y, p.r);
                g.addColorStop(0, bgMix(p.color, '#ffffff', 0.35));
                g.addColorStop(0.72, p.color);
                g.addColorStop(1, bgMix(p.color, '#000000', 0.55));
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
}
