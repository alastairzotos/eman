import chalk from 'chalk';
import * as log from 'single-line-log';
import * as child_process from 'child_process';

import { EmanCLI } from './emancli';
import { IConfig, CoreTool, IFlagDocs, CLI_CMD } from './coretool';
import { logOutput, stopLog } from '../em-api/uploadlogger';

export class Updater extends CoreTool<any> {
    constructor(program: EmanCLI, config: IConfig, argv: string[]) {
        super(program, config, argv);
    }

    getDescription = () => `Updates your version of ${CLI_CMD}`;

    run = (cb: (err, res)=>void) => {
        logOutput("Updating...");
        child_process.exec("npm install -g eman-script", (error, stdout, stderr) => {
            stopLog();
            log.stdout(chalk.green("\u2714 Update complete\n"));
            cb(null, null);
        });

    };
}