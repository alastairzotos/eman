import { IRuntimeOutput, Runtime } from './runtime';
export declare const renderOutput: (text: string, output: IRuntimeOutput, runtime: Runtime, values: {
    [varName: string]: any;
}) => string;
