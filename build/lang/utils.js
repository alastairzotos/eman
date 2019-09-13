"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = require("chalk");
var cli_highlight_1 = require("cli-highlight");
exports.conditionToString = function (cond) {
    var combine = "\n\t";
    if (cond.type == "&&")
        combine = ' and \n    ';
    else if (cond.type == "||")
        combine = " or \n    ";
    var right = cond.right;
    if (right === '')
        right = "''";
    return chalk_1.default.green(cond.left) + " " + chalk_1.default.magenta(cond.operation) + " " + chalk_1.default.green(right) + combine;
};
exports.conditionsToString = function (conds) {
    return conds.map(function (cond) { return exports.conditionToString(cond); }).join('');
};
exports.displayFormattedOutput = function (compiled, fullOutput) {
    if (compiled) {
        console.log(chalk_1.default.yellow(chalk_1.default.bgBlue(" HTML Output:")));
        console.log("");
        console.log(cli_highlight_1.default(compiled.output, { language: "html" }));
        if (fullOutput) {
            console.log("");
            console.log(chalk_1.default.yellow(chalk_1.default.bgBlue(" Variables:")));
            console.log("");
            var publicVars = Object.keys(compiled.yieldedVars).filter(function (varName) { return compiled.yieldedVars[varName].scope == 'public'; });
            var privateVars = Object.keys(compiled.yieldedVars).filter(function (varName) { return compiled.yieldedVars[varName].scope == 'private'; });
            publicVars.forEach(function (varName) {
                var defVar = compiled.yieldedVars[varName];
                console.log(chalk_1.default.magenta(defVar.scope) + ' ' + chalk_1.default.yellow(varName) + (defVar.default ? (chalk_1.default.gray(' = ') + chalk_1.default.blue(defVar.default)) : ''));
            });
            console.log("");
            privateVars.forEach(function (varName) {
                var defVar = compiled.yieldedVars[varName];
                console.log(chalk_1.default.magenta(defVar.scope) + ' ' + chalk_1.default.yellow(varName) + (defVar.default ? (chalk_1.default.gray(' = ') + chalk_1.default.blue(defVar.default)) : ''));
            });
            console.log("");
            console.log(chalk_1.default.yellow(chalk_1.default.bgBlue(" Sections:")));
            Object.keys(compiled.sections).forEach(function (secName) {
                console.log("");
                console.log(chalk_1.default.yellow(chalk_1.default.underline(secName)) + ':');
                var varConfig = compiled.sections[secName];
                console.log(chalk_1.default.gray("Default: ") + cli_highlight_1.default(varConfig.default));
                console.log("");
                varConfig.rules.forEach(function (rule) {
                    console.log(chalk_1.default.red('if') + " " + chalk_1.default.magenta('(') + "\n    " + exports.conditionsToString(rule.conditions) + "\n" + chalk_1.default.magenta(')'));
                    console.log(chalk_1.default.gray("  Result:"), cli_highlight_1.default(rule.result.split('\n').join(''), { language: "html" }));
                    console.log("");
                });
            });
            console.log("");
            console.log(chalk_1.default.yellow(chalk_1.default.bgBlue(" Intermediates:")));
            Object.keys(compiled.intermediates).forEach(function (intName) {
                console.log("");
                console.log(chalk_1.default.yellow(chalk_1.default.underline(intName)));
                var varConfig = compiled.intermediates[intName];
                if (varConfig.default != '0') {
                    console.log(chalk_1.default.gray("Default: ") + varConfig.default);
                    console.log("");
                }
                varConfig.rules.forEach(function (rule) {
                    console.log(chalk_1.default.red('if') + " " + chalk_1.default.magenta('(') + "\n    " + exports.conditionsToString(rule.conditions) + "\n" + chalk_1.default.magenta(')'));
                    console.log(chalk_1.default.gray('  Result:'), cli_highlight_1.default(rule.result.split('\n').join(''), { language: "html" }));
                    console.log("");
                });
            });
        }
        console.log("");
    }
};
exports.displayOutputObject = function (compiled, alterianVersion) {
    if (alterianVersion === void 0) { alterianVersion = false; }
    console.log(JSON.stringify(compiled, null, 4));
};
exports.displayOutput = function (output, fullOutput) {
    exports.displayFormattedOutput(output, fullOutput);
};
exports.stringHash = function (input) {
    var hash = 0;
    if (input.length == 0) {
        return Buffer.from(hash + '').toString('base64');
    }
    for (var i = 0; i < input.length; i++) {
        var char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Buffer.from(hash + '').toString('base64');
};
exports.generateNowSetting = function () {
    var date = new Date();
    var month = date.getMonth() + 1;
    return (month < 10 ? '0' + month : month) + "/" + (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + "/" + date.getFullYear();
};
//# sourceMappingURL=utils.js.map