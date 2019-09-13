"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var pretty = require("pretty");
var parsenodes_1 = require("./parsenodes");
var lexer_1 = require("./lexer");
var parser_1 = require("./parser");
var varconfig_1 = require("./varconfig");
var PluginError = /** @class */ (function () {
    function PluginError(msg) {
        this.msg = msg;
        this.__pluginError = true;
    }
    PluginError.prototype.errorToString = function () {
        return "Plugin Error: " + this.msg;
    };
    return PluginError;
}());
exports.PluginError = PluginError;
var IntermediateRef = /** @class */ (function () {
    function IntermediateRef(name) {
        this.name = name;
        this.__intermediateRef = true;
    }
    IntermediateRef.prototype.toString = function () {
        return "{" + this.name + "}";
    };
    return IntermediateRef;
}());
exports.IntermediateRef = IntermediateRef;
var FuncClosure = /** @class */ (function () {
    function FuncClosure() {
        var _this = this;
        this.__isClosure = true;
        this.scope = {};
        this.evaluate = function (compiler, args) {
            return _this.func.apply(global, args);
        };
    }
    return FuncClosure;
}());
exports.FuncClosure = FuncClosure;
var Runtime = /** @class */ (function () {
    function Runtime() {
        var _this = this;
        this.definedVars = {};
        this.sections = {};
        this.intermediates = {};
        this.shouldThrowOnPublic = false;
        this._variables = {};
        this._scope = [{}];
        this._consts = [[]];
        this.compile = function (folder) {
            try {
                var parser_2 = new parser_1.Parser();
                // Update require path
                var curRequire = require;
                global["require"] = function (moduleName) {
                    var required = require(path.resolve(folder, moduleName));
                    if (required.registerPlugin) {
                        required.registerPlugin(_this);
                    }
                    return required;
                };
                // Read folder and go through all .aml files
                var files = fs.readdirSync(folder, { encoding: "utf8" });
                files.forEach(function (file) {
                    if (file.split('.').pop() == 'aml') {
                        var input = fs.readFileSync(path.resolve(folder, file), { encoding: "utf8" });
                        parser_2.parseFile(file, input);
                    }
                });
                _this.collectObjects(parser_2.rootNode);
                global["require"] = curRequire;
                if (_this.getScope().main !== undefined) {
                    var mainOutput = _this.getScope().main.evaluate(_this, {});
                    var output = {
                        mainHtml: pretty(mainOutput ? mainOutput + '' : ''),
                        intermediates: _this.intermediates,
                        sections: _this.sections,
                        testCases: [],
                        variables: _this._variables
                    };
                    return output;
                }
            }
            catch (e) {
                if (e.__compilerError) {
                    console.log(e.errorToString());
                }
                else if (e.__pluginError) {
                    console.log();
                    console.log(e.errorToString());
                }
                else {
                    console.log(e);
                }
            }
            return null;
        };
        this.onVarNotFound = function (varName, parseNode) {
            throw new lexer_1.CompilerError("Cannot find variable '" + varName + "'", parseNode.startPosition, parseNode.endPosition);
        };
        this.pushScope = function (scope) {
            if (scope === void 0) { scope = null; }
            _this._scope.push(scope || {});
            _this._consts.push([]);
        };
        this.popScope = function () {
            _this._consts.pop();
            return _this._scope.pop();
        };
        this.getScope = function () {
            if (_this._scope.length > 0) {
                return _this._scope[_this._scope.length - 1];
            }
            return null;
        };
        this.getFullScope = function () {
            var scope = {};
            _this._scope.forEach(function (scp) {
                Object.keys(scp).forEach(function (sk) {
                    scope[sk] = scp[sk];
                });
            });
            return scope;
        };
        this.getLocal = function (varName) {
            for (var i = _this._scope.length; i > 0; i--) {
                if (_this._scope[i - 1][varName] !== undefined) {
                    return _this._scope[i - 1][varName];
                }
            }
            return undefined;
        };
        this.setLocal = function (varName, value) {
            for (var i = _this._scope.length; i > 0; i--) {
                if (_this._scope[i - 1][varName] !== undefined) {
                    _this._scope[i - 1][varName] = value;
                }
            }
        };
        this.setConst = function (varName) {
            _this._consts[_this._consts.length - 1].push(varName);
        };
        this.isConst = function (varName) {
            for (var i = _this._consts.length; i > 0; i--) {
                if (_this._consts[i - 1].indexOf(varName) >= 0)
                    return true;
            }
            return false;
        };
        this.checkForPublicLoad = function (cb) {
            _this.shouldThrowOnPublic = true;
            cb();
            _this.shouldThrowOnPublic = false;
        };
        this.generateDynamicSection = function (varConfig) {
            var secName = "_s" + (Object.keys(_this.sections).length + 1);
            _this.sections[secName] = varConfig;
            return "{" + secName + "}";
        };
        this.generateIntermediateValue = function (conditions) {
            var intName = "_e" + (Object.keys(_this.intermediates).length + 1);
            _this.intermediates[intName] = {
                default: '',
                rules: [
                    {
                        conditions: conditions,
                        result: '1'
                    }
                ]
            };
            return new IntermediateRef(intName);
        };
        this.generateIntermediateCondition = function (conditions) {
            return varconfig_1.createRuleCondition(_this.generateIntermediateValue(conditions).toString(), '1', '==');
        };
        this.collectObjects = function (rootNode) {
            Object.keys(rootNode.vars).forEach(function (varName) {
                if (rootNode.vars[varName].value) {
                    _this.definedVars[varName] = rootNode.vars[varName].value.evaluate(_this, {});
                }
                else {
                    _this.definedVars[varName] = '';
                }
                _this._variables[varName] = {
                    default: _this.definedVars[varName],
                    name: varName,
                    scope: varName[0] == '_' ? "private" : "public"
                };
            });
            rootNode.statements.forEach(function (statement) {
                statement.evaluate(_this, {});
            });
        };
        this.registerFunction = function (name, func) {
            var closure = new FuncClosure();
            closure.func = func;
            var dummyExpr = new parsenodes_1.FuncExpr();
            dummyExpr.params = _this._getParamNames(func);
            closure.funcExpr = dummyExpr;
            _this.getScope()[name] = closure;
        };
        this.STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
        this.ARGUMENT_NAMES = /([^\s,]+)/g;
        this._getParamNames = function (func) {
            var fnStr = func.toString().replace(_this.STRIP_COMMENTS, '');
            var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(_this.ARGUMENT_NAMES);
            if (result === null)
                return [];
            return result;
        };
    }
    return Runtime;
}());
exports.Runtime = Runtime;
//# sourceMappingURL=compiler.js.map