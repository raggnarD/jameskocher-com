// Word pools by grade level (same as other games)
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
    currentWord: '',
    currentStep: 1,
    maxSteps: 10,
    stepProgress: 0, // Correct words in current step (need 2 to advance)
    wordsPerStep: 2,
    lives: 5,
    maxLives: 5,
    correctCount: 0,
    attemptCount: 0,
    activeGrades: ['prek', 'k', '1st', '2nd']
};

// Initialize the game
function initGame() {
    setupEventListeners();
    updateWordCount();
    createProgressPath();
    updateLivesDisplay();
    moveShark(); // Position shark at start
    generateNewWord();
    updateDisplay();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('playWordBtn').addEventListener('click', playWordAudio);
    document.getElementById('submitWordBtn').addEventListener('click', submitWord);
    document.getElementById('clearInputBtn').addEventListener('click', clearInput);
    document.getElementById('wordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitWord();
        }
    });
    
    // Setup grade level badge click handlers
    const gradeBadges = document.querySelectorAll('.grade-badge');
    gradeBadges.forEach(badge => {
        badge.addEventListener('click', () => toggleGradeLevel(badge.dataset.grade));
    });
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

// Get total unique word count across all grade levels
function getTotalWordCount() {
    let allWords = [];
    Object.keys(wordPools).forEach(grade => {
        allWords = allWords.concat(wordPools[grade]);
    });
    // Return unique count (removing duplicates)
    return [...new Set(allWords)].length;
}

// Toggle grade level on/off
function toggleGradeLevel(grade) {
    const index = gameState.activeGrades.indexOf(grade);
    const badge = document.querySelector(`[data-grade="${grade}"]`);
    
    if (index > -1) {
        // Trying to remove a grade level
        // Prevent removing the last active grade
        if (gameState.activeGrades.length === 1) {
            updateStatus('⚠️ You must keep at least one grade level active!');
            badge.style.animation = 'shake 0.5s ease';
            setTimeout(() => {
                badge.style.animation = '';
            }, 500);
            return;
        }
        
        gameState.activeGrades.splice(index, 1);
        badge.classList.remove('active');
    } else {
        gameState.activeGrades.push(grade);
        badge.classList.add('active');
    }
    
    updateWordCount();
    updateStatus('Grade levels updated!');
    generateNewWord();
}

// Update word count display
function updateWordCount() {
    const activeWords = getAllActiveWords().length;
    const totalWords = getTotalWordCount();
    
    const wordCountDisplay = document.getElementById('wordCountDisplay');
    if (wordCountDisplay) {
        wordCountDisplay.textContent = `${activeWords} / ${totalWords} words active`;
        wordCountDisplay.style.color = gameState.activeGrades.length > 0 ? '#27ae60' : '#e74c3c';
    }
}

// Create progress path with 10 steps
function createProgressPath() {
    const progressPath = document.getElementById('progressPath');
    progressPath.innerHTML = '';
    
    for (let i = 1; i <= gameState.maxSteps; i++) {
        const step = document.createElement('div');
        step.className = 'progress-step';
        step.textContent = i;
        step.dataset.step = i;
        if (i === 1) {
            step.classList.add('current');
        }
        progressPath.appendChild(step);
    }
}


// Update lives display
function updateLivesDisplay() {
    const livesDisplay = document.getElementById('livesDisplay');
    livesDisplay.innerHTML = '';
    
    for (let i = 0; i < gameState.maxLives; i++) {
        const life = document.createElement('div');
        life.className = 'life';
        life.textContent = '🦈';
        if (i >= gameState.lives) {
            life.classList.add('lost');
        }
        livesDisplay.appendChild(life);
    }
}

// Generate a new word
function generateNewWord() {
    const allWords = getAllActiveWords();
    
    if (allWords.length === 0) {
        updateStatus('⚠️ No words available! Please enable at least one grade level.');
        return;
    }
    
    // Select random word
    const randomIndex = Math.floor(Math.random() * allWords.length);
    gameState.currentWord = allWords[randomIndex];
    
    // Clear input and feedback
    clearInput();
    const feedbackEl = document.getElementById('feedback');
    feedbackEl.className = 'feedback hidden';
    feedbackEl.textContent = '';
    
    // Update hint
    document.getElementById('wordHint').textContent = 'Click the button to hear the word!';
}

// Get the best available voice for children
function getBestVoice() {
    if (!('speechSynthesis' in window)) return null;
    
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    
    // Prefer child-friendly or clear female voices
    const preferredVoices = [
        'Google US English', 'Microsoft Zira', 'Microsoft Mark',
        'Alex', 'Samantha', 'Victoria', 'Karen', 'Fiona'
    ];
    
    // Try to find a preferred voice
    for (const preferred of preferredVoices) {
        const voice = voices.find(v => v.name.includes(preferred));
        if (voice) return voice;
    }
    
    // Fallback: find a US English voice
    const usVoice = voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en'));
    if (usVoice) return usVoice;
    
    // Last resort: return first available voice
    return voices[0];
}

// Play word audio
function playWordAudio() {
    if (!gameState.currentWord) return;
    
    const btn = document.getElementById('playWordBtn');
    btn.classList.add('playing');
    btn.disabled = true;
    
    // Use Web Speech API with better voice
    if ('speechSynthesis' in window) {
        // Load voices if not already loaded
        if (speechSynthesis.getVoices().length === 0) {
            speechSynthesis.onvoiceschanged = () => {
                playWordAudioWithVoice();
            };
        } else {
            playWordAudioWithVoice();
        }
    } else {
        alert('Audio not supported in this browser. The word is: ' + gameState.currentWord);
        btn.classList.remove('playing');
        btn.disabled = false;
    }
    
    function playWordAudioWithVoice() {
        const utterance = new SpeechSynthesisUtterance(gameState.currentWord);
        const voice = getBestVoice();
        
        if (voice) {
            utterance.voice = voice;
        }
        
        utterance.rate = 0.75; // Slower for better clarity
        utterance.pitch = 1.1; // Slightly higher pitch (more child-friendly)
        utterance.volume = 1.0;
        utterance.lang = 'en-US';
        
        utterance.onend = () => {
            btn.classList.remove('playing');
            btn.disabled = false;
        };
        
        utterance.onerror = () => {
            btn.classList.remove('playing');
            btn.disabled = false;
            alert('Audio playback failed. Please try again.');
        };
        
        speechSynthesis.speak(utterance);
        updateStatus('Listen carefully and spell the word!');
    }
}

// Clear input
function clearInput() {
    document.getElementById('wordInput').value = '';
    document.getElementById('wordInput').focus();
}

// Submit word
function submitWord() {
    const input = document.getElementById('wordInput');
    const userSpelling = input.value.trim().toLowerCase();
    const correctWord = gameState.currentWord.toLowerCase();
    
    if (!userSpelling) {
        updateStatus('Please type a word!');
        return;
    }
    
    gameState.attemptCount++;
    const isCorrect = userSpelling === correctWord;
    const feedbackEl = document.getElementById('feedback');
    
    if (isCorrect) {
        feedbackEl.textContent = '🎉 Correct! Great job!';
        feedbackEl.className = 'feedback correct';
        gameState.correctCount++;
        gameState.stepProgress++;
        
        // Check if step is complete
        if (gameState.stepProgress >= gameState.wordsPerStep) {
            advanceStep();
        } else {
            updateStatus(`Correct! Need ${gameState.wordsPerStep - gameState.stepProgress} more to advance.`);
            setTimeout(() => {
                generateNewWord();
            }, 1500);
        }
    } else {
        feedbackEl.textContent = `❌ Wrong! The word was "${gameState.currentWord}". You lost a life!`;
        feedbackEl.className = 'feedback incorrect';
        gameState.lives--;
        updateLivesDisplay();
        
        // Check if game over
        if (gameState.lives <= 0) {
            setTimeout(() => {
                showGameOver();
            }, 2000);
        } else {
            updateStatus(`Incorrect! You have ${gameState.lives} lives left.`);
            setTimeout(() => {
                generateNewWord();
            }, 2000);
        }
    }
    
    updateDisplay();
}

// Advance to next step
function advanceStep() {
    gameState.currentStep++;
    gameState.stepProgress = 0;
    
    // Check if won (before moving shark)
    if (gameState.currentStep > gameState.maxSteps) {
        // Move shark to final position
        moveShark();
        setTimeout(() => {
            showWinMessage();
        }, 1000);
    } else {
        // Move shark
        moveShark();
        updateStatus(`Step ${gameState.currentStep - 1} complete! Moving to step ${gameState.currentStep}!`);
        setTimeout(() => {
            generateNewWord();
        }, 1500);
    }
}

// Move shark forward
function updateProgressPath() {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('current', 'completed');
        
        if (stepNum < gameState.currentStep) {
            step.classList.add('completed');
        } else if (stepNum === gameState.currentStep) {
            step.classList.add('current');
        }
    });
}

// Move shark forward
function moveShark() {
    const shark = document.getElementById('sharkCharacter');
    const progressPath = document.getElementById('progressPath');
    
    // Use setTimeout to ensure layout is calculated
    setTimeout(() => {
        const pathRect = progressPath.getBoundingClientRect();
        const containerRect = document.querySelector('.ocean-background').getBoundingClientRect();
        
        // Calculate position based on current step
        // Position shark to align with progress steps
        const stepElements = document.querySelectorAll('.progress-step');
        if (stepElements.length > 0 && gameState.currentStep <= stepElements.length) {
            const targetStep = stepElements[gameState.currentStep - 1];
            const stepRect = targetStep.getBoundingClientRect();
            const relativeLeft = stepRect.left - containerRect.left + (stepRect.width / 2) - 30;
            shark.style.left = `${Math.max(20, relativeLeft)}px`;
        }
    }, 100);
    
    updateProgressPath();
}

// Update display
function updateDisplay() {
    document.getElementById('currentStep').textContent = gameState.currentStep;
    document.getElementById('stepProgress').textContent = `${gameState.stepProgress} / ${gameState.wordsPerStep}`;
    document.getElementById('stepDisplay').textContent = `${gameState.currentStep} / ${gameState.maxSteps}`;
    document.getElementById('correctCount').textContent = gameState.correctCount;
    document.getElementById('attemptCount').textContent = gameState.attemptCount;
}

// Update status
function updateStatus(message) {
    const statusText = document.querySelector('.status-text');
    if (statusText) {
        statusText.textContent = message;
    }
}

// Show win message
function showWinMessage() {
    const winMessage = document.getElementById('winMessage');
    winMessage.classList.add('show');
}

// Show game over message
function showGameOver() {
    const gameOverMessage = document.getElementById('gameOverMessage');
    document.getElementById('finalStep').textContent = gameState.currentStep;
    gameOverMessage.classList.add('show');
}

// Add shake animation to CSS if not present
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);

// Stop any ongoing speech when page is unloaded
window.addEventListener('beforeunload', () => {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
});

