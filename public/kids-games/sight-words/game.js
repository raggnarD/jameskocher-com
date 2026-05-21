// 1st Grade Sight Words
const sightWords = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
    'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
    'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'an', 'as',
    'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it',
    'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'we'
];

// Game state
const gameState = {
    currentWord: '',
    currentWordLetters: [],
    selectedLetters: [],
    availableLetters: [],
    featherCount: 0,
    targetFeathers: 10,
    correctCount: 0,
    attemptCount: 0,
    foodsUnlocked: 0,
    totalFoods: 5
};

// Initialize the game
function initGame() {
    selectNewWord();
    setupEventListeners();
    updateDisplay();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('submitSpellingBtn').addEventListener('click', submitSpelling);
    document.getElementById('clearSpellingBtn').addEventListener('click', clearSpelling);
}

// Select a new word
function selectNewWord() {
    // Select random word
    const randomIndex = Math.floor(Math.random() * sightWords.length);
    gameState.currentWord = sightWords[randomIndex];
    
    // Create scrambled letter array
    gameState.currentWordLetters = gameState.currentWord.split('');
    gameState.availableLetters = [...gameState.currentWordLetters];
    
    // Add some extra random letters to make it more challenging
    const extraLetters = Math.floor(Math.random() * 3) + 1; // 1-3 extra letters
    for (let i = 0; i < extraLetters; i++) {
        const randomLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        gameState.availableLetters.push(randomLetter);
    }
    
    // Shuffle the letters
    gameState.availableLetters = shuffleArray([...gameState.availableLetters]);
    
    // Reset selected letters
    gameState.selectedLetters = [];
    
    // Display word and create letter buttons
    displayWord();
    createLetterButtons();
    updateSpellingDisplay();
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

// Display the word (with blanks or hint)
function displayWord() {
    const wordDisplay = document.getElementById('wordDisplay');
    const wordHint = document.getElementById('wordHint');
    
    // Show word with some letters hidden for hint
    // For 2-letter words: show only first letter
    // For 3-letter words: show first and last letter
    // For 4+ letter words: show first and last letter
    let displayWord = '';
    const wordLength = gameState.currentWord.length;
    
    if (wordLength === 2) {
        // For 2-letter words, only show first letter
        displayWord = gameState.currentWord[0] + ' _';
    } else if (wordLength === 3) {
        // For 3-letter words, show first letter only
        displayWord = gameState.currentWord[0] + ' _ _';
    } else {
        // For 4+ letter words, show first and last letter
        for (let i = 0; i < wordLength; i++) {
            if (i === 0 || i === wordLength - 1) {
                displayWord += gameState.currentWord[i] + ' ';
            } else {
                displayWord += '_ ';
            }
        }
        displayWord = displayWord.trim();
    }
    
    wordDisplay.textContent = displayWord;
    wordHint.textContent = `Hint: This word has ${wordLength} letters`;
}

// Create letter buttons
function createLetterButtons() {
    const container = document.getElementById('letterButtons');
    container.innerHTML = '';
    
    gameState.availableLetters.forEach((letter, index) => {
        const btn = document.createElement('button');
        btn.className = 'letter-btn';
        btn.textContent = letter.toUpperCase();
        btn.dataset.letter = letter;
        btn.dataset.index = index;
        btn.addEventListener('click', () => selectLetter(letter, index));
        container.appendChild(btn);
    });
    
    // Reset selected letters
    gameState.selectedLetters = [];
}

// Select a letter
function selectLetter(letter, index) {
    const btn = document.querySelector(`[data-index="${index}"]`);
    if (btn && !btn.classList.contains('used')) {
        // Allow any letter to be selected - validation happens on submit
        gameState.selectedLetters.push(letter);
        btn.classList.add('used');
        btn.disabled = true;
        updateSpellingDisplay();
    }
}

// Update spelling display
function updateSpellingDisplay() {
    const spellingWord = document.getElementById('spellingWord');
    spellingWord.textContent = gameState.selectedLetters.join(' ').toUpperCase() || '...';
}

// Clear spelling
function clearSpelling() {
    gameState.selectedLetters = [];
    const buttons = document.querySelectorAll('.letter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('used');
        btn.disabled = false;
    });
    updateSpellingDisplay();
}

// Submit spelling
function submitSpelling() {
    if (gameState.selectedLetters.length === 0) return;
    
    gameState.attemptCount++;
    const userSpelling = gameState.selectedLetters.join('');
    const isCorrect = userSpelling.toLowerCase() === gameState.currentWord.toLowerCase();
    
    const feedbackEl = document.getElementById('feedback');
    
    if (isCorrect) {
        feedbackEl.textContent = '🎉 Correct! You spelled it right!';
        feedbackEl.className = 'feedback correct';
        gameState.correctCount++;
        collectFeather();
        unlockFood();
    } else {
        feedbackEl.textContent = `❌ Not quite! The word is "${gameState.currentWord}". Try again!`;
        feedbackEl.className = 'feedback incorrect';
    }
    
    // Hide feedback after 3 seconds and get new word
    setTimeout(() => {
        feedbackEl.className = 'feedback hidden';
        if (isCorrect) {
            setTimeout(() => {
                selectNewWord();
                clearSpelling();
            }, 500);
        } else {
            clearSpelling();
        }
    }, 3000);
    
    updateDisplay();
    checkWinCondition();
}

// Collect a feather
function collectFeather() {
    if (gameState.featherCount < gameState.targetFeathers) {
        gameState.featherCount++;
        addFeatherVisual();
    }
}

// Add feather visual
function addFeatherVisual() {
    const container = document.getElementById('feathersContainer');
    const feather = document.createElement('div');
    feather.className = 'feather';
    feather.textContent = '🪶';
    container.appendChild(feather);
}

// Unlock food
function unlockFood() {
    // Unlock food based on feathers collected (every 2 feathers = 1 food)
    const foodsShouldBeUnlocked = Math.floor(gameState.featherCount / 2);
    if (foodsShouldBeUnlocked > gameState.foodsUnlocked && foodsShouldBeUnlocked <= gameState.totalFoods) {
        gameState.foodsUnlocked = foodsShouldBeUnlocked;
        updateFoodDisplay();
    }
}

// Update food display
function updateFoodDisplay() {
    const foodItems = document.querySelectorAll('.food-item');
    const foodOrder = ['turkey', 'pie', 'corn', 'bread', 'potato'];
    
    foodItems.forEach((item, index) => {
        if (index < gameState.foodsUnlocked) {
            item.classList.remove('locked');
            item.classList.add('unlocked');
        }
    });
    
    // Update progress bar
    const progress = (gameState.foodsUnlocked / gameState.totalFoods) * 100;
    document.getElementById('foodProgressFill').style.width = `${progress}%`;
    document.getElementById('foodProgressText').textContent = `${gameState.foodsUnlocked} / ${gameState.totalFoods} foods ready`;
}

// Update display
function updateDisplay() {
    document.getElementById('featherCount').textContent = `${gameState.featherCount} / ${gameState.targetFeathers}`;
    document.getElementById('correctCount').textContent = gameState.correctCount;
    document.getElementById('attemptCount').textContent = gameState.attemptCount;
    updateFoodDisplay();
}

// Check win condition
function checkWinCondition() {
    if (gameState.featherCount >= gameState.targetFeathers && gameState.foodsUnlocked >= gameState.totalFoods) {
        setTimeout(() => {
            showWinMessage();
        }, 1000);
    }
}

// Show win message
function showWinMessage() {
    const winMessage = document.getElementById('winMessage');
    winMessage.classList.add('show');
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);

