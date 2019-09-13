import * as argvParser from 'argv-parser';
import * as readline from 'readline';
import chalk from 'chalk';
import * as log from 'single-line-log';

import { CoreTool, IConfig, IFlagDocs, ICommandExample } from './coretool';
import { EmanCLI } from './emancli';
import { TestResult, UnitTester, IUnitTesterOutput } from './unittester';
import { Runtime, IRuntimeOutput } from '../lang/runtime';
import { uploadOutput } from '../em-api/api';


export class Publisher extends CoreTool<any> {

    private _noTest: boolean = false;

    constructor(program: EmanCLI, config: IConfig, argv: string[]) {
        super(program, config, argv);

        const { notest } = argvParser.parse(argv, { rules: {
            notest: {
                short: "nt",
                type: Boolean,
                default: false
            }
        } }).parsed;

        this._noTest = notest || false;
    }

    getDescription = (): string => "Publishes the compiled output of your code to your Email Manager account after tests have passed (if they are defined)";

    getFlagDocs = (): IFlagDocs[] => [

        // notest
        {
            name: "notest",
            short: "nt",
            type: "boolean",
            desc: "Forces publishing without running any tests"
        }
    ];

    getExamples = (): ICommandExample[] => [
        {
            flags: '',
            source: 'src/myproj',
            explanation: 'Publishes output results to Email Manager if all tests passed (or if no tests are defined)'
        },

        {
            flags: '-nt',
            source: '',
            explanation: 'Ignores tests and publishes anyway'
        }
    ];

    run = (cb: (err: any, result: any)=>void) => {


        const afterTests = (testerOutput: IUnitTesterOutput) => {

            // If there are errors
            if (testerOutput.result === TestResult.Failed) {
                this.program.displayError("Cannot publish. All tests must pass");
            } else {

                if (testerOutput.result === TestResult.Todo) {

                    const rl = readline.createInterface(process.stdin, process.stdout);
                    rl.question(chalk.yellow('\u26a0') + chalk.cyan(" There are some unfinished todos.") + " Are you sure you want to publish? " + chalk.white("(y/n) "), answer => {
                        if (answer.trim().toLowerCase() == "y") {
                            console.log("");
                            this.performPublish(testerOutput.output, cb);
                        }
                        rl.close();
                    });

                } else {
                    this.performPublish(testerOutput.output, cb);
                }

            }
        };

        // Run tests unless specified otherwise
        if (!this._noTest) {
            const unittester = new UnitTester(this.program, this.config, this.argv);
            unittester.run((err, testResult) => {
                if (err) {
                    cb(err, null);
                } else {
                    afterTests(testResult);   
                }
            });
        } else {
            this.runCode({
                onRunFinished: (runtime, output) => {
                    afterTests({ output, result: TestResult.Passed });
                }
            })
        }
    };

    private performPublish = (output: IRuntimeOutput, cb: (err: any, result: any)=>void) => {

        console.log(chalk.bgBlue(chalk.yellow(" Publishing...")));
        console.log("");

        uploadOutput(this.config.campaignId, this.config.token, output, (errors, responses) => {
            if (errors) {
                log.stdout(chalk.red("\u2716 There were errors:"), errors, '\n');
                cb(errors, null);
            } else {
                log.stdout(chalk.green(chalk.bold("\u2714 Done\n")));
                cb(null, null);
            }
        });
    };
}