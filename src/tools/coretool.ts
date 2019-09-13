import chalk from 'chalk';

import { EmanCLI } from './emancli';
import { Runtime, IRuntimeOutput } from '../lang/runtime';

const Table = require('cli-table3');


export interface IConfig {
    file: string;
    campaignId: number;
    token: string;
}

export interface IFlagDocs {
    name: string;
    short?: string;
    type: "string"|"boolean";
    desc: string;
}

export interface ICommandExample {
    flags: string;
    source: string;
    explanation: string;
}

export const CLI_CMD = 'eman';

interface IRunCodeOptions<T = any> {
    onRuntimeCreated?: (runtime: Runtime)=>void;
    onRunFinished: (runtime: Runtime, output: IRuntimeOutput)=>T;
}

type IExitHandler = (code: number, cb: ()=>void)=>void;

export class CoreTool<T = any> {

    private _exitHandler: IExitHandler;

    constructor(protected program: EmanCLI, protected config: IConfig, protected argv: string[]) {
        process.on('SIGINT', signal => {
            process.exit();
        });

        process.on('exit', code => {
            if (this._exitHandler) {
                this._exitHandler(code, () => {
                    process.exit();
                });
            } else {
                process.exit();
            }
        });
    }

    run = (cb: (err: any, result: T)=>void): void => {};

    protected runCode = (options: IRunCodeOptions): T => {
        const runtime = new Runtime();
        if (options.onRuntimeCreated) {
            options.onRuntimeCreated(runtime);
        }

        const output = runtime.run(this.config.file);
        return options.onRunFinished(runtime, output);
    };

    protected setExitHandler = (handler: IExitHandler) => {
        this._exitHandler = handler;
    };

    displayToolDocs = (commandName: string) => {
        console.group(chalk.yellow(chalk.bold(commandName)));
        console.log('');
        console.log(chalk.greenBright(this.getDescription()));
        console.groupEnd();

        this.displayFlagDocs();
        this.displayExamples(commandName);

        console.log('');
    };

    private displayFlagDocs = () => {
        const flagDocs = this.getFlagDocs();

        if (flagDocs) {
            var table = new Table({
                head: ["Flag", "Short", "Type", "Description"]
            });

            flagDocs.forEach(flag => {
                table.push([
                    { content: chalk.white('-' + flag.name), vAlign: "center" },
                    { content: chalk.white('-' + flag.short), vAlign: "center" },
                    { content: chalk.green(flag.type), vAlign: "center" },
                    chalk.cyan(this.wrapLine(flag.desc, 60))
                ])
            });

            console.log('');
            console.group(chalk.magenta(chalk.bold("Flags: ")));
            console.log(table.toString());
            console.groupEnd();

        }
    };

    private displayExamples = (commandName: string) => {
        const examples = this.getExamples();

        if (examples) {
            console.log('');
            console.group(chalk.magenta(chalk.bold("Examples:")));

            const table = new Table({
                head: []
            });

            examples.forEach(example => {

                const exampleCommand = chalk.green(chalk.italic(`${CLI_CMD} ${chalk.bold(commandName)}${example.source ? ` ${chalk.gray(example.source)}` : ''} ${chalk.yellow(example.flags)}`));
                table.push(
                    [
                        {content: exampleCommand, vAlign: 'center'},
                        chalk.blue(this.wrapLine(example.explanation, 80))
                    ]
                )
            });

            console.log(table.toString());
            console.groupEnd();
        }
    };

    protected wrapLine = (text: string, maxLength: number): string => {
        if (text.length > maxLength) {
            const parts = text.split(' ');

            let newText = "";
            let curLength = 0;

            for (const part of parts) {
                const section = part + ' ';
                curLength += section.length;
                newText += section;
                if (curLength > maxLength) {
                    newText += '\n';
                    curLength = 0;
                }
            }

            return newText.substr(0, newText.length - 1);
        } else {
            return text;
        }
    };

    public getDescription = (): string => "A description";
    protected getFlagDocs = (): IFlagDocs[] => null;
    protected getExamples = (): ICommandExample[] => null;

    protected getProjName = (): string => {
        return this.config.file.split('/').slice(0, -1).pop();
    };

    protected getProjPath = (): string => {
        return this.config.file.split('/').slice(0, -1).join('/') + '/';
    };

    protected getBuildPath = (): string => {
        return `${this.getProjPath()}build/`;
    };
}