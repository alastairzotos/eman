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
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var coretool_1 = require("./coretool");
var runtime_1 = require("../lang/runtime");
var utils_1 = require("../lang/utils");
var argvParser = require("argv-parser");
var chalk_1 = require("chalk");
var node_watch_1 = require("node-watch");
var Builder = /** @class */ (function (_super) {
    __extends(Builder, _super);
    function Builder(program, config, argv) {
        var _this = _super.call(this, program, config, argv) || this;
        _this.getDescription = function () { return "Builds the code and optionally displays and/or saves output"; };
        _this.getFlagDocs = function () { return [
            // Display
            {
                name: "display",
                short: "d",
                type: "boolean",
                desc: "Displays output HTML to the console"
            },
            // Display full
            {
                name: "displayfull",
                short: "df",
                type: "boolean",
                desc: "Displays output HTML, campaign variables, sections and intermediates to the console"
            },
            // Save
            {
                name: "save",
                short: "s",
                type: "boolean",
                desc: "Saves the html to <proj_path>/build/<proj_name>.html"
            },
            // Watch
            {
                name: "watch",
                short: "w",
                type: "boolean",
                desc: "Will watch the project directory for any changes and rebuild the project, using the provided flags each time"
            }
        ]; };
        _this.getExamples = function () { return [
            {
                flags: "-df",
                source: "src/myproj",
                explanation: "Displays HTML, campaign variables, sections and intermediates to screen"
            },
            {
                flags: "-d -s",
                source: "",
                explanation: "Finds 'config.json' locally. Displays output and saves to /build/myproj.html"
            },
            {
                flags: "-d -w",
                source: "",
                explanation: "Will watch the project directory for any changes and rebuild each time, displaying the output HTML with every rebuild"
            }
        ]; };
        _this.run = function (cb) {
            var outputFile = _this.getBuildPath() + _this.getProjName() + '.html';
            _this.build(outputFile, cb);
            if (_this._watch) {
                node_watch_1.default(_this.getProjPath(), { recursive: true }, function (eventType, fileName) {
                    // Clear console
                    process.stdout.write('\x1Bc');
                    // Rebuild
                    runtime_1.Runtime.clearStaticData();
                    _this.build(outputFile, cb);
                });
            }
        };
        _this.build = function (outputFile, cb) {
            _this.runCode({
                onRunFinished: function (runtime, output) {
                    if (_this._display || _this._displayFull) {
                        if (_this._display && _this._displayFull) {
                            _this.program.displayError("Expected '" + chalk_1.default.yellow('-d') + "' or '" + chalk_1.default.yellow('-df') + "' but not both");
                        }
                        else {
                            if (output) {
                                utils_1.displayOutput(output, _this._displayFull);
                            }
                            else {
                                cb("Cannot display due to compiler error", null);
                            }
                        }
                    }
                    if (_this._save) {
                        if (output) {
                            fs.writeFileSync(outputFile, output.output, 'utf8');
                        }
                        else {
                            cb("Cannot save due to compiler error", null);
                        }
                    }
                    cb(null, null);
                }
            });
        };
        var _a = argvParser.parse(argv, {
            rules: {
                display: {
                    short: "d",
                    type: Boolean,
                    value: false
                },
                displayfull: {
                    short: "df",
                    type: Boolean,
                    value: false
                },
                save: {
                    short: "s",
                    type: Boolean,
                    value: false
                },
                watch: {
                    short: "w",
                    type: Boolean,
                    value: false
                }
            }
        }).parsed, display = _a.display, displayfull = _a.displayfull, save = _a.save, watch = _a.watch;
        _this._display = display;
        _this._displayFull = displayfull;
        _this._save = save;
        _this._watch = watch;
        return _this;
    }
    return Builder;
}(coretool_1.CoreTool));
exports.Builder = Builder;
//# sourceMappingURL=builder.js.map