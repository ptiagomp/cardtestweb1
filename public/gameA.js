// Global Variables
const socket = io();
let draggedItem = null;
let isAnyCardFlipped = false;
let myUserName = '';

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
        myUserNameDisplay.textContent = myUserName + ": you";
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

function updateGameConsole(message) {
    const consoleElement = document.getElementById('gameConsole');
    const newMessage = document.createElement('div');
    newMessage.textContent = message;
    consoleElement.appendChild(newMessage);

    // Auto-scroll to the bottom of the console
    consoleElement.scrollTop = consoleElement.scrollHeight;
}

function createCard(deck, index, cardIndex) {
    const card = document.createElement('div');
    card.className = 'card initial-animation';
    card.draggable = true;
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

    card.addEventListener('dblclick', () => {
        card.classList.toggle('flip');
        isAnyCardFlipped = true;
        socket.emit('flipCard', { cardId: card.id });
    });

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
            alert("Please first put cards on the dropzone.");
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
            playerElement.innerHTML = `${player} <strong> : you</strong>`;
        } else {
            playerElement.textContent = player;
        }
        playersList.appendChild(playerElement);
    });
}


// DOMContentLoaded Event Handler
document.addEventListener('DOMContentLoaded', function() {
    setupGame();
    setupDragAndDrop();
    setupButtonHandlers();
    setupClearConsoleButton(); // Setup the clear console button
});

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
            back.textContent = data.text; // Set the text on the back of the card
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

socket.on('resetDecks', (gameId) => {
    const gameIdDisplay = document.getElementById('gameIdDisplay');
    if (gameIdDisplay) {
        gameIdDisplay.textContent = `Game ID: ${gameId}`;
    }
    decks.forEach(deck => deck.innerHTML = '');
    dropzones.forEach(dropzone => dropzone.innerHTML = '');
    createDecks();
    isAnyCardFlipped = false;
});

socket.on('logCleared', () => {
    clearGameConsole(); // Clear the console when receiving 'logCleared' event
});

socket.on('updatePlayerList', (players) => {
    updatePlayersList(players);
});

socket.on('logHistory', (logMessages) => {
    logMessages.forEach(message => updateGameConsole(message));
});

socket.on('updateGameConsole', (message) => {
    updateGameConsole(message);
});

socket.on('yourUserName', (userName) => {
    myUserName = userName;
    updateMyUserNameDisplay();
});

socket.on('playerConnected', (playerName) => {
    updateGameConsole(playerName + ' has connected.');
});