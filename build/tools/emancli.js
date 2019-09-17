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
var readline = require("readline");
var coretool_1 = require("./coretool");
var watcher_1 = require("./watcher");
var EmanCLI = /** @class */ (function () {
    function EmanCLI() {
        var _this = this;
        this._validCommands = {};
        this.isWatchingForTypes = false;
        this.displayError = function (msg) {
            console.log(chalk_1.default.red("Error: ") + msg);
        };
        this.registerTool = function (id, tool, options) {
            options = __assign({ requiresConfig: true }, options);
            _this._validCommands[id] = { tool: tool, options: options };
        };
        this.getCommands = function () {
            return _this._validCommands;
        };
        this.start = function (cb) {
            var onComplete = function (err, result) {
                if (cb)
                    cb(err, result);
            };
            if (_this._argv.length == 0) {
                _this.displayError("Usage is " + chalk_1.default.green(coretool_1.CLI_CMD + chalk_1.default.yellow(' <command>')) + ". For more help, try " + chalk_1.default.green(coretool_1.CLI_CMD + chalk_1.default.yellow(' help')));
            }
            else {
                var command = _this._argv[0];
                if (_this._validCommands[command]) {
                    var tool_1 = _this._validCommands[command].tool;
                    var options = _this._validCommands[command].options;
                    if (options.requiresConfig) {
                        _this.resolveConfigFile(function (config) {
                            new tool_1(_this, config, _this._argv).run(function (err, result) {
                                /*if (err) {
                                    cb(err, null);
                                } else {
                                    this.checkForFileWatch(config, (err, result) => {
                                        onComplete(err, result);
                                    })
                                }*/
                                onComplete(err, result);
                            });
                        });
                    }
                    else {
                        new tool_1(_this, null, _this._argv).run(onComplete);
                    }
                }
                else {
                    _this.displayError("Unexpected command " + chalk_1.default.magenta(command) + ". For more help, try " + chalk_1.default.green(coretool_1.CLI_CMD + chalk_1.default.yellow(' help')));
                }
            }
        };
        this.checkForFileWatch = function (config, cb) {
            if (!_this.isWatchingForTypes) {
                var rl_1 = readline.createInterface(process.stdin, process.stdout);
                rl_1.question(chalk_1.default.yellow("Would you like to watch files for changes to keep track of types? ") + chalk_1.default.white("(y/n) "), function (answer) {
                    if (answer.trim().toLowerCase() == "y") {
                        console.log("");
                        var watcher = new watcher_1.WatcherTool(_this, config, _this._argv);
                        watcher.run(cb);
                    }
                    rl_1.close();
                });
            }
            else {
                cb(null, null);
            }
        };
        this.resolveConfigFile = function (success) {
            var configFile = 'config.json';
            if (_this._argv.length > 1) {
                if (_this._argv[1][0] !== '-') {
                    configFile = _this._argv[1];
                }
                // We're assuming we're in the directory with the config file. Insert a dummy '.' as the argv for it
                else {
                    _this._argv.splice(1, 0, '.');
                }
            }
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
                    // Create build folder
                    var buildFolder = configFile.split('/').slice(0, -1).join('/') + '/build';
                    if (!fs.existsSync(buildFolder)) {
                        fs.mkdirSync(buildFolder);
                    }
                    fs.readFile(configFile, 'utf8', function (err, data) {
                        if (err) {
                            _this.displayError(err.message);
                        }
                        else {
                            var validated = _this.validateConfig(configFile, _this.fixConfig(configFile, JSON.parse(data)));
                            if (validated) {
                                success(validated);
                                //} else {
                                //this.displayError('Invalid config file');
                            }
                        }
                    });
                }
                else {
                    if (_this._argv.length > 1) {
                        _this.displayError("Cannot find config file " + chalk_1.default.magenta(configFile));
                    }
                    else {
                        _this.displayError("Cannot find config file. Use " + (chalk_1.default.green(coretool_1.CLI_CMD + " " + chalk_1.default.bold(_this._argv[0]) + " ") + chalk_1.default.yellow('<path-to-config.json>')));
                    }
                }
            });
        };
        this.fixConfig = function (configFile, config) {
            return __assign({}, config, { file: path.resolve(process.cwd(), configFile.split('/').slice(0, -1).join('/') + '/' + config.file) });
        };
        this.validateConfig = function (configFile, config) {
            if (config.file === undefined) {
                _this.displayError("Invalid config file. Expected 'file' property");
                return null;
            }
            if (config.campaignId === undefined) {
                _this.displayError("Invalid config file. Expected 'campaignId' property");
                return null;
            }
            if (config.token === undefined) {
                _this.displayError("Invalid config file. Expected 'token' property");
                return null;
            }
            return config;
        };
        this._argv = process.argv.slice(2);
    }
    return EmanCLI;
}());
exports.EmanCLI = EmanCLI;
//# sourceMappingURL=emancli.js.map