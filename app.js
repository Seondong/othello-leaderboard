/**
 * app.js
 * 
 * Initializes the Othello Arena app, setting up all interactions and integrating with the game logic
 */

// App Initialization
function initializeApp() {
    console.log("Initializing Othello Arena...");

    // 1. 모듈 간 참조 설정
    if (!window.gameLogger && typeof GameLogger !== 'undefined') {
        window.gameLogger = GameLogger;
        GameLogger.loadFromLocalStorage();
    }

    // 2. 스테이지 드롭다운 초기화
    OthelloUI.populateStageSelect();

    // 3. 전략 로드 및 UI 업데이트
    OthelloStrategies.loadSavedStrategies();
    updateStrategyList();
    updateAISelectors();

    // 4. 보드 설정 및 초기화
    initializeBoardWithDefaultStage();

    // 5. 토너먼트 데이터 로드
    if (typeof Tournament !== 'undefined') {
        Tournament.loadLeaderboardData();
        Tournament.updateLeaderboardDisplay();
    }

    // 6. 이벤트 리스너 등록
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('save-strategy').addEventListener('click', saveStrategy);
    document.getElementById('clear-editor').addEventListener('click', clearEditor);
    document.getElementById('board').addEventListener('click', OthelloUI.handleHumanMove);
    document.getElementById('upload-strategies').addEventListener('click', uploadStrategies); 
    document.getElementById('run-tournament-btn').addEventListener('click', runTournament);
    document.getElementById('stop-tournament-btn').addEventListener('click', stopTournament);
    document.getElementById('reset-tournament-btn').addEventListener('click', resetTournamentRecords);
    document.getElementById('upload-intelligent-system').addEventListener('click', uploadIntelligentSystem);
    document.getElementById('save-log').addEventListener('click', saveGameLog);
    document.getElementById('stageSelect').addEventListener('change', onStageChange);
    document.getElementById('clear-all-btn').addEventListener('click', clearAllData);


    // 7. GameRollout 초기화 (GameLogger 이후에)
    if (typeof GameRollout !== 'undefined' && window.gameLogger) {
        window.gameRollout = new GameRollout(
            {
                setBoard: (boardState) => {
                    if (typeof OthelloCore !== 'undefined') {
                        OthelloUI.updateBoardDisplay(boardState);
                    }
                },
                updatePlayerIndicator: (player) => {
                    // 필요시 구현
                },
                highlightCell: (row, col) => {
                    // 필요시 구현
                }
            },
            window.gameLogger
        );

        // 롤아웃 컨트롤 설정
        setupRolloutControls();
    }

    console.log("Othello Arena Initialized.");
}

// 기본 스테이지로 보드 초기화
function initializeBoardWithDefaultStage() {
    // 현재 선택된 스테이지 가져오기
    const stageSelect = document.getElementById('stageSelect');
    const selectedIndex = parseInt(stageSelect && stageSelect.value || 0);
    const selectedStage = stages[selectedIndex >= 0 && selectedIndex < stages.length ? selectedIndex : 0];

    console.log("Initializing board with default stage:", selectedStage.name);

    // 1. 보드 UI 설정 (game-ui.js의 함수 사용)
    OthelloUI.setupBoardUI(selectedStage.boardSize);

    // 2. 보드 상태 초기화 (game-core.js의 함수 사용)
    OthelloCore.initializeBoard(selectedStage, true); // true = 프리뷰 모드
}

// 스테이지 변경 이벤트 핸들러
function onStageChange() {
    const stageSelect = document.getElementById('stageSelect');
    const selectedIndex = parseInt(stageSelect.value);
    const stageConfig = stages[selectedIndex] || stages[0];

    console.log("Stage changed to:", stageConfig.name);

    // 1. 보드 UI 업데이트
    OthelloUI.setupBoardUI(stageConfig.boardSize);

    // 2. 보드 상태 초기화
    OthelloCore.initializeBoard(stageConfig, true);
}

// Start Game Function
function startGame() {
    console.log("Starting game...");

    // 현재 선택된 스테이지 가져오기
    const stageSelect = document.getElementById('stageSelect');
    const selectedIndex = parseInt(stageSelect && stageSelect.value || 0);
    const stageConfig = stages[selectedIndex] || stages[0];

    // GameController를 통해 게임 시작
    if (typeof GameController !== 'undefined' && GameController.startGame) {
        GameController.startGame(false, stageConfig);
    } else {
        console.error("GameController not available. Cannot start game.");
    }
}

// Reset Game Function
function resetGame() {
    console.log("Resetting game...");

    // 현재 선택된 스테이지 가져오기
    const stageSelect = document.getElementById('stageSelect');
    const selectedIndex = parseInt(stageSelect && stageSelect.value || 0);
    const stageConfig = stages[selectedIndex] || stages[0];

    // GameController를 통해 게임 리셋
    if (typeof GameController !== 'undefined' && GameController.resetGame) {
        GameController.resetGame(stageConfig, true);
    } else {
        // OthelloCore로 직접 리셋
        OthelloCore.initializeBoard(stageConfig, true);
    }
}

/**
 * Clears all saved game data, including previous games, tournament results and strategies
 * This provides a way to completely reset the application state
 */
function clearAllData() {
    if (confirm("This will clear ALL saved games, tournament data, and logs. This cannot be undone. Continue?")) {
        try {
            // 1. Clear GameLogger data
            if (window.gameLogger) {
                window.gameLogger.previousGames = [];
                window.gameLogger.gameResults = [];
                window.gameLogger.reset();
                window.gameLogger.saveToLocalStorage(); // Will save empty arrays
            }

            // 2. Clear localStorage directly (as a backup)
            localStorage.removeItem('othelloPreviousGames');
            localStorage.removeItem('othelloGameResults');
            localStorage.removeItem('othelloLeaderboard');

            // 3. Reset current game state
            if (typeof OthelloCore !== 'undefined') {
                const currentStageConfig = OthelloCore.getCurrentStage() || stages[0];
                OthelloCore.initializeBoard(currentStageConfig, true);
            }

            // 4. Reset UI elements
            // Clear log input
            const logInput = document.getElementById('log-input');
            if (logInput) logInput.value = '';

            // Reset game log display
            if (typeof OthelloUI !== 'undefined' && OthelloUI.clearMoveLog) {
                OthelloUI.clearMoveLog();
            }

            // Update rollout controls
            if (typeof updateRolloutControls === 'function') {
                updateRolloutControls();
            }

            // Reset tournament leaderboard
            if (typeof Tournament !== 'undefined') {
                if (Tournament.resetLeaderboard) {
                    Tournament.resetLeaderboard();
                }
            }

            // 5. Reset GameRollout if available
            if (window.gameRollout) {
                window.gameRollout.currentMoveIndex = -1;
                window.gameRollout.currentGameIndex = 0;
                window.gameRollout.gameStartIndices = [0];
                window.gameRollout.movesPerGame = [];
                window.gameRollout.isRolling = false;
                if (window.gameRollout.rolloutTimer) {
                    clearTimeout(window.gameRollout.rolloutTimer);
                    window.gameRollout.rolloutTimer = null;
                }
            }

            // 6. Success notification
            const statusElement = document.getElementById('status');
            if (statusElement) {
                statusElement.textContent = "All game data has been cleared.";
                statusElement.style.backgroundColor = '#4CAF50';

                // Reset status after 3 seconds
                setTimeout(() => {
                    statusElement.textContent = "Ready to start.";
                    statusElement.style.backgroundColor = '#4CAF50';
                }, 3000);
            } else {
                alert("All game data has been cleared successfully.");
            }

            console.log("All game data cleared successfully");

        } catch (error) {
            console.error("Error clearing game data:", error);
            alert("An error occurred while clearing game data: " + error.message);
        }
    }
}

// Save Strategy Function
function saveStrategy() {
    const strategyName = document.getElementById('strategy-name').value.trim();
    const strategyCode = document.getElementById('js-code').value;
    if (!strategyName) {
        alert("Strategy name is required.");
        return;
    }
    if (!strategyCode) {
        alert("Strategy code is required.");
        return;
    }
    // Save the strategy
    if (OthelloStrategies.saveStrategy(strategyName, strategyCode)) {
        console.log(`Strategy "${strategyName}" saved successfully.`);
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = `Saved "${strategyName}".`;
            statusElement.style.backgroundColor = '#4CAF50';
        }
        updateStrategyList();
        updateAISelectors();
    } else {
        console.error(`Failed to save strategy "${strategyName}".`);
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = `Failed to save "${strategyName}".`;
            statusElement.style.backgroundColor = '#f44336';
        }
    }
}

// Function to upload strategy files
function uploadStrategies() {
    const fileInput = document.getElementById('strategy-file-input');
    const files = fileInput.files;

    if (files.length === 0) {
        alert('Please select files first');
        return;
    }

    // Call the importStrategiesFromFiles function from OthelloStrategies module
    if (typeof OthelloStrategies !== 'undefined' && OthelloStrategies.importStrategiesFromFiles) {
        OthelloStrategies.importStrategiesFromFiles(files)
            .then(result => {
                // Update the upload status message with detailed error information
                const uploadStatusMsg = document.getElementById('upload-status-msg');
                if (uploadStatusMsg) {
                    if (result.errors.length === 0) {
                        // Success message
                        uploadStatusMsg.textContent = `Successfully uploaded ${result.success} strategy files!`;
                        uploadStatusMsg.className = 'upload-status upload-success';
                    } else {
                        // Error message - more helpful and specific
                        if (result.success === 0) {
                            // All files failed
                            uploadStatusMsg.textContent = `Upload failed: ${result.errors[0]}`;
                        } else {
                            // Some succeeded, some failed
                            uploadStatusMsg.textContent = `Uploaded ${result.success} files, but ${result.errors.length} failed: ${result.errors[0]}`;
                        }
                        uploadStatusMsg.className = 'upload-status upload-error';

                        // Add all errors as tooltip
                        const allErrors = result.errors.join('\n');
                        uploadStatusMsg.title = allErrors;
                    }
                    uploadStatusMsg.style.display = 'block';

                    // Extend display time for error messages
                    const displayTime = result.errors.length > 0 ? 10000 : 4800;
                    setTimeout(() => { uploadStatusMsg.style.display = 'none'; }, displayTime);
                }

                // Update main status display
                const statusElement = document.getElementById('status');
                if (statusElement) {
                    if (result.errors.length === 0) {
                        statusElement.textContent = `Strategy upload successful!`;
                        statusElement.style.backgroundColor = '#4CAF50';
                    } else {
                        // More descriptive error message
                        const errorMsg = result.errors[0] || "Unknown error";
                        statusElement.textContent = `Strategy upload issue: ${errorMsg}`;
                        statusElement.style.backgroundColor = '#FF9800';
                    }
                }

                // Update strategy list and AI selectors
                updateStrategyList();
                updateAISelectors();

                // Reset file input
                fileInput.value = '';
            })
            .catch(error => {
                console.error('Error uploading strategies:', error);

                const uploadStatusMsg = document.getElementById('upload-status-msg');
                if (uploadStatusMsg) {
                    uploadStatusMsg.textContent = `Upload error: ${error.message}`;
                    uploadStatusMsg.className = 'upload-status upload-error';
                    uploadStatusMsg.style.display = 'block';
                    setTimeout(() => { uploadStatusMsg.style.display = 'none'; }, 10000);
                }

                const statusElement = document.getElementById('status');
                if (statusElement) {
                    statusElement.textContent = `Upload error: ${error.message}`;
                    statusElement.style.backgroundColor = '#f44336';
                }
            });
    } else {
        console.error('OthelloStrategies module not available');
        alert('Strategy upload is not supported in this version');
    }
}

// Clear Editor Function
function clearEditor() {
    document.getElementById('js-code').value = '';
    document.getElementById('strategy-name').value = '';
}

// Run Tournament Function
function runTournament() {
    if (typeof Tournament !== 'undefined' && Tournament.runTournament) {
        Tournament.runTournament();
    } else {
        console.error("Tournament module not available");
    }
}

function stopTournament() {
    if (typeof Tournament !== 'undefined' && Tournament.stopTournament) {
        Tournament.stopTournament();
    } else {
        console.error("Tournament module not available");
        alert("Cannot stop tournament - Tournament module not available");
    }
}

// app.js에 다음 함수 추가
function resetTournamentRecords() {
    // 토너먼트가 실행 중인지 확인
    if (typeof Tournament !== 'undefined' && Tournament.isRunning && Tournament.isRunning()) {
        alert("Cannot reset competition leaderboard while it is running.");
        return;
    }

    // 토너먼트 데이터 초기화
    if (typeof Tournament !== 'undefined') {
        // Tournament 모듈에 resetLeaderboard 함수 호출
        if (Tournament.resetLeaderboard) {
            Tournament.resetLeaderboard();
        } else {
            // 직접 리더보드 데이터 초기화
            if (Tournament.leaderboardData) {
                Tournament.leaderboardData = { matches: [], results: {} };
            }
            // Tournament 모듈에 updateLeaderboardDisplay 함수 호출
            if (Tournament.updateLeaderboardDisplay) {
                Tournament.updateLeaderboardDisplay();
            }
            // Tournament 모듈에 saveLeaderboardData 함수 호출
            if (Tournament.saveLeaderboardData) {
                Tournament.saveLeaderboardData();
            }
        }
    } else {
        console.error("Tournament module not available");
    }

    // 상태 메시지 업데이트 (직접 DOM 조작)
    const tournamentStatusElement = document.getElementById('tournament-status');
    if (tournamentStatusElement) {
        tournamentStatusElement.textContent = "Competition records have been reset.";
    }

    console.log("Competition records reset.");
}

// app.js - Add uploadIntelligentSystem function
function uploadIntelligentSystem() {
    const fileInput = document.getElementById('intelligent-system-file-input');
    const progressBar = document.getElementById('intelligent-system-progress-bar');
    const progressContainer = document.getElementById('intelligent-system-progress');
    const statusElement = document.getElementById('intelligent-system-status');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        if (statusElement) {
            statusElement.textContent = 'Please select a file first.';
            statusElement.className = 'intelligent-system-status upload-error';
            statusElement.style.display = 'block';
            setTimeout(() => { statusElement.style.display = 'none'; }, 3000);
        }
        return;
    }

    const file = fileInput.files[0];

    // Display initial status
    if (statusElement) {
        statusElement.textContent = `Reading file: ${file.name}...`;
        statusElement.style.display = 'block';
        statusElement.className = 'intelligent-system-status';
    }

    // Show progress bar
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    if (progressBar) {
        progressBar.style.width = '5%';
    }

    // Read the file
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            // Update progress
            if (progressBar) {
                progressBar.style.width = '15%';
            }
            if (statusElement) {
                statusElement.textContent = `Validating file: ${file.name}...`;
            }

            const code = e.target.result;
            const systemName = file.name.replace(/\.js$/, '');

            // Check if code contains required function
            if (!code.includes('function analyzeStage') && !code.includes('analyzeStage =')) {
                throw new Error("The intelligent system must implement an 'analyzeStage' function");
            }

            // Update progress
            if (progressBar) {
                progressBar.style.width = '25%';
            }
            if (statusElement) {
                statusElement.textContent = `System validated. Preparing analysis...`;
            }

            // Get current stage
            const stageSelect = document.getElementById('stageSelect');
            const selectedIndex = parseInt(stageSelect && stageSelect.value || 0);
            const stageConfig = stages[selectedIndex] || stages[0];

            // Update progress
            if (progressBar) {
                progressBar.style.width = '30%';
            }
            if (statusElement) {
                statusElement.textContent = `Starting analysis on ${stageConfig.name}... (This may take up to 60 seconds)`;
            }

            // Use IntelligentSystemInterface to analyze stage
            if (typeof IntelligentSystemInterface !== 'undefined' && IntelligentSystemInterface.analyzeStageWithSystem) {
                // Store the intelligent system code
                if (typeof intelligentSystems === 'undefined') {
                    window.intelligentSystems = {};
                }
                window.intelligentSystems[systemName] = code;

                // Run analysis
                const success = await IntelligentSystemInterface.analyzeStageWithSystem(systemName, stageConfig, code);

                if (success) {
                    // Update progress for success
                    if (progressBar) {
                        progressBar.style.width = '100%';
                    }
                    if (statusElement) {
                        statusElement.textContent = `Analysis complete! Strategy generated for ${stageConfig.name}`;
                        statusElement.className = 'intelligent-system-status upload-success';
                    }

                    // Update AI selectors to include the new strategy
                    updateStrategyList();
                    updateAISelectors();
                } else {
                    // Update progress for failure
                    if (progressBar) {
                        progressBar.style.width = '0%';
                    }
                    if (statusElement) {
                        statusElement.textContent = `Analysis failed or timed out.`;
                        statusElement.className = 'intelligent-system-status upload-error';
                    }
                }
            } else {
                throw new Error("Intelligent System Interface not available");
            }

        } catch (error) {
            console.error("Error uploading intelligent system:", error);

            if (statusElement) {
                statusElement.textContent = `Error: ${error.message}`;
                statusElement.className = 'intelligent-system-status upload-error';
            }

            if (progressBar) {
                progressBar.style.width = '0%';
            }
        } finally {
            // Reset file input
            fileInput.value = '';

            // Enable upload button
            const uploadButton = document.getElementById('upload-intelligent-system');
            if (uploadButton) {
                uploadButton.disabled = false;
            }
        }
    };

    reader.onerror = () => {
        if (statusElement) {
            statusElement.textContent = "Error reading file";
            statusElement.className = 'intelligent-system-status upload-error';
        }

        if (progressBar) {
            progressBar.style.width = '0%';
        }

        const uploadButton = document.getElementById('upload-intelligent-system');
        if (uploadButton) {
            uploadButton.disabled = false;
        }
    };

    // Disable upload button during processing
    const uploadButton = document.getElementById('upload-intelligent-system');
    if (uploadButton) {
        uploadButton.disabled = true;
    }

    // Start file reading
    reader.readAsText(file);
}

// Update AI Selectors
// function updateAISelectors() {
//     const blackAISelect = document.getElementById('black-ai');
//     const whiteAISelect = document.getElementById('white-ai');

//     if (!blackAISelect || !whiteAISelect) return;

//     // Clear current options
//     blackAISelect.innerHTML = '';
//     whiteAISelect.innerHTML = '';

//     // Add human option
//     const humanOptionBlack = document.createElement('option');
//     humanOptionBlack.value = 'human';
//     humanOptionBlack.textContent = 'Human';
//     blackAISelect.appendChild(humanOptionBlack);

//     const humanOptionWhite = document.createElement('option');
//     humanOptionWhite.value = 'human';
//     humanOptionWhite.textContent = 'Human';
//     whiteAISelect.appendChild(humanOptionWhite);

//     // Add built-in strategies
//     const builtInStrategies = OthelloStrategies.getBuiltInStrategyNames();
//     builtInStrategies.forEach(strategy => {
//         const strategyNameDisplay = strategy.charAt(0).toUpperCase() + strategy.slice(1);

//         const optionBlack = document.createElement('option');
//         optionBlack.value = strategy;
//         optionBlack.textContent = strategyNameDisplay;
//         blackAISelect.appendChild(optionBlack);

//         const optionWhite = document.createElement('option');
//         optionWhite.value = strategy;
//         optionWhite.textContent = strategyNameDisplay;
//         whiteAISelect.appendChild(optionWhite);
//     });

//     // Add custom strategies
//     const customStrategies = OthelloStrategies.getStrategyNames();
//     customStrategies.forEach(strategy => {
//         const optionBlack = document.createElement('option');
//         optionBlack.value = `custom_${strategy}`;
//         optionBlack.textContent = strategy;
//         blackAISelect.appendChild(optionBlack);

//         const optionWhite = document.createElement('option');
//         optionWhite.value = `custom_${strategy}`;
//         optionWhite.textContent = strategy;
//         whiteAISelect.appendChild(optionWhite);
//     });
// }
// app.js - updateAISelectors function with English comments
function updateAISelectors() {
    const blackAISelect = document.getElementById('black-ai');
    const whiteAISelect = document.getElementById('white-ai');

    if (!blackAISelect || !whiteAISelect) return;

    // Store current selected values
    const blackValue = blackAISelect.value;
    const whiteValue = whiteAISelect.value;

    // Clear dropdowns
    blackAISelect.innerHTML = '';
    whiteAISelect.innerHTML = '';

    // 1. Add Human option
    const humanOptBlack = document.createElement('option');
    humanOptBlack.value = 'human';
    humanOptBlack.textContent = 'Human';
    blackAISelect.appendChild(humanOptBlack);

    const humanOptWhite = document.createElement('option');
    humanOptWhite.value = 'human';
    humanOptWhite.textContent = 'Human';
    whiteAISelect.appendChild(humanOptWhite);

    // 2. Add Built-in strategies option group
    if (typeof OthelloStrategies !== 'undefined' && OthelloStrategies.getBuiltInStrategyNames) {
        const builtInStrategies = OthelloStrategies.getBuiltInStrategyNames();

        if (builtInStrategies && builtInStrategies.length > 0) {
            // Option group for Black
            const builtInGroupBlack = document.createElement('optgroup');
            builtInGroupBlack.label = "Built-in AI";

            // Option group for White
            const builtInGroupWhite = document.createElement('optgroup');
            builtInGroupWhite.label = "Built-in AI";

            builtInStrategies.forEach(strategy => {
                // Capitalize first letter of strategy name
                const strategyName = strategy.charAt(0).toUpperCase() + strategy.slice(1);

                // Option for Black
                const optBlack = document.createElement('option');
                optBlack.value = strategy;
                optBlack.textContent = strategyName;
                builtInGroupBlack.appendChild(optBlack);

                // Option for White
                const optWhite = document.createElement('option');
                optWhite.value = strategy;
                optWhite.textContent = strategyName;
                builtInGroupWhite.appendChild(optWhite);
            });

            // Add option groups to dropdowns
            blackAISelect.appendChild(builtInGroupBlack);
            whiteAISelect.appendChild(builtInGroupWhite);
        }
    }

    // 3. Add Custom strategies option group
    if (typeof OthelloStrategies !== 'undefined' && OthelloStrategies.getStrategyNames) {
        const allStrategies = OthelloStrategies.getStrategyNames();

        // Filter out intelligent system strategies
        const customStrategies = allStrategies.filter(name =>
            !name.startsWith('intelligent_') &&
            !name.includes('_generated_') &&
            !name.endsWith('_AI')
        );

        if (customStrategies && customStrategies.length > 0) {
            // Option group for Black
            const customGroupBlack = document.createElement('optgroup');
            customGroupBlack.label = "Custom Strategies";

            // Option group for White
            const customGroupWhite = document.createElement('optgroup');
            customGroupWhite.label = "Custom Strategies";

            customStrategies.forEach(strategy => {
                // Option for Black
                const optBlack = document.createElement('option');
                optBlack.value = `custom_${strategy}`;
                optBlack.textContent = strategy;
                customGroupBlack.appendChild(optBlack);

                // Option for White
                const optWhite = document.createElement('option');
                optWhite.value = `custom_${strategy}`;
                optWhite.textContent = strategy;
                customGroupWhite.appendChild(optWhite);
            });

            // Only add option groups if they have children
            if (customGroupBlack.children.length > 0) {
                blackAISelect.appendChild(customGroupBlack);
                whiteAISelect.appendChild(customGroupWhite);
            }
        }
    }

    // 4. Add Intelligent System strategies option group
    if (typeof OthelloStrategies !== 'undefined' && OthelloStrategies.getStrategyNames) {
        const allStrategies = OthelloStrategies.getStrategyNames();

        // Filter intelligent system strategies (by naming conventions)
        const intelligentStrategies = allStrategies.filter(name =>
            name.startsWith('intelligent_') ||
            name.includes('_generated_') ||
            name.endsWith('_AI')
        );

        if (intelligentStrategies && intelligentStrategies.length > 0) {
            // Option group for Black
            const intelligentGroupBlack = document.createElement('optgroup');
            intelligentGroupBlack.label = "Intelligent Strategies";

            // Option group for White
            const intelligentGroupWhite = document.createElement('optgroup');
            intelligentGroupWhite.label = "Intelligent Strategies";

            intelligentStrategies.forEach(strategy => {
                // Option for Black
                const optBlack = document.createElement('option');
                optBlack.value = `custom_${strategy}`;
                optBlack.textContent = strategy;
                intelligentGroupBlack.appendChild(optBlack);

                // Option for White
                const optWhite = document.createElement('option');
                optWhite.value = `custom_${strategy}`;
                optWhite.textContent = strategy;
                intelligentGroupWhite.appendChild(optWhite);
            });

            // Only add option groups if they have children
            if (intelligentGroupBlack.children.length > 0) {
                blackAISelect.appendChild(intelligentGroupBlack);
                whiteAISelect.appendChild(intelligentGroupWhite);
            }
        }
    }

    // 5. Restore previous selection values
    try {
        // Check if previously selected values still exist
        const blackExists = Array.from(blackAISelect.options).some(opt => opt.value === blackValue);
        const whiteExists = Array.from(whiteAISelect.options).some(opt => opt.value === whiteValue);

        // Set to previous value if exists, otherwise default to 'human'
        blackAISelect.value = blackExists ? blackValue : 'human';
        whiteAISelect.value = whiteExists ? whiteValue : 'human';
    } catch (e) {
        console.error("Error restoring AI selector values:", e);
        // Set default values on error
        blackAISelect.value = 'human';
        whiteAISelect.value = 'human';
    }

    console.log("AI selectors updated with categorized strategies.");
}

/**
 * Save game logs to a file
 * This function exports all game logs to a text file and optionally as JSON
 */
function saveGameLog() {
    try {
        // Get the log input element
        const logInput = document.getElementById('log-input');
        if (!logInput) {
            console.error("Log input element not found");
            return;
        }

        // Game logs collection
        const gameTexts = [];
        let logContent = logInput.value.trim();

        // Check if GameLogger is available
        if (typeof GameLogger !== 'undefined') {
            // 1. Process previous games data
            if (GameLogger.previousGames && GameLogger.previousGames.length > 0) {
                console.log(`Found ${GameLogger.previousGames.length} previous games to save`);

                GameLogger.previousGames.forEach((game, index) => {
                    // Use stored log text if available
                    if (game.logText && game.logText.trim() !== "") {
                        gameTexts.push(`=== Game ${index + 1} ===\n${game.logText}`);
                    }
                    // Otherwise generate from metadata and moves
                    else if (game.metadata) {
                        const { blackStrategy, whiteStrategy, stage, blackScore, whiteScore } = game.metadata;
                        let gameLog = `=== Game ${index + 1} ===\n`;
                        gameLog += `${blackStrategy}(B) vs ${whiteStrategy}(W) on Stage: ${stage}\n`;

                        // If there are moves, add them
                        if (game.moves && game.moves.length > 0) {
                            const colLabels = 'abcdefghijklmnopqrstuvwxyz';
                            game.moves.forEach(move => {
                                if (move && move.player && move.position) {
                                    const playerName = move.player === GAME_CONSTANTS.BLACK ? blackStrategy : whiteStrategy;
                                    const colorIndicator = move.player === GAME_CONSTANTS.BLACK ? "(B)" : "(W)";
                                    const col = colLabels[move.position.col];
                                    const row = move.position.row + 1;
                                    gameLog += `${playerName}${colorIndicator}: ${col}${row}\n`;
                                }
                            });
                        }

                        // Add result
                        gameLog += `Game over: Final score ${blackScore}-${whiteScore}\n`;

                        // If winner can be determined
                        if (blackScore > whiteScore) {
                            gameLog += "Black wins!";
                        } else if (whiteScore > blackScore) {
                            gameLog += "White wins!";
                        } else {
                            gameLog += "It's a tie!";
                        }

                        gameTexts.push(gameLog);
                    }
                });
            }

            // 2. If current game log is available and not in previousGames
            if (typeof OthelloUI !== 'undefined' && OthelloUI.getMoveLog) {
                const currentMoveLog = OthelloUI.getMoveLog();
                if (currentMoveLog && currentMoveLog.length > 0) {
                    const currentLogText = currentMoveLog.join('\n');

                    // Check if this log is already included in previous games
                    const isAlreadyIncluded = gameTexts.some(text =>
                        text.includes(currentLogText) || currentLogText.includes(text.split('\n')[0])
                    );

                    if (!isAlreadyIncluded) {
                        gameTexts.push(`=== Current Game ===\n${currentLogText}`);
                    }
                }
            }
        }

        // 3. If we found game texts but textarea is empty, use our collected texts
        if (gameTexts.length > 0 && !logContent) {
            logContent = gameTexts.join('\n\n');

            // Update the textarea with the content
            logInput.value = logContent;
        }
        // If there's text in the textarea, but we also found our own content
        else if (logContent && gameTexts.length > 0) {
            // Check if textarea already contains all logs
            const allLogsPresent = gameTexts.every(text => logContent.includes(text.split('\n')[1]));

            // If not all logs are present, use the more comprehensive set
            if (!allLogsPresent && gameTexts.join('\n\n').length > logContent.length) {
                logContent = gameTexts.join('\n\n');
                logInput.value = logContent;
            }
        }

        // If there's still no content, show an error
        if (!logContent) {
            console.error("No game log data to save");
            return;
        }

        // Generate timestamp for filename
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;

        // Create text file for download
        const textFileName = `OthelloGameLog_${timestamp}.txt`;
        const textBlob = new Blob([logContent], { type: 'text/plain' });
        const textUrl = URL.createObjectURL(textBlob);
        const textLink = document.createElement('a');
        textLink.href = textUrl;
        textLink.download = textFileName;
        textLink.style.display = 'none';

        // Add link to document and trigger download
        document.body.appendChild(textLink);
        textLink.click();

        // Wait a short time before creating JSON file to avoid browser issues
        setTimeout(() => {
            // Also save as JSON if GameLogger is available
            if (typeof GameLogger !== 'undefined' && GameLogger.previousGames && GameLogger.previousGames.length > 0) {
                const jsonFileName = `OthelloGameData_${timestamp}.json`;
                const jsonBlob = new Blob([JSON.stringify(GameLogger.previousGames)], { type: 'application/json' });
                const jsonUrl = URL.createObjectURL(jsonBlob);
                const jsonLink = document.createElement('a');
                jsonLink.href = jsonUrl;
                jsonLink.download = jsonFileName;
                jsonLink.style.display = 'none';

                document.body.appendChild(jsonLink);
                jsonLink.click();

                // Clean up JSON link
                setTimeout(() => {
                    document.body.removeChild(jsonLink);
                    URL.revokeObjectURL(jsonUrl);
                }, 100);
            }

            // Clean up text link
            document.body.removeChild(textLink);
            URL.revokeObjectURL(textUrl);

            // Show success message
            const statusElement = document.getElementById('status');
            if (statusElement) {
                statusElement.textContent = `Game logs saved as ${textFileName}`;
                statusElement.style.backgroundColor = '#4CAF50';

                // Reset status after 3 seconds
                setTimeout(() => {
                    statusElement.textContent = "Ready to start";
                    statusElement.style.backgroundColor = '#4CAF50';
                }, 3000);
            }

            console.log(`Game logs saved as ${textFileName}`);

        }, 200);

    } catch (error) {
        console.error("Error saving game logs:", error);

        // Show error message
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = "Error saving game logs";
            statusElement.style.backgroundColor = '#f44336';
        }
    }
}

// Update Strategy List
function updateStrategyList() {
    const strategyListElement = document.getElementById('strategy-list');
    if (!strategyListElement) return;

    strategyListElement.innerHTML = '';

    const strategies = OthelloStrategies.getStrategyNames();

    if (strategies.length === 0) {
        strategyListElement.innerHTML = '<div class="strategy-item"><span>No saved strategies</span></div>';
        return;
    }

    strategies.forEach(name => {
        const strategyItem = document.createElement('div');
        strategyItem.className = 'strategy-item';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'buttons';

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => {
            const code = OthelloStrategies.getStrategyCode(name);
            if (code) {
                document.getElementById('strategy-name').value = name;
                document.getElementById('js-code').value = code;
            }
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-btn';
        deleteButton.addEventListener('click', () => {
            OthelloStrategies.deleteStrategy(name);
            updateStrategyList();
            updateAISelectors();
        });

        buttonsDiv.appendChild(editButton);
        buttonsDiv.appendChild(deleteButton);

        strategyItem.appendChild(nameSpan);
        strategyItem.appendChild(buttonsDiv);

        strategyListElement.appendChild(strategyItem);
    });
}

// Initialize the app when the window is fully loaded
window.addEventListener('load', initializeApp);

function setupRolloutControls() {
    // 이전 이벤트 리스너 제거
    const buttons = ['rollout-play', 'rollout-pause', 'rollout-stop', 'rollout-prev', 'rollout-next', 'rollout-prev-game', 'rollout-next-game'];
    buttons.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // 기존 요소를 복제하고 이벤트 리스너가 없는 새 요소로 교체
            const clone = element.cloneNode(true);
            element.parentNode.replaceChild(clone, element);
        }
    });

    // 롤아웃 버튼 요소 가져오기
    const playBtn = document.getElementById('rollout-play');
    const pauseBtn = document.getElementById('rollout-pause');
    const stopBtn = document.getElementById('rollout-stop');
    const prevBtn = document.getElementById('rollout-prev');
    const nextBtn = document.getElementById('rollout-next');
    const prevGameBtn = document.getElementById('rollout-prev-game');
    const nextGameBtn = document.getElementById('rollout-next-game');
    const speedSlider = document.getElementById('rollout-speed');
    const moveSlider = document.getElementById('rollout-moves');

    // 모든 컨트롤 요소가 없으면 종료
    if (!playBtn || !pauseBtn || !stopBtn || !prevBtn || !nextBtn) {
        console.log("Rollout controls not found in the document");
        return;
    }

    // 이벤트 리스너 추가
    if (prevGameBtn) {
        prevGameBtn.addEventListener('click', () => {
            if (window.gameRollout) {
                window.gameRollout.previousGame();
                updateRolloutControls();
            }
        });
    }

    if (nextGameBtn) {
        nextGameBtn.addEventListener('click', () => {
            if (window.gameRollout) {
                window.gameRollout.nextGame();
                updateRolloutControls();
            }
        });
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (window.gameRollout) {
                window.gameRollout.start(0);
                updateRolloutControls();
            }
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            if (window.gameRollout) {
                window.gameRollout.pause();
                updateRolloutControls();
            }
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            if (window.gameRollout) {
                window.gameRollout.stop();
                updateRolloutControls();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (window.gameRollout) {
                window.gameRollout.previous();
                updateRolloutControls();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (window.gameRollout) {
                window.gameRollout.next();
                updateRolloutControls();
            }
        });
    }

    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            if (window.gameRollout) {
                const value = parseInt(e.target.value);
                let speed = 2000 / Math.pow(2, value - 1);
                speed = Math.max(speed, 4);
                window.gameRollout.setSpeed(speed);
            }
        });
    }

    if (moveSlider) {
        moveSlider.addEventListener('input', (e) => {
            if (window.gameRollout) {
                const moveIndex = parseInt(e.target.value, 10);
                window.gameRollout.jumpToMove(moveIndex);
                updateRolloutControls();
            }
        });
    }

    // 롤아웃 컨트롤 초기 상태 업데이트
    updateRolloutControls();
}

/**
 * Updates the rollout control UI elements based on current game replay state
 * This function manages game replay navigation controls, sliders, and counters
 */
function updateRolloutControls() {
    if (!window.gameRollout) return;

    try {
        // Get current game information
        let currentTurn = window.gameRollout.currentMoveIndex + 1;
        if (window.gameRollout.currentMoveIndex === -1) {
            currentTurn = 0;
        }

        // Safely retrieve game-related information
        const totalTurns = window.gameRollout.getCurrentGameTotalTurns() || 0;
        const gameIndex = window.gameRollout.currentGameIndex || 0;

        // Check total number of games from GameLogger
        let totalGames = 1;
        if (typeof window.gameLogger !== 'undefined' &&
            window.gameLogger.previousGames &&
            window.gameLogger.previousGames.length > 0) {
            totalGames = window.gameLogger.previousGames.length;
        }

        // Update progress indicators
        const progressElem = document.getElementById('rollout-progress');
        const gameCounterElem = document.getElementById('game-counter');

        if (progressElem) {
            progressElem.textContent = `Turn ${currentTurn}/${totalTurns}`;
        }

        if (gameCounterElem) {
            gameCounterElem.textContent = `(Game ${gameIndex + 1}/${totalGames})`;
        }

        // Update move slider
        const moveSlider = document.getElementById('rollout-moves');
        if (moveSlider) {
            moveSlider.min = -1;
            moveSlider.max = Math.max(0, totalTurns - 1);
            moveSlider.value = window.gameRollout.currentMoveIndex;
        }

        // Update button states
        const playBtn = document.getElementById('rollout-play');
        const pauseBtn = document.getElementById('rollout-pause');
        const prevGameBtn = document.getElementById('rollout-prev-game');
        const nextGameBtn = document.getElementById('rollout-next-game');

        // Playback control buttons
        if (playBtn) playBtn.disabled = window.gameRollout.isRolling;
        if (pauseBtn) pauseBtn.disabled = !window.gameRollout.isRolling;

        // Game navigation buttons
        if (prevGameBtn) {
            prevGameBtn.disabled = gameIndex <= 0;
        }

        if (nextGameBtn) {
            nextGameBtn.disabled = gameIndex >= totalGames - 1;
        }

        // Log successful update
        console.log(`Rollout controls updated: Game ${gameIndex + 1}/${totalGames}, Turn ${currentTurn}/${totalTurns}`);

    } catch (error) {
        // Handle any errors that might occur during update
        console.error("Error updating rollout controls:", error);

        // Attempt to reset controls to a safe state
        const buttons = [
            'rollout-play', 'rollout-pause', 'rollout-stop',
            'rollout-prev', 'rollout-next',
            'rollout-prev-game', 'rollout-next-game'
        ];

        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = false;
        });
    }
}

// 전역 함수로 updateRolloutControls 노출
window.updateRolloutControls = updateRolloutControls;
