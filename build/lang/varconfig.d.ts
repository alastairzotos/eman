import { Runtime, IRuntimeOutput } from "./runtime";
export declare const createRuleConditions: (conditions: IRuleCondition[], left: any, right: any, operation: IRuleOp, type?: IRuleType) => void;
export declare type IRuleOp = '==' | '===' | '!==' | '!=' | '<' | '>' | '>=' | '<=' | 'startsWith' | 'endsWith' | 'notStartsWith' | 'notEndsWith' | 'contains' | 'notContains';
export declare type IRuleType = '&&' | '||' | 'end';
export interface IRuleCondition {
    type: IRuleType;
    operation: IRuleOp;
    left: string;
    right: string;
}
export interface IVarRule {
    conditions: IRuleCondition[];
    result: string;
}
export interface IVarConfig {
    rules: IVarRule[];
    default: string;
}
export declare const evaluateVarConfig: (varConfig: IVarConfig, output: IRuntimeOutput, runtime: Runtime, values: {
    [varName: string]: any;
}) => any;
