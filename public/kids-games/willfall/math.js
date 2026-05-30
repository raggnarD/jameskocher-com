// Grade-appropriate math problem generator. All answers are integers.
// Returns { question: string, answer: number, stacked?: { a, b, op } }
// When `stacked` is present, the renderer should draw the equation in
// column form (top number, operator + bottom number, bar, answer).

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
        const op = pick(['+', '-', '+', '-', '×']);
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
        const op = pick(['×', '÷', '+', '-']);
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
        const op = pick(['×', '÷', '+', '-']);
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
        const op = pick(['×', '÷', 'fraction', 'power']);
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
