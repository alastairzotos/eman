import { CoreTool, IConfig, IFlagDocs, ICommandExample } from './coretool';
import { DescribeNode, RunTestNode } from '../lang/parsenodes';
import { Runtime, IRuntimeOutput } from '../lang/runtime';
import { EmanCLI } from './emancli';
export declare enum TestResult {
    Passed = "passed",
    Failed = "failed",
    Todo = "todo"
}
export declare type IUnitTesterOutput = {
    output: IRuntimeOutput;
    result: TestResult;
};
export declare class UnitTester extends CoreTool<IUnitTesterOutput> {
    private _quietMode;
    constructor(program: EmanCLI, config: IConfig, argv: string[]);
    getDescription: () => string;
    getFlagDocs: () => IFlagDocs[];
    getExamples: () => ICommandExample[];
    run: (cb: (err: any, result: IUnitTesterOutput) => void) => IUnitTesterOutput;
    static generateTestInfo: (runtime: Runtime, runNode: RunTestNode, describeNode?: DescribeNode) => string;
    static evaluateSettings: (runtime: Runtime, output: IRuntimeOutput, run: RunTestNode) => {
        [varName: string]: any;
    };
    private verifyTestCases;
    private getResultMagnitude;
    private getNextResult;
    private _quietLogs;
    private startDescriptor;
    private runTodo;
    private runTest;
    private logStart;
    private logDescriptor;
    private logTodo;
    private logTestResult;
    private logQuietModeOutputs;
}
