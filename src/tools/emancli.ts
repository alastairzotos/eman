import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import * as readline from 'readline';
import * as child_process from 'child_process';

import { IConfig, CoreTool, CLI_CMD } from './coretool';
import { WatcherTool } from './watcher';


type IToolType<T extends CoreTool> = new(program: EmanCLI, config: IConfig, argv: string[]) => T;

interface IToolOptions {
    requiresConfig: boolean;
}

interface ICommandInfo {
    tool: IToolType<CoreTool>;
    options: IToolOptions;
}

export class EmanCLI {
    
    private _argv: string[];
    private _validCommands: { [cmd: string]: ICommandInfo } = {};

    public isWatchingForTypes: boolean = false;

    constructor() {
        this._argv = process.argv.slice(2);
    }
    
    displayError = (msg: string) => {
        console.log(chalk.red("Error: ") + msg);
    };

    registerTool = <T extends CoreTool>(id: string, tool: IToolType<T>, options?: IToolOptions) => {
        options = { requiresConfig: true, ...options };

        this._validCommands[id as string] = { tool, options };
    };

    getCommands = (): { [cmd: string]: ICommandInfo } => {
        return this._validCommands;
    };

    start = (cb?: (err: any, result: any)=>void) => {
        const onComplete = (err: any, result: any) => {
            if (cb) cb(err, result);
        };

        if (this._argv.length == 0) {
            this.displayError("Usage is " + chalk.green(CLI_CMD + chalk.yellow(' <command>')) + ". For more help, try " + chalk.green(CLI_CMD + chalk.yellow(' help')));
        } else {
            const command = this._argv[0];

            if (this._validCommands[command]) {
                const tool = this._validCommands[command].tool;
                const options = this._validCommands[command].options;

                if (options.requiresConfig) {
                    this.resolveConfigFile((config: IConfig) => {
                        new tool(this, config, this._argv).run((err, result) => {
                            /*if (err) {
                                cb(err, null);
                            } else {
                                this.checkForFileWatch(config, (err, result) => {
                                    onComplete(err, result);
                                })
                            }*/

                            onComplete(err, result);
                        });
                    });
                } else {
                    new tool(this, null, this._argv).run(onComplete);
                }
            } else {
                this.displayError(`Unexpected command ${chalk.magenta(command)}. For more help, try ${chalk.green(CLI_CMD + chalk.yellow(' help'))}`);
            }
        }
    };

    private checkForFileWatch = (config: IConfig, cb: (err: any, result: any)=>void) => {
        if (!this.isWatchingForTypes) {
            const rl = readline.createInterface(process.stdin, process.stdout);
            rl.question(chalk.yellow("Would you like to watch files for changes to keep track of types? ") + chalk.white("(y/n) "), answer => {
                if (answer.trim().toLowerCase() == "y") {
                    console.log("");

                    const watcher = new WatcherTool(this, config, this._argv);
                    watcher.run(cb);
                }
                rl.close();
            });
        } else {
            cb(null, null);
        }
    }

    private resolveConfigFile = (success: (config: IConfig)=>void) => {
        let configFile = 'config.json';

        if (this._argv.length > 1) {
            if (this._argv[1][0] !== '-') {
                configFile = this._argv[1];
            }

            // We're assuming we're in the directory with the config file. Insert a dummy '.' as the argv for it
            else {
                this._argv.splice(1, 0, '.');
            }
        }

        if (!configFile.endsWith('config.json')) {
            if (configFile.endsWith('/')) {
                configFile += 'config.json';
            } else {
                configFile += '/config.json';
            }
        }

        configFile = path.resolve(process.cwd(), configFile);

        fs.exists(configFile, exists => {
            if (exists) {

                // Create build folder
                const buildFolder = configFile.split('/').slice(0, -1).join('/') + '/build';
                if (!fs.existsSync(buildFolder)) {
                    fs.mkdirSync(buildFolder);
                }

                fs.readFile(configFile, 'utf8', (err, data: string) => {
                    if (err) {
                        this.displayError(err.message);
                    } else {
                        const validated = this.validateConfig(configFile, this.fixConfig(configFile, JSON.parse(data)));
                        if (validated) {
                            success(validated);
                        //} else {
                            //this.displayError('Invalid config file');
                        }
                    }
                })
            } else {
                if (this._argv.length > 1) {
                    this.displayError(`Cannot find config file ${chalk.magenta(configFile)}`);
                } else {
                    this.displayError(`Cannot find config file. Use ${chalk.green(`${CLI_CMD} ${chalk.bold(this._argv[0])} `) + chalk.yellow('<path-to-config.json>')}`);
                }
            }
        });
    };

    private fixConfig = (configFile: string, config: any): any => {
        return {
            ...config,

            file: path.resolve(process.cwd(), configFile.split('/').slice(0, -1).join('/') + '/' + config.file)
        };
    };

    private validateConfig = (configFile: string, config: any): IConfig => {

        if (config.file === undefined) {
            this.displayError("Invalid config file. Expected 'file' property");
            return null;
        }

        if (config.campaignId === undefined) {
            this.displayError("Invalid config file. Expected 'campaignId' property");
            return null;
        }

        if (config.token === undefined) {
            this.displayError("Invalid config file. Expected 'token' property");
            return null;
        }

        return config as IConfig;
    };
}