/**
 * game-core.js
 * 
 * Core game mechanics for Othello
 * Contains the fundamental game logic including board management,
 * move validation, and move execution
 */

// Use IIFE to create a module and avoid global namespace pollution
const OthelloCore = (function () {
    // Private variables
    let board = [];
    let BOARD_SIZE = 8;
    let currentStage = null;
    let currentPlayer = GAME_CONSTANTS.BLACK;
    let gameRunning = false;
    let gameOver = false;

    /**
     * Check if coordinates are within board boundaries
     * @param {number} r - Row index
     * @param {number} c - Column index
     * @returns {boolean} True if coordinates are valid
     */
    function isWithinBoard(r, c) {
        return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
    }

    /**
     * Creates a new board based on stage configuration
     * @param {Object} stageConfig - Stage configuration object
     * @returns {Array<Array<number>>} 2D array representing the board
     */
    function createInitialBoard(stageConfig) {
        if (!stageConfig) {
            stageConfig = stages[0];
        }

        const boardSize = stageConfig.boardSize || 8;
        const newBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(GAME_CONSTANTS.EMPTY));

        if (stageConfig) {
            // Place blocked cells
            (stageConfig.initialBlocked || []).forEach(p => {
                if (isWithinBoard(p.r, p.c)) newBoard[p.r][p.c] = GAME_CONSTANTS.BLOCKED;
            });

            // Place Player 1 (Black) initial pieces
            (stageConfig.initialPlayer1 || []).forEach(p => {
                if (isWithinBoard(p.r, p.c) && newBoard[p.r][p.c] === GAME_CONSTANTS.EMPTY)
                    newBoard[p.r][p.c] = GAME_CONSTANTS.BLACK;
            });

            // Place Player 2 (White) initial pieces
            (stageConfig.initialPlayer2 || []).forEach(p => {
                if (isWithinBoard(p.r, p.c) && newBoard[p.r][p.c] === GAME_CONSTANTS.EMPTY)
                    newBoard[p.r][p.c] = GAME_CONSTANTS.WHITE;
            });
        } else {
            // Default setup for standard board
            const mid = Math.floor(boardSize / 2);
            newBoard[mid - 1][mid - 1] = GAME_CONSTANTS.WHITE;
            newBoard[mid - 1][mid] = GAME_CONSTANTS.BLACK;
            newBoard[mid][mid - 1] = GAME_CONSTANTS.BLACK;
            newBoard[mid][mid] = GAME_CONSTANTS.WHITE;
        }

        return newBoard;
    }

    /**
     * Initialize the game board with given stage configuration
     * @param {Object} stageConfig - Stage configuration object
     * @param {boolean} isPreview - If true, just preview board without starting the game
     */
    function initializeBoard(stageConfig, isPreview = false) {
        console.log(`Init board. Stage:${stageConfig ? stageConfig.name : 'Default'}, Preview:${isPreview}`);

        currentStage = stageConfig;
        BOARD_SIZE = stageConfig ? stageConfig.boardSize : 8;
        board = createInitialBoard(stageConfig);

        // Call UI update function
        if (typeof OthelloUI !== 'undefined' && OthelloUI.updateBoardDisplay) {
            OthelloUI.updateBoardDisplay(board);
        }

        // Game state initialization if not preview
        if (!isPreview) {
            currentPlayer = GAME_CONSTANTS.BLACK;
            gameOver = false;
            gameRunning = false;

            // Update UI status
            if (typeof OthelloUI !== 'undefined') {
                if (OthelloUI.updateStatus) OthelloUI.updateStatus();
                if (OthelloUI.updateGameLog) OthelloUI.updateGameLog();
            }
        } else {
            // Preview mode
            gameOver = true;

            // Update UI for preview
            if (typeof OthelloUI !== 'undefined' && OthelloUI.updateUIForPreview) {
                OthelloUI.updateUIForPreview();
            }
        }
    }

    /**
     * Check if a move is valid according to Othello rules
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} player - Player making the move (BLACK or WHITE)
     * @param {Array<Array<number>>} currentBoard - Board to check against (default: current board)
     * @returns {boolean} True if the move is valid
     */
    function isValidMove(row, col, player, currentBoard = board) {
        // Check if the move is within the board and the cell is empty
        if (!isWithinBoard(row, col) || currentBoard[row][col] !== GAME_CONSTANTS.EMPTY) {
            return false;
        }

        const opponent = player === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;
        const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

        // Get current stage configuration for the special rule check
        const stageConfig = currentStage || stages[0];
        const ignoreOcclusion = stageConfig.ignoreOcclusion || false;

        // For each direction from the placed piece
        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            let foundOpponent = false;
            let foundBlocked = false;

            // Search for opponent's pieces
            while (isWithinBoard(r, c)) {
                if (currentBoard[r][c] === opponent) {
                    foundOpponent = true;
                }
                else if (currentBoard[r][c] === GAME_CONSTANTS.BLOCKED) {
                    foundBlocked = true;
                    // In normal rules, a blocked cell ends the search.
                    // With ignoreOcclusion=true, we continue through blocked cells
                    if (!ignoreOcclusion) {
                        break;
                    }
                }
                else if (currentBoard[r][c] === GAME_CONSTANTS.EMPTY) {
                    // An empty cell always ends the search
                    break;
                }
                else if (currentBoard[r][c] === player) {
                    // Found current player's piece, which could complete a valid move
                    // Valid if we found at least one opponent's piece and:
                    // - either no blocked cells
                    // - or ignoreOcclusion is true (blocked cells can be jumped over)
                    if (foundOpponent && (!foundBlocked || ignoreOcclusion)) {
                        return true;
                    }
                    break;
                }

                // Continue in the same direction
                r += dr;
                c += dc;
            }
        }

        // No valid move found in any direction
        return false;
    }

    /**
     * Get all valid moves for a player
     * @param {number} player - Player to check moves for (BLACK or WHITE)
     * @param {Array<Array<number>>} currentBoard - Board to check against (default: current board)
     * @returns {Array<Object>} Array of valid move positions {row, col}
     */
    function getValidMoves(player, currentBoard = board) {
        const moves = [];
        // Ensure we're using the correct board size from the current board
        const size = currentBoard.length;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (isValidMove(r, c, player, currentBoard)) {
                    moves.push({ row: r, col: c });
                }
            }
        }

        return moves;
    }

    /**
     * Execute a move on the board
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} player - Player making the move (BLACK or WHITE)
     * @returns {boolean} True if the move was successful
     */
    function makeMove(row, col, player) {
        if (!isWithinBoard(row, col) || board[row][col] !== GAME_CONSTANTS.EMPTY) return false;

        board[row][col] = player;

        // Log the move if UI available
        if (typeof OthelloUI !== 'undefined' && OthelloUI.logMove) {
            OthelloUI.logMove(row, col, player);
        }

        const opponent = player === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;
        const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

        // Get current stage configuration for the special rule check
        const stageConfig = currentStage || stages[0];
        const ignoreOcclusion = stageConfig.ignoreOcclusion || false;

        // Pieces captured by this move
        const capturedPieces = [];
        let flipped = false;

        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            const toFlip = [];
            let foundBlocked = false;
            let foundOpponent = false;

            // Collect pieces to flip, considering blocked cells
            while (isWithinBoard(r, c)) {
                if (board[r][c] === opponent) {
                    toFlip.push([r, c]);
                    foundOpponent = true;
                }
                else if (board[r][c] === GAME_CONSTANTS.BLOCKED) {
                    foundBlocked = true;
                    // In normal rules, a blocked cell ends the search
                    if (!ignoreOcclusion) {
                        break;
                    }
                    // We continue past the blocked cell but don't add it to toFlip
                }
                else if (board[r][c] === GAME_CONSTANTS.EMPTY) {
                    // Empty cell always stops the search
                    break;
                }
                else if (board[r][c] === player) {
                    // Found the player's piece, check if we can flip
                    if (foundOpponent && toFlip.length > 0 && (!foundBlocked || ignoreOcclusion)) {
                        flipped = true;
                        // Flip all collected pieces
                        for (const [fr, fc] of toFlip) {
                            board[fr][fc] = player;
                            capturedPieces.push([fr, fc]); // Record flipped pieces
                        }
                    }
                    break;
                }

                r += dr;
                c += dc;
            }
        }

        // Log move to game logger if available
        if (typeof GameLogger !== 'undefined' && GameLogger.logMove) {
            GameLogger.logMove(
                player,
                { row, col },
                Array.from(board, row => [...row]), // Deep copy of board state
                capturedPieces.length
            );
        }

        // Update UI
        if (typeof OthelloUI !== 'undefined' && OthelloUI.updateBoardDisplay) {
            OthelloUI.updateBoardDisplay(board);
        }

        return flipped;
    }

    /**
     * Determine the next player based on game rules
     * @returns {number} Next player (BLACK or WHITE)
     */
    function determineNextPlayer() {
        // Check if the current stage has the fewerPiecesContinue rule
        const stageConfig = currentStage || stages[0];
        const fewerPiecesContinue = stageConfig.fewerPiecesContinue || false;

        // If rule isn't active, just alternate turns as usual
        if (!fewerPiecesContinue) {
            return currentPlayer === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;
        }

        // Count pieces for each player
        const scores = countDiscs();

        // Determine who has fewer pieces
        if (scores.black < scores.white) {
            return GAME_CONSTANTS.BLACK; // Black has fewer pieces, so Black plays again
        } else if (scores.white < scores.black) {
            return GAME_CONSTANTS.WHITE; // White has fewer pieces, so White plays again
        } else {
            // Equal number of pieces, alternate turns
            return currentPlayer === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;
        }
    }

    /**
     * Count the number of discs for each player
     * @param {Array<Array<number>>} boardState - Optional board state to count from (default: current board)
     * @returns {Object} Object with counts {black, white}
     */
    function countDiscs(boardState = board) {
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
     * End the current game and record results
     * @param {number} winner - The winning player (BLACK, WHITE, or null for tie)
     */
    function endGame(winner = null) {
        if (!gameRunning) return;

        gameRunning = false;
        gameOver = true;

        const scores = countDiscs();

        // Determine winner if not provided
        if (winner === null) {
            if (scores.black > scores.white) winner = GAME_CONSTANTS.BLACK;
            else if (scores.white > scores.black) winner = GAME_CONSTANTS.WHITE;
        }

        // Update UI status
        if (typeof OthelloUI !== 'undefined') {
            if (OthelloUI.updateStatus) OthelloUI.updateStatus(winner);

            // Log final result
            if (OthelloUI.logMessage) {
                OthelloUI.logMessage(`Game over: Final score ${scores.black}-${scores.white}`);

                if (winner === GAME_CONSTANTS.BLACK) {
                    OthelloUI.logMessage(`Black wins!`);
                } else if (winner === GAME_CONSTANTS.WHITE) {
                    OthelloUI.logMessage(`White wins!`);
                } else {
                    OthelloUI.logMessage(`Tie!`);
                }
            }
        }

        // Save game data if logger available
        if (typeof GameLogger !== 'undefined' && GameLogger.saveGameWithLog) {
            const blackName = typeof OthelloUI !== 'undefined' && OthelloUI.getPlayerName ?
                OthelloUI.getPlayerName(GAME_CONSTANTS.BLACK) : "Black";
            const whiteName = typeof OthelloUI !== 'undefined' && OthelloUI.getPlayerName ?
                OthelloUI.getPlayerName(GAME_CONSTANTS.WHITE) : "White";

            GameLogger.saveGameWithLog(
                scores.black,
                scores.white,
                blackName,
                whiteName,
                currentStage,
                typeof OthelloUI !== 'undefined' && OthelloUI.getMoveLog ? OthelloUI.getMoveLog() : []
            );
        }

        // Enable start button in UI if available
        if (typeof OthelloUI !== 'undefined' && OthelloUI.enableStartButton) {
            OthelloUI.enableStartButton();
        }
    }

    // Public API
    return {
        // Board functions
        initializeBoard,
        createInitialBoard,
        isWithinBoard,
        isValidMove,
        getValidMoves,
        makeMove,
        countDiscs,

        // Game state functions
        determineNextPlayer,
        endGame,

        // Getters for internal state
        getBoard: () => board,
        getCurrentPlayer: () => currentPlayer,
        getBoardSize: () => BOARD_SIZE,
        getCurrentStage: () => currentStage,
        isGameRunning: () => gameRunning,
        isGameOver: () => gameOver,

        // Setters for internal state
        setCurrentPlayer: (player) => { currentPlayer = player; },
        setGameRunning: (running) => { gameRunning = running; },
        setGameOver: (over) => { gameOver = over; }
    };
})();

// Export as a global object or use module exports if using bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OthelloCore;
}