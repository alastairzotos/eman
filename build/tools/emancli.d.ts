import { IConfig, CoreTool } from './coretool';
declare type IToolType<T extends CoreTool> = new (program: EmanCLI, config: IConfig, argv: string[]) => T;
interface IToolOptions {
    requiresConfig: boolean;
}
interface ICommandInfo {
    tool: IToolType<CoreTool>;
    options: IToolOptions;
}
export declare class EmanCLI {
    private _argv;
    private _validCommands;
    isWatchingForTypes: boolean;
    constructor();
    displayError: (msg: string) => void;
    registerTool: <T extends CoreTool<any>>(id: string, tool: IToolType<T>, options?: IToolOptions) => void;
    getCommands: () => {
        [cmd: string]: ICommandInfo;
    };
    start: (cb?: (err: any, result: any) => void) => void;
    private checkForFileWatch;
    private resolveConfigFile;
    private fixConfig;
    private validateConfig;
}
export {};
