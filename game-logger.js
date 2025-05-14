/**
 * game-logger.js
 * 
 * GameLogger class for Othello
 * Records moves, board states, and game results for playback and analysis
 */

const GameLogger = (function () {
    /**
     * GameLogger class - Records game data and provides access to game history
     */
    class GameLogger {
        constructor() {
            this.moves = [];              // Current game moves
            this.boardStates = [];        // Current game board states
            this.currentPlayer = [];      // Current game player sequence
            this.capturedCounts = [];     // Number of pieces captured in each turn
            this.gameResults = [];        // Record of game results (for leaderboard)
            this.previousGames = [];      // Complete logs of previous games
        }

        /**
         * Records a move in the current game
         * @param {number} player - The player making the move (BLACK or WHITE)
         * @param {Object} position - Position {row, col} where the move was made
         * @param {Array} resultingBoard - The board state after the move
         * @param {number} capturedCount - Number of pieces captured by this move
         */
        logMove(player, position, resultingBoard, capturedCount = 0) {
            this.moves.push({ player, position });
            this.boardStates.push(JSON.parse(JSON.stringify(resultingBoard)));
            this.currentPlayer.push(player);
            this.capturedCounts.push(capturedCount);
        }

        /**
         * Gets the current game log data
         * @returns {Object} Current game log data
         */
        getLogs() {
            if (this.moves && this.moves.length > 0) {
                return {
                    moves: this.moves,
                    boards: this.boardStates,
                    players: this.currentPlayer,
                    capturedCounts: this.capturedCounts
                };
            }

            // If current game is empty, try to use most recent previous game
            if (this.previousGames && this.previousGames.length > 0) {
                console.log("GameLogger.getLogs: Using data from the most recent previous game");
                const lastGame = this.previousGames[this.previousGames.length - 1];

                return {
                    moves: lastGame.moves || [],
                    boards: lastGame.boards || [],
                    players: lastGame.players || [],
                    capturedCounts: lastGame.capturedCounts || []
                };
            }

            // Default empty response
            return {
                moves: [],
                boards: [],
                players: [],
                capturedCounts: []
            };
        }

        /**
         * Saves the completed game with all metadata and log
         * @param {number} blackScore - Final score for black player
         * @param {number} whiteScore - Final score for white player
         * @param {string} blackStrategy - Name of black player's strategy
         * @param {string} whiteStrategy - Name of white player's strategy
         * @param {Object} stageConfig - The stage configuration used for the game
         * @param {Array} moveLogArray - Array of text log messages
         * @return {Object} The saved game result object
         */
        saveGameWithLog(blackScore, whiteScore, blackStrategy, whiteStrategy, stageConfig, moveLogArray) {
            // Validate input parameters
            blackStrategy = blackStrategy || "Black";
            whiteStrategy = whiteStrategy || "White";
            const stageName = stageConfig && stageConfig.name ? stageConfig.name : "Unknown Stage";

            // Create complete log text from move log messages
            const gameLogText = moveLogArray.join('\n');

            // Store complete game data in previousGames
            this.previousGames.push({
                moves: [...this.moves],
                boards: [...this.boardStates],
                players: [...this.currentPlayer],
                capturedCounts: [...this.capturedCounts],
                logText: gameLogText,  // Store the full text log
                metadata: {
                    blackStrategy: blackStrategy,
                    whiteStrategy: whiteStrategy,
                    stage: stageName,
                    blackScore: blackScore,
                    whiteScore: whiteScore,
                    date: new Date().toISOString()
                }
            });

            console.log(`Game saved with fixed log: ${blackStrategy}(B) vs ${whiteStrategy}(W) on ${stageName}`);

            // Also save to gameResults for leaderboard functionality
            const result = {
                date: new Date().toISOString(),
                blackScore,
                whiteScore,
                blackStrategy,
                whiteStrategy,
                stage: stageName,
                winner: blackScore > whiteScore ? GAME_CONSTANTS.BLACK :
                    (whiteScore > blackScore ? GAME_CONSTANTS.WHITE : 0),
                totalMoves: this.moves.length
            };

            this.gameResults.push(result);

            // Reset current game data
            this.reset();

            // Save to localStorage
            this.saveToLocalStorage();

            return result;
        }

        /**
         * Save game data to session storage
         */
        saveToLocalStorage() {
            try {
                // Save all game data to sessionStorage
                sessionStorage.setItem('othelloGameResults', JSON.stringify(this.gameResults));
                sessionStorage.setItem('othelloPreviousGames', JSON.stringify(this.previousGames));

                console.log(`Game data saved: ${this.previousGames.length} games, ${this.gameResults.length} results`);
            } catch (e) {
                console.error("Failed to save game data:", e);
            }
        }

        /**
         * Load game results from local storage
         */
        loadFromLocalStorage() {
            try {
                // Load game results
                const resultsData = localStorage.getItem('othelloGameResults');
                if (resultsData) {
                    this.gameResults = JSON.parse(resultsData);
                }

                // Load previous games
                const gamesData = localStorage.getItem('othelloPreviousGames');
                if (gamesData) {
                    this.previousGames = JSON.parse(gamesData);
                }
            } catch (e) {
                console.error("Failed to load game data:", e);
            }
        }

        /**
         * Get specific number of previous game results
         * @param {number} count - Number of results to retrieve (null for all)
         * @returns {Array} Array of game results
         */
        getGameResults(count = null) {
            if (count === null) {
                return [...this.gameResults];
            }
            return this.gameResults.slice(-count);
        }

        /**
         * Get specific number of previous games
         * @param {number} count - Number of games to retrieve (null for all)
         * @returns {Array} Array of previous games
         */
        getPreviousGames(count = null) {
            if (count === null) {
                return [...this.previousGames];
            }
            return this.previousGames.slice(-count);
        }

        /**
         * Reset current game data
         */
        reset() {
            this.moves = [];
            this.boardStates = [];
            this.currentPlayer = [];
            this.capturedCounts = [];

            console.log("GameLogger reset: Current game data cleared");
        }

        /**
         * Get board state at specific move index
         * @param {number} moveIndex - Move index
         * @returns {Array|null} Board state or null if not found
         */
        getBoardAtMove(moveIndex) {
            if (moveIndex >= 0 && moveIndex < this.boardStates.length) {
                return this.boardStates[moveIndex];
            }
            return null;
        }

        /**
         * Get player at specific move index
         * @param {number} moveIndex - Move index
         * @returns {number|null} Player (BLACK or WHITE) or null if not found
         */
        getPlayerAtMove(moveIndex) {
            if (moveIndex >= 0 && moveIndex < this.currentPlayer.length) {
                return this.currentPlayer[moveIndex];
            }
            return null;
        }

        /**
         * Generate human-readable log for the current game
         * @param {Object} playerNames - Object with player names {black, white}
         * @param {string} stageName - Stage name
         * @returns {string} Formatted log text
         */
        generateHumanReadableLog(playerNames = {}, stageName = "Unknown Stage") {
            if (!this.moves || this.moves.length === 0) {
                return "No game log data available.";
            }

            const blackName = playerNames.black || "Black";
            const whiteName = playerNames.white || "White";

            // Create game header
            let textLog = `Game started: ${blackName}(B) vs ${whiteName}(W) on Stage: ${stageName}\n`;

            // Add moves
            const colLabels = 'abcdefghijklmnopqrstuvwxyz';
            this.moves.forEach(move => {
                if (move && move.player && move.position) {
                    const playerName = move.player === GAME_CONSTANTS.BLACK ? blackName : whiteName;
                    const colorIndicator = move.player === GAME_CONSTANTS.BLACK ? "(B)" : "(W)";

                    if (typeof move.position === 'object' &&
                        typeof move.position.row === 'number' &&
                        typeof move.position.col === 'number') {
                        const col = colLabels[move.position.col];
                        const row = move.position.row + 1;
                        textLog += `${playerName}${colorIndicator}: ${col}${row}\n`;
                    }
                }
            });

            // If game is over, add result
            if (this.boardStates && this.boardStates.length > 0) {
                const finalBoard = this.boardStates[this.boardStates.length - 1];
                let blackCount = 0;
                let whiteCount = 0;

                // Count pieces
                for (let r = 0; r < finalBoard.length; r++) {
                    for (let c = 0; c < finalBoard[r].length; c++) {
                        if (finalBoard[r][c] === GAME_CONSTANTS.BLACK) blackCount++;
                        else if (finalBoard[r][c] === GAME_CONSTANTS.WHITE) whiteCount++;
                    }
                }

                textLog += `Game over: Final score ${blackCount}-${whiteCount}\n`;

                if (blackCount > whiteCount) {
                    textLog += "Black wins!";
                } else if (whiteCount > blackCount) {
                    textLog += "White wins!";
                } else {
                    textLog += "It's a tie!";
                }
            }

            return textLog;
        }
    }

    // Create a singleton instance
    const instance = new GameLogger();

    // Return the public API
    return {
        // Core logging functions
        logMove: (player, position, resultingBoard, capturedCount) =>
            instance.logMove(player, position, resultingBoard, capturedCount),

        // Game management
        saveGameWithLog: (blackScore, whiteScore, blackStrategy, whiteStrategy, stageConfig, moveLogArray) =>
            instance.saveGameWithLog(blackScore, whiteScore, blackStrategy, whiteStrategy, stageConfig, moveLogArray),
        reset: () => instance.reset(),

        // Data access
        getLogs: () => instance.getLogs(),
        getBoardAtMove: (moveIndex) => instance.getBoardAtMove(moveIndex),
        getPlayerAtMove: (moveIndex) => instance.getPlayerAtMove(moveIndex),
        getGameResults: (count) => instance.getGameResults(count),
        getPreviousGames: (count) => instance.getPreviousGames(count),
        generateHumanReadableLog: (playerNames, stageName) =>
            instance.generateHumanReadableLog(playerNames, stageName),

        // Storage
        saveToLocalStorage: () => instance.saveToLocalStorage(),
        loadFromLocalStorage: () => instance.loadFromLocalStorage(),

        // Direct access to instance data (for advanced usage)
        get previousGames() { return instance.previousGames; },
        get gameResults() { return instance.gameResults; }
    };
})();

// Export as a global object or use module exports if using bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameLogger;
}