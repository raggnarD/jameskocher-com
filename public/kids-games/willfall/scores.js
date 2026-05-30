// Score persistence — bridges the in-game ScoreStore interface to either
// Firestore (when configured + reachable) or a localStorage fallback.
//
// Both backends share the async shape:
//   getTopScores(limit, grade?) -> [{initials, distance, grade, ts}]
//   submitScore({initials, distance, grade}) -> updated top list
//   qualifies(distance, grade?) -> boolean

const STORAGE_KEY = 'willfall.highScores.v1';
const MAX_SCORES = 10;

const LocalStore = {
    mode: 'local',

    async getTopScores(limit = MAX_SCORES, grade = null) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const all = raw ? JSON.parse(raw) : [];
            const filtered = grade != null ? all.filter(s => String(s.grade) === String(grade)) : all;
            return filtered.slice(0, limit);
        } catch {
            return [];
        }
    },

    async submitScore(entry) {
        const raw = localStorage.getItem(STORAGE_KEY);
        const all = raw ? JSON.parse(raw) : [];
        all.push({
            initials: (entry.initials || '???').toUpperCase().slice(0, 3),
            distance: Math.floor(entry.distance || 0),
            grade: String(entry.grade || '?'),
            ts: Date.now()
        });
        all.sort((a, b) => b.distance - a.distance);
        // Cap per-grade and overall to avoid unbounded growth
        const byGrade = {};
        const trimmed = [];
        for (const s of all) {
            const g = String(s.grade);
            byGrade[g] = (byGrade[g] || 0) + 1;
            if (byGrade[g] <= MAX_SCORES) trimmed.push(s);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed.slice(0, MAX_SCORES * 8)));
        return this.getTopScores(MAX_SCORES, entry.grade);
    },

    async qualifies(distance, grade = null) {
        const top = await this.getTopScores(MAX_SCORES, grade);
        if (top.length < MAX_SCORES) return true;
        return distance > top[top.length - 1].distance;
    }
};

// Bridge: prefer Firestore, fall back to local on errors so the game never
// breaks if the user is offline / behind a strict ad-blocker.
const ScoreStore = {
    mode: 'firestore',
    _hasFirestore: typeof FirestoreStore !== 'undefined',

    _degrade(err) {
        if (this.mode !== 'local') {
            console.warn('[scores] Firestore unavailable, using local fallback:', err);
            this.mode = 'local';
        }
    },

    async getTopScores(limit, grade = null) {
        if (this._hasFirestore && this.mode === 'firestore') {
            try { return await FirestoreStore.getTopScores(limit, grade); }
            catch (e) { this._degrade(e); }
        }
        return LocalStore.getTopScores(limit, grade);
    },

    async submitScore(entry) {
        // Always cache locally so the player still sees their score if Firestore fails
        const localResult = await LocalStore.submitScore(entry);
        if (this._hasFirestore && this.mode === 'firestore') {
            try { return await FirestoreStore.submitScore(entry); }
            catch (e) { this._degrade(e); }
        }
        return localResult;
    },

    async qualifies(distance, grade = null) {
        if (this._hasFirestore && this.mode === 'firestore') {
            try { return await FirestoreStore.qualifies(distance, grade); }
            catch (e) { this._degrade(e); }
        }
        return LocalStore.qualifies(distance, grade);
    }
};

if (!ScoreStore._hasFirestore) ScoreStore.mode = 'local';

// Initials moderation — blocks the obvious offensive 3-letter combos.
// Easy to bypass via dev tools, but stops 99% of accidents.
const BLOCKED_INITIALS = new Set([
    'ASS','FUK','FCK','FUC','SEX','TIT','BBC','BBJ','BJB','BBB','KKK',
    'NIG','FAG','GAY','JEW','CUM','POO','PEE','BUM','GUN','WTF','STD',
    'DIK','DCK','DIC','PUS','VAG','NUT','HOE','HOR','HRY','HEL','DMN',
    'ASW','AHL','PRK','PRC','TWT','CNT','CUN'
]);

function isInitialsAllowed(initials) {
    const clean = String(initials || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (clean.length === 0) return false;
    return !BLOCKED_INITIALS.has(clean);
}
