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
    bingoCard: [], // 5x5 array of words (or 'FREE' for center)
    markedCells: [], // Array of marked cell positions [row, col]
    currentWord: '', // Currently called word
    activeGrades: ['prek', 'k', '1st', '2nd'], // Default active grades
    gameWon: false,
    score: 1000, // Starting score
    scoreTimer: null // Timer for decreasing score
};

// Initialize the game
function initGame() {
    setupEventListeners();
    createBingoCard();
    loadLeaderboard();
    updateDisplay();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('callWordBtn').addEventListener('click', callWord);
    document.getElementById('repeatBtn').addEventListener('click', repeatWord);
    document.getElementById('repeatSlowBtn').addEventListener('click', repeatWordSlow);
    document.getElementById('playAgainBtn').addEventListener('click', resetGame);
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

// Create the bingo card (5x5 grid)
function createBingoCard() {
    const allWords = getAllActiveWords();
    const selectedWords = [];
    
    // Select 24 unique words (25 cells - 1 FREE = 24 words)
    while (selectedWords.length < 24 && allWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * allWords.length);
        const word = allWords.splice(randomIndex, 1)[0];
        selectedWords.push(word);
    }
    
    // Shuffle the selected words
    const shuffledWords = shuffleArray(selectedWords);
    
    // Create 5x5 grid
    gameState.bingoCard = [];
    let wordIndex = 0;
    
    for (let row = 0; row < 5; row++) {
        gameState.bingoCard[row] = [];
        for (let col = 0; col < 5; col++) {
            // Center cell (row 2, col 2) is FREE
            if (row === 2 && col === 2) {
                gameState.bingoCard[row][col] = 'FREE';
            } else {
                gameState.bingoCard[row][col] = shuffledWords[wordIndex];
                wordIndex++;
            }
        }
    }
    
    // Render the card
    renderBingoCard();
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

// Render the bingo card to the DOM
function renderBingoCard() {
    const bingoCard = document.getElementById('bingoCard');
    bingoCard.innerHTML = '';
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const cell = document.createElement('div');
            cell.className = 'bingo-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const word = gameState.bingoCard[row][col];
            if (word === 'FREE') {
                cell.textContent = 'FREE';
                cell.classList.add('free-cell');
                cell.classList.add('marked'); // FREE is always marked
                // Mark FREE cell
                if (!isCellMarked(row, col)) {
                    gameState.markedCells.push([row, col]);
                }
            } else {
                cell.textContent = word;
                cell.addEventListener('click', () => handleCellClick(row, col));
            }
            
            bingoCard.appendChild(cell);
        }
    }
    
    // Update marked cells visually
    updateMarkedCells();
}

// Handle cell click
function handleCellClick(row, col) {
    if (gameState.gameWon) return;
    
    const word = gameState.bingoCard[row][col];
    
    // Check if this word matches the current called word
    if (gameState.currentWord && word === gameState.currentWord) {
        // Mark the cell
        if (!isCellMarked(row, col)) {
            gameState.markedCells.push([row, col]);
            updateMarkedCells();
            updateDisplay();
            showFeedback('✅ Correct!', 'correct');
            
            // Stop the timer when correct word is guessed
            stopScoreTimer();
            
            // Clear current word and re-enable the button
            gameState.currentWord = '';
            document.getElementById('currentWord').textContent = 'Click "Call Word" for next word!';
            const callWordBtn = document.getElementById('callWordBtn');
            callWordBtn.disabled = false;
            callWordBtn.classList.remove('disabled');
            
            // Disable repeat buttons when word is cleared
            const repeatBtn = document.getElementById('repeatBtn');
            const repeatSlowBtn = document.getElementById('repeatSlowBtn');
            repeatBtn.disabled = true;
            repeatBtn.classList.add('disabled');
            repeatSlowBtn.disabled = true;
            repeatSlowBtn.classList.add('disabled');
            
            // Check for win
            if (checkWin()) {
                gameState.gameWon = true;
                stopScoreTimer();
                saveScoreToLeaderboard(gameState.score);
                setTimeout(() => {
                    showWinScreen();
                }, 500);
            }
        } else {
            showFeedback('This word is already marked!', 'warning');
        }
    } else if (gameState.currentWord) {
        // Wrong guess - subtract 100 points
        gameState.score = Math.max(0, gameState.score - 100);
        updateDisplay();
        showFeedback('❌ That\'s not the right word! -100 points', 'incorrect');
        
        // Play error sound
        playErrorSound();
        
        // Make the cell turn red temporarily
        const clickedCell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (clickedCell && !clickedCell.classList.contains('marked') && !clickedCell.classList.contains('free-cell')) {
            clickedCell.classList.add('wrong');
            setTimeout(() => {
                clickedCell.classList.remove('wrong');
            }, 800);
        }
    } else {
        showFeedback('Please call a word first!', 'warning');
    }
}

// Check if a cell is marked
function isCellMarked(row, col) {
    return gameState.markedCells.some(([r, c]) => r === row && c === col);
}

// Update visual state of marked cells
function updateMarkedCells() {
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (isCellMarked(row, col)) {
            cell.classList.add('marked');
        } else {
            cell.classList.remove('marked');
        }
    });
}

// Call a random word from the bingo card
function callWord() {
    if (gameState.gameWon) return;
    
    // Get all words from the card (excluding FREE and already marked words)
    const availableWords = [];
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const word = gameState.bingoCard[row][col];
            if (word !== 'FREE' && !isCellMarked(row, col)) {
                availableWords.push(word);
            }
        }
    }
    
    if (availableWords.length === 0) {
        showFeedback('All words have been called!', 'info');
        return;
    }
    
    // Select a random word from available words
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    gameState.currentWord = availableWords[randomIndex];
    
    // Don't display the word - only show generic message
    document.getElementById('currentWord').textContent = 'Listen carefully...';
    
    // Speak the word using Web Speech API
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(gameState.currentWord);
        utterance.rate = 0.8;
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
    }
    
    // Don't show the word in feedback - just indicate a word was called
    showFeedback('Word called! Find it on your card!', 'info');
    
    // Disable the button until player selects the correct word
    const callWordBtn = document.getElementById('callWordBtn');
    callWordBtn.disabled = true;
    callWordBtn.classList.add('disabled');
    
    // Enable repeat buttons when a word is called
    const repeatBtn = document.getElementById('repeatBtn');
    const repeatSlowBtn = document.getElementById('repeatSlowBtn');
    repeatBtn.disabled = false;
    repeatBtn.classList.remove('disabled');
    repeatSlowBtn.disabled = false;
    repeatSlowBtn.classList.remove('disabled');
    
    // Start/restart the score timer when a new word is called
    startScoreTimer();
    
    // Clear any wrong cell highlights
    document.querySelectorAll('.bingo-cell.wrong').forEach(cell => {
        cell.classList.remove('wrong');
    });
}

// Repeat the current word at normal speed
function repeatWord() {
    if (!gameState.currentWord || gameState.gameWon) return;
    
    // Speak the word using Web Speech API at normal speed
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(gameState.currentWord);
        utterance.rate = 0.8; // Same as original call
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
    }
}

// Repeat the current word at 1/2x speed (slower)
function repeatWordSlow() {
    if (!gameState.currentWord || gameState.gameWon) return;
    
    // Speak the word using Web Speech API at half speed
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(gameState.currentWord);
        utterance.rate = 0.4; // Half of 0.8
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
    }
}

// Play error sound effect
function playErrorSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a harsh error sound (low frequency, quick)
        oscillator.frequency.value = 200;
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        // Fallback if Web Audio API is not available
        console.log('Audio not available');
    }
}

// Check for win condition (5 in a row, column, or diagonal)
function checkWin() {
    // Check rows
    for (let row = 0; row < 5; row++) {
        let markedCount = 0;
        for (let col = 0; col < 5; col++) {
            if (isCellMarked(row, col)) {
                markedCount++;
            }
        }
        if (markedCount === 5) {
            return true; // Row win
        }
    }
    
    // Check columns
    for (let col = 0; col < 5; col++) {
        let markedCount = 0;
        for (let row = 0; row < 5; row++) {
            if (isCellMarked(row, col)) {
                markedCount++;
            }
        }
        if (markedCount === 5) {
            return true; // Column win
        }
    }
    
    // Check main diagonal (top-left to bottom-right)
    let markedCount = 0;
    for (let i = 0; i < 5; i++) {
        if (isCellMarked(i, i)) {
            markedCount++;
        }
    }
    if (markedCount === 5) {
        return true; // Main diagonal win
    }
    
    // Check anti-diagonal (top-right to bottom-left)
    markedCount = 0;
    for (let i = 0; i < 5; i++) {
        if (isCellMarked(i, 4 - i)) {
            markedCount++;
        }
    }
    if (markedCount === 5) {
        return true; // Anti-diagonal win
    }
    
    return false;
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

// Start score timer (decreases score by 20 every second)
// Only runs when there's an active currentWord
function startScoreTimer() {
    // Stop any existing timer first
    if (gameState.scoreTimer) {
        clearInterval(gameState.scoreTimer);
    }
    gameState.scoreTimer = setInterval(() => {
        // Only decrease score if there's an active word and game isn't won
        if (gameState.currentWord && !gameState.gameWon) {
            gameState.score = Math.max(0, gameState.score - 20);
            updateDisplay();
        }
    }, 1000);
}

// Stop score timer
function stopScoreTimer() {
    if (gameState.scoreTimer) {
        clearInterval(gameState.scoreTimer);
        gameState.scoreTimer = null;
    }
}

// Update display
function updateDisplay() {
    // Update score
    document.getElementById('currentScore').textContent = gameState.score;
    
    if (gameState.gameWon) {
        document.getElementById('gameStatus').textContent = 'BINGO!';
    } else {
        const markedCount = gameState.markedCells.length;
        document.getElementById('gameStatus').textContent = `${markedCount} words marked`;
    }
}

// Show win screen
function showWinScreen() {
    const scoreText = document.getElementById('finalScore');
    if (scoreText) {
        scoreText.textContent = `Final Score: ${gameState.score} points`;
    }
    document.getElementById('winScreen').style.display = 'block';
    updateDisplay();
    updateLeaderboard();
}

// Save score to leaderboard
function saveScoreToLeaderboard(score) {
    let leaderboard = JSON.parse(sessionStorage.getItem('wordBingoLeaderboard') || '[]');
    leaderboard.push({
        score: score,
        date: new Date().toLocaleString()
    });
    // Sort by score (highest first) and keep top 10
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    sessionStorage.setItem('wordBingoLeaderboard', JSON.stringify(leaderboard));
}

// Load leaderboard
function loadLeaderboard() {
    updateLeaderboard();
}

// Update leaderboard display
function updateLeaderboard() {
    const leaderboard = JSON.parse(sessionStorage.getItem('wordBingoLeaderboard') || '[]');
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<div class="leaderboard-empty">No scores yet!</div>';
        return;
    }
    
    leaderboard.forEach((entry, index) => {
        const entryEl = document.createElement('div');
        entryEl.className = 'leaderboard-entry';
        entryEl.innerHTML = `
            <span class="leaderboard-rank">${index + 1}.</span>
            <span class="leaderboard-score">${entry.score}</span>
        `;
        leaderboardList.appendChild(entryEl);
    });
}

// Reset game
function resetGame() {
    gameState.markedCells = [];
    gameState.currentWord = '';
    gameState.gameWon = false;
    gameState.score = 1000; // Reset to starting score
    stopScoreTimer();
    
    // Clear feedback
    const feedbackEl = document.getElementById('feedback');
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback hidden';
    
    // Reset current word display
    document.getElementById('currentWord').textContent = 'Click "Call Word" to start!';
    
    // Re-enable the call word button
    const callWordBtn = document.getElementById('callWordBtn');
    callWordBtn.disabled = false;
    callWordBtn.classList.remove('disabled');
    
    // Disable repeat buttons
    const repeatBtn = document.getElementById('repeatBtn');
    const repeatSlowBtn = document.getElementById('repeatSlowBtn');
    repeatBtn.disabled = true;
    repeatBtn.classList.add('disabled');
    repeatSlowBtn.disabled = true;
    repeatSlowBtn.classList.add('disabled');
    
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    
    // Hide win screen
    document.getElementById('winScreen').style.display = 'none';
    
    // Create new bingo card
    createBingoCard();
    updateDisplay();
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);

