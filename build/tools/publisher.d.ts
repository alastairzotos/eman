import { CoreTool, IConfig, IFlagDocs, ICommandExample } from './coretool';
import { EmanCLI } from './emancli';
export declare class Publisher extends CoreTool<any> {
    private _noTest;
    constructor(program: EmanCLI, config: IConfig, argv: string[]);
    getDescription: () => string;
    getFlagDocs: () => IFlagDocs[];
    getExamples: () => ICommandExample[];
    run: (cb: (err: any, result: any) => void) => void;
    private performPublish;
}
