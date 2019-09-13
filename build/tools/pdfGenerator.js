"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var log = require("single-line-log");
var fetch = require("node-fetch");
var puppeteer = require("puppeteer");
var cliProgress = require("cli-progress");
var chalk_1 = require("chalk");
var node_html_to_pdf_1 = require("node-html-to-pdf");
var uuidv4_1 = require("uuidv4");
var rimraf = require("rimraf");
var argvParser = require("argv-parser");
var unittester_1 = require("./unittester");
var runtime_1 = require("../lang/runtime");
var parsenodes_1 = require("../lang/parsenodes");
var uploadlogger_1 = require("../em-api/uploadlogger");
var renderer_1 = require("../lang/renderer");
var utils_1 = require("../lang/utils");
var parser_1 = require("../lang/parser");
var coretool_1 = require("./coretool");
;
var PDFGenerator = /** @class */ (function (_super) {
    __extends(PDFGenerator, _super);
    function PDFGenerator(program, config, argv) {
        var _this = _super.call(this, program, config, argv) || this;
        _this._showProgressBar = true;
        _this._linkCache = {};
        _this._browserCache = {};
        _this._tempFiles = [];
        _this.getDescription = function () { return "Generates a PDF from the code. Source data from PDFs can come from tests or from a data source. Additional settings can be provided by exposing a settings function"; };
        _this.getFlagDocs = function () { return [
            // Settings
            {
                name: "settings",
                short: "s",
                type: "string",
                desc: "The name of an exported, top-level function in the source code which provides additional settings, such as source data and mappings"
            }
        ]; };
        _this.getExamples = function () { return [
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
        ]; };
        _this.run = function (cb) {
            var outputFile = _this.getBuildPath() + _this.getProjName() + '.pdf';
            var startTime = Date.now();
            var onComplete = function (err) {
                if (err) {
                    _this.program.displayError(chalk_1.default.red("\u2716 Error creating PDF:") + err.message + '\n');
                    cb(err, null);
                }
                else {
                    var elapsed = Date.now() - startTime;
                    log.stdout(chalk_1.default.green(chalk_1.default.bold("\u2714 Success [" + chalk_1.default.yellow(elapsed + 'ms') + "]: ")) + ("PDF saved to " + chalk_1.default.gray(outputFile) + "\n"));
                    cb(null, null);
                }
            };
            // Create temp folder
            if (fs.existsSync(_this._tempPath) && fs.lstatSync(_this._tempPath).isDirectory()) {
                rimraf.sync(_this._tempPath);
                fs.mkdirSync(_this._tempPath);
            }
            else {
                fs.mkdirSync(_this._tempPath);
            }
            _this.runCode({
                onRuntimeCreated: function (runtime) {
                    runtime.getScope()["runtime"].renderingPdf = true;
                    /*
                    Before runtime runs the code, <TestSettings /> must evaluate to itself
                    so that later on, while each test is run, it can be reset to return current test data
                    */
                    runtime.registerFunction(runtime_1.TEST_SETTINGS_NAME, function () { return "<" + runtime_1.TEST_SETTINGS_NAME + " />"; });
                },
                onRunFinished: function (runtime, output) {
                    if (!output) {
                        cb("Cannot build PDF due to compiler error", null);
                        return;
                    }
                    // Check if there's a settings function and extract settings if so
                    var settingsError = false;
                    var settings = null;
                    if (_this._settingsFunction) {
                        var runtimeSettingsExport = output.exports[_this._settingsFunction];
                        if (runtimeSettingsExport && runtimeSettingsExport.__isClosure) {
                            settings = runtimeSettingsExport.evaluate(runtime, {});
                            // TODO: Validate settings
                        }
                        else {
                            settingsError = true;
                            _this.program.displayError("Cannot find settings function '" + chalk_1.default.magenta(_this._settingsFunction) + "'. Are you sure you exported it?");
                        }
                    }
                    if (!settingsError) {
                        // If we haven't provided a settings function or there is no data source, use tests
                        if (!settings || !settings.dataSource) {
                            _this.generateHtmlUsingTests(runtime, output, outputFile, settings, function (err, htmlOutputs) {
                                if (err) {
                                    onComplete(err);
                                }
                                else {
                                    _this.performPdfBuild(htmlOutputs, outputFile, onComplete);
                                }
                            });
                        }
                        // Otherwise use the data source, and check if there's any mappings
                        else {
                            _this.generateHtmlUsingDataSource(_this.config.file, runtime, output, outputFile, settings, function (err, htmlOutputs) {
                                if (err) {
                                    console.log(err);
                                }
                                else {
                                    _this.performPdfBuild(htmlOutputs, outputFile, onComplete);
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
        _this.generateHtmlUsingDataSource = function (inputFile, runtime, output, outputFile, settings, cb) {
            var dataSrcFile = path.join(inputFile.split('/').slice(0, -1).join('/'), settings.dataSource);
            fs.exists(dataSrcFile, function (exists) {
                if (exists) {
                    fs.readFile(dataSrcFile, { encoding: 'utf8' }, function (err, data) {
                        if (err) {
                            cb(err, null);
                        }
                        else {
                            var lines = data.split('\n');
                            if (_this._showProgressBar) {
                                _this._progressBar.start(lines.length - 1);
                            }
                            // Get headings
                            var headings_1 = lines[0].split(settings.delimeter);
                            var mappedHeadings_1 = [];
                            // If there's any mappings change the headings accordingly
                            if (settings.mappings) {
                                headings_1.forEach(function (heading) {
                                    if (settings.mappings[heading] !== undefined) {
                                        mappedHeadings_1.push(settings.mappings[heading]);
                                    }
                                    else {
                                        mappedHeadings_1.push(heading);
                                    }
                                });
                            }
                            var rows = lines
                                .filter(function (val, index) { return index > 0; })
                                .map(function (line) { return line.split(settings.delimeter); })
                                .map(function (line) {
                                // Raw data
                                var rawRow = {};
                                headings_1.forEach(function (heading, index) {
                                    rawRow[heading] = line[index];
                                });
                                // Mapped row
                                var mappedRow = {
                                    now: utils_1.generateNowSetting()
                                };
                                mappedHeadings_1.forEach(function (heading, index) {
                                    mappedRow[heading] = line[index];
                                });
                                return {
                                    rawRow: rawRow,
                                    mappedRow: mappedRow
                                };
                            });
                            // Generates next page
                            var htmlOutputs_1 = [];
                            var next_1 = function (_a, cb) {
                                var current = _a[0], rest = _a.slice(1);
                                if (current) {
                                    var html = renderer_1.renderOutput(output.output, output, runtime, current.mappedRow);
                                    htmlOutputs_1.push(html);
                                    _this.parseAndFollowLinks(runtime, html, current.rawRow, outputFile, settings, function (err, pageHtml) {
                                        if (err) {
                                            cb(err);
                                        }
                                        else {
                                            if (pageHtml) {
                                                htmlOutputs_1.push(pageHtml);
                                            }
                                            if (_this._showProgressBar) {
                                                _this._progressBar.increment();
                                            }
                                            next_1(rest, cb);
                                        }
                                    });
                                }
                                else {
                                    cb(null);
                                }
                            };
                            next_1(rows, function (err) {
                                if (_this._showProgressBar) {
                                    _this._progressBar.stop();
                                }
                                if (err) {
                                    cb(err, null);
                                }
                                else {
                                    cb(null, htmlOutputs_1);
                                }
                            });
                        }
                    });
                }
                else {
                    cb("Cannot find data source: " + dataSrcFile, null);
                }
            });
        };
        /**
         * Generates an html template for the PDF by using test data
         */
        _this.generateHtmlUsingTests = function (runtime, output, outputFile, settings, cb) {
            var testCases = output.testCases;
            var runNodes = [];
            testCases.forEach(function (testCase) {
                testCase.testRuns.forEach(function (testRun) {
                    if (testRun.runNodeType == parsenodes_1.RunNodeType.Test) {
                        runNodes.push({
                            run: testRun,
                            parent: testCase
                        });
                    }
                });
            });
            if (_this._showProgressBar) {
                _this._progressBar.start(runNodes.length);
            }
            var htmlOutputs = [];
            var next = function (_a, cb) {
                var current = _a[0], rest = _a.slice(1);
                if (current) {
                    var testSettings = unittester_1.UnitTester.evaluateSettings(runtime, output, current.run);
                    runtime.switchOnTestSettings(unittester_1.UnitTester.generateTestInfo(runtime, current.run, current.parent));
                    var html = renderer_1.renderOutput(output.output, output, runtime, testSettings);
                    htmlOutputs.push(html);
                    _this.parseAndFollowLinks(runtime, html, current.run.settings, outputFile, settings, function (err, pageHtml) {
                        if (err) {
                            cb(err);
                        }
                        else {
                            if (pageHtml) {
                                htmlOutputs.push(pageHtml);
                            }
                            if (_this._showProgressBar) {
                                _this._progressBar.increment();
                            }
                            next(rest, cb);
                        }
                    });
                }
                else {
                    cb(null);
                }
            };
            next(runNodes, function (err) {
                if (_this._showProgressBar) {
                    _this._progressBar.stop();
                }
                if (err) {
                    cb(err, null);
                }
                else {
                    cb(null, htmlOutputs);
                }
            });
        };
        /**
         * Parses an email and follows links
         */
        _this.parseAndFollowLinks = function (runtime, html, data, outputFile, settings, cb) {
            if (settings && settings.followLinks) {
                var linkSettings_1 = settings.followLinks;
                var parser = new parser_1.Parser();
                var parsedDoc = parser.parseHTMLDoc('', "<>" + html + "</>");
                var aElements = parsedDoc.getElementsByTagName('a');
                if (aElements.length > 0) {
                    // Create a list of found links along with any auxiliary info, such as waiting for an element to show before taking a screenshot
                    var links = aElements
                        .map(function (aElem) { return aElem.attr("href"); })
                        .filter(function (href) { return href !== undefined; })
                        .map(function (linkExpr) { return linkExpr.exprType ? linkExpr.evaluate(runtime, {}) : linkExpr; })
                        .map(function (foundLink) {
                        var linkInfo = null;
                        linkSettings_1.forEach(function (linkSetting) {
                            var link = linkSetting.link, match = linkSetting.match, auxInfo = __rest(linkSetting, ["link", "match"]);
                            switch (match) {
                                case "exact": {
                                    if (foundLink == link) {
                                        linkInfo = __assign({ link: foundLink }, auxInfo);
                                    }
                                    break;
                                }
                                case "start": {
                                    if (foundLink.startsWith(link)) {
                                        linkInfo = __assign({ link: foundLink }, auxInfo);
                                    }
                                    break;
                                }
                                case "contain": {
                                    if (foundLink.indexOf(link) >= 0) {
                                        linkInfo = __assign({ link: foundLink }, auxInfo);
                                    }
                                    break;
                                }
                            }
                        });
                        return linkInfo;
                    })
                        .filter(function (linkInfo) {
                        return linkInfo !== null;
                    });
                    if (links.length > 0) {
                        _this.followLinks(links, data, outputFile, function (err, pageHtml) {
                            if (err) {
                                cb(err, null);
                            }
                            else {
                                if (pageHtml && pageHtml.length > 0) {
                                    cb(null, pageHtml.join(_this.getPageBreak()));
                                }
                                else {
                                    cb(null, null);
                                }
                            }
                        });
                    }
                    else {
                        cb(null, null);
                    }
                }
                else {
                    cb(null, null);
                }
            }
            else {
                cb(null, null);
            }
        };
        /**
         * Follows a list of links and grabs screenshots from each
         */
        _this.followLinks = function (links, data, outputFile, cb) {
            var outputPath = outputFile.split('/').slice(0, -1).join('/') + '/';
            var pageHtml = [];
            var next = function (browser, _a) {
                var current = _a[0], rest = _a.slice(1);
                if (current) {
                    var screenshotCb_1 = function (err, html) {
                        if (err) {
                            cb(err, null);
                        }
                        else {
                            pageHtml.push(html);
                            next(browser, rest);
                        }
                    };
                    var link = current.link, auxInfo_1 = __rest(current, ["link"]);
                    // Get query parameters
                    var queryParams = link.indexOf('?') >= 0
                        ? '?' + link.split('?').slice(1).join('?')
                        : '';
                    // Extract file and cache info
                    var baseLink_1 = link.indexOf('?') >= 0 ? link.split('?')[0] : link;
                    var fileName = uuidv4_1.default() + '.html';
                    var fullFileName_1 = "" + outputPath + fileName;
                    var fileUrl_1 = 'file://' + fullFileName_1;
                    // Check if we've cached the page. If not, download the page and then visit it
                    if (_this._linkCache[baseLink_1] === undefined) {
                        fetch(baseLink_1)
                            .then(function (resp) { return resp.text(); })
                            .then(function (contents) {
                            fs.writeFile(fullFileName_1, contents, 'utf8', function (err) {
                                if (err) {
                                    cb(err, null);
                                }
                                else {
                                    _this._tempFiles.push(fullFileName_1);
                                    _this._linkCache[baseLink_1] = fileUrl_1;
                                    _this.screenshotPage(browser, fileUrl_1, data, auxInfo_1, outputPath, screenshotCb_1);
                                }
                            });
                        })
                            .catch(function (error) {
                            cb(error, null);
                        });
                    }
                    // Go to the cached version
                    else {
                        _this.screenshotPage(browser, _this._linkCache[baseLink_1] + queryParams, data, auxInfo_1, outputPath, screenshotCb_1);
                    }
                }
                else {
                    // We've exhausted all links. Close the browser and leave
                    browser.close()
                        .then(function () {
                        cb(null, pageHtml);
                    })
                        .catch(function (error) {
                        cb(null, pageHtml);
                    });
                }
            };
            // Launch puppeteer browser
            puppeteer.launch({
                userDataDir: _this._tempPath + '/',
                ignoreHTTPSErrors: true,
            })
                .then(function (browser) {
                next(browser, links);
            })
                .catch(function (error) {
                cb(error, null);
            });
        };
        /**
         * Navigates to a page and gets a screenshot
         * Will cache the page and any css and js resources it encounters
         */
        _this.screenshotPage = function (browser, url, data, auxInfo, outputPath, cb) { return __awaiter(_this, void 0, void 0, function () {
            var page, screenie, e_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        return [4 /*yield*/, browser.newPage()];
                    case 1:
                        page = _a.sent();
                        return [4 /*yield*/, page.setRequestInterception(true)];
                    case 2:
                        _a.sent();
                        page.on('request', function (request) { return _this.interceptRequest(request, function (error) { return cb(error, null); }); });
                        // Override 'fetchAccountData' function
                        return [4 /*yield*/, page.evaluateOnNewDocument(function (testData) {
                                window["fetchAccountData"] = function (cb) {
                                    // Capitalise data directly for now. Not a good solution long term
                                    // Maybe pass it to a mapping function in auxInfo
                                    var newTestData = {};
                                    Object.keys(testData).forEach(function (key) {
                                        newTestData[key.toUpperCase()] = testData[key];
                                    });
                                    cb(null, newTestData);
                                };
                            }, data)];
                    case 3:
                        // Override 'fetchAccountData' function
                        _a.sent();
                        // Visit page and wait until loaded
                        return [4 /*yield*/, page.goto(url, { waitUntil: 'networkidle2' })];
                    case 4:
                        // Visit page and wait until loaded
                        _a.sent();
                        if (!(auxInfo && auxInfo.waitFor)) return [3 /*break*/, 6];
                        return [4 /*yield*/, page.waitForSelector(auxInfo.waitFor, { visible: true })];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        screenie = "" + outputPath + uuidv4_1.default() + ".png";
                        return [4 /*yield*/, page.screenshot({ fullPage: true, path: screenie, type: "png" })];
                    case 7:
                        _a.sent();
                        this._tempFiles.push(screenie);
                        // HTML template for a page is just an image with the screenshot as the source
                        cb(null, "<img src=\"file://" + screenie + "\" />");
                        return [3 /*break*/, 9];
                    case 8:
                        e_1 = _a.sent();
                        cb(e_1, null);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        }); };
        /**
         * Loads a resource
         * If it's not been loaded before, download it to the cache first
         * Otherwise load directly from the cache
         */
        _this.retrieveRemoteOrFromCache = function (request, onError) { return __awaiter(_this, void 0, void 0, function () {
            var resource, resourceText_1, fileName;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this._browserCache[request.url()] !== undefined)) return [3 /*break*/, 1];
                        fs.readFile(this._browserCache[request.url()], function (err, cached) {
                            request.respond({
                                body: cached
                            });
                        });
                        return [3 /*break*/, 4];
                    case 1: return [4 /*yield*/, fetch(request.url())];
                    case 2:
                        resource = _a.sent();
                        return [4 /*yield*/, resource.text()];
                    case 3:
                        resourceText_1 = _a.sent();
                        fileName = this._tempPath + '/' + uuidv4_1.default();
                        this._browserCache[request.url()] = fileName;
                        fs.writeFile(fileName, resourceText_1, function (err) {
                            if (err) {
                                onError(err);
                            }
                            else {
                                request.respond({
                                    body: resourceText_1
                                });
                            }
                        });
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        /**
         * Intercepts requests
         * Allows document to load
         * Will allow JS and CSS files but they must be cached
         * Every other request is aborted
         */
        _this.interceptRequest = function (request, onError) { return __awaiter(_this, void 0, void 0, function () {
            var cached;
            return __generator(this, function (_a) {
                cached = ['.js', '.css'];
                // Cache some resources
                if (cached.find(function (fileType) { return request.url().toLowerCase().endsWith(fileType); })) {
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
                return [2 /*return*/];
            });
        }); };
        /**
         * Creates an output html file and converts to PDF
         */
        _this.performPdfBuild = function (htmlOutputs, outputPdfFile, cb) {
            var outputHtmlFile = outputPdfFile.split('.').slice(0, -1).join('.') + '.html';
            uploadlogger_1.logOutput("Generating PDF...");
            // First save html templates
            fs.writeFile(outputHtmlFile, htmlOutputs.join(_this.getPageBreak()), 'utf8', function (err) {
                _this._tempFiles.push(outputHtmlFile);
                // Build PDF from html template
                var pdf = new node_html_to_pdf_1.default({
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
                    .then(function () {
                    uploadlogger_1.stopLog();
                    _this.cleanupTempFiles(function (err) {
                        rimraf.sync(_this._tempPath);
                        cb(err);
                    });
                })
                    .catch(function (error) {
                    uploadlogger_1.stopLog();
                    _this.cleanupTempFiles(function (err) {
                        rimraf.sync(_this._tempPath);
                        cb(error);
                    });
                });
            });
        };
        /**
         * Removes any temporary generated files
         */
        _this.cleanupTempFiles = function (cb) {
            var next = function (_a, cb) {
                var current = _a[0], rest = _a.slice(1);
                if (current) {
                    fs.unlink(current, function (err) {
                        if (err) {
                            cb(err);
                        }
                        else {
                            next(rest, cb);
                        }
                    });
                }
                else {
                    cb(null);
                }
            };
            next(_this._tempFiles, function (err) {
                _this._tempFiles = [];
                cb(err);
            });
        };
        _this.getPageBreak = function () { return '\n<div style="page-break-after: always;"><p>&nbsp;</p></div>\n'; };
        _this._progressBar = new cliProgress.SingleBar({
            format: chalk_1.default.magenta('Rendering') + " | " + chalk_1.default.cyan('{bar}') + " | {percentage}% || {value}/{total} ",
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
            clearOnComplete: true
        });
        _this._tempPath = "temp";
        var settings = argvParser.parse(argv, { rules: {
                settings: {
                    short: "s",
                    type: String,
                    value: ''
                }
            } }).parsed.settings;
        _this._settingsFunction = settings;
        return _this;
    }
    return PDFGenerator;
}(coretool_1.CoreTool));
exports.PDFGenerator = PDFGenerator;
//# sourceMappingURL=pdfGenerator.js.map