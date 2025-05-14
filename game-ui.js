/**
 * game-ui.js
 * 
 * User interface management for Othello Arena
 * Handles board rendering, user interactions, and status updates
 */

const OthelloUI = (function () {
    // DOM element references
    const elements = {
        board: document.getElementById('board'),
        status: document.getElementById('status'),
        blackScore: document.getElementById('black-score'),
        whiteScore: document.getElementById('white-score'),
        blackTimer: document.getElementById('black-timer'),
        whiteTimer: document.getElementById('white-timer'),
        stageSelect: document.getElementById('stageSelect'),
        blackAISelect: document.getElementById('black-ai'),
        whiteAISelect: document.getElementById('white-ai'),
        startButton: document.getElementById('start-btn'),
        resetButton: document.getElementById('reset-btn'),
        gameLog: document.getElementById('game-log'),
        jsCode: document.getElementById('js-code'),
        strategyName: document.getElementById('strategy-name'),
        saveStrategyButton: document.getElementById('save-strategy'),
        clearEditorButton: document.getElementById('clear-editor'),
        strategyList: document.getElementById('strategy-list'),
        logInput: document.getElementById('log-input')
    };

    // Private variables
    let moveLog = []; // Array of log messages
    let blackTimeUsed = 0; // Time used by black player (ms)
    let whiteTimeUsed = 0; // Time used by white player (ms)
    let aiThinking = false; // Flag to indicate AI is thinking

    /**
     * Update the board display based on current board state
     * @param {Array<Array<number>>} boardState - Current board state
     */
    function updateBoardDisplay(boardState = null) {
        // If no board state provided, attempt to get from OthelloCore
        if (!boardState && typeof OthelloCore !== 'undefined') {
            boardState = OthelloCore.getBoard();
        }

        if (!boardState) {
            console.error("No board state available for display update");
            return;
        }

        // Get current player (for valid move hints)
        const currentPlayer = typeof OthelloCore !== 'undefined' && OthelloCore.getCurrentPlayer ?
            OthelloCore.getCurrentPlayer() : GAME_CONSTANTS.BLACK;

        // Get game running state
        const gameRunning = typeof OthelloCore !== 'undefined' && OthelloCore.isGameRunning ?
            OthelloCore.isGameRunning() : false;

        const boardSize = boardState.length;
        const cells = elements.board.querySelectorAll('.cell');

        // Clear existing board cells
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);

            cell.innerHTML = '';
            cell.classList.remove('blocked', 'black', 'white', 'valid-move-hint', 'playable');
            cell.onclick = null;

            if (!isWithinBoard(r, c, boardSize)) return;

            const cellState = boardState[r][c];

            if (cellState === GAME_CONSTANTS.BLACK) {
                const disc = document.createElement('div');
                disc.className = 'disc black';
                cell.appendChild(disc);
                cell.style.cursor = 'default';
            }
            else if (cellState === GAME_CONSTANTS.WHITE) {
                const disc = document.createElement('div');
                disc.className = 'disc white';
                cell.appendChild(disc);
                cell.style.cursor = 'default';
            }
            else if (cellState === GAME_CONSTANTS.BLOCKED) {
                cell.classList.add('blocked');
                cell.style.cursor = 'not-allowed';
            }
            else { // EMPTY
                const isHumanTurn = (currentPlayer === GAME_CONSTANTS.BLACK && elements.blackAISelect.value === 'human') ||
                    (currentPlayer === GAME_CONSTANTS.WHITE && elements.whiteAISelect.value === 'human');

                if (gameRunning && !aiThinking && isHumanTurn &&
                    typeof OthelloCore !== 'undefined' && OthelloCore.isValidMove &&
                    OthelloCore.isValidMove(r, c, currentPlayer)) {
                    cell.classList.add('valid-move-hint');
                    cell.classList.add('playable');
                } else {
                    cell.style.cursor = 'default';
                }
            }
        });

        // Update scores
        const scores = countDiscs(boardState);
        elements.blackScore.textContent = scores.black;
        elements.whiteScore.textContent = scores.white;
    }

    /**
     * Helper function to check if coordinates are within board
     * @param {number} r - Row index
     * @param {number} c - Column index
     * @param {number} size - Board size
     * @returns {boolean} True if coordinates are valid
     */
    function isWithinBoard(r, c, size) {
        return r >= 0 && r < size && c >= 0 && c < size;
    }

    /**
     * Count the number of discs for each player
     * @param {Array<Array<number>>} boardState - Board state to count from
     * @returns {Object} Object with counts {black, white}
     */
    function countDiscs(boardState) {
        let black = 0, white = 0;

        for (let r = 0; r < boardState.length; r++) {
            for (let c = 0; c < boardState[r].length; c++) {
                if (boardState[r][c] === GAME_CONSTANTS.BLACK) black++;
                else if (boardState[r][c] === GAME_CONSTANTS.WHITE) white++;
            }
        }

        return { black, white };
    }

    /**
     * Add a message to the game log
     * @param {string} msg - Message to add
     */
    function logMessage(msg) {
        moveLog.push(msg);
        updateGameLog();
    }

    /**
     * Log a move in the game log
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} player - Player making the move (BLACK or WHITE)
     */
    function logMove(row, col, player) {
        const pName = getPlayerName(player);
        const colorIndicator = player === GAME_CONSTANTS.BLACK ? "(B)" : "(W)";
        const cL = String.fromCharCode(97 + col); // Convert to letter (a, b, c, ...)
        const rN = row + 1; // Convert to 1-based number

        logMessage(`${pName}${colorIndicator}: ${cL}${rN}`);
    }

    /**
     * Log a player passing their turn
     * @param {number} player - Player passing (BLACK or WHITE)
     */
    function logPass(player) {
        const pName = getPlayerName(player);
        logMessage(`${pName} passes`);
    }

    /**
     * Update the game log display
     */
    function updateGameLog() {
        if (!elements.gameLog) return;

        elements.gameLog.innerHTML = moveLog.join('<br>');
        elements.gameLog.scrollTop = elements.gameLog.scrollHeight;
    }

    /**
     * Update the timers display
     */
    function updateTimers() {
        if (!elements.blackTimer || !elements.whiteTimer) return;

        const blackSeconds = (blackTimeUsed / 1000).toFixed(2);
        const whiteSeconds = (whiteTimeUsed / 1000).toFixed(2);

        elements.blackTimer.textContent = `${blackSeconds}s`;
        elements.whiteTimer.textContent = `${whiteSeconds}s`;

        // Apply warning styles
        const blackTimerContainer = document.querySelector('.timer.black');
        const whiteTimerContainer = document.querySelector('.timer.white');

        if (blackTimerContainer) {
            blackTimerContainer.classList.toggle('warning', blackTimeUsed >= 6000);
            blackTimerContainer.classList.toggle('danger', blackTimeUsed >= 8000);
        }

        if (whiteTimerContainer) {
            whiteTimerContainer.classList.toggle('warning', whiteTimeUsed >= 6000);
            whiteTimerContainer.classList.toggle('danger', whiteTimeUsed >= 8000);
        }
    }

    /**
     * Get the player name based on current UI selection
     * @param {number} player - Player (BLACK or WHITE)
     * @returns {string} Player name
     */
    function getPlayerName(player) {
        const sel = player === GAME_CONSTANTS.BLACK ? elements.blackAISelect : elements.whiteAISelect;
        const ctrlId = sel.value;

        if (ctrlId === 'human') return 'Human';

        if (ctrlId.startsWith('custom_')) {
            const fullName = ctrlId.replace('custom_', '');
            // Truncate if too long
            if (fullName.length > 20) {
                return fullName.substring(0, 18) + '...';
            }
            return fullName;
        }

        if (typeof OthelloStrategies !== 'undefined' &&
            OthelloStrategies.getBuiltInStrategyNames().includes(ctrlId)) {
            return ctrlId.charAt(0).toUpperCase() + ctrlId.slice(1); // Capitalize
        }

        return '?';
    }

    /**
     * Update the game status display
     * @param {number} winner - Optional winner to display (BLACK, WHITE, or null for in-progress)
     */
    function updateStatus(winner = null) {
        if (!elements.status) return;

        const isGameRunning = typeof OthelloCore !== 'undefined' && OthelloCore.isGameRunning ?
            OthelloCore.isGameRunning() : false;

        const currentPlayer = typeof OthelloCore !== 'undefined' && OthelloCore.getCurrentPlayer ?
            OthelloCore.getCurrentPlayer() : GAME_CONSTANTS.BLACK;

        const scores = typeof OthelloCore !== 'undefined' && OthelloCore.countDiscs ?
            OthelloCore.countDiscs() : countDiscs(OthelloCore.getBoard());

        if (isGameRunning) {
            const ctrl = currentPlayer === GAME_CONSTANTS.BLACK ? elements.blackAISelect.value : elements.whiteAISelect.value;
            const pDisp = getPlayerName(currentPlayer);

            // Default status message
            elements.status.textContent = `${pDisp}'s turn (${scores.black}-${scores.white})`;

            // Add time display
            const blackTime = (blackTimeUsed / 1000).toFixed(1);
            const whiteTime = (whiteTimeUsed / 1000).toFixed(1);
            elements.status.textContent += ` [B:${blackTime}s W:${whiteTime}s]`;

            // Indicate if continuing due to fewer pieces rule
            const stageConfig = typeof OthelloCore !== 'undefined' && OthelloCore.getCurrentStage ?
                OthelloCore.getCurrentStage() : null;

            if (stageConfig && stageConfig.fewerPiecesContinue) {
                const playerHasFewerPieces =
                    (currentPlayer === GAME_CONSTANTS.BLACK && scores.black < scores.white) ||
                    (currentPlayer === GAME_CONSTANTS.WHITE && scores.white < scores.black);

                if (playerHasFewerPieces) {
                    elements.status.textContent += " (continuing - fewer pieces)";
                }
            }

            // Apply styling
            elements.status.className = 'status ' + (ctrl === 'human' ? '' : 'thinking');
            elements.status.style.backgroundColor = ctrl === 'human' ?
                (currentPlayer === GAME_CONSTANTS.BLACK ? '#333' : '#999') : '#FFC107';
        } else {
            // Game over state
            let msg = `Game over. `;

            // If loss was due to timeout
            if (winner !== null) {
                const winnerName = winner === GAME_CONSTANTS.BLACK ? "Black" : "White";
                msg += `${winnerName} wins! (${scores.black}-${scores.white})`;

                // Show timeout forfeit
                if ((winner === GAME_CONSTANTS.BLACK && whiteTimeUsed > GAME_CONSTANTS.MAX_AI_TIME_PER_GAME) ||
                    (winner === GAME_CONSTANTS.WHITE && blackTimeUsed > GAME_CONSTANTS.MAX_AI_TIME_PER_GAME)) {
                    msg += " (by time forfeit)";
                }
            } else {
                // Normal game end
                if (scores.black > scores.white) msg += `Black wins! (${scores.black}-${scores.white})`;
                else if (scores.white > scores.black) msg += `White wins! (${scores.black}-${scores.white})`;
                else msg += `Tie! (${scores.black}-${scores.white})`;
            }

            elements.status.textContent = msg;
            elements.status.style.backgroundColor = '#666';
        }

        // Update timers alongside status
        updateTimers();
    }

    /**
     * Display a message in the status area
     * @param {string} msg - Message to display
     * @param {string} type - Message type ('' for normal, 'thinking' for AI thinking, 'error' for errors)
     */
    function displayMessage(msg, type = '') {
        if (!elements.status) return;

        elements.status.textContent = msg;
        elements.status.className = 'status ' + type;
    }

    /**
     * Set up the board UI based on the given size
     * @param {number} boardSize - Board size
     */
    function setupBoardUI(boardSize) {
        if (!elements.board) return;

        const cellSize = GAME_CONSTANTS.DEFAULT_CELL_SIZE;

        // Clear existing board
        elements.board.innerHTML = '';

        // Set up grid layout
        elements.board.style.gridTemplateColumns = `repeat(${boardSize}, ${cellSize}px)`;
        elements.board.style.gridTemplateRows = `repeat(${boardSize}, ${cellSize}px)`;

        // Calculate board dimensions including gaps and padding
        const boardDimension = boardSize * cellSize +
            (boardSize - 1) * GAME_CONSTANTS.BOARD_GAP +
            2 * GAME_CONSTANTS.BOARD_PADDING;

        elements.board.style.width = `${boardDimension}px`;
        elements.board.style.height = `${boardDimension}px`;

        // Create cells
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                elements.board.appendChild(cell);
            }
        }
    }

    /**
     * Update the UI for preview mode
     */
    function updateUIForPreview() {
        if (!elements.status) return;

        elements.status.textContent = "Stage selected. Click Start Game button.";
        elements.status.style.backgroundColor = '#4CAF50';

        if (elements.startButton) {
            elements.startButton.disabled = false;
        }
    }

    /**
     * Enable the start button
     */
    function enableStartButton() {
        if (elements.startButton) {
            elements.startButton.disabled = false;
        }
    }

    /**
     * Handle human move on board click
     * @param {Event} event - Click event
     */
    function handleHumanMove(event) {
        // Only proceed if OthelloCore is available
        if (typeof OthelloCore === 'undefined') {
            console.error("OthelloCore module not available");
            return;
        }

        const currentPlayer = OthelloCore.getCurrentPlayer();
        const gameRunning = OthelloCore.isGameRunning();
        const gameOver = OthelloCore.isGameOver();
        const isHumanTurn = (currentPlayer === GAME_CONSTANTS.BLACK &&
            document.getElementById('black-ai').value === 'human') ||
            (currentPlayer === GAME_CONSTANTS.WHITE &&
                document.getElementById('white-ai').value === 'human');

        if (!isHumanTurn || !gameRunning || gameOver) return;

        // Only proceed if it's a human turn and game is running
        if (isHumanTurn && gameRunning && !aiThinking && !gameOver) {
            // Check if human has any valid moves
            const validMoves = OthelloCore.getValidMoves(currentPlayer);

            // If human has no valid moves, handle passing automatically
            if (validMoves.length === 0) {
                console.log(`Human player ${currentPlayer} has no valid moves. Passing automatically.`);
                logPass(currentPlayer);

                // Determine next player
                const opponent = currentPlayer === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;

                // Check if game should end (both players have no moves)
                const opponentMoves = OthelloCore.getValidMoves(opponent);
                if (opponentMoves.length === 0) {
                    console.log("Both players have no moves. Ending game.");
                    OthelloCore.endGame();
                    return;
                }

                // Pass to opponent
                OthelloCore.setCurrentPlayer(opponent);
                updateStatus();

                // Trigger opponent's turn (AI)
                if (typeof GameController !== 'undefined' && GameController.makeAIMove) {
                    GameController.makeAIMove(false);
                }
                return;
            }
        }

        // Original click handling logic - only process if clicked on a cell
        const cell = event.target.closest('.cell');
        if (!cell || !gameRunning || aiThinking || gameOver) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        // Check if it's currently a human's turn
        if (!isHumanTurn) return;

        if (OthelloCore.isValidMove(row, col, currentPlayer)) {
            console.log(`Human Move: P${currentPlayer} plays at R${row} C${col}`);
            OthelloCore.makeMove(row, col, currentPlayer); // Execute the move

            // Store current player before determining next player
            const previousPlayer = currentPlayer;

            // Determine next player
            const nextPlayer = OthelloCore.determineNextPlayer();
            OthelloCore.setCurrentPlayer(nextPlayer);
            updateStatus();

            // Check if it's the same player's turn again (fewer pieces rule)
            if (previousPlayer === nextPlayer) {
                console.log(`Player ${nextPlayer} continues (fewer pieces rule)`);
                logMessage(`${getPlayerName(nextPlayer)} continues (fewer pieces rule)`);

                // Check if the continuing player has valid moves
                const nextMoves = OthelloCore.getValidMoves(nextPlayer);
                if (nextMoves.length === 0) {
                    console.log(`Continuing player ${nextPlayer} has no valid moves. Passing.`);
                    logPass(nextPlayer);

                    // Force switch to other player
                    const otherPlayer = nextPlayer === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;
                    OthelloCore.setCurrentPlayer(otherPlayer);
                    updateStatus();
                }
            }

            // Check for game over
            const blackMoves = OthelloCore.getValidMoves(GAME_CONSTANTS.BLACK);
            const whiteMoves = OthelloCore.getValidMoves(GAME_CONSTANTS.WHITE);

            if (blackMoves.length === 0 && whiteMoves.length === 0) {
                console.log("Game end detected after human move - no valid moves for either player.");
                OthelloCore.endGame();
            } else {
                // Continue game if there are still valid moves
                console.log("Human move done, triggering next player check");
                if (typeof GameController !== 'undefined' && GameController.makeAIMove) {
                    GameController.makeAIMove(false);
                }
            }
        } else {
            console.log(`Human invalid move attempt at R${row} C${col}`);
            displayMessage("Invalid move!", 'error');
            setTimeout(() => updateStatus(), 1500);
        }
    }

    /**
     * Check if a player has exceeded the time limit
     * @param {number} player - Player to check (BLACK or WHITE)
     * @param {number} timeUsed - Time used by the player (ms)
     * @returns {boolean} True if time limit exceeded
     */
    function checkTimeLimit(player, timeUsed) {
        if (timeUsed > GAME_CONSTANTS.MAX_AI_TIME_PER_GAME) {
            const playerName = player === GAME_CONSTANTS.BLACK ? "Black" : "White";
            const aiName = getPlayerName(player);

            logMessage(`${playerName} (${aiName}) exceeded the time limit of ${GAME_CONSTANTS.MAX_AI_TIME_PER_GAME / 1000}s!`);

            const opponent = player === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;
            const opponentName = opponent === GAME_CONSTANTS.BLACK ? "Black" : "White";

            logMessage(`${opponentName} wins by time forfeit!`);

            // Get board to modify
            const board = OthelloCore.getBoard();

            // Change all of loser's pieces and empty cells to winner's color
            const winningColor = opponent;
            for (let r = 0; r < board.length; r++) {
                for (let c = 0; c < board[r].length; c++) {
                    if (board[r][c] !== GAME_CONSTANTS.BLOCKED && board[r][c] !== winningColor) {
                        board[r][c] = winningColor;
                    }
                }
            }

            updateBoardDisplay(board);
            OthelloCore.endGame(opponent);
            return true;
        }
        return false;
    }

    /**
     * Populate the stage select dropdown
     */
    function populateStageSelect() {
        if (!elements.stageSelect) return;

        elements.stageSelect.innerHTML = '';

        if (typeof stages === 'undefined' || !Array.isArray(stages)) {
            console.error("Stages not defined or not an array");
            return;
        }

        stages.forEach((stage, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${idx + 1}: ${stage.name}`;
            elements.stageSelect.appendChild(opt);
        });
    }

    /**
     * Set the AI thinking state
     * @param {boolean} thinking - AI thinking state
     */
    function setAIThinking(thinking) {
        aiThinking = thinking;
    }

    /**
     * Get the current move log
     * @returns {Array<string>} Array of log messages
     */
    function getMoveLog() {
        return [...moveLog];
    }

    /**
     * Clear the move log
     */
    function clearMoveLog() {
        moveLog = [];
        updateGameLog();
    }

    /**
     * Update the black time used
     * @param {number} time - Time used (ms)
     */
    function updateBlackTime(time) {
        blackTimeUsed = time;
        updateTimers();
    }

    /**
     * Update the white time used
     * @param {number} time - Time used (ms)
     */
    function updateWhiteTime(time) {
        whiteTimeUsed = time;
        updateTimers();
    }

    // Public API
    return {
        // Board and game display
        updateBoardDisplay,
        setupBoardUI,
        updateUIForPreview,
        updateStatus,
        displayMessage,
        enableStartButton,

        // Logging
        logMessage,
        logMove,
        logPass,
        updateGameLog,
        getMoveLog,
        clearMoveLog,

        // Player information
        getPlayerName,

        // Time tracking
        updateTimers,
        updateBlackTime,
        updateWhiteTime,
        checkTimeLimit,
        setAIThinking,

        // Setup functions
        populateStageSelect,

        // Event handlers
        handleHumanMove,

        // For direct access to elements
        getElement: (name) => elements[name] || null
    };
})();

// Export as a global object or use module exports if using bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OthelloUI;
}