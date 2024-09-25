// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const imgs = ["001-koi.png",
    "002-parrot.png",
    "003-pelican.png",
    "004-armadillo.png",
    "005-macaw.png",
    "006-deer.png",
    "007-panda-bear.png",
    "008-jaguar.png",
    "009-turtle.png",
    "010-ganesha.png",
    "011-shark.png",
    "012-apteryx.png",
    "013-blackbird.png",
    "014-anaconda.png",
    "015-bird.png",
    "016-jacutinga.png",
    "017-fossil.png",
    "018-fossil-1.png",
    "019-pork.png",
    "020-butterfly.png",
    "021-weasel.png",
    "022-meerkat.png",
    "023-penguin.png",
    "024-cow.png",
    "025-elephant.png",
    "026-panda.png",
    "027-parrot-1.png",
    "028-lion.png",
    "029-owl.png",
    "030-border-collie.png",
    "031-koala.png",
    "032-sheep.png"]
// Initialize Express app
const app = express();
app.use(cors({
    origin: 'http://134.122.31.110', // Allow requests from this origin (your client)
    methods: ['GET', 'POST'],    // Specify allowed HTTP methods
    allowedHeaders: ['Content-Type'] // Specify allowed headers
}));
const emptyBetSlot = [0, 0, 0, 0, 0, 0]
// Create HTTP and WebSocket server
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://134.122.31.110', // Allow WebSocket connection from this origin
        methods: ['GET', 'POST']
    }
});

// Game constants
const BET_WINDOW = 13000; // 12 seconds for betting window
const RESOLVE_ROUNd = 2000; // 12 seconds for betting window
const NEXT_ROUND_DELAY = 4000; // 3 seconds delay before starting a new round
let players = {}; // Track player balances and bets
let currentRoundResult = null;
let bettingOpen = false;

// Generate a random number for each round (simulating a dice roll)
function generateRandomOutcomes() {
    // return [
    //     1,
    //     2,
    //     2
    // ]; // Returns an array of 3 random numbers between 1 and 6
    return [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
    ]; // Returns an array of 3 random numbers between 1 and 6
}
let timeLeft = BET_WINDOW / 1000;
// Start a new round (only manages the betting window and result)
function startNewRound() {
    console.log('New round started!');
    bettingOpen = true;

    let countdownInterval = setInterval(() => {

        if (timeLeft > 0) {
            io.emit('bettingOpen', timeLeft); // Emit bettingOpen status with the time left
            timeLeft--;
        } else {
            clearInterval(countdownInterval);
            bettingOpen = false;
            betClosed();
        }
    }, 1000);

    // io.emit('bettingOpen'); // Notify all clients that betting is open

    // Close betting after 12 seconds and resolve the round
    // setTimeout(() => {
    //     bettingOpen = false;
    //     betClosed();
    // }, BET_WINDOW);
}

function betClosed() {
    io.emit('bettingClosed');
    setTimeout(() => {
        resolveRound();
    }, RESOLVE_ROUNd);

}


function resolveRound() {
    currentRoundResult = generateRandomOutcomes();
    console.log(`Round result: ${currentRoundResult}`);
    console.log(players)


    // Resolve bets and update player balances
    var players_balance = {};

    Object.keys(players).forEach(playerId => {
        const player = players[playerId];
        const playerBetAmount = player.bets;
        var winamount = 0;
        var won = [0, 0, 0, 0, 0, 0, 0];
        var bets_amount = [0, 0, 0, 0, 0, 0, 0];




        // console.log(`playerId: ${playerId} balance: ${player.balance}`);
        // console.log(playerBetAmount);
        if (player.bets !== null) {
            // Iterate through the winning indexes and calculate the win amount
            currentRoundResult.forEach(index => {
                // console.log(`index ${index} ${playerBetAmount[index - 1]}`)
                if (parseInt(playerBetAmount[index - 1]) > 0) {
                    bets_amount[index] = parseInt(playerBetAmount[index - 1]);  // Calculate the win amount
                    won[index] += parseInt(playerBetAmount[index - 1]);
                }
            });
        }



        var total = won.reduce(function (accumulator, currentValue) {
            return accumulator + currentValue;
        }, 0);

        total += bets_amount.reduce(function (accumulator, currentValue) {
            return accumulator + currentValue;
        }, 0);

        // Update player's balance with winamount
        player.balance += total;

        // Reset player's bets for the next round
        players[playerId].bets = [0, 0, 0, 0, 0, 0];

        // Initialize players_balance object for this player
        players_balance[playerId] = { b: player.balance, won: won };  // Ensure the object is initialized
    });

    // Send round result and updated player balances to clients
    var res = { result: currentRoundResult, players: players_balance };
    console.log(res);
    io.emit('roundResult', res);

    // Wait 3 seconds before starting the next round
    setTimeout(() => {
        timeLeft = BET_WINDOW / 1000;
        startNewRound();
    }, NEXT_ROUND_DELAY);
}


function updatePlayerAvatars() {
    var playerAvatars = {};

    // Loop through each player ID in the players object
    for (let playerId in players) {
        // Store the username in the new object
        var p = players[playerId]
        playerAvatars[playerId] = { username: p.username, avatar: p.avatar };
    }

    // Return the new object with player IDs and their corresponding usernames
    return playerAvatars;
}
function betStatus() {
    var totalBets = [0, 0, 0, 0, 0, 0]; // Initialize an array to store the sum of bets

    Object.entries(players).forEach(([userId, user]) => {
        // if (userId !== socket.id) {  // Exclude this specific user
        user.bets.forEach((bet, index) => {
            totalBets[index] += bet;
        });
        // }
    });
    return totalBets;
}
let user_img = {}
io.on('connection', (socket) => {
    console.log(`New player connected: ${socket.id}`);

    // Initialize player's balance and bet
    const emptyBetSlot = Array(5).fill(0); // Example: 5 bet slots, initialize with zeros


    socket.on('login', (info) => {
        const { username, balance } = info
        var avatar = imgs[Math.floor(Math.random() * imgs.length)]
        players[socket.id] = { balance: balance, bets: emptyBetSlot, avatar: avatar, username: username };
        console.log(players)
        // user_img[socket.id] = imgs[Math.floor(Math.random() * imgs.length)];
        socket.emit('welcome', { socketid: socket.id, balance: players[socket.id].balance, bettingStatus: bettingOpen });
        const playerAvatars = updatePlayerAvatars();
        io.emit('updatePlayerList', playerAvatars);
    })


    // Send initial game state to the connected player


    // Handle canceling a bet
    socket.on('cancelBet', (data) => {
        const { bet } = data;
        const player = players[socket.id];

        if (bet > 0 && bet <= player.bets.length && player.bets[bet - 1] > 0) {
            player.balance += player.bets[bet - 1];
            player.bets[bet - 1] = 0;
            console.log(`Bet canceled. New balance: ${player.balance}`);
            const totalBets = betStatus();
            io.emit('betsUpdate', { betSummary: totalBets, senderId: socket.id });
        } else {
            socket.emit('error', 'Invalid bet cancellation.');
        }
    });

    // Handle placing a bet
    socket.on('placeBet', (data) => {
        const { bet, betAmount } = data;
        const player = players[socket.id];

        // Ensure bet is valid
        if (bettingOpen && betAmount > 0 && betAmount <= player.balance && bet > 0 && bet <= player.bets.length) {
            player.bets[bet - 1] += betAmount;
            player.balance -= betAmount;
            console.log(`Player ${socket.id} placed bet on ${bet}. New balance: ${player.balance}`);
            console.log(`Current bets: ${player.bets}`);
            console.log(players)



            const totalBets = betStatus();
            io.emit('betsUpdate', { betSummary: totalBets, senderId: socket.id });
        } else {
            let errorMessage = 'Bet not accepted. ';
            if (!bettingOpen) {
                errorMessage += 'Betting window is closed.';
            } else if (betAmount > player.balance) {
                errorMessage += 'Insufficient balance.';
            } else if (bet <= 0 || bet > player.bets.length) {
                errorMessage += 'Invalid bet slot.';
            } else {
                errorMessage += 'Invalid bet amount.';
            }
            socket.emit('error', errorMessage);
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        const playerAvatars = updatePlayerAvatars();
        io.emit('updatePlayerList', playerAvatars);
    });
});







// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// Start the first round immediately after the server starts
startNewRound(); 