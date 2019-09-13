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
var renderer_1 = require("./renderer");
exports.createRuleConditions = function (conditions, left, right, operation, type) {
    if (type === void 0) { type = "end"; }
    if (operation == '>=') {
        conditions.push({
            type: "||",
            operation: '>',
            left: left + '',
            right: right + ''
        });
        conditions.push({
            type: type,
            operation: '==',
            left: left + '',
            right: right + ''
        });
    }
    else if (operation == '<=') {
        conditions.push({
            type: "||",
            operation: '<',
            left: left + '',
            right: right + ''
        });
        conditions.push({
            type: type,
            operation: '==',
            left: left + '',
            right: right + ''
        });
    }
    else if (operation == '===') {
        conditions.push({
            type: type,
            operation: '==',
            left: left + '',
            right: right + ''
        });
    }
    else if (operation == '!==') {
        conditions.push({
            type: type,
            operation: '!=',
            left: left + '',
            right: right + ''
        });
    }
    else {
        conditions.push({
            type: type,
            operation: operation,
            left: left + '',
            right: right + ''
        });
    }
};
var evaluateCondition = function (current, type, condition, runtime, output, values) {
    var replaceVars = function (item) {
        var newItem = item;
        // Replace values
        Object.keys(values).forEach(function (key) {
            newItem = newItem.replace(new RegExp("{" + key + "}", 'g'), values[key]);
        });
        // Replace rules and intermediates
        var rules = __assign({}, output.sections, output.intermediates);
        Object.keys(rules).forEach(function (ruleName) {
            if (newItem.indexOf("{" + ruleName + "}") >= 0) {
                var evaluated = exports.evaluateVarConfig(rules[ruleName], output, runtime, values);
                if (evaluated) {
                    newItem = newItem.replace(new RegExp("{" + ruleName + "}", 'g'), evaluated);
                }
                else {
                    newItem = newItem.replace(new RegExp("{" + ruleName + "}", 'g'), '');
                }
            }
        });
        return newItem;
    };
    var evaluate = function () {
        var left = replaceVars(condition.left);
        var right = replaceVars(condition.right);
        switch (condition.operation) {
            case "==": return left == right;
            case "===": return left === right;
            case "!=": return left != right;
            case "!==": return left !== right;
            case "<": return parseFloat(left) < parseFloat(right);
            case "<=": return parseFloat(left) <= parseFloat(right);
            case ">": return parseFloat(left) > parseFloat(right);
            case ">=": return parseFloat(left) >= parseFloat(right);
            case "contains": return left.indexOf(right) >= 0;
            case "notContains": return left.indexOf(right) < 0;
            case "startsWith": return left.startsWith(right);
            case "notStartsWith": return !left.startsWith(right);
            case "endsWith": return left.endsWith(right);
            case "notEndsWith": return !left.endsWith(right);
        }
        return false;
    };
    if (type == "end") {
        return evaluate();
    }
    else if (type == "&&") {
        return current && evaluate();
    }
    else {
        return current || evaluate();
    }
};
exports.evaluateVarConfig = function (varConfig, output, runtime, values) {
    var result = varConfig.default;
    var _loop_1 = function (rule) {
        var currentCondition = true;
        var currentType = "&&";
        rule.conditions.forEach(function (condition) {
            currentCondition = evaluateCondition(currentCondition, currentType, condition, runtime, output, values);
            currentType = condition.type;
        });
        if (currentCondition) {
            result = rule.result;
            return "break";
        }
    };
    for (var _i = 0, _a = varConfig.rules; _i < _a.length; _i++) {
        var rule = _a[_i];
        var state_1 = _loop_1(rule);
        if (state_1 === "break")
            break;
    }
    if (result || result == '') {
        return renderer_1.renderOutput(result, output, runtime, values);
    }
    return null;
};
//# sourceMappingURL=varconfig.js.map