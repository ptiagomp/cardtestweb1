// Global Variables
const socket = io();
let draggedItem = null;
let isAnyCardFlipped = false;
let myUserName = '';
let isSetupDone = false;

// DOMContentLoaded Event Handler
document.addEventListener('DOMContentLoaded', function() {
    if (!isSetupDone) {
        setupGame();
        //setupDragAndDrop();
        setupButtonHandlers();
        setupClearConsoleButton(); // Setup the clear console button
        isSetupDone = true;
    }
});

// DOM Elements
const decks = document.querySelectorAll('.deck');
const resetBtn = document.getElementById('resetBtn');
const autoPlaceBtn = document.getElementById('autoPlaceBtn');
const flipAllBtn = document.getElementById('flipAllBtn');
const dropzones = document.querySelectorAll('.dropzone');

// Data Definitions
const colors = ['#FFB6C1', '#87CEEB', '#FFD700', '#98FB98', '#B19CD9', '#FFDAB9'];
const deckImages = ["tila-bcard.png", "tilanne-bcard.png", "sattuma-bcard.png", "resurssit-bcard.png", "opetusmuoto-bcard.png", "keinot-bcard.png"];

function loadRandomWord(deckIndex, card) {
    socket.emit('requestCardText', { deckIndex: deckIndex, cardId: card.id });
}

// Function to update the player's username display in the UI
function updateMyUserNameDisplay() {
    // Assuming you have an element with ID 'myUserNameDisplay' in your HTML
    const myUserNameDisplay = document.getElementById('myUserNameDisplay');
    if (myUserNameDisplay) {
        myUserNameDisplay.textContent = myUserName + ": sinä";
    }
}

// Function to clear the game console log
// Function to clear the game console log
function clearGameConsole() {
    const consoleElement = document.getElementById('gameConsole');
    while (consoleElement.children.length > 1) {
        consoleElement.removeChild(consoleElement.lastChild);
    }
}

// Function to set up the clear console button
function setupClearConsoleButton() {
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    clearConsoleBtn.addEventListener('click', function() {
        socket.emit('clearLog'); // Emit event to server to clear log
    });
}

function createCard(deck, index, cardIndex) {
    const card = document.createElement('div');
    card.className = 'card initial-animation';
    card.draggable = false;
    card.id = `deck-${index}-card-${cardIndex}`;
    card.dataset.deck = index;

    const front = document.createElement('div');
    front.className = 'front';
    front.style = `background-image: url('./back_card_imgs/${deckImages[index]}'); background-size: cover; background-color: #939598;`;

    const back = document.createElement('div');
    back.className = 'back';
    back.style.background = `linear-gradient(135deg, ${colors[index]}, white)`;

    card.append(front, back);
    deck.appendChild(card);

//    card.addEventListener('dblclick', () => {
//        card.classList.toggle('flip');
//        isAnyCardFlipped = true;
//        socket.emit('flipCard', { cardId: card.id });
//    });

    loadRandomWord(index, card);
}

function createDeck(deck, index) {
    for (let i = 0; i < 10; i++) {
        setTimeout(() => createCard(deck, index, i), i * 100);
    }
}

function createDecks() {
    decks.forEach(createDeck);
    setTimeout(() => document.querySelectorAll('.card').forEach(card => card.classList.remove('initial-animation')), 1200);
}

// Drag and Drop Event Handlers
function setupDragAndDrop() {
    document.addEventListener('dragover', e => {
        e.preventDefault();
        if (e.target.classList.contains('dropzone')) {
            e.target.style.backgroundColor = '';
        }
    });

    document.addEventListener('dragleave', e => {
        if (e.target.classList.contains('dropzone')) {
            e.target.style.backgroundColor = '';
        }
    });

    document.addEventListener('drop', e => {
        if (e.target.classList.contains('dropzone') && !e.target.querySelector('.card') && e.target.dataset.index === draggedItem.dataset.deck) {
            e.target.appendChild(draggedItem);
            Object.assign(draggedItem.style, { position: 'absolute', top: '0', left: '0' });
            socket.emit('cardMoved', { cardId: draggedItem.id, newParentId: e.target.id });
        }
    });

    document.addEventListener('dragstart', e => {
        draggedItem = e.target;
        draggedItem.classList.add('dragging');
    });

    document.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
        }
        draggedItem = null;
    });
}

// Button Event Handlers
function setupButtonHandlers() {
    resetBtn.addEventListener('click', () => {
        decks.forEach(deck => deck.innerHTML = '');
        dropzones.forEach(dropzone => dropzone.innerHTML = '');
        createDecks();
        isAnyCardFlipped = false;
            // Request new card texts for all cards
    decks.forEach((deck, deckIndex) => {
        for (let cardIndex = 0; cardIndex < 10; cardIndex++) {
            const cardId = `deck-${deckIndex}-card-${cardIndex}`;
            socket.emit('requestCardText', { deckIndex: deckIndex, cardId: cardId });
        }
    });
        socket.emit('resetDecks');
    });

    autoPlaceBtn.addEventListener('click', () => {
        if (isAnyCardFlipped) {
            alert("Please reset the deck if you want to auto place all decks!");
            return;
        }
        decks.forEach((deck, index) => {
            const dropzone = dropzones[index];
            if (!dropzone.querySelector('.card')) {
                const card = deck.querySelector('.card');
                if (card) {
                    dropzone.appendChild(card);
                    Object.assign(card.style, { position: 'absolute', top: '0', left: '0' });
                    socket.emit('autoPlaceCard', { cardId: card.id, dropzoneId: dropzone.id });
                }
            }
        });
    });

    flipAllBtn.addEventListener('click', () => {
        let cardsInDropzones = false;
        let allCardsFaceSameSide = true;
        let firstCardFlipped = null;
        let cardIds = []; // Array to store the IDs of cards being flipped
    
        dropzones.forEach(dropzone => {
            const card = dropzone.querySelector('.card');
            if (card) {
                cardsInDropzones = true;
                firstCardFlipped = firstCardFlipped === null ? card.classList.contains('flip') : firstCardFlipped;
                if (card.classList.contains('flip') !== firstCardFlipped) {
                    allCardsFaceSameSide = false;
                }
            }
        });
    
        if (!cardsInDropzones) {
            alert("Aseta kortit ensin pudotusalueelle!");
            return;
        }
        if (!allCardsFaceSameSide) {
            alert("Cannot flip all cards when they are showing different sides.");
            return;
        }
    
        dropzones.forEach(dropzone => {
            const card = dropzone.querySelector('.card');
            if (card) {
                card.classList.toggle('flip');
                cardIds.push(card.id); // Add the card ID to the array
            }
        });
    
        if (cardIds.length > 0) {
            socket.emit('flipAllCards', { cardIds }); // Emit the event with the array of card IDs
        }
    });
}
function formatCardText(text) {
    if (text.length <= 21) return text;

    const words = text.split(' ');
    let formattedText = '';
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length > 21) {
            formattedText += currentLine.trim() + '\n'; // Add a line break
            currentLine = word + ' '; // Start a new line with the current word
        } else {
            currentLine += word + ' '; // Add the word to the current line
        }
    });

    return formattedText + currentLine.trim(); // Add the last line
}

// Game Setup and Player Management
function setupGame() {
    dropzones.forEach((dropzone, index) => {
        dropzone.dataset.index = index.toString();
        dropzone.id = `dropzone-${index}`;
    });

    createDecks();
    setupDragAndDrop();
    setupButtonHandlers();
    setupClearConsoleButton();
}

function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = ''; // Clear existing list

    players.forEach(player => {
        const playerElement = document.createElement('li');
        // Check if this is the current player
        if (player === myUserName) {
            playerElement.innerHTML = `${player} <strong> : sinä</strong>`;
        } else {
            playerElement.textContent = player;
        }
        playersList.appendChild(playerElement);
    });
}

// Socket.IO Event Listeners
socket.on('cardMoved', data => {
    const card = document.getElementById(data.cardId);
    const newParent = document.getElementById(data.newParentId);
    if (card && newParent) {
        newParent.appendChild(card);
        Object.assign(card.style, { position: 'absolute', top: '0', left: '0' });
    }
});

socket.on('cardText', function(data) {
    const card = document.getElementById(data.cardId);
    if (card) {
        const back = card.querySelector('.back');
        if (back) {
            back.textContent = formatCardText(data.text); // Format the text before setting it
        }
    }
});

socket.on('flipCard', function(data) {
    const card = document.getElementById(data.cardId);
    if (card) {
        card.classList.toggle('flip');
    }
});

socket.on('autoPlaceCard', function(data) {
    const card = document.getElementById(data.cardId);
    const dropzone = document.getElementById(data.dropzoneId);
    if (card && dropzone) {
        dropzone.appendChild(card);
        Object.assign(card.style, { position: 'absolute', top: '0', left: '0' });
    }
});

socket.on('flipAllCards', function(data) {
    data.cardIds.forEach(cardId => {
        const card = document.getElementById(cardId);
        if (card) {
            card.classList.toggle('flip');
        }
    });
});

// Existing 'resetDecks' Event Listener
socket.on('resetDecks', (gameId) => {
    console.log('resetDecks event received from server');
    const gameIdDisplay = document.getElementById('gameIdDisplay');
    if (gameIdDisplay) {
        gameIdDisplay.textContent = `Pelin ID: ${gameId}`;
    }
    decks.forEach(deck => deck.innerHTML = '');
    dropzones.forEach(dropzone => dropzone.innerHTML = '');
    createDecks();
    isAnyCardFlipped = false;
    // Removed the line that emits 'resetDecks' back to the server
});

socket.on('logCleared', () => {
    clearGameConsole(); // Clear the console when receiving 'logCleared' event
});

socket.on('updatePlayerList', (players) => {
    updatePlayersList(players);
});

socket.on('yourUserName', (userName) => {
    myUserName = userName;
    updateMyUserNameDisplay();
});

socket.on('newPlayerJoined', () => {
    // Call the function that handles the reset button click
    // This function should contain the logic that is executed when the reset button is clicked
    resetGame();
});

function resetGame() {
    // Logic to reset the game
    // This is similar to what happens when the reset button is clicked
    console.log('Resetting game due to new player joining');
    // ... reset logic here ...
}
