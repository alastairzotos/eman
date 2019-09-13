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
var argvParser = require("argv-parser");
var readline = require("readline");
var chalk_1 = require("chalk");
var log = require("single-line-log");
var coretool_1 = require("./coretool");
var unittester_1 = require("./unittester");
var api_1 = require("../em-api/api");
var Publisher = /** @class */ (function (_super) {
    __extends(Publisher, _super);
    function Publisher(program, config, argv) {
        var _this = _super.call(this, program, config, argv) || this;
        _this._noTest = false;
        _this.getDescription = function () { return "Publishes the compiled output of your code to your Email Manager account after tests have passed (if they are defined)"; };
        _this.getFlagDocs = function () { return [
            // notest
            {
                name: "notest",
                short: "nt",
                type: "boolean",
                desc: "Forces publishing without running any tests"
            }
        ]; };
        _this.getExamples = function () { return [
            {
                flags: '',
                source: 'src/myproj',
                explanation: 'Publishes output results to Email Manager if all tests passed (or if no tests are defined)'
            },
            {
                flags: '-nt',
                source: '',
                explanation: 'Ignores tests and publishes anyway'
            }
        ]; };
        _this.run = function (cb) {
            var afterTests = function (testerOutput) {
                // If there are errors
                if (testerOutput.result === unittester_1.TestResult.Failed) {
                    _this.program.displayError("Cannot publish. All tests must pass");
                }
                else {
                    if (testerOutput.result === unittester_1.TestResult.Todo) {
                        var rl_1 = readline.createInterface(process.stdin, process.stdout);
                        rl_1.question(chalk_1.default.yellow('\u26a0') + chalk_1.default.cyan(" There are some unfinished todos.") + " Are you sure you want to publish? " + chalk_1.default.white("(y/n) "), function (answer) {
                            if (answer.trim().toLowerCase() == "y") {
                                console.log("");
                                _this.performPublish(testerOutput.output, cb);
                            }
                            rl_1.close();
                        });
                    }
                    else {
                        _this.performPublish(testerOutput.output, cb);
                    }
                }
            };
            // Run tests unless specified otherwise
            if (!_this._noTest) {
                var unittester = new unittester_1.UnitTester(_this.program, _this.config, _this.argv);
                unittester.run(function (err, testResult) {
                    if (err) {
                        cb(err, null);
                    }
                    else {
                        afterTests(testResult);
                    }
                });
            }
            else {
                _this.runCode({
                    onRunFinished: function (runtime, output) {
                        afterTests({ output: output, result: unittester_1.TestResult.Passed });
                    }
                });
            }
        };
        _this.performPublish = function (output, cb) {
            console.log(chalk_1.default.bgBlue(chalk_1.default.yellow(" Publishing...")));
            console.log("");
            api_1.uploadOutput(_this.config.campaignId, _this.config.token, output, function (errors, responses) {
                if (errors) {
                    log.stdout(chalk_1.default.red("\u2716 There were errors:"), errors, '\n');
                    cb(errors, null);
                }
                else {
                    log.stdout(chalk_1.default.green(chalk_1.default.bold("\u2714 Done\n")));
                    cb(null, null);
                }
            });
        };
        var notest = argvParser.parse(argv, { rules: {
                notest: {
                    short: "nt",
                    type: Boolean,
                    default: false
                }
            } }).parsed.notest;
        _this._noTest = notest || false;
        return _this;
    }
    return Publisher;
}(coretool_1.CoreTool));
exports.Publisher = Publisher;
//# sourceMappingURL=publisher.js.map