// Game state
const gameState = {
    currentPosition: 0,
    targetPosition: 20, // Number of squares on the board
    dice1: 0,
    dice2: 0,
    currentAnswer: 0,
    correctCount: 0,
    wrongCount: 0,
    currentProblem: null,
    canRoll: true
};

// Initialize the game
function initGame() {
    createBoard();
    createNumberButtons();
    setupEventListeners();
    updateDisplay();
    // Initialize dog position after board is created
    setTimeout(() => {
        updateDogPosition();
    }, 100);
}

// Create the game board squares
function createBoard() {
    const board = document.getElementById('gameBoard');
    board.innerHTML = '';
    
    for (let i = 0; i <= gameState.targetPosition; i++) {
        const square = document.createElement('div');
        square.className = 'board-square';
        square.textContent = i;
        if (i === 0) {
            square.classList.add('current');
        }
        if (i === gameState.targetPosition) {
            square.classList.add('goal');
        }
        board.appendChild(square);
    }
}

// Create number buttons (0-36)
function createNumberButtons() {
    const container = document.getElementById('numberButtons');
    container.innerHTML = '';
    
    for (let i = 0; i <= 36; i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn';
        btn.textContent = i;
        btn.addEventListener('click', () => selectNumber(i));
        container.appendChild(btn);
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('rollDiceBtn').addEventListener('click', rollDice);
    document.getElementById('submitBtn').addEventListener('click', submitAnswer);
    document.getElementById('clearBtn').addEventListener('click', clearAnswer);
}

// Roll the dice
function rollDice() {
    if (!gameState.canRoll) return;
    
    gameState.canRoll = false;
    const dice1El = document.getElementById('dice1');
    const dice2El = document.getElementById('dice2');
    
    // Add rolling animation
    dice1El.classList.add('rolling');
    dice2El.classList.add('rolling');
    
    // Roll dice after animation
    setTimeout(() => {
        gameState.dice1 = Math.floor(Math.random() * 6) + 1;
        gameState.dice2 = Math.floor(Math.random() * 6) + 1;
        
        dice1El.querySelector('.dice-face').textContent = gameState.dice1;
        dice2El.querySelector('.dice-face').textContent = gameState.dice2;
        
        dice1El.classList.remove('rolling');
        dice2El.classList.remove('rolling');
        
        // Update dice results display in sidebar
        document.getElementById('diceResultValues').textContent = `${gameState.dice1} + ${gameState.dice2}`;
        
        // Generate and display math problem
        generateMathProblem();
        document.getElementById('mathProblemContainer').style.display = 'block';
        gameState.currentAnswer = 0;
        updateAnswerDisplay();
    }, 500);
}

// Generate a math problem based on dice values
function generateMathProblem() {
    const problemTypes = ['addition', 'subtraction', 'multiplication', 'division', 'algebra'];
    const randomType = problemTypes[Math.floor(Math.random() * problemTypes.length)];
    
    let problem, answer;
    const num1 = gameState.dice1;
    const num2 = gameState.dice2;
    
    switch (randomType) {
        case 'addition':
            problem = `${num1} + ${num2} = ?`;
            answer = num1 + num2;
            break;
            
        case 'subtraction':
            // Ensure positive result for 1st grade level
            const larger = Math.max(num1, num2);
            const smaller = Math.min(num1, num2);
            problem = `${larger} - ${smaller} = ?`;
            answer = larger - smaller;
            break;
            
        case 'multiplication':
            problem = `${num1} × ${num2} = ?`;
            answer = num1 * num2;
            break;
            
        case 'division':
            // Ensure whole number division
            const product = num1 * num2;
            problem = `${product} ÷ ${num1} = ?`;
            answer = num2;
            break;
            
        case 'algebra':
            // Basic algebra: various forms
            const algebraForm = Math.floor(Math.random() * 4);
            if (algebraForm === 0) {
                // ? + num1 = sum
                const sum = num1 + num2;
                problem = `? + ${num1} = ${sum}`;
                answer = num2;
            } else if (algebraForm === 1) {
                // num1 + ? = sum
                const sum = num1 + num2;
                problem = `${num1} + ? = ${sum}`;
                answer = num2;
            } else if (algebraForm === 2) {
                // ? - num1 = difference (ensure positive)
                const larger = Math.max(num1, num2);
                const smaller = Math.min(num1, num2);
                const diff = larger - smaller;
                problem = `? - ${smaller} = ${diff}`;
                answer = larger;
            } else {
                // larger - ? = difference
                const larger = Math.max(num1, num2);
                const smaller = Math.min(num1, num2);
                const diff = larger - smaller;
                problem = `${larger} - ? = ${diff}`;
                answer = smaller;
            }
            break;
    }
    
    gameState.currentProblem = { problem, answer, type: randomType };
    document.getElementById('mathProblem').textContent = problem;
}

// Select a number for the answer
function selectNumber(num) {
    gameState.currentAnswer = num;
    updateAnswerDisplay();
}

// Update answer display
function updateAnswerDisplay() {
    document.getElementById('answerValue').textContent = gameState.currentAnswer;
}

// Clear the answer
function clearAnswer() {
    gameState.currentAnswer = 0;
    updateAnswerDisplay();
}

// Submit answer
function submitAnswer() {
    if (gameState.currentProblem === null) return;
    
    const isCorrect = gameState.currentAnswer === gameState.currentProblem.answer;
    const feedbackEl = document.getElementById('feedback');
    
    if (isCorrect) {
        feedbackEl.textContent = '🎉 Correct! Moving forward!';
        feedbackEl.className = 'feedback correct';
        gameState.correctCount++;
        moveCharacter(1);
    } else {
        feedbackEl.textContent = `❌ Wrong! The answer is ${gameState.currentProblem.answer}. Moving back.`;
        feedbackEl.className = 'feedback incorrect';
        gameState.wrongCount++;
        moveCharacter(-1);
    }
    
    // Hide feedback after 3 seconds
    setTimeout(() => {
        feedbackEl.className = 'feedback hidden';
    }, 3000);
    
    // Reset for next turn
    setTimeout(() => {
        document.getElementById('mathProblemContainer').style.display = 'none';
        gameState.currentProblem = null;
        gameState.canRoll = true;
        checkWinCondition();
    }, 3000);
}

// Move character on the board
function moveCharacter(spaces) {
    const newPosition = Math.max(0, Math.min(gameState.targetPosition, gameState.currentPosition + spaces));
    gameState.currentPosition = newPosition;
    
    // Update board squares
    const squares = document.querySelectorAll('.board-square');
    squares.forEach((square, index) => {
        square.classList.remove('current');
        if (index === gameState.currentPosition) {
            square.classList.add('current');
        }
    });
    
    // Move dog character visually
    updateDogPosition();
    
    updateDisplay();
}

// Update dog position on the board
function updateDogPosition() {
    const dogEl = document.getElementById('dogCharacter');
    const squares = document.querySelectorAll('.board-square');
    
    if (squares.length > 0 && squares[gameState.currentPosition]) {
        const targetSquare = squares[gameState.currentPosition];
        const boardContainer = document.querySelector('.game-board-container');
        const boardRect = boardContainer.getBoundingClientRect();
        const squareRect = targetSquare.getBoundingClientRect();
        
        // Position dog relative to the square
        const leftPosition = squareRect.left - boardRect.left + (squareRect.width / 2) - 20;
        dogEl.style.left = `${leftPosition}px`;
    }
}

// Update game display
function updateDisplay() {
    document.getElementById('position').textContent = `${gameState.currentPosition} / ${gameState.targetPosition}`;
    document.getElementById('correctCount').textContent = gameState.correctCount;
    document.getElementById('wrongCount').textContent = gameState.wrongCount;
}

// Check if player won
function checkWinCondition() {
    if (gameState.currentPosition >= gameState.targetPosition) {
        showWinMessage();
    }
}

// Show win message
function showWinMessage() {
    const winMessage = document.createElement('div');
    winMessage.className = 'win-message show';
    winMessage.innerHTML = `
        <h2>🎉 You Won! 🎉</h2>
        <p>Congratulations! The dog reached the cat!</p>
        <p>You got ${gameState.correctCount} correct answers!</p>
        <button class="btn-primary" onclick="location.reload()">Play Again</button>
    `;
    document.body.appendChild(winMessage);
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);

// Update dog position on window resize
window.addEventListener('resize', () => {
    if (gameState.currentPosition !== undefined) {
        updateDogPosition();
    }
});

