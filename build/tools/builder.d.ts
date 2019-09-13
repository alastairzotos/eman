import { EmanCLI } from './emancli';
import { CoreTool, IConfig, IFlagDocs, ICommandExample } from './coretool';
export declare class Builder extends CoreTool<any> {
    private _display;
    private _displayFull;
    private _save;
    private _watch;
    constructor(program: EmanCLI, config: IConfig, argv: string[]);
    getDescription: () => string;
    getFlagDocs: () => IFlagDocs[];
    getExamples: () => ICommandExample[];
    run: (cb: (err: any, result: any) => void) => void;
    private build;
}
