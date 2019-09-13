import * as fs from 'fs';
import * as path from 'path';
import * as log from 'single-line-log';

import * as fetch from 'node-fetch';
import * as puppeteer from 'puppeteer';

import * as cliProgress from 'cli-progress';
import chalk from 'chalk';
import PDF from 'node-html-to-pdf';
import uuid from 'uuidv4';

import * as rimraf from 'rimraf';
import * as argvParser from 'argv-parser';

import { UnitTester } from './unittester';
import { Runtime, IRuntimeOutput, CURRENT_TEST_RUN_NAME } from '../lang/runtime';
import { DescribeNode, RunNodeType, RunTestNode, ExprNode } from '../lang/parsenodes';
import { logOutput, stopLog } from '../em-api/uploadlogger';
import { FuncClosure } from '../lang/closure';
import { renderOutput } from '../lang/renderer';
import { generateNowSetting } from '../lang/utils';
import { Parser } from '../lang/parser';
import { EmanCLI } from './emancli';
import { IConfig, CoreTool, IFlagDocs, ICommandExample } from './coretool';


interface IPDFLinkSettings {
    link: string;
    match: 'exact'|'start'|'contain';
}

interface IPDFSettings {
    dataSource?: string;
    delimeter?: string;
    mappings?: { [input: string]: string; };
    followLinks?: IPDFLinkSettings[];
};


export class PDFGenerator extends CoreTool<any> {

    private _settingsFunction: string;

    private _showProgressBar = true;
    private _progressBar: any;

    private _linkCache: { [link: string]: string } = {};
    private _browserCache: { [url: string]: string } = {};

    private _tempFiles: string[] = [];
    private _tempPath: string;


    constructor(program: EmanCLI, config: IConfig, argv: string[]) {
        super(program, config, argv);

        this._progressBar = new cliProgress.SingleBar({
            format: `${chalk.magenta('Rendering')} | ${chalk.cyan('{bar}')} | {percentage}% || {value}/{total} `,
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
            clearOnComplete: true
        });

        this._tempPath = "temp";

        const { settings } = argvParser.parse(argv, { rules: {
            settings: {
                short: "s",
                type: String,
                value: ''
            }
        } }).parsed;

        this._settingsFunction = settings;
    }

    getDescription = (): string => "Generates a PDF from the code. Source data from PDFs can come from tests or from a data source. Additional settings can be provided by exposing a settings function";

    getFlagDocs = (): IFlagDocs[] => [

        // Settings
        {
            name: "settings",
            short: "s",
            type: "string",
            desc: "The name of an exported, top-level function in the source code which provides additional settings, such as source data and mappings"
        }

    ];

    getExamples = (): ICommandExample[] => [
        {
            flags: '',
            source: 'src/myproj',
            explanation: 'Creates PDF using tests as a source of data'
        },

        {
            flags: '-s=pdfSettings',
            source: '',
            explanation: "Generates PDF using settings defined in exported 'pdfSettings()'. This can override the data source, define data mappings, follow links to screenshot landing pages, etc"
        }
    ];

    run = (cb: (err: any, result: any)=>void) => {
        const outputFile = this.getBuildPath() + this.getProjName() + '.pdf';

        const startTime = Date.now();

        const onComplete = (err: any) => {
            if (err) {
                this.program.displayError(chalk.red("\u2716 Error creating PDF:") + err.message + '\n');
                cb(err, null);
            } else {
                const elapsed = Date.now() - startTime;
                log.stdout(chalk.green(chalk.bold(`\u2714 Success [${chalk.yellow(elapsed + 'ms')}]: `)) + `PDF saved to ${chalk.gray(outputFile)}\n`);
                cb(null, null);
            }
        };

        // Create temp folder
        if (fs.existsSync(this._tempPath) && fs.lstatSync(this._tempPath).isDirectory()) {
            rimraf.sync(this._tempPath);
            fs.mkdirSync(this._tempPath);
        } else {
            fs.mkdirSync(this._tempPath);
        }


        this.runCode({
            onRuntimeCreated: runtime => {
                runtime.getScope()["runtime"].renderingPdf = true;
            },

            onRunFinished: (runtime, output) => {

                if (!output) {
                    cb("Cannot build PDF due to compiler error", null);
                    return;
                }

                // Check if there's a settings function and extract settings if so
                let settingsError = false;
                let settings: IPDFSettings = null;
                if (this._settingsFunction) {
                    const runtimeSettingsExport = output.exports[this._settingsFunction];

                    if (runtimeSettingsExport && runtimeSettingsExport.__isClosure) {
                        settings = (runtimeSettingsExport as FuncClosure).evaluate(runtime, {});

                        // TODO: Validate settings

                    } else {
                        settingsError = true;
                        this.program.displayError(`Cannot find settings function '${chalk.magenta(this._settingsFunction)}'. Are you sure you exported it?`);
                    }
                }

                if (!settingsError) {

                    // If we haven't provided a settings function or there is no data source, use tests
                    if (!settings || !settings.dataSource) {
                        this.generateHtmlUsingTests(runtime, output, outputFile, settings, (err: any, htmlOutputs: string[]) => {
                            if (err) {
                                onComplete(err);
                            } else {
                                this.performPdfBuild(htmlOutputs, outputFile, onComplete);
                            }
                        });
                    }
                    
                    // Otherwise use the data source, and check if there's any mappings
                    else {
                        this.generateHtmlUsingDataSource(this.config.file, runtime, output, outputFile, settings, (err: any, htmlOutputs: string[]) => {
                            if (err) {
                                console.log(err);
                            } else {
                                this.performPdfBuild(htmlOutputs, outputFile, onComplete);
                            }
                        });
                    }

                }

            }
        });

    };


    /**
     * Generates an html template for the PDF by using a data source
     */
    private generateHtmlUsingDataSource = (inputFile: string, runtime: Runtime, output: IRuntimeOutput, outputFile: string, settings: IPDFSettings, cb: (err: any, htmlOutputs: string[])=>void) => {

        const dataSrcFile = path.join(inputFile.split('/').slice(0, -1).join('/'), settings.dataSource);
        fs.exists(dataSrcFile, exists => {
            if (exists) {

                fs.readFile(dataSrcFile, { encoding: 'utf8' }, (err: any, data: string) => {
                    if (err) {
                        cb(err, null);
                    } else {

                        const lines = data.split('\n');

                        if (this._showProgressBar) {
                            this._progressBar.start(lines.length - 1);
                        }

                        // Get headings
                        let headings = lines[0].split(settings.delimeter);
                        const mappedHeadings = [];

                        // If there's any mappings change the headings accordingly
                        if (settings.mappings) {

                            headings.forEach(heading => {
                                if (settings.mappings[heading] !== undefined) {
                                    mappedHeadings.push(settings.mappings[heading]);
                                } else {
                                    mappedHeadings.push(heading);
                                }
                            });
                        }

                        // Generate row data
                        type IRowData = { rawRow: { [varName: string]: any}, mappedRow: { [varName: string]: any } };
                        const rows: IRowData[] = lines
                            .filter((val, index) => index > 0)
                            .map(line => line.split(settings.delimeter))
                            .map(line => {

                                // Raw data
                                const rawRow = {};
                                headings.forEach((heading, index) => {
                                    rawRow[heading] = line[index];
                                });

                                // Mapped row
                                const mappedRow = {
                                    now: generateNowSetting(),
                                    [CURRENT_TEST_RUN_NAME]: ""
                                };
                                mappedHeadings.forEach((heading, index) => {
                                    mappedRow[heading] = line[index];
                                });

                                return {
                                    rawRow,
                                    mappedRow
                                } as IRowData;
                            });

                        
                        
                        // Generates next page
                        const htmlOutputs: string[] = [];
                        const next = ([current, ...rest]: IRowData[], cb: (err: any)=>void) => {
                            if (current) {

                                const html = renderOutput(output.output, output, runtime, current.mappedRow);
                                htmlOutputs.push(html);

                                this.parseAndFollowLinks(runtime, html, current.rawRow, outputFile, settings, (err, pageHtml: string) => {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        if (pageHtml) {
                                            htmlOutputs.push(pageHtml);
                                        }

                                        if (this._showProgressBar) {
                                            this._progressBar.increment();
                                        }

                                        next(rest, cb);
                                    }
                                });

                            } else {
                                cb(null);
                            }
                        };

                        next(rows, err => {
                            if (this._showProgressBar) {
                                this._progressBar.stop();
                            }

                            if (err) {
                                cb(err, null);
                            } else {
                                cb(null, htmlOutputs);
                            }
                        })

                    }

                });

            } else {
                cb(`Cannot find data source: ${dataSrcFile}`, null);
            }
        });
    };


    /**
     * Generates an html template for the PDF by using test data
     */
    private generateHtmlUsingTests = (runtime: Runtime, output: IRuntimeOutput, outputFile: string, settings: IPDFSettings, cb: (err: any, htmlOutputs: string[])=>void) => {
        const testCases = output.testCases;

        // Count number of tests
        type ITestInfo = { run: RunTestNode, parent: DescribeNode };
        const runNodes: ITestInfo[] = [];

        testCases.forEach(testCase => {
            (testCase as DescribeNode).testRuns.forEach(testRun => {
                if (testRun.runNodeType == RunNodeType.Test) {
                    runNodes.push({
                        run: testRun as RunTestNode,
                        parent: testCase as DescribeNode
                    });
                }
            });
        });

        if (this._showProgressBar) {
            this._progressBar.start(runNodes.length);
        }

        const htmlOutputs: string[] = [];
        const next = ([current, ...rest]: ITestInfo[], cb: (err: any)=>void) => {
            if (current) {
                const testSettings = UnitTester.evaluateSettings(runtime, output, current.run);
                testSettings[CURRENT_TEST_RUN_NAME] = UnitTester.generateTestInfo(runtime, current.run, current.parent);

                const html = renderOutput(output.output, output, runtime, testSettings);
                htmlOutputs.push(html);

                this.parseAndFollowLinks(runtime, html, current.run.settings, outputFile, settings, (err, pageHtml: string) => {
                    if (err) {
                        cb(err);
                    } else {
                        if (pageHtml) {
                            htmlOutputs.push(pageHtml);
                        }

                        if (this._showProgressBar) {
                            this._progressBar.increment();
                        }
                        next(rest, cb);
                    }
                });

            } else {
                cb(null);
            }
        };

        next(runNodes, err => {
            if (this._showProgressBar) {
                this._progressBar.stop();
            }

            if (err) {
                cb(err, null);
            } else {
                cb(null, htmlOutputs);
            }
        });
    };

    /**
     * Parses an email and follows links
     */
    private parseAndFollowLinks = (runtime: Runtime, html: string, data: { [varName: string]: any }, outputFile: string, settings: IPDFSettings, cb: (err: any, pageHtml: string)=>void) => {

        if (settings && settings.followLinks) {
            const linkSettings = settings.followLinks;

            const parser = new Parser();
            const parsedDoc = parser.parseHTMLDoc('', `<>${html}</>`);

            const aElements = parsedDoc.getElementsByTagName('a');

            if (aElements.length > 0) {
                
                // Create a list of found links along with any auxiliary info, such as waiting for an element to show before taking a screenshot
                const links = aElements
                    .map(aElem => aElem.attr("href"))
                    .filter(href => href !== undefined)
                    .map(linkExpr => linkExpr.exprType ? (linkExpr as ExprNode).evaluate(runtime, {}) : linkExpr)
                    .map((foundLink: string) => {
                        let linkInfo = null;
                        
                        linkSettings.forEach(linkSetting => {
                            const { link, match, ...auxInfo } = linkSetting;

                            switch (match) {
                                case "exact": {
                                    if (foundLink == link) {
                                        linkInfo = { link: foundLink, ...auxInfo };
                                    }
                                    break;
                                }

                                case "start": {
                                    if (foundLink.startsWith(link)) {
                                        linkInfo = { link: foundLink, ...auxInfo };
                                    }
                                    break;
                                }

                                case "contain": {
                                    if (foundLink.indexOf(link) >= 0) {
                                        linkInfo = { link: foundLink, ...auxInfo };
                                    }
                                    break;
                                }
                            }
                        });

                        return linkInfo;
                    })
                    .filter(linkInfo => {
                        return linkInfo !== null;
                    });

                if (links.length > 0) {
                    this.followLinks(links, data, outputFile, (err, pageHtml: string[]) => {
                        if (err) {
                            cb(err, null);
                        } else {
                            if (pageHtml && pageHtml.length > 0) {
                                cb(null, pageHtml.join(this.getPageBreak()));   
                            } else {
                                cb(null, null);
                            }
                        }
                    });
                } else {
                    cb(null, null);
                }

            } else {
                cb(null, null);
            }
        } else {
            cb(null, null);
        }
    };

    /**
     * Follows a list of links and grabs screenshots from each
     */
    private followLinks = (links: any[], data: { [varName: string]: any }, outputFile: string, cb: (err: any, pageHtml: string[])=>void) => {

        const outputPath = outputFile.split('/').slice(0, -1).join('/') + '/';

        const pageHtml: string[] = [];
        const next = (browser: puppeteer.Browser, [current, ...rest]: any[]) => {
            if (current) {

                const screenshotCb = (err: any, html: string) => {
                    if (err) {
                        cb(err, null);
                    } else {
                        pageHtml.push(html);
                        next(browser, rest);
                    }
                };

                const { link, ...auxInfo } = current;

                // Get query parameters
                const queryParams = link.indexOf('?') >= 0
                                    ? '?' + link.split('?').slice(1).join('?')
                                    : '';

                // Extract file and cache info
                const baseLink = link.indexOf('?') >= 0 ? link.split('?')[0] : link;
                const fileName = uuid() + '.html';
                const fullFileName = `${outputPath}${fileName}`;
                const fileUrl = 'file://' + fullFileName;

                // Check if we've cached the page. If not, download the page and then visit it
                if (this._linkCache[baseLink] === undefined) {

                    fetch(baseLink)
                        .then(resp => resp.text())
                        .then(contents => {

                            fs.writeFile(fullFileName, contents, 'utf8', err => {
                                if (err) {
                                    cb(err, null);
                                } else {
                                    this._tempFiles.push(fullFileName);
                                    this._linkCache[baseLink] = fileUrl;

                                    this.screenshotPage(browser, fileUrl, data, auxInfo, outputPath, screenshotCb);
                                }
                            });

                        })
                        .catch(error => {
                            cb(error, null);
                        });
                }

                // Go to the cached version
                else {
                    this.screenshotPage(browser, this._linkCache[baseLink] + queryParams, data, auxInfo, outputPath, screenshotCb);
                }

            } else {

                // We've exhausted all links. Close the browser and leave
                browser.close()
                    .then(() => {
                        cb(null, pageHtml);
                    })
                    .catch(error => {
                        cb(null, pageHtml);
                    });
            }
        };

        // Launch puppeteer browser
        puppeteer.launch({
            userDataDir: this._tempPath + '/',
            ignoreHTTPSErrors: true,
            //devtools: true, slowMo: 500
        })
            .then(browser => {
                next(browser, links);
            })
            .catch(error => {
                cb(error, null);
            });
    };

    /**
     * Navigates to a page and gets a screenshot
     * Will cache the page and any css and js resources it encounters
     */
    private screenshotPage = async(browser: puppeteer.Browser, url: string, data: any, auxInfo: any, outputPath: string, cb: (err: any, pageHtml: string)=>void) => {
        try {
            const page = await browser.newPage();

            await page.setRequestInterception(true);
            page.on('request', request => this.interceptRequest(request, error => cb(error, null)));

            // Override 'fetchAccountData' function
            await page.evaluateOnNewDocument(testData => {
                window["fetchAccountData"] = (cb: (err: any, data: any)=>void) => {

                    // Capitalise data directly for now. Not a good solution long term
                    // Maybe pass it to a mapping function in auxInfo
                    const newTestData = {};
                    Object.keys(testData).forEach(key => {
                        newTestData[key.toUpperCase()] = testData[key];
                    });

                    cb(null, newTestData);
                };
            }, data);

            // Visit page and wait until loaded
            await page.goto(url, { waitUntil: 'networkidle2' });

            // Check if we need to wait for anything
            if (auxInfo && auxInfo.waitFor) {
                await page.waitForSelector(auxInfo.waitFor, { visible: true });
            }

            // Capture screenshot
            const screenie = `${outputPath}${uuid()}.png`;
            await page.screenshot({ fullPage: true, path: screenie, type: "png" });

            this._tempFiles.push(screenie);

            // HTML template for a page is just an image with the screenshot as the source
            cb(null, `<img src="file://${screenie}" />`);

        } catch (e) {
            cb(e, null);
        }
    };


    /** 
     * Loads a resource
     * If it's not been loaded before, download it to the cache first
     * Otherwise load directly from the cache
     */
    private retrieveRemoteOrFromCache = async(request: puppeteer.Request, onError: (err: any)=>void) => {
        
        // First check if it's cached
        // If it is, respond with the contents of the cached resource
        if (this._browserCache[request.url()] !== undefined) {
            fs.readFile(this._browserCache[request.url()], (err, cached) => {
                request.respond({
                    body: cached
                });
            });
        }
        
        // Download and cache
        else {
            const resource = await fetch(request.url());
            const resourceText = await resource.text();
            const fileName = this._tempPath + '/' + uuid();  //'temp/' + uuid();

            this._browserCache[request.url()] = fileName;

            fs.writeFile(fileName, resourceText, err => {
                if (err) {
                    onError(err);
                } else {
                    request.respond({
                        body: resourceText
                    });
                }
            });
        }
    };

    /**
     * Intercepts requests
     * Allows document to load
     * Will allow JS and CSS files but they must be cached
     * Every other request is aborted
     */
    private interceptRequest = async(request: puppeteer.Request, onError: (err: any)=>void) => {
        const cached = ['.js', '.css'];

        // Cache some resources
        if (cached.find(fileType => request.url().toLowerCase().endsWith(fileType))) {
            this.retrieveRemoteOrFromCache(request, onError);            
        }
        
        // Allow document load
        else if (request.resourceType() === 'document') {
            request.continue();
        }
        
        // Abort every other request
        else {
            request.abort();
        }
    };


    /**
     * Creates an output html file and converts to PDF
     */
    private performPdfBuild = (htmlOutputs: string[], outputPdfFile: string, cb: (err: any)=>void) => {
        const outputHtmlFile = outputPdfFile.split('.').slice(0, -1).join('.') + '.html';

        logOutput("Generating PDF...");
        
        // First save html templates
        fs.writeFile(outputHtmlFile, htmlOutputs.join(this.getPageBreak()), 'utf8', err => {

            this._tempFiles.push(outputHtmlFile);

            // Build PDF from html template
            let pdf = new PDF({
                templatePath: outputHtmlFile,
                data: {},
                options: {
                    handlbarsCompileOptions: {},
                    puppeteerPDFOptions: {
                        path: outputPdfFile
                    }
                }
            });

            pdf.build()
                .then(() => {
                    stopLog();

                    this.cleanupTempFiles(err => {
                        rimraf.sync(this._tempPath);
                        cb(err);
                    })
                })
                .catch(error => {
                    stopLog();

                    this.cleanupTempFiles(err => {
                        rimraf.sync(this._tempPath);
                        cb(error);
                    });
                });

        });
    };

    /**
     * Removes any temporary generated files
     */
    private cleanupTempFiles = (cb: (err: any)=>void) => {
        const next = ([current, ...rest]: string[], cb: (err: any)=>void) => {
            if (current) {
                fs.unlink(current, err => {
                    if (err) {
                        cb(err);
                    } else {
                        next(rest, cb);
                    }
                });
            } else {
                cb(null);
            }
        };

        next(this._tempFiles, err => {
            this._tempFiles = [];

            cb(err);
        });
    };

    private getPageBreak = (): string => '\n<div style="page-break-after: always;"><p>&nbsp;</p></div>\n';

}