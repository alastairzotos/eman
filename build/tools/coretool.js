"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = require("chalk");
var runtime_1 = require("../lang/runtime");
var Table = require('cli-table3');
exports.CLI_CMD = 'eman';
var CoreTool = /** @class */ (function () {
    function CoreTool(program, config, argv) {
        var _this = this;
        this.program = program;
        this.config = config;
        this.argv = argv;
        this.run = function (cb) { };
        this.runCode = function (options) {
            var runtime = new runtime_1.Runtime();
            if (options.onRuntimeCreated) {
                options.onRuntimeCreated(runtime);
            }
            var output = runtime.run(_this.config.file);
            return options.onRunFinished(runtime, output);
        };
        this.setExitHandler = function (handler) {
            _this._exitHandler = handler;
        };
        this.displayToolDocs = function (commandName) {
            console.group(chalk_1.default.yellow(chalk_1.default.bold(commandName)));
            console.log('');
            console.log(chalk_1.default.greenBright(_this.getDescription()));
            console.groupEnd();
            _this.displayFlagDocs();
            _this.displayExamples(commandName);
            console.log('');
        };
        this.displayFlagDocs = function () {
            var flagDocs = _this.getFlagDocs();
            if (flagDocs) {
                var table = new Table({
                    head: ["Flag", "Short", "Type", "Description"]
                });
                flagDocs.forEach(function (flag) {
                    table.push([
                        { content: chalk_1.default.white('-' + flag.name), vAlign: "center" },
                        { content: chalk_1.default.white('-' + flag.short), vAlign: "center" },
                        { content: chalk_1.default.green(flag.type), vAlign: "center" },
                        chalk_1.default.cyan(_this.wrapLine(flag.desc, 60))
                    ]);
                });
                console.log('');
                console.group(chalk_1.default.magenta(chalk_1.default.bold("Flags: ")));
                console.log(table.toString());
                console.groupEnd();
            }
        };
        this.displayExamples = function (commandName) {
            var examples = _this.getExamples();
            if (examples) {
                console.log('');
                console.group(chalk_1.default.magenta(chalk_1.default.bold("Examples:")));
                var table_1 = new Table({
                    head: []
                });
                examples.forEach(function (example) {
                    var exampleCommand = chalk_1.default.green(chalk_1.default.italic(exports.CLI_CMD + " " + chalk_1.default.bold(commandName) + (example.source ? " " + chalk_1.default.gray(example.source) : '') + " " + chalk_1.default.yellow(example.flags)));
                    table_1.push([
                        { content: exampleCommand, vAlign: 'center' },
                        chalk_1.default.blue(_this.wrapLine(example.explanation, 80))
                    ]);
                });
                console.log(table_1.toString());
                console.groupEnd();
            }
        };
        this.wrapLine = function (text, maxLength) {
            if (text.length > maxLength) {
                var parts = text.split(' ');
                var newText = "";
                var curLength = 0;
                for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
                    var part = parts_1[_i];
                    var section = part + ' ';
                    curLength += section.length;
                    newText += section;
                    if (curLength > maxLength) {
                        newText += '\n';
                        curLength = 0;
                    }
                }
                return newText.substr(0, newText.length - 1);
            }
            else {
                return text;
            }
        };
        this.getDescription = function () { return "A description"; };
        this.getFlagDocs = function () { return null; };
        this.getExamples = function () { return null; };
        this.getProjName = function () {
            return _this.config.file.split('/').slice(0, -1).pop();
        };
        this.getProjPath = function () {
            return _this.config.file.split('/').slice(0, -1).join('/') + '/';
        };
        this.getBuildPath = function () {
            return _this.getProjPath() + "build/";
        };
        process.on('SIGINT', function (signal) {
            process.exit();
        });
        process.on('exit', function (code) {
            if (_this._exitHandler) {
                _this._exitHandler(code, function () {
                    process.exit();
                });
            }
            else {
                process.exit();
            }
        });
    }
    return CoreTool;
}());
exports.CoreTool = CoreTool;
//# sourceMappingURL=coretool.js.map