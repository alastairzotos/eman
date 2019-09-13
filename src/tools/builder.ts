import * as fs from 'fs';

import { EmanCLI } from './emancli';
import { CoreTool, IConfig, IFlagDocs, ICommandExample } from './coretool';

import { Runtime } from '../lang/runtime';
import { displayOutput } from '../lang/utils';

import * as argvParser from 'argv-parser';
import chalk from 'chalk';

import nodeWatch from 'node-watch';

export class Builder extends CoreTool<any> {

    private _display: boolean;
    private _displayFull: boolean;
    private _save: boolean;
    private _watch: boolean;

    constructor(program: EmanCLI, config: IConfig, argv: string[]) {
        super(program, config, argv);

        const { display, displayfull, save, watch } = argvParser.parse(argv, {
            rules: {
                display: {
                    short: "d",
                    type: Boolean,
                    value: false
                },

                displayfull: {
                    short: "df",
                    type: Boolean,
                    value: false
                },

                save: {
                    short: "s",
                    type: Boolean,
                    value: false
                },

                watch: {
                    short: "w",
                    type: Boolean,
                    value: false
                }
            }
        }).parsed;

        this._display = display;
        this._displayFull = displayfull;
        this._save = save;
        this._watch = watch;
    }

    getDescription = (): string => "Builds the code and optionally displays and/or saves output";

    getFlagDocs = (): IFlagDocs[] => [

        // Display
        {
            name: "display",
            short: "d",
            type: "boolean",
            desc: "Displays output HTML to the console"
        },

        // Display full
        {
            name: "displayfull",
            short: "df",
            type: "boolean",
            desc: "Displays output HTML, campaign variables, sections and intermediates to the console"
        },

        // Save
        {
            name: "save",
            short: "s",
            type: "boolean",
            desc: "Saves the html to <proj_path>/build/<proj_name>.html"
        },

        // Watch
        {
            name: "watch",
            short: "w",
            type: "boolean",
            desc: "Will watch the project directory for any changes and rebuild the project, using the provided flags each time"
        }
    ];

    getExamples = (): ICommandExample[] => [
        {
            flags: "-df",
            source: "src/myproj",
            explanation: "Displays HTML, campaign variables, sections and intermediates to screen"
        },

        {
            flags: "-d -s",
            source: "",
            explanation: "Finds 'config.json' locally. Displays output and saves to /build/myproj.html"
        },

        {
            flags: "-d -w",
            source: "",
            explanation: "Will watch the project directory for any changes and rebuild each time, displaying the output HTML with every rebuild"
        }
    ];

    run = (cb: (err: any, result: any)=>void) => {
        const outputFile = this.getBuildPath() + this.getProjName() + '.html';

        this.build(outputFile, cb);

        if (this._watch) {
            nodeWatch(this.getProjPath(), { recursive: true }, (eventType: "update" | "remove", fileName: string) => {
                
                // Clear console
                process.stdout.write('\x1Bc');

                // Rebuild
                Runtime.clearStaticData();
                this.build(outputFile, cb);
            });
        }     
    };


    private build = (outputFile: string, cb: (err: any, result: any)=>void) => {
        this.runCode({
            onRunFinished: (runtime, output) => {

                if (this._display || this._displayFull) {

                    if (this._display && this._displayFull) {
                        this.program.displayError(`Expected '${chalk.yellow('-d')}' or '${chalk.yellow('-df')}' but not both`);
                    } else {
                        if (output) {
                            displayOutput(output, this._displayFull);
                        } else {
                            cb("Cannot display due to compiler error", null);
                        }
                    }
                }
        
                if (this._save) {
                    if (output) {
                        fs.writeFileSync(outputFile, output.output, 'utf8');
                    } else {
                        cb("Cannot save due to compiler error", null);
                    }
                }
        
                cb(null, null);

            }
        });
    };
}