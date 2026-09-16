// WillFall — planet surface stages (shared)
// Plays between asteroid belts: land, collect the tier's resources, dodge
// aliens, solve one math problem, build a base, blast off to the next belt.
//
// Two surface styles share this file: the isometric explorer (planet-iso.js,
// the default) and the classic side-scroller (planet-side.js). Each supplies
// generate / update / draw / launch hooks. Everything here — quota, rewards,
// HUD, the base math, the tier palette, the sprites, the descent and ascent —
// is common to both, so a planet looks and scores the same in either style.
//
// Loaded AFTER game.js — every reference to game.js globals (state, TIERS, ctx,
// keys, showMath, …) happens inside a function, never at module top level.

// ── Tunables ─────────────────────────────────────────────────────────────────
const REQUIRED_PER_RESOURCE = 10;    // of EACH resource type available here
const BONUS_PER_RESOURCE    = 250;   // bonus miles per pickup
const BONUS_PER_BASE        = 5000;  // bonus miles for finishing a base
const SHIELD_REWARD         = 1;     // shields restored on blast-off (capped)

const PLANET_JUMP_V  = 660;    // px/s initial jump velocity (the iso stage scales from jumpV() / this)
const JUMP_CUT       = 0.45;   // vy kept when space is released early
const MAN_W = 26, MAN_H = 44;
const HIT_INVULN = 1.5;        // seconds of mercy after an alien hit
const HIT_DROP   = 3;          // units lost from the most-held resource
const BASE_BUILD_TIME = 1.8;   // seconds the base takes to rise out of the pad

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

// ── Tier palette ─────────────────────────────────────────────────────────────
// Every surface colour comes from the tier through these, in both styles, so a
// Bronze planet is the same bronze whether it's seen side-on or from above.
// Classic's ground is a vertical gradient groundTop → groundDeep; groundAt
// samples it (t = 0 top … 1 deep) so Explore's tiles use the very same tones.
function groundAt(tier, t, lift = 0) { return shade(tier.color, 0.05 - 0.40 * t + lift); }
function groundTop(tier)           { return groundAt(tier, 0); }
function groundDeep(tier)          { return groundAt(tier, 1); }
function groundRim(tier)           { return tier.glow + 'cc'; }
function hillShade(tier, z)        { return shade(tier.color, -0.45 + z * 0.18); }

// ─────────────────────────────────────────────────────────────────────────────
// Surface styles
// ─────────────────────────────────────────────────────────────────────────────
// Picked on the start screen (state.planetStyle) and fixed per stage (p.style).
// Each style object lives in its own file:
//   { generate(p), update(p, dt), draw(p), prepareLaunch(p), launchAnchor(p) }
// launchAnchor returns the screen { x, groundY } the rocket lifts off from.
function surfaceStyle(p) {
    return (p ? p.style : state.planetStyle) === 'side' ? SIDE_SURFACE : ISO_SURFACE;
}

// ─────────────────────────────────────────────────────────────────────────────
// World generation
// ─────────────────────────────────────────────────────────────────────────────
function generatePlanet(tierIndex) {
    const tier = TIERS[tierIndex];
    const types = [];
    for (let i = 0; i <= tierIndex; i++) types.push(i);

    const p = {
        style: state.planetStyle === 'side' ? 'side' : 'iso',
        tierIndex,
        tier,
        types,
        collected: Object.fromEntries(types.map(i => [i, 0])),
        required: REQUIRED_PER_RESOURCE,
        items: [],
        aliens: [],
        debris: [],                // greyed-out shards of resources knocked loose
        man: null,                 // set by the style
        rocketLanded: true,        // drawn on the surface until it lifts off
        sitePlaced: false,         // quota met and the build site is out there
        baseBuilt: false,
        building: 0,               // countdown while the base assembles
        mathOpen: false,
        banner: 3.0                // seconds the "landed on X" banner shows
    };
    surfaceStyle(p).generate(p);
    return p;
}

// Weight new pickups toward whatever is still short of quota
function pickResourceType(p) {
    const short = p.types.filter(t => p.collected[t] < p.required);
    const pool = short.length ? short : p.types;
    return pool[Math.floor(Math.random() * pool.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────
function updatePlanet(dt) {
    const p = state.planet;
    if (!p) return;

    if (p.banner > 0) p.banner = Math.max(0, p.banner - dt);

    // Hidden cave (cave.js): the fade holds everything still, and while the
    // maze is up the surface waits, frozen, underneath it.
    if (p.caveFade) { caveTickFade(p, dt); updatePlanetHUD(); return; }
    if (p.maze) { caveUpdate(p, dt); updatePlanetHUD(); return; }

    // Base assembly animation, then launch. The world holds still so the base
    // and the spaceman stay put under the camera while it goes up.
    if (p.building > 0) {
        p.building = Math.max(0, p.building - dt);
        if (p.building === 0) { finishPlanet(); return; }
        updatePlanetHUD();
        return;
    }

    surfaceStyle(p).update(p, dt);
    updatePlanetHUD();
}

function collectResource(p, type) {
    p.collected[type] = Math.min(p.required, p.collected[type] + 1);
    state.bonusMiles += bonusPerResource();
    flashCanvas(TIERS[type].glow);
}

// The rules half of an alien hit — mercy frames, the red flash, and the
// resource loss. The style applies the knockback and spawns debris from the
// returned { type, lost } (null when the spaceman was carrying nothing).
function alienHit(p) {
    p.man.invuln = HIT_INVULN;
    flashCanvas('#ff6b6b');

    // Drop from whichever resource you're carrying the most of
    let worst = null;
    for (const t of p.types) {
        if (p.collected[t] > 0 && (worst === null || p.collected[t] > p.collected[worst])) worst = t;
    }
    if (worst === null) return null;
    const lost = Math.min(hitDrop(), p.collected[worst]);
    p.collected[worst] -= lost;
    state.bonusMiles = Math.max(0, state.bonusMiles - lost * bonusPerResource());
    return { type: worst, lost };
}

function quotaMet(p) {
    return p.types.every(t => p.collected[t] >= p.required);
}

// Quota met — the build site is placed by the style, then the run-in is cleared
function siteReady(p) {
    p.sitePlaced = true;
    p.aliens = [];
    p.banner = 2.5;
}

function openBaseMath(p) {
    p.mathOpen = true;
    showMath({
        reason: `🏗️ Base blueprint — solve to build on ${p.tier.name}!`,
        onCorrect: () => {
            p.mathOpen = false;
            p.baseBuilt = true;
            p.building = BASE_BUILD_TIME;
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
        surfaceStyle(p).prepareLaunch(p);
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
    enterBelt(state.beltIndex + 1);
}

// Also the landing spot for a TURBO warp to a belt (warp.js)
function enterBelt(tierIndex) {
    state.beltIndex = tierIndex;
    state.miles = TIERS[tierIndex].miles;
    state.phase = 'belt';
    state.asteroids = [];
    state.shards = [];
    state.stuckAsteroid = null;
    state.spawnTimer = 0;
    state.ship.x = 120;
    state.ship.y = CANVAS_H / 2;
    state.camY = 0;
    initBackdrop(state.beltIndex);   // every belt gets its own sky
    state.tierBanner = 2.2;
    updateHUD();
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────────────────────────
function showPlanetHUD(on) {
    const iso = !!(state.planet && state.planet.style === 'iso');
    document.getElementById('beltHud').classList.toggle('hidden', on);
    document.getElementById('planetHud').classList.toggle('hidden', !on);
    document.getElementById('beltHint').classList.toggle('hidden', on);
    document.getElementById('planetHint').classList.toggle('hidden', !on || iso);
    document.getElementById('planetHintIso').classList.toggle('hidden', !on || !iso);
}

let lastChipSig = '';
function updatePlanetHUD() {
    const p = state.planet;
    if (!p) return;
    document.getElementById('planetNameDisplay').textContent = `${p.tier.emoji} ${p.tier.name}`;
    document.getElementById('planetBonusDisplay').textContent =
        `+${Math.floor(state.bonusMiles).toLocaleString()} mi`;
    document.getElementById('planetTokenDisplay').textContent = `🪙 ${state.shop.tokens}`;
    // In a cave the resource chips make way for the Exit button
    const inCave = !!p.maze;
    document.getElementById('resourcesHudItem').classList.toggle('hidden', inCave);
    document.getElementById('caveHudItem').classList.toggle('hidden', !inCave);

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
    ctx.globalAlpha = sceneAlpha;
    if (p.maze) {
        caveDraw(p);
    } else {
        drawPlanetSky(p);
        surfaceStyle(p).draw(p);
        drawPlanetBanner(p);
    }
    if (p.caveFade) caveDrawFade(p);
    ctx.globalAlpha = 1;
}

function drawPlanetSky(p) {
    // Sky — tinted by the tier colour
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    sky.addColorStop(0, '#05051a');
    sky.addColorStop(0.55, shade(p.tier.color, -0.30));
    sky.addColorStop(1, shade(p.tier.color, -0.12));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // A few stars still visible in the thin atmosphere
    drawBackdrop({ alpha: 0.5 * sceneAlpha, starsOnly: true, maxY: CANVAS_H * 0.55 });
    ctx.globalAlpha = sceneAlpha;
}

// ── Sprites ──────────────────────────────────────────────────────────────────
// Every painter takes a screen position, so both styles draw the same spaceman,
// aliens, crystals and base — only where they land on screen differs.

function drawResourceAt(x, y, it) {
    const r = resourceFor(it.type);
    const bob = Math.sin(it.spin) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
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

function drawDebrisAt(x, y, d) {
    const fade = Math.min(1, d.life / (d.maxLife * 0.45));
    const base = greyOf(TIERS[d.type].color, -0.22);   // duller than a live resource, and no glow

    ctx.save();
    ctx.globalAlpha = fade * sceneAlpha * 0.9;
    ctx.translate(x, y);
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

function drawAlienAt(x, y, a) {
    const wobble = Math.sin(a.phase) * 2;
    ctx.save();
    ctx.translate(x, y);

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

// (x, y) is the sprite's centre — the boots sit MAN_H / 2 - 2 below it.
function drawSpacemanAt(p, x, y, alpha) {
    const m = p.man;
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

// (x, gy) is the pad's centre on the ground. padRY flattens the pad ellipse to
// the camera angle — thin side-on, fatter from above.
function drawBaseAt(p, x, gy, padRY) {
    ctx.save();
    ctx.translate(x, gy);

    // Glowing landing pad
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 260);
    ctx.strokeStyle = `rgba(74,222,128,${0.5 + pulse * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 62, padRY, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(74,222,128,${0.10 + pulse * 0.10})`;
    ctx.fill();

    if (p.baseBuilt || p.building > 0) {
        // Base rises out of the pad as it is built
        const grow = p.baseBuilt && p.building === 0 ? 1 : 1 - p.building / BASE_BUILD_TIME;
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

// The ship stood on its tail with landing legs out; (x, gy) is where it touches down.
function drawRocketAt(x, gy) {
    ctx.save();
    ctx.translate(x, gy - 34);
    ctx.rotate(-Math.PI / 2);            // stand the ship on its tail
    drawShipSkin(ctx, false);
    ctx.restore();
    // Landing legs
    ctx.strokeStyle = '#8fa4c8'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, gy - 16); ctx.lineTo(x - 18, gy);
    ctx.moveTo(x + 4, gy - 16); ctx.lineTo(x + 18, gy);
    ctx.stroke();
}

function drawPlanetBanner(p) {
    if (p.banner <= 0) return;
    const alpha = Math.min(1, p.banner);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    const done = p.sitePlaced && !p.baseBuilt;
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
        // Backdrop drifts down as the ship drops toward the planet
        drawBackdrop({ camY: state.camY - k * 60 });

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
        const shipY = shipScreenY();          // the belt camera may be far from y=0
        const sy = shipY + (cy - rad - 30 - shipY) * k;
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
    drawBackdrop({ camY: state.camY, alpha: Math.min(1, climb * 1.5 + exit) });

    let rocketX = CANVAS_W * 0.5, rocketY = CANVAS_H * 0.55;
    if (p) {
        const anchor = surfaceStyle(p).launchAnchor(p);
        const worldY = anchor.groundY - 34 - climb * CANVAS_H * 2.1;
        // Camera holds the rocket at 55% height once it has risen that far
        const camY = Math.min(0, worldY - CANVAS_H * 0.55);

        ctx.save();
        ctx.translate(0, -camY);
        sceneAlpha = (1 - climb) * (1 - exit);
        if (sceneAlpha > 0.01) drawPlanetScene();
        sceneAlpha = 1;
        ctx.restore();

        rocketX = anchor.x;
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
