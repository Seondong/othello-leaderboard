/**
 * game-controller.js
 * 
 * Game control logic for Othello Arena
 * Handles game flow, AI move execution, and turn management
 */

const GameController = (function () {
    // Private variables
    let gameLoopTimeout = null;
    let blackTimeUsed = 0;
    let whiteTimeUsed = 0;
    let isTournamentMode = false;

    /**
     * Start a new game with the selected settings
     * @param {boolean} isTournament - Whether this is a tournament game
     * @param {Object} stageConfig - Stage configuration (optional, uses selected stage if not provided)
     */
    async function startGame(isTournament = false, stageConfig = null) {
        console.log("[startGame] Start.");

        // Check if OthelloCore is available
        if (typeof OthelloCore === 'undefined') {
            console.error("OthelloCore not available");
            return;
        }

        // Get selected stage if not provided
        if (!stageConfig) {
            const stageSelect = document.getElementById('stageSelect');
            const selectedIndex = parseInt(stageSelect && stageSelect.value || 0);
            stageConfig = stages[selectedIndex] || stages[0];
        }

        if (!stageConfig) {
            alert("Please select a valid stage.");
            return;
        }

        // Reset game logger if available
        if (typeof GameLogger !== 'undefined' && !isTournament) {
            GameLogger.reset();
        }

        // Initialize board with the selected stage
        OthelloCore.initializeBoard(stageConfig, false);

        // Set up game state
        OthelloCore.setGameRunning(true);
        OthelloCore.setCurrentPlayer(GAME_CONSTANTS.BLACK);

        // Reset timers
        blackTimeUsed = 0;
        whiteTimeUsed = 0;

        // Update UI
        if (typeof OthelloUI !== 'undefined') {
            OthelloUI.clearMoveLog();
            OthelloUI.updateStatus();
            OthelloUI.updateBoardDisplay();

            // Disable start button
            const startButton = OthelloUI.getElement('startButton');
            if (startButton) startButton.disabled = true;

            // Log game start
            const blackName = OthelloUI.getPlayerName(GAME_CONSTANTS.BLACK);
            const whiteName = OthelloUI.getPlayerName(GAME_CONSTANTS.WHITE);
            OthelloUI.logMessage(`Game started: ${blackName}(B) vs ${whiteName}(W) on Stage: ${stageConfig.name}`);
        }

        // Store tournament mode flag
        isTournamentMode = isTournament;

        // Start the game loop with a small delay
        setTimeout(() => {
            if (!OthelloCore.isGameRunning() || OthelloCore.isGameOver()) {
                console.warn("[startGame -> setTimeout] Game ended before first move check.");
                return;
            }
            console.log("[startGame -> setTimeout] Triggering first move check...");
            makeAIMove(isTournament);
        }, 10);

        console.log("[startGame] Finish initial setup. First move check scheduled.");
    }

    // /**
    //  * Handle AI moves and turn management
    //  * @param {boolean} isTournament - Whether this is a tournament game
    //  */
    // async function makeAIMove(isTournament = false) {
    //     // Basic checks
    //     console.log(`[makeAIMove] Enter. Player: ${OthelloCore.getCurrentPlayer()}, Running: ${OthelloCore.isGameRunning()}, Thinking: ${OthelloUI ? OthelloUI.getElement('aiThinking') : false}`);

    //     if (!OthelloCore.isGameRunning() || OthelloCore.isGameOver()) {
    //         console.log("[makeAIMove] Aborting: Game not running or over.");
    //         if (typeof OthelloUI !== 'undefined') {
    //             OthelloUI.setAIThinking(false);
    //         }
    //         if (gameLoopTimeout) {
    //             clearTimeout(gameLoopTimeout);
    //             gameLoopTimeout = null;
    //         }
    //         return;
    //     }

    //     const currentPlayer = OthelloCore.getCurrentPlayer();
    //     const playerSelectId = currentPlayer === GAME_CONSTANTS.BLACK ? 'blackAISelect' : 'whiteAISelect';
    //     const playerSelect = OthelloUI ? OthelloUI.getElement(playerSelectId) : null;

    //     if (!playerSelect) {
    //         console.error(`[makeAIMove] Player select element not found for player ${currentPlayer}`);
    //         return;
    //     }

    //     const controllerId = playerSelect.value;

    //     // For human player, we don't track time
    //     if (controllerId === 'human') {
    //         if (typeof OthelloUI !== 'undefined') {
    //             OthelloUI.setAIThinking(false);
    //             OthelloUI.updateStatus();
    //             OthelloUI.updateBoardDisplay();
    //         }
    //         console.log(`[makeAIMove] Human turn P${currentPlayer}. Waiting for input.`);
    //         return; // Exit AI logic, wait for human click
    //     }

    //     // Set AI thinking flag
    //     if (typeof OthelloUI !== 'undefined') {
    //         OthelloUI.setAIThinking(true);
    //     }
    //     const aiThinking = false;
    //     if (aiThinking) {
    //         console.warn(`[makeAIMove] AI P${currentPlayer} is already thinking. Aborting duplicate call.`);
    //         return;
    //     }

    //     if (typeof OthelloUI !== 'undefined') {
    //         OthelloUI.setAIThinking(true);

    //         // Update status display
    //         const aiIdentifier = OthelloUI.getPlayerName(currentPlayer);
    //         OthelloUI.displayMessage(`${aiIdentifier} (AI) is thinking...`, 'thinking');
    //     }

    //     // Get strategy function
    //     let strategyFn = null;
    //     if (typeof OthelloStrategies !== 'undefined') {
    //         strategyFn = OthelloStrategies.getCompiledStrategy(controllerId, currentPlayer);
    //     }

    //     if (!strategyFn) {
    //         console.error(`[makeAIMove] Strategy function failed for ${controllerId}`);
    //         if (typeof OthelloUI !== 'undefined') {
    //             const aiIdentifier = OthelloUI.getPlayerName(currentPlayer);
    //             OthelloUI.logMessage(`Error: AI ${aiIdentifier} failed. Using random move.`);
    //         }
    //         // Use a fallback move when strategy compilation fails
    //         useFallbackMove(currentPlayer, isTournament);
    //         return;
    //     }

    //     // Calculate valid moves
    //     const validMoves = OthelloCore.getValidMoves(currentPlayer);
    //     console.log(`[makeAIMove] P${currentPlayer} has ${validMoves.length} valid moves.`);

    //     // Handle no valid moves (pass)
    //     if (validMoves.length === 0) {
    //         console.log(`[makeAIMove] P${currentPlayer} has no moves. Checking opponent...`);
    //         const opponent = currentPlayer === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;

    //         // Check if game should end (both players have no moves)
    //         if (OthelloCore.getValidMoves(opponent).length === 0) {
    //             console.log("[makeAIMove] Both players have no moves. Ending game.");
    //             if (typeof OthelloUI !== 'undefined') {
    //                 OthelloUI.setAIThinking(false);
    //             }
    //             OthelloCore.endGame();
    //             return;
    //         }

    //         // Current player passes, switch to opponent
    //         console.log(`[makeAIMove] P${currentPlayer} passes.`);
    //         if (typeof OthelloUI !== 'undefined') {
    //             OthelloUI.logPass(currentPlayer);
    //         }

    //         OthelloCore.setCurrentPlayer(opponent);
    //         if (typeof OthelloUI !== 'undefined') {
    //             OthelloUI.updateStatus();
    //         }

    //         if (typeof OthelloUI !== 'undefined') {
    //             OthelloUI.setAIThinking(false);
    //         }

    //         // Schedule check for the opponent's turn
    //         makeAIMove(isTournament);
    //         return;
    //     }

    //     // Schedule AI execution (allow UI update)
    //     const moveDelay = isTournament ? 0 : 20;
    //     if (gameLoopTimeout) clearTimeout(gameLoopTimeout);

    //     gameLoopTimeout = setTimeout(async () => {
    //         // Re-check state inside timeout for safety
    //         if (!OthelloCore.isGameRunning() || OthelloCore.isGameOver()) {
    //             console.log(`[makeAIMove -> setTimeout] Aborting before AI execution. GameRunning: ${OthelloCore.isGameRunning()}, GameOver: ${OthelloCore.isGameOver()}`);
    //             if (typeof OthelloUI !== 'undefined') {
    //                 OthelloUI.setAIThinking(false);
    //             }
    //             return;
    //         }

    //         const aiIdentifier = typeof OthelloUI !== 'undefined' ?
    //             OthelloUI.getPlayerName(currentPlayer) :
    //             `Player ${currentPlayer}`;

    //         console.log(`[makeAIMove -> setTimeout] Executing AI logic for ${aiIdentifier} (P${currentPlayer})`);

    //         try {
    //             // Call AI strategy function with time tracking
    //             console.log(`[makeAIMove -> setTimeout] Calling strategy function for ${aiIdentifier}...`);
    //             const startTime = performance.now();

    //             // Create a deep copy of the board to pass to the AI
    //             const currentBoardState = OthelloCore.getBoard().map(r => [...r]);

    //             // Pass the board state, player, the pre-calculated valid moves list, and makeMove simulator
    //             const move = await strategyFn(currentBoardState, currentPlayer, validMoves, OthelloCore.makeMove);

    //             // Calculate time used for this move
    //             const endTime = performance.now();
    //             const moveTime = endTime - startTime;

    //             // Accumulate time used based on current player
    //             if (currentPlayer === GAME_CONSTANTS.BLACK) {
    //                 blackTimeUsed += moveTime;
    //                 if (typeof OthelloUI !== 'undefined') {
    //                     OthelloUI.updateBlackTime(blackTimeUsed);
    //                 }
    //             } else {
    //                 whiteTimeUsed += moveTime;
    //                 if (typeof OthelloUI !== 'undefined') {
    //                     OthelloUI.updateWhiteTime(whiteTimeUsed);
    //                 }
    //             }

    //             console.log(`[makeAIMove -> setTimeout] ${aiIdentifier} returned move:`, move,
    //                 `in ${(moveTime / 1000).toFixed(3)}s (total: ${currentPlayer === GAME_CONSTANTS.BLACK ? blackTimeUsed.toFixed(0) : whiteTimeUsed.toFixed(0)}ms)`);

    //             // Check if player exceeded time limit
    //             if (typeof OthelloUI !== 'undefined' &&
    //                 OthelloUI.checkTimeLimit(currentPlayer, currentPlayer === GAME_CONSTANTS.BLACK ? blackTimeUsed : whiteTimeUsed)) {
    //                 return; // Game ended due to time limit violation
    //             }

    //             // Validate AI's returned move
    //             let actualMove = move;
    //             let isFallback = false;

    //             // Check if move is null or if it's not actually in the list of valid moves
    //             const isReturnedMoveInList = move && validMoves.some(v => v.row === move.row && v.col === move.col);

    //             if (!move || !isReturnedMoveInList) {
    //                 // Detailed logging for debugging
    //                 console.log('--- Invalid Move Detected ---');
    //                 console.log('AI Identifier:', aiIdentifier);
    //                 console.log('Returned move:', move);
    //                 console.log('Current player:', currentPlayer);
    //                 console.log('Calculated validMoves:', validMoves);
    //                 if (move) {
    //                     console.log('isValidMove result (for info):', OthelloCore.isValidMove(move.row, move.col, currentPlayer));
    //                 }
    //                 console.log('Current board state:');
    //                 console.table(OthelloCore.getBoard());

    //                 // Fallback: Select a random move from the validMoves list
    //                 actualMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    //                 isFallback = true;

    //                 if (!actualMove) {
    //                     console.error("Fallback failed - Could not select random move from non-empty list?");
    //                     useFallbackMove(currentPlayer, isTournament);
    //                     return;
    //                 }
    //                 console.log(`[makeAIMove -> setTimeout] Fallback move selected:`, actualMove);
    //             }

    //             // Execute the chosen move
    //             console.log(`[makeAIMove -> setTimeout] Executing makeMove for P${currentPlayer}:`, actualMove);
    //             OthelloCore.makeMove(actualMove.row, actualMove.col, currentPlayer);

    //             // Determine next player based on rules
    //             const previousPlayer = currentPlayer;
    //             const nextPlayer = OthelloCore.determineNextPlayer();
    //             OthelloCore.setCurrentPlayer(nextPlayer);

    //             if (typeof OthelloUI !== 'undefined') {
    //                 OthelloUI.updateStatus();
    //             }

    //             console.log(`[makeAIMove -> setTimeout] Switched player from P${previousPlayer} to P${nextPlayer}.`);

    //             // Check if same player continues (for fewer pieces rule)
    //             if (previousPlayer === nextPlayer) {
    //                 console.log(`[makeAIMove -> setTimeout] Same player (${aiIdentifier}) continues (fewer pieces rule)`);
    //                 if (typeof OthelloUI !== 'undefined') {
    //                     OthelloUI.logMessage(`${aiIdentifier} continues (fewer pieces rule)`);
    //                 }
    //             }

    //             // Reset thinking flag
    //             if (typeof OthelloUI !== 'undefined') {
    //                 OthelloUI.setAIThinking(false);
    //             }

    //             // Schedule the check for the next turn
    //             console.log(`[makeAIMove -> setTimeout] Scheduling check for next turn (P${nextPlayer}).`);
    //             makeAIMove(isTournament);

    //         } catch (error) {
    //             console.error(`[makeAIMove -> setTimeout] Error during AI logic or move execution (${aiIdentifier}):`, error);
    //             if (typeof OthelloUI !== 'undefined') {
    //                 OthelloUI.logMessage(`Error in AI move (${aiIdentifier}): ${error.message}. Using random move.`);
    //             }

    //             // Update timers
    //             if (typeof OthelloUI !== 'undefined') {
    //                 OthelloUI.updateTimers();
    //             }

    //             // Check time limit before using fallback
    //             if (typeof OthelloUI !== 'undefined' &&
    //                 OthelloUI.checkTimeLimit(currentPlayer, currentPlayer === GAME_CONSTANTS.BLACK ? blackTimeUsed : whiteTimeUsed)) {
    //                 return; // Game ended due to time limit violation
    //             }

    //             // Use fallback strategy when an error occurs
    //             useFallbackMove(currentPlayer, isTournament);
    //         }
    //     }, moveDelay);
    // }

    /**
 * Handle AI moves and turn management
 * @param {boolean} isTournament - Whether this is a tournament game
 */
    async function makeAIMove(isTournament = false) {
        // Basic checks
        console.log(`[makeAIMove] Enter. Player: ${OthelloCore.getCurrentPlayer()}, Running: ${OthelloCore.isGameRunning()}, Thinking: ${OthelloUI ? OthelloUI.getElement('aiThinking') : false}`);

        if (!OthelloCore.isGameRunning() || OthelloCore.isGameOver()) {
            console.log("[makeAIMove] Aborting: Game not running or over.");
            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.setAIThinking(false);
            }
            if (gameLoopTimeout) {
                clearTimeout(gameLoopTimeout);
                gameLoopTimeout = null;
            }
            return;
        }

        const currentPlayer = OthelloCore.getCurrentPlayer();
        const playerSelectId = currentPlayer === GAME_CONSTANTS.BLACK ? 'blackAISelect' : 'whiteAISelect';
        const playerSelect = OthelloUI ? OthelloUI.getElement(playerSelectId) : null;

        if (!playerSelect) {
            console.error(`[makeAIMove] Player select element not found for player ${currentPlayer}`);
            return;
        }

        const controllerId = playerSelect.value;

        // For human player, we don't track time
        if (controllerId === 'human') {
            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.setAIThinking(false);
                OthelloUI.updateStatus();
                OthelloUI.updateBoardDisplay();
            }
            console.log(`[makeAIMove] Human turn P${currentPlayer}. Waiting for input.`);
            return; // Exit AI logic, wait for human click
        }

        // Set AI thinking flag
        if (typeof OthelloUI !== 'undefined') {
            OthelloUI.setAIThinking(true);
        }
        const aiThinking = false;
        if (aiThinking) {
            console.warn(`[makeAIMove] AI P${currentPlayer} is already thinking. Aborting duplicate call.`);
            return;
        }

        if (typeof OthelloUI !== 'undefined') {
            OthelloUI.setAIThinking(true);

            // Update status display
            const aiIdentifier = OthelloUI.getPlayerName(currentPlayer);
            OthelloUI.displayMessage(`${aiIdentifier} (AI) is thinking...`, 'thinking');
        }

        // Get strategy function
        let strategyFn = null;
        if (typeof OthelloStrategies !== 'undefined') {
            strategyFn = OthelloStrategies.getCompiledStrategy(controllerId, currentPlayer);
        }

        if (!strategyFn) {
            console.error(`[makeAIMove] Strategy function failed for ${controllerId}`);
            if (typeof OthelloUI !== 'undefined') {
                const aiIdentifier = OthelloUI.getPlayerName(currentPlayer);
                OthelloUI.logMessage(`Error: AI ${aiIdentifier} failed. Using random move.`);
            }
            // Use a fallback move when strategy compilation fails
            useFallbackMove(currentPlayer, isTournament);
            return;
        }

        // Calculate valid moves
        const validMoves = OthelloCore.getValidMoves(currentPlayer);
        console.log(`[makeAIMove] P${currentPlayer} has ${validMoves.length} valid moves.`);

        // Handle no valid moves (pass)
        if (validMoves.length === 0) {
            console.log(`[makeAIMove] P${currentPlayer} has no moves. Checking opponent...`);
            const opponent = currentPlayer === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;

            // Check if game should end (both players have no moves)
            if (OthelloCore.getValidMoves(opponent).length === 0) {
                console.log("[makeAIMove] Both players have no moves. Ending game.");
                if (typeof OthelloUI !== 'undefined') {
                    OthelloUI.setAIThinking(false);
                }
                OthelloCore.endGame();
                return;
            }

            // Current player passes, switch to opponent
            console.log(`[makeAIMove] P${currentPlayer} passes.`);
            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.logPass(currentPlayer);
            }

            OthelloCore.setCurrentPlayer(opponent);
            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.updateStatus();
            }

            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.setAIThinking(false);
            }

            // Schedule check for the opponent's turn
            makeAIMove(isTournament);
            return;
        }

        // Schedule AI execution (allow UI update)
        const moveDelay = isTournament ? 0 : 20;
        if (gameLoopTimeout) clearTimeout(gameLoopTimeout);

        gameLoopTimeout = setTimeout(async () => {
            // Re-check state inside timeout for safety
            if (!OthelloCore.isGameRunning() || OthelloCore.isGameOver()) {
                console.log(`[makeAIMove -> setTimeout] Aborting before AI execution. GameRunning: ${OthelloCore.isGameRunning()}, GameOver: ${OthelloCore.isGameOver()}`);
                if (typeof OthelloUI !== 'undefined') {
                    OthelloUI.setAIThinking(false);
                }
                return;
            }

            const aiIdentifier = typeof OthelloUI !== 'undefined' ?
                OthelloUI.getPlayerName(currentPlayer) :
                `Player ${currentPlayer}`;

            console.log(`[makeAIMove -> setTimeout] Executing AI logic for ${aiIdentifier} (P${currentPlayer})`);

            try {
                // Call AI strategy function with time tracking and timeout
                console.log(`[makeAIMove -> setTimeout] Calling strategy function for ${aiIdentifier}...`);
                const startTime = performance.now();

                // Create a deep copy of the board to pass to the AI
                const currentBoardState = OthelloCore.getBoard().map(r => [...r]);

                // Create a promise for the AI move with a timeout
                const movePromise = new Promise(async (resolve) => {
                    try {
                        // Pass the board state, player, the pre-calculated valid moves list, and makeMove simulator
                        const move = await strategyFn(currentBoardState, currentPlayer, validMoves, OthelloCore.makeMove);
                        resolve(move);
                    } catch (error) {
                        console.error(`[makeAIMove] Error in strategy function:`, error);
                        resolve(null); // Resolve with null on error
                    }
                });

                // Create a timeout promise
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error("AI move timed out after 10 seconds"));
                    }, GAME_CONSTANTS.MAX_AI_TIME_PER_GAME - (currentPlayer === GAME_CONSTANTS.BLACK ? blackTimeUsed : whiteTimeUsed));
                });

                // Race the move promise against the timeout
                const move = await Promise.race([movePromise, timeoutPromise])
                    .catch(error => {
                        console.error(`[makeAIMove] Timeout or error:`, error.message);
                        return null;
                    });

                // Calculate time used for this move
                const endTime = performance.now();
                const moveTime = endTime - startTime;

                // Accumulate time used based on current player
                if (currentPlayer === GAME_CONSTANTS.BLACK) {
                    blackTimeUsed += moveTime;
                    if (typeof OthelloUI !== 'undefined') {
                        OthelloUI.updateBlackTime(blackTimeUsed);
                    }
                } else {
                    whiteTimeUsed += moveTime;
                    if (typeof OthelloUI !== 'undefined') {
                        OthelloUI.updateWhiteTime(whiteTimeUsed);
                    }
                }

                console.log(`[makeAIMove -> setTimeout] ${aiIdentifier} returned move:`, move,
                    `in ${(moveTime / 1000).toFixed(3)}s (total: ${currentPlayer === GAME_CONSTANTS.BLACK ? blackTimeUsed.toFixed(0) : whiteTimeUsed.toFixed(0)}ms)`);

                // Check if player exceeded time limit
                if (typeof OthelloUI !== 'undefined' &&
                    OthelloUI.checkTimeLimit(currentPlayer, currentPlayer === GAME_CONSTANTS.BLACK ? blackTimeUsed : whiteTimeUsed)) {
                    return; // Game ended due to time limit violation
                }

                // Validate AI's returned move
                let actualMove = move;
                let isFallback = false;

                // Check if move is null or if it's not actually in the list of valid moves
                const isReturnedMoveInList = move && validMoves.some(v => v.row === move.row && v.col === move.col);

                if (!move || !isReturnedMoveInList) {
                    // Detailed logging for debugging
                    console.log('--- Invalid Move Detected ---');
                    console.log('AI Identifier:', aiIdentifier);
                    console.log('Returned move:', move);
                    console.log('Current player:', currentPlayer);
                    console.log('Calculated validMoves:', validMoves);
                    if (move) {
                        console.log('isValidMove result (for info):', OthelloCore.isValidMove(move.row, move.col, currentPlayer));
                    }
                    console.log('Current board state:');
                    console.table(OthelloCore.getBoard());

                    // Fallback: Select a random move from the validMoves list
                    actualMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                    isFallback = true;

                    if (!actualMove) {
                        console.error("Fallback failed - Could not select random move from non-empty list?");
                        useFallbackMove(currentPlayer, isTournament);
                        return;
                    }
                    console.log(`[makeAIMove -> setTimeout] Fallback move selected:`, actualMove);
                }

                // Execute the chosen move
                console.log(`[makeAIMove -> setTimeout] Executing makeMove for P${currentPlayer}:`, actualMove);
                OthelloCore.makeMove(actualMove.row, actualMove.col, currentPlayer);

                // Determine next player based on rules
                const previousPlayer = currentPlayer;
                const nextPlayer = OthelloCore.determineNextPlayer();
                OthelloCore.setCurrentPlayer(nextPlayer);

                if (typeof OthelloUI !== 'undefined') {
                    OthelloUI.updateStatus();
                }

                console.log(`[makeAIMove -> setTimeout] Switched player from P${previousPlayer} to P${nextPlayer}.`);

                // Check if same player continues (for fewer pieces rule)
                if (previousPlayer === nextPlayer) {
                    console.log(`[makeAIMove -> setTimeout] Same player (${aiIdentifier}) continues (fewer pieces rule)`);
                    if (typeof OthelloUI !== 'undefined') {
                        OthelloUI.logMessage(`${aiIdentifier} continues (fewer pieces rule)`);
                    }
                }

                // Reset thinking flag
                if (typeof OthelloUI !== 'undefined') {
                    OthelloUI.setAIThinking(false);
                }

                // Schedule the check for the next turn
                console.log(`[makeAIMove -> setTimeout] Scheduling check for next turn (P${nextPlayer}).`);
                makeAIMove(isTournament);

            } catch (error) {
                console.error(`[makeAIMove -> setTimeout] Error during AI logic or move execution (${aiIdentifier}):`, error);
                if (typeof OthelloUI !== 'undefined') {
                    OthelloUI.logMessage(`Error in AI move (${aiIdentifier}): ${error.message}. Using random move.`);
                }

                // Update timers
                if (typeof OthelloUI !== 'undefined') {
                    OthelloUI.updateTimers();
                }

                // Check time limit before using fallback
                if (typeof OthelloUI !== 'undefined' &&
                    OthelloUI.checkTimeLimit(currentPlayer, currentPlayer === GAME_CONSTANTS.BLACK ? blackTimeUsed : whiteTimeUsed)) {
                    return; // Game ended due to time limit violation
                }

                // Use fallback strategy when an error occurs
                useFallbackMove(currentPlayer, isTournament);
            }
        }, moveDelay);
    }



    /**
     * Use a fallback move when AI strategy fails
     * @param {number} player - Current player (BLACK or WHITE)
     * @param {boolean} isTournament - Whether this is a tournament game
     */
    function useFallbackMove(player, isTournament) {
        // Get valid moves for current player
        const validMoves = OthelloCore.getValidMoves(player);

        // If no valid moves, handle the pass scenario
        if (validMoves.length === 0) {
            const opponent = player === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;

            // Check if game should end (both players have no moves)
            if (OthelloCore.getValidMoves(opponent).length === 0) {
                if (typeof OthelloUI !== 'undefined') {
                    OthelloUI.setAIThinking(false);
                }
                OthelloCore.endGame();
                return;
            }

            // Handle pass
            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.logPass(player);
            }

            OthelloCore.setCurrentPlayer(opponent);

            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.updateStatus();
            }

            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.setAIThinking(false);
            }

            makeAIMove(isTournament);
            return;
        }

        // Add a small time penalty for using the random fallback strategy
        const randomStrategyTime = 100; // 100ms penalty

        if (player === GAME_CONSTANTS.BLACK) {
            blackTimeUsed += randomStrategyTime;
            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.updateBlackTime(blackTimeUsed);
            }
        } else {
            whiteTimeUsed += randomStrategyTime;
            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.updateWhiteTime(whiteTimeUsed);
            }
        }

        // Update timers display
        if (typeof OthelloUI !== 'undefined') {
            OthelloUI.updateTimers();
        }

        // Check if the player has exceeded time limit even with just the penalty
        if (typeof OthelloUI !== 'undefined' &&
            OthelloUI.checkTimeLimit(player, player === GAME_CONSTANTS.BLACK ? blackTimeUsed : whiteTimeUsed)) {
            return; // Game ended due to time limit violation
        }

        // Log that we're using random strategy
        const playerName = typeof OthelloUI !== 'undefined' ? OthelloUI.getPlayerName(player) : `Player ${player}`;

        if (typeof OthelloUI !== 'undefined') {
            OthelloUI.logMessage(`${playerName} is using random strategy (fallback)`);
        }

        // Select a random valid move
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        console.log(`[useFallbackMove] Selected random move for P${player}:`, randomMove);

        // Execute the move
        OthelloCore.makeMove(randomMove.row, randomMove.col, player);

        // Determine next player
        const previousPlayer = player;
        const nextPlayer = OthelloCore.determineNextPlayer();

        // Check if same player continues (for fewer pieces rule)
        if (previousPlayer === nextPlayer) {
            console.log(`[useFallbackMove] Same player (${playerName}) continues (fewer pieces rule)`);
            if (typeof OthelloUI !== 'undefined') {
                OthelloUI.logMessage(`${playerName} continues (fewer pieces rule)`);
            }
        }

        OthelloCore.setCurrentPlayer(nextPlayer);

        if (typeof OthelloUI !== 'undefined') {
            OthelloUI.updateStatus();
        }

        // Reset thinking flag
        if (typeof OthelloUI !== 'undefined') {
            OthelloUI.setAIThinking(false);
        }

        // Schedule next turn
        makeAIMove(isTournament);
    }

    /**
     * Reset the game
     * @param {Object} stageConfig - Stage configuration
     * @param {boolean} isPreview - Whether this is just a preview
     */
    function resetGame(stageConfig, isPreview = true) {
        console.log("[resetGame] Function called!");

        // Clear any ongoing game loop
        if (gameLoopTimeout) {
            clearTimeout(gameLoopTimeout);
            gameLoopTimeout = null;
        }

        // Reset state
        OthelloCore.setGameRunning(false);

        if (typeof OthelloUI !== 'undefined') {
            OthelloUI.setAIThinking(false);
        }

        // Get stage config if not provided
        if (!stageConfig) {
            const stageSelect = document.getElementById('stageSelect');
            const selectedIndex = parseInt(stageSelect && stageSelect.value || 0);
            stageConfig = stages[selectedIndex] || stages[0];
        }

        // Initialize board in preview mode
        OthelloCore.initializeBoard(stageConfig, isPreview);

        // Reset player
        OthelloCore.setCurrentPlayer(GAME_CONSTANTS.BLACK);

        // Reset game log
        if (typeof OthelloUI !== 'undefined') {
            OthelloUI.clearMoveLog();
            OthelloUI.logMessage("Board reset.");

            // Update UI
            OthelloUI.updateGameLog();
            OthelloUI.enableStartButton();
            OthelloUI.displayMessage("Ready to start.", '');
        }
    }

    /**
     * Get black time used
     * @returns {number} Black time used (ms)
     */
    function getBlackTimeUsed() {
        return blackTimeUsed;
    }

    /**
     * Get white time used
     * @returns {number} White time used (ms)
     */
    function getWhiteTimeUsed() {
        return whiteTimeUsed;
    }

    // Public API
    return {
        // Game control functions
        startGame,
        resetGame,
        makeAIMove,

        // Time tracking
        getBlackTimeUsed,
        getWhiteTimeUsed
    };
})();

// Export as a global object or use module exports if using bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameController;
}