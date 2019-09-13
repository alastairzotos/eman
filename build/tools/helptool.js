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
var chalk_1 = require("chalk");
var coretool_1 = require("./coretool");
var Table = require('cli-table3');
var HELP_DESC = "An ECMAScript-like language and tool-set for developing Alterian Email Manager emails.";
var HelpTool = /** @class */ (function (_super) {
    __extends(HelpTool, _super);
    function HelpTool(program, config, argv) {
        var _this = _super.call(this, program, config, argv) || this;
        _this.getDescription = function () { return "You're viewing it right now"; };
        _this.run = function (cb) {
            if (_this.argv.length == 1) {
                _this.displayAllCommands();
            }
            else {
                var command = _this.argv[1];
                var commands = _this.program.getCommands();
                if (commands[command]) {
                    var tool = new commands[command].tool(_this.program, _this.config, _this.argv);
                    tool.displayToolDocs(command);
                }
                else {
                    _this.displayAllCommands(command);
                }
            }
            cb(null, null);
        };
        _this.displayAllCommands = function (withError) {
            var commands = _this.program.getCommands();
            if (withError) {
                _this.program.displayError("Cannot find command '" + chalk_1.default.magenta(withError) + "'\n");
            }
            else {
                console.group(chalk_1.default.bgBlue(" " + chalk_1.default.yellow(chalk_1.default.bold(coretool_1.CLI_CMD.toUpperCase())) + " "));
                console.log('');
                console.log(chalk_1.default.white(HELP_DESC), '\n');
                console.log(chalk_1.default.white("For full documentation please visit " + chalk_1.default.blue('https://alastairzotos.github.io/eman-docs/')), '\n');
                console.groupEnd();
            }
            console.group(chalk_1.default.magenta(chalk_1.default.bold('Usage:')));
            console.log('');
            console.log(chalk_1.default.green(coretool_1.CLI_CMD) + " " + chalk_1.default.green(chalk_1.default.bold('<command>')) + " " + chalk_1.default.white("[" + chalk_1.default.gray('path/to/project') + "]?") + " " + chalk_1.default.white("[" + chalk_1.default.yellow('-flags') + "]*"));
            console.groupEnd();
            console.log('');
            // Commands
            console.group(chalk_1.default.magenta(chalk_1.default.bold("Commands:")));
            console.log('');
            console.log(chalk_1.default.gray("Type " + chalk_1.default.green('eman help ' + chalk_1.default.bold('<command>')) + " to view documentation and examples for each command"));
            console.log('');
            var table = new Table({ head: [] });
            Object.keys(commands).forEach(function (command) {
                var tool = new commands[command].tool(_this.program, _this.config, _this.argv);
                if (command !== "help") {
                    var desc = _this.wrapLine(tool.getDescription(), 80);
                    table.push([
                        { content: chalk_1.default.green(coretool_1.CLI_CMD + ' ' + chalk_1.default.bold(command)), vAlign: 'center' },
                        chalk_1.default.cyan(desc)
                    ]);
                }
            });
            console.log(table.toString());
            console.groupEnd();
            console.log('');
        };
        return _this;
    }
    return HelpTool;
}(coretool_1.CoreTool));
exports.HelpTool = HelpTool;
//# sourceMappingURL=helptool.js.map