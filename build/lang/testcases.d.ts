import { RunTestNode } from './parsenodes';
import { Runtime, IRuntimeOutput } from './runtime';
export declare enum TestResult {
    Passed = "passed",
    Failed = "failed",
    Todo = "todo"
}
export declare class UnitTester {
    private _quietMode;
    runTests: (file: string, quiet?: boolean) => TestResult;
    private verifyTestCases;
    private getResultMagnitude;
    private getNextResult;
    private _quietLogs;
    private startDescriptor;
    private runTodo;
    static evaluateSettings: (runtime: Runtime, output: IRuntimeOutput, run: RunTestNode) => {
        [varName: string]: any;
    };
    private runTest;
    private logStart;
    private logDescriptor;
    private logTodo;
    private logTestResult;
    private logQuietModeOutputs;
}
