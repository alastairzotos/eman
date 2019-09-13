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
var pretty = require("pretty");
var errors_1 = require("./errors");
var parsenodes_1 = require("./parsenodes");
var parser_1 = require("./parser");
var varconfig_1 = require("./varconfig");
var closure_1 = require("./closure");
var remotevars_1 = require("./remotevars");
exports.TEST_SETTINGS_NAME = "TestSettings";
var IMPORT_CACHE = {};
var Runtime = /** @class */ (function () {
    function Runtime() {
        var _this_1 = this;
        this.yieldedVars = {};
        this.shouldThrowOnYieldedLoad = false;
        this.warningsSuppressed = false;
        this._variables = {};
        this._scope = [{}];
        this._consts = [[]];
        this._exports = {};
        this._stack = [];
        this._tests = [];
        this.run = function (file) {
            var _a;
            var filePath = file.split('/').slice(0, -1).join('/');
            try {
                var parser = new parser_1.Parser();
                // Update require path
                var curRequire = global["require"];
                global.require = function (moduleName) {
                    if (moduleName.length > 0 && moduleName[0] == '.')
                        return require(path.resolve(filePath, moduleName));
                    return require(moduleName);
                };
                // Parse file
                var rootNode = parser.parseFile(file);
                // Handle imports
                _this_1.handleImports(filePath, rootNode.imports);
                // Collect parsed members
                _this_1.collectObjects(rootNode);
                // Evaluate all statements
                for (var _i = 0, _b = rootNode.statements; _i < _b.length; _i++) {
                    var statement = _b[_i];
                    statement.evaluate(_this_1, {});
                    // Add exports
                    if (statement.isExported()) {
                        var varDecl = statement;
                        _this_1._exports[varDecl.name] = _this_1.getScope()[varDecl.name];
                    }
                }
                // If we have a main function then run it and get returned value
                var mainOutput = '';
                if (_this_1.getScope().main !== undefined) {
                    mainOutput = pretty(_this_1.getScope().main.evaluate(_this_1, {}) + '');
                }
                // Check for tests function
                if (_this_1.getScope().tests !== undefined) {
                    (_a = _this_1._tests).push.apply(_a, _this_1.getScope().tests.funcExpr.body.statements);
                }
                // Reset require back to original
                global["require"] = curRequire;
                return {
                    output: mainOutput,
                    intermediates: Runtime.intermediates,
                    sections: Runtime.sections,
                    yieldedVars: _this_1._variables,
                    exports: _this_1._exports,
                    lookupTables: Runtime.lookupTables,
                    yieldLookups: Runtime.yieldLookups,
                    testCases: _this_1._tests
                };
            }
            catch (e) {
                errors_1.displayError(e);
            }
            return null;
        };
        this.onNotFound = function (varName, parseNode) {
            throw new errors_1.RuntimeError("Cannot find '" + varName + "'", parseNode.startPosition, parseNode.endPosition);
        };
        this.pushStack = function (func) {
            _this_1._stack.push(func);
        };
        this.popStack = function () {
            return _this_1._stack.pop();
        };
        this.stackTop = function () {
            if (_this_1._stack.length == 0)
                return null;
            return _this_1._stack[_this_1._stack.length - 1];
        };
        this.pushScope = function (scope) {
            if (scope === void 0) { scope = null; }
            _this_1._scope.push(scope || {});
            _this_1._consts.push([]);
        };
        this.popScope = function () {
            _this_1._consts.pop();
            return _this_1._scope.pop();
        };
        this.getScope = function () {
            if (_this_1._scope.length > 0) {
                return _this_1._scope[_this_1._scope.length - 1];
            }
            return null;
        };
        this.getFullScope = function () {
            var scope = {};
            _this_1._scope.forEach(function (scp) {
                Object.keys(scp).forEach(function (sk) {
                    scope[sk] = scp[sk];
                });
            });
            return scope;
        };
        this.getLocal = function (varName) {
            for (var i = _this_1._scope.length; i > 0; i--) {
                if (_this_1._scope[i - 1][varName] !== undefined) {
                    return _this_1._scope[i - 1][varName];
                }
            }
            return undefined;
        };
        this.setLocal = function (varName, value) {
            for (var i = _this_1._scope.length; i > 0; i--) {
                if (_this_1._scope[i - 1][varName] !== undefined) {
                    _this_1._scope[i - 1][varName] = value;
                }
            }
        };
        this.setConst = function (varName) {
            _this_1._consts[_this_1._consts.length - 1].push(varName);
        };
        this.isConst = function (varName) {
            for (var i = _this_1._consts.length; i > 0; i--) {
                if (_this_1._consts[i - 1].indexOf(varName) >= 0)
                    return true;
            }
            return false;
        };
        this.checkForYieldedLoad = function (cb) {
            _this_1.shouldThrowOnYieldedLoad = true;
            var returnValue = cb();
            _this_1.shouldThrowOnYieldedLoad = false;
            return returnValue;
        };
        this.generateDynamicSection = function (varConfig) {
            var secName = "_s" + ++Runtime._sectionCount;
            Runtime.sections[secName] = varConfig;
            return new remotevars_1.YieldVar(secName);
        };
        this.switchOnTestSettings = function (output) {
            _this_1.registerFunction(exports.TEST_SETTINGS_NAME, function () { return output; });
        };
        this.generateIntermediateValue = function (conditions) {
            var intName = "_e" + ++Runtime._intermediateCount;
            Runtime.intermediates[intName] = {
                default: '',
                rules: [
                    {
                        conditions: conditions,
                        result: '1'
                    }
                ]
            };
            return new remotevars_1.IntermediateRef(intName);
        };
        this.generateIntermediateConditions = function (currentConditions, conditions) {
            varconfig_1.createRuleConditions(currentConditions, _this_1.generateIntermediateValue(conditions).toString(), '1', '==');
        };
        this.handlePluginLoad = function (path, importNode, imported) {
            var registeredComponents = [];
            if (imported.registerPlugin) {
                var defFileOutput_1 = "// Type definitions for '" + importNode.file + "' plugin\nimport * as React from 'react';\n\n";
                _this_1._onComponentRegistered = function (name, params, func) {
                    var paramString = "{ " + Object.keys(params).map(function (param) { return param + ": " + params[param]; }).join(', ') + " }";
                    defFileOutput_1 += "export const " + name + ": React.FC<" + paramString + ">;\n";
                    registeredComponents.push(name);
                    if (importNode.asName !== undefined) {
                        return true;
                    }
                    return importNode.members.indexOf(name) >= 0;
                };
                imported.registerPlugin(_this_1);
                // Save type definitions type
                fs.writeFileSync(path + '.d.ts', defFileOutput_1, { encoding: "utf8" });
            }
            return registeredComponents;
        };
        this.handleImports = function (filePath, imports) {
            imports.forEach(function (importNode) {
                var _a;
                var fullPath = path.resolve(filePath, importNode.file);
                // Check if it's a node_module
                if (fs.existsSync('node_modules/' + importNode.file)) {
                    fullPath = path.resolve('node_modules', importNode.file);
                    // Check for package.json
                    if (fs.existsSync(fullPath + "/package.json")) {
                        var pckjson = JSON.parse(fs.readFileSync(fullPath + "/package.json", { encoding: "utf8" }));
                        if (pckjson.main) {
                            fullPath = path.join(fullPath, pckjson.main.split('.').slice(0, -1).join('.'));
                        }
                    }
                }
                // If there is a javascript file
                // then look for plugin registration
                if ((fullPath.endsWith('.js') && fs.existsSync(fullPath)) || fs.existsSync(fullPath + '.js')) {
                    var imported_1 = require(fullPath.endsWith('.js') ? fullPath : (fullPath + '.js'));
                    var registeredComponents_1 = _this_1.handlePluginLoad(fullPath, importNode, imported_1);
                    // Import other members
                    if (importNode.asName !== undefined) {
                        _this_1.getScope()[importNode.asName] = {};
                        Object.keys(imported_1).forEach(function (memberName) {
                            _this_1.getScope()[importNode.asName][memberName] = imported_1[memberName];
                        });
                    }
                    else if (importNode.members) {
                        importNode.members.forEach(function (memberName) {
                            if (imported_1[memberName] !== undefined) {
                                _this_1.getScope()[memberName] = imported_1[memberName];
                            }
                            else if (registeredComponents_1.indexOf(memberName) < 0) {
                                throw new errors_1.RuntimeError("Module '" + importNode.file + "' has no exported member '" + memberName + "'", importNode.startPosition, importNode.endPosition);
                            }
                        });
                    }
                }
                // Import other aml members
                else if ((fullPath.endsWith('.aml') && fs.existsSync(fullPath)) || fs.existsSync(fullPath + '.aml')) {
                    var output_1 = null;
                    if (IMPORT_CACHE[fullPath] === undefined) {
                        output_1 = (new Runtime()).run(fullPath.endsWith('.aml') ? fullPath : fullPath + '.aml');
                        IMPORT_CACHE[fullPath] = output_1;
                    }
                    else {
                        output_1 = IMPORT_CACHE[fullPath];
                    }
                    // Update exported functions to use this runtime
                    Object.keys(output_1.exports).forEach(function (exportName) {
                        if (output_1.exports[exportName].__isClosure) {
                            output_1.exports[exportName].runtime = _this_1;
                        }
                    });
                    // Add in exports
                    if (importNode.asName !== undefined) {
                        _this_1.getScope()[importNode.asName] = output_1.exports;
                    }
                    else if (importNode.members) {
                        importNode.members.forEach(function (memberName) {
                            if (output_1.exports[memberName] !== undefined) {
                                _this_1.getScope()[memberName] = output_1.exports[memberName];
                            }
                            else {
                                throw new errors_1.RuntimeError("Module '" + importNode.file + "' has no exported member '" + memberName + "'", importNode.startPosition, importNode.endPosition);
                            }
                        });
                    }
                    else {
                        Object.keys(output_1.exports).forEach(function (memberName) {
                            _this_1.getScope()[memberName] = output_1.exports[memberName];
                        });
                    }
                    // Import yielded variables
                    _this_1._variables = __assign({}, _this_1._variables, output_1.yieldedVars);
                    _this_1.yieldedVars = __assign({}, _this_1.yieldedVars, output_1.yieldedVars);
                    // Import tests
                    (_a = _this_1._tests).push.apply(_a, output_1.testCases);
                }
            });
        };
        this.collectObjects = function (rootNode) {
            var _this = _this_1;
            // Built-in campaign variables
            _this_1.yieldedVars["now"] = '';
            // First add regular yields        
            Object.keys(rootNode.yields).forEach(function (varName) {
                _this.yieldedVars[varName] = '';
                _this._variables[varName] = {
                    default: _this_1.yieldedVars[varName],
                    name: varName,
                    scope: varName[0] == '_' ? "private" : "public"
                };
            });
            // Next add lookup tables
            Object.keys(rootNode.lookups).forEach(function (varName) {
                var lookupTable = {};
                var lookupItemExprs = rootNode.lookups[varName].items;
                Object.keys(lookupItemExprs).forEach(function (key) {
                    lookupTable[key] = lookupItemExprs[key].evaluate(_this, {});
                });
                Runtime.lookupTables[varName] = lookupTable;
            });
            // Next create config and connect yields to lookups
            Object.keys(rootNode.yields).forEach(function (varName) {
                if (rootNode.yields[varName].lookup) {
                    var lookupTable_1 = Runtime.lookupTables[rootNode.yields[varName].lookup];
                    if (lookupTable_1 === undefined) {
                        throw new errors_1.CompilerError("Cannot find lookup table '" + rootNode.yields[varName].lookup + "'", rootNode.yields[varName].startPosition, rootNode.yields[varName].endPosition);
                    }
                    if (rootNode.yields[varName].value) {
                        var evaluated = rootNode.yields[varName].value.evaluate(_this, {});
                        if (lookupTable_1[evaluated] === undefined) {
                            throw new errors_1.CompilerError("Cannot find entry '" + _this.yieldedVars[varName] + "' in lookup table '" + rootNode.yields[varName].lookup + "'", rootNode.yields[varName].startPosition, rootNode.yields[varName].endPosition);
                        }
                    }
                    var varConfig_1 = {
                        default: '',
                        rules: []
                    };
                    Object.keys(lookupTable_1).forEach(function (key) {
                        var conditions = [];
                        varconfig_1.createRuleConditions(conditions, "{" + varName + "}", key, '==');
                        varConfig_1.rules.push({
                            result: lookupTable_1[key] + '',
                            conditions: conditions
                        });
                    });
                    var dynamicSection = _this.generateDynamicSection(varConfig_1);
                    _this_1.getScope()[varName] = dynamicSection;
                    _this_1.setConst(varName);
                    _this_1._exports[varName] = dynamicSection;
                }
            });
            // Reset regular yield values now so they can reference other yielded vars
            Object.keys(rootNode.yields).forEach(function (varName) {
                if (rootNode.yields[varName].value) {
                    _this_1.yieldedVars[varName] = rootNode.yields[varName].value.evaluate(_this_1, {});
                }
                else {
                    _this_1.yieldedVars[varName] = '';
                }
                _this._variables[varName] = {
                    default: _this_1.yieldedVars[varName],
                    name: varName,
                    scope: varName[0] == '_' ? "private" : "public"
                };
            });
        };
        this.registerComponent = function (name, params, func) {
            if (_this_1._onComponentRegistered) {
                if (_this_1._onComponentRegistered(name, params, func)) {
                    _this_1.registerFunction(name, func);
                }
            }
            else {
                _this_1.registerFunction(name, func);
            }
        };
        this.registerFunction = function (name, func) {
            var closure = new closure_1.FuncClosure();
            closure.func = func;
            var dummyExpr = new parsenodes_1.FuncExpr();
            dummyExpr.params = _this_1._getParamNames(func);
            closure.funcExpr = dummyExpr;
            _this_1.getScope()[name] = closure;
        };
        this.STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
        this.ARGUMENT_NAMES = /([^\s,]+)/g;
        this._getParamNames = function (func) {
            var fnStr = func.toString().replace(_this_1.STRIP_COMMENTS, '');
            var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(_this_1.ARGUMENT_NAMES);
            if (result === null)
                return [];
            return result;
        };
        // Add built-in runtime variable
        this.getScope()["runtime"] = {
            renderingPdf: false,
            runningTests: false
        };
        this.setConst("runtime");
        /*
        Component to display current test settings

        Should return nothing in the general case.
        This function can be overridden when we want an output
        */
        this.registerFunction(exports.TEST_SETTINGS_NAME, function () { return ""; });
    }
    Runtime.sections = {};
    Runtime.intermediates = {};
    Runtime.lookupTables = {};
    Runtime.yieldLookups = {};
    Runtime._sectionCount = 0;
    Runtime._intermediateCount = 0;
    Runtime.clearStaticData = function () {
        Runtime.sections = {};
        Runtime.intermediates = {};
        Runtime.lookupTables = {};
        Runtime.yieldLookups = {};
        Runtime._sectionCount = 0;
        Runtime._intermediateCount = 0;
        IMPORT_CACHE = {};
    };
    return Runtime;
}());
exports.Runtime = Runtime;
//# sourceMappingURL=runtime.js.map