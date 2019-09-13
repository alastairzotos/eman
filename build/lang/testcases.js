"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = require("chalk");
var parsenodes_1 = require("./parsenodes");
var runtime_1 = require("./runtime");
var errors_1 = require("./errors");
var renderer_1 = require("./renderer");
var parser_1 = require("./parser");
var utils_1 = require("./utils");
var TestResult;
(function (TestResult) {
    TestResult["Passed"] = "passed";
    TestResult["Failed"] = "failed";
    TestResult["Todo"] = "todo";
})(TestResult = exports.TestResult || (exports.TestResult = {}));
var UnitTester = /** @class */ (function () {
    function UnitTester() {
        var _this = this;
        this._quietMode = false;
        this.runTests = function (file, quiet) {
            _this._quietMode = quiet || false;
            var runtime = new runtime_1.Runtime();
            runtime.getScope()['runtime'].testing = true;
            runtime.warningsSuppressed = true;
            //Runtime.clearStaticData();
            var output = runtime.run(file);
            var testCases = output.testCases;
            try {
                _this.logStart();
                _this.verifyTestCases(testCases);
                var result_1 = TestResult.Passed;
                testCases.forEach(function (desc) {
                    var descResult = _this.startDescriptor(runtime, output, desc);
                    result_1 = _this.getNextResult(result_1, descResult);
                });
                console.log("");
                if (result_1 === TestResult.Passed) {
                    console.log(chalk_1.default.green("\u2714 " + chalk_1.default.bold('All tests passed')));
                }
                else if (result_1 === TestResult.Todo) {
                    console.log(chalk_1.default.yellow("\u26A0 " + chalk_1.default.bold('All tests passed but there were some unfinished todos')));
                }
                else {
                    console.log(chalk_1.default.red("\u2716 " + chalk_1.default.bold('One or more tests failed')));
                }
                console.log("");
                return result_1;
            }
            catch (e) {
                errors_1.displayError(e);
            }
            return TestResult.Failed;
        };
        this.verifyTestCases = function (testCases) {
            testCases.forEach(function (desc) {
                if (desc.stmtType !== parsenodes_1.StmtType.Describe) {
                    throw new errors_1.CompilerError("All statements inside 'tests' function should be test descriptors", desc.startPosition, desc.endPosition);
                }
            });
        };
        this.getResultMagnitude = function (result) {
            switch (result) {
                case TestResult.Passed: return 3;
                case TestResult.Todo: return 2;
                case TestResult.Failed: return 1;
            }
        };
        this.getNextResult = function (current, result) {
            if (_this.getResultMagnitude(result) < _this.getResultMagnitude(current)) {
                return result;
            }
            else {
                return current;
            }
        };
        this._quietLogs = [];
        this.startDescriptor = function (runtime, output, descNode) {
            _this._quietLogs = [];
            _this.logDescriptor(descNode.description);
            var result = TestResult.Passed;
            descNode.testRuns.forEach(function (run) {
                var runResult = TestResult.Passed;
                if (run.runNodeType == parsenodes_1.RunNodeType.Test) {
                    runResult = _this.runTest(runtime, output, run) ? TestResult.Passed : TestResult.Failed;
                }
                else {
                    _this.runTodo(runtime, output, run);
                    runResult = TestResult.Todo;
                }
                result = _this.getNextResult(result, runResult);
            });
            if (_this._quietMode) {
                _this.logQuietModeOutputs();
            }
            return result;
        };
        this.runTodo = function (runtime, output, run) {
            _this.logTodo(run);
        };
        this.runTest = function (runtime, output, run) {
            try {
                var evaluatedSettings = UnitTester.evaluateSettings(runtime, output, run);
                var settings_1 = evaluatedSettings;
                var htmlOutput = renderer_1.renderOutput(output.output, output, runtime, settings_1);
                var parser = new parser_1.Parser();
                var parsedDoc_1 = parser.parseHTMLDoc(run.startPosition.file, '<>' + htmlOutput + '</>');
                // Add indexed elements as global const variables
                runtime.pushScope();
                Object.keys(parsedDoc_1.index).forEach(function (id) {
                    var elem = parsedDoc_1.index[id].evaluate(runtime, settings_1);
                    runtime.getScope()[id] = elem;
                    runtime.setConst(id);
                });
                // Evaluate assertion and check if it can be coerced to 'true'
                var evaluatedAssertion = run.assertion.evaluate(runtime, settings_1);
                runtime.popScope();
                if (evaluatedAssertion) {
                    _this.logTestResult(run, true);
                    return true;
                }
                else {
                    _this.logTestResult(run, false);
                    return false;
                }
            }
            catch (e) {
                _this.logTestResult(run, false);
                errors_1.displayError(e);
                return false;
            }
        };
        this.logStart = function () {
            console.log("");
            console.log(chalk_1.default.bgBlue(chalk_1.default.yellow(" Running tests:")));
        };
        this.logDescriptor = function (name) {
            var output = chalk_1.default.magenta("Test set: ") + chalk_1.default.yellow(name);
            if (_this._quietMode) {
                _this._quietLogs.push({ desc: output, runs: [], allPassed: true });
            }
            else {
                console.log("");
                console.log(output);
            }
        };
        this.logTodo = function (runNode) {
            var output = '    ' + chalk_1.default.yellow("\u26A0 " + chalk_1.default.bold('Todo') + ":   ") + chalk_1.default.cyan(runNode.description);
            if (_this._quietMode) {
                var lastLog = _this._quietLogs[_this._quietLogs.length - 1];
                lastLog.allPassed = false;
                lastLog.runs.push({
                    output: output,
                    passed: false
                });
            }
            else {
                console.log(output);
            }
        };
        this.logTestResult = function (runNode, passed) {
            var output = "";
            if (passed) {
                output = '    ' + chalk_1.default.green("\u2714 " + chalk_1.default.bold('Passed') + ": ") + chalk_1.default.cyan(runNode.description);
            }
            else {
                if (runNode.startPosition) {
                    output = '    ' + chalk_1.default.red("\u2716 " + chalk_1.default.bold('Failed') + ": ") + chalk_1.default.cyan(runNode.description) + ' ' + chalk_1.default.gray("(in " + chalk_1.default.yellow(errors_1.extractFilename(runNode.startPosition.file)) + ", line " + chalk_1.default.yellow(runNode.startPosition.line + '') + ", column " + chalk_1.default.yellow(runNode.startPosition.column + '') + ")");
                }
                else {
                    output = '    ' + chalk_1.default.red("\u2716 " + chalk_1.default.bold('Failed') + ": ") + chalk_1.default.cyan(runNode.description);
                }
            }
            if (_this._quietMode) {
                var lastLog = _this._quietLogs[_this._quietLogs.length - 1];
                if (!passed) {
                    lastLog.allPassed = false;
                }
                lastLog.runs.push({
                    output: output,
                    passed: passed
                });
            }
            else {
                console.log(output);
            }
        };
        this.logQuietModeOutputs = function () {
            _this._quietLogs.forEach(function (log) {
                if (!log.allPassed) {
                    console.log("");
                    console.log(log.desc);
                    log.runs.forEach(function (run) {
                        if (!run.passed) {
                            console.log(run.output);
                        }
                    });
                }
            });
        };
    }
    UnitTester.evaluateSettings = function (runtime, output, run) {
        // Collect settings
        var settings = {};
        Object.keys(output.yieldedVars).forEach(function (varName) {
            if (varName[0] !== '_') {
                settings[varName] = output.yieldedVars[varName].default + '';
            }
        });
        Object.keys(run.settings).forEach(function (varName) {
            if (runtime.yieldedVars[varName] === undefined) {
                throw new errors_1.CompilerError("Cannot find yielded variable '" + varName + "'", run.startPosition, run.endPosition);
            }
            settings[varName] = run.settings[varName].evaluate(runtime, {});
        });
        // Add a 'now' setting
        settings["now"] = utils_1.generateNowSetting();
        return settings;
    };
    return UnitTester;
}());
exports.UnitTester = UnitTester;
//# sourceMappingURL=testcases.js.map