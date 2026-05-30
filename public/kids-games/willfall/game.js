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
    bestMiles: 0
};

// Keys
const keys = {};
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    // Prevent page scroll for arrow keys + space when game running
    if (state.running && ['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
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
    const radius = 14 + Math.random() * 22;
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
    const base = 1500;
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

// Idle drift keeps the field "alive" but lets the player breathe.
// Boost zooms the world toward the static ship.
const IDLE_SCROLL_RATE = 0.06;
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

    // Forward thrust = miles + gas consumption (no ship x movement)
    if (thrusting) {
        const traveled = SHIP_FORWARD_SPEED_MPS * dt;
        state.miles += traveled;
        state.gasMiles = Math.max(0, state.gasMiles - traveled);
        if (state.gasMiles === 0) {
            triggerGasMath();
        }
    }

    const scrollRate = thrusting ? BOOST_SCROLL_RATE : IDLE_SCROLL_RATE;

    // Asteroids — speed scales with scroll rate so idle nearly stops them
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

    // Stars parallax
    const starDrift = thrusting ? 80 : 4;
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
}

function drawShip(x, y, thrusting) {
    ctx.save();
    ctx.translate(x, y);
    // Thrust flame
    if (thrusting) {
        const flicker = 0.6 + Math.random() * 0.4;
        const grd = ctx.createLinearGradient(-SHIP_W / 2 - 18, 0, -SHIP_W / 2, 0);
        grd.addColorStop(0, 'rgba(255,80,0,0)');
        grd.addColorStop(1, `rgba(255,180,0,${flicker})`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(-SHIP_W / 2, -6);
        ctx.lineTo(-SHIP_W / 2 - 18 * flicker, 0);
        ctx.lineTo(-SHIP_W / 2, 6);
        ctx.closePath();
        ctx.fill();
    }
    // Body
    ctx.fillStyle = '#dde6ff';
    ctx.strokeStyle = '#7aa8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SHIP_W / 2, 0);
    ctx.lineTo(-SHIP_W / 2 + 8, -SHIP_H / 2);
    ctx.lineTo(-SHIP_W / 2, -SHIP_H / 4);
    ctx.lineTo(-SHIP_W / 2, SHIP_H / 4);
    ctx.lineTo(-SHIP_W / 2 + 8, SHIP_H / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cockpit
    ctx.fillStyle = '#7aa8ff';
    ctx.beginPath();
    ctx.ellipse(8, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
    document.getElementById('gasFill').style.width = `${(state.gasMiles / TANK_MILES) * 100}%`;
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

    // Qualify check against the player's own grade — that's the board they care about
    const qualifies = await ScoreStore.qualifies(final, state.grade);
    const entry = document.getElementById('highScoreEntry');
    if (qualifies && final > 0) {
        entry.classList.remove('hidden');
        document.getElementById('initialsInput').value = '';
        document.getElementById('initialsFeedback').textContent = '';
        setTimeout(() => document.getElementById('initialsInput').focus(), 100);
    } else {
        entry.classList.add('hidden');
    }
    // Default end-screen tab to the player's grade
    setActiveTab('hsTabsEnd', state.grade);
    await renderHighScores('highScoreListEnd', state.grade);
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
    ul.innerHTML = scores.map(s => `
        <li>
            <span class="score-initials">${escapeHTML(s.initials)}</span>
            ${scope === 'global' ? `<span class="score-grade">Gr ${escapeHTML(s.grade)}</span>` : ''}
            <span class="score-distance">${s.distance.toLocaleString()} mi</span>
            <span class="score-ts">${formatAgo(s.ts)}</span>
        </li>
    `).join('');
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
updateHUD();
requestAnimationFrame(loop);
