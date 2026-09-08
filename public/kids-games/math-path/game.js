// Math Path — a rotate-the-tiles maze gated by grade-appropriate math.
//
// Board model
// -----------
// Each cell is a pipe tile with openings on some subset of its four sides,
// stored as a 4-bit mask (N=1, E=2, S=4, W=8). A tile is a *type* (the shape)
// plus a *rotation* 0-3; rotating is a bit-rotate of the type's base mask, so
// the shape is invariant and only the orientation changes. That matters for
// solvability: the generator carves a real solution, records each tile's
// solution rotation, then scrambles rotations only — so every board is
// guaranteed solvable by rotating tiles back.
//
// Two neighbours are connected only when BOTH face each other. After every
// rotation we flood-fill from the start tile; that reachable set is what
// lights up, and the walker parks on the lit tile closest to the diamond.

// ── Directions ───────────────────────────────────────────────────────────────

const N = 1, E = 2, S = 4, W = 8;
const DIRS = [
    { bit: N, dr: -1, dc: 0 },
    { bit: E, dr: 0, dc: 1 },
    { bit: S, dr: 1, dc: 0 },
    { bit: W, dr: 0, dc: -1 }
];
const OPPOSITE = { [N]: S, [E]: W, [S]: N, [W]: E };

// Rotate the mask one quarter-turn clockwise (N→E→S→W→N).
function rotCW(mask) { return ((mask << 1) | (mask >> 3)) & 15; }

function rotN(mask, times) {
    let m = mask;
    for (let i = 0; i < (times & 3); i++) m = rotCW(m);
    return m;
}

// ── Tile types ───────────────────────────────────────────────────────────────

const TYPES = {
    stub:     { mask: N },
    straight: { mask: N | S },
    elbow:    { mask: N | E },
    tee:      { mask: N | E | S },
    cross:    { mask: N | E | S | W }
};

// Every 4-bit mask with at least one opening maps to exactly one type +
// rotation, so the generator can hand any opening-set to a real tile.
function typeAndRotFor(mask) {
    for (const [name, def] of Object.entries(TYPES)) {
        for (let rot = 0; rot < 4; rot++) {
            if (rotN(def.mask, rot) === mask) return { type: name, rot };
        }
    }
    return { type: 'cross', rot: 0 };
}

// Canonical SVG for each shape, drawn with the openings the base mask names.
// The whole <svg> is rotated by CSS, so these only ever need one orientation.
const SHAPES = {
    stub:     ['M50,0 L50,52'],
    straight: ['M50,0 L50,100'],
    elbow:    ['M50,0 L50,50 L100,50'],
    tee:      ['M50,0 L50,100', 'M50,50 L100,50'],
    cross:    ['M50,0 L50,100', 'M0,50 L100,50']
};

function pipeSVG(type) {
    const paths = SHAPES[type];
    const casing = paths.map(d => `<path class="casing" d="${d}"/>`).join('');
    const core = paths.map(d => `<path class="core" d="${d}"/>`).join('');
    const cap = type === 'stub' ? '<circle class="core cap" cx="50" cy="52" r="9"/>' : '';
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${casing}${core}${cap}</svg>`;
}

// ── Small helpers ────────────────────────────────────────────────────────────

const rand = (n) => Math.floor(Math.random() * n);
const pickOne = (a) => a[rand(a.length)];

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = rand(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const key = (r, c) => `${r},${c}`;

// ── Board generation ─────────────────────────────────────────────────────────

// Start and goal both sit on the perimeter, on different sides, so the maze
// always has to cross the board rather than hug one edge.
function pickEndpoints(n) {
    const sides = ['top', 'bottom', 'left', 'right'];
    const cellOn = (side) => {
        const i = rand(n);
        if (side === 'top') return { r: 0, c: i, out: N };
        if (side === 'bottom') return { r: n - 1, c: i, out: S };
        if (side === 'left') return { r: i, c: 0, out: W };
        return { r: i, c: n - 1, out: E };
    };
    for (let tries = 0; tries < 60; tries++) {
        const a = pickOne(sides);
        const b = pickOne(sides.filter(s => s !== a));
        const start = cellOn(a);
        const goal = cellOn(b);
        const dist = Math.abs(start.r - goal.r) + Math.abs(start.c - goal.c);
        if (dist >= Math.max(3, n - 1)) return { start, goal };
    }
    return { start: { r: 0, c: 0, out: N }, goal: { r: n - 1, c: n - 1, out: S } };
}

function neighbours(r, c, n) {
    return DIRS
        .map(d => ({ r: r + d.dr, c: c + d.dc, bit: d.bit }))
        .filter(p => p.r >= 0 && p.r < n && p.c >= 0 && p.c < n);
}

// Randomised DFS. Because `seen` is never cleared, the walk explores the whole
// (connected) grid, so it always reaches the goal; the stack at that moment is
// a self-avoiding path from start to goal.
function carvePath(n, start, goal) {
    const seen = new Set([key(start.r, start.c)]);
    const stack = [{ r: start.r, c: start.c }];
    while (stack.length) {
        const cur = stack[stack.length - 1];
        if (cur.r === goal.r && cur.c === goal.c) return stack.slice();
        const opts = shuffle(neighbours(cur.r, cur.c, n)).filter(p => !seen.has(key(p.r, p.c)));
        if (!opts.length) { stack.pop(); continue; }
        const next = opts[0];
        seen.add(key(next.r, next.c));
        stack.push({ r: next.r, c: next.c });
    }
    return [{ r: start.r, c: start.c }, { r: goal.r, c: goal.c }];
}

function makeBoard(n) {
    const { start, goal } = pickEndpoints(n);
    const path = carvePath(n, start, goal);

    // Openings accumulate per cell as we add edges.
    const masks = Array.from({ length: n }, () => new Array(n).fill(0));
    const link = (a, b) => {
        const bit = DIRS.find(d => a.r + d.dr === b.r && a.c + d.dc === b.c).bit;
        masks[a.r][a.c] |= bit;
        masks[b.r][b.c] |= OPPOSITE[bit];
    };

    for (let i = 0; i < path.length - 1; i++) link(path[i], path[i + 1]);

    // Grow the rest of the board off the solution path as a spanning tree, so
    // every tile is part of one coherent pipe network rather than random junk.
    const inTree = new Set(path.map(p => key(p.r, p.c)));
    const frontier = path.map(p => ({ r: p.r, c: p.c }));
    while (inTree.size < n * n && frontier.length) {
        const idx = rand(frontier.length);
        const cell = frontier[idx];
        const opts = neighbours(cell.r, cell.c, n).filter(p => !inTree.has(key(p.r, p.c)));
        if (!opts.length) { frontier.splice(idx, 1); continue; }
        const next = pickOne(opts);
        link(cell, next);
        inTree.add(key(next.r, next.c));
        frontier.push({ r: next.r, c: next.c });
    }

    // A few extra edges turn some tees into crosses and add loops. Kept sparse
    // on purpose: a cross connects in every orientation, so too many of them
    // would hand the player the solution.
    const extras = Math.floor(n * n * 0.04);
    for (let i = 0; i < extras; i++) {
        const r = rand(n), c = rand(n);
        const opts = neighbours(r, c, n).filter(p => !(masks[r][c] & p.bit));
        if (opts.length) link({ r, c }, pickOne(opts));
    }

    // The endpoints also open outward, off the board — cosmetic, but it reads
    // as an entrance and an exit instead of two tiles that stop dead.
    masks[start.r][start.c] |= start.out;
    masks[goal.r][goal.c] |= goal.out;

    const tiles = [];
    for (let r = 0; r < n; r++) {
        tiles.push([]);
        for (let c = 0; c < n; c++) {
            const m = masks[r][c] || N;                  // isolated cell → stub
            const { type, rot } = typeAndRotFor(m);
            const locked = (r === start.r && c === start.c) || (r === goal.r && c === goal.c);
            tiles[r].push({ type, rot, solutionRot: rot, locked });
        }
    }

    const board = { n, tiles, start, goal };

    // Scramble every unlocked tile, then make sure we did not hand over a board
    // that is already solved.
    for (let attempt = 0; attempt < 12; attempt++) {
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const t = tiles[r][c];
                if (!t.locked) t.rot = rand(4);
            }
        }
        if (!solves(board)) return board;
    }
    // Vanishingly unlikely, but never ship a pre-solved board.
    const spin = path.find(p => !tiles[p.r][p.c].locked && tiles[p.r][p.c].type !== 'cross');
    if (spin) tiles[spin.r][spin.c].rot = (tiles[spin.r][spin.c].rot + 1) & 3;
    return board;
}

// ── Connectivity ─────────────────────────────────────────────────────────────

function maskAt(board, r, c) {
    const t = board.tiles[r][c];
    return rotN(TYPES[t.type].mask, t.rot);
}

// Flood-fill from the start tile. Returns the reachable set plus the parent
// map, which doubles as the route the walker animates along on a win.
function flood(board) {
    const { n, start } = board;
    const seen = new Set([key(start.r, start.c)]);
    const parent = new Map();
    const queue = [{ r: start.r, c: start.c }];
    while (queue.length) {
        const cur = queue.shift();
        const mine = maskAt(board, cur.r, cur.c);
        for (const d of DIRS) {
            if (!(mine & d.bit)) continue;
            const nr = cur.r + d.dr, nc = cur.c + d.dc;
            if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
            if (seen.has(key(nr, nc))) continue;
            if (!(maskAt(board, nr, nc) & OPPOSITE[d.bit])) continue;   // must face back
            seen.add(key(nr, nc));
            parent.set(key(nr, nc), key(cur.r, cur.c));
            queue.push({ r: nr, c: nc });
        }
    }
    return { seen, parent };
}

function solves(board) {
    return flood(board).seen.has(key(board.goal.r, board.goal.c));
}

function routeToGoal(board, parent) {
    const route = [];
    let k = key(board.goal.r, board.goal.c);
    while (k) {
        const [r, c] = k.split(',').map(Number);
        route.unshift({ r, c });
        k = parent.get(k);
    }
    return route;
}

// ── Sound ────────────────────────────────────────────────────────────────────

const Sound = {
    muted: localStorage.getItem('mathpath.muted') === '1',
    ctx: null,

    tone(freq, dur = 0.09, type = 'triangle', gain = 0.05, delay = 0) {
        if (this.muted) return;
        try {
            this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
            const t0 = this.ctx.currentTime + delay;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);
            g.gain.setValueAtTime(gain, t0);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(g).connect(this.ctx.destination);
            osc.start(t0);
            osc.stop(t0 + dur);
        } catch { /* audio is decoration; never let it break play */ }
    },

    click()   { this.tone(420, 0.06, 'square', 0.035); },
    connect() { this.tone(660, 0.1); this.tone(880, 0.12, 'triangle', 0.045, 0.06); },
    locked()  { this.tone(150, 0.12, 'sawtooth', 0.03); },
    right()   { [523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, i * 0.07)); },
    wrong()   { this.tone(200, 0.2, 'sawtooth', 0.04); },
    win()     { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.06, i * 0.12)); }
};

// ── Game ─────────────────────────────────────────────────────────────────────

const SIZES = [
    { n: 5, label: 'Very Easy', sub: '5 × 5' },
    { n: 6, label: 'Easy', sub: '6 × 6' },
    { n: 7, label: 'Medium', sub: '7 × 7' },
    { n: 8, label: 'Hard', sub: '8 × 8' },
    { n: 10, label: 'Very Hard', sub: '10 × 10' }
];

const GRADES = [
    { id: 'K', label: 'K', sub: 'Counting' },
    { id: '1', label: '1st', sub: '+ and −' },
    { id: '2', label: '2nd', sub: 'To 100' },
    { id: '3', label: '3rd', sub: '× and ÷' },
    { id: '4', label: '4th', sub: 'Bigger' },
    { id: '5', label: '5th', sub: 'Fractions' }
];

// The board row on the setup screen: Adventure first (the default), then each
// fixed size on its own. Adventure walks SIZES in order, one board per rung.
const BOARD_CHOICES = [
    { id: 'adventure', label: '⭐ Adventure', sub: '5×5 → 10×10', cls: 'choice-adventure' },
    ...SIZES.map(s => ({ id: String(s.n), label: s.label, sub: s.sub }))
];

const TURNS_PER_GATE = 5;

// Faces, hands, animals — plus 👀 and 🧠. Deliberately no people,
// body parts, or professions.
const WALKERS = [
    // Faces, cats, ghost & aliens (109)
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇',
    '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑',
    '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🤗', '🤭', '🫢', '🫣', '🤫',
    '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥', '😌',
    '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵',
    '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯',
    '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
    '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '👻', '👽', '👾',
    // Spooky & silly (9)
    '💀', '☠️', '😈', '👿', '👹', '👺', '🤡', '🤖', '💩',
    // Hands (39)
    '👋', '🤚', '🖐', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '🫷', '🫸', '👌', '🤌', '🤏',
    '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '🫵', '👍', '👎',
    '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏',
    // Eyes & brain (2)
    '👀', '🧠',
    // Animals (114)
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐻‍❄️', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
    '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅',
    '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰',
    '🪲', '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞',
    '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧',
    '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖',
    '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦤',
    '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀',
    '🐿', '🦔'
];

const el = (id) => document.getElementById(id);

const State = {
    boardChoice: localStorage.getItem('mathpath.boardChoice') || 'adventure',
    grade: localStorage.getItem('mathpath.grade') || 'K',
    mode: 'adventure',           // 'adventure' | 'free'
    stage: 0,                    // index into SIZES, adventure only
    size: SIZES[0].n,
    adventureDone: false,
    board: null,
    turnsLeft: TURNS_PER_GATE,
    solved: 0,
    boardNum: 1,
    walkerEmoji: '🚶',
    problem: null,
    entry: '',
    busy: false
};

// ── Setup screen ─────────────────────────────────────────────────────────────

function buildChooser(host, items, valueOf, isSelected, onPick) {
    host.innerHTML = '';
    for (const item of items) {
        const btn = document.createElement('button');
        btn.className = 'choice' + (item.cls ? ' ' + item.cls : '') + (isSelected(item) ? ' selected' : '');
        btn.innerHTML = `<span class="choice-label">${item.label}</span><span class="choice-sub">${item.sub}</span>`;
        btn.addEventListener('click', () => {
            onPick(valueOf(item));
            host.querySelectorAll('.choice').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            Sound.click();
        });
        host.appendChild(btn);
    }
}

function renderChooserNote() {
    el('chooserNote').textContent = State.boardChoice === 'adventure'
        ? 'Work up the ladder: 5×5, 6×6, 7×7, 8×8, then 10×10.'
        : 'One size, board after board, for as long as you like.';
}

function renderSetup() {
    buildChooser(el('gradeChooser'), GRADES, g => g.id, g => g.id === State.grade, (g) => {
        State.grade = g;
        localStorage.setItem('mathpath.grade', g);
    });
    buildChooser(el('sizeChooser'), BOARD_CHOICES, b => b.id, b => b.id === State.boardChoice, (id) => {
        State.boardChoice = id;
        localStorage.setItem('mathpath.boardChoice', id);
        renderChooserNote();
    });
    renderChooserNote();
}

// ── Board rendering ──────────────────────────────────────────────────────────

function renderBoard() {
    const board = el('board');
    const { n, tiles, start, goal } = State.board;
    // --n drives both the grid and the emoji sizing; the walker lives outside
    // .board, so the wrapper needs it too.
    board.style.setProperty('--n', n);
    board.parentElement.style.setProperty('--n', n);
    board.innerHTML = '';

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const t = tiles[r][c];
            const cell = document.createElement('button');
            cell.className = 'tile' + (t.locked ? ' locked' : '');
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.setAttribute('aria-label', `Tile row ${r + 1} column ${c + 1}`);

            const pipe = document.createElement('div');
            pipe.className = 'pipe';
            pipe.style.transform = `rotate(${t.rot * 90}deg)`;
            pipe.innerHTML = pipeSVG(t.type);
            cell.appendChild(pipe);

            if (r === goal.r && c === goal.c) {
                cell.classList.add('goal');
                const badge = document.createElement('div');
                badge.className = 'badge goal-badge';
                badge.textContent = '💎';
                cell.appendChild(badge);
            } else if (r === start.r && c === start.c) {
                cell.classList.add('start');
            }

            cell.addEventListener('click', () => onTileClick(r, c));
            board.appendChild(cell);
        }
    }
    el('walker').textContent = State.walkerEmoji;
    el('walker').hidden = false;
}

function tileEl(r, c) {
    return el('board').querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
}

function placeWalker(r, c) {
    const { n } = State.board;
    const w = el('walker');
    w.style.left = `${((c + 0.5) / n) * 100}%`;
    w.style.top = `${((r + 0.5) / n) * 100}%`;
}

// Light the reachable region and park the walker on the lit tile nearest the
// diamond — the farthest point the path currently gets you.
function refreshReach() {
    const { seen } = flood(State.board);
    const { n, goal } = State.board;
    let best = null, bestDist = Infinity;

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const lit = seen.has(key(r, c));
            tileEl(r, c).classList.toggle('lit', lit);
            if (!lit) continue;
            const dist = Math.abs(r - goal.r) + Math.abs(c - goal.c);
            if (dist < bestDist) { bestDist = dist; best = { r, c }; }
        }
    }
    if (best) placeWalker(best.r, best.c);
    return seen;
}

// ── Play ─────────────────────────────────────────────────────────────────────

function renderPips() {
    const pips = el('pips');
    pips.innerHTML = '';
    for (let i = 0; i < TURNS_PER_GATE; i++) {
        const dot = document.createElement('span');
        dot.className = 'pip' + (i < State.turnsLeft ? ' on' : '');
        pips.appendChild(dot);
    }
}

function setHint(text) { el('hint').textContent = text; }

function onTileClick(r, c) {
    if (State.busy) return;
    const t = State.board.tiles[r][c];

    if (t.locked) {
        Sound.locked();
        const cell = tileEl(r, c);
        cell.classList.remove('shake');
        void cell.offsetWidth;
        cell.classList.add('shake');
        setHint(r === State.board.goal.r && c === State.board.goal.c
            ? 'The diamond tile is fixed — build the path to it!'
            : 'Your walker’s tile is fixed — spin the others.');
        return;
    }

    t.rot = (t.rot + 1) & 3;
    tileEl(r, c).querySelector('.pipe').style.transform = `rotate(${t.rot * 90}deg)`;
    Sound.click();

    State.turnsLeft--;
    renderPips();

    const seen = refreshReach();

    if (seen.has(key(State.board.goal.r, State.board.goal.c))) {
        winBoard();
        return;
    }
    if (State.turnsLeft <= 0) {
        setTimeout(openMathGate, 420);
    } else {
        setHint(`${State.turnsLeft} turn${State.turnsLeft === 1 ? '' : 's'} until the next math problem.`);
    }
}

function winBoard() {
    State.busy = true;
    Sound.win();
    const { parent } = flood(State.board);
    const route = routeToGoal(State.board, parent);
    const stepMs = Math.max(90, 420 / Math.max(1, route.length));

    el('walker').classList.add('walking');
    route.forEach((cell, i) => {
        setTimeout(() => placeWalker(cell.r, cell.c), i * stepMs);
    });

    setTimeout(() => {
        el('walker').classList.remove('walking');
        State.solved++;
        el('solvedCount').textContent = State.solved;
        el('winEmoji').textContent = State.walkerEmoji;
        renderWinCopy(route.length);
        el('winModal').hidden = false;
        State.busy = false;
    }, route.length * stepMs + 500);
}

function renderWinCopy(routeLen) {
    const lastStage = State.mode === 'adventure' && State.stage === SIZES.length - 1;
    State.adventureDone = lastStage;

    if (lastStage) {
        el('winTitle').textContent = 'Adventure complete! 🏆';
        el('winLine').textContent =
            `${State.walkerEmoji} solved all ${SIZES.length} boards, 5×5 through 10×10.`;
        el('nextBoardBtn').textContent = 'Play Again →';
    } else if (State.mode === 'adventure') {
        const next = SIZES[State.stage + 1];
        el('winTitle').textContent = 'Stage clear!';
        el('winLine').textContent =
            `${State.walkerEmoji} reached the 💎 in ${routeLen} tiles. Next up: ${next.sub}.`;
        el('nextBoardBtn').textContent = 'Next Stage →';
    } else {
        el('winTitle').textContent = 'You made it!';
        el('winLine').textContent = `${State.walkerEmoji} reached the 💎 in ${routeLen} tiles.`;
        el('nextBoardBtn').textContent = 'Next Board →';
    }
}

function renderProgress() {
    if (State.mode === 'adventure') {
        el('progressLabel').textContent = 'Stage';
        el('boardNum').textContent = `${State.stage + 1}/${SIZES.length}`;
    } else {
        el('progressLabel').textContent = 'Board';
        el('boardNum').textContent = String(State.boardNum);
    }
    el('boardSize').textContent = `${State.size}×${State.size}`;
}

// countUp: this is another board in the session (the New Board button, or the
// next one after a win). advanceStage: only ever set after clearing a board in
// adventure mode, so re-rolling never skips a rung of the ladder.
function newBoard({ countUp = true, advanceStage = false } = {}) {
    if (countUp) State.boardNum++;
    if (advanceStage && State.mode === 'adventure' && State.stage < SIZES.length - 1) {
        State.stage++;
        State.size = SIZES[State.stage].n;
    }
    State.board = makeBoard(State.size);
    State.walkerEmoji = pickOne(WALKERS);
    State.turnsLeft = TURNS_PER_GATE;
    renderProgress();
    renderBoard();
    renderPips();
    refreshReach();
    setHint('Tap a tile to spin it. Connect your walker to the 💎.');
}

function startAdventureOver() {
    State.stage = 0;
    State.size = SIZES[0].n;
    State.boardNum = 1;
    State.solved = 0;
    State.adventureDone = false;
    el('solvedCount').textContent = '0';
    newBoard({ countUp: false });
}

// ── Math gate ────────────────────────────────────────────────────────────────

function buildKeypad() {
    const pad = el('keypad');
    pad.innerHTML = '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
    for (const k of keys) {
        const btn = document.createElement('button');
        btn.className = 'key' + (k === 'OK' ? ' key-ok' : k === '⌫' ? ' key-del' : '');
        btn.textContent = k;
        btn.addEventListener('click', () => pressKey(k));
        pad.appendChild(btn);
    }
}

function pressKey(k) {
    if (k === '⌫') {
        State.entry = State.entry.slice(0, -1);
    } else if (k === 'OK') {
        submitAnswer();
        return;
    } else if (State.entry.length < 6) {
        State.entry += k;
    }
    Sound.click();
    el('answerValue').textContent = State.entry === '' ? '–' : State.entry;
}

function nextProblem() {
    State.problem = generateMath(State.grade);
    State.entry = '';
    el('problem').textContent = State.problem.question;
    el('answerValue').textContent = '–';
}

function openMathGate() {
    setHint('Solve the problem to earn 5 more turns.');
    nextProblem();
    el('mathFeedback').textContent = '';
    el('mathModal').hidden = false;
}

function submitAnswer() {
    if (State.entry === '') return;
    const given = Number(State.entry);
    const card = el('mathModal').querySelector('.modal-card');

    if (given === State.problem.answer) {
        Sound.right();
        el('mathFeedback').textContent = 'Correct! 5 more turns. 🎉';
        el('mathFeedback').className = 'math-feedback good';
        setTimeout(() => {
            el('mathModal').hidden = true;
            State.turnsLeft = TURNS_PER_GATE;
            renderPips();
            setHint('Nice! Keep spinning — 5 turns until the next problem.');
        }, 700);
        return;
    }

    Sound.wrong();
    el('mathFeedback').textContent = 'Not quite — try this one.';
    el('mathFeedback').className = 'math-feedback bad';
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    setTimeout(nextProblem, 800);
}

// ── Screens ──────────────────────────────────────────────────────────────────

function startGame() {
    el('setup').hidden = true;
    el('game').hidden = false;
    State.mode = State.boardChoice === 'adventure' ? 'adventure' : 'free';
    State.stage = 0;
    State.size = State.mode === 'adventure' ? SIZES[0].n : Number(State.boardChoice);
    State.adventureDone = false;
    State.solved = 0;
    State.boardNum = 1;
    el('solvedCount').textContent = '0';
    newBoard({ countUp: false });
}

function showSetup() {
    el('game').hidden = true;
    el('setup').hidden = false;
    renderSetup();
}

function syncMuteBtn() {
    el('muteBtn').textContent = Sound.muted ? '🔇' : '🔊';
}

function init() {
    renderSetup();
    buildKeypad();
    syncMuteBtn();

    el('startBtn').addEventListener('click', startGame);
    el('newBoardBtn').addEventListener('click', () => { if (!State.busy) newBoard({}); });
    el('changeBtn').addEventListener('click', showSetup);
    el('nextBoardBtn').addEventListener('click', () => {
        el('winModal').hidden = true;
        if (State.adventureDone) startAdventureOver();
        else newBoard({ advanceStage: State.mode === 'adventure' });
    });
    el('muteBtn').addEventListener('click', () => {
        Sound.muted = !Sound.muted;
        localStorage.setItem('mathpath.muted', Sound.muted ? '1' : '0');
        syncMuteBtn();
        if (!Sound.muted) Sound.click();
    });

    document.addEventListener('keydown', (e) => {
        if (el('mathModal').hidden) return;
        if (/^[0-9]$/.test(e.key)) pressKey(e.key);
        else if (e.key === 'Backspace') pressKey('⌫');
        else if (e.key === 'Enter') pressKey('OK');
    });

    window.addEventListener('resize', () => {
        if (State.board) refreshReach();
    });
}

document.addEventListener('DOMContentLoaded', init);
