import { ParseNode, StmtNode } from './parsenodes';
import { IVarConfig, IRuleCondition } from './varconfig';
import { FuncClosure } from './closure';
import { IValues } from './values';
import { IntermediateRef, IYieldedVars, ILookupTables, YieldVar } from './remotevars';
export declare const TEST_SETTINGS_NAME = "TestSettings";
export interface IScope {
    [name: string]: any;
}
export interface IRuntimeOutput {
    output: string;
    yieldedVars: IYieldedVars;
    lookupTables: ILookupTables;
    yieldLookups: {
        [name: string]: string;
    };
    sections: {
        [name: string]: IVarConfig;
    };
    intermediates: {
        [name: string]: IVarConfig;
    };
    exports: {
        [name: string]: any;
    };
    testCases: StmtNode[];
}
export declare class Runtime {
    yieldedVars: IValues;
    static sections: {
        [name: string]: IVarConfig;
    };
    static intermediates: {
        [name: string]: IVarConfig;
    };
    static lookupTables: ILookupTables;
    static yieldLookups: {
        [name: string]: string;
    };
    private static _sectionCount;
    private static _intermediateCount;
    private static _importCache;
    static clearStaticData: () => void;
    shouldThrowOnYieldedLoad: boolean;
    warningsSuppressed: boolean;
    private _variables;
    private _scope;
    private _consts;
    private _exports;
    private _stack;
    private _tests;
    constructor();
    run: (file: string) => IRuntimeOutput;
    onNotFound: (varName: string, parseNode: ParseNode) => never;
    pushStack: (func: FuncClosure) => void;
    popStack: () => FuncClosure;
    stackTop: () => FuncClosure;
    pushScope: (scope?: IScope) => void;
    popScope: () => IScope;
    getScope: () => IScope;
    getFullScope: () => IScope;
    getLocal: (varName: string) => any;
    setLocal: (varName: string, value: any) => void;
    setConst: (varName: string) => void;
    isConst: (varName: string) => boolean;
    checkForYieldedLoad: (cb: () => any) => any;
    generateDynamicSection: (varConfig: IVarConfig) => YieldVar;
    switchOnTestSettings: (output: string) => void;
    generateIntermediateValue: (conditions: IRuleCondition[]) => IntermediateRef;
    generateIntermediateConditions: (currentConditions: IRuleCondition[], conditions: IRuleCondition[]) => void;
    private handlePluginLoad;
    private handleImports;
    private collectObjects;
    private _onComponentRegistered;
    registerComponent: (name: string, params: {
        [name: string]: string;
    }, func: (...args: any[]) => any) => void;
    registerFunction: (name: string, func: (...args: any[]) => any) => void;
    private STRIP_COMMENTS;
    private ARGUMENT_NAMES;
    private _getParamNames;
}
