import { EmanCLI } from './emancli';
import { Runtime, IRuntimeOutput } from '../lang/runtime';
export interface IConfig {
    file: string;
    campaignId: number;
    token: string;
}
export interface IFlagDocs {
    name: string;
    short?: string;
    type: "string" | "boolean";
    desc: string;
}
export interface ICommandExample {
    flags: string;
    source: string;
    explanation: string;
}
export declare const CLI_CMD = "eman";
interface IRunCodeOptions<T = any> {
    onRuntimeCreated?: (runtime: Runtime) => void;
    onRunFinished: (runtime: Runtime, output: IRuntimeOutput) => T;
}
declare type IExitHandler = (code: number, cb: () => void) => void;
export declare class CoreTool<T = any> {
    protected program: EmanCLI;
    protected config: IConfig;
    protected argv: string[];
    private _exitHandler;
    constructor(program: EmanCLI, config: IConfig, argv: string[]);
    run: (cb: (err: any, result: T) => void) => void;
    protected runCode: (options: IRunCodeOptions<any>) => T;
    protected setExitHandler: (handler: IExitHandler) => void;
    displayToolDocs: (commandName: string) => void;
    private displayFlagDocs;
    private displayExamples;
    protected wrapLine: (text: string, maxLength: number) => string;
    getDescription: () => string;
    protected getFlagDocs: () => IFlagDocs[];
    protected getExamples: () => ICommandExample[];
    protected getProjName: () => string;
    protected getProjPath: () => string;
    protected getBuildPath: () => string;
}
export {};
