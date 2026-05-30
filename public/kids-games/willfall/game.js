// WillFall — space math adventure
// Hold right/D to thrust forward. Dodge asteroids. Solve math for gas + shield recovery.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_W = canvas.width;
const CANVAS_H = canvas.height;

// World constants
const SHIP_FORWARD_SPEED_MPS = 1000;            // 100,000 mi / 100s
const TANK_MILES = 100000 / 3;                  // 1/3 tank per 100k mile tier
const MAX_SHIELDS = 5;
const SHIP_W = 56;
const SHIP_H = 36;
const SHIP_MOVE_PX_PER_SEC = 320;               // on-screen movement speed

// ─────────────────────────────────────────────────────────────────────────────
// Ship skins — each exposes draw(ctx, thrusting) in local coords (origin = center)
// ─────────────────────────────────────────────────────────────────────────────
const SHIP_SKINS = [
    // ── 0 · Viper ─────────────────────── sleek swept-wing fighter (blue) ──
    {
        name: 'Viper',
        draw(c, thrusting) {
            const W = SHIP_W, H = SHIP_H;
            if (thrusting) {
                const fl = 0.6 + Math.random() * 0.4;
                const g = c.createLinearGradient(-W/2 - 18*fl, 0, -W/2, 0);
                g.addColorStop(0, 'rgba(255,80,0,0)');
                g.addColorStop(1, `rgba(255,180,0,${fl})`);
                c.fillStyle = g;
                c.beginPath();
                c.moveTo(-W/2, -6); c.lineTo(-W/2 - 18*fl, 0); c.lineTo(-W/2, 6);
                c.closePath(); c.fill();
            }
            c.fillStyle = '#dde6ff'; c.strokeStyle = '#7aa8ff'; c.lineWidth = 2;
            c.beginPath();
            c.moveTo(W/2, 0);
            c.lineTo(-W/2+8, -H/2); c.lineTo(-W/2, -H/4);
            c.lineTo(-W/2, H/4);    c.lineTo(-W/2+8, H/2);
            c.closePath(); c.fill(); c.stroke();
            c.fillStyle = '#7aa8ff';
            c.beginPath(); c.ellipse(8, 0, 8, 5, 0, 0, Math.PI*2); c.fill();
        }
    },

    // ── 1 · Falcon ──────────────────────── wide delta bomber (gold) ──
    {
        name: 'Falcon',
        draw(c, thrusting) {
            const W = SHIP_W, H = SHIP_H;
            if (thrusting) {
                const fl = 0.6 + Math.random() * 0.4;
                for (const oy of [-H/4, H/4]) {
                    const g = c.createLinearGradient(-W/2 - 13*fl, oy, -W/2, oy);
                    g.addColorStop(0, 'rgba(255,120,0,0)');
                    g.addColorStop(1, `rgba(255,220,60,${fl})`);
                    c.fillStyle = g;
                    c.beginPath();
                    c.moveTo(-W/2, oy-4); c.lineTo(-W/2 - 13*fl, oy); c.lineTo(-W/2, oy+4);
                    c.closePath(); c.fill();
                }
            }
            c.fillStyle = '#ffe4b0'; c.strokeStyle = '#c07818'; c.lineWidth = 2;
            c.beginPath();
            c.moveTo(W/2, 0);
            c.lineTo(0, -H/2);     c.lineTo(-W/2+4, -H/2);
            c.lineTo(-W/2, -H/4);  c.lineTo(-W/2+10, -2);
            c.lineTo(-W/2+10, 2);
            c.lineTo(-W/2, H/4);   c.lineTo(-W/2+4, H/2);
            c.lineTo(0, H/2);
            c.closePath(); c.fill(); c.stroke();
            // Cockpit
            c.fillStyle = '#c07818';
            c.beginPath(); c.ellipse(10, 0, 9, 4, 0, 0, Math.PI*2); c.fill();
            // Engine pod outlines
            c.strokeStyle = '#ffcc60'; c.lineWidth = 1.5;
            for (const oy of [-H/4, H/4]) c.strokeRect(-W/2, oy-4, 10, 8);
        }
    },

    // ── 2 · Dart ─────────────────── needle interceptor with tail fins (green) ──
    {
        name: 'Dart',
        draw(c, thrusting) {
            const W = SHIP_W, H = SHIP_H;
            if (thrusting) {
                const fl = 0.6 + Math.random() * 0.4;
                const g = c.createLinearGradient(-W/2 - 22*fl, 0, -W/2, 0);
                g.addColorStop(0, 'rgba(0,200,80,0)');
                g.addColorStop(1, `rgba(120,255,180,${fl})`);
                c.fillStyle = g;
                c.beginPath();
                c.moveTo(-W/2, -3); c.lineTo(-W/2 - 22*fl, 0); c.lineTo(-W/2, 3);
                c.closePath(); c.fill();
            }
            c.fillStyle = '#b8ffd8'; c.strokeStyle = '#22aa66'; c.lineWidth = 2;
            // Thin needle fuselage
            c.beginPath();
            c.moveTo(W/2, 0);
            c.lineTo(W/4, -H/6);  c.lineTo(-W/4, -H/6);
            c.lineTo(-W/2, 0);
            c.lineTo(-W/4, H/6);  c.lineTo(W/4, H/6);
            c.closePath(); c.fill(); c.stroke();
            // Top stabiliser fin
            c.beginPath();
            c.moveTo(-8, -H/6); c.lineTo(-12, -H/2+4); c.lineTo(-16, -H/6);
            c.closePath(); c.fill(); c.stroke();
            // Bottom stabiliser fin (mirror)
            c.beginPath();
            c.moveTo(-8, H/6); c.lineTo(-12, H/2-4); c.lineTo(-16, H/6);
            c.closePath(); c.fill(); c.stroke();
            // Cockpit visor
            c.fillStyle = '#22aa66';
            c.beginPath(); c.ellipse(W/4+2, 0, 7, 3, 0, 0, Math.PI*2); c.fill();
        }
    },

    // ── 3 · Saucer ─────────────────────── alien disc scout (purple) ──
    {
        name: 'Saucer',
        draw(c, thrusting) {
            const W = SHIP_W, H = SHIP_H;
            if (thrusting) {
                const fl = 0.6 + Math.random() * 0.4;
                const g = c.createLinearGradient(-W/2 - 16*fl, 0, -W/2+4, 0);
                g.addColorStop(0, 'rgba(140,0,255,0)');
                g.addColorStop(1, `rgba(200,100,255,${fl})`);
                c.fillStyle = g;
                c.beginPath();
                c.moveTo(-W/2+4, -7); c.lineTo(-W/2 - 16*fl, 0); c.lineTo(-W/2+4, 7);
                c.closePath(); c.fill();
            }
            // Disc body
            c.fillStyle = '#e0b0ff'; c.strokeStyle = '#8822cc'; c.lineWidth = 2;
            c.beginPath(); c.ellipse(0, 0, W/2, H/3, 0, 0, Math.PI*2);
            c.fill(); c.stroke();
            // Underside rim detail
            c.fillStyle = '#8822cc';
            c.beginPath(); c.ellipse(0, H/3-3, W/2-4, 4, 0, 0, Math.PI); c.fill();
            // Dome — upper half-ellipse
            const domeCy = -H/3 + 4;
            c.fillStyle = '#f0d8ff'; c.strokeStyle = '#8822cc';
            c.beginPath();
            c.ellipse(2, domeCy, W/4, H/3 - 2, 0, Math.PI, 0, false);
            c.closePath(); c.fill(); c.stroke();
            // Dome tint window
            c.fillStyle = 'rgba(140,60,220,0.4)';
            c.beginPath();
            c.ellipse(2, domeCy, W/8, (H/3-2)*0.5, 0, Math.PI, 0, false);
            c.closePath(); c.fill();
        }
    }
];

const TIERS = [
    { name: 'Rock',     miles: 0,       color: '#7d7d8a', glow: '#aaaaaa', emoji: '🪨' },
    { name: 'Bronze',   miles: 100000,  color: '#cd7f32', glow: '#e8a55c', emoji: '🟫' },
    { name: 'Silver',   miles: 200000,  color: '#c0c0c0', glow: '#ffffff', emoji: '⚪' },
    { name: 'Gold',     miles: 300000,  color: '#ffd700', glow: '#fff4a0', emoji: '🟡' },
    { name: 'Sapphire', miles: 400000,  color: '#0f52ba', glow: '#5a9cff', emoji: '🔵' },
    { name: 'Ruby',     miles: 500000,  color: '#e0115f', glow: '#ff5a8a', emoji: '🔴' },
    { name: 'Emerald',  miles: 600000,  color: '#50c878', glow: '#8fffa8', emoji: '🟢' },
    { name: 'Diamond',  miles: 700000,  color: '#b9f2ff', glow: '#ffffff', emoji: '💎' },
    { name: 'Platinum', miles: 800000,  color: '#e5e4e2', glow: '#ffffff', emoji: '⚙️' },
    { name: 'Obsidian', miles: 900000,  color: '#1a1a1a', glow: '#5a2a8a', emoji: '⬛' }
];

function tierAt(miles) {
    for (let i = TIERS.length - 1; i >= 0; i--) {
        if (miles >= TIERS[i].miles) return { tier: TIERS[i], index: i };
    }
    return { tier: TIERS[0], index: 0 };
}

// Game state
const state = {
    running: false,
    paused: false,           // paused for math overlay
    grade: '3',
    miles: 0,
    gasMiles: TANK_MILES,    // gas remaining in miles
    shields: MAX_SHIELDS,
    ship: { x: 120, y: CANVAS_H / 2 },
    asteroids: [],
    stars: [],
    spawnTimer: 0,
    lastFrameTs: 0,
    mathPending: null,       // { reason: 'gas'|'hit', resume: fn, onWrong: fn }
    mathCurrent: null,
    bestMiles: 0,
    shipSkin: 0,        // index into SHIP_SKINS — cosmetic only
    cheated: false,     // true if warp easter egg used — disqualifies high score
    warpEffect: 0       // countdown (seconds) for the warp flash animation
};

// Keys
const keys = {};

// Easter egg: type T-U-R-B-O during gameplay to warp to the next tier.
// None of these letters overlap with WASD movement keys.
// Using the warp disqualifies the run from the high-score leaderboard.
const WARP_CODE = ['t','u','r','b','o'];
let warpBuffer = [];

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    // Prevent page scroll for arrow keys + space when game running
    if (state.running && ['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();

    // Warp easter egg — only active while playing (not paused for math)
    if (state.running && !state.paused && /^[a-z]$/.test(k)) {
        // WASD movement keys reset the buffer so normal flying never builds up a false match
        if (['w','a','s','d'].includes(k)) {
            warpBuffer = [];
        } else {
            warpBuffer.push(k);
            if (warpBuffer.length > WARP_CODE.length) warpBuffer.shift();
            if (warpBuffer.join('') === WARP_CODE.join('')) {
                warpBuffer = [];
                warpToNextTier();
            }
        }
    }
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function keyHeld(...names) { return names.some(n => keys[n.toLowerCase()]); }

// Starfield background
function initStars() {
    state.stars = [];
    for (let i = 0; i < 120; i++) {
        state.stars.push({
            x: Math.random() * CANVAS_W,
            y: Math.random() * CANVAS_H,
            z: Math.random() * 0.8 + 0.2,
            size: Math.random() * 1.5 + 0.5
        });
    }
}

// Each tier beyond Rock adds 10% to spawn rate, asteroid speed, and angular variance.
// Rock(0)=1.0, Bronze(1)=1.10, Silver(2)=1.20, ..., Obsidian(9)=1.90.
function difficultyMult(tierIndex) {
    return 1 + 0.10 * tierIndex;
}

function spawnAsteroid(tierIndex) {
    const tier = TIERS[tierIndex];
    const mult = difficultyMult(tierIndex);
    const baseSpeed = 140 * mult;                              // px/sec drift left
    const speed = baseSpeed + Math.random() * 80 * mult;       // variance also scales
    const radius = 18 + Math.random() * (34 * Math.min(mult, 1.5));  // 18-52 px at Rock, scales with tier
    state.asteroids.push({
        x: CANVAS_W + radius + 10,
        y: Math.random() * (CANVAS_H - 2 * radius) + radius,
        vx: -speed,
        vy: (Math.random() - 0.5) * 30 * mult,                 // wider vy = more angles
        r: radius,
        color: tier.color,
        glow: tier.glow,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 1.5,
        verts: Array.from({ length: 8 + Math.floor(Math.random() * 4) }, () => 0.75 + Math.random() * 0.4)
    });
}

function spawnIntervalMs(tierIndex) {
    const base = 800;   // Rock spawns every ~0.8 s; higher tiers get proportionally faster
    const min = 280;
    return Math.max(min, Math.round(base / difficultyMult(tierIndex)));
}

// Main loop
function loop(ts) {
    if (!state.lastFrameTs) state.lastFrameTs = ts;
    const dt = Math.min(0.05, (ts - state.lastFrameTs) / 1000);
    state.lastFrameTs = ts;

    if (state.running && !state.paused) update(dt);
    draw();
    requestAnimationFrame(loop);
}

// Visual scroll rate during idle — high enough to look like the ship is coasting
// through space. Decoupled from the score drip so the leaderboard doesn't inflate.
const IDLE_SCROLL_RATE = 0.25;     // asteroids drift at ~50 px/s — visibly moving
const IDLE_MILES_PER_SEC = 30;     // slow score drip while coasting
const BOOST_SCROLL_RATE = 1.0;

function update(dt) {
    const up = keyHeld('arrowup', 'w');
    const down = keyHeld('arrowdown', 's');
    const right = keyHeld('arrowright', 'd');
    const thrusting = right && state.gasMiles > 0;

    // Vertical-only ship movement — x stays locked at launch position
    let vy = 0;
    if (up) vy -= 1;
    if (down) vy += 1;
    state.ship.y += vy * SHIP_MOVE_PX_PER_SEC * dt;
    state.ship.y = Math.max(SHIP_H / 2, Math.min(CANVAS_H - SHIP_H / 2, state.ship.y));

    const scrollRate = thrusting ? BOOST_SCROLL_RATE : IDLE_SCROLL_RATE;

    // Score: full 1000 mi/s while thrusting, gentle drip while coasting.
    if (thrusting) {
        state.miles += SHIP_FORWARD_SPEED_MPS * dt;
        state.gasMiles = Math.max(0, state.gasMiles - SHIP_FORWARD_SPEED_MPS * dt);
        if (state.gasMiles === 0) {
            triggerGasMath();
        }
    } else {
        state.miles += IDLE_MILES_PER_SEC * dt;
    }

    // Asteroids — speed scales with scroll rate so idle drifts them slowly
    const { tier, index: tierIdx } = tierAt(state.miles);
    state.spawnTimer += dt * 1000;
    // Slow spawning when idle so the field doesn't pile up unfairly
    const effectiveSpawn = spawnIntervalMs(tierIdx) / Math.max(0.3, scrollRate);
    if (state.spawnTimer >= effectiveSpawn) {
        state.spawnTimer = 0;
        spawnAsteroid(tierIdx);
    }

    for (const a of state.asteroids) {
        a.x += a.vx * scrollRate * dt;
        a.y += a.vy * scrollRate * dt;
        a.rot += a.rotSpeed * dt;
    }
    state.asteroids = state.asteroids.filter(a => a.x + a.r > -10);

    // Stars parallax — idle drift matches the visible scroll rate
    const starDrift = thrusting ? 80 : 20;
    for (const s of state.stars) {
        s.x -= starDrift * s.z * dt;
        if (s.x < 0) { s.x = CANVAS_W; s.y = Math.random() * CANVAS_H; }
    }

    // Collisions
    for (const a of state.asteroids) {
        if (circleHitsShip(a)) {
            handleShipHit(a);
            break;
        }
    }

    if (state.warpEffect > 0) state.warpEffect = Math.max(0, state.warpEffect - dt);
    updateHUD();
}

function circleHitsShip(a) {
    // Approximate ship as a small box
    const sx = state.ship.x;
    const sy = state.ship.y;
    const dx = Math.max(Math.abs(a.x - sx) - SHIP_W / 2, 0);
    const dy = Math.max(Math.abs(a.y - sy) - SHIP_H / 2, 0);
    return (dx * dx + dy * dy) < a.r * a.r * 0.7;
}

function handleShipHit(asteroid) {
    // Remove asteroid, drop shield, queue math
    state.asteroids = state.asteroids.filter(x => x !== asteroid);
    state.shields -= 1;
    flashCanvas('#ff6b6b');
    if (state.shields <= 0) { endGame(); return; }
    triggerHitMath();
}

function warpToNextTier() {
    const { index } = tierAt(state.miles);
    if (index >= TIERS.length - 1) return; // already at the last tier — nowhere to warp
    const next = TIERS[index + 1];
    state.miles = next.miles + 500;         // land just inside the next tier boundary
    state.cheated = true;
    state.warpEffect = 2.0;                 // seconds the animation plays
    state.asteroids = [];                   // clear the field for a fresh start
    state.gasMiles = TANK_MILES;            // refuel so you don't immediately run out
    flashCanvas('#9966ff');
    updateHUD();
}

function triggerGasMath() {
    showMath({
        reason: '⛽ Out of gas! Solve to refuel.',
        onCorrect: () => { state.gasMiles = TANK_MILES; },
        onWrong: null  // gas math: keep trying, no shield loss
    });
}

function triggerHitMath() {
    showMath({
        reason: '🪨 Impact! Solve to repair shield systems.',
        onCorrect: () => {},
        onWrong: () => {
            state.shields -= 1;
            flashCanvas('#ff6b6b');
            if (state.shields <= 0) { hideMath(); endGame(); return true; }
            return false;
        }
    });
}

function renderQuestion(mc) {
    const el = document.getElementById('mathQuestion');
    if (mc.stacked) {
        const { a, b, op } = mc.stacked;
        const width = Math.max(String(a).length, String(b).length);
        const pad = (n) => String(n).padStart(width, ' ');
        el.classList.add('stacked');
        el.innerHTML = `<span class="stk-row"><span class="stk-op"> </span><span class="stk-num">${pad(a)}</span></span>` +
            `<span class="stk-row"><span class="stk-op">${op === '-' ? '−' : '+'}</span><span class="stk-num">${pad(b)}</span></span>` +
            `<span class="stk-bar"></span>` +
            `<span class="stk-row"><span class="stk-op"> </span><span class="stk-num">${'?'.padStart(width, ' ')}</span></span>`;
    } else {
        el.classList.remove('stacked');
        el.textContent = mc.question;
    }
}

function showMath({ reason, onCorrect, onWrong }) {
    state.paused = true;
    state.mathPending = { reason, onCorrect, onWrong };
    state.mathCurrent = generateMath(state.grade);
    document.getElementById('mathReason').textContent = reason;
    renderQuestion(state.mathCurrent);
    document.getElementById('mathAnswer').value = '';
    document.getElementById('mathFeedback').textContent = '';
    document.getElementById('mathFeedback').className = 'math-feedback';
    document.getElementById('mathModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('mathAnswer').focus(), 50);
}

function hideMath() {
    document.getElementById('mathModal').classList.add('hidden');
    state.paused = false;
    state.mathPending = null;
    state.mathCurrent = null;
}

function submitMath() {
    if (!state.mathPending || !state.mathCurrent) return;
    const input = document.getElementById('mathAnswer').value.trim();
    if (input === '') return;
    const guess = Number(input);
    const fb = document.getElementById('mathFeedback');
    if (guess === state.mathCurrent.answer) {
        fb.textContent = '✅ Correct!';
        fb.className = 'math-feedback correct';
        const onCorrect = state.mathPending.onCorrect;
        setTimeout(() => { hideMath(); if (onCorrect) onCorrect(); }, 500);
    } else {
        fb.textContent = `❌ Not quite — answer was ${state.mathCurrent.answer}. New problem!`;
        fb.className = 'math-feedback wrong';
        const onWrong = state.mathPending.onWrong;
        const ended = onWrong ? onWrong() : false;
        if (ended) return;
        // Generate a new question after a brief delay
        setTimeout(() => {
            if (!state.mathPending) return;
            state.mathCurrent = generateMath(state.grade);
            renderQuestion(state.mathCurrent);
            document.getElementById('mathAnswer').value = '';
            fb.textContent = '';
            fb.className = 'math-feedback';
            document.getElementById('mathAnswer').focus();
        }, 1200);
    }
}

// Rendering
let flashColor = null;
let flashTime = 0;
function flashCanvas(color) { flashColor = color; flashTime = 0.25; }

function draw() {
    // Bg
    ctx.fillStyle = '#02020a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    for (const s of state.stars) {
        ctx.globalAlpha = s.z;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // Tier band
    const { tier } = tierAt(state.miles);
    ctx.fillStyle = tier.color + '22';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Asteroids
    for (const a of state.asteroids) drawAsteroid(a);

    // Ship
    drawShip(state.ship.x, state.ship.y, keyHeld('arrowright', 'd') && state.gasMiles > 0);

    // Flash on hit
    if (flashTime > 0) {
        ctx.fillStyle = flashColor;
        ctx.globalAlpha = flashTime;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.globalAlpha = 1;
        flashTime -= 1 / 60;
    }

    // Tier banner at top
    ctx.fillStyle = '#ffffffcc';
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${tier.emoji} ${tier.name} belt`, CANVAS_W - 12, 22);
    ctx.textAlign = 'left';

    // Warp activated splash
    if (state.warpEffect > 0) {
        const alpha = Math.min(1, state.warpEffect);   // fades out over the last second
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.font = 'bold 44px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#c896ff';
        ctx.fillText('⚡ WARP ACTIVATED ⚡', CANVAS_W / 2, CANVAS_H / 2 - 22);
        ctx.font = '22px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Entering ${tier.emoji} ${tier.name} Belt`, CANVAS_W / 2, CANVAS_H / 2 + 18);
        ctx.font = '14px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#ff9966';
        ctx.fillText('Score excluded from leaderboard', CANVAS_W / 2, CANVAS_H / 2 + 46);
        ctx.textAlign = 'left';
        ctx.restore();
    }

    // Persistent badge so the player always knows their run is off the books
    if (state.cheated) {
        ctx.save();
        ctx.font = '12px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(200,150,255,0.65)';
        ctx.textAlign = 'right';
        ctx.fillText('⚡ warp used — score excluded', CANVAS_W - 12, 44);
        ctx.textAlign = 'left';
        ctx.restore();
    }
}

function drawShip(x, y, thrusting) {
    ctx.save();
    ctx.translate(x, y);
    SHIP_SKINS[state.shipSkin].draw(ctx, thrusting);
    ctx.restore();
}

// Render static ship previews into each skin-picker button canvas
function renderShipPreviews() {
    document.querySelectorAll('.ship-btn').forEach(btn => {
        const idx = Number(btn.dataset.skin);
        const pCanvas = btn.querySelector('canvas');
        if (!pCanvas) return;
        const pCtx = pCanvas.getContext('2d');
        pCtx.fillStyle = '#08081a';
        pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
        pCtx.save();
        pCtx.translate(pCanvas.width / 2, pCanvas.height / 2);
        SHIP_SKINS[idx].draw(pCtx, false);
        pCtx.restore();
    });
}

function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    // Glow
    const grd = ctx.createRadialGradient(0, 0, a.r * 0.3, 0, 0, a.r * 1.4);
    grd.addColorStop(0, a.glow + 'aa');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, a.r * 1.4, 0, Math.PI * 2);
    ctx.fill();
    // Body — jagged polygon
    ctx.fillStyle = a.color;
    ctx.strokeStyle = '#00000080';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const n = a.verts.length;
    for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const r = a.r * a.verts[i];
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

// HUD
function updateHUD() {
    document.getElementById('distanceDisplay').textContent = `${Math.floor(state.miles).toLocaleString()} mi`;
    const { tier } = tierAt(state.miles);
    document.getElementById('tierDisplay').textContent = `${tier.emoji} ${tier.name}`;
    document.getElementById('shieldDisplay').textContent = '🛡️'.repeat(state.shields) + '🖤'.repeat(MAX_SHIELDS - state.shields);
    const gasPercent = state.gasMiles / TANK_MILES;
    const gasFill = document.getElementById('gasFill');
    const gasWarning = document.getElementById('gasWarning');
    gasFill.style.width = `${gasPercent * 100}%`;
    const lowGas = gasPercent < 0.05;
    gasFill.classList.toggle('gas-low', lowGas);
    gasWarning.classList.toggle('visible', lowGas);
    document.getElementById('bestDisplay').textContent = `${Math.floor(state.bestMiles).toLocaleString()} mi`;
}

// Lifecycle
async function startGame() {
    state.running = true;
    state.paused = false;
    state.miles = 0;
    state.gasMiles = TANK_MILES;
    state.shields = MAX_SHIELDS;
    state.ship.x = 120;
    state.ship.y = CANVAS_H / 2;
    state.asteroids = [];
    state.spawnTimer = 0;
    state.lastFrameTs = 0;
    state.cheated = false;
    state.warpEffect = 0;
    warpBuffer = [];
    initStars();
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    updateHUD();
}

async function endGame() {
    state.running = false;
    state.paused = false;
    hideMath();
    const final = Math.floor(state.miles);
    if (final > state.bestMiles) state.bestMiles = final;
    document.getElementById('finalDistance').textContent = final.toLocaleString();
    document.getElementById('finalTier').textContent = tierAt(final).tier.name;

    // Warp runs are excluded from the leaderboard; still fetch scores so they display
    const entry = document.getElementById('highScoreEntry');
    if (state.cheated || final === 0) {
        entry.classList.add('hidden');
    } else {
        const qualifies = await ScoreStore.qualifies(final, state.grade);
        if (qualifies) {
            entry.classList.remove('hidden');
            document.getElementById('initialsInput').value = '';
            document.getElementById('initialsFeedback').textContent = '';
            setTimeout(() => document.getElementById('initialsInput').focus(), 100);
        } else {
            entry.classList.add('hidden');
        }
    }
    // Warp runs default to global tab so there's always content to see;
    // normal runs default to the player's own grade.
    const endScope = state.cheated ? 'global' : state.grade;
    setActiveTab('hsTabsEnd', endScope);
    await renderHighScores('highScoreListEnd', endScope);
    updateModeBadges();
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function formatAgo(ms) {
    if (!ms) return '';
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 30 * 86400) return Math.floor(s / 86400) + 'd ago';
    if (s < 365 * 86400) return Math.floor(s / (30 * 86400)) + 'mo ago';
    return Math.floor(s / (365 * 86400)) + 'y ago';
}

async function renderHighScores(elId, scope = 'global') {
    const ul = document.getElementById(elId);
    const gradeFilter = scope === 'global' ? null : scope;
    ul.innerHTML = '<li class="empty">Loading…</li>';
    const scores = await ScoreStore.getTopScores(10, gradeFilter);
    if (!scores.length) {
        ul.innerHTML = '<li class="empty">No scores yet — be the first!</li>';
        return;
    }
    ul.innerHTML = scores.map(s => {
        const { tier } = tierAt(s.distance);
        return `<li>
            <span class="score-initials">${escapeHTML(s.initials)}</span>
            ${scope === 'global' ? `<span class="score-grade">Gr ${escapeHTML(s.grade)}</span>` : ''}
            <span class="score-tier" title="${tier.name}">${tier.emoji}</span>
            <span class="score-distance">${s.distance.toLocaleString()} mi</span>
            <span class="score-ts">${formatAgo(s.ts)}</span>
        </li>`;
    }).join('');
}

function setActiveTab(tabsId, scope) {
    const tabs = document.getElementById(tabsId);
    if (!tabs) return;
    tabs.querySelectorAll('.hs-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scope === String(scope));
    });
}

function updateModeBadges() {
    const text = ScoreStore.mode === 'firestore' ? '' : '💾 offline — local only';
    document.getElementById('hsModeBadgeStart').textContent = text;
    document.getElementById('hsModeBadgeEnd').textContent = text;
}

function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// UI wiring
document.querySelectorAll('.grade-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.grade = btn.dataset.grade;
    });
});

document.querySelectorAll('.ship-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.ship-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.shipSkin = Number(btn.dataset.skin);
    });
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('playAgainBtn').addEventListener('click', startGame);
document.getElementById('mathSubmit').addEventListener('click', submitMath);
document.getElementById('mathAnswer').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitMath();
});

document.getElementById('saveScoreBtn').addEventListener('click', async () => {
    const raw = document.getElementById('initialsInput').value || '';
    const initials = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    const fb = document.getElementById('initialsFeedback');
    if (!initials) {
        fb.textContent = 'Pick some initials first.';
        return;
    }
    if (!isInitialsAllowed(initials)) {
        fb.textContent = 'Pick different initials, please.';
        return;
    }
    fb.textContent = 'Saving…';
    await ScoreStore.submitScore({ initials, distance: Math.floor(state.miles), grade: state.grade });
    document.getElementById('highScoreEntry').classList.add('hidden');
    setActiveTab('hsTabsEnd', state.grade);
    await renderHighScores('highScoreListEnd', state.grade);
    updateModeBadges();
});

// Tabs — wire both start and end leaderboards
function wireTabs(tabsId, listId) {
    const tabs = document.getElementById(tabsId);
    if (!tabs) return;
    tabs.addEventListener('click', async (e) => {
        const btn = e.target.closest('.hs-tab');
        if (!btn) return;
        const scope = btn.dataset.scope;
        setActiveTab(tabsId, scope);
        await renderHighScores(listId, scope);
        updateModeBadges();
    });
}
wireTabs('hsTabsStart', 'highScoreList');
wireTabs('hsTabsEnd', 'highScoreListEnd');

// Boot
(async () => {
    await renderHighScores('highScoreList', 'global');
    updateModeBadges();
})();
initStars();
renderShipPreviews();
updateHUD();
requestAnimationFrame(loop);
