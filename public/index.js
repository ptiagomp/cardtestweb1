document.addEventListener('DOMContentLoaded', function() {
    bindEventListeners();
});

function bindEventListeners() {
    const joinGameButton = document.getElementById('joinGameBtn');
    joinGameButton.addEventListener('click', handleJoinGameClick);

    const createGameButton = document.getElementById('createGameBtn');
    createGameButton.addEventListener('click', handleCreateGameClick);
}

function handleJoinGameClick() {
    const gameId = document.getElementById('joinGameInput').value.trim();

    if (isValidGameId(gameId)) {
        redirectToGame(gameId);
    } else {
        alert('Please introduce a valid Game ID!');
    }
}

function handleCreateGameClick() {
    // Redirect to gameA.html without a game ID for creating a new game
    window.location.href = 'gameA.html';
}

function isValidGameId(gameId) {
    // Add additional validation logic here if needed
    return gameId.length > 0;
}

function redirectToGame(gameId) {
    window.location.href = `gameA.html?gameId=${gameId}`;
}

function navigate(url) {
    document.body.classList.add('fade-out');
    setTimeout(() => {
        window.location.href = url;
    }, 2000); // Delay matches the animation duration
}
