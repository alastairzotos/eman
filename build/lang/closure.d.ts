import { Runtime, IScope } from './runtime';
import { FuncExpr } from './parsenodes';
import { IValues } from './values';
export declare class FuncClosure {
    private __isClosure;
    runtime: Runtime;
    thisArg: any;
    scope: IScope;
    funcExpr: FuncExpr;
    func: (...funcArgs: any[]) => any;
    prototype: any;
    constructor();
    evaluate: (runtime: Runtime, args: IValues, thisArg?: any) => any;
    apply: (thisArg: any, args: IValues) => any;
}
