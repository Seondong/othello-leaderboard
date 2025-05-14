/**
 * strategies.js
 * 
 * Built-in AI strategies for Othello
 * Provides basic strategy implementations and compilation functionality
 */

const OthelloStrategies = (function () {
    // Private storage for saved strategies
    let savedStrategies = {};
    let compiledStudentAIs = {};

    // Built-in strategies
    const builtInStrategies = {
        /**
         * Random strategy - selects a random valid move
         * @param {Array<Array<number>>} board - Current board state
         * @param {number} player - Current player (BLACK or WHITE)
         * @param {Array<Object>} validMoves - Array of valid move positions {row, col}
         * @returns {Object} Selected move {row, col} or null if no moves
         */
        random: function (board, player, validMoves) {
            if (validMoves.length === 0) return null;
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        },

        /**
         * Greedy strategy - selects move that flips the most pieces
         * @param {Array<Array<number>>} board - Current board state
         * @param {number} player - Current player (BLACK or WHITE)
         * @param {Array<Object>} validMoves - Array of valid move positions {row, col}
         * @param {Function} makeMoveFn - Function to make a move (for simulation)
         * @returns {Object} Selected move {row, col} or null if no moves
         */
        greedy: function (board, player, validMoves, makeMoveFn) {
            if (validMoves.length === 0) return null;

            const opponent = player === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;
            let bestMove = null;
            let maxFlips = -1;

            // Iterate through all valid moves
            for (const move of validMoves) {
                // Simulate the move to count flips
                const tempBoard = board.map(row => [...row]); // Copy the board
                let currentFlips = 0;

                // Place the piece
                tempBoard[move.row][move.col] = player;

                // Count flipped pieces in each direction
                const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

                for (const [dr, dc] of directions) {
                    let r = move.row + dr;
                    let c = move.col + dc;
                    const piecesToFlip = [];

                    // Collect opponent pieces that could be flipped
                    while (
                        r >= 0 && r < tempBoard.length &&
                        c >= 0 && c < tempBoard.length &&
                        tempBoard[r][c] === opponent
                    ) {
                        piecesToFlip.push([r, c]);
                        r += dr;
                        c += dc;
                    }

                    // Check if these pieces are actually flipped (bounded by player's piece)
                    if (
                        piecesToFlip.length > 0 &&
                        r >= 0 && r < tempBoard.length &&
                        c >= 0 && c < tempBoard.length &&
                        tempBoard[r][c] === player
                    ) {
                        currentFlips += piecesToFlip.length;
                    }
                }

                // Update best move if this flips more pieces
                if (currentFlips > maxFlips) {
                    maxFlips = currentFlips;
                    bestMove = move;
                }
            }

            // If no move flips any pieces (should not happen), pick randomly
            if (bestMove === null && validMoves.length > 0) {
                console.warn("Greedy AI fallback: No move increased flips > -1, selecting random valid move.");
                bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            }

            return bestMove;
        },

        /**
         * Corners strategy - prioritizes corner positions, then edges, then uses greedy
         * @param {Array<Array<number>>} board - Current board state
         * @param {number} player - Current player (BLACK or WHITE)
         * @param {Array<Object>} validMoves - Array of valid move positions {row, col}
         * @param {Function} makeMoveFn - Function to make a move (for simulation)
         * @returns {Object} Selected move {row, col} or null if no moves
         */
        corners: function (board, player, validMoves, makeMoveFn) {
            if (validMoves.length === 0) return null;

            const boardSize = board.length;

            // Find corner moves
            const corners = validMoves.filter(
                mv => (mv.row === 0 || mv.row === boardSize - 1) &&
                    (mv.col === 0 || mv.col === boardSize - 1)
            );

            if (corners.length > 0) {
                return corners[0];
            }

            // Find edge moves
            const edges = validMoves.filter(
                mv => mv.row === 0 || mv.row === boardSize - 1 ||
                    mv.col === 0 || mv.col === boardSize - 1
            );

            if (edges.length > 0) {
                // Return random edge
                return edges[Math.floor(Math.random() * edges.length)];
            }

            // Fall back to greedy strategy for non-edge moves
            return builtInStrategies.greedy(board, player, validMoves, makeMoveFn);
        },

        /**
         * Positional strategy - uses position weights to select moves
         * @param {Array<Array<number>>} board - Current board state
         * @param {number} player - Current player (BLACK or WHITE)
         * @param {Array<Object>} validMoves - Array of valid move positions {row, col}
         * @param {Function} makeMoveFn - Function to make a move (for simulation)
         * @returns {Object} Selected move {row, col} or null if no moves
         */
        positional: function (board, player, validMoves, makeMoveFn) {
            if (validMoves.length === 0) return null;

            let bestMove = null;
            let bestScore = -Infinity;

            // Check board size
            if (board.length !== 8) {
                console.warn("Positional weights only valid for 8x8! Falling back to greedy.");
                return builtInStrategies.greedy(board, player, validMoves, makeMoveFn);
            }

            // Position weights for 8x8 board
            const weights = [
                [120, -20, 20, 5, 5, 20, -20, 120],
                [-20, -40, -5, -5, -5, -5, -40, -20],
                [20, -5, 15, 3, 3, 15, -5, 20],
                [5, -5, 3, 3, 3, 3, -5, 5],
                [5, -5, 3, 3, 3, 3, -5, 5],
                [20, -5, 15, 3, 3, 15, -5, 20],
                [-20, -40, -5, -5, -5, -5, -40, -20],
                [120, -20, 20, 5, 5, 20, -20, 120]
            ];

            // Evaluate each move using position weights
            for (const move of validMoves) {
                const score = weights[move.row][move.col];
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }

            return bestMove;
        }
    };

    /**
     * Compiles a strategy from code string
     * @param {string} controllerId - Strategy ID
     * @param {number} player - Player (BLACK or WHITE)
     * @returns {Function} Compiled strategy function or null if error
     */
    function getCompiledStrategy(controllerId, player) {
        // Handle custom strategies
        if (controllerId.startsWith('custom_')) {
            const strategyName = controllerId.replace('custom_', '');

            // Check if we have a cached compiled function first (preserves closure)
            if (compiledStudentAIs[strategyName]) {
                return compiledStudentAIs[strategyName];
            }

            // If not, check if we have the code
            if (savedStrategies[strategyName]) {
                console.log(`Compiling Othello strategy: ${strategyName}`);
                const code = savedStrategies[strategyName];

                try {
                    // Try to compile from code string (fallback for pre-existing strategies)
                    const compiledFunc = new Function('boardArg', 'playerArg', 'validMovesArg', 'makeMoveFunc',
                        `${code}\nreturn studentStrategy(boardArg, playerArg, validMovesArg, makeMoveFunc);`);

                    // Cache for future use
                    compiledStudentAIs[strategyName] = compiledFunc;
                    return compiledFunc;
                } catch (e) {
                    console.error(`Compile error for ${strategyName}:`, e);
                    return null;
                }
            }

            console.error(`Code not found for custom strategy: ${strategyName}`);
            return null;
        }

        // Handle built-in strategies
        else if (builtInStrategies[controllerId]) {
            return builtInStrategies[controllerId];
        }

        // Not recognized
        console.error(`Strategy function not found or invalid ID: ${controllerId}`);
        return null;
    }

    /**
     * Save a strategy to storage
     * @param {string} name - Strategy name
     * @param {string} code - Strategy code
     * @returns {boolean} Success status
     */
    function saveStrategy(name, code) {
        if (!name || !code) {
            console.error("Cannot save strategy: Missing name or code");
            return false;
        }

        if (!code.includes('studentStrategy') && !code.includes('function(')) {
            console.warn("Code might not be valid");
        }

        savedStrategies[name] = code;

        // Clear any cached compiled version
        compiledStudentAIs[name] = null;

        // Save to localStorage
        try {
            localStorage.setItem('othelloStrategies', JSON.stringify(savedStrategies));
        } catch (e) {
            console.error("Failed to save to localStorage:", e);
        }

        return true;
    }

    /**
     * Delete a strategy from storage
     * @param {string} name - Strategy name
     * @returns {boolean} Success status
     */
    function deleteStrategy(name) {
        if (!savedStrategies[name]) {
            console.error(`Strategy "${name}" not found`);
            return false;
        }

        delete savedStrategies[name];
        delete compiledStudentAIs[name];

        // Update localStorage
        try {
            localStorage.setItem('othelloStrategies', JSON.stringify(savedStrategies));
        } catch (e) {
            console.error("Failed to update localStorage:", e);
        }

        return true;
    }

    /**
     * Load saved strategies from localStorage
     */
    function loadSavedStrategies() {
        const data = localStorage.getItem('othelloStrategies');

        if (data) {
            try {
                savedStrategies = JSON.parse(data);
            } catch (e) {
                console.error("Error loading strategies:", e);
                savedStrategies = {};
            }
        } else {
            savedStrategies = {};
        }

        // Clear compiled cache
        compiledStudentAIs = {};
    }

    /**
     * Get all saved strategy names
     * @returns {Array<string>} Array of strategy names
     */
    function getStrategyNames() {
        return Object.keys(savedStrategies);
    }

    /**
     * Get code for a specific strategy
     * @param {string} name - Strategy name
     * @returns {string|null} Strategy code or null if not found
     */
    function getStrategyCode(name) {
        return savedStrategies[name] || null;
    }

    /**
     * Import strategies from uploaded files
     * @param {Array<File>} files - Array of files to import
     * @returns {Promise<Object>} Results object {success, errors}
     */
    function importStrategiesFromFiles(files) {
        return new Promise((resolve) => {
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            if (files.length === 0) {
                resolve({ success: 0, errors: ["No files selected"] });
                return;
            }

            let processed = 0;

            Array.from(files).forEach((file) => {
                const reader = new FileReader();

                reader.onload = (e) => {
                    try {
                        const code = e.target.result;
                        const name = file.name.replace(/\.js$/, '');

                        if (!code || !name) {
                            throw new Error("Empty file or invalid name");
                        }

                        if (!code.includes('studentStrategy') && !code.includes('function(')) {
                            throw new Error("The file must implement a 'studentStrategy' function");
                            console.warn(`File ${file.name} might not be valid.`);
                        }

                        if (code.includes('analyzeStage')){
                            throw new Error("Do not upload intelligent system here");
                            console.warn(`File ${file.name} might not be valid.`);
                        }

                        savedStrategies[name] = code;
                        compiledStudentAIs[name] = null;
                        successCount++;
                    } catch (err) {
                        errorCount++;
                        errors.push(`${file.name}: ${err.message}`);
                        console.error(`File ${file.name} error:`, err);
                    }

                    processed++;

                    if (processed === files.length) {
                        // Save to localStorage
                        try {
                            localStorage.setItem('othelloStrategies', JSON.stringify(savedStrategies));
                        } catch (e) {
                            errors.push(`Storage error: ${e.message}`);
                            console.error("Failed to save to localStorage:", e);
                        }

                        resolve({
                            success: successCount,
                            errors: errorCount > 0 ? errors : []
                        });
                    }
                };

                reader.onerror = () => {
                    errorCount++;
                    errors.push(`${file.name}: Read error`);

                    processed++;

                    if (processed === files.length) {
                        resolve({
                            success: successCount,
                            errors: errorCount > 0 ? errors : []
                        });
                    }
                };

                reader.readAsText(file);
            });
        });
    }

    // Public API
    return {
        // Strategy management
        getCompiledStrategy,
        saveStrategy,
        deleteStrategy,
        loadSavedStrategies,
        getStrategyNames,
        getStrategyCode,
        importStrategiesFromFiles,

        // Built-in strategies
        getBuiltInStrategyNames: () => Object.keys(builtInStrategies).filter(k => k !== 'custom'),

        // For testing/debugging
        getBuiltInStrategy: (name) => builtInStrategies[name] || null
    };
})();

// Export as a global object or use module exports if using bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OthelloStrategies;
}