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
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var coretool_1 = require("./coretool");
var argvParser = require("argv-parser");
var renderer_1 = require("../lang/renderer");
var runtime_1 = require("../lang/runtime");
var cli_highlight_1 = require("cli-highlight");
var node_watch_1 = require("node-watch");
var rimraf = require("rimraf");
var utils_1 = require("../lang/utils");
var liveServer = require('live-server');
var pretty = require("pretty");
var RenderTool = /** @class */ (function (_super) {
    __extends(RenderTool, _super);
    function RenderTool(program, config, argv) {
        var _this = _super.call(this, program, config, argv) || this;
        _this._tempPath = "temp";
        _this._tempFileName = "render.html";
        _this.getDescription = function () { return "Renders the generated output using either default variable settings or by providing an object with key-value pairs. Optionally displays to the console or with live browser reloading"; };
        _this.getFlagDocs = function () { return [
            {
                name: "display",
                short: "s",
                type: "boolean",
                desc: "Displays the generated HTML output to the console"
            },
            {
                name: "settings",
                short: "s",
                type: "string",
                desc: "The name of an exported object from your main file or a set of comma-separated key-value pairs to assign campaign variables to. Unset variables will use their default values"
            },
            {
                name: "component",
                short: "c",
                type: "string",
                desc: "The name of an exported component function from your main file. The component should not accept any parameters"
            },
            {
                name: "open",
                short: "o",
                type: "boolean",
                desc: "Opens the render in the browser and live-reloads with every change"
            }
        ]; };
        _this.getExamples = function () { return [
            {
                source: "",
                flags: "-d",
                explanation: "Checks the current working directory and uses the default campaign variable values. Displays output to console"
            },
            {
                source: "",
                "flags": "-d -s=renderSettings",
                explanation: "Uses an object exported as 'renderSettings' from your main file to set the campaign variables. Any unset variables will use their default values"
            },
            {
                source: "",
                flags: '-d -s="A=4, B=5"',
                explanation: 'Sets the campaign variables using a set of comma-separated key-value pairs. Notice the ""s are mandatory'
            },
            {
                source: "",
                flags: "-d -c=MyComponent",
                explanation: "Uses default campaign variable values and only renders the MyComponent component. It is not possible to provide arguments to the component. If this is necessary it is recommended to wrap it in a new one with no parameters."
            },
            {
                source: "",
                flags: "-o",
                explanation: "Watches the files for any changes and live-reloads the rendered output in your browser"
            }
        ]; };
        _this.run = function (cb) {
            var onBuild = function (err, res) {
                // If we open in browser we need to save the output to a temp file
                if (_this._openInBrowser) {
                    // Set an exit handler to remove the temp file once we're finished
                    _this.setExitHandler(function (code, cb) {
                        // Clear temp folder
                        rimraf.sync(_this._tempPath);
                        cb();
                    });
                    // Start live server
                    liveServer.start({
                        root: path.resolve(process.cwd(), _this._tempPath),
                        file: _this._tempFileName
                    });
                    // Watch for file changes
                    node_watch_1.default(_this.getProjPath(), { recursive: true }, function (eventType, fileName) {
                        // Clear console
                        process.stdout.write('\x1Bc');
                        runtime_1.Runtime.clearStaticData();
                        _this.buildAndRender(function (err, res) { });
                    });
                }
            };
            _this.buildAndRender(onBuild);
        };
        _this.buildAndRender = function (cb) {
            _this.runCode({
                onRunFinished: function (runtime, output) {
                    var codeOutput;
                    if (_this._componentName === null) {
                        codeOutput = output.output;
                    }
                    else {
                        var component = output.exports[_this._componentName];
                        if (component !== undefined) {
                            codeOutput = component.evaluate(runtime, {}) + '';
                        }
                    }
                    if (codeOutput !== undefined) {
                        var varSettings = _this.getCampaignVarSettings(runtime, output);
                        if (varSettings) {
                            if (_this.validateSettings(varSettings, output)) {
                                varSettings["now"] = utils_1.generateNowSetting();
                                // Render output
                                var rendered = renderer_1.renderOutput(codeOutput, output, runtime, varSettings);
                                // Display to console
                                if (_this._displayOutput) {
                                    console.log(cli_highlight_1.default(pretty(rendered), { language: "html" }));
                                }
                                // If we open in browser we need to save the output to a temp file
                                if (_this._openInBrowser) {
                                    // Ensure we have a temp folder
                                    if (!fs.existsSync(_this._tempPath)) {
                                        fs.mkdirSync(_this._tempPath);
                                    }
                                    // Save file to temp folder
                                    // We must first process it to ensure it has <html> and <body> tags
                                    fs.writeFileSync(_this._tempPath + "/" + _this._tempFileName, _this.processOutputForLiveReload(rendered), { encoding: 'utf8' });
                                }
                                cb(null, null);
                            }
                            else {
                                cb(true, null);
                            }
                        }
                        else {
                            cb(true, null);
                        }
                    }
                    else {
                        _this.program.displayError("Cannot find component '" + _this._componentName + "'");
                        cb(true, null);
                    }
                }
            });
        };
        _this.processOutputForLiveReload = function (rendered) {
            // Naive approach but will handle most use cases
            if (rendered.substr(0, 5).toLowerCase() !== '<html' &&
                rendered.substr(0, 9).toLowerCase() !== '<!doctype') {
                return "<html><body>" + rendered + "</body></html>";
            }
            else {
                return rendered;
            }
        };
        _this.getCampaignVarSettings = function (runtime, output) {
            // Get default values of campaign variables
            var defaultSettings = {};
            Object.keys(output.yieldedVars).forEach(function (key) {
                defaultSettings[key] = output.yieldedVars[key].default;
            });
            if (_this._settingsObject) {
                // Check if we have anything to parse
                if (_this._settingsObject.indexOf(':') >= 0) {
                    var settings_1 = {};
                    var error_1 = false;
                    _this._settingsObject
                        .split(',')
                        .map(function (i) { return i.trim(); })
                        .forEach(function (keyValue) {
                        var _a, _b;
                        var key, value;
                        if (keyValue.indexOf(':') >= 0) {
                            _a = keyValue.split(':').map(function (i) { return i.trim(); }), key = _a[0], value = _a[1];
                        }
                        else if (keyValue.indexOf('=') >= 0) {
                            _b = keyValue.split('=').map(function (i) { return i.trim(); }), key = _b[0], value = _b[1];
                        }
                        else {
                            error_1 = true;
                            _this.program.displayError("Invalid key-value pair '" + keyValue + "'. Format must be 'A: 5' or 'A=5'");
                        }
                        if (!error_1) {
                            settings_1[key] = _this.parseValue(value);
                        }
                    });
                    if (error_1) {
                        return null;
                    }
                    return __assign({}, defaultSettings, settings_1);
                }
                // Nothing to parse. Must be an exported object
                else {
                    var obj = output.exports[_this._settingsObject];
                    if (!obj) {
                        _this.program.displayError("Cannot find object '" + _this._settingsObject + "'");
                        return null;
                    }
                    return __assign({}, defaultSettings, obj);
                }
            }
            else {
                // Nothing set. Use default settings
                return defaultSettings;
            }
            return null;
        };
        _this.validateSettings = function (settings, output) {
            var ok = true;
            Object.keys(settings).forEach(function (key) {
                if (output.yieldedVars[key] === undefined) {
                    ok = false;
                    _this.program.displayError("Cannot find yielded variable '" + key + "'");
                }
            });
            return ok;
        };
        _this.parseValue = function (value) {
            if (value == "true")
                return true;
            if (value == "false")
                return false;
            if (value == "null")
                return null;
            if (value == "undefined")
                return undefined;
            var parsed = parseInt(value);
            if (!isNaN(parsed))
                return parsed;
            parsed = parseFloat(value);
            if (!isNaN(parsed))
                return parsed;
            if (value.startsWith("'") && value.endsWith("'"))
                return value.substr(1, value.length - 2);
            return value;
        };
        var _a = argvParser.parse(argv, { rules: {
                display: {
                    short: "d",
                    type: Boolean,
                    value: false,
                },
                settings: {
                    short: "s",
                    type: String,
                    value: null
                },
                component: {
                    short: "c",
                    type: String,
                    value: null
                },
                open: {
                    short: "o",
                    type: Boolean,
                    value: null
                }
            } }).parsed, display = _a.display, settings = _a.settings, component = _a.component, open = _a.open;
        _this._displayOutput = display;
        _this._settingsObject = settings;
        _this._componentName = component;
        _this._openInBrowser = open;
        return _this;
    }
    return RenderTool;
}(coretool_1.CoreTool));
exports.RenderTool = RenderTool;
//# sourceMappingURL=rendertool.js.map