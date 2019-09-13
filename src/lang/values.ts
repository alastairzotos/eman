import { Runtime } from './runtime';

export interface IEvaluatable {
    evaluate: (compiler: Runtime, args: IValues) => any;
}

export interface IValues {
    [arg: string]: any;
}