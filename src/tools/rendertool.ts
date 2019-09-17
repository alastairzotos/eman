import * as fs from 'fs';
import * as path from 'path';

import chalk from 'chalk';
import { EmanCLI } from './emancli';
import { IConfig, CoreTool, IFlagDocs, CLI_CMD, ICommandExample } from './coretool';

import * as argvParser from 'argv-parser';
import { renderOutput } from '../lang/renderer';
import { displayError } from '../lang/errors';
import { Runtime, IRuntimeOutput } from '../lang/runtime';

import highlight from 'cli-highlight';

import nodeWatch from 'node-watch';
import * as rimraf from 'rimraf';
import { generateNowSetting, displayOutput } from '../lang/utils';
const liveServer = require('live-server');

import * as pretty from 'pretty';

export class RenderTool extends CoreTool<any> {
    private _displayOutput: string;
    private _settingsObject: string;
    private _componentName: string;
    private _openInBrowser: boolean;
    
    private _tempPath = "temp";
    private _tempFileName = "render.html";

    constructor(program: EmanCLI, config: IConfig, argv: string[]) {
        super(program, config, argv);

        const { display, settings, component, open } = argvParser.parse(argv, { rules: {
            display: {
                short: "d",
                type: Boolean,
                value: false,
            },

            settings: {
                short: "s",
                type: String,
                value: null
            },

            component: {
                short: "c",
                type: String,
                value: null
            },

            open: {
                short: "o",
                type: Boolean,
                value: null
            }
        } }).parsed;

        this._displayOutput = display;
        this._settingsObject = settings;
        this._componentName = component;
        this._openInBrowser = open;
    }

    getDescription = () => `Renders the generated output using either default variable settings or by providing an object with key-value pairs. Optionally displays to the console or with live browser reloading`;

    getFlagDocs = (): IFlagDocs[] => [

        {
            name: "display",
            short: "s",
            type: "boolean",
            desc: "Displays the generated HTML output to the console"
        },

        {
            name: "settings",
            short: "s",
            type: "string",
            desc: `The name of an exported object from your main file or a set of comma-separated key-value pairs to assign campaign variables to. Unset variables will use their default values`
        },

        {
            name: "component",
            short: "c",
            type: "string",
            desc: "The name of an exported component function from your main file. The component should not accept any parameters"
        },

        {
            name: "open",
            short: "o",
            type: "boolean",
            desc: "Opens the render in the browser and live-reloads with every change"
        }
    ];

    getExamples = (): ICommandExample[] => [
        {
            source: "",
            flags: "-d",
            explanation: "Checks the current working directory and uses the default campaign variable values. Displays output to console"
        },

        {
            source: "",
            "flags": "-d -s=renderSettings",
            explanation: "Uses an object exported as 'renderSettings' from your main file to set the campaign variables. Any unset variables will use their default values"
        },

        {
            source: "",
            flags: '-d -s="A=4, B=5"',
            explanation: 'Sets the campaign variables using a set of comma-separated key-value pairs. Notice the ""s are mandatory'
        },

        {
            source: "",
            flags: "-d -c=MyComponent",
            explanation: "Uses default campaign variable values and only renders the MyComponent component. It is not possible to provide arguments to the component. If this is necessary it is recommended to wrap it in a new one with no parameters."
        },

        {
            source: "",
            flags: "-o",
            explanation: "Watches the files for any changes and live-reloads the rendered output in your browser"
        }
    ];

    run = (cb: (err, res)=>void) => {
        
        const onBuild = (err, res) => {

            // If we open in browser we need to save the output to a temp file
            if (this._openInBrowser) {

                // Set an exit handler to remove the temp file once we're finished
                this.setExitHandler((code, cb) => {

                    // Clear temp folder
                    rimraf.sync(this._tempPath);
                    cb();

                });

                // Start live server
                liveServer.start({
                    root: path.resolve(process.cwd(), this._tempPath),
                    file: this._tempFileName
                });

                // Watch for file changes
                nodeWatch(this.getProjPath(), { recursive: true }, (eventType: "update" | "remove", fileName: string) => {

                    if (fileName.endsWith(".aml")) {
                        // Clear console
                        process.stdout.write('\x1Bc');
        
                        Runtime.clearStaticData();
                        this.buildAndRender((err, res) => {});
                    }
                });

            }
        };

        this.buildAndRender(onBuild);
    };


    private buildAndRender = (cb: (err, res)=>void) => {
        this.runCode({
            onRunFinished: (runtime, output) => {

                let codeOutput: string;

                if (this._componentName === null) {
                    codeOutput = output.output;
                } else {
                    const component = output.exports[this._componentName];

                    if (component !== undefined) {
                        codeOutput = component.evaluate(runtime, {}) + '';
                    }
                }

                if (codeOutput !== undefined) {

                    const varSettings = this.getCampaignVarSettings(runtime, output);

                    if (varSettings) {

                        if (this.validateSettings(varSettings, output)) {

                            varSettings["now"] = generateNowSetting();

                            // Render output
                            const rendered = renderOutput(codeOutput, output, runtime, varSettings);

                            // Display to console
                            if (this._displayOutput) {
                                console.log(highlight(pretty(rendered), { language: "html" }));
                            }

                            // If we open in browser we need to save the output to a temp file
                            if (this._openInBrowser) {

                                // Ensure we have a temp folder
                                if (!fs.existsSync(this._tempPath)) {
                                    fs.mkdirSync(this._tempPath);
                                }

                                // Save file to temp folder
                                // We must first process it to ensure it has <html> and <body> tags
                                fs.writeFileSync(`${this._tempPath}/${this._tempFileName}`, this.processOutputForLiveReload(rendered), { encoding: 'utf8' });

                            }
                            
                            cb(null, null);
                        } else {
                            cb(true, null);
                        }
                    } else {
                        cb(true, null);
                    }
                } else {
                    this.program.displayError(`Cannot find component '${this._componentName}'`);
                    cb(true, null);
                }

            }
        });
    };

    private processOutputForLiveReload = (rendered: string): string => {

        // Naive approach but will handle most use cases
        if (rendered.substr(0, 5).toLowerCase() !== '<html' &&
            rendered.substr(0, 9).toLowerCase() !== '<!doctype') {
            return `<html><body>${rendered}</body></html>`;
        } else {
            return rendered;
        }
    };

    private getCampaignVarSettings = (runtime: Runtime, output: IRuntimeOutput): { [key: string]: any } => {


        // Get default values of campaign variables
        const defaultSettings = {};
        Object.keys(output.yieldedVars).forEach(key => {
            defaultSettings[key] = output.yieldedVars[key].default;
        });
            
        if (this._settingsObject) {

            // Check if we have anything to parse
            if (this._settingsObject.indexOf(':') >= 0) {
                const settings = {};

                let error = false;
                this._settingsObject
                    .split(',')
                    .map(i => i.trim())
                    .forEach(keyValue => {
                        let key, value: string;
                        
                        if (keyValue.indexOf(':') >= 0) {
                            [key, value] = keyValue.split(':').map(i => i.trim());
                        } else if (keyValue.indexOf('=') >= 0) {
                            [key, value] = keyValue.split('=').map(i => i.trim());
                        } else {
                            error = true;
                            this.program.displayError(`Invalid key-value pair '${keyValue}'. Format must be 'A: 5' or 'A=5'`);
                        }

                        if (!error) {
                            settings[key] = this.parseValue(value);
                        }
                    });

                if (error) {
                    return null;
                }

                return {...defaultSettings, ...settings};
            }
            
            // Nothing to parse. Must be an exported object
            else {
                const obj = output.exports[this._settingsObject];

                if (!obj) {
                    this.program.displayError(`Cannot find object '${this._settingsObject}'`);
                    return null;
                }

                return {...defaultSettings, ...obj};
            }

        } else {

            // Nothing set. Use default settings
            return defaultSettings;
        }

        return null;
    };

    private validateSettings = (settings: { [key: string]: any }, output: IRuntimeOutput): boolean => {
        let ok = true;

        Object.keys(settings).forEach(key => {
            if (output.yieldedVars[key] === undefined) {
                ok = false;

                this.program.displayError(`Cannot find yielded variable '${key}'`);
            }
        });

        return ok;
    };

    private parseValue = (value: string): any => {
        if (value == "true")        return true;
        if (value == "false")       return false;
        if (value == "null")        return null;
        if (value == "undefined")   return undefined;

        let parsed = parseInt(value);
        if (!isNaN(parsed))     return parsed;

        parsed = parseFloat(value);
        if (!isNaN(parsed))     return parsed;

        if (value.startsWith("'") && value.endsWith("'"))
            return value.substr(1, value.length - 2);

        return value;
    };
}