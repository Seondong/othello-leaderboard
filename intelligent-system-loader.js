// intelligent-system-loader.js - 클로저 보존 버전
console.log("Loading IntelligentSystemInterface...");

// 전역 컴파일된 시스템 저장소 초기화
if (!window.compiledIntelligentSystems) {
    window.compiledIntelligentSystems = {};
}

// 인터페이스 구현
window.IntelligentSystemInterface = {
    // 스테이지 분석 함수
    analyzeStageWithSystem: async function (systemName, stageConfig, systemCode) {
        console.log("analyzeStageWithSystem called with:", systemName, stageConfig);

        // UI 요소 참조
        const statusElement = document.getElementById('intelligent-system-status');
        const progressBar = document.getElementById('intelligent-system-progress-bar');
        const progressContainer = document.getElementById('intelligent-system-progress');

        // 상태 UI 업데이트
        if (statusElement) {
            statusElement.textContent = `Analyzing ${stageConfig.name} with ${systemName}...`;
            statusElement.style.display = 'block';
        }

        if (progressContainer) {
            progressContainer.style.display = 'block';
        }

        if (progressBar) {
            progressBar.style.width = '30%';
        }

        // 원본 콘솔 저장
        const originalConsole = window.console;

        try {
            // 코드 유효성 검사
            if (!systemCode || typeof systemCode !== 'string') {
                throw new Error("No system code provided");
            }

            if (!systemCode.includes('function analyzeStage') && !systemCode.includes('analyzeStage =')) {
                throw new Error("The intelligent system must implement an 'analyzeStage' function");
            }

            // 코드 컴파일 시도
            console.log("Compiling system code...");
            if (progressBar) progressBar.style.width = '40%';

            // analyzeStage 함수 추출
            const analyzeStageFunc = this.compileSystem(systemCode);

            if (typeof analyzeStageFunc !== 'function') {
                throw new Error("Failed to extract analyzeStage function");
            }

            // 로깅을 위한 콘솔 래퍼
            const logs = [];
            const wrappedConsole = {
                log: function (...args) {
                    logs.push({ type: 'log', args });
                    originalConsole.log('[Strategy]', ...args);
                },
                warn: function (...args) {
                    logs.push({ type: 'warn', args });
                    originalConsole.warn('[Strategy]', ...args);
                },
                error: function (...args) {
                    logs.push({ type: 'error', args });
                    originalConsole.error('[Strategy]', ...args);
                }
            };

            // 초기 보드와 유효 이동 생성
            const initialBoard = this.createInitialBoard(stageConfig);
            const initialValidMoves = this.getValidMoves(initialBoard, 1); // 1 = BLACK

            // 환경 API 생성
            const environmentAPI = {
                getValidMoves: (board, player) => this.getValidMoves(board, player),
                simulateMove: (board, player, row, col) => this.simulateMove(board, player, row, col),
                evaluateBoard: (board, player) => this.evaluateBoard(board, player)
            };

            // 진행 업데이트
            if (progressBar) progressBar.style.width = '50%';

            // 원본 콘솔을 래퍼로 대체
            window.console = wrappedConsole;

            // analyzeStage 함수 실행하여 전략 생성 함수 얻기
            let strategyFunction;
            try {
                // 분석 실행
                const result = analyzeStageFunc(
                    stageConfig,
                    initialBoard,
                    initialValidMoves,
                    environmentAPI
                );

                // 반환 값 확인
                if (typeof result !== 'function') {
                    console.error("The analyzeStage function did not return a function");
                    strategyFunction = null;
                } else {
                    strategyFunction = result;
                }
            } finally {
                // 콘솔 복원
                window.console = originalConsole;

                // 로그 출력
                console.log("---- Strategy Analysis Logs ----");
                logs.forEach(log => {
                    const method = log.type || 'log';
                    console[method](...log.args);
                });
                console.log("-------------------------------");
            }

            // 진행 업데이트
            if (progressBar) progressBar.style.width = '70%';

            // 전략 함수가 없으면 기본 랜덤 전략 사용
            if (!strategyFunction) {
                console.warn("Using fallback random strategy");
                strategyFunction = function (board, player, validMoves) {
                    if (!validMoves || validMoves.length === 0) return null;
                    return validMoves[Math.floor(Math.random() * validMoves.length)];
                };
            }

            // 전략 이름 생성
            const generatedStrategyName = `intelligent_${systemName}_${stageConfig.name.replace(/\s+/g, '_')}`;

            // 중요: 클로저 보존을 위해 전략 함수를 전역 객체에 저장
            window.compiledIntelligentSystems[generatedStrategyName] = strategyFunction;

            // 전략 코드 생성 - 저장된 함수를 참조하는 래퍼
            const strategyCode = `
function studentStrategy(board, player, validMoves, makeMove) {
    // Generated for ${stageConfig.name} by ${systemName}
    
    // 컴파일된 전략 함수 참조
    if (typeof window.compiledIntelligentSystems === 'undefined' || 
        !window.compiledIntelligentSystems["${generatedStrategyName}"]) {
        console.error("Strategy function not found");
        return validMoves && validMoves.length > 0 ? validMoves[0] : null;
    }
    
    try {
        // 저장된 전략 함수 호출 - 클로저 보존
        return window.compiledIntelligentSystems["${generatedStrategyName}"](board, player, validMoves, makeMove);
    } catch (error) {
        console.error("Error in strategy execution:", error);
        return validMoves && validMoves.length > 0 ? validMoves[0] : null;
    }
}`;

            // 전략 저장
            if (typeof OthelloStrategies !== 'undefined' && OthelloStrategies.saveStrategy) {
                OthelloStrategies.saveStrategy(generatedStrategyName, strategyCode);

                // 완료 UI 업데이트
                if (progressBar) progressBar.style.width = '100%';
                if (statusElement) {
                    statusElement.textContent = `Analysis complete! Generated strategy: ${generatedStrategyName}`;
                    statusElement.className = 'intelligent-system-status upload-success';
                }

                // UI 업데이트
                if (typeof updateStrategyList === 'function') updateStrategyList();
                if (typeof updateAISelectors === 'function') updateAISelectors();
            }

            return true;
        } catch (error) {
            console.error("Error analyzing system:", error);

            // 오류 UI 업데이트
            if (statusElement) {
                statusElement.textContent = `Error: ${error.message}`;
                statusElement.className = 'intelligent-system-status upload-error';
            }
            if (progressBar) progressBar.style.width = '0%';

            return false;
        } finally {
            // 콘솔이 복원되었는지 확인
            if (window.console !== originalConsole) {
                window.console = originalConsole;
            }

            // 업로드 버튼 재활성화
            const uploadButton = document.getElementById('upload-intelligent-system');
            if (uploadButton) {
                uploadButton.disabled = false;
            }
        }
    },

    // 시스템 코드 컴파일
    compileSystem: function (systemCode) {
        try {
            // 함수 컴파일
            const compiledFunc = new Function(`
                ${systemCode}
                return typeof analyzeStage === 'function' ? analyzeStage : null;
            `);

            // 실행하여 analyzeStage 함수 얻기
            return compiledFunc();
        } catch (error) {
            console.error("Error compiling system:", error);
            return null;
        }
    },

    // 초기 보드 생성 함수
    createInitialBoard: function (stageConfig) {
        if (!stageConfig) return null;

        const boardSize = stageConfig.boardSize || 8;
        const board = Array(boardSize).fill().map(() => Array(boardSize).fill(0)); // 0 = EMPTY

        // 초기 차단된 셀 설정
        if (stageConfig.initialBlocked) {
            stageConfig.initialBlocked.forEach(p => {
                if (p.r >= 0 && p.r < boardSize && p.c >= 0 && p.c < boardSize) {
                    board[p.r][p.c] = 3; // 3 = BLOCKED
                }
            });
        }

        // 초기 플레이어1 (검은색) 말 설정
        if (stageConfig.initialPlayer1) {
            stageConfig.initialPlayer1.forEach(p => {
                if (p.r >= 0 && p.r < boardSize && p.c >= 0 && p.c < boardSize) {
                    board[p.r][p.c] = 1; // 1 = BLACK
                }
            });
        }

        // 초기 플레이어2 (흰색) 말 설정
        if (stageConfig.initialPlayer2) {
            stageConfig.initialPlayer2.forEach(p => {
                if (p.r >= 0 && p.r < boardSize && p.c >= 0 && p.c < boardSize) {
                    board[p.r][p.c] = 2; // 2 = WHITE
                }
            });
        }

        return board;
    },

    // 유효한 이동 계산 함수
    getValidMoves: function (board, player) {
        if (!board) return [];

        const boardSize = board.length;
        const validMoves = [];

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (this.isValidMove(board, r, c, player)) {
                    validMoves.push({ row: r, col: c });
                }
            }
        }

        return validMoves;
    },

    // 이동 유효성 확인 함수
    isValidMove: function (board, row, col, player) {
        if (!board) return false;

        const boardSize = board.length;

        // 범위 확인
        if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
            return false;
        }

        // 빈 칸인지 확인
        if (board[row][col] !== 0) { // 0 = EMPTY
            return false;
        }

        const opponent = player === 1 ? 2 : 1; // 1 = BLACK, 2 = WHITE
        const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

        // 각 방향 확인
        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            let foundOpponent = false;

            // 해당 방향에 적의 말이 있는지 확인
            while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === opponent) {
                foundOpponent = true;
                r += dr;
                c += dc;
            }

            // 적의 말 뒤에 자신의 말이 있는지 확인
            if (foundOpponent && r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === player) {
                return true;
            }
        }

        return false;
    },

    // 이동 시뮬레이션 함수
    simulateMove: function (board, player, row, col) {
        if (!board || !this.isValidMove(board, row, col, player)) {
            return { valid: false };
        }

        const boardSize = board.length;
        const resultBoard = board.map(row => [...row]);
        const opponent = player === 1 ? 2 : 1; // 1 = BLACK, 2 = WHITE
        const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

        resultBoard[row][col] = player;
        let capturedCount = 0;

        // 각 방향으로 뒤집기
        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            const toFlip = [];

            // 해당 방향에 적의 말 수집
            while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && resultBoard[r][c] === opponent) {
                toFlip.push([r, c]);
                r += dr;
                c += dc;
            }

            // 적의 말 뒤에 자신의 말이 있으면 뒤집기
            if (toFlip.length > 0 && r >= 0 && r < boardSize && c >= 0 && c < boardSize && resultBoard[r][c] === player) {
                for (const [fr, fc] of toFlip) {
                    resultBoard[fr][fc] = player;
                }
                capturedCount += toFlip.length;
            }
        }

        return {
            valid: true,
            resultingBoard: resultBoard,
            capturedCount: capturedCount
        };
    },

    // 보드 평가 함수
    evaluateBoard: function (board, player) {
        if (!board) return { totalScore: 0 };

        const boardSize = board.length;
        const opponent = player === 1 ? 2 : 1; // 1 = BLACK, 2 = WHITE

        let playerCount = 0;
        let opponentCount = 0;
        let cornerScore = 0;
        let edgeScore = 0;

        // 기본 점수 계산
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === player) {
                    playerCount++;

                    // 모서리 점수
                    if ((r === 0 || r === boardSize - 1) && (c === 0 || c === boardSize - 1)) {
                        cornerScore += 100;
                    }
                    // 가장자리 점수
                    else if (r === 0 || r === boardSize - 1 || c === 0 || c === boardSize - 1) {
                        edgeScore += 20;
                    }
                }
                else if (board[r][c] === opponent) {
                    opponentCount++;
                }
            }
        }

        // 이동성 점수
        const playerMoves = this.getValidMoves(board, player).length;
        const opponentMoves = this.getValidMoves(board, opponent).length;
        const mobilityScore = playerMoves - opponentMoves;

        // 종합 점수
        const totalScore = (playerCount - opponentCount) +
            (mobilityScore * 2) +
            cornerScore +
            (edgeScore * 0.5);

        return {
            pieceScore: playerCount - opponentCount,
            mobilityScore: mobilityScore,
            cornerScore: cornerScore,
            edgeScore: edgeScore,
            totalScore: totalScore
        };
    }
};

console.log("IntelligentSystemInterface loaded successfully:", window.IntelligentSystemInterface);


// /**
//  * intelligent-system.js
//  * 
//  * Interface for intelligent system analysis of Othello games
//  * Provides data and API for external systems to analyze and improve strategies
//  * Enhanced to preserve closures in intelligent systems
//  */

// const IntelligentSystemInterface = (function () {
//     // 전역 클로저 보존 객체 설정
//     if (!window.compiledIntelligentSystems) {
//         window.compiledIntelligentSystems = {};
//     }

//     // 원본 콘솔 객체 참조 저장
//     const originalConsole = Object.assign({}, console);

//     /**
//      * Strategy 로깅을 위한 콘솔 래퍼 생성
//      * 원본 콘솔 메서드 유지하면서 로그 캡처
//      */
//     function createStrategyLogger() {
//         const logs = [];

//         // 원본 메서드를 보존하는 프록시 콘솔 생성
//         const strategyConsole = Object.assign({}, originalConsole, {
//             log: function (...args) {
//                 originalConsole.log('[Strategy Log]', ...args);
//                 logs.push({ type: 'log', args: args });
//             },
//             warn: function (...args) {
//                 originalConsole.warn('[Strategy Warn]', ...args);
//                 logs.push({ type: 'warn', args: args });
//             },
//             error: function (...args) {
//                 originalConsole.error('[Strategy Error]', ...args);
//                 logs.push({ type: 'error', args: args });
//             }
//         });

//         return {
//             console: strategyConsole,
//             getLogs: function () { return logs; }
//         };
//     }

//     // Private variables
//     let intelligentSystems = {};
//     let compiledIntelligentSystems = window.compiledIntelligentSystems;
//     let isAnalyzing = false;
//     let currentAnalysisStage = null;

//     // 전역 savedStrategies 변수 생성
//     let savedStrategies = {};

//     /**
//      * 인텔리전트 시스템 컴파일 - 클로저 보존 버전
//      * @param {string} systemName - 시스템 이름
//      * @returns {Function} 컴파일된 시스템 함수
//      */
//     function compileIntelligentSystem(systemName) {
//         // 이미 컴파일된 버전이 있으면 재사용
//         if (compiledIntelligentSystems[systemName]) {
//             console.log(`Using cached compiled system for ${systemName}`);
//             return compiledIntelligentSystems[systemName];
//         }

//         // 시스템 코드 가져오기
//         const code = intelligentSystems[systemName];
//         if (!code) {
//             console.error(`Intelligent system code not found: ${systemName}`);
//             return null;
//         }

//         try {
//             // 함수를 평가하고 analyzeStage 함수를 반환하는 더 안전한 방법
//             // 함수 스코프를 보존하기 위해 eval 대신 Function 생성자 사용
//             const compiledFunc = new Function(`
//                 ${code}
                
//                 // 스코프 내에서 analyzeStage 함수 직접 반환
//                 return typeof analyzeStage === 'function' ? analyzeStage : null;
//             `);

//             // 중요: 함수를 실행하여 analyzeStage 함수 자체를 얻음
//             const analyzeStageFunc = compiledFunc();

//             if (!analyzeStageFunc) {
//                 throw new Error("analyzeStage function not found in the intelligent system");
//             }

//             // 함수를 캐시에 저장 - 클로저 보존
//             compiledIntelligentSystems[systemName] = analyzeStageFunc;

//             console.log(`Successfully compiled intelligent system: ${systemName}`);
//             return analyzeStageFunc;
//         } catch (error) {
//             console.error(`Error compiling intelligent system ${systemName}:`, error);
//             return null;
//         }
//     }

//     /**
//      * 환경 API 생성 - 시뮬레이션 및 평가 기능 제공
//      * @param {Object} stageConfig - 스테이지 설정
//      * @returns {Object} 환경 API 객체
//      */
//     function createEnvironmentAPI(stageConfig) {
//         if (!stageConfig) {
//             console.error("Stage configuration is required for environment API");
//             return null;
//         }

//         // OthelloCore 모듈 확인
//         if (typeof OthelloCore === 'undefined') {
//             console.error("OthelloCore module not available for environment API");
//             return {
//                 simulateMove: () => ({ valid: false }),
//                 getValidMoves: () => [],
//                 evaluateBoard: () => ({ totalScore: 0 })
//             };
//         }

//         // 현재 게임 규칙 정보 (확장 가능)
//         const gameRules = {
//             ignoreOcclusion: stageConfig.ignoreOcclusion || false,
//             fewerPiecesContinue: stageConfig.fewerPiecesContinue || false
//         };

//         return {
//             // 이동 시뮬레이션
//             simulateMove: (board, player, row, col) => {
//                 if (!board || !Array.isArray(board) || typeof player !== 'number' ||
//                     typeof row !== 'number' || typeof col !== 'number') {
//                     return { valid: false };
//                 }

//                 // 보드 복사
//                 const boardCopy = board.map(r => [...r]);

//                 // OthelloCore 모듈 사용
//                 if (typeof OthelloCore.isValidMove === 'function' &&
//                     !OthelloCore.isValidMove(row, col, player, boardCopy)) {
//                     return { valid: false };
//                 }

//                 // 캡처 로직 (인터페이스 인스턴스에서)
//                 const capturedPieces = InterfaceInstance.simulateCapturedPieces(boardCopy, player, row, col);

//                 if (capturedPieces.length === 0) {
//                     return { valid: false };
//                 }

//                 // 보드에 적용
//                 boardCopy[row][col] = player;
//                 capturedPieces.forEach(([r, c]) => {
//                     boardCopy[r][c] = player;
//                 });

//                 return {
//                     valid: true,
//                     resultingBoard: boardCopy,
//                     capturedCount: capturedPieces.length
//                 };
//             },

//             // 유효한 이동 계산
//             getValidMoves: (board, player) => {
//                 if (!board || !Array.isArray(board) || typeof player !== 'number') {
//                     return [];
//                 }

//                 return InterfaceInstance.calculateValidMoves(board, player);
//             },

//             // 보드 위치 평가
//             evaluateBoard: (board, player) => {
//                 if (!board || !Array.isArray(board) || typeof player !== 'number') {
//                     return { totalScore: 0 };
//                 }

//                 return InterfaceInstance.evaluateBoardPosition(board, player);
//             }
//         };
//     }

//     /**
//      * 진행 상황 모니터링 설정
//      * @param {number} startTime - 시작 시간
//      * @param {number} timeout - 제한 시간
//      * @param {Function} onTimeout - 시간 초과 콜백
//      * @returns {Object} 진행 상황 모니터링 객체
//      */
//     function setupProgressMonitoring(startTime, timeout, onTimeout) {
//         // 진행 표시 요소
//         const progressBar = document.getElementById('intelligent-system-progress-bar');
//         const statusElement = document.getElementById('intelligent-system-status');

//         // 진행률 표시 간격
//         const progressInterval = setInterval(() => {
//             const elapsed = Date.now() - startTime;
//             const progressPercent = Math.min(95, Math.floor((elapsed / timeout) * 100));

//             if (progressBar) {
//                 progressBar.style.width = `${progressPercent}%`;
//             }

//             if (statusElement) {
//                 const remainingSeconds = Math.max(0, Math.ceil((timeout - elapsed) / 1000));
//                 statusElement.textContent = `Analyzing... (${progressPercent}%, ${remainingSeconds}s remaining)`;
//             }
//         }, 500);

//         // 하드 제한 시간 설정
//         const hardTimeoutId = setTimeout(() => {
//             console.warn(`Hard timeout triggered after ${timeout}ms`);
//             clearInterval(progressInterval);

//             if (typeof onTimeout === 'function') {
//                 onTimeout();
//             }

//             // UI 업데이트
//             if (statusElement) {
//                 statusElement.textContent = `Analysis timed out after ${timeout / 1000}s`;
//                 statusElement.className = 'intelligent-system-status upload-error';
//             }

//             if (progressBar) {
//                 progressBar.style.width = '100%';
//             }

//             // 업로드 버튼 활성화
//             const uploadButton = document.getElementById('upload-intelligent-system');
//             if (uploadButton) {
//                 uploadButton.disabled = false;
//             }
//         }, timeout);

//         return { progressInterval, hardTimeoutId };
//     }

//     /**
//      * Interface class for interaction between AI systems and the Arena
//      */
//     class IntelligentSystemInterface {
//         /**
//          * Create a new interface instance
//          * @param {Object} gameLogger - Game logger instance
//          * @param {Object} boardController - Board controller object
//          */
//         constructor(gameLogger, boardController) {
//             this.logger = gameLogger;
//             this.boardController = boardController;
//             this.isAnalyzing = false;
//             this.analysisResults = {};
//         }

//         /**
//          * Prepare game data to provide to the Intelligent System
//          * @param {Object} stageConfig - Stage configuration
//          * @returns {Object} Game data object
//          */
//         prepareGameData(stageConfig) {
//             // Current stage information (WITHOUT special rule flags)
//             const stageInfo = {
//                 name: stageConfig.name,
//                 boardSize: stageConfig.boardSize,
//                 initialBlocked: stageConfig.initialBlocked || [],
//                 initialPlayer1: stageConfig.initialPlayer1 || [],
//                 initialPlayer2: stageConfig.initialPlayer2 || [],
//                 // fewerPiecesContinue and ignoreOcclusion flags removed
//             };

//             // Game log and result information
//             const gameData = {
//                 stage: stageInfo,
//                 currentGameLog: this.logger.getLogs(),
//                 previousGames: this.logger.getPreviousGames(5), // Last 5 game logs
//                 gameResults: this.logger.getGameResults(null, 20), // Last 20 game results
//             };

//             return gameData;
//         }

//         /**
//          * Get the interaction API for intelligent systems
//          * @param {Object} stageConfig - Stage configuration
//          * @returns {Object} API object
//          */
//         getInteractionAPI(stageConfig) {
//             const gameData = this.prepareGameData(stageConfig);

//             // Define API object to expose to Intelligent Systems
//             return {
//                 // API to provide game data
//                 getGameData: () => gameData,

//                 // API to simulate the result of a move
//                 simulateMove: (board, player, row, col) => {
//                     // Move simulation logic
//                     const boardCopy = board.map(r => [...r]);
//                     const capturedPieces = this.simulateCapturedPieces(boardCopy, player, row, col);

//                     if (capturedPieces.length > 0) {
//                         boardCopy[row][col] = player;
//                         capturedPieces.forEach(([r, c]) => {
//                             boardCopy[r][c] = player;
//                         });
//                         return {
//                             valid: true,
//                             resultingBoard: boardCopy,
//                             capturedCount: capturedPieces.length,
//                         };
//                     }

//                     return { valid: false };
//                 },

//                 // API to calculate valid moves
//                 getValidMoves: (board, player) => {
//                     return this.calculateValidMoves(board, player);
//                 },

//                 // API to evaluate a board position
//                 evaluateBoard: (board, player) => {
//                     return this.evaluateBoardPosition(board, player);
//                 }
//             };
//         }

//         /**
//          * Helper function for move simulation
//          * @param {Array<Array<number>>} board - Board state
//          * @param {number} player - Player (BLACK or WHITE)
//          * @param {number} row - Row index
//          * @param {number} col - Column index
//          * @returns {Array<Array<number>>} Array of captured piece positions
//          */
//         simulateCapturedPieces(board, player, row, col) {
//             if (board[row][col] !== GAME_CONSTANTS.EMPTY) return [];

//             const boardSize = board.length;
//             const opponent = player === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;
//             const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
//             const capturedPieces = [];

//             // Search in each direction
//             for (const [dr, dc] of directions) {
//                 let r = row + dr;
//                 let c = col + dc;
//                 const toFlip = [];

//                 // Find opponent pieces
//                 while (
//                     r >= 0 && r < boardSize &&
//                     c >= 0 && c < boardSize &&
//                     board[r][c] === opponent
//                 ) {
//                     toFlip.push([r, c]);
//                     r += dr;
//                     c += dc;
//                 }

//                 // Flipping condition: opponent pieces surrounded by player's pieces
//                 if (
//                     toFlip.length > 0 &&
//                     r >= 0 && r < boardSize &&
//                     c >= 0 && c < boardSize &&
//                     board[r][c] === player
//                 ) {
//                     capturedPieces.push(...toFlip);
//                 }
//             }

//             return capturedPieces;
//         }

//         /**
//          * Helper function to calculate valid moves
//          * @param {Array<Array<number>>} board - Board state
//          * @param {number} player - Player (BLACK or WHITE)
//          * @returns {Array<Object>} Array of valid moves {row, col, capturedCount}
//          */
//         calculateValidMoves(board, player) {
//             const boardSize = board.length;
//             const validMoves = [];

//             for (let r = 0; r < boardSize; r++) {
//                 for (let c = 0; c < boardSize; c++) {
//                     if (board[r][c] !== GAME_CONSTANTS.EMPTY) continue;

//                     const capturedPieces = this.simulateCapturedPieces(board, player, r, c);
//                     if (capturedPieces.length > 0) {
//                         validMoves.push({ row: r, col: c, capturedCount: capturedPieces.length });
//                     }
//                 }
//             }

//             return validMoves;
//         }

//         /**
//          * Helper function to evaluate board position
//          * @param {Array<Array<number>>} board - Board state
//          * @param {number} player - Player (BLACK or WHITE)
//          * @returns {Object} Evaluation metrics
//          */
//         evaluateBoardPosition(board, player) {
//             const boardSize = board.length;
//             const opponent = player === GAME_CONSTANTS.BLACK ? GAME_CONSTANTS.WHITE : GAME_CONSTANTS.BLACK;

//             let playerCount = 0;
//             let opponentCount = 0;
//             let mobilityScore = 0;
//             let cornerScore = 0;
//             let edgeScore = 0;

//             // Calculate piece count and position scores
//             for (let r = 0; r < boardSize; r++) {
//                 for (let c = 0; c < boardSize; c++) {
//                     if (board[r][c] === player) {
//                         playerCount++;

//                         // Corner score
//                         if ((r === 0 || r === boardSize - 1) && (c === 0 || c === boardSize - 1)) {
//                             cornerScore += 100;
//                         }
//                         // Edge score
//                         else if (r === 0 || r === boardSize - 1 || c === 0 || c === boardSize - 1) {
//                             edgeScore += 20;
//                         }
//                     }
//                     else if (board[r][c] === opponent) {
//                         opponentCount++;
//                     }
//                 }
//             }

//             // Calculate mobility score (number of valid moves)
//             const playerMoves = this.calculateValidMoves(board, player).length;
//             const opponentMoves = this.calculateValidMoves(board, opponent).length;
//             mobilityScore = playerMoves - opponentMoves;

//             // Overall evaluation
//             return {
//                 pieceScore: playerCount - opponentCount,
//                 mobilityScore: mobilityScore,
//                 cornerScore: cornerScore,
//                 edgeScore: edgeScore,
//                 totalScore: (playerCount - opponentCount) + mobilityScore * 2 + cornerScore + edgeScore * 0.5
//             };
//         }
//     }

//     // 싱글톤 인터페이스 인스턴스 생성
//     const InterfaceInstance = new IntelligentSystemInterface(
//         // 로거와 보드 컨트롤러는 필요 시 초기화
//         typeof GameLogger !== 'undefined' ? GameLogger : { getLogs: () => ({}), getPreviousGames: () => [], getGameResults: () => [] },
//         typeof OthelloCore !== 'undefined' ? { getBoard: () => OthelloCore.getBoard() } : {}
//     );

//     /**
//      * Analyze a stage with the specified intelligent system - 클로저 보존 버전
//      * @param {string} systemName - Name of the intelligent system to use
//      * @param {Object} stageConfig - Stage configuration
//      * @returns {Promise<boolean>} Success status
//      */
//     async function analyzeStageWithSystem(systemName, stageConfig, systemCode = null) {
//         if (isAnalyzing) {
//             console.warn("Another analysis is already in progress. Please wait.");
//             const statusElement = document.getElementById('intelligent-system-status');
//             if (statusElement) {
//                 statusElement.textContent = "Another analysis is already running. Please wait.";
//                 statusElement.className = 'intelligent-system-status upload-error';
//                 statusElement.style.display = 'block';
//             }
//             return false;
//         }

//         console.log(`[Main] Starting analysis process for system: ${systemName} on stage: ${stageConfig.name}`);
//         isAnalyzing = true;
//         currentAnalysisStage = stageConfig;

//         // Setup UI for analysis
//         setupAnalysisUI(systemName, stageConfig);

//         // Start timing
//         const startTime = Date.now();
//         const analysisTimeout = 60000; // 60 seconds timeout
//         let analysisTimedOut = false;

//         // Monitoring progress
//         const { progressInterval, hardTimeoutId } = setupProgressMonitoring(
//             startTime, analysisTimeout, () => { analysisTimedOut = true; }
//         );

//         let generatedStrategy = null;
//         let analysisError = null;

        
//         try {
//             // 시스템 코드가 직접 전달된 경우, 이를 등록
//             if (systemCode) {
//                 console.log(`[Main] Registering intelligent system with provided code: ${systemName}`);
//                 intelligentSystems[systemName] = systemCode;
//             }
//             // 아니면 파일에서 가져오기
//             else if (!intelligentSystems[systemName]) {
//                 console.log(`[Main] Registering intelligent system from file: ${systemName}`);

//                 // 파일에서 가져오기
//                 const fileInput = document.getElementById('intelligent-system-file-input');
//                 if (fileInput && fileInput.files && fileInput.files[0]) {
//                     const file = fileInput.files[0];
//                     const reader = new FileReader();

//                     // 파일 읽기 Promise
//                     const readFilePromise = new Promise((resolve, reject) => {
//                         reader.onload = (e) => resolve(e.target.result);
//                         reader.onerror = (e) => reject(new Error("Failed to read file"));
//                         reader.readAsText(file);
//                     });

//                     // 파일 내용 가져오기
//                     const code = await readFilePromise;
//                     intelligentSystems[systemName] = code;
//                 }

//                 if (!intelligentSystems[systemName]) {
//                     throw new Error("Failed to register intelligent system: No code provided");
//                 }
//             }

//             // Compile the intelligent system
//             const analyzeFunction = compileIntelligentSystem(systemName);
//             if (!analyzeFunction) {
//                 throw new Error("Failed to compile intelligent system");
//             }

//             // Prepare stage data
//             const analysisBoard = typeof OthelloCore !== 'undefined' && OthelloCore.createInitialBoard ?
//                 OthelloCore.createInitialBoard(stageConfig) :
//                 Array(stageConfig.boardSize).fill().map(() => Array(stageConfig.boardSize).fill(0));

//             const initialValidMoves = typeof OthelloCore !== 'undefined' && OthelloCore.getValidMoves ?
//                 OthelloCore.getValidMoves(GAME_CONSTANTS.BLACK, analysisBoard) :
//                 InterfaceInstance.calculateValidMoves(analysisBoard, GAME_CONSTANTS.BLACK);

//             // 환경 API 생성
//             const environmentAPI = createEnvironmentAPI(stageConfig);

//             // Run the analysis
//             const analysisPromise = new Promise((resolve) => {
//                 try {
//                     console.log(`[Main] Executing analyzeFunction for ${systemName}...`);

//                     // 콘솔 래핑 설정
//                     const logger = createStrategyLogger();
//                     const savedConsole = window.console;

//                     // 원본 콘솔 메서드 유지 확인
//                     window.console = Object.assign({}, savedConsole, logger.console);

//                     try {
//                         // 중요: 클로저 유지하면서 전략 함수 실행
//                         const result = analyzeFunction(
//                             stageConfig,
//                             analysisBoard,
//                             initialValidMoves,
//                             environmentAPI
//                         );

//                         // 반환 값 확인
//                         if (typeof result !== 'function') {
//                             console.warn("The analyzeStage function did not return a function. Using a fallback.");
//                             resolve(() => initialValidMoves.length > 0 ? initialValidMoves[0] : null);
//                         } else {
//                             resolve(result);
//                         }

//                         // 원래 콘솔 복원
//                         window.console = savedConsole;

//                         // 로그 출력
//                         const logs = logger.getLogs();
//                         console.log("=========== Strategy Analysis Logs ===========");
//                         logs.forEach(log => {
//                             const method = log.type || 'log';
//                             console[method](...log.args);
//                         });
//                         console.log("==============================================");
//                     } catch (execError) {
//                         // 오류 발생 시 콘솔 복원 확인
//                         window.console = savedConsole;
//                         console.error(`[Main] Error during analyzeFunction execution:`, execError);
//                         analysisError = execError;
//                         resolve(null);
//                     }
//                 } catch (promiseError) {
//                     console.error(`[Main] Promise setup error:`, promiseError);
//                     analysisError = promiseError;
//                     resolve(null);
//                 }
//             });

//             // 제한 시간 설정
//             const timeoutPromise = new Promise((_, reject) => {
//                 setTimeout(() => {
//                     console.log(`[Main] Regular timeout triggered after ${analysisTimeout}ms`);
//                     reject(new Error(`Analysis timed out (${analysisTimeout / 1000}s)`));
//                 }, analysisTimeout);
//             });

//             // Race between analysis and timeout
//             console.log(`[Main] Waiting for analysis result or timeout...`);

//             if (!analysisTimedOut) {
//                 // 중요: 클로저를 보존하기 위해 직접 함수 참조
//                 const result = await Promise.race([analysisPromise, timeoutPromise]);
//                 generatedStrategy = result;
//             }

//             clearInterval(hardTimeoutId);

//             if (analysisTimedOut) return false;
//         } catch (error) {
//             console.error(`[Main] Promise.race failed:`, error.message);
//             analysisError = error;
//             generatedStrategy = null;
//         } finally {
//             // Final analysis timing
//             const endTime = Date.now();
//             const elapsedTime = endTime - startTime;
//             console.log(`[Main] Final check: Elapsed time = ${elapsedTime}ms`);

//             if (!analysisTimedOut && elapsedTime > analysisTimeout) {
//                 console.warn(`[Main] Analysis took too long, exceeding timeout. Discarding result.`);
//                 generatedStrategy = null;
//                 analysisError = new Error(`Analysis exceeded timeout limit.`);
//             }

//             clearInterval(progressInterval);
//         }

//         // Process the results
//         return processAnalysisResult(generatedStrategy, analysisError, analysisTimedOut, systemName, stageConfig, startTime);
//     }

//     /**
//      * Handle the analysis result processing - 클로저 보존 버전
//      * @param {Function} generatedStrategy - Strategy function generated by the analysis
//      * @param {Error} analysisError - Error encountered during analysis
//      * @param {boolean} analysisTimedOut - Whether analysis timed out
//      * @param {string} systemName - Name of the intelligent system
//      * @param {Object} stageConfig - Stage configuration
//      * @param {number} startTime - Start time of the analysis
//      * @returns {boolean} Success status
//      */
//     function processAnalysisResult(generatedStrategy, analysisError, analysisTimedOut, systemName, stageConfig, startTime) {
//         if (generatedStrategy && typeof generatedStrategy === 'function' && !analysisTimedOut) {
//             try {
//                 const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
//                 console.log(`[Main] Analysis successful. Strategy stored: ${systemName}`);

//                 // Create a unique name for the strategy based on system name and stage
//                 // 인텔리전트 시스템임을 나타내는 접두사 추가
//                 const generatedStrategyName = `intelligent_${systemName}_${stageConfig.name.replace(/\s+/g, '_')}`;

//                 // 중요: 클로저 보존을 위한 함수 직접 저장
//                 window.compiledIntelligentSystems[generatedStrategyName] = generatedStrategy;

//                 // 중요: 직접 함수를 참조하는 래퍼 함수 생성
//                 // toString()을 사용하지 않고 클로저 유지
//                 const wrapperFunction = function (board, player, validMoves, makeMove) {
//                     // 저장된 함수를 직접 호출 - 클로저 보존
//                     try {
//                         if (typeof window.compiledIntelligentSystems[generatedStrategyName] !== 'function') {
//                             console.error(`Strategy function not found: ${generatedStrategyName}`);
//                             return validMoves.length > 0 ? validMoves[0] : null;
//                         }

//                         // 실제 함수 호출
//                         return window.compiledIntelligentSystems[generatedStrategyName](board, player, validMoves, makeMove);
//                     } catch (e) {
//                         console.error(`Error in strategy execution: ${e.message}`);
//                         return validMoves.length > 0 ? validMoves[0] : null;
//                     }
//                 };

//                 // 중요: 보관용 코드 문자열 생성 - 함수 참조를 유지하는 방식
//                 const strategyCode = `
// function studentStrategy(board, player, validMoves, makeMove) {
//     // Generated by ${systemName} for ${stageConfig.name}
//     // Analysis time: ${elapsedSeconds}s
    
//     // compiledIntelligentSystems에서 저장된 함수 직접 호출
//     return (${wrapperFunction.toString()})(board, player, validMoves, makeMove);
// }`;

//                 // Store in OthelloStrategies (if available)
//                 if (typeof OthelloStrategies !== 'undefined' && OthelloStrategies.saveStrategy) {
//                     // Use OthelloStrategies to save the strategy
//                     OthelloStrategies.saveStrategy(generatedStrategyName, strategyCode);
//                     console.log(`Strategy saved to OthelloStrategies: ${generatedStrategyName}`);
//                 } else {
//                     // Fall back to local storage manually
//                     if (typeof savedStrategies !== 'undefined') {
//                         savedStrategies[generatedStrategyName] = strategyCode;

//                         try {
//                             localStorage.setItem('othelloStrategies', JSON.stringify(savedStrategies));
//                             console.log(`Strategy saved to localStorage: ${generatedStrategyName}`);
//                         } catch (e) {
//                             console.error("Failed to save to localStorage:", e);
//                         }
//                     }
//                 }

//                 // Update UI elements
//                 console.log("[Main] Strategy saved, updating UI...");

//                 // Update strategy list and AI selectors (if functions available)
//                 if (typeof updateStrategyList === 'function') {
//                     updateStrategyList();
//                     console.log("updateStrategyList called");
//                 }

//                 if (typeof updateAISelectors === 'function') {
//                     updateAISelectors();
//                     console.log("updateAISelectors called");
//                 }

//                 // UI 상태 업데이트
//                 const statusElement = document.getElementById('intelligent-system-status');
//                 if (statusElement) {
//                     statusElement.textContent = `Error saving strategy: ${saveError.message}`;
//                     statusElement.className = 'intelligent-system-status upload-error';
//                 }

//                 // 상태 초기화
//                 isAnalyzing = false;
//                 currentAnalysisStage = null;

//                 // 업로드 버튼 활성화
//                 const uploadButton = document.getElementById('upload-intelligent-system');
//                 if (uploadButton) {
//                     uploadButton.disabled = false;
//                 }

//                 return false;
//             }
//         } else {
//             // 타임아웃 또는 전략 생성 실패 처리
//             console.warn("[Main] Analysis failed to generate a valid strategy");

//             const statusElement = document.getElementById('intelligent-system-status');
//             if (statusElement) {
//                 let message = "Analysis failed to generate a valid strategy.";
//                 if (analysisError) {
//                     message = `Analysis error: ${analysisError.message}`;
//                 }
//                 if (analysisTimedOut) {
//                     message = "Analysis timed out.";
//                 }

//                 statusElement.textContent = message;
//                 statusElement.className = 'intelligent-system-status upload-error';
//             }

//             const progressBar = document.getElementById('intelligent-system-progress-bar');
//             if (progressBar) {
//                 progressBar.style.width = '0%';
//             }

//             // 상태 초기화
//             isAnalyzing = false;
//             currentAnalysisStage = null;

//             // 업로드 버튼 활성화
//             const uploadButton = document.getElementById('upload-intelligent-system');
//             if (uploadButton) {
//                 uploadButton.disabled = false;
//             }

//             return false;
//         }
//     }

//     /**
//      * Set up the UI for analysis display
//      * @param {string} systemName - Intelligent system's name
//      * @param {Object} stageConfig - Stage configuration
//      */
//     function setupAnalysisUI(systemName, stageConfig) {
//         // Logic for updating UI with status
//         console.log(`Setting up analysis UI for ${systemName} on ${stageConfig.name}`);

//         const statusElement = document.getElementById('intelligent-system-status');
//         const progressBarElement = document.getElementById('intelligent-system-progress-bar');
//         const progressContainer = document.getElementById('intelligent-system-progress');

//         if (statusElement) {
//             statusElement.textContent = `Analyzing ${stageConfig.name} with ${systemName}...`;
//             statusElement.style.display = 'block';
//             statusElement.className = 'intelligent-system-status';
//         }

//         if (progressContainer) {
//             progressContainer.style.display = 'block';
//         }

//         if (progressBarElement) {
//             progressBarElement.style.width = '0%';
//         }

//         // 업로드 버튼 비활성화
//         const uploadButton = document.getElementById('upload-intelligent-system');
//         if (uploadButton) {
//             uploadButton.disabled = true;
//         }
//     }

//     // 페이지 로드 시 초기화 로직
//     window.addEventListener('DOMContentLoaded', function () {
//         console.log("Initializing IntelligentSystemInterface");

//         // 이전에 저장된 전략 불러오기
//         if (typeof OthelloStrategies !== 'undefined' && OthelloStrategies.getStrategyNames) {
//             // 모든 인텔리전트 전략 이름 가져오기
//             const allStrategies = OthelloStrategies.getStrategyNames();

//             // intelligent_ 접두사가 있는 전략 찾기
//             const intelligentStrategyNames = allStrategies.filter(name =>
//                 name.startsWith('intelligent_'));

//             console.log(`Found ${intelligentStrategyNames.length} intelligent strategies`);

//             // 각 전략에 대해 컴파일된 함수 초기화
//             intelligentStrategyNames.forEach(name => {
//                 console.log(`Initializing intelligent strategy: ${name}`);

//                 // 전략 코드 가져오기
//                 const code = OthelloStrategies.getStrategyCode(name);
//                 if (code) {
//                     // 컴파일드 시스템 맵에 추가 (빈 함수로)
//                     if (!window.compiledIntelligentSystems[name]) {
//                         window.compiledIntelligentSystems[name] = function (board, player, validMoves) {
//                             console.log(`Using placeholder function for ${name}`);
//                             return validMoves.length > 0 ? validMoves[0] : null;
//                         };
//                     }
//                 }
//             });
//         }
//     });

//     // Public API
//     return {
//         // Public API for interaction
//         analyzeStageWithSystem,
//         processAnalysisResult,
//         setupAnalysisUI,
//         setupProgressMonitoring,

//         // 디버깅 및 테스트용 인터페이스
//         getInterface: () => InterfaceInstance
//     };

// })();

// // Export module or global depending on usage context
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = IntelligentSystemInterface;
// }

// window.IntelligentSystemInterface = IntelligentSystemInterface;