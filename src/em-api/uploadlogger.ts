import * as log from 'single-line-log';
import chalk from 'chalk';
import * as spinners from 'cli-spinners';

const spinner = spinners.circleHalves;
/*
dots
dots12
circleHalves
*/

let LOG_FRAME_INDEX = 0;
const LOG_FRAMES = spinner.frames; // ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

let LOG_INTERVAL;

export const logOutput = (text: string) => {
    stopLog();

    LOG_INTERVAL = setInterval(() => {
        const curFrame = LOG_FRAMES[LOG_FRAME_INDEX];
        LOG_FRAME_INDEX++;
        if (LOG_FRAME_INDEX >= LOG_FRAMES.length) {
            LOG_FRAME_INDEX = 0;
        }
        log.stdout(chalk.white(curFrame) + " " + text);
    }, spinner.interval);
};

export const stopLog = () => {
    if (LOG_INTERVAL) clearInterval(LOG_INTERVAL);
};