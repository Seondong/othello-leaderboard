## Othello Arena for HW2 - GIST AI6105 (Artificial General Intelligence), Spring 2025

* [HW2](https://sundong.kim/courses/agi25sp/hw2/)
* [Arena](https://sundong.kim/courses/agi25sp/othello-leaderboard/hw2.html)
* [Basic: Useful API docs](https://sundong.kim/courses/agi25sp/othello-leaderboard/Intelligent-system-API-reference/)
* [Advanced: Using game logs](https://sundong.kim/courses/agi25sp/othello-leaderboard/Using-game-logs-for-world-model-learning/)
* [Templates: Intelligenct systems and strategies](https://drive.google.com/drive/folders/152y6Wg0fGpVU0YuK5upapBPeAEhdYm1D?usp=sharing)
* [Ed discussion](https://edstem.org/us/courses/70367)

### Updates (May 12)

* Restructured the entire codebase by splitting the previously monolithic HTML file into separate component files: 
  - hw2.html: Main HTML structure and UI elements
  - app.js: Application initialization and event handling
  - game-core.js: Core game mechanics and board logic
  - game-ui.js: User interface and display components
  - game-controller.js: Game flow control and AI move execution
  - strategies.js: Built-in AI strategies and compilation
  - intelligent-system-loader.js: System for intelligent system analysis
  - tournament.js: Competition framework for strategy evaluation
  - constant.js: Game constants and configuration
* Fixed closure support - Variables and functions in analyzeStage are now properly accessible in the returned strategy function
* Improved API interface - The analyzeStage function now receives the complete stageConfig object along with API functions
* Added logging capabilities - Game logs can now be saved and analyzed to help you discover patterns
* Enhanced console tools - Added some scenarios on how to test tools for debugging and understanding game mechanics

