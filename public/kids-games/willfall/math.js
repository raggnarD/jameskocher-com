// Grade-appropriate math problem generator.
//
// Two answer shapes:
//   integer  → { question, answer: number, stacked?: { a, b, op } }
//              When `stacked` is present, the renderer draws the equation in
//              column form (top number, operator + bottom number, bar, answer).
//   fraction → { kind: 'fraction', questionHTML, frac: { n, d }, ticks, answerText }
//              Answered on a slider with `ticks` notches instead of typed.

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Fractions ────────────────────────────────────────────────────────────────

function gcd(a, b) { while (b) { const t = b; b = a % b; a = t; } return a; }

function reduceFrac(n, d) {
    const g = gcd(n, d) || 1;
    return { n: n / g, d: d / g };
}

// The slider is deliberately scaled off the answer's own denominator: an answer
// of 2/5 is shown as 10ths or 15ths, 5/6 as 12ths or 18ths. Because the factor
// is always ≥ 2, the preview can never hand the player the answer's denominator.
function tickCountFor(d) {
    const opts = [2, 3].filter(k => d * k <= 18);
    return d * (opts.length ? pick(opts) : 2);
}

function fracHTML(n, d) {
    return `<span class="frac"><span class="fr-n">${n}</span><span class="fr-d">${d}</span></span>`;
}

// Wraps a candidate generator: keeps rolling until the reduced answer is a
// proper fraction with a denominator the slider can show sensibly.
function buildFraction(gen, tries = 20) {
    for (let i = 0; i < tries; i++) {
        const c = gen();
        if (!c) continue;
        const f = reduceFrac(c.n, c.d);
        if (f.n <= 0 || f.n >= f.d || f.d < 2 || f.d > 12) continue;
        return {
            kind: 'fraction',
            questionHTML: c.html,
            frac: f,
            ticks: tickCountFor(f.d),
            answerText: `${f.n}/${f.d}`
        };
    }
    // Fallback that always satisfies the constraints
    const d = pick([2, 3, 4, 5, 6]);
    const n = randInt(1, d - 1);
    return {
        kind: 'fraction',
        questionHTML: `Show ${fracHTML(n, d)} on the bar`,
        frac: { n, d },
        ticks: tickCountFor(d),
        answerText: `${n}/${d}`
    };
}

// Denominator pairs whose LCM stays small enough to slide on.
const UNLIKE_PAIRS = [[2,3],[2,4],[2,5],[2,6],[2,8],[2,10],[3,4],[3,6],[3,9],[4,6],[4,8],[5,10],[6,12]];

// Just read the fraction off the bar — the entry point for 2nd grade.
function fracShow() {
    return buildFraction(() => {
        const d = pick([2, 3, 4, 5, 6, 8]);
        const n = randInt(1, d - 1);
        return { n, d, html: `Show ${fracHTML(n, d)} on the bar` };
    });
}

// Same denominator, add or subtract.
function fracLike(maxD, allowSub) {
    return buildFraction(() => {
        const d = randInt(3, maxD);   // 2 leaves no room for two proper parts
        if (allowSub && Math.random() < 0.4) {
            const a = randInt(2, d - 1);
            const b = randInt(1, a - 1);
            if (b < 1) return null;
            return { n: a - b, d, html: `${fracHTML(a, d)} − ${fracHTML(b, d)} = ?` };
        }
        const a = randInt(1, d - 2);
        const b = randInt(1, d - 1 - a);
        if (b < 1) return null;
        return { n: a + b, d, html: `${fracHTML(a, d)} + ${fracHTML(b, d)} = ?` };
    });
}

// Different denominators, add or subtract.
function fracUnlike() {
    return buildFraction(() => {
        const [d1, d2] = pick(UNLIKE_PAIRS);
        const a = randInt(1, d1 - 1);
        const b = randInt(1, d2 - 1);
        const sub = Math.random() < 0.45;
        const n = sub ? a * d2 - b * d1 : a * d2 + b * d1;
        const html = `${fracHTML(a, d1)} ${sub ? '−' : '+'} ${fracHTML(b, d2)} = ?`;
        return { n, d: d1 * d2, html };
    });
}

// Fraction × fraction.
function fracMultiply() {
    return buildFraction(() => {
        const d1 = pick([2, 3, 4, 5, 6]);
        const d2 = pick([2, 3, 4, 5, 6]);
        const a = randInt(1, d1 - 1);
        const b = randInt(1, d2 - 1);
        return { n: a * b, d: d1 * d2, html: `${fracHTML(a, d1)} × ${fracHTML(b, d2)} = ?` };
    });
}

function addSub(a, b, op) {
    return {
        question: `${a} ${op} ${b} = ?`,
        answer: op === '+' ? a + b : a - b,
        stacked: { a, b, op }
    };
}

const Generators = {
    K() {
        const op = pick(['+', 'count']);
        if (op === 'count') {
            const n = randInt(2, 8);
            return { question: `How many? ${'⭐'.repeat(n)}`, answer: n };
        }
        const a = randInt(1, 5);
        const b = randInt(0, 5);
        return addSub(a, b, '+');
    },

    '1'() {
        const op = pick(['+', '-']);
        if (op === '+') {
            const a = randInt(2, 18);
            const b = randInt(1, 20 - a);
            return addSub(a, b, '+');
        }
        const a = randInt(5, 20);
        const b = randInt(1, a);
        return addSub(a, b, '-');
    },

    '2'() {
        const op = pick(['+', '-', '+', '-', '×', 'frac']);
        if (op === 'frac') return fracShow();
        if (op === '+') {
            const a = randInt(10, 80);
            const b = randInt(5, 100 - a);
            return addSub(a, b, '+');
        }
        if (op === '-') {
            const a = randInt(20, 99);
            const b = randInt(5, a - 1);
            return addSub(a, b, '-');
        }
        const a = randInt(2, 5);
        const b = randInt(2, 5);
        return { question: `${a} × ${b} = ?`, answer: a * b };
    },

    '3'() {
        const op = pick(['×', '÷', '+', '-', 'frac']);
        // 3rd grade meets fractions as parts of a whole and unit-fraction sums
        if (op === 'frac') return Math.random() < 0.5 ? fracShow() : fracLike(8, false);
        if (op === '×') {
            const a = randInt(2, 10);
            const b = randInt(2, 10);
            return { question: `${a} × ${b} = ?`, answer: a * b };
        }
        if (op === '÷') {
            const b = randInt(2, 10);
            const ans = randInt(2, 10);
            return { question: `${b * ans} ÷ ${b} = ?`, answer: ans };
        }
        if (op === '+') {
            const a = randInt(100, 800);
            const b = randInt(50, 199);
            return addSub(a, b, '+');
        }
        const a = randInt(200, 999);
        const b = randInt(50, a - 1);
        return addSub(a, b, '-');
    },

    '4'() {
        const op = pick(['×', '÷', '+', '-', 'frac']);
        if (op === 'frac') return fracLike(12, true);   // like denominators, + and −
        if (op === '×') {
            const a = randInt(11, 30);
            const b = randInt(2, 9);
            return { question: `${a} × ${b} = ?`, answer: a * b };
        }
        if (op === '÷') {
            const b = randInt(2, 12);
            const ans = randInt(5, 25);
            return { question: `${b * ans} ÷ ${b} = ?`, answer: ans };
        }
        if (op === '+') {
            const a = randInt(500, 4000);
            const b = randInt(200, 2000);
            return addSub(a, b, '+');
        }
        const a = randInt(1000, 5000);
        const b = randInt(100, a - 1);
        return addSub(a, b, '-');
    },

    '5'() {
        const op = pick(['×', '÷', 'fraction', 'power', 'frac', 'frac']);
        // Unlike denominators and fraction × fraction
        if (op === 'frac') return Math.random() < 0.6 ? fracUnlike() : fracMultiply();
        if (op === '×') {
            const a = randInt(11, 30);
            const b = randInt(11, 30);
            return { question: `${a} × ${b} = ?`, answer: a * b };
        }
        if (op === '÷') {
            const b = randInt(3, 15);
            const ans = randInt(10, 40);
            return { question: `${b * ans} ÷ ${b} = ?`, answer: ans };
        }
        if (op === 'fraction') {
            const denom = pick([2, 3, 4, 5, 6]);
            const numer = randInt(1, denom - 1);
            const wholeMult = randInt(2, 8);
            const whole = denom * wholeMult;
            return { question: `What is ${numer}/${denom} of ${whole}?`, answer: numer * wholeMult };
        }
        const base = randInt(2, 9);
        const exp = pick([2, 2, 3]);
        return { question: `${base}^${exp} = ?`, answer: Math.pow(base, exp) };
    }
};

function generateMath(grade) {
    const gen = Generators[grade] || Generators['3'];
    return gen();
}
