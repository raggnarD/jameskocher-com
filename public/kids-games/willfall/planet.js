// WillFall — planet surface stages
// Plays between asteroid belts: land, collect the tier's resources, dodge
// aliens, solve one math problem, build a base, blast off to the next belt.
//
// Loaded AFTER game.js — every reference to game.js globals (state, TIERS, ctx,
// keys, showMath, …) happens inside a function, never at module top level.

// ── Tunables ─────────────────────────────────────────────────────────────────
const REQUIRED_PER_RESOURCE = 10;    // of EACH resource type available here
const BONUS_PER_RESOURCE    = 250;   // bonus miles per pickup
const BONUS_PER_BASE        = 5000;  // bonus miles for finishing a base
const SHIELD_REWARD         = 1;     // shields restored on blast-off (capped)

const PLANET_GRAVITY = 1900;   // px/s²
const PLANET_JUMP_V  = 660;    // px/s initial jump velocity
const JUMP_CUT       = 0.45;   // vy kept when space is released early
const PLANET_SCROLL  = 200;    // px/s the world slides left underfoot
const MAN_NUDGE      = 200;    // px/s from left/right input
const MAN_W = 26, MAN_H = 44;
const MAN_X_MIN = 0.14, MAN_X_MAX = 0.68;   // fraction of canvas width
const SEG_W = 110;             // terrain node spacing (world px)
const HIT_INVULN = 1.5;        // seconds of mercy after an alien hit
const HIT_DROP   = 3;          // units lost from the most-held resource

const SCROLL_RAMP = 1.1;       // seconds for the surface "treadmill" to spin up
const MAN_START_X = 0.30;      // fraction of canvas width the spaceman lands at
const TRANSITION_DUR = 2.6;    // seconds for descend / ascend
const ASCENT_CLIMB = 0.62;     // fraction of the ascent spent climbing off-world

// ── Upgrade effects (surface stage) ──────────────────────────────────────────
// Mirrors the belt-stage accessors in game.js: shop upgrades scale the tunables
// above for the rest of the run, and each is a no-op with an empty shop.
function jumpV()            { return PLANET_JUMP_V * (1 + 0.15 * upgLevel('gravBoots')); }
function pickupForgive()    { return 1.0 + 0.5 * upgLevel('magnet'); }
function hitDrop()          { return upgLevel('cargoNet') > 0 ? 1 : HIT_DROP; }
function bonusPerResource() { return BONUS_PER_RESOURCE + 100 * upgLevel('refinery'); }

// ── Resource table — derived from TIERS so the two can never drift ───────────
function resourceFor(tierIndex) {
    const t = TIERS[tierIndex];
    return { name: t.name, color: t.color, glow: t.glow, emoji: t.emoji };
}

// Ambient alpha the whole surface scene is drawn at — lets the descent
// crossfade the planet in without each sub-draw snapping back to opaque.
let sceneAlpha = 1;

// ── Small helpers ────────────────────────────────────────────────────────────
function boxesOverlap(a, b, forgive = 0.8) {
    // a, b: { x, y, w, h } centred boxes. `forgive` shrinks both — kid-friendly.
    const aw = a.w * forgive / 2, ah = a.h * forgive / 2;
    const bw = b.w * forgive / 2, bh = b.h * forgive / 2;
    return Math.abs(a.x - b.x) < aw + bw && Math.abs(a.y - b.y) < ah + bh;
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function shade(hex, amt) {
    // amt > 0 lightens, < 0 darkens. hex is '#rrggbb'.
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v =>
        Math.max(0, Math.min(255, Math.round(v + amt * 255)))
    );
    return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

function greyOf(hex, lift = 0) {
    // Desaturate to luminance — knocked-loose resources read as dead rock.
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const l = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b) + lift * 255));
    return `rgb(${l},${l},${l})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// World generation
// ─────────────────────────────────────────────────────────────────────────────
function generatePlanet(tierIndex) {
    const tier = TIERS[tierIndex];
    const types = [];
    for (let i = 0; i <= tierIndex; i++) types.push(i);

    const mult = difficultyMult(tierIndex);
    const p = {
        tierIndex,
        tier,
        types,
        collected: Object.fromEntries(types.map(i => [i, 0])),
        required: REQUIRED_PER_RESOURCE,
        scrollX: 0,
        speed: 0,                  // current scroll speed — eased up from a standstill
        rampT: 0,                  // seconds the surface stage has been running
        nodes: [],                 // terrain: { wx, y }
        items: [],                 // { wx, y, r, type, spin }
        aliens: [],                // { wx, y, vy, w, h, kind, phase, speed }
        debris: [],                // greyed-out shards of resources knocked loose
        nextItemX: 420,
        nextAlienX: 700,
        alienSpeed: 90 * mult,
        alienGap: [260, 480],
        itemGap: [150, 260],
        man: { wx: CANVAS_W * MAN_START_X, y: 0, vy: 0, onGround: true, face: 1, walk: 0, invuln: 0, hidden: false },
        rocketWX: CANVAS_W * MAN_START_X - 95,
        launchWX: null,            // where the rocket lifts off from
        rocketLanded: true,        // drawn on the surface until it scrolls away
        basePadWX: null,
        baseBuilt: false,
        building: 0,               // countdown while the base assembles
        mathOpen: false,
        hills: Array.from({ length: 26 }, () => ({
            wx: Math.random() * 2400,
            h: 60 + Math.random() * 120,
            w: 180 + Math.random() * 260,
            z: 0.25 + Math.random() * 0.35
        })),
        banner: 3.0                // seconds the "landed on X" banner shows
    };

    // Seed enough terrain to fill the screen before the first frame draws.
    p.nodes.push({ wx: -SEG_W * 2, y: CANVAS_H - 150 });
    while (p.nodes[p.nodes.length - 1].wx < CANVAS_W + SEG_W * 2) extendTerrain(p);

    p.man.y = groundYAt(p, p.man.wx) - MAN_H / 2;
    return p;
}

function extendTerrain(p) {
    const last = p.nodes[p.nodes.length - 1];
    const minY = CANVAS_H - 250, maxY = CANVAS_H - 90;
    let y = last.y + (Math.random() - 0.5) * 90;
    y = Math.max(minY, Math.min(maxY, y));
    p.nodes.push({ wx: last.wx + SEG_W, y });
}

function groundYAt(p, wx) {
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
function updatePlanet(dt) {
    const p = state.planet;
    if (!p) return;

    if (p.banner > 0) p.banner = Math.max(0, p.banner - dt);

    // Base assembly animation, then launch. The world holds still so the base
    // and the spaceman stay put under the camera while it goes up.
    if (p.building > 0) {
        p.building = Math.max(0, p.building - dt);
        if (p.building === 0) { finishPlanet(); return; }
        updatePlanetHUD();
        return;
    }

    // Ease the treadmill up from a standstill instead of snapping to full speed
    p.rampT = Math.min(SCROLL_RAMP, p.rampT + dt);
    p.speed = PLANET_SCROLL * easeInOutCubic(p.rampT / SCROLL_RAMP);
    p.scrollX += p.speed * dt;

    // Keep terrain generated ahead and trim what scrolled past
    while (p.nodes[p.nodes.length - 1].wx < p.scrollX + CANVAS_W + SEG_W * 2) extendTerrain(p);
    while (p.nodes.length > 4 && p.nodes[1].wx < p.scrollX - SEG_W) p.nodes.shift();

    updateSpaceman(p, dt);
    spawnPlanetContent(p);
    updateItems(p, dt);
    updateAliens(p, dt);
    updateDebris(p, dt);
    updateBasePad(p);
    updatePlanetHUD();
}

function updateSpaceman(p, dt) {
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

    const feet = groundYAt(p, m.wx);
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

function spawnPlanetContent(p) {
    const edge = p.scrollX + CANVAS_W + 80;

    if (edge > p.nextItemX && p.basePadWX === null) {
        // Weight toward whatever is still short of quota
        const short = p.types.filter(t => p.collected[t] < p.required);
        const pool = short.length ? short : p.types;
        const type = pool[Math.floor(Math.random() * pool.length)];
        const wx = p.nextItemX;
        const hover = Math.random() < 0.35 ? 60 + Math.random() * 55 : 0;  // some need a jump
        p.items.push({ wx, y: groundYAt(p, wx) - 16 - hover, r: 13, type, spin: Math.random() * 6 });
        p.nextItemX += p.itemGap[0] + Math.random() * (p.itemGap[1] - p.itemGap[0]);
    }

    // Once the build site is inbound the run-in stays clear — no new aliens
    if (edge > p.nextAlienX && p.basePadWX === null) {
        const wx = p.nextAlienX;
        const kind = Math.random() < 0.35 ? 'hopper' : 'walker';
        p.aliens.push({
            wx, y: groundYAt(p, wx) - 20, vy: 0, w: 34, h: 32,
            kind, phase: Math.random() * 6, speed: p.alienSpeed * (0.8 + Math.random() * 0.5),
            hopTimer: 0.4 + Math.random()
        });
        p.nextAlienX += p.alienGap[0] + Math.random() * (p.alienGap[1] - p.alienGap[0]);
    }
}

function updateItems(p, dt) {
    const m = p.man;
    const manBox = { x: m.wx, y: m.y, w: MAN_W, h: MAN_H };
    for (const it of p.items) {
        it.spin += dt * 2;
        it.y = Math.min(it.y, groundYAt(p, it.wx) - it.r - 3);
    }
    p.items = p.items.filter(it => {
        if (it.wx < p.scrollX - 60) return false;
        const box = { x: it.wx, y: it.y, w: it.r * 2.2, h: it.r * 2.2 };
        if (boxesOverlap(manBox, box, pickupForgive())) {
            p.collected[it.type] = Math.min(p.required, p.collected[it.type] + 1);
            state.bonusMiles += bonusPerResource();
            flashCanvas(TIERS[it.type].glow);
            return false;
        }
        return true;
    });
}

function updateAliens(p, dt) {
    const m = p.man;
    const manBox = { x: m.wx, y: m.y, w: MAN_W, h: MAN_H };

    for (const a of p.aliens) {
        a.wx -= a.speed * dt;              // they only ever run right-to-left
        a.phase += dt * 8;
        if (a.kind === 'hopper') {
            a.hopTimer -= dt;
            const ground = groundYAt(p, a.wx) - a.h / 2;
            if (a.y >= ground - 0.5 && a.hopTimer <= 0) {
                a.vy = -430;
                a.hopTimer = 0.7 + Math.random() * 0.6;
            }
            a.vy += PLANET_GRAVITY * dt;
            a.y += a.vy * dt;
            if (a.y > ground) { a.y = ground; a.vy = 0; }
        } else {
            a.y = groundYAt(p, a.wx) - a.h / 2;
        }

        if (m.invuln <= 0 && boxesOverlap(manBox, { x: a.wx, y: a.y, w: a.w, h: a.h })) {
            hitByAlien(p);
        }
    }
    p.aliens = p.aliens.filter(a => a.wx > p.scrollX - 80);
}

function hitByAlien(p) {
    const m = p.man;
    m.invuln = HIT_INVULN;
    m.vy = -320;
    m.wx = Math.max(p.scrollX + CANVAS_W * MAN_X_MIN, m.wx - 46);
    m.onGround = false;
    flashCanvas('#ff6b6b');

    // Drop from whichever resource you're carrying the most of
    let worst = null;
    for (const t of p.types) {
        if (p.collected[t] > 0 && (worst === null || p.collected[t] > p.collected[worst])) worst = t;
    }
    if (worst !== null) {
        const lost = Math.min(hitDrop(), p.collected[worst]);
        p.collected[worst] -= lost;
        state.bonusMiles = Math.max(0, state.bonusMiles - lost * bonusPerResource());
        spawnDebris(p, worst, lost);
    }
}

// One full-size cracked chunk per unit lost, plus a couple of small shards, so
// the player can read both which resource went and how much of it.
function spawnDebris(p, type, lost) {
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

function updateDebris(p, dt) {
    for (const d of p.debris) {
        d.vy += PLANET_GRAVITY * 0.6 * dt;
        d.wx += d.vx * dt;
        d.y += d.vy * dt;
        d.rot += d.rotSpeed * dt;
        const g = groundYAt(p, d.wx) - d.r;
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

function quotaMet(p) {
    return p.types.every(t => p.collected[t] >= p.required);
}

function updateBasePad(p) {
    if (p.baseBuilt || p.mathOpen) return;
    if (p.basePadWX === null) {
        if (quotaMet(p)) {
            p.basePadWX = p.scrollX + CANVAS_W + 220;
            p.aliens = [];                 // clear the run-in to the pad
            p.banner = 2.5;
        }
        return;
    }
    const m = p.man;
    const padBox = { x: p.basePadWX, y: groundYAt(p, p.basePadWX) - 20, w: 130, h: 90 };
    if (boxesOverlap({ x: m.wx, y: m.y, w: MAN_W, h: MAN_H }, padBox, 1.0)) {
        openBaseMath(p);
    }
    // If he somehow slips past it, put it back ahead of him
    if (p.basePadWX < p.scrollX - 40) p.basePadWX = p.scrollX + CANVAS_W + 160;
}

function openBaseMath(p) {
    p.mathOpen = true;
    showMath({
        reason: `🏗️ Base blueprint — solve to build on ${p.tier.name}!`,
        onCorrect: () => {
            p.mathOpen = false;
            p.baseBuilt = true;
            p.building = 1.8;
            state.bonusMiles += BONUS_PER_BASE;
            flashCanvas('#4ade80');
        },
        onWrong: null    // same as the gas problem: reroll, no penalty
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage lifecycle
// ─────────────────────────────────────────────────────────────────────────────
function finishPlanet() {
    // Rewards for a completed base, then lift off.
    if (state.planet && state.planet.baseBuilt) {
        state.gasMiles = tankMiles();
        state.shields = Math.min(maxShields(), state.shields + SHIELD_REWARD);
    }
    startAscent();
}

function startDescent() {
    state.phase = 'descend';
    state.transition = { kind: 'descend', t: 0, dur: TRANSITION_DUR };
    state.planet = generatePlanet(state.beltIndex);
    updatePlanetHUD();
}

function startAscent() {
    const p = state.planet;
    if (p) {
        p.man.hidden = true;          // he's aboard now
        p.rocketLanded = false;       // the launch draws its own rocket
        p.launchWX = p.basePadWX !== null ? p.basePadWX - 78 : p.man.wx;
    }
    state.phase = 'ascend';
    state.transition = { kind: 'ascend', t: 0, dur: TRANSITION_DUR };
}

function updateTransition(dt) {
    const tr = state.transition;
    if (!tr) return;
    tr.t += dt;
    if (tr.t < tr.dur) return;

    if (tr.kind === 'descend') {
        state.transition = null;
        state.phase = 'planet';
        state.lastFrameTs = 0;
        showPlanetHUD(true);
        updatePlanetHUD();
    } else {
        state.transition = null;
        state.planet = null;
        showPlanetHUD(false);
        // Planet cleared → Trading Post → next belt. The shop opens after the
        // blast-off animation so the launch reads as one uninterrupted beat.
        openShop('planet', () => {
            if (state.beltIndex >= TIERS.length - 1) winGame();
            else beginNextBelt();
        });
    }
}

function beginNextBelt() {
    state.beltIndex += 1;
    state.miles = TIERS[state.beltIndex].miles;
    state.phase = 'belt';
    state.asteroids = [];
    state.spawnTimer = 0;
    state.ship.x = 120;
    state.ship.y = CANVAS_H / 2;
    state.tierBanner = 2.2;
    updateHUD();
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────────────────────────
function showPlanetHUD(on) {
    document.getElementById('beltHud').classList.toggle('hidden', on);
    document.getElementById('planetHud').classList.toggle('hidden', !on);
    document.getElementById('beltHint').classList.toggle('hidden', on);
    document.getElementById('planetHint').classList.toggle('hidden', !on);
}

let lastChipSig = '';
function updatePlanetHUD() {
    const p = state.planet;
    if (!p) return;
    document.getElementById('planetNameDisplay').textContent = `${p.tier.emoji} ${p.tier.name}`;
    document.getElementById('planetBonusDisplay').textContent =
        `+${Math.floor(state.bonusMiles).toLocaleString()} mi`;
    document.getElementById('planetTokenDisplay').textContent = `🪙 ${state.shop.tokens}`;

    const sig = p.types.map(t => p.collected[t]).join(',') + '|' + p.tierIndex;
    if (sig === lastChipSig) return;
    lastChipSig = sig;

    const wrap = document.getElementById('resourceChips');
    wrap.innerHTML = p.types.map(t => {
        const r = resourceFor(t);
        const have = p.collected[t];
        const done = have >= p.required ? ' done' : '';
        return `<span class="res-chip${done}" style="--res:${r.color}">` +
            `<span class="res-emoji">${r.emoji}</span>` +
            `<span class="res-count">${have}/${p.required}</span></span>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────
function drawPlanetScene() {
    const p = state.planet;
    if (!p) return;
    const tier = p.tier;
    ctx.globalAlpha = sceneAlpha;

    // Sky — tinted by the tier colour
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    sky.addColorStop(0, '#05051a');
    sky.addColorStop(0.55, shade(tier.color, -0.30));
    sky.addColorStop(1, shade(tier.color, -0.12));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // A few stars still visible in the thin atmosphere
    ctx.fillStyle = '#ffffff';
    for (const s of state.stars) {
        if (s.y > CANVAS_H * 0.55) continue;
        ctx.globalAlpha = s.z * 0.5 * sceneAlpha;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = sceneAlpha;

    drawHills(p);
    drawTerrain(p);
    if (p.basePadWX !== null) drawBasePad(p);
    for (const d of p.debris) drawDebris(p, d);
    for (const it of p.items) drawResource(p, it);
    for (const a of p.aliens) drawAlien(p, a);
    if (p.rocketLanded) drawLandedRocket(p, p.rocketWX);
    if (!p.man.hidden) drawSpaceman(p);
    drawPlanetBanner(p);
    ctx.globalAlpha = 1;
}

function drawHills(p) {
    for (const h of p.hills) {
        const span = 2400;
        let x = h.wx - (p.scrollX * h.z) % span;
        if (x < -h.w) x += span;
        if (x > CANVAS_W + h.w) x -= span;
        const baseY = CANVAS_H - 90;
        ctx.fillStyle = shade(p.tier.color, -0.45 + h.z * 0.18);
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

function drawTerrain(p) {
    ctx.beginPath();
    ctx.moveTo(-10, CANVAS_H + 10);
    for (let sx = -10; sx <= CANVAS_W + 10; sx += 10) {
        ctx.lineTo(sx, groundYAt(p, p.scrollX + sx));
    }
    ctx.lineTo(CANVAS_W + 10, CANVAS_H + 10);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, CANVAS_H - 260, 0, CANVAS_H);
    g.addColorStop(0, shade(p.tier.color, 0.05));
    g.addColorStop(1, shade(p.tier.color, -0.35));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = p.tier.glow + 'cc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let sx = -10; sx <= CANVAS_W + 10; sx += 10) {
        const y = groundYAt(p, p.scrollX + sx);
        if (sx === -10) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
    }
    ctx.stroke();
}

function drawResource(p, it) {
    const x = it.wx - p.scrollX;
    if (x < -40 || x > CANVAS_W + 40) return;
    const r = resourceFor(it.type);
    const bob = Math.sin(it.spin) * 3;
    ctx.save();
    ctx.translate(x, it.y + bob);
    const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, it.r * 2);
    grd.addColorStop(0, r.glow + 'aa');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, it.r * 2, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(it.spin * 0.4);
    ctx.fillStyle = r.color;
    ctx.strokeStyle = '#00000070';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rad = it.r * (i % 2 ? 0.8 : 1);
        const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
}

function drawDebris(p, d) {
    const x = d.wx - p.scrollX;
    if (x < -40 || x > CANVAS_W + 40) return;
    const fade = Math.min(1, d.life / (d.maxLife * 0.45));
    const base = greyOf(TIERS[d.type].color, -0.22);   // duller than a live resource, and no glow

    ctx.save();
    ctx.globalAlpha = fade * sceneAlpha * 0.9;
    ctx.translate(x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = base;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.5;

    if (d.chunk) {
        // A whole unit, cracked down the middle — the halves drift apart as it fades
        const gap = 2 + (1 - fade) * 5;
        const r = d.r;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(side * gap, -r);
            ctx.lineTo(side * (gap + r * 0.95), -r * 0.25);
            ctx.lineTo(side * (gap + r * 0.75), r * 0.7);
            ctx.lineTo(side * gap, r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    } else {
        ctx.beginPath();
        ctx.moveTo(-d.r, d.r * 0.6);
        ctx.lineTo(0, -d.r);
        ctx.lineTo(d.r, d.r * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}

function drawAlien(p, a) {
    const x = a.wx - p.scrollX;
    if (x < -60 || x > CANVAS_W + 60) return;
    const wobble = Math.sin(a.phase) * 2;
    ctx.save();
    ctx.translate(x, a.y);

    // Legs
    ctx.strokeStyle = '#2f8f5f';
    ctx.lineWidth = 3;
    for (const ox of [-8, 8]) {
        ctx.beginPath();
        ctx.moveTo(ox, a.h / 2 - 6);
        ctx.lineTo(ox + Math.sin(a.phase + ox) * 4, a.h / 2 + 6);
        ctx.stroke();
    }
    // Body
    ctx.fillStyle = '#63e08c';
    ctx.strokeStyle = '#1d6b45';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, wobble, a.w / 2, a.h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Eyes
    ctx.fillStyle = '#0b2a1c';
    ctx.beginPath(); ctx.arc(-6, wobble - 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, wobble - 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-7, wobble - 4, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, wobble - 4, 1.5, 0, Math.PI * 2); ctx.fill();
    // Antenna
    ctx.strokeStyle = '#1d6b45';
    ctx.beginPath();
    ctx.moveTo(0, wobble - a.h / 2 + 4);
    ctx.lineTo(Math.sin(a.phase) * 3, wobble - a.h / 2 - 7);
    ctx.stroke();
    ctx.fillStyle = '#c896ff';
    ctx.beginPath(); ctx.arc(Math.sin(a.phase) * 3, wobble - a.h / 2 - 9, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawSpaceman(p, xOverride, yOverride, alpha) {
    const m = p.man;
    const x = xOverride !== undefined ? xOverride : m.wx - p.scrollX;
    const y = yOverride !== undefined ? yOverride : m.y;
    // Flicker while invulnerable
    if (alpha === undefined && m.invuln > 0 && Math.floor(m.invuln * 12) % 2 === 0) return;

    ctx.save();
    ctx.globalAlpha = alpha === undefined ? sceneAlpha : alpha;
    ctx.translate(x, y);
    ctx.scale(m.face < 0 ? -1 : 1, 1);

    const airborne = !m.onGround;
    const swing = airborne ? 0.5 : Math.sin(m.walk) * 0.9;

    // Backpack
    ctx.fillStyle = '#8fa4c8';
    ctx.strokeStyle = '#4a5a7a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-13, -12, 9, 20, 3); ctx.fill(); ctx.stroke();

    // Legs
    ctx.strokeStyle = '#dfe6f5'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, 8); ctx.lineTo(-2 + swing * 7, MAN_H / 2 - 2);
    ctx.moveTo(2, 8);  ctx.lineTo(2 - swing * 7, MAN_H / 2 - 2);
    ctx.stroke();

    // Torso
    ctx.fillStyle = '#f0f4ff'; ctx.strokeStyle = '#7aa8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-9, -10, 18, 20, 6); ctx.fill(); ctx.stroke();
    // Chest patch in the tier colour
    ctx.fillStyle = p.tier.color;
    ctx.beginPath(); ctx.roundRect(-4, -5, 8, 6, 2); ctx.fill();

    // Arms
    ctx.strokeStyle = '#dfe6f5'; ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-6, -6); ctx.lineTo(-10 - swing * 5, airborne ? -14 : 4);
    ctx.moveTo(6, -6);  ctx.lineTo(10 + swing * 5, airborne ? -14 : 4);
    ctx.stroke();

    // Helmet
    ctx.fillStyle = '#f7faff'; ctx.strokeStyle = '#7aa8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -18, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Visor
    const vg = ctx.createLinearGradient(-8, -22, 8, -14);
    vg.addColorStop(0, '#9fd8ff');
    vg.addColorStop(1, '#3a6ea8');
    ctx.fillStyle = vg;
    ctx.beginPath(); ctx.ellipse(2, -18, 7.5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.lineCap = 'butt';
}

function drawBasePad(p) {
    const x = p.basePadWX - p.scrollX;
    if (x < -160 || x > CANVAS_W + 160) return;
    const gy = groundYAt(p, p.basePadWX);
    ctx.save();
    ctx.translate(x, gy);

    // Glowing landing pad
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 260);
    ctx.strokeStyle = `rgba(74,222,128,${0.5 + pulse * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 62, 14, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(74,222,128,${0.10 + pulse * 0.10})`;
    ctx.fill();

    if (p.baseBuilt || p.building > 0) {
        // Base rises out of the pad as it is built
        const grow = p.baseBuilt && p.building === 0 ? 1 : 1 - p.building / 1.8;
        const h = 70 * Math.max(0, Math.min(1, grow));
        ctx.fillStyle = '#dfe6f5'; ctx.strokeStyle = p.tier.glow; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(-38, -h, 76, h, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = p.tier.color;
        ctx.beginPath(); ctx.arc(0, -h, 30, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#7aa8ff';
        for (const ox of [-20, 0, 20]) {
            if (h > 30) { ctx.beginPath(); ctx.arc(ox, -h / 2, 6, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.fillStyle = '#c896ff';
        ctx.fillRect(-1.5, -h - 44, 3, 44);
        ctx.beginPath(); ctx.arc(0, -h - 46, 5, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏗️ BUILD SITE', 0, -30);
        ctx.textAlign = 'left';
    }
    ctx.restore();
}

function drawLandedRocket(p, wx, yOffset = 0, thrusting = false) {
    const x = wx - p.scrollX;
    if (x < -140 || x > CANVAS_W + 140) return;
    const gy = groundYAt(p, wx);
    ctx.save();
    ctx.translate(x, gy - 34 + yOffset);
    ctx.rotate(-Math.PI / 2);            // stand the ship on its tail
    drawShipSkin(ctx, thrusting);
    ctx.restore();
    if (!thrusting) {
        // Landing legs
        ctx.strokeStyle = '#8fa4c8'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 4, gy - 16); ctx.lineTo(x - 18, gy);
        ctx.moveTo(x + 4, gy - 16); ctx.lineTo(x + 18, gy);
        ctx.stroke();
    }
}

function drawPlanetBanner(p) {
    if (p.banner <= 0) return;
    const alpha = Math.min(1, p.banner);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    const done = p.basePadWX !== null && !p.baseBuilt;
    ctx.fillText(done ? '🏗️ Build site ahead!' : `${p.tier.emoji} ${p.tier.name} Planet`, CANVAS_W / 2, 70);
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = p.tier.glow;
    ctx.fillText(done ? 'Walk onto the pad to build your base'
                      : `Collect ${p.required} of each resource`, CANVAS_W / 2, 98);
    ctx.textAlign = 'left';
    ctx.restore();
}

// ── Transition rendering ─────────────────────────────────────────────────────
function drawTransition() {
    const tr = state.transition;
    const p = state.planet;
    if (!tr) return;
    const k = easeInOutCubic(Math.min(1, tr.t / tr.dur));

    if (tr.kind === 'descend') {
        // Space, with the planet swelling from below and the ship arcing down
        ctx.fillStyle = '#02020a';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#ffffff';
        for (const s of state.stars) {
            ctx.globalAlpha = s.z;
            ctx.fillRect(s.x, s.y + k * 60 * s.z, s.size, s.size);
        }
        ctx.globalAlpha = 1;

        const tier = TIERS[state.beltIndex];
        const rad = 120 + k * 900;
        const cy = CANVAS_H + 210 - k * 240;
        const g = ctx.createRadialGradient(CANVAS_W * 0.62, cy - rad * 0.4, rad * 0.1,
                                           CANVAS_W * 0.62, cy, rad);
        g.addColorStop(0, shade(tier.color, 0.18));
        g.addColorStop(0.7, tier.color);
        g.addColorStop(1, shade(tier.color, -0.45));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(CANVAS_W * 0.62, cy, rad, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = tier.glow + '88'; ctx.lineWidth = 3;
        ctx.stroke();

        const sx = 120 + (CANVAS_W * 0.62 - 120) * k;
        const sy = state.ship.y + (cy - rad - 30 - state.ship.y) * k;
        const scale = 1 - 0.65 * k;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(k * Math.PI / 2.4);
        ctx.scale(scale, scale);
        drawShipSkin(ctx, true);
        ctx.restore();

        // Crossfade into the surface over the last third
        if (k > 0.66 && p) {
            sceneAlpha = (k - 0.66) / 0.34;
            drawPlanetScene();
            sceneAlpha = 1;
        }
        bannerText('Approaching ' + TIERS[state.beltIndex].name + ' Planet', 1 - k * 0.6);
    } else {
        drawAscent(tr, p);
    }
}

// Ascent — the camera rides the rocket up off the surface, then eases it into
// the pose the belt stage starts in, so the hand-off has no visible cut.
function drawAscent(tr, p) {
    const climbT = Math.min(1, tr.t / (tr.dur * ASCENT_CLIMB));
    const climb = easeInOutCubic(climbT);
    const exit = easeInOutCubic(
        Math.max(0, Math.min(1, (tr.t - tr.dur * ASCENT_CLIMB) / (tr.dur * (1 - ASCENT_CLIMB))))
    );

    // Space first — the surface is painted over it and fades as we climb
    ctx.fillStyle = '#02020a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#ffffff';
    for (const st of state.stars) {
        ctx.globalAlpha = st.z * Math.min(1, climb * 1.5 + exit);
        ctx.fillRect(st.x, st.y, st.size, st.size);
    }
    ctx.globalAlpha = 1;

    let rocketX = CANVAS_W * 0.5, rocketY = CANVAS_H * 0.55;
    if (p) {
        const padWX = p.launchWX !== null ? p.launchWX : p.man.wx;
        const groundY = groundYAt(p, padWX);
        const worldY = groundY - 34 - climb * CANVAS_H * 2.1;
        // Camera holds the rocket at 55% height once it has risen that far
        const camY = Math.min(0, worldY - CANVAS_H * 0.55);

        ctx.save();
        ctx.translate(0, -camY);
        sceneAlpha = (1 - climb) * (1 - exit);
        if (sceneAlpha > 0.01) drawPlanetScene();
        sceneAlpha = 1;
        ctx.restore();

        rocketX = padWX - p.scrollX;
        rocketY = worldY - camY;
    }

    // Ease into the belt's launch pose: x 120, mid-height, nose to the right
    const x = rocketX + (120 - rocketX) * exit;
    const y = rocketY + (CANVAS_H / 2 - rocketY) * exit;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2 * (1 - exit));
    ctx.scale(1 - 0.12 * climb * (1 - exit), 1 - 0.12 * climb * (1 - exit));
    drawShipSkin(ctx, true);
    ctx.restore();

    const nextName = state.beltIndex >= TIERS.length - 1
        ? 'Mission complete'
        : `Next stop: ${TIERS[state.beltIndex + 1].name} belt`;
    bannerText(nextName, Math.min(1, climb * 1.5) * (1 - exit * 0.4));
}

function bannerText(text, alpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, CANVAS_W / 2, 60);
    ctx.textAlign = 'left';
    ctx.restore();
}
