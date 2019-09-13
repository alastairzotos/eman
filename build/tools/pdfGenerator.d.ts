import { EmanCLI } from './emancli';
import { IConfig, CoreTool, IFlagDocs, ICommandExample } from './coretool';
export declare class PDFGenerator extends CoreTool<any> {
    private _settingsFunction;
    private _showProgressBar;
    private _progressBar;
    private _linkCache;
    private _browserCache;
    private _tempFiles;
    private _tempPath;
    constructor(program: EmanCLI, config: IConfig, argv: string[]);
    getDescription: () => string;
    getFlagDocs: () => IFlagDocs[];
    getExamples: () => ICommandExample[];
    run: (cb: (err: any, result: any) => void) => void;
    /**
     * Generates an html template for the PDF by using a data source
     */
    private generateHtmlUsingDataSource;
    /**
     * Generates an html template for the PDF by using test data
     */
    private generateHtmlUsingTests;
    /**
     * Parses an email and follows links
     */
    private parseAndFollowLinks;
    /**
     * Follows a list of links and grabs screenshots from each
     */
    private followLinks;
    /**
     * Navigates to a page and gets a screenshot
     * Will cache the page and any css and js resources it encounters
     */
    private screenshotPage;
    /**
     * Loads a resource
     * If it's not been loaded before, download it to the cache first
     * Otherwise load directly from the cache
     */
    private retrieveRemoteOrFromCache;
    /**
     * Intercepts requests
     * Allows document to load
     * Will allow JS and CSS files but they must be cached
     * Every other request is aborted
     */
    private interceptRequest;
    /**
     * Creates an output html file and converts to PDF
     */
    private performPdfBuild;
    /**
     * Removes any temporary generated files
     */
    private cleanupTempFiles;
    private getPageBreak;
}
