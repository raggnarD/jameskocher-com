// Word pools by grade level (same as listen-match)
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

// Gear colors
const gearColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
];

// Game state
const gameState = {
    words: [],
    matchedCount: 0,
    roundCount: 0,
    activeGrades: ['prek', 'k', '1st', '2nd'],
    draggedGear: null,
    draggedGearElement: null,
    isDragging: false,
    selectedGear: null,
    selectedGearElement: null
};

// Initialize the game
function initGame() {
    setupEventListeners();
    updateWordCount();
    generateNewRound();
    updateDisplay();
}

// Setup event listeners
function setupEventListeners() {
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
    generateNewRound();
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

// Generate a new round with 8 words
function generateNewRound() {
    const allWords = getAllActiveWords();
    
    if (allWords.length < 8) {
        updateStatus('⚠️ Not enough words! Need at least 8 words. Enable more grade levels.');
        return;
    }
    
    // Select 8 random words
    const selectedWords = [];
    const usedIndices = new Set();
    
    while (selectedWords.length < 8) {
        const randomIndex = Math.floor(Math.random() * allWords.length);
        if (!usedIndices.has(randomIndex)) {
            selectedWords.push(allWords[randomIndex]);
            usedIndices.add(randomIndex);
        }
    }
    
    // Shuffle the words
    gameState.words = shuffleArray(selectedWords);
    gameState.matchedCount = 0;
    
    // Clear selected gear
    gameState.selectedGear = null;
    gameState.selectedGearElement = null;
    
    // Generate gears and slots
    generateGears();
    generateSlots();
    
    updateStatus('Click a gear to select it, then click a circle to place it!');
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

// Generate gear elements
function generateGears() {
    const gearsArea = document.getElementById('gearsArea');
    gearsArea.innerHTML = '';
    
    // Shuffle words for gears
    const gearWords = shuffleArray([...gameState.words]);
    
    gearWords.forEach((word, index) => {
        const gear = document.createElement('div');
        gear.className = `gear size-${index + 1}`;
        gear.draggable = true;
        gear.dataset.word = word;
        gear.dataset.index = index;
        
        const color = gearColors[index % gearColors.length];
        
        // Create gear SVG
        const gearSVG = createGearSVG(80 + index * 10, color);
        gear.innerHTML = `
            ${gearSVG}
            <div class="gear-word">${word}</div>
        `;
        
        // Add drag event listeners
        gear.addEventListener('dragstart', handleDragStart);
        gear.addEventListener('dragend', handleDragEnd);
        
        // Add click event listener for selection
        gear.addEventListener('click', handleGearClick);
        
        gearsArea.appendChild(gear);
    });
}

// Handle gear click for selection
function handleGearClick(e) {
    const gear = e.currentTarget;
    
    // Don't allow selection if already matched
    if (gear.classList.contains('matched')) {
        return;
    }
    
    // Deselect previous gear
    if (gameState.selectedGearElement) {
        gameState.selectedGearElement.classList.remove('selected');
    }
    
    // Select this gear
    gameState.selectedGear = gear.dataset.word;
    gameState.selectedGearElement = gear;
    gear.classList.add('selected');
    
    updateStatus(`Selected: ${gear.dataset.word}. Click a circle to place it.`);
}

// Create gear SVG
function createGearSVG(size, color) {
    const center = size / 2;
    const outerRadius = size * 0.4;
    const innerRadius = size * 0.25;
    const whiteCircleRadius = size * 0.22; // Large white circle to fit the word text
    const teeth = 8;
    const toothLength = size * 0.1;
    
    // Create gear path with teeth
    let path = '';
    for (let i = 0; i < teeth * 2; i++) {
        const angle = (i * Math.PI) / teeth;
        const radius = (i % 2 === 0) ? outerRadius : (outerRadius + toothLength);
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        
        if (i === 0) {
            path = `M ${x} ${y}`;
        } else {
            path += ` L ${x} ${y}`;
        }
    }
    path += ' Z';
    
    return `
        <svg class="gear-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${center}" cy="${center}" r="${outerRadius + toothLength}" fill="${color}" opacity="0.2"/>
            <path d="${path}" fill="${color}" stroke="#2c3e50" stroke-width="2"/>
            <circle cx="${center}" cy="${center}" r="${whiteCircleRadius}" fill="white"/>
        </svg>
    `;
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

// Generate slot circles positioned around the perimeter
function generateSlots() {
    const slotsArea = document.getElementById('slotsArea');
    slotsArea.innerHTML = '';
    
    // Shuffle words for slots
    const slotWords = shuffleArray([...gameState.words]);
    
    // Use setTimeout to ensure container is rendered
    setTimeout(() => {
        const containerWidth = slotsArea.offsetWidth || 500;
        const containerHeight = slotsArea.offsetHeight || 500;
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        const radius = Math.min(containerWidth, containerHeight) * 0.35;
        const numSlots = 8;
        
        slotWords.forEach((word, index) => {
            // Calculate position around circle
            const angle = (index * 2 * Math.PI) / numSlots - Math.PI / 2; // Start from top
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            const slotCircle = document.createElement('div');
            slotCircle.className = 'slot-circle';
            slotCircle.dataset.word = word;
            slotCircle.dataset.index = index;
            slotCircle.style.left = `${x - 40}px`; // Center the 80px circle
            slotCircle.style.top = `${y - 40}px`;
            
            // Add click event to play audio
            slotCircle.addEventListener('click', () => playWordAudio(word, slotCircle));
            
            // Add drop event listeners
            slotCircle.addEventListener('dragover', handleDragOver);
            slotCircle.addEventListener('drop', handleDrop);
            slotCircle.addEventListener('dragleave', handleDragLeave);
            
            slotsArea.appendChild(slotCircle);
        });
    }, 100);
}

// Play audio for a word and handle gear placement
function playWordAudio(word, element) {
    // Don't play if dragging or already matched
    if (element.classList.contains('matched')) {
        return;
    }
    
    // If a gear is selected, try to place it
    if (gameState.selectedGear && gameState.selectedGearElement) {
        const selectedWord = gameState.selectedGear;
        
        if (selectedWord === word) {
            // Match! Place the gear
            placeGearOnCircle(gameState.selectedGearElement, element, word);
            return;
        } else {
            // Wrong match - play audio and show feedback
            updateStatus(`❌ Not a match! The word is "${word}".`);
        }
    }
    
    // Visual feedback
    element.style.transform = 'scale(1.2)';
    setTimeout(() => {
        element.style.transform = '';
    }, 300);
    
    // Use Web Speech API with better voice
    if ('speechSynthesis' in window) {
        // Load voices if not already loaded
        if (speechSynthesis.getVoices().length === 0) {
            speechSynthesis.onvoiceschanged = () => {
                playWordAudioWithVoice(word);
            };
        } else {
            playWordAudioWithVoice(word);
        }
    } else {
        alert('Audio not supported. The word is: ' + word);
    }
    
    function playWordAudioWithVoice(word) {
        const utterance = new SpeechSynthesisUtterance(word);
        const voice = getBestVoice();
        
        if (voice) {
            utterance.voice = voice;
        }
        
        utterance.rate = 0.75; // Slower for better clarity
        utterance.pitch = 1.1; // Slightly higher pitch
        utterance.volume = 1.0;
        utterance.lang = 'en-US';
        
        speechSynthesis.speak(utterance);
    }
}

// Place gear on circle (used by both drag-drop and click-click)
function placeGearOnCircle(gearElement, circleElement, word) {
    // Match!
    circleElement.classList.add('matched');
    gearElement.classList.add('matched');
    gearElement.draggable = false;
    
    // Deselect gear
    if (gearElement === gameState.selectedGearElement) {
        gearElement.classList.remove('selected');
        gameState.selectedGear = null;
        gameState.selectedGearElement = null;
    }
    
    // Place gear in center of drop zone
    const slotsArea = document.getElementById('slotsArea');
    const gearClone = gearElement.cloneNode(true);
    gearClone.classList.remove('dragging', 'matched', 'selected');
    gearClone.style.position = 'absolute';
    gearClone.style.pointerEvents = 'none';
    gearClone.className = 'slot-gear';
    
    // Position gear near the matched circle
    const circleRect = circleElement.getBoundingClientRect();
    const areaRect = slotsArea.getBoundingClientRect();
    gearClone.style.left = `${circleRect.left - areaRect.left + (circleRect.width / 2) - (gearClone.offsetWidth / 2)}px`;
    gearClone.style.top = `${circleRect.top - areaRect.top + (circleRect.height / 2) - (gearClone.offsetHeight / 2)}px`;
    
    slotsArea.appendChild(gearClone);
    
    gameState.matchedCount++;
    updateDisplay();
    updateStatus(`Matched! ${8 - gameState.matchedCount} remaining.`);
    
    // Check if all matched
    if (gameState.matchedCount === 8) {
        setTimeout(() => {
            showCompletion();
        }, 500);
    }
}

// Drag and drop handlers
function handleDragStart(e) {
    gameState.draggedGear = e.target.dataset.word;
    gameState.draggedGearElement = e.target;
    gameState.isDragging = true;
    
    // Clear selected gear if dragging
    if (gameState.selectedGearElement === e.target) {
        e.target.classList.remove('selected');
        gameState.selectedGear = null;
        gameState.selectedGearElement = null;
    }
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    gameState.isDragging = false;
    // Remove drag-over class from all circles
    document.querySelectorAll('.slot-circle').forEach(circle => {
        circle.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const slotWord = e.currentTarget.dataset.word;
    const gearWord = gameState.draggedGear;
    
    if (slotWord === gearWord) {
        // Match! Use the shared placement function
        placeGearOnCircle(gameState.draggedGearElement, e.currentTarget, slotWord);
    } else {
        // Wrong match
        updateStatus(`❌ Not a match! Click the circle to hear the word.`);
        // Shake animation
        e.currentTarget.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            e.currentTarget.style.animation = '';
        }, 500);
    }
    
    return false;
}

// Show completion message and reset
function showCompletion() {
    // Animate all gears spinning in a circle
    animateGearsCelebration();
    
    const completionMessage = document.getElementById('completionMessage');
    completionMessage.classList.add('show');
    
    setTimeout(() => {
        completionMessage.classList.remove('show');
        gameState.roundCount++;
        generateNewRound();
        updateDisplay();
    }, 3000); // Increased time to allow animation to complete
}

// Animate gears spinning in a circle
function animateGearsCelebration() {
    const slotsArea = document.getElementById('slotsArea');
    const areaRect = slotsArea.getBoundingClientRect();
    const centerX = areaRect.width / 2;
    const centerY = areaRect.height / 2;
    const radius = Math.min(areaRect.width, areaRect.height) * 0.3;
    const duration = 2; // seconds
    
    // Get all gears (both from left panel and placed in drop zone)
    const allGears = document.querySelectorAll('.gear, .slot-gear');
    const totalGears = allGears.length;
    
    allGears.forEach((gear, index) => {
        // Clone gear for animation
        const gearClone = gear.cloneNode(true);
        gearClone.style.position = 'absolute';
        gearClone.style.pointerEvents = 'none';
        gearClone.style.zIndex = '1000';
        gearClone.classList.add('celebration-gear');
        
        // Get gear position relative to slots area
        const gearRect = gear.getBoundingClientRect();
        const startX = gearRect.left - areaRect.left + gearRect.width / 2;
        const startY = gearRect.top - areaRect.top + gearRect.height / 2;
        
        gearClone.style.left = `${startX - gearRect.width / 2}px`;
        gearClone.style.top = `${startY - gearRect.height / 2}px`;
        gearClone.style.width = `${gearRect.width}px`;
        gearClone.style.height = `${gearRect.height}px`;
        
        slotsArea.appendChild(gearClone);
        
        // Calculate circular path - evenly distribute gears around circle
        const angleOffset = (index * 2 * Math.PI) / totalGears;
        const startAngle = Math.atan2(startY - centerY, startX - centerX);
        
        // Create keyframe animation
        const keyframes = [];
        const steps = 30;
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            // Each gear moves in a full circle plus its offset
            const angle = startAngle + (progress * 2 * Math.PI) + angleOffset;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            const rotation = progress * 720; // 2 full rotations while moving
            
            keyframes.push({
                left: `${x - gearRect.width / 2}px`,
                top: `${y - gearRect.height / 2}px`,
                transform: `rotate(${rotation}deg)`
            });
        }
        
        // Animate
        const animation = gearClone.animate(keyframes, {
            duration: duration * 1000,
            easing: 'linear',
            fill: 'forwards'
        });
        
        // Remove after animation
        animation.onfinish = () => {
            gearClone.remove();
        };
    });
}

// Update display
function updateDisplay() {
    document.getElementById('matchedCount').textContent = `${gameState.matchedCount} / 8`;
    document.getElementById('roundCount').textContent = gameState.roundCount;
}

// Update status
function updateStatus(message) {
    const statusText = document.querySelector('.status-text');
    if (statusText) {
        statusText.textContent = message;
    }
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

