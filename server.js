const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static('public'));

// Define the deckFiles array
const deckFiles = ["tila-cards.txt", "tilanne-cards.txt", "sattuma-cards.txt", "resurssit-cards.txt", "opetusmuoto-cards.txt", "keinotja-oivallukset-cards.txt"];

function generateGameId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Initialize a persistent Game ID
let currentGameId = generateGameId();

// Object to store texts for each card
let cardTexts = {};

// Array to store game log messages
let gameLog = [];

// Function to generate text for a card
function generateCardText(deckIndex) {
    try {
        const filePath = path.join(__dirname, 'public/cardstext', deckFiles[deckIndex]);
        const data = fs.readFileSync(filePath, 'utf8');
        const words = data.split('\n');
        const randomWord = words[Math.floor(Math.random() * words.length)].trim();
        return randomWord;
    } catch (error) {
        console.error(`Failed to fetch data for deck ${deckIndex}:`, error);
        return ''; // Return an empty string or some default text in case of an error
    }
}

const animalNames = ["Bear", "Fox", "Wolf", "Deer", "Owl", "Hawk", "Rabbit", "Squirrel", "Badger", "Moose"];
let nameIndex = 0;
let players = {}; // Object to store players and their aliases

io.on('connection', (socket) => {
    const userName = animalNames[nameIndex % animalNames.length];
    nameIndex++;
    players[socket.id] = userName;
    console.log(`${userName} connected`);

    // Send the current Game ID and the game log to the newly connected client
    io.to(socket.id).emit('resetDecks', currentGameId);
    io.to(socket.id).emit('logHistory', gameLog);

    // Send the player's own username
    io.to(socket.id).emit('yourUserName', userName);

    // Update the player list for all clients
    io.emit('updatePlayerList', Object.values(players));

    io.emit('playerConnected', userName); // Notify all clients
    
    socket.on('cardMoved', (data) => {
        const logMessage = `${userName} moved a card`;
        gameLog.push(logMessage); // Add to log
        io.emit('cardMoved', data);
        io.emit('updateGameConsole', logMessage); // Update all clients
    });

    socket.on('flipCard', (data) => {
        const logMessage = `Card ${data.cardId} was flipped by ${players[socket.id]}`;
        gameLog.push(logMessage); // Add to log
        socket.broadcast.emit('flipCard', data); // Broadcast to all clients except the sender
        io.emit('updateGameConsole', logMessage); // Update all clients
    });

    socket.on('resetDecks', () => {
        const logMessage = `${userName} reset the decks-123`;
        gameLog.push(logMessage); // Add to log
        currentGameId = generateGameId();
        io.emit('resetDecks', currentGameId);
        io.emit('updateGameConsole', logMessage); // Update all clients
    });

    socket.on('autoPlaceCard', (data) => {
        const logMessage = `${userName} auto placed a card`;
        gameLog.push(logMessage); // Add to log
        io.emit('autoPlaceCard', data);
        io.emit('updateGameConsole', logMessage); // Update all clients
    });

    socket.on('flipAllCards', (data) => {
        const logMessage = `${players[socket.id]} flipped all cards`;
        gameLog.push(logMessage); // Add to log
        socket.broadcast.emit('flipAllCards', data);
        io.emit('updateGameConsole', logMessage); // Update all clients
    });

    socket.on('requestCardText', (data) => {
        let text;
        if (cardTexts[data.cardId]) {
            text = cardTexts[data.cardId];
        } else {
            text = generateCardText(data.deckIndex);
            cardTexts[data.cardId] = text;
        }
        io.emit('cardText', { cardId: data.cardId, text: text });
    });
    
    socket.on('clearLog', () => {
        gameLog = []; // Clear the log
        io.emit('logCleared'); // Notify all clients to clear their logs
    });
    
    socket.on('disconnect', () => {
        console.log(`${userName} disconnected`);
        delete players[socket.id];
        io.emit('updatePlayerList', Object.values(players));
        io.emit('playerDisconnected', players[socket.id]); // Notify all clients
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
