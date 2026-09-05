// Grade-appropriate math problems for Math Path.
//
// Every problem in this game is answered on a whole-number keypad, so unlike
// WillFall's generator there are no fraction/slider shapes here — fraction
// concepts show up as "what is 3/4 of 12?" instead, which still lands on an
// integer.
//
//   generateMath(grade) -> { question, answer }
//
// `question` may contain emoji (for the counting problems) but never markup.

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const COUNTABLE = ['⭐', '🍎', '🐟', '🌸', '🍪', '🎈', '🐝'];

const Generators = {
    K() {
        const op = pick(['count', 'count', '+', '-']);
        if (op === 'count') {
            const n = randInt(2, 9);
            return { question: `How many?\n${pick(COUNTABLE).repeat(n)}`, answer: n };
        }
        if (op === '+') {
            const a = randInt(1, 5);
            const b = randInt(0, 5);
            return { question: `${a} + ${b} = ?`, answer: a + b };
        }
        const a = randInt(2, 6);
        const b = randInt(1, a);
        return { question: `${a} − ${b} = ?`, answer: a - b };
    },

    '1'() {
        if (Math.random() < 0.5) {
            const a = randInt(2, 18);
            const b = randInt(1, 20 - a);
            return { question: `${a} + ${b} = ?`, answer: a + b };
        }
        const a = randInt(5, 20);
        const b = randInt(1, a);
        return { question: `${a} − ${b} = ?`, answer: a - b };
    },

    '2'() {
        const op = pick(['+', '-', '×', 'skip']);
        if (op === 'skip') {
            const step = pick([2, 5, 10]);
            const start = step * randInt(1, 5);
            const seq = [start, start + step, start + 2 * step];
            return { question: `${seq.join(', ')}, ?`, answer: start + 3 * step };
        }
        if (op === '+') {
            const a = randInt(10, 80);
            const b = randInt(5, 100 - a);
            return { question: `${a} + ${b} = ?`, answer: a + b };
        }
        if (op === '-') {
            const a = randInt(20, 99);
            const b = randInt(5, a - 1);
            return { question: `${a} − ${b} = ?`, answer: a - b };
        }
        const a = randInt(2, 5);
        const b = randInt(2, 5);
        return { question: `${a} × ${b} = ?`, answer: a * b };
    },

    '3'() {
        const op = pick(['×', '÷', '+', '-', 'frac']);
        if (op === 'frac') {
            const d = pick([2, 3, 4]);
            const mult = randInt(2, 8);
            return { question: `What is 1/${d} of ${d * mult}?`, answer: mult };
        }
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
            return { question: `${a} + ${b} = ?`, answer: a + b };
        }
        const a = randInt(200, 999);
        const b = randInt(50, a - 1);
        return { question: `${a} − ${b} = ?`, answer: a - b };
    },

    '4'() {
        const op = pick(['×', '÷', '+', '-', 'frac', 'area']);
        if (op === 'frac') {
            const d = pick([2, 3, 4, 5, 6]);
            const n = randInt(1, d - 1);
            const mult = randInt(2, 9);
            return { question: `What is ${n}/${d} of ${d * mult}?`, answer: n * mult };
        }
        if (op === 'area') {
            const w = randInt(3, 12);
            const h = randInt(3, 12);
            return { question: `A rectangle is ${w} by ${h}.\nWhat is its area?`, answer: w * h };
        }
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
            return { question: `${a} + ${b} = ?`, answer: a + b };
        }
        const a = randInt(1000, 5000);
        const b = randInt(100, a - 1);
        return { question: `${a} − ${b} = ?`, answer: a - b };
    },

    '5'() {
        const op = pick(['×', '÷', 'frac', 'power', 'order', 'volume']);
        if (op === 'frac') {
            const d = pick([2, 3, 4, 5, 6, 8]);
            const n = randInt(1, d - 1);
            const mult = randInt(3, 12);
            return { question: `What is ${n}/${d} of ${d * mult}?`, answer: n * mult };
        }
        if (op === 'order') {
            const a = randInt(2, 9);
            const b = randInt(2, 9);
            const c = randInt(2, 20);
            return { question: `${a} × ${b} + ${c} = ?`, answer: a * b + c };
        }
        if (op === 'volume') {
            const l = randInt(2, 8), w = randInt(2, 8), h = randInt(2, 6);
            return { question: `A box is ${l} × ${w} × ${h}.\nWhat is its volume?`, answer: l * w * h };
        }
        if (op === 'power') {
            const base = randInt(2, 9);
            const exp = pick([2, 2, 3]);
            return { question: `${base}${exp === 2 ? '²' : '³'} = ?`, answer: Math.pow(base, exp) };
        }
        if (op === '×') {
            const a = randInt(11, 30);
            const b = randInt(11, 30);
            return { question: `${a} × ${b} = ?`, answer: a * b };
        }
        const b = randInt(3, 15);
        const ans = randInt(10, 40);
        return { question: `${b * ans} ÷ ${b} = ?`, answer: ans };
    }
};

function generateMath(grade) {
    const gen = Generators[grade] || Generators['3'];
    return gen();
}
