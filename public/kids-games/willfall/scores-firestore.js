// Firestore-backed leaderboard for WillFall.
//
// Loads the Firebase v10 modular SDK from gstatic via dynamic ESM import
// (no npm/bundler needed — this is a static sub-site).
//
// First time a per-grade query runs, Firestore may demand a composite index
// for (grade ASC, distance DESC). The error in the JS console will include
// a one-click URL to create it. Click it once per query shape.

const FIREBASE_CDN = 'https://www.gstatic.com/firebasejs/10.13.0';

const firebaseConfig = {
    apiKey: "AIzaSyDoHEjHrAdGRf9g5PrvMZ0Zquv00D4jyv8",
    authDomain: "willfall-6822e.firebaseapp.com",
    projectId: "willfall-6822e",
    storageBucket: "willfall-6822e.firebasestorage.app",
    messagingSenderId: "508173688547",
    appId: "1:508173688547:web:83c46ace697ebd88b1afd6"
};

let _ready = null;
function _initFirebase() {
    if (_ready) return _ready;
    _ready = (async () => {
        const [appMod, authMod, fsMod] = await Promise.all([
            import(`${FIREBASE_CDN}/firebase-app.js`),
            import(`${FIREBASE_CDN}/firebase-auth.js`),
            import(`${FIREBASE_CDN}/firebase-firestore.js`)
        ]);
        const app = appMod.initializeApp(firebaseConfig);
        const auth = authMod.getAuth(app);
        const db = fsMod.getFirestore(app);
        await authMod.signInAnonymously(auth);
        return { app, auth, db, ...fsMod };
    })();
    return _ready;
}

const COLLECTION = 'willfall_scores';

const FirestoreStore = {
    mode: 'firestore',

    async getTopScores(limit_ = 10, grade = null) {
        const fb = await _initFirebase();
        const constraints = [];
        if (grade != null) constraints.push(fb.where('grade', '==', String(grade)));
        constraints.push(fb.orderBy('distance', 'desc'));
        constraints.push(fb.limit(limit_));
        const q = fb.query(fb.collection(fb.db, COLLECTION), ...constraints);
        const snap = await fb.getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            return {
                initials: data.initials,
                distance: data.distance,
                grade: data.grade,
                ts: data.ts && typeof data.ts.toMillis === 'function' ? data.ts.toMillis() : null
            };
        });
    },

    async submitScore(entry) {
        const fb = await _initFirebase();
        const initials = (String(entry.initials || '???'))
            .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || '???';
        await fb.addDoc(fb.collection(fb.db, COLLECTION), {
            initials,
            distance: Math.floor(entry.distance || 0),
            grade: String(entry.grade || '?'),
            ts: fb.serverTimestamp()
        });
        return this.getTopScores(10, entry.grade);
    },

    async qualifies(distance, grade = null) {
        const top = await this.getTopScores(10, grade);
        if (top.length < 10) return true;
        return distance > top[top.length - 1].distance;
    }
};
