/**
 * constants.js
 * 
 * Game constants for the Othello Arena
 * Contains all fixed values used throughout the application
 */

const GAME_CONSTANTS = {
    // Board cell states
    EMPTY: 0,
    BLACK: 1,
    WHITE: 2,
    BLOCKED: 3,

    // Game mechanics
    MAX_AI_TIME_PER_GAME: 10000, // Maximum time allowed for AI (10 seconds)

    // UI related
    DEFAULT_CELL_SIZE: 50, // Cell size in pixels
    BOARD_GAP: 1,          // Gap between cells in pixels
    BOARD_PADDING: 4       // Board padding in pixels
};

// Export as a global object or use module exports if using bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_CONSTANTS;
}