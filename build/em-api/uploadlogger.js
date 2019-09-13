"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var log = require("single-line-log");
var chalk_1 = require("chalk");
var spinners = require("cli-spinners");
var spinner = spinners.circleHalves;
/*
dots
dots12
circleHalves
*/
var LOG_FRAME_INDEX = 0;
var LOG_FRAMES = spinner.frames; // ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
var LOG_INTERVAL;
exports.logOutput = function (text) {
    exports.stopLog();
    LOG_INTERVAL = setInterval(function () {
        var curFrame = LOG_FRAMES[LOG_FRAME_INDEX];
        LOG_FRAME_INDEX++;
        if (LOG_FRAME_INDEX >= LOG_FRAMES.length) {
            LOG_FRAME_INDEX = 0;
        }
        log.stdout(chalk_1.default.white(curFrame) + " " + text);
    }, spinner.interval);
};
exports.stopLog = function () {
    if (LOG_INTERVAL)
        clearInterval(LOG_INTERVAL);
};
//# sourceMappingURL=uploadlogger.js.map