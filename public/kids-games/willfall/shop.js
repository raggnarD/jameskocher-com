// WillFall — Trading Post
// Opens after every completed stage (belt and planet). Each stage pays 1 token;
// every catalog entry costs 1 token. Skipping banks the token for later.
//
// Loaded AFTER game.js and planet.js — like planet.js, every reference to their
// globals (state, SHIP_SKINS, updateHUD, startDescent, …) happens inside a
// function, never at module top level.
//
// Everything here is run-scoped: resetShop() wipes it at each launch, and there
// is no persistence. Cosmetics are slot-anchored — buying an item drops it into
// its slot, so there is no placement UI to build or explain.

// ── Canvas helpers ───────────────────────────────────────────────────────────
// Rounded-rect path via arcTo, so this works on any canvas without relying on
// the (newer) ctx.roundRect.
function rr(c, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rad, y);
    c.arcTo(x + w, y, x + w, y + h, rad);
    c.arcTo(x + w, y + h, x, y + h, rad);
    c.arcTo(x, y + h, x, y, rad);
    c.arcTo(x, y, x + w, y, rad);
    c.closePath();
}

function fillRR(c, x, y, w, h, r, fill, stroke, lw) {
    rr(c, x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exterior paint patterns
//
// Each runs with the hull path already clipped, in ship-local coords (origin =
// ship centre, roughly ±32 x, ±22 y). They MUST be deterministic — anything
// driven by Math.random() would re-roll every frame and make the hull crawl.
// ─────────────────────────────────────────────────────────────────────────────
function patDots(c) {
    c.fillStyle = '#e11d48';
    for (let i = -3; i <= 3; i++) {
        for (let j = -2; j <= 2; j++) {
            const x = i * 11 + (j % 2 ? 5.5 : 0);
            c.beginPath(); c.arc(x, j * 9, 2.8, 0, Math.PI * 2); c.fill();
        }
    }
}

function patStripes(c) {
    c.fillStyle = '#ef4444';
    for (const oy of [-5, 5]) c.fillRect(-40, oy - 2.5, 80, 5);
    c.fillStyle = '#1d4ed8';
    c.fillRect(-40, -0.5, 80, 1.6);
}

function patCamo(c) {
    // Fixed blob field — position, size and shade all baked in.
    const blobs = [
        [-22, -8, 9, '#3f5334'], [-6, 6, 11, '#2f3f26'], [10, -7, 8, '#8fa06a'],
        [24, 4, 9, '#3f5334'], [-14, 9, 7, '#8fa06a'], [2, -13, 6, '#2f3f26'],
        [20, -14, 6, '#3f5334'], [-28, 6, 6, '#2f3f26']
    ];
    for (const [x, y, r, col] of blobs) {
        c.fillStyle = col;
        c.beginPath();
        c.ellipse(x, y, r, r * 0.72, (x + y) * 0.1, 0, Math.PI * 2);
        c.fill();
    }
}

function patFlames(c) {
    // Tongues licking forward from the tail.
    const tongues = [[-30, -9, 26], [-30, 0, 34], [-30, 9, 24], [-30, -4, 18], [-30, 5, 16]];
    const cols = ['#f97316', '#fbbf24', '#fde047'];
    tongues.forEach(([x, y, len], i) => {
        c.fillStyle = cols[i % cols.length];
        c.beginPath();
        c.moveTo(x, y - 5);
        c.quadraticCurveTo(x + len * 0.5, y - 7, x + len, y);
        c.quadraticCurveTo(x + len * 0.5, y + 7, x, y + 5);
        c.closePath();
        c.fill();
    });
}

function patChecks(c) {
    c.fillStyle = '#111827';
    const s = 7;
    for (let i = -6; i <= 6; i++) {
        for (let j = -4; j <= 4; j++) {
            if ((i + j) % 2) continue;
            c.fillRect(i * s, j * s, s, s);
        }
    }
}

function patStars(c) {
    const stars = [
        [-26, -8, 2.4], [-18, 5, 1.6], [-9, -11, 2.0], [-2, 3, 1.4], [5, -5, 2.6],
        [13, 7, 1.8], [20, -9, 2.2], [27, 2, 1.5], [-13, -3, 1.3], [9, 11, 1.7],
        [-24, 8, 1.5], [17, -14, 1.4]
    ];
    for (const [x, y, r] of stars) {
        c.fillStyle = r > 2 ? '#ffffff' : '#c4b5fd';
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interior — cabin geometry
//
// One shared cabin for every ship, as designed: the shell tints with the ship's
// paint so it still reads as yours. Each furniture item is anchored to a slot,
// so buying one auto-places it and buying a second in the same slot swaps it.
// ─────────────────────────────────────────────────────────────────────────────
const CABIN = { x0: 28, y0: 36, x1: 432, y1: 234, floorY: 200 };

const INTERIOR_SLOTS = {
    bunk:    { name: 'Sleeping',      emoji: '🛏️', x: 96,  y: CABIN.floorY },
    lounge:  { name: 'Seating',       emoji: '🛋️', x: 178, y: CABIN.floorY },
    light:   { name: 'Lighting',      emoji: '💡', x: 248, y: CABIN.floorY },
    comfort: { name: 'Life & Pets',   emoji: '🪴', x: 312, y: CABIN.floorY },
    screen:  { name: 'Entertainment', emoji: '📺', x: 384, y: CABIN.floorY },
    wallart: { name: 'Wall Decor',    emoji: '🖼️', x: 150, y: 104 }
};

// ── Sleeping ─────────────────────────────────────────────────────────────────
function drawBunkBed(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 36, y - 74, 72, 74, 4, '#6b7f9e', '#3d4a63', 2);
    for (const by of [y - 68, y - 34]) {
        fillRR(c, x - 32, by, 64, 12, 3, '#f8fafc', '#cbd5e1', 1.5);   // mattress
        fillRR(c, x - 28, by - 6, 18, 8, 3, '#f472b6', '#be185d', 1.5); // pillow
    }
    c.strokeStyle = '#3d4a63'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + 22, y - 34); c.lineTo(x + 22, y - 68); c.stroke();
}

function drawHammock(c, a) {
    const x = a.x, y = a.y;
    c.strokeStyle = '#64748b'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - 34, y); c.lineTo(x - 34, y - 62); c.stroke();
    c.beginPath(); c.moveTo(x + 34, y); c.lineTo(x + 34, y - 62); c.stroke();
    c.fillStyle = '#fbbf24'; c.strokeStyle = '#b45309'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 34, y - 54);
    c.quadraticCurveTo(x, y - 12, x + 34, y - 54);
    c.quadraticCurveTo(x, y - 30, x - 34, y - 54);
    c.closePath(); c.fill(); c.stroke();
}

function drawSleepPod(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 34, y - 8, 68, 8, 3, '#475569', '#1e293b', 2);
    c.fillStyle = '#cbd5e1'; c.strokeStyle = '#64748b'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(x, y - 34, 32, 28, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = 'rgba(56,189,248,0.55)';
    c.beginPath(); c.ellipse(x + 3, y - 36, 21, 17, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0ea5e9';
    c.beginPath(); c.arc(x - 22, y - 22, 3, 0, Math.PI * 2); c.fill();
}

function drawCot(c, a) {
    const x = a.x, y = a.y;
    c.strokeStyle = '#475569'; c.lineWidth = 3;
    for (const ox of [-28, 28]) { c.beginPath(); c.moveTo(x + ox, y); c.lineTo(x + ox, y - 16); c.stroke(); }
    fillRR(c, x - 34, y - 26, 68, 12, 4, '#e2e8f0', '#94a3b8', 2);
    fillRR(c, x - 30, y - 33, 18, 9, 4, '#38bdf8', '#0369a1', 1.5);
    fillRR(c, x - 8, y - 24, 40, 9, 4, '#60a5fa', '#1d4ed8', 1.5);
}

// ── Seating ──────────────────────────────────────────────────────────────────
function drawCouch(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 40, y - 40, 80, 26, 8, '#7c3aed', '#4c1d95', 2);       // back
    fillRR(c, x - 44, y - 26, 88, 26, 8, '#8b5cf6', '#4c1d95', 2);       // seat
    for (const ox of [-32, 32]) fillRR(c, x + ox - 8, y - 34, 16, 34, 7, '#a78bfa', '#4c1d95', 2);
    c.strokeStyle = '#4c1d95'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x, y - 26); c.lineTo(x, y - 4); c.stroke();
}

function drawBeanBag(c, a) {
    const x = a.x, y = a.y;
    c.fillStyle = '#f97316'; c.strokeStyle = '#9a3412'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 32, y);
    c.quadraticCurveTo(x - 36, y - 26, x - 10, y - 32);
    c.quadraticCurveTo(x + 6, y - 36, x + 16, y - 22);
    c.quadraticCurveTo(x + 34, y - 18, x + 30, y);
    c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#c2410c'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - 14, y - 30); c.quadraticCurveTo(x - 6, y - 14, x + 12, y - 8); c.stroke();
}

function drawRecliner(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 16, y - 10, 32, 10, 4, '#334155', '#0f172a', 2);       // pedestal
    c.strokeStyle = '#0f172a'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x, y - 10); c.lineTo(x, y - 22); c.stroke();
    fillRR(c, x - 26, y - 32, 52, 12, 5, '#0ea5e9', '#075985', 2);       // seat
    fillRR(c, x - 22, y - 70, 44, 40, 8, '#0ea5e9', '#075985', 2);       // back
    fillRR(c, x - 16, y - 80, 32, 12, 6, '#38bdf8', '#075985', 2);       // headrest
    for (const ox of [-28, 28]) fillRR(c, x + ox - 5, y - 46, 10, 16, 4, '#38bdf8', '#075985', 1.5);
}

function drawCushions(c, a) {
    const x = a.x, y = a.y;
    const pads = [[-26, 0, '#f43f5e', '#9f1239'], [2, -2, '#facc15', '#a16207'], [26, 0, '#22d3ee', '#0e7490']];
    for (const [ox, oy, fill, stroke] of pads) {
        fillRR(c, x + ox - 15, y - 16 + oy, 30, 16, 6, fill, stroke, 2);
        c.strokeStyle = stroke; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x + ox - 8, y - 12 + oy); c.lineTo(x + ox + 8, y - 8 + oy); c.stroke();
    }
}

// ── Lighting ─────────────────────────────────────────────────────────────────
function drawLavaLamp(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 13, y - 10, 26, 10, 3, '#a16207', '#713f12', 2);
    c.fillStyle = 'rgba(251,146,60,0.9)'; c.strokeStyle = '#c2410c'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 10, y - 10);
    c.quadraticCurveTo(x - 8, y - 48, x, y - 56);
    c.quadraticCurveTo(x + 8, y - 48, x + 10, y - 10);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fde047';
    for (const [ox, oy, r] of [[-2, -20, 4], [3, -32, 3], [-1, -43, 2.4]]) {
        c.beginPath(); c.arc(x + ox, y + oy, r, 0, Math.PI * 2); c.fill();
    }
    fillRR(c, x - 8, y - 62, 16, 7, 3, '#a16207', '#713f12', 1.5);
}

function drawFloorLamp(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 14, y - 6, 28, 6, 3, '#475569', '#1e293b', 2);
    c.strokeStyle = '#64748b'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x, y - 62); c.stroke();
    // Warm pool of light under the shade
    const g = c.createLinearGradient(x, y - 62, x, y - 4);
    g.addColorStop(0, 'rgba(253,224,71,0.45)');
    g.addColorStop(1, 'rgba(253,224,71,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(x - 16, y - 60); c.lineTo(x + 16, y - 60); c.lineTo(x + 30, y - 4); c.lineTo(x - 30, y - 4);
    c.closePath(); c.fill();
    c.fillStyle = '#fef3c7'; c.strokeStyle = '#d97706'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 18, y - 60); c.lineTo(x + 18, y - 60); c.lineTo(x + 12, y - 80); c.lineTo(x - 12, y - 80);
    c.closePath(); c.fill(); c.stroke();
}

function drawStringLights(c, a) {
    const x = a.x, ceil = a.ceil;
    c.strokeStyle = '#475569'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 74, ceil + 2);
    c.quadraticCurveTo(x, ceil + 34, x + 74, ceil + 2);
    c.stroke();
    const cols = ['#f43f5e', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];
    for (let i = 0; i <= 8; i++) {
        // Bulbs ride the same quadratic as the wire: 2t(1-t) × (control − ends).
        const t = i / 8;
        const bx = x - 74 + 148 * t;
        const by = ceil + 2 + 64 * t * (1 - t) + 4;
        c.fillStyle = cols[i % cols.length];
        c.beginPath(); c.arc(bx, by, 3.6, 0, Math.PI * 2); c.fill();
    }
}

function drawDiscoBall(c, a) {
    const x = a.x, ceil = a.ceil;
    c.strokeStyle = '#475569'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, ceil); c.lineTo(x, ceil + 26); c.stroke();
    const cy = ceil + 44;
    c.fillStyle = '#cbd5e1'; c.strokeStyle = '#64748b'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, cy, 18, 0, Math.PI * 2); c.fill(); c.stroke();
    c.save();
    c.beginPath(); c.arc(x, cy, 18, 0, Math.PI * 2); c.clip();
    c.strokeStyle = '#94a3b8'; c.lineWidth = 1;
    for (let i = -18; i <= 18; i += 6) {
        c.beginPath(); c.moveTo(x + i, cy - 18); c.lineTo(x + i, cy + 18); c.stroke();
        c.beginPath(); c.moveTo(x - 18, cy + i); c.lineTo(x + 18, cy + i); c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(x - 12, cy - 12, 6, 6);
    c.fillRect(x + 2, cy + 4, 5, 5);
    c.restore();
}

// ── Life & Pets ──────────────────────────────────────────────────────────────
function drawPlant(c, a) {
    const x = a.x, y = a.y;
    c.fillStyle = '#c2410c'; c.strokeStyle = '#7c2d12'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 15, y - 22); c.lineTo(x + 15, y - 22); c.lineTo(x + 11, y); c.lineTo(x - 11, y);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#16a34a'; c.strokeStyle = '#14532d'; c.lineWidth = 1.5;
    const leaves = [[-16, -44, -0.7], [0, -52, 0], [16, -44, 0.7], [-9, -34, -0.4], [10, -34, 0.4]];
    for (const [ox, oy, rot] of leaves) {
        c.save(); c.translate(x + ox, y + oy); c.rotate(rot);
        c.beginPath(); c.ellipse(0, 0, 7, 15, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.restore();
    }
}

function drawFishTank(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 26, y - 14, 52, 14, 3, '#78350f', '#451a03', 2);        // stand
    fillRR(c, x - 28, y - 52, 56, 38, 4, '#0ea5e9', '#0c4a6e', 2);        // water
    c.fillStyle = '#a16207';
    c.fillRect(x - 26, y - 20, 52, 5);                                     // gravel
    c.fillStyle = '#fb923c';
    for (const [ox, oy] of [[-10, -38], [8, -30]]) {
        c.beginPath(); c.ellipse(x + ox, y + oy, 6, 4, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.moveTo(x + ox - 6, y + oy); c.lineTo(x + ox - 11, y + oy - 4);
        c.lineTo(x + ox - 11, y + oy + 4); c.closePath(); c.fill();
    }
    c.strokeStyle = '#4ade80'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + 20, y - 20); c.quadraticCurveTo(x + 15, y - 34, x + 21, y - 44); c.stroke();
}

function drawFridge(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 22, y - 58, 44, 58, 5, '#e2e8f0', '#64748b', 2);
    c.strokeStyle = '#94a3b8'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - 22, y - 34); c.lineTo(x + 22, y - 34); c.stroke();
    c.fillStyle = '#64748b';
    c.fillRect(x + 12, y - 52, 4, 12);
    c.fillRect(x + 12, y - 28, 4, 12);
    fillRR(c, x - 16, y - 28, 26, 20, 3, '#38bdf8', '#0369a1', 1.5);       // window
    c.fillStyle = '#f43f5e'; c.fillRect(x - 13, y - 18, 6, 8);
    c.fillStyle = '#facc15'; c.fillRect(x - 4, y - 18, 6, 8);
}

function drawPet(c, a) {
    const x = a.x, y = a.y;
    c.fillStyle = '#7c3aed'; c.strokeStyle = '#4c1d95'; c.lineWidth = 2;   // bed
    c.beginPath(); c.ellipse(x, y - 6, 28, 9, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#22d3ee'; c.strokeStyle = '#0e7490'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y - 22, 16, 0, Math.PI * 2); c.fill(); c.stroke();
    for (const ox of [-10, 10]) {                                          // ears
        c.beginPath();
        c.moveTo(x + ox - 5, y - 32); c.lineTo(x + ox, y - 46); c.lineTo(x + ox + 5, y - 32);
        c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = '#0f172a';
    for (const ox of [-6, 6]) { c.beginPath(); c.arc(x + ox, y - 24, 2.6, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#0f172a'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y - 18, 5, 0.2, Math.PI - 0.2); c.stroke();
}

// ── Entertainment ────────────────────────────────────────────────────────────
function drawTV(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 26, y - 12, 52, 12, 3, '#334155', '#0f172a', 2);         // console
    c.strokeStyle = '#0f172a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x, y - 22); c.stroke();
    fillRR(c, x - 32, y - 62, 64, 40, 4, '#0f172a', '#020617', 2);
    const g = c.createLinearGradient(x, y - 60, x, y - 26);
    g.addColorStop(0, '#1e3a8a'); g.addColorStop(1, '#7c3aed');
    fillRR(c, x - 28, y - 58, 56, 32, 2, g, null, 0);
    c.fillStyle = '#ffffff';
    for (const [ox, oy] of [[-18, -50], [-4, -40], [12, -52], [20, -34]]) {
        c.beginPath(); c.arc(x + ox, y + oy, 1.6, 0, Math.PI * 2); c.fill();
    }
}

function drawArcade(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 24, y - 82, 48, 82, 6, '#dc2626', '#7f1d1d', 2);
    fillRR(c, x - 20, y - 78, 40, 14, 3, '#facc15', '#a16207', 1.5);       // marquee
    fillRR(c, x - 19, y - 60, 38, 26, 2, '#0f172a', '#020617', 1.5);       // screen
    c.fillStyle = '#4ade80';
    c.fillRect(x - 12, y - 44, 6, 4); c.fillRect(x + 2, y - 50, 6, 4); c.fillRect(x - 3, y - 40, 6, 4);
    fillRR(c, x - 22, y - 32, 44, 10, 3, '#1e293b', '#0f172a', 1.5);       // control panel
    c.fillStyle = '#f43f5e';
    c.beginPath(); c.arc(x - 10, y - 27, 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#38bdf8';
    c.beginPath(); c.arc(x + 2, y - 27, 3, 0, Math.PI * 2); c.fill();
}

function drawJukebox(c, a) {
    const x = a.x, y = a.y;
    c.fillStyle = '#b45309'; c.strokeStyle = '#78350f'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 24, y);
    c.lineTo(x - 24, y - 44);
    c.quadraticCurveTo(x, y - 78, x + 24, y - 44);
    c.lineTo(x + 24, y);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fbbf24'; c.strokeStyle = '#78350f'; c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x - 16, y - 42);
    c.quadraticCurveTo(x, y - 68, x + 16, y - 42);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#0f172a';
    c.beginPath(); c.arc(x, y - 44, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f43f5e';
    c.beginPath(); c.arc(x, y - 44, 3, 0, Math.PI * 2); c.fill();
    for (const ox of [-14, -4, 6, 16]) { c.fillStyle = '#38bdf8'; c.fillRect(x + ox - 3, y - 24, 6, 5); }
}

function drawTelescope(c, a) {
    const x = a.x, y = a.y;
    c.strokeStyle = '#475569'; c.lineWidth = 3;
    for (const ox of [-14, 0, 14]) { c.beginPath(); c.moveTo(x, y - 34); c.lineTo(x + ox, y); c.stroke(); }
    c.save();
    c.translate(x, y - 40); c.rotate(-0.6);
    fillRR(c, -28, -7, 56, 14, 6, '#e2e8f0', '#475569', 2);
    fillRR(c, 24, -9, 10, 18, 3, '#0ea5e9', '#075985', 2);                 // lens
    fillRR(c, -34, -5, 10, 10, 3, '#334155', '#0f172a', 1.5);              // eyepiece
    c.restore();
}

// ── Wall decor ───────────────────────────────────────────────────────────────
function drawPhoto(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 26, y - 20, 52, 40, 3, '#a16207', '#713f12', 3);
    fillRR(c, x - 21, y - 15, 42, 30, 2, '#fef3c7', null, 0);
    c.fillStyle = '#38bdf8'; c.fillRect(x - 21, y - 15, 42, 14);
    c.fillStyle = '#4ade80'; c.fillRect(x - 21, y - 1, 42, 16);
    c.fillStyle = '#7c3aed';
    c.beginPath(); c.arc(x - 7, y + 2, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f43f5e';
    c.beginPath(); c.arc(x + 6, y + 3, 4, 0, Math.PI * 2); c.fill();
}

function drawPoster(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 22, y - 26, 44, 52, 2, '#1e1b4b', '#4c1d95', 2);
    c.fillStyle = '#f8fafc';
    c.beginPath();
    c.moveTo(x, y - 20); c.lineTo(x + 8, y + 2); c.lineTo(x - 8, y + 2);
    c.closePath(); c.fill();
    c.fillStyle = '#f97316';
    c.beginPath(); c.moveTo(x - 4, y + 2); c.lineTo(x, y + 12); c.lineTo(x + 4, y + 2); c.closePath(); c.fill();
    c.fillStyle = '#fde047';
    for (const [ox, oy] of [[-15, -18], [14, -12], [-13, 12], [15, 16]]) {
        c.beginPath(); c.arc(x + ox, y + oy, 1.6, 0, Math.PI * 2); c.fill();
    }
}

function drawClock(c, a) {
    const x = a.x, y = a.y;
    c.fillStyle = '#f8fafc'; c.strokeStyle = '#334155'; c.lineWidth = 3;
    c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill(); c.stroke();
    c.strokeStyle = '#64748b'; c.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        c.beginPath();
        c.moveTo(x + Math.cos(ang) * 17, y + Math.sin(ang) * 17);
        c.lineTo(x + Math.cos(ang) * 20, y + Math.sin(ang) * 20);
        c.stroke();
    }
    c.strokeStyle = '#0f172a'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 12); c.stroke();
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 9, y + 5); c.stroke();
    c.lineCap = 'butt';
}

function drawTrophyShelf(c, a) {
    const x = a.x, y = a.y;
    fillRR(c, x - 32, y + 12, 64, 6, 2, '#92400e', '#451a03', 2);
    c.fillStyle = '#fbbf24'; c.strokeStyle = '#b45309'; c.lineWidth = 2;
    c.beginPath();                                                          // cup
    c.moveTo(x - 9, y - 12); c.lineTo(x + 9, y - 12); c.lineTo(x + 5, y + 2); c.lineTo(x - 5, y + 2);
    c.closePath(); c.fill(); c.stroke();
    c.fillRect(x - 3, y + 2, 6, 6);
    fillRR(c, x - 9, y + 8, 18, 4, 1, '#b45309', null, 0);
    c.strokeStyle = '#fbbf24'; c.lineWidth = 2;
    c.beginPath(); c.arc(x - 11, y - 7, 4, Math.PI * 0.5, Math.PI * 1.5, true); c.stroke();
    c.beginPath(); c.arc(x + 11, y - 7, 4, Math.PI * 0.5, Math.PI * 1.5, false); c.stroke();
    for (const [ox, col] of [[-22, '#cbd5e1'], [22, '#f472b6']]) {          // medals
        c.fillStyle = col; c.strokeStyle = '#475569'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(x + ox, y + 4, 6, 0, Math.PI * 2); c.fill(); c.stroke();
    }
}

// ── Floors ───────────────────────────────────────────────────────────────────
function floorDeck(c, x0, y0, x1, y1) {          // the stock metal deck
    c.fillStyle = '#333b52'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.strokeStyle = '#232a3d'; c.lineWidth = 2;
    for (let x = x0; x < x1; x += 34) { c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); }
}

function floorGrating(c, x0, y0, x1, y1) {
    c.fillStyle = '#3f4757'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.fillStyle = '#232a36';
    for (let x = x0 + 4; x < x1 - 4; x += 12) c.fillRect(x, y0 + 5, 6, y1 - y0 - 10);
    c.strokeStyle = '#8f9bb0'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x0, y0 + 1); c.lineTo(x1, y0 + 1); c.stroke();
}

function floorWood(c, x0, y0, x1, y1) {
    c.fillStyle = '#a16207'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.strokeStyle = '#78350f'; c.lineWidth = 1.5;
    for (let y = y0 + 11; y < y1; y += 11) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
    c.strokeStyle = '#854d0e'; c.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
        const x = x0 + 17 + i * 33;
        const y = y0 + 11 * (i % 3);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 11); c.stroke();
    }
}

function floorChecker(c, x0, y0, x1, y1) {
    const s = 17;
    for (let i = 0; x0 + i * s < x1; i++) {
        for (let j = 0; y0 + j * s < y1; j++) {
            c.fillStyle = (i + j) % 2 ? '#e2e8f0' : '#1e293b';
            c.fillRect(x0 + i * s, y0 + j * s, Math.min(s, x1 - (x0 + i * s)), Math.min(s, y1 - (y0 + j * s)));
        }
    }
}

function floorShag(c, x0, y0, x1, y1) {
    c.fillStyle = '#7e22ce'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.strokeStyle = '#a855f7'; c.lineWidth = 2;
    for (let i = 0; x0 + i * 9 < x1; i++) {
        const x = x0 + i * 9;
        const y = y0 + 5 + (i % 4) * 7;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4, y + 5, x + 1, y + 11); c.stroke();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog — every entry costs 1 token
// ─────────────────────────────────────────────────────────────────────────────
const SHOP_CATALOG = {
    interior: [
        { slot: 'lounge', items: [
            { id: 'in_couch',    name: 'Couch',              emoji: '🛋️', draw: drawCouch },
            { id: 'in_beanbag',  name: 'Bean Bag',           emoji: '🫘', draw: drawBeanBag },
            { id: 'in_recliner', name: "Captain's Recliner", emoji: '💺', draw: drawRecliner },
            { id: 'in_cushions', name: 'Floor Cushions',     emoji: '🧶', draw: drawCushions }
        ] },
        { slot: 'bunk', items: [
            { id: 'in_bunk',    name: 'Bunk Bed',     emoji: '🛏️', draw: drawBunkBed },
            { id: 'in_hammock', name: 'Hammock',      emoji: '🪢', draw: drawHammock },
            { id: 'in_pod',     name: 'Sleep Pod',    emoji: '🥚', draw: drawSleepPod },
            { id: 'in_cot',     name: 'Fold-Out Cot', emoji: '🛌', draw: drawCot }
        ] },
        { slot: 'light', items: [
            { id: 'in_lava',   name: 'Lava Lamp',     emoji: '🌋', draw: drawLavaLamp },
            { id: 'in_lamp',   name: 'Floor Lamp',    emoji: '💡', draw: drawFloorLamp },
            { id: 'in_string', name: 'String Lights', emoji: '✨', draw: drawStringLights },
            { id: 'in_disco',  name: 'Disco Ball',    emoji: '🪩', draw: drawDiscoBall }
        ] },
        { slot: 'screen', items: [
            { id: 'in_tv',        name: 'Flat-Screen TV',  emoji: '📺', draw: drawTV },
            { id: 'in_arcade',    name: 'Arcade Cabinet',  emoji: '🕹️', draw: drawArcade },
            { id: 'in_jukebox',   name: 'Jukebox',         emoji: '🎵', draw: drawJukebox },
            { id: 'in_telescope', name: 'Telescope',       emoji: '🔭', draw: drawTelescope }
        ] },
        { slot: 'comfort', items: [
            { id: 'in_plant',  name: 'Potted Plant', emoji: '🪴', draw: drawPlant },
            { id: 'in_tank',   name: 'Fish Tank',    emoji: '🐠', draw: drawFishTank },
            { id: 'in_fridge', name: 'Snack Fridge', emoji: '🧊', draw: drawFridge },
            { id: 'in_pet',    name: 'Space Pet',    emoji: '🐶', draw: drawPet }
        ] },
        { slot: 'wallart', items: [
            { id: 'in_photo',   name: 'Framed Photo', emoji: '🖼️', draw: drawPhoto },
            { id: 'in_poster',  name: 'Rocket Poster', emoji: '📜', draw: drawPoster },
            { id: 'in_clock',   name: 'Wall Clock',   emoji: '🕐', draw: drawClock },
            { id: 'in_trophy',  name: 'Trophy Shelf', emoji: '🏆', draw: drawTrophyShelf }
        ] },
        { slot: 'floor', label: 'Floor', emoji: '🟦', items: [
            { id: 'fl_grate',   name: 'Metal Grating', emoji: '⬜', paint: floorGrating },
            { id: 'fl_wood',    name: 'Wood Planks',   emoji: '🟫', paint: floorWood },
            { id: 'fl_checker', name: 'Checker Tile',  emoji: '🏁', paint: floorChecker },
            { id: 'fl_shag',    name: 'Shag Carpet',   emoji: '🟣', paint: floorShag }
        ] },
        { slot: 'walls', label: 'Wall Paint', emoji: '🎨', items: [
            { id: 'wl_ivory',  name: 'Ivory',          emoji: '🤍', top: '#f8f5ec', bottom: '#ddd6c4' },
            { id: 'wl_sky',    name: 'Sky Blue',       emoji: '💙', top: '#7dd3fc', bottom: '#2f7fae' },
            { id: 'wl_mint',   name: 'Mint',           emoji: '💚', top: '#86efac', bottom: '#3d8d63' },
            { id: 'wl_bubble', name: 'Bubblegum Pink', emoji: '💗', top: '#f9a8d4', bottom: '#b3557f' },
            { id: 'wl_navy',   name: 'Deep Navy',      emoji: '🔵', top: '#1e3a8a', bottom: '#0d1a3f' },
            { id: 'wl_sun',    name: 'Sunbeam Yellow', emoji: '💛', top: '#fde68a', bottom: '#b08a2e' }
        ] }
    ],

    exterior: [
        { slot: 'paint', label: 'Solid Colors', emoji: '🪣', items: [
            { id: 'px_crimson',   name: 'Crimson',   emoji: '🔴', fill: '#ef4444', stroke: '#7f1d1d', accent: '#7f1d1d' },
            { id: 'px_cobalt',    name: 'Cobalt',    emoji: '🔵', fill: '#3b82f6', stroke: '#1e3a8a', accent: '#1e3a8a' },
            { id: 'px_lime',      name: 'Lime',      emoji: '🟢', fill: '#84cc16', stroke: '#3f6212', accent: '#3f6212' },
            { id: 'px_violet',    name: 'Violet',    emoji: '🟣', fill: '#a855f7', stroke: '#5b21b6', accent: '#5b21b6' },
            { id: 'px_tangerine', name: 'Tangerine', emoji: '🟠', fill: '#fb923c', stroke: '#9a3412', accent: '#9a3412' },
            { id: 'px_snow',      name: 'Snow',      emoji: '⚪', fill: '#f8fafc', stroke: '#64748b', accent: '#475569' }
        ] },
        { slot: 'paint', label: 'Fun Paint', emoji: '🎨', items: [
            { id: 'px_dots',   name: 'Polka Dots',   emoji: '🔴', fill: '#ffe066', stroke: '#a16207', accent: '#a16207', pattern: patDots },
            { id: 'px_stripe', name: 'Racing Stripes', emoji: '🏎️', fill: '#f1f5f9', stroke: '#334155', accent: '#334155', pattern: patStripes },
            { id: 'px_camo',   name: 'Camo',         emoji: '🪖', fill: '#5c7a4a', stroke: '#2f3f26', accent: '#2f3f26', pattern: patCamo },
            { id: 'px_flames', name: 'Flames',       emoji: '🔥', fill: '#1f2937', stroke: '#111827', accent: '#f97316', pattern: patFlames },
            { id: 'px_check',  name: 'Checkerboard', emoji: '🏁', fill: '#ffffff', stroke: '#111827', accent: '#111827', pattern: patChecks },
            { id: 'px_stars',  name: 'Starfield',    emoji: '🌌', fill: '#1e1b4b', stroke: '#4c1d95', accent: '#c4b5fd', pattern: patStars }
        ] }
    ],

    upgrades: [
        { label: 'Hull & Engine', emoji: '🔧', items: [
            { id: 'shieldPlate', name: 'Shield Plate',        emoji: '🛡️', max: 3, desc: '+1 max shield (and one right now)' },
            { id: 'bigTank',     name: 'Long-Range Tank',     emoji: '⛽', max: 3, desc: '+30% gas capacity' },
            { id: 'thrusters',   name: 'Efficient Thrusters', emoji: '🔥', max: 2, desc: 'Thrusting burns 20% less gas' },
            { id: 'deflector',   name: 'Nose Deflector',      emoji: '🛰️', max: 2, desc: '15% smaller hit box in the belt' }
        ] },
        { label: 'Surface Gear', emoji: '⛏️', items: [
            { id: 'gravBoots', name: 'Grav Boots',      emoji: '🥾', max: 2, desc: 'Jump 15% higher on planets' },
            { id: 'magnet',    name: 'Magnet Glove',    emoji: '🧲', max: 2, desc: '50% longer reach for resources' },
            { id: 'cargoNet',  name: 'Cargo Netting',   emoji: '🎒', max: 1, desc: 'Alien hits cost 1 resource, not 3' },
            { id: 'refinery',  name: 'Refinery Module', emoji: '⚗️', max: 2, desc: '+100 bonus miles per resource' }
        ] }
    ]
};

// Flat id → entry lookup, built once. Each entry carries its own kind and slot
// so purchase handling never has to know which tab it came from.
const SHOP_INDEX = (() => {
    const index = {};
    for (const [kind, groups] of Object.entries(SHOP_CATALOG)) {
        for (const g of groups) {
            for (const item of g.items) {
                index[item.id] = Object.assign({}, item, {
                    kind: kind === 'upgrades' ? 'upgrade' : 'cosmetic',
                    slot: g.slot || null
                });
            }
        }
    }
    return index;
})();

function groupLabel(g) {
    if (g.label) return { name: g.label, emoji: g.emoji || '' };
    const slot = INTERIOR_SLOTS[g.slot];
    return slot ? { name: slot.name, emoji: slot.emoji } : { name: g.slot, emoji: '' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shop state
// ─────────────────────────────────────────────────────────────────────────────
let shopTab = 'interior';
let shopDone = null;        // what to run when the player continues
let shopStage = 'belt';
let shopToastTimer = null;

function resetShop() {
    state.shop = { tokens: 0, owned: {}, equipped: {}, upgrades: {} };
    shopTab = 'interior';
    shopDone = null;
}

// Equipped paint merged over the ship's own colors. Called from drawShipSkin()
// on every ship render, so it must stay cheap and never throw.
function activePalette(skin) {
    const id = state.shop && state.shop.equipped ? state.shop.equipped.paint : null;
    const paint = id ? SHOP_INDEX[id] : null;
    if (!paint) return skin.palette;
    return {
        fill: paint.fill,
        stroke: paint.stroke,
        accent: paint.accent,
        trim: paint.trim || paint.accent,
        dome: paint.dome || paint.fill,
        pattern: paint.pattern || null
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle — the shop is a paused overlay, exactly like the math modal, so the
// phase machine in loop()/draw() needs no new state. The frozen stage keeps
// rendering behind the blur.
// ─────────────────────────────────────────────────────────────────────────────
function openShop(afterStage, onDone) {
    state.shop.tokens += 1;
    state.paused = true;
    shopStage = afterStage;
    shopDone = onDone;
    updateHUD();
    renderShop();
    document.getElementById('shopScreen').classList.remove('hidden');
}

function closeShop() {
    document.getElementById('shopScreen').classList.add('hidden');
    state.paused = false;
    state.lastFrameTs = 0;
    updateHUD();                 // spent tokens should show before the next frame
    const done = shopDone;
    shopDone = null;
    if (done) done();
}

function shopToast(msg) {
    const el = document.getElementById('shopToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(shopToastTimer);
    shopToastTimer = setTimeout(() => el.classList.remove('visible'), 1400);
}

// One click handles buy, equip and put-away. Owned items are free to re-equip,
// so a slot can be toggled between things you already bought.
function shopClick(id) {
    const entry = SHOP_INDEX[id];
    if (!entry) return;
    const sh = state.shop;

    if (entry.kind === 'upgrade') {
        const lvl = sh.upgrades[id] || 0;
        if (lvl >= entry.max) { shopToast(`${entry.name} is maxed out`); return; }
        if (sh.tokens < 1) { shopToast('Not enough tokens — finish a stage first'); return; }
        sh.tokens -= 1;
        sh.upgrades[id] = lvl + 1;
        // Capacity upgrades top you up on the spot; a max you can't fill feels broken.
        if (id === 'shieldPlate') state.shields = Math.min(maxShields(), state.shields + 1);
        if (id === 'bigTank') state.gasMiles = Math.min(tankMiles(), state.gasMiles + TANK_MILES * 0.30);
        shopToast(`${entry.emoji} ${entry.name} installed!`);
    } else {
        if (!sh.owned[id]) {
            if (sh.tokens < 1) { shopToast('Not enough tokens — finish a stage first'); return; }
            sh.tokens -= 1;
            sh.owned[id] = true;
            sh.equipped[entry.slot] = id;
            shopToast(`${entry.emoji} ${entry.name} added!`);
        } else if (sh.equipped[entry.slot] === id) {
            delete sh.equipped[entry.slot];      // click what's in use to put it away
        } else {
            sh.equipped[entry.slot] = id;
        }
    }

    updateHUD();
    renderShop();
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering — item lists
// ─────────────────────────────────────────────────────────────────────────────
function itemButton(item, kind, slot) {
    const sh = state.shop;
    let badge, cls = '';
    if (kind === 'upgrades') {
        const lvl = sh.upgrades[item.id] || 0;
        if (lvl >= item.max) { badge = `Max ${lvl}/${item.max}`; cls = ' maxed'; }
        else if (lvl > 0) { badge = `Lv ${lvl}/${item.max} · 1🪙`; cls = ' owned'; }
        else badge = '1🪙';
        if (lvl < item.max && sh.tokens < 1) cls += ' locked';
    } else if (sh.equipped[slot] === item.id) {
        badge = 'In use'; cls = ' owned equipped';
    } else if (sh.owned[item.id]) {
        badge = 'Owned'; cls = ' owned';
    } else {
        badge = '1🪙';
        if (sh.tokens < 1) cls = ' locked';
    }
    const desc = item.desc ? `<span class="si-desc">${item.desc}</span>` : '';
    return `<button class="shop-item${cls}" data-id="${item.id}">` +
        `<span class="si-emoji">${item.emoji}</span>` +
        `<span class="si-name">${item.name}</span>${desc}` +
        `<span class="si-badge">${badge}</span></button>`;
}

function renderGroups(groups, kind) {
    return groups.map(g => {
        const { name, emoji } = groupLabel(g);
        return `<div class="shop-group">` +
            `<div class="shop-group-label">${emoji} ${name}</div>` +
            `<div class="shop-grid">${g.items.map(i => itemButton(i, kind, g.slot)).join('')}</div>` +
            `</div>`;
    }).join('');
}

function renderShop() {
    const sh = state.shop;
    const tier = TIERS[state.beltIndex];
    const what = shopStage === 'belt' ? 'belt' : 'planet';
    document.getElementById('shopSubtitle').textContent =
        `${tier.emoji} ${tier.name} ${what} cleared — here's your token.`;
    document.getElementById('shopTokens').textContent = `🪙 ${sh.tokens}`;

    document.querySelectorAll('.shop-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === shopTab));

    const body = document.getElementById('shopBody');
    if (shopTab === 'interior')      body.innerHTML = renderGroups(SHOP_CATALOG.interior, 'interior');
    else if (shopTab === 'exterior') body.innerHTML = renderGroups(SHOP_CATALOG.exterior, 'exterior');
    else                             body.innerHTML = renderGroups(SHOP_CATALOG.upgrades, 'upgrades');

    document.getElementById('shopContinue').textContent =
        sh.tokens > 0 ? `🚀 Continue (bank ${sh.tokens} 🪙)` : '🚀 Continue';

    drawShopPreview();
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering — preview canvas
// ─────────────────────────────────────────────────────────────────────────────
function drawShopPreview() {
    const cv = document.getElementById('shopPreview');
    if (!cv) return;
    const c = cv.getContext('2d');
    if (shopTab === 'interior') drawInteriorPreview(c, cv.width, cv.height);
    else drawExteriorPreview(c, cv.width, cv.height);
}

// Deterministic backdrop stars — a fixed lattice, so the preview never twinkles
// while the player is reading it.
function previewStars(c, W, H) {
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i++) {
        const x = (i * 97) % W;
        const y = (i * 53 + (i % 7) * 31) % H;
        c.globalAlpha = 0.25 + (i % 5) * 0.15;
        c.fillRect(x, y, i % 6 === 0 ? 2 : 1, i % 6 === 0 ? 2 : 1);
    }
    c.globalAlpha = 1;
}

function drawInteriorPreview(c, W, H) {
    const skin = SHIP_SKINS[state.shipSkin];
    const pal = activePalette(skin);
    const sh = state.shop;

    c.fillStyle = '#05050f';
    c.fillRect(0, 0, W, H);
    previewStars(c, W, H);

    // Hull shell — tinted with the ship's own paint so the cabin reads as yours
    fillRR(c, 12, 20, W - 24, H - 40, 56, pal.fill, pal.stroke, 4);

    const { x0, y0, x1, y1, floorY } = CABIN;
    c.save();
    rr(c, x0, y0, x1 - x0, y1 - y0, 30);
    c.clip();

    // Wall paint
    const wall = SHOP_INDEX[sh.equipped.walls];
    const wg = c.createLinearGradient(0, y0, 0, floorY);
    wg.addColorStop(0, wall ? wall.top : '#2b3350');
    wg.addColorStop(1, wall ? wall.bottom : '#1b2138');
    c.fillStyle = wg;
    c.fillRect(x0, y0, x1 - x0, floorY - y0);

    // Porthole onto space
    c.save();
    c.beginPath(); c.arc(300, 80, 26, 0, Math.PI * 2);
    c.fillStyle = '#05050f'; c.fill(); c.clip();
    c.fillStyle = '#ffffff';
    for (const [sx, sy, r] of [[292, 70, 1.6], [308, 86, 1.2], [297, 92, 1.4], [312, 68, 1.1]]) {
        c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#7c3aed';
    c.beginPath(); c.arc(313, 90, 9, 0, Math.PI * 2); c.fill();
    c.restore();
    c.strokeStyle = pal.stroke; c.lineWidth = 5;
    c.beginPath(); c.arc(300, 80, 26, 0, Math.PI * 2); c.stroke();

    // Floor
    const floor = SHOP_INDEX[sh.equipped.floor];
    (floor ? floor.paint : floorDeck)(c, x0, floorY, x1, y1);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x0, floorY); c.lineTo(x1, floorY); c.stroke();

    // Furniture, back-to-front is irrelevant here — the slots don't overlap
    for (const [slot, anchor] of Object.entries(INTERIOR_SLOTS)) {
        const a = { x: anchor.x, y: anchor.y, ceil: y0 + 4 };
        const item = SHOP_INDEX[sh.equipped[slot]];
        if (item && item.draw) item.draw(c, a);
        else drawEmptySlot(c, anchor);
    }

    c.restore();
    rr(c, x0, y0, x1 - x0, y1 - y0, 30);
    c.strokeStyle = pal.stroke; c.lineWidth = 3; c.stroke();
}

function drawEmptySlot(c, anchor) {
    const isWall = anchor.y < CABIN.floorY;
    const w = 44, h = 44;
    const x = anchor.x - w / 2;
    const y = isWall ? anchor.y - h / 2 : anchor.y - h - 4;
    c.save();
    c.setLineDash([5, 5]);
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.lineWidth = 2;
    rr(c, x, y, w, h, 8);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,0.28)';
    c.font = '20px -apple-system, system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText('+', anchor.x, y + h / 2 + 7);
    c.textAlign = 'left';
    c.restore();
}

function drawExteriorPreview(c, W, H) {
    c.fillStyle = '#05050f';
    c.fillRect(0, 0, W, H);
    previewStars(c, W, H);

    // A slice of the tier's planet, so the preview sits in the run's world
    const tier = TIERS[state.beltIndex];
    c.save();
    c.globalAlpha = 0.55;
    c.fillStyle = tier.color;
    c.beginPath(); c.arc(W * 0.5, H + 150, 190, 0, Math.PI * 2); c.fill();
    c.restore();

    c.save();
    c.translate(W / 2, H / 2 - 10);
    c.scale(2.6, 2.6);
    drawShipSkin(c, false, state.shipSkin);
    c.restore();

    const paint = SHOP_INDEX[state.shop.equipped.paint];
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.font = 'bold 15px -apple-system, system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText(`${SHIP_SKINS[state.shipSkin].name}${paint ? ' · ' + paint.name : ''}`, W / 2, H - 22);
    c.textAlign = 'left';
}

// ─────────────────────────────────────────────────────────────────────────────
// Game-over summary
// ─────────────────────────────────────────────────────────────────────────────
function renderShopSummary() {
    const el = document.getElementById('shopSummary');
    if (!el) return;
    const sh = state.shop;
    const bought = Object.keys(sh.owned).length +
        Object.values(sh.upgrades).reduce((a, b) => a + b, 0);
    if (bought === 0 && sh.tokens === 0) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = `🛠️ Bought <strong>${bought}</strong> ${bought === 1 ? 'thing' : 'things'} ` +
        `for your ship &nbsp;·&nbsp; 🪙 <strong>${sh.tokens}</strong> unspent`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wiring — scripts load at the end of <body>, so the DOM already exists
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById('shopContinue').addEventListener('click', closeShop);

document.getElementById('shopTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.shop-tab');
    if (!tab) return;
    shopTab = tab.dataset.tab;
    renderShop();
});

document.getElementById('shopBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.shop-item');
    if (!btn) return;
    shopClick(btn.dataset.id);
});
