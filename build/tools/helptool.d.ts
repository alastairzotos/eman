import { EmanCLI } from './emancli';
import { IConfig, CoreTool } from './coretool';
export declare class HelpTool extends CoreTool<any> {
    constructor(program: EmanCLI, config: IConfig, argv: string[]);
    getDescription: () => string;
    run: (cb: (err: any, res: any) => void) => void;
    private displayAllCommands;
}
