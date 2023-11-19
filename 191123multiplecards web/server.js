const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Define the deckFiles array
const deckFiles = ["tila-cards.txt", "tilanne-cards.txt", "sattuma-cards.txt", "resurssit-cards.txt", "opetusmuoto-cards.txt", "keinotja-oivallukset-cards.txt"];

function generateGameId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Function to generate text for a card
function generateCardText(deckIndex) {
    try {
        const filePath = path.join(__dirname, 'cardstext', deckFiles[deckIndex]);
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

app.use(express.static('.')); // Serve static files from root directory

io.on('connection', (socket) => {
    const userName = animalNames[nameIndex % animalNames.length];
    nameIndex++;
    players[socket.id] = userName;

    console.log(`${userName} connected`);
    io.emit('updatePlayerList', Object.values(players));

    socket.on('cardMoved', (data) => {
        console.log(`${userName} moved a card`);
        io.emit('cardMoved', data);
    });

    socket.on('flipCard', (data) => {
        console.log(`Card ${data.cardId} was flipped by ${players[socket.id]}`);
        socket.broadcast.emit('flipCard', data); // Broadcast to all clients except the sender
    });

    socket.on('resetDecks', () => {
        console.log(`${userName} reset the decks`);
        const gameId = generateGameId();
        io.emit('resetDecks', gameId); // Emit the new game ID
    });

    socket.on('autoPlaceCard', (data) => {
        console.log(`${userName} auto placed a card`);
        io.emit('autoPlaceCard', data);
    });

    socket.on('flipAllCards', (data) => {
        console.log(`${players[socket.id]} flipped all cards`);
        socket.broadcast.emit('flipAllCards', data); // Broadcast to all clients except the sender
    });

    socket.on('requestCardText', (data) => {
        const text = generateCardText(data.deckIndex);
        io.to(socket.id).emit('cardText', { cardId: data.cardId, text: text });
    });

    socket.on('requestCardText', (data) => {
        const text = generateCardText(data.deckIndex);
        io.to(socket.id).emit('cardText', { cardId: data.cardId, text: text });
    });
    

    socket.on('disconnect', () => {
        console.log(`${userName} disconnected`);
        delete players[socket.id];
        io.emit('updatePlayerList', Object.values(players));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
