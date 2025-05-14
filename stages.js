/**
 * stages.js
 * 
 * Defines all stage configurations for the Othello Arena
 * Each stage includes board size, initial piece positions, and blocked cells
 * 
 * Note: The special rules (ignoreOcclusion, fewerPiecesContinue) are implementation
 * details and not exposed in the student-facing API documentation
 */


const stages = [
    {
        name: "Standard 8x8",
        boardSize: 8,
        initialBlocked: [],
        initialPlayer1: [{ r: 3, c: 4 }, { r: 4, c: 3 }],
        initialPlayer2: [{ r: 3, c: 3 }, { r: 4, c: 4 }]
    },
    {
        name: "Small Board (6x6)",
        boardSize: 6,
        initialBlocked: [],
        initialPlayer1: [{ r: 2, c: 3 }, { r: 3, c: 2 }],
        initialPlayer2: [{ r: 2, c: 2 }, { r: 3, c: 3 }]
    },
    {
        name: "8x8 (Partial C-Squares-cw)",
        boardSize: 8,
        initialBlocked: [{ r: 0, c: 1 }, { r: 1, c: 7 }, { r: 7, c: 6 }, { r: 6, c: 0 }],
        initialPlayer1: [{ r: 3, c: 4 }, { r: 4, c: 3 }],
        initialPlayer2: [{ r: 3, c: 3 }, { r: 4, c: 4 }]
    }
];

// Export as a global object or use module exports if using bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = stages;
}