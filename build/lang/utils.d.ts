import { IRuleCondition } from './varconfig';
import { IRuntimeOutput } from './runtime';
export declare const conditionToString: (cond: IRuleCondition) => string;
export declare const conditionsToString: (conds: IRuleCondition[]) => string;
export declare const displayFormattedOutput: (compiled: IRuntimeOutput, fullOutput: boolean) => void;
export declare const displayOutputObject: (compiled: IRuntimeOutput, alterianVersion?: boolean) => void;
export declare const displayOutput: (output: IRuntimeOutput, fullOutput: boolean) => void;
export declare const stringHash: (input: string) => string;
export declare const generateNowSetting: () => string;
