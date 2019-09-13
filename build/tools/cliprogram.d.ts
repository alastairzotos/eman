import { IConfig, CoreTool } from './coretool';
declare type IToolType<T extends CoreTool> = new (program: EmanCLI, config: IConfig, argv: string[]) => T;
interface ICommandInfo {
    tool: IToolType<CoreTool>;
    requiresConfig: boolean;
}
export declare class EmanCLI {
    private _argv;
    private _validCommands;
    constructor();
    displayError: (msg: string) => void;
    registerTool: <T extends CoreTool<any>>(id: string | string[], tool: IToolType<T>, requiresConfig?: boolean) => void;
    getCommands: () => {
        [cmd: string]: ICommandInfo;
    };
    private start;
    private resolveConfigFile;
    private fixConfig;
    private validateConfig;
}
export {};
