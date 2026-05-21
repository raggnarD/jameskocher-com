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
    currentWord: '',
    correctAnswer: '',
    wordOptions: [],
    correctCount: 0,
    attemptCount: 0,
    isPlaying: false,
    activeGrades: ['prek', 'k', '1st', '2nd'] // All grades active by default
};

// Initialize the game
function initGame() {
    setupEventListeners();
    updateWordCount();
    generateNewQuestion();
    updateDisplay();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('playAudioBtn').addEventListener('click', playAudio);
    
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
            // Add a visual shake animation to the badge
            badge.style.animation = 'shake 0.5s ease';
            setTimeout(() => {
                badge.style.animation = '';
            }, 500);
            return; // Don't allow the action
        }
        
        // Remove from active grades
        gameState.activeGrades.splice(index, 1);
        badge.classList.remove('active');
    } else {
        // Add to active grades
        gameState.activeGrades.push(grade);
        badge.classList.add('active');
    }
    
    // Update word count display
    updateWordCount();
    
    // Generate new question with updated word pool
    updateStatus('Grade levels updated!');
    generateNewQuestion();
}

// Update word count display
function updateWordCount() {
    const activeWords = getAllActiveWords().length;
    const totalWords = getTotalWordCount();
    
    const wordCountDisplay = document.getElementById('wordCountDisplay');
    if (wordCountDisplay) {
        wordCountDisplay.textContent = `${activeWords} / ${totalWords} words active`;
        // Update color based on whether any grades are active
        wordCountDisplay.style.color = gameState.activeGrades.length > 0 ? '#27ae60' : '#e74c3c';
    }
}

// Generate a new question
function generateNewQuestion() {
    const allWords = getAllActiveWords();
    
    if (allWords.length === 0) {
        console.error('No words available');
        updateStatus('⚠️ No words available! Please enable at least one grade level.');
        // Hide word options if no words available
        const wordOptionsContainer = document.getElementById('wordOptions');
        wordOptionsContainer.innerHTML = '';
        wordOptionsContainer.style.display = 'none';
        return;
    }
    
    // Select random word
    const randomIndex = Math.floor(Math.random() * allWords.length);
    gameState.correctAnswer = allWords[randomIndex];
    gameState.currentWord = gameState.correctAnswer;
    
    // Generate wrong options (3-5 total options including correct one)
    const numOptions = Math.floor(Math.random() * 3) + 3; // 3-5 options
    const wrongOptions = [];
    const usedWords = new Set([gameState.correctAnswer]);
    
    while (wrongOptions.length < numOptions - 1) {
        const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
        if (!usedWords.has(randomWord)) {
            wrongOptions.push(randomWord);
            usedWords.add(randomWord);
        }
    }
    
    // Combine correct answer with wrong options and shuffle
    gameState.wordOptions = [gameState.correctAnswer, ...wrongOptions];
    gameState.wordOptions = shuffleArray(gameState.wordOptions);
    
    // Hide word options until audio is played
    const wordOptionsContainer = document.getElementById('wordOptions');
    wordOptionsContainer.innerHTML = '';
    wordOptionsContainer.style.display = 'none';
    
    // Clear feedback
    const feedbackEl = document.getElementById('feedback');
    feedbackEl.className = 'feedback hidden';
    feedbackEl.textContent = '';
    
    // Clear current word display
    document.getElementById('currentWordDisplay').textContent = '';
    
    // Update status
    updateStatus('Ready! Click "Listen to Word" to hear it.');
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

// Display word options
function displayWordOptions() {
    const container = document.getElementById('wordOptions');
    container.innerHTML = '';
    
    gameState.wordOptions.forEach((word, index) => {
        const option = document.createElement('div');
        option.className = 'word-option';
        option.textContent = word;
        option.dataset.word = word;
        option.addEventListener('click', () => selectWord(word, option));
        container.appendChild(option);
    });
    
    // Show the options container
    container.style.display = 'grid';
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

// Play audio using Web Speech API with better voice
function playAudio() {
    if (!gameState.currentWord) return;
    
    const btn = document.getElementById('playAudioBtn');
    btn.classList.add('playing');
    btn.disabled = true;
    
    // Use Web Speech API
    if ('speechSynthesis' in window) {
        // Load voices if not already loaded
        if (speechSynthesis.getVoices().length === 0) {
            speechSynthesis.onvoiceschanged = () => {
                playAudioWithVoice();
            };
        } else {
            playAudioWithVoice();
        }
    } else {
        // Fallback if Web Speech API not available
        alert('Audio not supported in this browser. The word is: ' + gameState.currentWord);
        btn.classList.remove('playing');
        btn.disabled = false;
        displayWordOptions();
        updateStatus('Select the word you heard!');
    }
    
    function playAudioWithVoice() {
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
            // Show word options after audio finishes
            displayWordOptions();
            updateStatus('Select the word you heard!');
        };
        
        utterance.onerror = () => {
            btn.classList.remove('playing');
            btn.disabled = false;
            alert('Audio playback failed. Please try again.');
            // Show word options even if audio failed
            displayWordOptions();
            updateStatus('Select the word you heard!');
        };
        
        speechSynthesis.speak(utterance);
        updateStatus('Playing audio...');
    }
}

// Select a word
function selectWord(word, element) {
    if (gameState.isPlaying) return;
    
    gameState.isPlaying = true;
    gameState.attemptCount++;
    
    const isCorrect = word.toLowerCase() === gameState.correctAnswer.toLowerCase();
    const feedbackEl = document.getElementById('feedback');
    const allOptions = document.querySelectorAll('.word-option');
    
    // Disable all options
    allOptions.forEach(opt => {
        opt.classList.add('disabled');
        if (opt.dataset.word === word) {
            if (isCorrect) {
                opt.classList.add('correct');
            } else {
                opt.classList.add('incorrect');
            }
        }
    });
    
    // Highlight correct answer if wrong
    if (!isCorrect) {
        allOptions.forEach(opt => {
            if (opt.dataset.word.toLowerCase() === gameState.correctAnswer.toLowerCase()) {
                opt.classList.add('correct');
            }
        });
    }
    
    // Show feedback
    if (isCorrect) {
        feedbackEl.textContent = '🎉 Correct! Great job!';
        feedbackEl.className = 'feedback correct';
        gameState.correctCount++;
        updateStatus('Excellent! You got it right!');
    } else {
        feedbackEl.textContent = `❌ Not quite! The word was "${gameState.correctAnswer}".`;
        feedbackEl.className = 'feedback incorrect';
        updateStatus(`The correct word was "${gameState.correctAnswer}".`);
    }
    
    // Show the word
    document.getElementById('currentWordDisplay').textContent = `Word: ${gameState.correctAnswer}`;
    
    // Update display
    updateDisplay();
    
    // Generate new question after delay
    setTimeout(() => {
        generateNewQuestion();
        gameState.isPlaying = false;
    }, 3000);
}

// Update display
function updateDisplay() {
    document.getElementById('correctCount').textContent = gameState.correctCount;
    document.getElementById('attemptCount').textContent = gameState.attemptCount;
    
    // Calculate accuracy
    const accuracy = gameState.attemptCount > 0 
        ? Math.round((gameState.correctCount / gameState.attemptCount) * 100) 
        : 0;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
}

// Update status
function updateStatus(message) {
    const statusText = document.querySelector('.status-text');
    if (statusText) {
        statusText.textContent = message;
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);

// Stop any ongoing speech when page is unloaded
window.addEventListener('beforeunload', () => {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
});

