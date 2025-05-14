/**
 * game-rollout.js
 * 
 * Game replay functionality for Othello Arena
 * Handles game replay, navigation, and visualization of game history
 */

const GameRollout = (function () {
    /**
     * GameRollout class - Manages game replay functionality
     */
    class GameRollout {
        /**
         * Create a new GameRollout instance
         * @param {Object} boardController - Board controller object
         * @param {Object} gameLogger - Game logger object
         */
        constructor(boardController, gameLogger) {
            this.gameBoard = boardController;
            this.gameLogger = gameLogger;
            this.isRolling = false;
            this.currentMoveIndex = -1;
            this.rolloutSpeed = 2; // Default speed in ms
            this.rolloutTimer = null;
            this.currentGameIndex = 0; // Track current game index
            this.gameStartIndices = [0]; // Store starting indices of each game
            this.movesPerGame = []; // Store move counts for each game
            this.targetEndIndex = -1; // Target end index for playback
        }

        /**
         * Analyze game boundaries based on board reset patterns
         */
        analyzeGameBoundaries() {
            const logs = this.gameLogger.getLogs();

            if (!logs || !logs.boards || logs.boards.length === 0) {
                this.gameStartIndices = [0];
                this.movesPerGame = [];
                return;
            }

            // Always start with first game at index 0
            this.gameStartIndices = [0];
            this.movesPerGame = [];

            // Initial board state of the first game
            const initialBoardState = logs.boards[0];

            // Look for board resets (return to initial state)
            for (let i = 1; i < logs.boards.length; i++) {
                const currentBoard = logs.boards[i];

                // Check if this board matches the initial state pattern
                if (this.isBoardReset(currentBoard, initialBoardState)) {
                    this.gameStartIndices.push(i);

                    // Calculate moves for previous game
                    if (this.gameStartIndices.length > 1) {
                        const prevStart = this.gameStartIndices[this.gameStartIndices.length - 2];
                        this.movesPerGame.push(i - prevStart);
                    }
                }
            }

            // Add the moves for the last game
            if (this.gameStartIndices.length > 0) {
                const lastStart = this.gameStartIndices[this.gameStartIndices.length - 1];
                this.movesPerGame.push(logs.boards.length - lastStart);
            } else {
                this.movesPerGame.push(logs.boards.length);
            }

            console.log("Game boundaries identified by board resets:", this.gameStartIndices);
            console.log("Moves per game:", this.movesPerGame);
        }

        /**
         * Check if a board represents a reset to initial game state
         * @param {Array<Array<number>>} board - Board to check
         * @param {Array<Array<number>>} initialBoard - Initial board state
         * @returns {boolean} True if the board represents a reset
         */
        isBoardReset(board, initialBoard) {
            // Board size check
            if (board.length !== initialBoard.length) return false;

            // For Othello, compare the boards to see if they match the initial state
            let patternMatch = true;
            for (let r = 0; r < board.length; r++) {
                for (let c = 0; c < board[r].length; c++) {
                    if (board[r][c] !== initialBoard[r][c]) {
                        patternMatch = false;
                        break;
                    }
                }
                if (!patternMatch) break;
            }

            // If exact match, it's definitely a reset
            if (patternMatch) return true;

            // As a backup, check for initial piece configuration
            // (2 black and 2 white pieces in center for standard Othello)
            let blackCount = 0;
            let whiteCount = 0;
            let emptyCount = 0;

            for (let r = 0; r < board.length; r++) {
                for (let c = 0; c < board[r].length; c++) {
                    if (board[r][c] === GAME_CONSTANTS.BLACK) blackCount++;
                    else if (board[r][c] === GAME_CONSTANTS.WHITE) whiteCount++;
                    else if (board[r][c] === GAME_CONSTANTS.EMPTY) emptyCount++;
                }
            }

            // Initial state typically has 2 black and 2 white pieces and most cells are empty
            const boardSize = board.length * board[0].length;
            const hasInitialPieceCount = (blackCount === 2 && whiteCount === 2);
            const mostlyEmpty = (emptyCount >= boardSize - 8); // Allow for some blocked cells

            return hasInitialPieceCount && mostlyEmpty;
        }

        /**
         * Calculate current turn number within the current game
         * @returns {number} Current turn number (1-based)
         */
        getCurrentGameTurn() {
            if (this.currentMoveIndex < 0) return 0;

            // Find the starting index of the current game
            let gameStartIndex = 0;
            let gameIndex = 0;

            for (let i = this.gameStartIndices.length - 1; i >= 0; i--) {
                if (this.gameStartIndices[i] <= this.currentMoveIndex) {
                    gameStartIndex = this.gameStartIndices[i];
                    gameIndex = i;
                    break;
                }
            }

            this.currentGameIndex = gameIndex;
            // Calculate turn number within current game (1-based)
            return this.currentMoveIndex - gameStartIndex + 1;
        }

        /**
         * Get total number of turns in the current game
         * @returns {number} Total number of turns
         */
        getCurrentGameTotalTurns() {
            // Run analysis if not done yet
            if (this.gameStartIndices.length <= 1 && this.movesPerGame.length === 0) {
                this.analyzeGameBoundaries();
            }

            const gameIndex = this.currentGameIndex;

            // Use pre-calculated turn counts if available
            if (gameIndex < this.movesPerGame.length) {
                return this.movesPerGame[gameIndex];
            }

            // Calculate based on next game's starting point if turn counts not available
            const gameStartIndex = this.gameStartIndices[gameIndex];
            const nextGameIndex = gameIndex + 1 < this.gameStartIndices.length ?
                this.gameStartIndices[gameIndex + 1] :
                this.gameLogger.getLogs().moves.length;

            return nextGameIndex - gameStartIndex;
        }

        /**
         * Get current simulation index
         * @returns {number} Current game index
         */
        getCurrentSimulationIndex() {
            return this.currentGameIndex;
        }

        /**
         * Start rollout playback
         * @param {number} startIndex - Start move index (-1 for board before any moves)
         * @param {number} endIndex - End move index (-1 for end of game)
         * @returns {boolean} Success status
         */
        start(startIndex = -1, endIndex = -1) {
            if (this.isRolling) {
                this.stop();
            }

            // Get logs from gameLogger
            const logs = this.gameLogger.getLogs();

            // Check if current game logs are empty
            if (!logs || !logs.moves || logs.moves.length === 0) {
                // Check if previous games data is available
                if (this.gameLogger.previousGames && this.gameLogger.previousGames.length > 0) {
                    console.log("Using previousGames data for replay, game index:", this.currentGameIndex);
                    const selectedGame = this.gameLogger.previousGames[this.currentGameIndex];

                    // Check if this game is valid
                    if (selectedGame && selectedGame.moves && selectedGame.moves.length > 0 &&
                        selectedGame.boards && selectedGame.boards.length > 0) {

                        // Get board size
                        const boardSize = selectedGame.boards[0].length;
                        console.log("Game board size:", boardSize);

                        // Update global board size if available
                        if (typeof BOARD_SIZE !== 'undefined') {
                            console.log(`Updating global BOARD_SIZE: ${BOARD_SIZE} → ${boardSize}`);
                            BOARD_SIZE = boardSize;
                        }

                        // Check current board UI size
                        const boardElement = document.getElementById('board');
                        if (boardElement) {
                            const currentBoardSize = boardElement.style.gridTemplateColumns.match(/repeat\((\d+)/);
                            const uiBoardSize = currentBoardSize ? parseInt(currentBoardSize[1]) : 0;

                            // Reset UI if board size different
                            if (uiBoardSize !== boardSize) {
                                console.log(`Board UI size mismatch: ${uiBoardSize} → ${boardSize}`);
                                this._resetBoardUI(boardSize);
                            }
                        }

                        // Set up game state
                        this.isRolling = true;
                        this.currentMoveIndex = Math.max(0, Math.min(startIndex, selectedGame.moves.length - 1));
                        this.targetEndIndex = (endIndex < 0) ? selectedGame.moves.length - 1 :
                            Math.min(endIndex, selectedGame.moves.length - 1);

                        // Create custom display state function for previousGames data
                        const displayState = () => {
                            const currentBoard = selectedGame.boards[this.currentMoveIndex];
                            if (currentBoard) {
                                // Check board data
                                console.log(`Current board data size: ${currentBoard.length}x${currentBoard[0].length}`);
                                this.gameBoard.setBoard(currentBoard);

                                // Update current player indicator
                                const currentPlayer = selectedGame.players[this.currentMoveIndex];
                                this.gameBoard.updatePlayerIndicator(currentPlayer);

                                // Highlight move position (if available)
                                if (this.currentMoveIndex >= 0) {
                                    const move = selectedGame.moves[this.currentMoveIndex];
                                    if (move && move.position) {
                                        this.gameBoard.highlightCell(move.position.row, move.position.col);
                                    }
                                }
                            }
                        };

                        // Display initial state
                        displayState();

                        // Override _displayCurrentState method temporarily
                        const originalDisplayState = this._displayCurrentState;
                        this._displayCurrentState = displayState;

                        // Force board display update if available
                        if (typeof updateBoardDisplay === 'function') {
                            console.log("Forcing board display update");
                            updateBoardDisplay();
                        }

                        // Schedule next moves
                        this._scheduleNextMove();

                        // Update UI controls
                        if (typeof updateRolloutControls === 'function') {
                            updateRolloutControls();
                        }

                        return true;
                    }
                }

                console.warn("No game logs available for rollout.");
                return false;
            }

            // Original code for when current logs are available
            this.analyzeGameBoundaries();
            this.isRolling = true;
            this.currentMoveIndex = Math.max(0, Math.min(startIndex, logs.moves.length - 1));
            this.targetEndIndex = (endIndex < 0) ? logs.moves.length - 1 : Math.min(endIndex, logs.moves.length - 1);
            this._displayCurrentState();
            this._scheduleNextMove();

            // Update UI controls
            if (typeof updateRolloutControls === 'function') {
                updateRolloutControls();
            }

            return true;
        }

        /**
         * Stop rollout
         * @returns {number} Current move index
         */
        stop() {
            if (this.rolloutTimer) {
                clearTimeout(this.rolloutTimer);
                this.rolloutTimer = null;
            }
            this.isRolling = false;

            // Update UI controls
            if (typeof updateRolloutControls === 'function') {
                updateRolloutControls();
            }

            return this.currentMoveIndex;
        }

        /**
         * Pause rollout
         * @returns {number} Current move index
         */
        pause() {
            if (this.rolloutTimer) {
                clearTimeout(this.rolloutTimer);
                this.rolloutTimer = null;
            }
            this.isRolling = false;

            // Update UI controls
            if (typeof updateRolloutControls === 'function') {
                updateRolloutControls();
            }

            return this.currentMoveIndex;
        }

        /**
         * Resume rollout
         * @returns {boolean} Success status
         */
        resume() {
            if (!this.isRolling && this.currentMoveIndex >= 0) {
                this.isRolling = true;

                // Update UI controls
                if (typeof updateRolloutControls === 'function') {
                    updateRolloutControls();
                }

                this._scheduleNextMove();
                return true;
            }
            return false;
        }

        /**
         * Set rollout speed
         * @param {number} speedInMs - Speed in milliseconds
         * @returns {number} Updated speed
         */
        setSpeed(speedInMs) {
            this.rolloutSpeed = Math.max(2, speedInMs); // Minimum speed 2ms
            return this.rolloutSpeed;
        }

        /**
         * Jump to specific move
         * @param {number} moveIndex - Move index
         * @returns {boolean} Success status
         */
        jumpToMove(moveIndex) {
            const logs = this.gameLogger.getLogs();
            const usePreviousGame = !logs || !logs.moves || logs.moves.length === 0;

            // Handle special case for Turn 0
            if (moveIndex === -1) {
                this.currentMoveIndex = -1;

                if (usePreviousGame && this.gameLogger.previousGames &&
                    this.gameLogger.previousGames.length > 0) {
                    // Get current selected game
                    const selectedGame = this.gameLogger.previousGames[this.currentGameIndex];
                    if (selectedGame) {
                        // Find stage config
                        let stageConfig = null;
                        if (selectedGame.metadata && selectedGame.metadata.stage) {
                            stageConfig = stages.find(s => s.name === selectedGame.metadata.stage);
                        }

                        // Find stage config by board size
                        if (!stageConfig && selectedGame.boards && selectedGame.boards.length > 0) {
                            const boardSize = selectedGame.boards[0].length;
                            stageConfig = stages.find(s => s.boardSize === boardSize);
                        }

                        // Use default stage
                        if (!stageConfig) {
                            stageConfig = stages[0];
                        }

                        // Check current board UI size
                        const boardElement = document.getElementById('board');
                        const currentBoardSize = boardElement.style.gridTemplateColumns.match(/repeat\((\d+)/);
                        const uiBoardSize = currentBoardSize ? parseInt(currentBoardSize[1]) : 0;

                        // Reset UI if board size different
                        if (uiBoardSize !== stageConfig.boardSize) {
                            this._resetBoardUI(stageConfig.boardSize);
                        }

                        // Display initial board state
                        if (typeof createInitialBoard === 'function') {
                            const firstBoard = createInitialBoard(stageConfig);
                            this.gameBoard.setBoard(firstBoard);
                        } else if (typeof OthelloCore !== 'undefined' && OthelloCore.createInitialBoard) {
                            const firstBoard = OthelloCore.createInitialBoard(stageConfig);
                            this.gameBoard.setBoard(firstBoard);
                        }

                        // Update UI controls
                        if (typeof updateRolloutControls === 'function') {
                            updateRolloutControls();
                        }

                        return true;
                    }
                }
            }

            let result = false;

            // Handle previous games data
            if (usePreviousGame) {
                if (this.gameLogger.previousGames && this.gameLogger.previousGames.length > 0) {
                    const selectedGame = this.gameLogger.previousGames[this.currentGameIndex];
                    if (selectedGame && selectedGame.moves && moveIndex >= 0 && moveIndex < selectedGame.moves.length) {
                        this.currentMoveIndex = moveIndex;

                        // Check board size and reset UI if needed
                        const boardSize = selectedGame.boards[0].length;
                        const boardElement = document.getElementById('board');
                        if (boardElement) {
                            const currentBoardSize = boardElement.style.gridTemplateColumns.match(/repeat\((\d+)/);
                            const uiBoardSize = currentBoardSize ? parseInt(currentBoardSize[1]) : 0;

                            if (uiBoardSize !== boardSize) {
                                this._resetBoardUI(boardSize);
                            }
                        }

                        // Display state using previousGames data
                        const currentBoard = selectedGame.boards[this.currentMoveIndex];
                        if (currentBoard) {
                            this.gameBoard.setBoard(currentBoard);

                            // Update current player indicator
                            const currentPlayer = selectedGame.players[this.currentMoveIndex];
                            this.gameBoard.updatePlayerIndicator(currentPlayer);

                            // Highlight move position
                            if (this.currentMoveIndex >= 0) {
                                const move = selectedGame.moves[this.currentMoveIndex];
                                if (move && move.position) {
                                    this.gameBoard.highlightCell(move.position.row, move.position.col);
                                }
                            }
                        }
                        result = true;
                    }
                }
            } else {
                // Original code for current logs
                if (!logs || !logs.moves || moveIndex < 0 || moveIndex >= logs.moves.length) {
                    result = false;
                } else {
                    this.currentMoveIndex = moveIndex;
                    this._displayCurrentState();
                    result = true;
                }
            }

            // Update UI controls
            if (typeof updateRolloutControls === 'function') {
                updateRolloutControls();
            }

            return result;
        }

        /**
         * Move to next move
         * @returns {boolean} Success status
         */
        next() {
            console.trace("next() called");
            // Get logs (either current or from previousGames)
            const logs = this.gameLogger.getLogs();
            const usePreviousGame = !logs || !logs.moves || logs.moves.length === 0;
            let result = false;

            if (usePreviousGame) {
                // Using previousGames data
                if (this.gameLogger.previousGames && this.gameLogger.previousGames.length > 0) {
                    const selectedGame = this.gameLogger.previousGames[this.currentGameIndex];
                    if (selectedGame && selectedGame.moves && this.currentMoveIndex < selectedGame.moves.length - 1) {
                        this.currentMoveIndex++;

                        // Display state using previousGames data
                        const currentBoard = selectedGame.boards[this.currentMoveIndex];
                        if (currentBoard) {
                            this.gameBoard.setBoard(currentBoard);

                            // Update current player indicator
                            const currentPlayer = selectedGame.players[this.currentMoveIndex];
                            this.gameBoard.updatePlayerIndicator(currentPlayer);

                            // Highlight move position
                            if (this.currentMoveIndex >= 0) {
                                const move = selectedGame.moves[this.currentMoveIndex];
                                if (move && move.position) {
                                    this.gameBoard.highlightCell(move.position.row, move.position.col);
                                }
                            }
                        }
                        result = true;
                    }
                }
            } else {
                // Original code for current logs
                if (this.currentMoveIndex < logs.moves.length - 1) {
                    this.currentMoveIndex++;
                    this._displayCurrentState();
                    result = true;
                }
            }
            return result;
        }

        /**
         * Move to previous move
         * @returns {boolean} Success status
         */
        previous() {
            // Get logs (either current or from previousGames)
            const logs = this.gameLogger.getLogs();
            const usePreviousGame = !logs || !logs.moves || logs.moves.length === 0;
            let result = false;

            if (usePreviousGame) {
                // Using previousGames data
                if (this.gameLogger.previousGames && this.gameLogger.previousGames.length > 0) {
                    const selectedGame = this.gameLogger.previousGames[this.currentGameIndex];
                    if (selectedGame && selectedGame.moves && this.currentMoveIndex > 0) {
                        this.currentMoveIndex--;

                        // Display state using previousGames data
                        const currentBoard = selectedGame.boards[this.currentMoveIndex];
                        if (currentBoard) {
                            this.gameBoard.setBoard(currentBoard);

                            // Update current player indicator
                            const currentPlayer = selectedGame.players[this.currentMoveIndex];
                            this.gameBoard.updatePlayerIndicator(currentPlayer);

                            // Highlight move position
                            if (this.currentMoveIndex >= 0) {
                                const move = selectedGame.moves[this.currentMoveIndex];
                                if (move && move.position) {
                                    this.gameBoard.highlightCell(move.position.row, move.position.col);
                                }
                            }
                        }
                        result = true;
                    }
                }
            } else {
                // Original code for current logs
                if (this.currentMoveIndex > 0) {
                    this.currentMoveIndex--;
                    this._displayCurrentState();
                    result = true;
                }
            }
            return result;
        }

        /**
         * Reset board UI to specified size
         * @param {number} boardSize - Board size
         * @private
         */
        _resetBoardUI(boardSize) {
            // Get board element
            const boardElement = document.getElementById('board');
            if (!boardElement) {
                console.error("Board element not found");
                return;
            }

            console.log(`Resetting board UI to ${boardSize}x${boardSize}`);

            // Reset board UI
            const cellSize = 50; // Default cell size
            boardElement.innerHTML = ''; // Remove all cells
            boardElement.style.gridTemplateColumns = `repeat(${boardSize}, ${cellSize}px)`;
            boardElement.style.gridTemplateRows = `repeat(${boardSize}, ${cellSize}px)`;

            // Calculate board dimensions
            const boardDim = boardSize * cellSize + (boardSize - 1) * 1 + 8;
            boardElement.style.width = `${boardDim}px`;
            boardElement.style.height = `${boardDim}px`;

            // Create new cells
            for (let r = 0; r < boardSize; r++) {
                for (let c = 0; c < boardSize; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.dataset.row = r;
                    cell.dataset.col = c;
                    cell.style.width = `${cellSize}px`;
                    cell.style.height = `${cellSize}px`;
                    boardElement.appendChild(cell);
                }
            }

            // Update UI controls
            if (typeof updateRolloutControls === 'function') {
                updateRolloutControls();
            }
        }

        /**
         * Display current state
         * @private
         */
        _displayCurrentState() {
            const board = this.gameLogger.getBoardAtMove(this.currentMoveIndex);
            if (board) {
                this.gameBoard.setBoard(board);

                // Update UI for current player
                const currentPlayer = this.gameLogger.getPlayerAtMove(this.currentMoveIndex);
                this.gameBoard.updatePlayerIndicator(currentPlayer);

                // Highlight move position
                if (this.currentMoveIndex >= 0) {
                    const move = this.gameLogger.getLogs().moves[this.currentMoveIndex];
                    if (move && move.position) {
                        this.gameBoard.highlightCell(move.position.row, move.position.col);
                    }
                }
            }
        }

        /**
         * Schedule next move
         * @private
         */
        _scheduleNextMove() {
            if (!this.isRolling) return;

            if (this.currentMoveIndex < this.targetEndIndex) {
                this.rolloutTimer = setTimeout(() => {
                    this.next();

                    // Update move slider if available
                    const moveSlider = document.getElementById('rollout-moves');
                    if (moveSlider) {
                        moveSlider.value = this.currentMoveIndex;
                    }

                    this._scheduleNextMove();
                }, this.rolloutSpeed);
            } else {
                this.isRolling = false;

                // Update UI controls
                if (typeof updateRolloutControls === 'function') {
                    updateRolloutControls();
                }
            }
        }

        /**
         * Move to next game
         * @returns {boolean} Success status
         */
        nextGame() {
            if (this.gameLogger.previousGames &&
                this.currentGameIndex < this.gameLogger.previousGames.length - 1) {
                this.currentGameIndex++;
                this.currentMoveIndex = -1; // Reset to Turn 0

                // Get selected game data
                const selectedGame = this.gameLogger.previousGames[this.currentGameIndex];
                if (!selectedGame || !selectedGame.boards || selectedGame.boards.length === 0) {
                    console.error("Invalid game data");
                    return false;
                }

                // Get board size and stage config
                const boardSize = selectedGame.boards[0].length;
                let stageConfig = null;

                // Find stage config
                if (selectedGame.metadata && selectedGame.metadata.stage) {
                    stageConfig = stages.find(s => s.name === selectedGame.metadata.stage);
                }
                if (!stageConfig) {
                    stageConfig = stages.find(s => s.boardSize === boardSize) || stages[0];
                }

                // Update global variables
                if (typeof BOARD_SIZE !== 'undefined') {
                    BOARD_SIZE = boardSize;
                }

                // Create new board array if needed
                if (typeof board !== 'undefined') {
                    board = Array(boardSize).fill().map(() => Array(boardSize).fill(GAME_CONSTANTS.EMPTY));
                }

                // Reset board UI
                this._resetBoardUI(boardSize);

                // Update stage
                if (typeof currentStage !== 'undefined') {
                    currentStage = stageConfig;
                }

                // Reset game state
                if (typeof gameRunning !== 'undefined') gameRunning = false;
                if (typeof gameOver !== 'undefined') gameOver = true;

                // Update UI elements
                const startButton = document.getElementById('start-btn');
                if (startButton) startButton.disabled = false;

                const statusElement = document.getElementById('status');
                if (statusElement) {
                    statusElement.textContent = "Ready to start.";
                    statusElement.style.backgroundColor = '#4CAF50';
                }

                // Reset game
                if (typeof resetGame === 'function') {
                    resetGame(stageConfig, true);
                }

                // Set board
                this.gameBoard.setBoard(typeof board !== 'undefined' ? board : Array(boardSize).fill().map(() => Array(boardSize).fill(GAME_CONSTANTS.EMPTY)));

                // Update log input
                const logInput = document.getElementById('log-input');
                if (logInput) {
                    if (selectedGame.logText) {
                        logInput.value = selectedGame.logText;
                    } else if (selectedGame.metadata) {
                        logInput.value = `Game ${this.currentGameIndex + 1}: ${selectedGame.metadata.blackStrategy}(B) vs ${selectedGame.metadata.whiteStrategy}(W) on ${selectedGame.metadata.stage}`;
                    }
                }

                // Update UI controls
                if (typeof updateRolloutControls === 'function') {
                    updateRolloutControls();
                }

                return true;
            }
            return false;
        }

        // Helper function to create a basic board (fallback)
        createBasicBoard(stageConfig) {
            const size = stageConfig.boardSize || 8;
            const board = Array(size).fill().map(() => Array(size).fill(0));

            // Place initial pieces
            if (stageConfig.initialPlayer1) {
                stageConfig.initialPlayer1.forEach(p => {
                    if (p.r >= 0 && p.r < size && p.c >= 0 && p.c < size) {
                        board[p.r][p.c] = 1; // BLACK
                    }
                });
            }

            if (stageConfig.initialPlayer2) {
                stageConfig.initialPlayer2.forEach(p => {
                    if (p.r >= 0 && p.r < size && p.c >= 0 && p.c < size) {
                        board[p.r][p.c] = 2; // WHITE
                    }
                });
            }

            if (stageConfig.initialBlocked) {
                stageConfig.initialBlocked.forEach(p => {
                    if (p.r >= 0 && p.r < size && p.c >= 0 && p.c < size) {
                        board[p.r][p.c] = 3; // BLOCKED
                    }
                });
            }

            return board;
        }

        /**
         * Move to previous game
         * @returns {boolean} Success status
         */
        previousGame() {
            if (this.gameLogger.previousGames && this.currentGameIndex > 0) {
                this.currentGameIndex--;
                this.currentMoveIndex = -1; // Reset to Turn 0

                // Get selected game data
                const selectedGame = this.gameLogger.previousGames[this.currentGameIndex];
                if (!selectedGame || !selectedGame.boards || selectedGame.boards.length === 0) {
                    console.error("Invalid game data");
                    return false;
                }

                // Get board size and stage config
                const boardSize = selectedGame.boards[0].length;
                let stageConfig = null;

                // Find stage config
                if (selectedGame.metadata && selectedGame.metadata.stage) {
                    stageConfig = stages.find(s => s.name === selectedGame.metadata.stage);
                }
                if (!stageConfig) {
                    stageConfig = stages.find(s => s.boardSize === boardSize) || stages[0];
                }

                // Update global variables
                if (typeof BOARD_SIZE !== 'undefined') {
                    BOARD_SIZE = boardSize;
                }

                // Create new board array if needed
                if (typeof board !== 'undefined') {
                    board = Array(boardSize).fill().map(() => Array(boardSize).fill(GAME_CONSTANTS.EMPTY));
                }

                // Reset board UI
                this._resetBoardUI(boardSize);

                // Update stage
                if (typeof currentStage !== 'undefined') {
                    currentStage = stageConfig;
                }

                // Reset game state
                if (typeof gameRunning !== 'undefined') gameRunning = false;
                if (typeof gameOver !== 'undefined') gameOver = true;

                // Update UI elements
                const startButton = document.getElementById('start-btn');
                if (startButton) startButton.disabled = false;

                const statusElement = document.getElementById('status');
                if (statusElement) {
                    statusElement.textContent = "Ready to start.";
                    statusElement.style.backgroundColor = '#4CAF50';
                }

                // Reset game
                if (typeof resetGame === 'function') {
                    resetGame(stageConfig, true);
                }

                // Set board
                this.gameBoard.setBoard(typeof board !== 'undefined' ? board : Array(boardSize).fill().map(() => Array(boardSize).fill(GAME_CONSTANTS.EMPTY)));

                // Update log input
                const logInput = document.getElementById('log-input');
                if (logInput) {
                    if (selectedGame.logText) {
                        logInput.value = selectedGame.logText;
                    } else if (selectedGame.metadata) {
                        logInput.value = `Game ${this.currentGameIndex + 1}: ${selectedGame.metadata.blackStrategy}(B) vs ${selectedGame.metadata.whiteStrategy}(W) on ${selectedGame.metadata.stage}`;
                    }
                }

                // Update UI controls
                if (typeof updateRolloutControls === 'function') {
                    updateRolloutControls();
                }

                return true;
            }
            return false;
        }

        /**
         * Get current game info
         * @returns {Object} Game info object with gameIndex, totalGames, currentTurn, totalTurns
         */
        getCurrentGameInfo() {
            return {
                gameIndex: this.currentGameIndex,
                totalGames: this.gameStartIndices.length,
                currentTurn: this.getCurrentGameTurn(),
                totalTurns: this.getCurrentGameTotalTurns()
            };
        }
    }

    return GameRollout;
})();

// Export as a global object or use module exports if using bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameRollout;
}