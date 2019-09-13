import { EmanCLI } from './emancli';
import { IConfig, CoreTool, IFlagDocs, ICommandExample } from './coretool';
export declare class RenderTool extends CoreTool<any> {
    private _displayOutput;
    private _settingsObject;
    private _componentName;
    private _openInBrowser;
    private _tempPath;
    private _tempFileName;
    constructor(program: EmanCLI, config: IConfig, argv: string[]);
    getDescription: () => string;
    getFlagDocs: () => IFlagDocs[];
    getExamples: () => ICommandExample[];
    run: (cb: (err: any, res: any) => void) => void;
    private buildAndRender;
    private processOutputForLiveReload;
    private getCampaignVarSettings;
    private validateSettings;
    private parseValue;
}
