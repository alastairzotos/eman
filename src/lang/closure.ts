import { Runtime, IScope } from './runtime';
import { FuncExpr } from './parsenodes';
import { IEvaluatable, IValues } from './values';


export class FuncClosure {
    private __isClosure = true;

    public runtime: Runtime;
    public thisArg: any;
    public scope: IScope = {};
    public funcExpr: FuncExpr;
    public func: (...funcArgs)=>any;
    public prototype: any = Object.prototype;

    constructor() {
    }

    evaluate = (runtime: Runtime, args: IValues, thisArg?: any): any => {
        this.thisArg = thisArg;
        return this.func.apply(thisArg || global, args);
    };

    apply = (thisArg: any, args: IValues) => {
        this.thisArg = thisArg;
        return this.func.apply(thisArg, args);
    };

}