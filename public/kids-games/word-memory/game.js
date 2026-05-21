// Word pools by grade level
const wordPools = {
    prek: [
        'cat', 'dog', 'sun', 'moon', 'star', 'car', 'bus', 'hat', 'cup', 'ball',
        'book', 'tree', 'fish', 'bird', 'cow', 'pig', 'duck', 'bee', 'ant', 'bug',
        'red', 'blue', 'big', 'small', 'up', 'down', 'in', 'out', 'yes', 'no',
        'mom', 'dad', 'baby', 'toy', 'cake', 'milk', 'apple', 'banana', 'bear', 'lion'
    ],
    k: [
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
        'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
        'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
        'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'run', 'jump',
        'play', 'come', 'make', 'take', 'give', 'live', 'like', 'look', 'find', 'kind'
    ],
    '1st': [
        'after', 'again', 'an', 'any', 'ask', 'as', 'by', 'could', 'every', 'fly',
        'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
        'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
        'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk', 'were',
        'when', 'always', 'around', 'because', 'been', 'before', 'best', 'both', 'buy', 'call'
    ],
    '2nd': [
        'about', 'above', 'across', 'after', 'again', 'against', 'along', 'also', 'always', 'around',
        'because', 'before', 'behind', 'below', 'between', 'both', 'bring', 'carry', 'change', 'clean',
        'close', 'cold', 'come', 'could', 'cut', 'does', 'done', 'draw', 'drink', 'early',
        'eight', 'enough', 'even', 'every', 'fall', 'far', 'fast', 'feel', 'find', 'first',
        'five', 'fly', 'found', 'four', 'full', 'gave', 'give', 'goes', 'goes', 'good',
        'got', 'green', 'grow', 'hand', 'hard', 'has', 'have', 'head', 'hear', 'help'
    ]
};

// Game state
const gameState = {
    words: [], // Array of 5 selected words
    wordPositions: [], // Array mapping word index to position
    selectedWordIndex: null, // Currently selected word from speaker
    matchedPositions: [], // Array of matched position indices
    matchCount: 0,
    gamePhase: 'start', // 'start', 'showing', 'hidden', 'playing', 'won'
    activeGrades: ['prek', 'k', '1st', '2nd'] // Default active grades
};

// Initialize the game
function initGame() {
    setupEventListeners();
    resetGame();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('playAgainBtn').addEventListener('click', resetGame);
}

// Reset game to initial state
function resetGame() {
    gameState.words = [];
    gameState.wordPositions = [];
    gameState.selectedWordIndex = null;
    gameState.matchedPositions = [];
    gameState.matchCount = 0;
    gameState.gamePhase = 'start';
    
    // Clear all game elements
    document.getElementById('wordsGrid').innerHTML = '';
    document.getElementById('hiddenWordsGrid').innerHTML = '';
    document.getElementById('speakersGrid').innerHTML = '';
    
    // Hide all game containers
    document.getElementById('wordsDisplayContainer').style.display = 'none';
    document.getElementById('hiddenWordsContainer').style.display = 'none';
    document.getElementById('speakersContainer').style.display = 'none';
    
    // Clear feedback
    const feedbackEl = document.getElementById('feedback');
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback hidden';
    
    // Reset match count display
    document.getElementById('matchCount').textContent = '0 / 5';
    
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    
    // Show start screen, hide others
    document.getElementById('startScreen').style.display = 'block';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('winScreen').style.display = 'none';
}

// Start the game
function startGame() {
    gameState.gamePhase = 'showing';
    
    // Clear any previous game elements
    document.getElementById('wordsGrid').innerHTML = '';
    document.getElementById('hiddenWordsGrid').innerHTML = '';
    document.getElementById('speakersGrid').innerHTML = '';
    
    // Hide all game containers initially
    document.getElementById('wordsDisplayContainer').style.display = 'none';
    document.getElementById('hiddenWordsContainer').style.display = 'none';
    document.getElementById('speakersContainer').style.display = 'none';
    
    // Clear feedback
    const feedbackEl = document.getElementById('feedback');
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback hidden';
    
    // Reset match count
    document.getElementById('matchCount').textContent = '0 / 5';
    
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    
    // Hide start screen, show game screen
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    // Select 5 random words
    selectWords();
    
    // Display words
    displayWords();
    
    // After 3 seconds, hide words and show hidden positions
    setTimeout(() => {
        hideWords();
    }, 3000);
}

// Get all words from active grade levels
function getAllActiveWords() {
    let allWords = [];
    gameState.activeGrades.forEach(grade => {
        if (wordPools[grade]) {
            allWords = allWords.concat(wordPools[grade]);
        }
    });
    // Remove duplicates
    return [...new Set(allWords)];
}

// Select 5 random words
function selectWords() {
    const allWords = getAllActiveWords();
    const selected = [];
    
    // Select 5 unique words
    while (selected.length < 5 && allWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * allWords.length);
        const word = allWords.splice(randomIndex, 1)[0];
        selected.push(word);
    }
    
    gameState.words = selected;
    // Create position mapping (word index -> position index)
    gameState.wordPositions = [0, 1, 2, 3, 4];
}

// Display words
function displayWords() {
    const wordsGrid = document.getElementById('wordsGrid');
    wordsGrid.innerHTML = '';
    
    gameState.words.forEach((word, index) => {
        const wordCard = document.createElement('div');
        wordCard.className = 'word-card';
        wordCard.textContent = word;
        wordsGrid.appendChild(wordCard);
    });
    
    document.getElementById('wordsDisplayContainer').style.display = 'block';
}

// Hide words and show hidden positions
function hideWords() {
    gameState.gamePhase = 'hidden';
    
    // Hide words display
    document.getElementById('wordsDisplayContainer').style.display = 'none';
    
    // Show hidden words container
    const hiddenWordsGrid = document.getElementById('hiddenWordsGrid');
    hiddenWordsGrid.innerHTML = '';
    
    // Create 5 hidden positions
    for (let i = 0; i < 5; i++) {
        const hiddenCard = document.createElement('div');
        hiddenCard.className = 'hidden-word-card';
        hiddenCard.dataset.position = i;
        hiddenCard.addEventListener('click', () => selectPosition(i));
        hiddenWordsGrid.appendChild(hiddenCard);
    }
    
    document.getElementById('hiddenWordsContainer').style.display = 'block';
    
    // Show speaker buttons
    createSpeakers();
    document.getElementById('speakersContainer').style.display = 'block';
}

// Create speaker buttons
function createSpeakers() {
    const speakersGrid = document.getElementById('speakersGrid');
    speakersGrid.innerHTML = '';
    
    // Shuffle word indices for speakers (so they're not in order)
    const shuffledIndices = shuffleArray([...gameState.wordPositions]);
    
    shuffledIndices.forEach((wordIndex) => {
        const speakerBtn = document.createElement('button');
        speakerBtn.className = 'speaker-btn';
        speakerBtn.innerHTML = '🔊';
        speakerBtn.dataset.wordIndex = wordIndex;
        speakerBtn.addEventListener('click', (e) => playWord(wordIndex, e));
        speakersGrid.appendChild(speakerBtn);
    });
}

// Shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Play word using Web Speech API
function playWord(wordIndex, event) {
    const word = gameState.words[wordIndex];
    
    // Highlight the selected speaker
    const speakers = document.querySelectorAll('.speaker-btn');
    speakers.forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Set selected word
    gameState.selectedWordIndex = wordIndex;
    
    // Use Web Speech API to speak the word
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.8; // Slightly slower for clarity
        utterance.pitch = 1.2; // Slightly higher pitch for kid-friendly voice
        window.speechSynthesis.speak(utterance);
    }
    
    // Update feedback
    showFeedback(`Listen: "${word}"`, 'info');
}

// Select a position to match
function selectPosition(position) {
    if (gameState.selectedWordIndex === null) {
        showFeedback('Please click a speaker first!', 'warning');
        return;
    }
    
    if (gameState.matchedPositions.includes(position)) {
        showFeedback('This position is already matched!', 'warning');
        return;
    }
    
    const wordIndex = gameState.selectedWordIndex;
    const correctPosition = gameState.wordPositions[wordIndex];
    
    if (position === correctPosition) {
        // Correct match!
        gameState.matchedPositions.push(position);
        gameState.matchCount++;
        
        // Show the word in the matched position
        const hiddenCard = document.querySelector(`[data-position="${position}"]`);
        hiddenCard.textContent = gameState.words[wordIndex];
        hiddenCard.classList.add('matched');
        hiddenCard.style.pointerEvents = 'none';
        
        // Remove the matched speaker
        const speakerBtn = document.querySelector(`[data-word-index="${wordIndex}"]`);
        if (speakerBtn) {
            speakerBtn.style.display = 'none';
        }
        
        // Reset selection
        gameState.selectedWordIndex = null;
        document.querySelectorAll('.speaker-btn').forEach(btn => btn.classList.remove('active'));
        
        showFeedback('🎉 Correct!', 'correct');
        updateMatchCount();
        
        // Check win condition
        if (gameState.matchCount === 5) {
            setTimeout(() => {
                showWinScreen();
            }, 1000);
        }
    } else {
        // Wrong match
        showFeedback('❌ Try again!', 'incorrect');
        // Reset selection after a moment
        setTimeout(() => {
            gameState.selectedWordIndex = null;
            document.querySelectorAll('.speaker-btn').forEach(btn => btn.classList.remove('active'));
        }, 1000);
    }
}

// Show feedback message
function showFeedback(message, type) {
    const feedbackEl = document.getElementById('feedback');
    feedbackEl.textContent = message;
    feedbackEl.className = `feedback ${type}`;
    
    // Clear feedback after 2 seconds
    setTimeout(() => {
        feedbackEl.className = 'feedback hidden';
    }, 2000);
}

// Update match count display
function updateMatchCount() {
    document.getElementById('matchCount').textContent = `${gameState.matchCount} / 5`;
}

// Show win screen
function showWinScreen() {
    gameState.gamePhase = 'won';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('winScreen').style.display = 'block';
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);

