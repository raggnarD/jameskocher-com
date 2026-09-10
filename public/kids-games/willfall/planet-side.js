// WillFall — classic side-scrolling planet surface ("Classic" style)
// The world slides left underfoot; ←/→ nudge the spaceman, Space jumps, and
// aliens run in from the right. Quota, rewards, sprites and the tier palette
// are shared with the isometric style — see planet.js.
//
// Loaded AFTER game.js and planet.js — cross-file references stay inside
// function bodies.

// ── Tunables ─────────────────────────────────────────────────────────────────
const PLANET_GRAVITY = 1900;   // px/s²
const PLANET_SCROLL  = 200;    // px/s the world slides left underfoot
const MAN_NUDGE      = 200;    // px/s from left/right input
const MAN_X_MIN = 0.14, MAN_X_MAX = 0.68;   // fraction of canvas width
const SEG_W = 110;             // terrain node spacing (world px)

const SCROLL_RAMP = 1.1;       // seconds for the surface "treadmill" to spin up
const MAN_START_X = 0.30;      // fraction of canvas width the spaceman lands at

const SIDE_SURFACE = {
    generate: sideGenerate,
    update: sideUpdate,
    draw: sideDraw,
    prepareLaunch: sidePrepareLaunch,
    launchAnchor: sideLaunchAnchor
};

// ─────────────────────────────────────────────────────────────────────────────
// World generation
// ─────────────────────────────────────────────────────────────────────────────
function sideGenerate(p) {
    const mult = difficultyMult(p.tierIndex);
    Object.assign(p, {
        scrollX: 0,
        speed: 0,                  // current scroll speed — eased up from a standstill
        rampT: 0,                  // seconds the surface stage has been running
        nodes: [],                 // terrain: { wx, y }
        nextItemX: 420,
        nextAlienX: 700,
        alienSpeed: 90 * mult,
        alienGap: [260, 480],
        itemGap: [150, 260],
        man: { wx: CANVAS_W * MAN_START_X, y: 0, vy: 0, onGround: true, face: 1, walk: 0, invuln: 0, hidden: false },
        rocketWX: CANVAS_W * MAN_START_X - 95,
        launchWX: null,            // where the rocket lifts off from
        basePadWX: null,
        hills: Array.from({ length: 26 }, () => ({
            wx: Math.random() * 2400,
            h: 60 + Math.random() * 120,
            w: 180 + Math.random() * 260,
            z: 0.25 + Math.random() * 0.35
        }))
    });

    // Seed enough terrain to fill the screen before the first frame draws.
    p.nodes.push({ wx: -SEG_W * 2, y: CANVAS_H - 150 });
    while (p.nodes[p.nodes.length - 1].wx < CANVAS_W + SEG_W * 2) sideExtendTerrain(p);

    p.man.y = sideGroundYAt(p, p.man.wx) - MAN_H / 2;
}

function sideExtendTerrain(p) {
    const last = p.nodes[p.nodes.length - 1];
    const minY = CANVAS_H - 250, maxY = CANVAS_H - 90;
    let y = last.y + (Math.random() - 0.5) * 90;
    y = Math.max(minY, Math.min(maxY, y));
    p.nodes.push({ wx: last.wx + SEG_W, y });
}

function sideGroundYAt(p, wx) {
    const nodes = p.nodes;
    for (let i = 0; i < nodes.length - 1; i++) {
        if (wx >= nodes[i].wx && wx <= nodes[i + 1].wx) {
            const t = (wx - nodes[i].wx) / (nodes[i + 1].wx - nodes[i].wx);
            return nodes[i].y + (nodes[i + 1].y - nodes[i].y) * t;
        }
    }
    return nodes[nodes.length - 1].y;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────
function sideUpdate(p, dt) {
    // Ease the treadmill up from a standstill instead of snapping to full speed
    p.rampT = Math.min(SCROLL_RAMP, p.rampT + dt);
    p.speed = PLANET_SCROLL * easeInOutCubic(p.rampT / SCROLL_RAMP);
    p.scrollX += p.speed * dt;

    // Keep terrain generated ahead and trim what scrolled past
    while (p.nodes[p.nodes.length - 1].wx < p.scrollX + CANVAS_W + SEG_W * 2) sideExtendTerrain(p);
    while (p.nodes.length > 4 && p.nodes[1].wx < p.scrollX - SEG_W) p.nodes.shift();

    sideUpdateSpaceman(p, dt);
    sideSpawnContent(p);
    sideUpdateItems(p, dt);
    sideUpdateAliens(p, dt);
    sideUpdateDebris(p, dt);
    sideUpdateBasePad(p);
}

function sideUpdateSpaceman(p, dt) {
    const m = p.man;
    const left = keyHeld('arrowleft', 'a');
    const right = keyHeld('arrowright', 'd');
    const jump = keyHeld(' ', 'spacebar');

    let dir = 0;
    if (left) dir -= 1;
    if (right) dir += 1;
    if (dir !== 0) m.face = dir;

    m.wx += (p.speed + dir * MAN_NUDGE) * dt;
    // Stay inside the visible window — the world scrolls, he doesn't run off it
    const minWX = p.scrollX + CANVAS_W * MAN_X_MIN;
    const maxWX = p.scrollX + CANVAS_W * MAN_X_MAX;
    m.wx = Math.max(minWX, Math.min(maxWX, m.wx));

    // Jump — ground only, no double jump. Releasing early cuts the arc short.
    if (jump && m.onGround) {
        m.vy = -jumpV();
        m.onGround = false;
    }
    if (!jump && m.vy < 0) m.vy *= Math.pow(JUMP_CUT, dt * 12);

    m.vy += PLANET_GRAVITY * dt;
    m.y += m.vy * dt;

    const feet = sideGroundYAt(p, m.wx);
    if (m.y + MAN_H / 2 >= feet) {
        m.y = feet - MAN_H / 2;
        m.vy = 0;
        m.onGround = true;
    } else {
        m.onGround = false;
    }

    m.walk += (m.onGround ? (p.speed + Math.abs(dir) * MAN_NUDGE) : 0) * dt * 0.045;
    if (m.invuln > 0) m.invuln = Math.max(0, m.invuln - dt);
}

function sideSpawnContent(p) {
    const edge = p.scrollX + CANVAS_W + 80;

    if (edge > p.nextItemX && p.basePadWX === null) {
        const type = pickResourceType(p);
        const wx = p.nextItemX;
        const hover = Math.random() < 0.35 ? 60 + Math.random() * 55 : 0;  // some need a jump
        p.items.push({ wx, y: sideGroundYAt(p, wx) - 16 - hover, r: 13, type, spin: Math.random() * 6 });
        p.nextItemX += p.itemGap[0] + Math.random() * (p.itemGap[1] - p.itemGap[0]);
    }

    // Once the build site is inbound the run-in stays clear — no new aliens
    if (edge > p.nextAlienX && p.basePadWX === null) {
        const wx = p.nextAlienX;
        const kind = Math.random() < 0.35 ? 'hopper' : 'walker';
        p.aliens.push({
            wx, y: sideGroundYAt(p, wx) - 20, vy: 0, w: 34, h: 32,
            kind, phase: Math.random() * 6, speed: p.alienSpeed * (0.8 + Math.random() * 0.5),
            hopTimer: 0.4 + Math.random()
        });
        p.nextAlienX += p.alienGap[0] + Math.random() * (p.alienGap[1] - p.alienGap[0]);
    }
}

function sideUpdateItems(p, dt) {
    const m = p.man;
    const manBox = { x: m.wx, y: m.y, w: MAN_W, h: MAN_H };
    for (const it of p.items) {
        it.spin += dt * 2;
        it.y = Math.min(it.y, sideGroundYAt(p, it.wx) - it.r - 3);
    }
    p.items = p.items.filter(it => {
        if (it.wx < p.scrollX - 60) return false;
        const box = { x: it.wx, y: it.y, w: it.r * 2.2, h: it.r * 2.2 };
        if (boxesOverlap(manBox, box, pickupForgive())) {
            collectResource(p, it.type);
            return false;
        }
        return true;
    });
}

function sideUpdateAliens(p, dt) {
    const m = p.man;
    const manBox = { x: m.wx, y: m.y, w: MAN_W, h: MAN_H };

    for (const a of p.aliens) {
        a.wx -= a.speed * dt;              // they only ever run right-to-left
        a.phase += dt * 8;
        if (a.kind === 'hopper') {
            a.hopTimer -= dt;
            const ground = sideGroundYAt(p, a.wx) - a.h / 2;
            if (a.y >= ground - 0.5 && a.hopTimer <= 0) {
                a.vy = -430;
                a.hopTimer = 0.7 + Math.random() * 0.6;
            }
            a.vy += PLANET_GRAVITY * dt;
            a.y += a.vy * dt;
            if (a.y > ground) { a.y = ground; a.vy = 0; }
        } else {
            a.y = sideGroundYAt(p, a.wx) - a.h / 2;
        }

        if (m.invuln <= 0 && boxesOverlap(manBox, { x: a.wx, y: a.y, w: a.w, h: a.h })) {
            sideHitByAlien(p);
        }
    }
    p.aliens = p.aliens.filter(a => a.wx > p.scrollX - 80);
}

function sideHitByAlien(p) {
    const m = p.man;
    m.vy = -320;
    m.wx = Math.max(p.scrollX + CANVAS_W * MAN_X_MIN, m.wx - 46);
    m.onGround = false;
    const drop = alienHit(p);
    if (drop) sideSpawnDebris(p, drop.type, drop.lost);
}

// One full-size cracked chunk per unit lost, plus a couple of small shards, so
// the player can read both which resource went and how much of it.
function sideSpawnDebris(p, type, lost) {
    for (let i = 0; i < lost; i++) {
        const spread = (i - (lost - 1) / 2) * 26;
        push(11, -300 - Math.random() * 90, spread, true);
        push(4 + Math.random() * 3, -230 - Math.random() * 140, spread, false);
        push(4 + Math.random() * 3, -230 - Math.random() * 140, spread, false);
    }

    function push(r, vy, spread, chunk) {
        p.debris.push({
            wx: p.man.wx + spread * 0.35 + (Math.random() - 0.5) * 14,
            y: p.man.y - 6 + (Math.random() - 0.5) * 16,
            vx: spread + (Math.random() - 0.5) * 150,
            vy,
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

function sideUpdateDebris(p, dt) {
    for (const d of p.debris) {
        d.vy += PLANET_GRAVITY * 0.6 * dt;
        d.wx += d.vx * dt;
        d.y += d.vy * dt;
        d.rot += d.rotSpeed * dt;
        const g = sideGroundYAt(p, d.wx) - d.r;
        if (d.y > g) {                      // bounce, then settle
            d.y = g;
            d.vy *= -0.32;
            d.vx *= 0.55;
            d.rotSpeed *= 0.55;
        }
        d.life -= dt;
    }
    // Purely decorative — never picked up, and gone once they fade or scroll off
    p.debris = p.debris.filter(d => d.life > 0 && d.wx > p.scrollX - 60);
}

function sideUpdateBasePad(p) {
    if (p.baseBuilt || p.mathOpen) return;
    if (p.basePadWX === null) {
        if (quotaMet(p)) {
            p.basePadWX = p.scrollX + CANVAS_W + 220;
            siteReady(p);                  // clears the run-in to the pad
        }
        return;
    }
    const m = p.man;
    const padBox = { x: p.basePadWX, y: sideGroundYAt(p, p.basePadWX) - 20, w: 130, h: 90 };
    if (boxesOverlap({ x: m.wx, y: m.y, w: MAN_W, h: MAN_H }, padBox, 1.0)) {
        openBaseMath(p);
    }
    // If he somehow slips past it, put it back ahead of him
    if (p.basePadWX < p.scrollX - 40) p.basePadWX = p.scrollX + CANVAS_W + 160;
}

// ─────────────────────────────────────────────────────────────────────────────
// Launch
// ─────────────────────────────────────────────────────────────────────────────
function sidePrepareLaunch(p) {
    p.launchWX = p.basePadWX !== null ? p.basePadWX - 78 : p.man.wx;
}

function sideLaunchAnchor(p) {
    const padWX = p.launchWX !== null ? p.launchWX : p.man.wx;
    return { x: padWX - p.scrollX, groundY: sideGroundYAt(p, padWX) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────
function sideDraw(p) {
    sideDrawHills(p);
    sideDrawTerrain(p);
    if (p.basePadWX !== null) {
        const x = p.basePadWX - p.scrollX;
        if (x > -160 && x < CANVAS_W + 160) drawBaseAt(p, x, sideGroundYAt(p, p.basePadWX), 14);
    }
    for (const d of p.debris) {
        const x = d.wx - p.scrollX;
        if (x > -40 && x < CANVAS_W + 40) drawDebrisAt(x, d.y, d);
    }
    for (const it of p.items) {
        const x = it.wx - p.scrollX;
        if (x > -40 && x < CANVAS_W + 40) drawResourceAt(x, it.y, it);
    }
    for (const a of p.aliens) {
        const x = a.wx - p.scrollX;
        if (x > -60 && x < CANVAS_W + 60) drawAlienAt(x, a.y, a);
    }
    if (p.rocketLanded) {
        const x = p.rocketWX - p.scrollX;
        if (x > -140 && x < CANVAS_W + 140) drawRocketAt(x, sideGroundYAt(p, p.rocketWX));
    }
    if (!p.man.hidden) drawSpacemanAt(p, p.man.wx - p.scrollX, p.man.y);
}

function sideDrawHills(p) {
    for (const h of p.hills) {
        const span = 2400;
        let x = h.wx - (p.scrollX * h.z) % span;
        if (x < -h.w) x += span;
        if (x > CANVAS_W + h.w) x -= span;
        const baseY = CANVAS_H - 90;
        ctx.fillStyle = hillShade(p.tier, h.z);
        ctx.globalAlpha = (0.55 + h.z * 0.3) * sceneAlpha;
        ctx.beginPath();
        ctx.moveTo(x - h.w / 2, baseY);
        ctx.lineTo(x, baseY - h.h);
        ctx.lineTo(x + h.w / 2, baseY);
        ctx.closePath();
        ctx.fill();
    }
    ctx.globalAlpha = sceneAlpha;
}

function sideDrawTerrain(p) {
    ctx.beginPath();
    ctx.moveTo(-10, CANVAS_H + 10);
    for (let sx = -10; sx <= CANVAS_W + 10; sx += 10) {
        ctx.lineTo(sx, sideGroundYAt(p, p.scrollX + sx));
    }
    ctx.lineTo(CANVAS_W + 10, CANVAS_H + 10);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, CANVAS_H - 260, 0, CANVAS_H);
    g.addColorStop(0, groundTop(p.tier));
    g.addColorStop(1, groundDeep(p.tier));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = groundRim(p.tier);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let sx = -10; sx <= CANVAS_W + 10; sx += 10) {
        const y = sideGroundYAt(p, p.scrollX + sx);
        if (sx === -10) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
    }
    ctx.stroke();
}
