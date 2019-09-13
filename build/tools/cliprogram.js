"use strict";
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
var chalk_1 = require("chalk");
var builder_1 = require("./builder");
var unittester_1 = require("./unittester");
var pdfGenerator_1 = require("./pdfGenerator");
var publisher_1 = require("./publisher");
var helptool_1 = require("./helptool");
var EmanCLI = /** @class */ (function () {
    function EmanCLI() {
        var _this = this;
        this._validCommands = {};
        this.displayError = function (msg) {
            console.log(chalk_1.default.red("Error: ") + msg);
        };
        this.registerTool = function (id, tool, requiresConfig) {
            if (requiresConfig === void 0) { requiresConfig = true; }
            if (id.substr !== undefined) {
                _this._validCommands[id] = { tool: tool, requiresConfig: requiresConfig };
            }
            else {
                id.forEach(function (name) {
                    _this._validCommands[name] = { tool: tool, requiresConfig: requiresConfig };
                });
            }
        };
        this.getCommands = function () {
            return _this._validCommands;
        };
        this.start = function (cb) {
            if (_this._argv.length == 0) {
                _this.displayError("Usage is " + chalk_1.default.gray('eman <command>') + ". For more help, try " + chalk_1.default.gray('eman help'));
            }
            else {
                var command = _this._argv[0];
                if (_this._validCommands[command]) {
                    var tool_1 = _this._validCommands[command].tool;
                    if (_this._validCommands[command].requiresConfig) {
                        _this.resolveConfigFile(function (config) {
                            new tool_1(_this, config, _this._argv).run(cb);
                        });
                    }
                    else {
                        new tool_1(_this, null, _this._argv).run(cb);
                    }
                }
                else {
                    _this.displayError("Unexpected command " + chalk_1.default.magenta(command) + ". Valid commands: " + chalk_1.default.yellow(Object.keys(_this._validCommands).join(chalk_1.default.gray(', '))));
                }
            }
        };
        this.resolveConfigFile = function (success) {
            var configFile = _this._argv.length > 1 ? _this._argv[1] : 'config.json';
            if (!configFile.endsWith('config.json')) {
                if (configFile.endsWith('/')) {
                    configFile += 'config.json';
                }
                else {
                    configFile += '/config.json';
                }
            }
            configFile = path.resolve(process.cwd(), configFile);
            fs.exists(configFile, function (exists) {
                if (exists) {
                    fs.readFile(configFile, 'utf8', function (err, data) {
                        if (err) {
                            _this.displayError(err.message);
                        }
                        else {
                            var validated = _this.validateConfig(configFile, _this.fixConfig(configFile, JSON.parse(data)));
                            if (validated) {
                                success(validated);
                            }
                            else {
                                _this.displayError("Invalid config file");
                            }
                        }
                    });
                }
                else {
                    _this.displayError("Cannot find config file");
                }
            });
        };
        this.fixConfig = function (configFile, config) {
            return __assign({}, config, { file: path.resolve(process.cwd(), configFile.split('/').slice(0, -1).join('/') + '/' + config.file) });
        };
        this.validateConfig = function (configFile, config) {
            // TODO
            return config;
        };
        console.clear();
        this._argv = process.argv.slice(2);
        // Register built-in tools
        this.registerTool("build", builder_1.Builder);
        this.registerTool("test", unittester_1.UnitTester);
        this.registerTool("pdf", pdfGenerator_1.PDFGenerator);
        this.registerTool("publish", publisher_1.Publisher);
        this.registerTool("help", helptool_1.HelpTool, false);
        this.start(function (err, result) {
            // Complete
        });
    }
    return EmanCLI;
}());
exports.EmanCLI = EmanCLI;
//# sourceMappingURL=cliprogram.js.map