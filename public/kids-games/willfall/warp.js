// WillFall — TURBO warp map
// Typing T-U-R-B-O (game.js) pauses the run and opens a map of every level:
// the ten belts in space run left to right as a timeline, each tier's planet
// branches off below its belt, and the planet's hidden maze (cave.js) branches
// off below that. Pick any node to jump straight there, or hit Next for the
// level after the current one. Any warp takes the run off the leaderboard.
//
// Warps are instant — no descent or ascent animation, and no Trading Post in
// between (so no stage-clear token either).
//
// Loaded AFTER cave.js — cross-file references stay inside function bodies.

// Every level in play order: Space → Planet → Maze per tier. Mazes only exist
// on Explore planets, so Classic runs skip them.
function warpLevels() {
    const mazes = state.planetStyle !== 'side';
    const out = [];
    TIERS.forEach((_, tier) => {
        out.push({ tier, kind: 'space' }, { tier, kind: 'planet' });
        if (mazes) out.push({ tier, kind: 'maze' });
    });
    return out;
}

function warpLevelName(lv) {
    const t = TIERS[lv.tier];
    const suffix = { space: 'Space', planet: 'Planet', maze: 'Planet Maze' }[lv.kind];
    return `${t.emoji} ${t.name} ${suffix}`;
}

// Where the run is right now. A descent counts as its planet; an ascent is
// still the planet being left.
function warpCurrent() {
    const tier = state.beltIndex;
    if (state.phase === 'belt') return { tier, kind: 'space' };
    const p = state.planet;
    return { tier, kind: p && p.maze ? 'maze' : 'planet' };
}

function warpIndexOf(levels, lv) {
    return levels.findIndex(l => l.tier === lv.tier && l.kind === lv.kind);
}

function warpNextLevel() {
    const levels = warpLevels();
    return levels[warpIndexOf(levels, warpCurrent()) + 1] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu
// ─────────────────────────────────────────────────────────────────────────────
function openWarpMenu() {
    if (!state.running || state.paused) return;
    state.paused = true;
    renderWarpMenu();
    document.getElementById('warpScreen').classList.remove('hidden');

    // Keep "you are here" in view on a narrow screen, then aim Enter at Next
    const here = document.querySelector('#warpMap .warp-node.current');
    if (here) here.scrollIntoView({ block: 'nearest', inline: 'center' });
    const next = document.getElementById('warpNext');
    (next.disabled ? document.getElementById('warpCancel') : next).focus();
}

function closeWarpMenu() {
    document.getElementById('warpScreen').classList.add('hidden');
    if (document.activeElement) document.activeElement.blur();   // or Enter/Space would press it again
    state.paused = false;
    state.lastFrameTs = 0;
}

function warpMenuOpen() {
    return !document.getElementById('warpScreen').classList.contains('hidden');
}

function renderWarpMenu() {
    const levels = warpLevels();
    const cur = warpIndexOf(levels, warpCurrent());
    const next = warpNextLevel();
    const mazes = state.planetStyle !== 'side';

    const node = (tier, kind) => {
        const i = warpIndexOf(levels, { tier, kind });
        const label = { space: 'Space', planet: 'Planet', maze: 'Maze' }[kind];
        if (i < 0) {
            return `<button type="button" class="warp-node ${kind} off" disabled title="Mazes are only on Explore planets">` +
                `<span class="warp-icon"></span><span class="warp-label">${label}</span></button>`;
        }
        const cls = [kind];
        if (i === cur) cls.push('current');
        else if (i < cur) cls.push('past');
        if (next && i === cur + 1) cls.push('next');
        const chest = kind === 'maze' && state.chests.includes(tier) ? '<span class="warp-chest" title="Treasure found">🧰</span>' : '';
        const here = i === cur ? '<span class="warp-here">📍 Here</span>' : '';
        return `<button type="button" class="warp-node ${cls.join(' ')}" data-i="${i}" title="${warpLevelName(levels[i])}">` +
            `${here}<span class="warp-icon">${chest}</span><span class="warp-label">${label}</span></button>`;
    };

    document.getElementById('warpMap').innerHTML = TIERS.map((t, tier) =>
        `<div class="warp-col" style="--tier:${t.color};--glow:${t.glow}">` +
            `<div class="warp-tier">${t.emoji} ${t.name}</div>` +
            `<div class="warp-track">${node(tier, 'space')}</div>` +
            `<div class="warp-branch"></div>${node(tier, 'planet')}` +
            `<div class="warp-branch${mazes ? '' : ' off'}"></div>${node(tier, 'maze')}` +
        `</div>`
    ).join('');

    const btn = document.getElementById('warpNext');
    btn.disabled = !next;
    btn.textContent = next ? `⏭ Next: ${warpLevelName(next)}` : '🏁 This is the last level';
}

// ─────────────────────────────────────────────────────────────────────────────
// The jump itself
// ─────────────────────────────────────────────────────────────────────────────
function warpTo(lv) {
    closeWarpMenu();
    state.cheated = true;
    state.warpEffect = 2.0;
    state.warpLabel = warpLevelName(lv);
    flashCanvas('#9966ff');

    // Drop whatever stage we were in — the planet (and any maze in it) is
    // simply discarded, so there's nothing to back out of.
    state.transition = null;
    state.planet = null;
    clearStuckAsteroid();
    state.asteroids = [];
    state.shards = [];
    state.gasMiles = tankMiles();

    if (lv.kind === 'space') {
        showPlanetHUD(false);
        enterBelt(lv.tier);
        return;
    }

    state.beltIndex = lv.tier;
    state.miles = TIERS[lv.tier].miles + BELT_LENGTH;
    initBackdrop(lv.tier);
    const p = generatePlanet(lv.tier);
    state.planet = p;
    state.phase = 'planet';
    if (lv.kind === 'maze' && p.cave) {
        p.cave.layout = caveLayout(p);
        p.maze = caveMakeWorld(p);
    }
    showPlanetHUD(true);
    updatePlanetHUD();
    updateHUD();
}

// ─────────────────────────────────────────────────────────────────────────────
// Wiring
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById('warpMap').addEventListener('click', (e) => {
    const btn = e.target.closest('.warp-node[data-i]');
    if (!btn) return;
    warpTo(warpLevels()[Number(btn.dataset.i)]);
});

document.getElementById('warpNext').addEventListener('click', () => {
    const next = warpNextLevel();
    if (next) warpTo(next);
});

document.getElementById('warpCancel').addEventListener('click', closeWarpMenu);

// Click the dimmed backdrop to back out
document.getElementById('warpScreen').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeWarpMenu();
});

window.addEventListener('keydown', (e) => {
    if (!warpMenuOpen()) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
        e.preventDefault();
        closeWarpMenu();
    } else if (k === 'n') {
        e.preventDefault();
        document.getElementById('warpNext').click();
    }
});
