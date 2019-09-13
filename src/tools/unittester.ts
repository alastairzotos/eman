import chalk from 'chalk';

import { CoreTool, IConfig, IFlagDocs, ICommandExample } from './coretool';
import { ExprNode, ExprType, CallExpr, LoadExpr, DescribeNode, StmtNode, StmtType, RunNode, RunNodeType, RunTestNode, RunTodoNode } from '../lang/parsenodes';
import { Runtime, IRuntimeOutput } from '../lang/runtime';
import { displayError, CompilerError, extractFilename } from '../lang/errors';
import { renderOutput } from '../lang/renderer';
import { Parser } from '../lang/parser';
import { stringHash, generateNowSetting } from '../lang/utils';
import { EmanCLI } from './emancli';

import * as argvParser from 'argv-parser';


export enum TestResult {
    Passed = "passed",
    Failed = "failed",
    Todo = "todo"
}

export type IUnitTesterOutput = { output: IRuntimeOutput, result: TestResult };

export class UnitTester extends CoreTool<IUnitTesterOutput> {

    private _quietMode: boolean = false;

    constructor(program: EmanCLI, config: IConfig, argv: string[]) {
        super(program, config, argv);

        const { quiet } = argvParser.parse(argv, { rules: {
            quiet: {
                short: "q",
                type: Boolean,
                value: false
            }
        } }).parsed;

        this._quietMode = quiet;
    }

    getDescription = (): string => "Runs a series of unit tests on the code and displays the results";

    getFlagDocs = (): IFlagDocs[] => [

        // Quiet mode
        {
            name: "quiet",
            short: "q",
            type: "boolean",
            desc: "Only displays errors and todos"
        }
    ];

    getExamples = (): ICommandExample[] => [
        {
            flags: '',
            source: 'src/myproj',
            explanation: "Runs a set of automated tests defined in 'test()'"
        },

        {
            flags: '-q',
            source: '',
            explanation: "Runs tests defined in 'test()' but only shows errors and todos"
        }
    ];

    run = (cb: (err: any, result: IUnitTesterOutput)=>void) => {

        return this.runCode({
            onRuntimeCreated: runtime => {
                runtime.getScope()['runtime'].runningTests = true;
                runtime.warningsSuppressed = true;
            },

            onRunFinished: (runtime, output) => {

                if (!output) {
                    cb("Cannot run tests due to compiler error", null);
                    return;
                }

                const testCases = output.testCases;

                try {
                    this.logStart();
                    this.verifyTestCases(testCases);

                    let result = TestResult.Passed;
                    testCases.forEach(desc => {
                        const descResult = this.startDescriptor(runtime, output, desc as DescribeNode);
                        result = this.getNextResult(result, descResult);
                    });

                    console.log("");
                    if (result === TestResult.Passed) {
                        console.log(chalk.green(`\u2714 ${chalk.bold('All tests passed')}`));
                    } else if (result === TestResult.Todo) {
                        console.log(chalk.yellow(`\u26a0 ${chalk.bold('All tests passed but there are some unfinished todos')}`));
                    } else {
                        console.log(chalk.red(`\u2716 ${chalk.bold('One or more tests failed')}`));
                    }
                    console.log("");

                    cb(null, { output, result });
                    return;

                } catch (e) {
                    displayError(e);
                }

                cb(null, { output, result: TestResult.Failed });
            }
        });


    };

    static generateTestInfo = (runtime: Runtime, runNode: RunTestNode, describeNode?: DescribeNode): string => {
        const separator = '<hr/>';
        return `<pre>${separator}${describeNode ? `<strong style='color: #136b0d'>${describeNode.description}</strong><br/>` : ''}<span style='color: #3477eb;'><strong>Test:</strong> ${runNode.description}</span><br />${ Object.keys(runNode.settings).map( varName => `<strong>${varName}</strong> = ${runNode.settings[varName].evaluate(runtime, {})}` ).join('<br/>') }<br/>${separator}</pre>`;
    };

    static evaluateSettings = (runtime: Runtime, output: IRuntimeOutput, run: RunTestNode): { [varName: string]: any } => {

        // Collect settings
        const settings = {};
        Object.keys(output.yieldedVars).forEach(varName => {
            if (varName[0] !== '_') {
                settings[varName] = output.yieldedVars[varName].default + '';
            }
        });
        Object.keys(run.settings).forEach(varName => {
            if (runtime.yieldedVars[varName] === undefined) {
                throw new CompilerError(`Cannot find yielded variable '${varName}'`, run.startPosition, run.endPosition);
            }
            settings[varName] = run.settings[varName].evaluate(runtime, {});
        });

        // Add a 'now' setting
        settings["now"] = generateNowSetting();

        return settings;
    };

    private verifyTestCases = (testCases: StmtNode[]) => {
        testCases.forEach(desc => {
            if (desc.stmtType !== StmtType.Describe) {
                throw new CompilerError(`All statements inside 'tests' function should be test descriptors`, desc.startPosition, desc.endPosition);
            }
        });
    };

    private getResultMagnitude = (result: TestResult) => {
        switch (result) {
            case TestResult.Passed:     return 3;
            case TestResult.Todo:       return 2;
            case TestResult.Failed:     return 1;
        }
    };

    private getNextResult = (current: TestResult, result: TestResult): TestResult => {
        if (this.getResultMagnitude(result) < this.getResultMagnitude(current)) {
            return result;
        } else {
            return current;
        }
    };

    private _quietLogs: { desc: string, runs: { output: string, passed: boolean }[], allPassed: boolean }[] = [];
    private startDescriptor = (runtime: Runtime, output: IRuntimeOutput, descNode: DescribeNode): TestResult => {
        this._quietLogs = [];
        this.logDescriptor(descNode.description);
        console.group();
        console.group();

        let result = TestResult.Passed;

        descNode.testRuns.forEach(run => {
            let runResult = TestResult.Passed;
            
            if (run.runNodeType == RunNodeType.Test) {
                runResult = this.runTest(runtime, output, run as RunTestNode) ? TestResult.Passed : TestResult.Failed;
            } else {
                this.runTodo(runtime, output, run as RunTodoNode);
                runResult = TestResult.Todo;
            }

            result = this.getNextResult(result, runResult);
        });

        if (this._quietMode) {
            this.logQuietModeOutputs();
        }

        console.groupEnd();
        console.groupEnd();

        return result;
    };

    private runTodo = (runtime: Runtime, output: IRuntimeOutput, run: RunTodoNode) => {
        this.logTodo(run);
    };

    private runTest = (runtime: Runtime, output: IRuntimeOutput, run: RunTestNode): boolean => {

        try {

            const evaluatedSettings = UnitTester.evaluateSettings(runtime, output, run);
            const settings = evaluatedSettings;
            const htmlOutput = renderOutput(output.output, output, runtime, settings);
            const parser = new Parser();

            const parsedDoc = parser.parseHTMLDoc(run.startPosition.file, '<>' + htmlOutput + '</>');

            // Add indexed elements as global const variables
            runtime.pushScope();
            Object.keys(parsedDoc.index).forEach(id => {
                const elem = parsedDoc.index[id].evaluate(runtime, settings);
                runtime.getScope()[id] = elem;
                runtime.setConst(id);
            });

            // Evaluate assertion and check if it can be coerced to 'true'
            const evaluatedAssertion = run.assertion.evaluate(runtime, settings);
            
            runtime.popScope();

            if (evaluatedAssertion) {
                this.logTestResult(run, true);
                return true;
            } else {
                this.logTestResult(run, false);
                return false;
            }
        } catch (e) {
            this.logTestResult(run, false);
            displayError(e);
            return false;
        }
    };


    private logStart = () => {
        console.log("");
        console.log(chalk.bgBlue(chalk.yellow(" Running tests:")));
    }

    private logDescriptor = (name: string) => {
        const output = chalk.magenta("Test set: ") + chalk.yellow(name);

        if (this._quietMode) {
            this._quietLogs.push({ desc: output, runs: [], allPassed: true });
        } else {
            console.log("");
            console.log(output);
        }
    };

    private logTodo = (runNode: RunTodoNode) => {
        const output = chalk.yellow(`\u26a0 ${chalk.bold('Todo')}:   `) + chalk.cyan(runNode.description) + ' ' + chalk.gray(`(in ${chalk.yellow( extractFilename(runNode.startPosition.file) )}, line ${chalk.yellow( runNode.startPosition.line + '' )})`);

        if (this._quietMode) {
            const lastLog = this._quietLogs[this._quietLogs.length - 1];
            lastLog.allPassed = false;
            lastLog.runs.push({
                output: output,
                passed: false
            });
        } else {
            console.log(output);
        }
    };

    private logTestResult = (runNode: RunNode, passed: boolean) => {
        let output = "";
        if (passed) {
            output = chalk.green(`\u2714 ${chalk.bold('Passed')}: `) + chalk.cyan(runNode.description);
        } else {
            if (runNode.startPosition) {
                output = chalk.red(`\u2716 ${chalk.bold('Failed')}: `) + chalk.cyan(runNode.description) + ' ' + chalk.gray(`(in ${chalk.yellow( extractFilename(runNode.startPosition.file) )}, line ${chalk.yellow( runNode.startPosition.line + '' )}, column ${chalk.yellow( runNode.startPosition.column + '' )})`);
            } else {
                output = chalk.red(`\u2716 ${chalk.bold('Failed')}: `) + chalk.cyan(runNode.description);
            }
        }

        if (this._quietMode) {
            const lastLog = this._quietLogs[this._quietLogs.length - 1];
            if (!passed) {
                lastLog.allPassed = false;
            }
            lastLog.runs.push({
                output: output,
                passed: passed
            });
        } else {
            console.log(output);
        }
    };

    private logQuietModeOutputs = () => {
        this._quietLogs.forEach(log => {
            if (!log.allPassed) {
                console.log("");
                console.log(log.desc);

                log.runs.forEach(run => {
                    if (!run.passed) {
                        console.log(run.output);
                    }
                });
            }
        });
    };

}