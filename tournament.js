/**
 * tournament.js
 * 
 * Manages the Othello tournament functionality
 * Handles game matchmaking, running tournaments, and updating leaderboard
 */

const Tournament = (function () {
    let leaderboardData = { matches: [], results: {} };
    let isTournamentMode = false;
    let currentTournamentStageConfig = null;

    // UI 요소 참조
    let tournamentStatusElement = null;
    let stageSelect = null;
    let blackAISelect = null;
    let whiteAISelect = null;

    // DOM 요소 초기화 함수
    function initElements() {
        tournamentStatusElement = document.getElementById('tournament-status');
        stageSelect = document.getElementById('stageSelect');
        blackAISelect = document.getElementById('black-ai');
        whiteAISelect = document.getElementById('white-ai');

        // 중지 버튼 참조 추가
        stopTournamentButton = document.getElementById('stop-tournament-btn');
        runTournamentButton = document.getElementById('run-tournament-btn');

        // 중지 버튼 초기 상태 설정
        if (stopTournamentButton) {
            stopTournamentButton.disabled = !isTournamentMode;
        }
    }

    // 다른 모듈의 함수를 사용하기 위한 래퍼 함수들
    function countDiscs() {
        if (typeof OthelloCore !== 'undefined' && OthelloCore.countDiscs) {
            return OthelloCore.countDiscs();
        }
        return { black: 0, white: 0 };
    }

    function logMessage(msg) {
        if (typeof OthelloUI !== 'undefined' && OthelloUI.logMessage) {
            OthelloUI.logMessage(msg);
        } else {
            console.log(msg);
        }
    }

    function startGame(isTournament, stageConfig) {
        if (typeof GameController !== 'undefined' && GameController.startGame) {
            return GameController.startGame(isTournament, stageConfig);
        }
        console.error("GameController not available");
        return false;
    }

    // 전역 변수를 로컬 변수로 대체
    let builtInStrategies = {};
    let savedStrategies = {};

    // OthelloStrategies에서 필요한 정보 가져오기
    function updateStrategyReferences() {
        if (typeof OthelloStrategies !== 'undefined') {
            // 빌트인 전략에 대한 참조 생성
            OthelloStrategies.getBuiltInStrategyNames().forEach(name => {
                builtInStrategies[name] = OthelloStrategies.getBuiltInStrategy(name);
            });

            // 저장된 전략 목록 업데이트
            OthelloStrategies.getStrategyNames().forEach(name => {
                savedStrategies[name] = OthelloStrategies.getStrategyCode(name);
            });
        }
    }

    /**
     * Record the result of a match in the tournament
     * @param {string} blackName - Name of the black player
     * @param {string} whiteName - Name of the white player
     * @param {number} winner - Player who won the match (1 for black, 2 for white, 0 for draw)
     */
    function recordGameResult(blackName, whiteName, winner) {
        const scores = countDiscs();
        const match = {
            black: blackName,
            white: whiteName,
            winner: winner,
            date: new Date().toISOString(),
            score: scores,
        };

        leaderboardData.matches.push(match);

        [blackName, whiteName].forEach((name) => {
            if (!leaderboardData.results[name]) {
                leaderboardData.results[name] = { wins: 0, losses: 0, draws: 0, totalGames: 0 };
            }
        });

        if (winner === 1) {
            leaderboardData.results[blackName].wins++;
            leaderboardData.results[whiteName].losses++;
        } else if (winner === 2) {
            leaderboardData.results[blackName].losses++;
            leaderboardData.results[whiteName].wins++;
        } else {
            leaderboardData.results[blackName].draws++;
            leaderboardData.results[whiteName].draws++;
        }

        leaderboardData.results[blackName].totalGames++;
        leaderboardData.results[whiteName].totalGames++;

        // 내부 함수 호출
        saveLeaderboardData();
    }

    /**
     * Calculate the final leaderboard and update the display
     */
    function updateLeaderboardDisplay() {
        const leaderboardBody = document.getElementById('leaderboard-body');
        if (!leaderboardBody) return;

        leaderboardBody.innerHTML = '';

        const leaderboard = Object.keys(leaderboardData.results).map((name) => {
            const stats = leaderboardData.results[name];
            return {
                name: name,
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws,
                totalGames: stats.totalGames,
                winRate: stats.totalGames > 0 ? ((stats.wins + stats.draws * 0.5) / stats.totalGames * 100).toFixed(1) : 0,
            };
        });

        leaderboard.sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

        leaderboard.forEach((entry, idx) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${idx + 1}</td><td>${entry.name}</td><td>${entry.winRate}%</td><td>${entry.wins}</td><td>${entry.losses}</td><td>${entry.draws}</td><td>${entry.totalGames}</td>`;
            row.style.animation = 'fadeIn 0.5s';
            leaderboardBody.appendChild(row);
        });
        const style = document.createElement('style');
        style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; background-color: rgba(76, 175, 80, 0.2); }
            to { opacity: 1; background-color: transparent; }
        }
        `;
        document.head.appendChild(style);
    }

    /**
     * Save the leaderboard data to localStorage
     */
    function saveLeaderboardData() {
        try {
            localStorage.setItem('othelloLeaderboard', JSON.stringify(leaderboardData));
        } catch (e) {
            console.error("Failed to save leaderboard data:", e);
        }
    }

    /**
     * Load the leaderboard data from localStorage
     */
    function loadLeaderboardData() {
        // DOM 요소 초기화
        initElements();

        const data = localStorage.getItem('othelloLeaderboard');
        if (data) {
            try {
                leaderboardData = JSON.parse(data);
            } catch (e) {
                console.error("Error loading leaderboard data:", e);
                leaderboardData = { matches: [], results: {} };
            }
        } else {
            leaderboardData = { matches: [], results: {} };
        }
        updateLeaderboardDisplay();
    }

    /**
     * Run a tournament game between two players
     * @returns {Promise<void>}
     */
    async function playTournamentGame() {
        // Initialize UI elements if not already available
        if (!blackAISelect || !whiteAISelect) {
            initElements();
            if (!blackAISelect || !whiteAISelect) {
                console.error("AI select elements not found");
                return Promise.reject("UI elements not found");
            }
        }

        // Get the names of the competing AI strategies
        const blackName = blackAISelect.options[blackAISelect.selectedIndex].text;
        const whiteName = whiteAISelect.options[whiteAISelect.selectedIndex].text;

        return new Promise((resolve) => {
            // Check if GameController module is available
            if (typeof GameController === 'undefined' || !GameController.startGame) {
                console.error("GameController module not available");
                resolve(false);
                return;
            }

            // Start the game in tournament mode
            GameController.startGame(true, currentTournamentStageConfig);
            // Alternative: use a local function if needed
            // startGame(true, currentTournamentStageConfig);

            // Poll at regular intervals to check when the game has ended
            const checkInterval = setInterval(() => {
                // Check game state using OthelloCore module
                const gameRunning = typeof OthelloCore !== 'undefined' ? OthelloCore.isGameRunning() : false;

                // If game is no longer running, process results
                if (!gameRunning) {
                    clearInterval(checkInterval);

                    // Get final scores and determine the winner
                    const scores = countDiscs();
                    let winner = 0;

                    if (scores.black > scores.white) winner = 1;
                    else if (scores.white > scores.black) winner = 2;

                    // Record results and update UI
                    recordGameResult(blackName, whiteName, winner);
                    updateLeaderboardDisplay();

                    // Update tournament status display
                    if (tournamentStatusElement && isTournamentMode) {
                        const playedGames = leaderboardData.matches.length;
                        const totalGames = getAllStrategies().length * (getAllStrategies().length - 1);
                        tournamentStatusElement.textContent = `Running... (${playedGames}/${totalGames})`;
                    }

                    // Resolve the promise to continue with next game
                    resolve();
                }
            }, 20); // Check every 20ms
        });
    }

    /**
     * Run the full tournament by matching all strategies
     */
    async function runTournament() {
        if (isTournamentMode) return;

        // DOM 요소 초기화
        initElements();

        isTournamentMode = true;
        console.log("=== Othello Tournament Start ===");

        if (tournamentStatusElement) {
            tournamentStatusElement.textContent = 'Running...';
        }

        // Disable run button, enable stop button
        const runTournamentButton = document.getElementById('run-tournament-btn');
        if (runTournamentButton) {
            runTournamentButton.disabled = true;
        }

        if (stopTournamentButton) {
            stopTournamentButton.disabled = false;
        }

        // 전략 목록 업데이트
        updateStrategyReferences();
        const allStrategies = getAllStrategies();

        if (allStrategies.length < 2) {
            if (tournamentStatusElement) {
                tournamentStatusElement.textContent = 'Need >= 2 AIs';
            }
            isTournamentMode = false;
            return;
        }

        if (!stageSelect) {
            console.error("Stage select element not found");
            isTournamentMode = false;
            return;
        }

        const selectedIndex = parseInt(stageSelect && stageSelect.value || 0);
        currentTournamentStageConfig = stages[selectedIndex >= 0 && selectedIndex < stages.length ? selectedIndex : 0];

        console.log(`Tournament using stage: ${currentTournamentStageConfig.name}`);
        logMessage(`=== Tournament Start on Stage: ${currentTournamentStageConfig.name} ===`);

        const totalGames = allStrategies.length * (allStrategies.length - 1);
        let played = 0;
        leaderboardData = { matches: [], results: {} };
        updateLeaderboardDisplay();

        for (let i = 0; i < allStrategies.length; i++) {
            for (let j = 0; j < allStrategies.length; j++) {
                if (i === j) continue;

                const p1S = allStrategies[i];
                const p2S = allStrategies[j];

                played++;
                if (tournamentStatusElement && isTournamentMode) {
                    tournamentStatusElement.textContent = `Running... (${played}/${totalGames})`;
                }

                if (!isTournamentMode) {
                    console.log("Tournament stopped during execution");
                    break;
                }

                logMessage(`\n===== Game ${played}/${totalGames} =====`);
                logMessage(`${p1S.name}(B) vs ${p2S.name}(W)`);
                console.log(`Game ${played}: ${p1S.name} vs ${p2S.name}`);

                await new Promise((r) => setTimeout(r, 10));

                if (blackAISelect && whiteAISelect) {
                    blackAISelect.value = p1S.id;
                    whiteAISelect.value = p2S.id;
                    await playTournamentGame();
                } else {
                    console.error("AI select elements not found");
                }
            }
            if (!isTournamentMode) {
                console.log("Tournament stopped during execution");
                break;
            }
        }

        saveLeaderboardData();
        updateLeaderboardDisplay();

        if (isTournamentMode) {
            tournamentStatusElement.textContent = `Complete! (${totalGames} games on ${currentTournamentStageConfig.name})`;
            isTournamentMode = false;
            logMessage(`=== Tournament Finished ===`);
            console.log("=== Othello Tournament Finished ===");
        }

        if (runTournamentButton) {
            runTournamentButton.disabled = false;
        }

        if (stopTournamentButton) {
            stopTournamentButton.disabled = true;
        }

        setupRolloutAfterTournament();
    }

    function setupRolloutAfterTournament() {
       
        if (typeof GameLogger === 'undefined' || !GameLogger.previousGames || GameLogger.previousGames.length === 0) {
            console.warn("No previous games available for rollout");
            return;
        }

        // Prepare Rollout Controller
        try {
            // 로그 입력란에 게임 로그 표시
            const logInput = document.getElementById('log-input');
            if (logInput) {
                // 마지막 게임의 로그 또는 모든 게임의 로그 요약 표시
                const displayGameLog = () => {
                    const lastGame = GameLogger.previousGames[GameLogger.previousGames.length - 1];

                    if (lastGame && lastGame.logText) {
                        // 로그 텍스트가 있는 경우 표시
                        logInput.value = lastGame.logText;
                    } else {
                        // 로그 텍스트가 없는 경우 요약 생성
                        const summaryLogs = GameLogger.previousGames.map((game, index) => {
                            if (game.metadata) {
                                const { blackStrategy, whiteStrategy, stage, blackScore, whiteScore } = game.metadata;
                                return `Game ${index + 1}: ${blackStrategy}(B) ${blackScore}-${whiteScore} ${whiteStrategy}(W) on ${stage}`;
                            }
                            return `Game ${index + 1}: (No metadata available)`;
                        });

                        logInput.value = summaryLogs.join('\n\n');
                    }
                };

                displayGameLog();
            }

            // GameRollout 모듈이 있다면 롤아웃 설정
            if (typeof window.gameRollout !== 'undefined') {
                // GameRollout 객체 초기화
                window.gameRollout.analyzeGameBoundaries();

                // 마지막 게임의 인덱스로 설정
                const lastGameIndex = GameLogger.previousGames.length - 1;
                window.gameRollout.currentGameIndex = lastGameIndex;
                window.gameRollout.currentMoveIndex = -1; // Turn 0

                // 롤아웃 컨트롤 초기화
                if (typeof updateRolloutControls === 'function') {
                    updateRolloutControls();
                }

                console.log("Rollout setup completed for tournament games");

                // 롤아웃 컨트롤 영역으로 스크롤 (옵션)
                const rolloutControls = document.querySelector('.rollout-controls');
                if (rolloutControls) {
                    rolloutControls.scrollIntoView({ behavior: 'smooth' });
                }
            }
        } catch (error) {
            console.error("Error setting up rollout after tournament:", error);
        }
    }

    /**
     * Get all strategies (both built-in and custom)
     */
    function getAllStrategies() {
        const allStrategies = [];

        // 빌트인 전략
        if (typeof OthelloStrategies !== 'undefined') {
            OthelloStrategies.getBuiltInStrategyNames()
                .filter((k) => k !== 'custom')
                .sort()
                .forEach((name) => allStrategies.push({
                    id: name,
                    name: name.charAt(0).toUpperCase() + name.slice(1)
                }));

            // 커스텀 전략
            OthelloStrategies.getStrategyNames()
                .sort()
                .forEach((name) => allStrategies.push({
                    id: `custom_${name}`,
                    name
                }));
        }

        return allStrategies;
    }

    /**
 * Stop the currently running tournament
 * @returns {boolean} True if tournament was stopped, false if no tournament was running
 */
    function stopTournament() {
        if (!isTournamentMode) {
            console.log("No tournament running to stop");
            if (tournamentStatusElement) {
                tournamentStatusElement.textContent = "No tournament is currently running.";
            }
            return false;
        }

        console.log("Tournament manually stopped by user");

        isTournamentMode = false;

        // Log the interruption
        logMessage(`=== Tournament Interrupted ===`);
        logMessage(`Match was manually stopped after ${leaderboardData.matches.length} games.`);

        // Update tournament status
        if (tournamentStatusElement) {
            tournamentStatusElement.textContent = `Competition stopped after ${leaderboardData.matches.length} games.`;
        }

        // Save current leaderboard data
        saveLeaderboardData();

        // Enable the run tournament button
        const runTournamentButton = document.getElementById('run-tournament-btn');
        if (runTournamentButton) {
            runTournamentButton.disabled = false;
        }

        // Set tournament mode to false
        isTournamentMode = false;

        // Update leaderboard display
        updateLeaderboardDisplay();

        // Set up rollout for the games that were completed
        setupRolloutAfterTournament();

        return true;
    }

    
    function resetLeaderboard() {
        if (isTournamentMode) {
            console.warn("Cannot reset tournament data while a tournament is running.");
            return false;
        }

        if (stopTournamentButton) {
            stopTournamentButton.disabled = true;
        }

        leaderboardData = { matches: [], results: {} };

        try {
            localStorage.removeItem('othelloLeaderboard');
        } catch (e) {
            console.error("Failed to remove from localStorage:", e);
        }

        updateLeaderboardDisplay();

        if (tournamentStatusElement) {
            tournamentStatusElement.textContent = "Competition records have been reset.";
        }

        console.log("Competition records reset.");
        return true;
    }

    // Public API
    return {
        recordGameResult,
        updateLeaderboardDisplay,
        saveLeaderboardData,
        loadLeaderboardData,
        runTournament,
        getAllStrategies,
        playTournamentGame,
        resetLeaderboard,
        stopTournament,
        isRunning: () => isTournamentMode
    };
})();

// Export module or global depending on usage context
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tournament;
}