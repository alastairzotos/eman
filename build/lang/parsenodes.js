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
var _this_1 = this;
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("util");
var errors_1 = require("./errors");
var lexer_1 = require("./lexer");
var runtime_1 = require("./runtime");
var varconfig_1 = require("./varconfig");
var closure_1 = require("./closure");
var remotevars_1 = require("./remotevars");
var chalk_1 = require("chalk");
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();
//****************************************************
// Main
//****************************************************
var NodeType;
(function (NodeType) {
    NodeType["Root"] = "root";
    NodeType["Import"] = "import";
    NodeType["Var"] = "var";
    NodeType["Lookup"] = "lookup";
    NodeType["Const"] = "const";
    NodeType["Statement"] = "statement";
})(NodeType = exports.NodeType || (exports.NodeType = {}));
var ParseNode = /** @class */ (function () {
    function ParseNode(type) {
        this.type = type;
    }
    return ParseNode;
}());
exports.ParseNode = ParseNode;
var RootNode = /** @class */ (function (_super) {
    __extends(RootNode, _super);
    function RootNode() {
        var _this_1 = _super.call(this, NodeType.Root) || this;
        _this_1.yields = {};
        _this_1.lookups = {};
        _this_1.imports = [];
        _this_1.statements = [];
        return _this_1;
    }
    return RootNode;
}(ParseNode));
exports.RootNode = RootNode;
var ImportNode = /** @class */ (function (_super) {
    __extends(ImportNode, _super);
    function ImportNode() {
        return _super.call(this, NodeType.Import) || this;
    }
    return ImportNode;
}(ParseNode));
exports.ImportNode = ImportNode;
var YieldNode = /** @class */ (function (_super) {
    __extends(YieldNode, _super);
    function YieldNode() {
        var _this_1 = _super.call(this, NodeType.Var) || this;
        _this_1.lookup = null;
        return _this_1;
    }
    return YieldNode;
}(ParseNode));
exports.YieldNode = YieldNode;
var LookupTableNode = /** @class */ (function (_super) {
    __extends(LookupTableNode, _super);
    function LookupTableNode(items) {
        var _this_1 = _super.call(this) || this;
        _this_1.items = {};
        _this_1.type = NodeType.Lookup;
        _this_1.value = items;
        return _this_1;
    }
    return LookupTableNode;
}(YieldNode));
exports.LookupTableNode = LookupTableNode;
//****************************************************
// Statements
//****************************************************
var StmtType;
(function (StmtType) {
    StmtType["Noop"] = "noop";
    StmtType["Block"] = "block";
    StmtType["StmtList"] = "stmtlist";
    StmtType["Return"] = "return";
    StmtType["VarDecl"] = "vardecl";
    StmtType["For"] = "for";
    StmtType["ForOf"] = "forof";
    StmtType["While"] = "while";
    StmtType["DoWhile"] = "dowhile";
    StmtType["Expr"] = "expr";
    StmtType["Describe"] = "describe";
    StmtType["Run"] = "run";
})(StmtType = exports.StmtType || (exports.StmtType = {}));
var StmtNode = /** @class */ (function (_super) {
    __extends(StmtNode, _super);
    function StmtNode(stmtType) {
        var _this_1 = _super.call(this, NodeType.Statement) || this;
        _this_1.stmtType = stmtType;
        _this_1._exported = false;
        _this_1.isExported = function () { return _this_1._exported; };
        _this_1.setExported = function () {
            if (_this_1.stmtType == StmtType.VarDecl) {
                _this_1._exported = true;
            }
            else {
                throw new errors_1.CompilerError("Only declarations can be exported", _this_1.startPosition, _this_1.endPosition);
            }
        };
        _this_1.generateConditionValue = function (runtime, args) {
            try {
                var evaluated = _this_1.evaluate(runtime, args);
                if (evaluated !== undefined) {
                    return evaluated + '';
                }
                return '';
            }
            catch (e) {
                if (e.__cannotResolveException) {
                    throw new errors_1.CompilerError("Alterian does not support this operation", _this_1.startPosition, _this_1.endPosition);
                }
                else {
                    throw e;
                }
            }
        };
        _this_1.generateConditions = function (runtime, args, conditions) {
            //throw new CompilerError(`Alterian doesn't support this operation`, this.startPosition, this.endPosition);
        };
        _this_1.evaluate = function (runtime, args) {
            return undefined;
        };
        return _this_1;
    }
    return StmtNode;
}(ParseNode));
exports.StmtNode = StmtNode;
var NoopStmt = /** @class */ (function (_super) {
    __extends(NoopStmt, _super);
    function NoopStmt() {
        return _super.call(this, StmtType.Noop) || this;
    }
    return NoopStmt;
}(StmtNode));
exports.NoopStmt = NoopStmt;
var StmtList = /** @class */ (function (_super) {
    __extends(StmtList, _super);
    function StmtList() {
        var _this_1 = _super.call(this, StmtType.StmtList) || this;
        _this_1.statements = [];
        _this_1.evaluate = function (runtime, args) {
            for (var _i = 0, _a = _this_1.statements; _i < _a.length; _i++) {
                var stmt = _a[_i];
                stmt.evaluate(runtime, args);
            }
        };
        return _this_1;
    }
    return StmtList;
}(StmtNode));
exports.StmtList = StmtList;
var BlockStmt = /** @class */ (function (_super) {
    __extends(BlockStmt, _super);
    function BlockStmt() {
        var _this_1 = _super.call(this, StmtType.Block) || this;
        _this_1.statements = [];
        _this_1.returnOnFirstValue = false;
        _this_1.forceThrowReturn = false;
        _this_1.evaluate = function (runtime, args) {
            runtime.pushScope();
            for (var _i = 0, _a = _this_1.statements; _i < _a.length; _i++) {
                var stmt = _a[_i];
                var evaluated = stmt.evaluate(runtime, args);
                if (_this_1.returnOnFirstValue && evaluated !== undefined) {
                    runtime.popScope();
                    if (_this_1.forceThrowReturn) {
                        throw new ReturnException(evaluated);
                    }
                    return evaluated;
                }
                else if (stmt.stmtType == StmtType.Return) {
                    runtime.popScope();
                    throw new ReturnException(evaluated);
                }
            }
            runtime.popScope();
            return undefined;
        };
        return _this_1;
    }
    return BlockStmt;
}(StmtNode));
exports.BlockStmt = BlockStmt;
var ReturnStmt = /** @class */ (function (_super) {
    __extends(ReturnStmt, _super);
    function ReturnStmt() {
        var _this_1 = _super.call(this, StmtType.Return) || this;
        _this_1.evaluate = function (runtime, args) {
            if (_this_1.expr)
                return _this_1.expr.evaluate(runtime, args);
            return undefined;
        };
        return _this_1;
    }
    return ReturnStmt;
}(StmtNode));
exports.ReturnStmt = ReturnStmt;
var VarDeclStmt = /** @class */ (function (_super) {
    __extends(VarDeclStmt, _super);
    function VarDeclStmt() {
        var _this_1 = _super.call(this, StmtType.VarDecl) || this;
        _this_1.isConst = false;
        _this_1.evaluate = function (runtime, args) {
            if (runtime.getScope()[_this_1.name] !== undefined) {
                throw new errors_1.CompilerError("Redefinition of '" + _this_1.name + "'", _this_1.startPosition, _this_1.endPosition);
            }
            if (_this_1.isConst)
                runtime.setConst(_this_1.name);
            runtime.getScope()[_this_1.name] = _this_1.value.evaluate(runtime, args);
        };
        return _this_1;
    }
    return VarDeclStmt;
}(StmtNode));
exports.VarDeclStmt = VarDeclStmt;
var WhileStmt = /** @class */ (function (_super) {
    __extends(WhileStmt, _super);
    function WhileStmt() {
        var _this_1 = _super.call(this, StmtType.While) || this;
        _this_1.evaluate = function (runtime, args) {
            try {
                while (runtime.checkForYieldedLoad(function () { return _this_1.condition.evaluate(runtime, args); })) {
                    _this_1.body.evaluate(runtime, args);
                }
            }
            catch (e) {
                if (e.__cannotResolveException === true) {
                    throw new errors_1.CompilerError('Attempting to use a yielded variable in while loop condition', _this_1.condition.startPosition, _this_1.condition.endPosition);
                }
                else
                    throw e;
            }
        };
        return _this_1;
    }
    return WhileStmt;
}(StmtNode));
exports.WhileStmt = WhileStmt;
var ForStmt = /** @class */ (function (_super) {
    __extends(ForStmt, _super);
    function ForStmt() {
        var _this_1 = _super.call(this, StmtType.For) || this;
        _this_1.evaluate = function (runtime, args) {
            runtime.pushScope();
            _this_1.init.evaluate(runtime, args);
            try {
                while (runtime.checkForYieldedLoad(function () { return _this_1.condition.evaluate(runtime, args); })) {
                    _this_1.body.evaluate(runtime, args);
                    _this_1.after.evaluate(runtime, args);
                }
            }
            catch (e) {
                if (e.__cannotResolveException) {
                    throw new errors_1.CompilerError('Attempting to use a yielded variable in for loop condition', _this_1.condition.startPosition, _this_1.condition.endPosition);
                }
                else
                    throw e;
            }
            runtime.popScope();
        };
        return _this_1;
    }
    return ForStmt;
}(StmtNode));
exports.ForStmt = ForStmt;
var ForOfStmt = /** @class */ (function (_super) {
    __extends(ForOfStmt, _super);
    function ForOfStmt() {
        var _this_1 = _super.call(this, StmtType.ForOf) || this;
        _this_1.initDecl = null;
        _this_1.evaluate = function (runtime, args) {
            var evaluatedCollection = _this_1.collection.evaluate(runtime, args);
            var iter = evaluatedCollection[Symbol.iterator]();
            runtime.pushScope();
            var next;
            if (_this_1.initDecl == "const") {
                runtime.setConst(_this_1.initLoad);
            }
            while (!(next = iter.next()).done) {
                runtime.getScope()[_this_1.initLoad] = next.value;
                _this_1.body.evaluate(runtime, args);
            }
            runtime.popScope();
        };
        return _this_1;
    }
    return ForOfStmt;
}(StmtNode));
exports.ForOfStmt = ForOfStmt;
var DoWhileStmt = /** @class */ (function (_super) {
    __extends(DoWhileStmt, _super);
    function DoWhileStmt() {
        var _this_1 = _super.call(this, StmtType.DoWhile) || this;
        _this_1.evaluate = function (runtime, args) {
            try {
                do {
                    _this_1.body.evaluate(runtime, args);
                } while (runtime.checkForYieldedLoad(function () { return _this_1.condition.evaluate(runtime, args); }));
            }
            catch (e) {
                if (e.__cannotResolveException) {
                    throw new errors_1.CompilerError('Attempting to use a yielded variable in do/while loop condition', _this_1.condition.startPosition, _this_1.condition.endPosition);
                }
                else
                    throw e;
            }
        };
        return _this_1;
    }
    return DoWhileStmt;
}(StmtNode));
exports.DoWhileStmt = DoWhileStmt;
//****************************************************
// Test cases
//****************************************************
var DescribeNode = /** @class */ (function (_super) {
    __extends(DescribeNode, _super);
    function DescribeNode() {
        var _this_1 = _super.call(this, StmtType.Describe) || this;
        _this_1.testRuns = [];
        return _this_1;
    }
    return DescribeNode;
}(StmtNode));
exports.DescribeNode = DescribeNode;
var RunNodeType;
(function (RunNodeType) {
    RunNodeType["Test"] = "test";
    RunNodeType["Todo"] = "todo";
})(RunNodeType = exports.RunNodeType || (exports.RunNodeType = {}));
var RunNode = /** @class */ (function (_super) {
    __extends(RunNode, _super);
    function RunNode(runNodeType) {
        var _this_1 = _super.call(this, StmtType.Run) || this;
        _this_1.runNodeType = runNodeType;
        return _this_1;
    }
    return RunNode;
}(StmtNode));
exports.RunNode = RunNode;
var RunTestNode = /** @class */ (function (_super) {
    __extends(RunTestNode, _super);
    function RunTestNode() {
        var _this_1 = _super.call(this, RunNodeType.Test) || this;
        _this_1.settings = {};
        return _this_1;
    }
    return RunTestNode;
}(RunNode));
exports.RunTestNode = RunTestNode;
var RunTodoNode = /** @class */ (function (_super) {
    __extends(RunTodoNode, _super);
    function RunTodoNode() {
        return _super.call(this, RunNodeType.Todo) || this;
    }
    return RunTodoNode;
}(RunNode));
exports.RunTodoNode = RunTodoNode;
//****************************************************
// Expressions
//****************************************************
/*
This is thrown when Compiler.shouldThrowOnPublic is true and a yielded
variable is being loaded

It indicates that we are either making a mistake by using a yielded variable
in a loop condition, i.e. while (SomeYieldedVariable), which can never be resolved
or if we're validly using one in an if-statement condition and need to know that
we can't resolve the if-statement at runtime but we can generate logic to be
resolved externally
*/
var CannotResolve = /** @class */ (function () {
    function CannotResolve(startPosition, endPosition) {
        this.startPosition = startPosition;
        this.endPosition = endPosition;
        this.__cannotResolveException = true;
    }
    return CannotResolve;
}());
var ExprType;
(function (ExprType) {
    ExprType["Literal"] = "literal";
    ExprType["Load"] = "load";
    ExprType["Parentheses"] = "parentheses";
    ExprType["UnaryOp"] = "unaryop";
    ExprType["Operator"] = "op";
    ExprType["Object"] = "object";
    ExprType["Array"] = "array";
    ExprType["AccessObj"] = "accobj";
    ExprType["AccessArr"] = "accarr";
    ExprType["Call"] = "call";
    ExprType["MethodCall"] = "methodcall";
    ExprType["AlterianMethodCall"] = "alterianmethodcall";
    ExprType["Function"] = "function";
    ExprType["IfRules"] = "ifrules";
    ExprType["HTML"] = "html";
    ExprType["New"] = "new";
    ExprType["Template"] = "template";
})(ExprType = exports.ExprType || (exports.ExprType = {}));
var ExprNode = /** @class */ (function (_super) {
    __extends(ExprNode, _super);
    function ExprNode(exprType) {
        var _this_1 = _super.call(this, StmtType.Expr) || this;
        _this_1.exprType = exprType;
        // Removes any parentheses
        _this_1.unpack = function () {
            var expr = _this_1;
            while (expr && expr.exprType == ExprType.Parentheses) {
                expr = expr.expr;
            }
            return expr;
        };
        return _this_1;
    }
    return ExprNode;
}(StmtNode));
exports.ExprNode = ExprNode;
var LitExpr = /** @class */ (function (_super) {
    __extends(LitExpr, _super);
    function LitExpr(literal) {
        var _this_1 = _super.call(this, ExprType.Literal) || this;
        _this_1.literal = literal;
        _this_1.evaluate = function (runtime, args) {
            return _this_1.literal;
        };
        return _this_1;
    }
    return LitExpr;
}(ExprNode));
exports.LitExpr = LitExpr;
var LoadExpr = /** @class */ (function (_super) {
    __extends(LoadExpr, _super);
    function LoadExpr(varName) {
        var _this_1 = _super.call(this, ExprType.Load) || this;
        _this_1.varName = varName;
        _this_1.generateConditions = function (runtime, args, conditions) {
            varconfig_1.createRuleConditions(conditions, _this_1.generateConditionValue(runtime, args), '', '!=');
        };
        _this_1.evaluate = function (runtime, args) {
            var result = null;
            // Special
            if (_this_1.varName == '__dirname') {
                return __dirname;
            }
            // This
            else if (_this_1.varName == 'this') {
                var stackTop = runtime.stackTop();
                if (!stackTop)
                    return undefined;
                return stackTop.thisArg;
            }
            // Local variables
            else if (runtime.getLocal(_this_1.varName) !== undefined) {
                result = runtime.getLocal(_this_1.varName);
            }
            // Local arguments
            else if (args[_this_1.varName] !== undefined) {
                result = args[_this_1.varName];
            }
            // Yielded variables
            else if (runtime.yieldedVars[_this_1.varName] !== undefined) {
                //if (runtime.shouldThrowOnPublic) throw new CannotResolve;
                result = new remotevars_1.YieldVar(_this_1.varName);
            }
            // Global javascript objects
            else if (global[_this_1.varName] !== undefined) {
                result = global[_this_1.varName];
            }
            // Error if referencing a lookup table
            else if (runtime_1.Runtime.lookupTables[_this_1.varName] !== undefined) {
                var firstValue = "";
                if (Object.keys(runtime_1.Runtime.lookupTables[_this_1.varName]).length > 0) {
                    firstValue = chalk_1.default.yellow(' = ') + (" " + chalk_1.default.red('"' + Object.keys(runtime_1.Runtime.lookupTables[_this_1.varName])[0] + '"'));
                }
                var example = chalk_1.default.blue("yield") + " MyVar " + chalk_1.default.bold(chalk_1.default.yellow('=>')) + " " + chalk_1.default.green(_this_1.varName) + firstValue + ";";
                throw new errors_1.CompilerError("Cannot directly reference lookup table '" + _this_1.varName + "'. Create a new yield that resolves to a value in the table, i.e.,\n\t " + example, _this_1.startPosition, _this_1.endPosition);
            }
            // Not found
            else {
                /*if (!runtime.warningsSuppressed) {
                    if (this.startPosition) {
                        console.log(chalk.yellow("Warning"), chalk.gray(`(file ${chalk.yellow(this.startPosition.file.split('/').pop())}, line ${chalk.yellow('' + this.startPosition.line)}, column ${chalk.yellow('' + this.startPosition.column)})${chalk.yellow(':')}`), `Cannot find '${chalk.magenta(this.varName)}'`);
                    } else {
                        console.log(chalk.yellow("Warning:"), `Cannot find '${chalk.magenta(this.varName)}'`);
                    }
                }*/
                return undefined;
            }
            if (runtime.shouldThrowOnYieldedLoad && result.__isYielded)
                throw new CannotResolve(_this_1.startPosition, _this_1.endPosition);
            return result;
        };
        return _this_1;
    }
    return LoadExpr;
}(ExprNode));
exports.LoadExpr = LoadExpr;
var ParExpr = /** @class */ (function (_super) {
    __extends(ParExpr, _super);
    function ParExpr(expr) {
        var _this_1 = _super.call(this, ExprType.Parentheses) || this;
        _this_1.expr = expr;
        _this_1.generateConditionValue = function (runtime, args) {
            return _this_1.expr.generateConditionValue(runtime, args);
        };
        _this_1.generateConditions = function (runtime, args, conditions) {
            var parConditions = [];
            _this_1.expr.generateConditions(runtime, args, parConditions);
            runtime.generateIntermediateConditions(conditions, parConditions);
        };
        _this_1.evaluate = function (runtime, args) {
            return _this_1.expr.evaluate(runtime, args);
        };
        return _this_1;
    }
    return ParExpr;
}(ExprNode));
exports.ParExpr = ParExpr;
var NewExpr = /** @class */ (function (_super) {
    __extends(NewExpr, _super);
    function NewExpr() {
        var _this_1 = _super.call(this, ExprType.New) || this;
        _this_1.args = [];
        _this_1.evaluate = function (runtime, args) {
            var loaded = _this_1.className.evaluate(runtime, args);
            var resolvedArgs = _this_1.args.map(function (arg) { return arg.evaluate(runtime, args); });
            var func = loaded;
            if (func.__isClosure) {
                var newObj = Object.create(func.prototype);
                newObj.prototype = func.prototype;
                func.apply(newObj, resolvedArgs);
                return newObj;
            }
            else {
                return new (func.bind.apply(func, [void 0].concat(resolvedArgs)))();
            }
        };
        return _this_1;
    }
    return NewExpr;
}(ExprNode));
exports.NewExpr = NewExpr;
var storeValue = function (runtime, args, value, location) {
    switch (location.exprType) {
        case ExprType.Load: {
            var loadExpr = location;
            if (runtime.isConst(loadExpr.varName)) {
                throw new errors_1.RuntimeError("Attempting to reassign const variable '" + loadExpr.varName + "'", _this_1.startPosition, _this_1.endPosition);
            }
            else if (runtime.yieldedVars[loadExpr.varName] !== undefined) {
                throw new errors_1.RuntimeError("Attempting to assign a yielded variable '" + loadExpr.varName + "'", _this_1.startPosition, _this_1.endPosition);
            }
            runtime.setLocal(loadExpr.varName, value);
            break;
        }
        case ExprType.AccessArr: {
            var accExpr = location;
            var arr = accExpr.obj.evaluate(runtime, args);
            var index = accExpr.index.evaluate(runtime, args);
            arr[index] = value;
            break;
        }
        case ExprType.AccessObj: {
            var accExpr = location;
            var obj = accExpr.obj.evaluate(runtime, args);
            obj[accExpr.prop] = value;
            break;
        }
    }
};
var OpExpr = /** @class */ (function (_super) {
    __extends(OpExpr, _super);
    function OpExpr(opType) {
        var _this_1 = _super.call(this, ExprType.Operator) || this;
        _this_1.opType = opType;
        _this_1.generateConditions = function (runtime, args, conditions) {
            if (lexer_1.isComparisonOp(_this_1.opType)) {
                /*
                Special case for {x}.indexOf("y") <operator> 0
    
                We can look at certain patterns and create a condition operator
                such as 'startsWith' or 'contains' etc depending on the current operator and RHS
                */
                if (_this_1.expr1.exprType == ExprType.MethodCall) {
                    var leftMethodCall = _this_1.expr1;
                    var obj = leftMethodCall.obj.evaluate(runtime, args);
                    var right_1 = _this_1.expr2.evaluate(runtime, args);
                    if (obj && obj.__isYielded && leftMethodCall.prop == "indexOf") {
                        var resolvedArgs = leftMethodCall.args.map(function (arg) { return arg.evaluate(runtime, args); });
                        if (right_1 === 0) {
                            if (_this_1.opType == "==" || _this_1.opType == "===") {
                                varconfig_1.createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "startsWith");
                                return;
                            }
                            else if (_this_1.opType == "!=" || _this_1.opType == "!==") {
                                varconfig_1.createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "notStartsWith");
                                return;
                            }
                            else if (_this_1.opType == ">") {
                                varconfig_1.createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "contains", "&&");
                                varconfig_1.createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "notStartsWith");
                                return;
                            }
                            else if (_this_1.opType == ">=") {
                                varconfig_1.createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "contains");
                                return;
                            }
                            else if (_this_1.opType == "<") {
                                varconfig_1.createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "notContains");
                                return;
                            }
                            else if (_this_1.opType == "<=") {
                                varconfig_1.createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "startsWith", "||");
                                varconfig_1.createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "notContains");
                                return;
                            }
                        }
                    }
                }
                var left = _this_1.expr1.generateConditionValue(runtime, args);
                var right = _this_1.expr2.generateConditionValue(runtime, args);
                varconfig_1.createRuleConditions(conditions, left, right, _this_1.opType);
            }
            else if (lexer_1.isBooleanOp(_this_1.opType)) {
                var leftConditions = [];
                var rightConditions = [];
                _this_1.expr1.generateConditions(runtime, args, leftConditions);
                _this_1.expr2.generateConditions(runtime, args, rightConditions);
                if (leftConditions.length > 1) {
                    var newLeftConditions = [];
                    runtime.generateIntermediateConditions(newLeftConditions, leftConditions);
                    leftConditions = newLeftConditions;
                }
                if (rightConditions.length > 1) {
                    var newRightConditions = [];
                    runtime.generateIntermediateConditions(newRightConditions, rightConditions);
                    rightConditions = newRightConditions;
                }
                leftConditions[leftConditions.length - 1].type = _this_1.opType;
                conditions.push.apply(conditions, leftConditions);
                conditions.push.apply(conditions, rightConditions);
            }
            else if (lexer_1.isArithmeticOp(_this_1.opType)) {
                var left = _this_1.generateConditionValue(runtime, args);
                varconfig_1.createRuleConditions(conditions, left, '', '!=');
            }
        };
        _this_1.generateConditionValue = function (runtime, args) {
            var left = _this_1.expr1.generateConditionValue(runtime, args);
            var right = _this_1.expr2.generateConditionValue(runtime, args);
            var stringExpr = "";
            switch (_this_1.opType) {
                case '+':
                    stringExpr = left + (".Add([" + right + "])");
                    break;
                case '-':
                    stringExpr = left + (".Sub([" + right + "])");
                    break;
                default:
                    throw new errors_1.CompilerError("Alterian doesn't support this operation", _this_1.startPosition, _this_1.endPosition);
            }
            return new remotevars_1.YieldVar(stringExpr, false);
        };
        _this_1.evaluate = function (runtime, args) {
            if (_this_1.opType == "=") {
                storeValue(runtime, args, _this_1.expr2.evaluate(runtime, args), _this_1.expr1);
                return undefined;
            }
            else if (_this_1.opType == '+=') {
                storeValue(runtime, args, _this_1.expr1.evaluate(runtime, args) + _this_1.expr2.evaluate(runtime, args), _this_1.expr1);
                return undefined;
            }
            else if (_this_1.opType == '-=') {
                storeValue(runtime, args, _this_1.expr1.evaluate(runtime, args) - _this_1.expr2.evaluate(runtime, args), _this_1.expr1);
                return undefined;
            }
            else if (_this_1.opType == '*=') {
                storeValue(runtime, args, _this_1.expr1.evaluate(runtime, args) * _this_1.expr2.evaluate(runtime, args), _this_1.expr1);
                return undefined;
            }
            else if (_this_1.opType == '/=') {
                storeValue(runtime, args, _this_1.expr1.evaluate(runtime, args) / _this_1.expr2.evaluate(runtime, args), _this_1.expr1);
                return undefined;
            }
            var left = _this_1.expr1.evaluate(runtime, args);
            var right = _this_1.expr2.evaluate(runtime, args);
            if ((left && left.__isYielded) || (right && right.__isYielded)) {
                return _this_1.generateConditionValue(runtime, args);
            }
            switch (_this_1.opType) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/': return left / right;
                case '<': return left < right;
                case '<=': return left <= right;
                case '>=': return left >= right;
                case '>': return left > right;
                case '==': return left == right;
                case '===': return left === right;
                case '!=': return left != right;
                case '!==': return left !== right;
                case '&&': return left && right;
                case '||': return left || right;
                case 'instanceof': {
                    if (right && right.__isClosure) {
                        return left instanceof right.func;
                    }
                    return left instanceof right;
                }
            }
            return null;
        };
        return _this_1;
    }
    return OpExpr;
}(ExprNode));
exports.OpExpr = OpExpr;
var UnaryExpr = /** @class */ (function (_super) {
    __extends(UnaryExpr, _super);
    function UnaryExpr(opType) {
        var _this_1 = _super.call(this, ExprType.UnaryOp) || this;
        _this_1.opType = opType;
        _this_1.postFix = null;
        _this_1.generateConditions = function (runtime, args, conditions) {
            try {
                runtime.checkForYieldedLoad(function () {
                    var obj = _this_1.expr.evaluate(runtime, args);
                });
            }
            catch (e) {
                if (e.__cannotResolveException) {
                    runtime.shouldThrowOnYieldedLoad = false;
                    var conditionCount = conditions.length;
                    _this_1.expr.generateConditions(runtime, args, conditions);
                    if (conditions.length > conditionCount) {
                        for (var condId = conditionCount; condId < conditions.length; condId++) {
                            var cond = conditions[condId];
                            if (_this_1.opType == "!") {
                                // Invert whatever operation is here
                                switch (cond.operation) {
                                    case "!=":
                                        conditions[condId].operation = "==";
                                        break;
                                    case "!==":
                                        conditions[condId].operation = "===";
                                        break;
                                    case "==":
                                        conditions[condId].operation = "!=";
                                        break;
                                    case "===":
                                        conditions[condId].operation = "!==";
                                        break;
                                    case "<":
                                        conditions[condId].operation = ">=";
                                        break;
                                    case "<=":
                                        conditions[condId].operation = ">";
                                        break;
                                    case ">":
                                        conditions[condId].operation = "<=";
                                        break;
                                    case ">=":
                                        conditions[condId].operation = "<";
                                        break;
                                    case "contains":
                                        conditions[condId].operation = "notContains";
                                        break;
                                    case "notContains":
                                        conditions[condId].operation = "contains";
                                        break;
                                    case "startsWith":
                                        conditions[condId].operation = "notStartsWith";
                                        break;
                                    case "notStartsWith":
                                        conditions[condId].operation = "startsWith";
                                        break;
                                    case "endsWith":
                                        conditions[condId].operation = "notEndsWith";
                                        break;
                                    case "notEndsWith":
                                        conditions[condId].operation = "endsWith";
                                        break;
                                }
                            }
                            else {
                                throw new errors_1.CompilerError("Alterian does not support this operation", _this_1.startPosition, _this_1.endPosition);
                            }
                        }
                    }
                }
                else {
                    throw e;
                }
            }
        };
        _this_1.evaluate = function (runtime, args) {
            var operand = _this_1.expr.evaluate(runtime, args);
            switch (_this_1.opType) {
                case '!': return !operand;
                case '-': return -operand;
                case '++': {
                    if (_this_1.postFix) {
                        var evaluated = _this_1.expr.evaluate(runtime, args) + 1;
                        storeValue(runtime, args, evaluated, _this_1.expr);
                        return evaluated;
                    }
                    else {
                        var evaluated = _this_1.expr.evaluate(runtime, args);
                        storeValue(runtime, args, evaluated, _this_1.expr);
                        return evaluated + 1;
                    }
                }
                case '--': {
                    if (_this_1.postFix) {
                        var evaluated = _this_1.expr.evaluate(runtime, args) - 1;
                        storeValue(runtime, args, evaluated, _this_1.expr);
                        return evaluated;
                    }
                    else {
                        var evaluated = _this_1.expr.evaluate(runtime, args);
                        storeValue(runtime, args, evaluated, _this_1.expr);
                        return evaluated - 1;
                    }
                }
            }
            return null;
        };
        return _this_1;
    }
    return UnaryExpr;
}(ExprNode));
exports.UnaryExpr = UnaryExpr;
var ObjExpr = /** @class */ (function (_super) {
    __extends(ObjExpr, _super);
    function ObjExpr() {
        var _this_1 = _super.call(this, ExprType.Object) || this;
        _this_1.values = {};
        _this_1.evaluate = function (runtime, args) {
            var obj = {};
            Object.keys(_this_1.values).forEach(function (key) {
                if (_this_1.values[key] !== undefined) {
                    obj[key] = _this_1.values[key].evaluate(runtime, args);
                }
                else {
                    /*
                    In the case where we don't explicitly set a value and expect a local variable, i.e.
    
                    const a = 4;
                    const obj = { a };
                    */
                    obj[key] = runtime.getLocal(key);
                }
            });
            return obj;
        };
        return _this_1;
    }
    return ObjExpr;
}(ExprNode));
exports.ObjExpr = ObjExpr;
var ArrayExpr = /** @class */ (function (_super) {
    __extends(ArrayExpr, _super);
    function ArrayExpr() {
        var _this_1 = _super.call(this, ExprType.Array) || this;
        _this_1.values = [];
        _this_1.evaluate = function (runtime, args) {
            var array = _this_1.values.map(function (val) { return val.evaluate(runtime, args); });
            return array;
        };
        return _this_1;
    }
    return ArrayExpr;
}(ExprNode));
exports.ArrayExpr = ArrayExpr;
var AccessObjExpr = /** @class */ (function (_super) {
    __extends(AccessObjExpr, _super);
    function AccessObjExpr() {
        var _this_1 = _super.call(this, ExprType.AccessObj) || this;
        _this_1.evaluate = function (runtime, args) {
            var obj = _this_1.obj.evaluate(runtime, args);
            if (obj === undefined) {
                throw new errors_1.RuntimeError("Cannot access property '" + _this_1.prop + "' of undefined", _this_1.startPosition, _this_1.endPosition);
            }
            else if (obj === null) {
                throw new errors_1.RuntimeError("Cannot access property '" + _this_1.prop + "' of null", _this_1.startPosition, _this_1.endPosition);
            }
            if (obj[_this_1.prop] === undefined) {
                throw new errors_1.RuntimeError("Cannot find property '" + _this_1.prop + "' on object", _this_1.startPosition, _this_1.endPosition);
            }
            return obj[_this_1.prop];
        };
        return _this_1;
    }
    return AccessObjExpr;
}(ExprNode));
exports.AccessObjExpr = AccessObjExpr;
var AccessArrExpr = /** @class */ (function (_super) {
    __extends(AccessArrExpr, _super);
    function AccessArrExpr() {
        var _this_1 = _super.call(this, ExprType.AccessArr) || this;
        _this_1.evaluate = function (runtime, args) {
            var obj = _this_1.obj.evaluate(runtime, args);
            if (obj === undefined) {
                throw new errors_1.RuntimeError("Cannot access array index of undefined", _this_1.startPosition, _this_1.endPosition);
            }
            else if (obj === null) {
                throw new errors_1.RuntimeError("Cannot access array index of null", _this_1.startPosition, _this_1.endPosition);
            }
            return obj[_this_1.index.evaluate(runtime, args)];
        };
        return _this_1;
    }
    return AccessArrExpr;
}(ExprNode));
exports.AccessArrExpr = AccessArrExpr;
var CallExpr = /** @class */ (function (_super) {
    __extends(CallExpr, _super);
    function CallExpr() {
        var _this_1 = _super.call(this, ExprType.Call) || this;
        _this_1.args = [];
        _this_1.generateConditions = function (runtime, args, conditions) {
            varconfig_1.createRuleConditions(conditions, _this_1.generateConditionValue(runtime, args), '', '!=');
        };
        _this_1.evaluate = function (runtime, args) {
            var resolvedArgs = _this_1.args.map(function (arg) { return arg.evaluate(runtime, args); });
            var func = _this_1.func.evaluate(runtime, __assign({}, args, resolvedArgs));
            if (func === undefined)
                return undefined;
            // Odd cases where the function is yielded because
            // it uses a yielded parameter
            if (func.__isYielded) {
                func = func.name;
            }
            if (func.__isClosure) {
                var result = func.evaluate(runtime, resolvedArgs);
                // If there are any yielded values, the whole result has to be yielded
                var hasYielded = resolvedArgs.find(function (arg) { return arg.__isYielded === true; });
                if (hasYielded !== undefined) {
                    // No need to re-yield and already yielded value
                    if (result.__isYielded)
                        return result;
                    return new remotevars_1.YieldVar(result, false);
                }
                return result;
            }
            // If there are any closures as arguments, unpack them and get the actual js function
            // so we can call native methods like .map() etc
            resolvedArgs = resolvedArgs.map(function (resArg) {
                if (resArg) {
                    if (resArg.__isClosure) {
                        return resArg.func;
                    }
                }
                return resArg;
            });
            return func.apply(global, resolvedArgs);
        };
        return _this_1;
    }
    return CallExpr;
}(ExprNode));
exports.CallExpr = CallExpr;
var MethodCallExpr = /** @class */ (function (_super) {
    __extends(MethodCallExpr, _super);
    function MethodCallExpr() {
        var _this_1 = _super.call(this, ExprType.MethodCall) || this;
        _this_1.args = [];
        _this_1.generateMethodCallConditions = function (runtime, args, conditions) {
            var resolvedArgs = _this_1.args.map(function (arg) { return arg.evaluate(runtime, args); });
            var obj = _this_1.obj.evaluate(runtime, args).toString();
            switch (_this_1.prop) {
                case "startsWith": {
                    conditions.push({
                        left: obj,
                        right: resolvedArgs[0],
                        operation: "startsWith",
                        type: "end"
                    });
                    break;
                }
                case "endsWith": {
                    conditions.push({
                        left: obj,
                        right: resolvedArgs[0],
                        operation: "endsWith",
                        type: "end"
                    });
                    break;
                }
                default:
                    throw new errors_1.CompilerError('Alterian does not support this operation', _this_1.startPosition, _this_1.endPosition);
            }
        };
        /*generateConditionValue = (runtime: Runtime, args: IValues): any => {
            const conditions: IRuleCondition[] = [];
    
            this.generateConditions(runtime, args, conditions);
            return runtime.generateIntermediateValue(conditions);
        };*/
        _this_1.generateConditions = function (runtime, args, conditions) {
            try {
                runtime.checkForYieldedLoad(function () {
                    varconfig_1.createRuleConditions(conditions, _this_1.generateConditionValue(runtime, args), '', '!=');
                });
            }
            catch (e) {
                if (e.__cannotResolveException === true) {
                    runtime.shouldThrowOnYieldedLoad = false;
                    _this_1.generateMethodCallConditions(runtime, args, conditions);
                }
                else {
                    throw e;
                }
            }
        };
        _this_1.evaluate = function (runtime, args) {
            var resolvedArgs = _this_1.args.map(function (arg) { return arg.evaluate(runtime, args); });
            var obj = _this_1.obj.evaluate(runtime, args);
            if (obj === undefined) {
                throw new errors_1.RuntimeError("Cannot call method '" + _this_1.prop + "' on undefined", _this_1.startPosition, _this_1.endPosition);
            }
            else if (obj === null) {
                throw new errors_1.RuntimeError("Cannot call method '" + _this_1.prop + "' on null", _this_1.startPosition, _this_1.endPosition);
            }
            // Check if it's a custom closure
            if (obj[_this_1.prop] && obj[_this_1.prop].__isClosure) {
                return obj[_this_1.prop].evaluate(runtime, resolvedArgs, obj);
            }
            // If any argument is a custom closure convert it to a native function
            resolvedArgs = resolvedArgs.map(function (resArg) {
                if (resArg && resArg.__isClosure)
                    return resArg.func;
                return resArg;
            });
            // If yielded we can't evaluate it (unless it's toString())
            if (obj && obj.__isYielded) {
                if (_this_1.prop === "toString") {
                    return obj.toString();
                }
                else {
                    throw new CannotResolve(_this_1.startPosition, _this_1.endPosition);
                }
            }
            return obj[_this_1.prop].apply(obj, resolvedArgs);
        };
        return _this_1;
    }
    return MethodCallExpr;
}(ExprNode));
exports.MethodCallExpr = MethodCallExpr;
var AlterianMethodCall = /** @class */ (function (_super) {
    __extends(AlterianMethodCall, _super);
    function AlterianMethodCall() {
        var _this_1 = _super.call(this, ExprType.AlterianMethodCall) || this;
        _this_1.args = [];
        _this_1.evaluate = function (runtime, args) {
            var resolvedArgs = _this_1.args.map(function (arg) { return arg.evaluate(runtime, args); });
            var obj = _this_1.obj.evaluate(runtime, args);
            if (obj === undefined) {
                throw new errors_1.RuntimeError("Cannot call method '" + _this_1.prop + "' on undefined", _this_1.startPosition, _this_1.endPosition);
            }
            else if (obj === null) {
                throw new errors_1.RuntimeError("Cannot call method '" + _this_1.prop + "' on null", _this_1.startPosition, _this_1.endPosition);
            }
            // Check if we're calling a native alterian method
            if (_this_1._functions[_this_1.prop] !== undefined) {
                if (obj === undefined)
                    return "";
                if (obj.__isYielded)
                    return "";
                return _this_1._functions[_this_1.prop](obj, runtime, args);
            }
            else {
                throw new errors_1.CompilerError("So such Alterian method '" + _this_1.prop + "'", _this_1.startPosition, _this_1.endPosition);
            }
        };
        _this_1._functions = {
            FormatDate: function (obj, runtime, args) {
                var _a = obj.split('/'), month = _a[0], day = _a[1], year = _a[2];
                if (month === undefined || day === undefined || year === undefined)
                    return "";
                var output = "";
                var format = _this_1.args[0].evaluate(runtime, args);
                var lexer = new lexer_1.Lexer("", format + ' ');
                var formatArgs = [];
                while (lexer.hasNext()) {
                    if (lexer.isWhite(lexer.getTemplateContentStart())) {
                        formatArgs.push(lexer.acceptUntil(function (char) { return lexer_1.Lexer.isAlpha(char) || lexer_1.Lexer.isDigit(char); }).value);
                        lexer.setTemplateContentStart(lexer.getEndPosition().position + 1);
                    }
                    else {
                        formatArgs.push(lexer.accept(lexer_1.TokenType.Ident).value);
                        lexer.setTemplateContentStart(lexer.getEndPosition().position);
                    }
                }
                for (var _i = 0, formatArgs_1 = formatArgs; _i < formatArgs_1.length; _i++) {
                    var formatArg = formatArgs_1[_i];
                    switch (formatArg) {
                        case "d": {
                            output += parseInt(day);
                            break;
                        }
                        case "dd": {
                            output += day.length == 1 ? '0' + day : day;
                            break;
                        }
                        case "M": {
                            output += month;
                            break;
                        }
                        case "MM": {
                            output += month.length == 1 ? '=' + month : month;
                            break;
                        }
                        case "MMM": {
                            output += ([
                                "Jan", "Feb", "Mar",
                                "Apr", "May", "Jun",
                                "Jul", "Aug", "Sep",
                                "Oct", "Nov", "Dec"
                            ])[parseInt(month) - 1];
                            break;
                        }
                        case "MMMM": {
                            output += ([
                                "January", "February", "March",
                                "April", "May", "June",
                                "July", "August", "September",
                                "October", "November", "December"
                            ])[parseInt(month) - 1];
                            break;
                        }
                        case "yyyy": {
                            output += year;
                            break;
                        }
                        default: {
                            output += formatArg;
                        }
                    }
                }
                return output;
            },
            Trim: function (obj, runtime, args) { return obj.trim(); },
            Add: function (obj, runtime, args) {
                var arg1 = _this_1.args[0].evaluate(runtime, args);
                if (isNaN(parseFloat(obj)) || isNaN(parseFloat(arg1))) {
                    return obj + arg1;
                }
                else {
                    return parseFloat(obj) + parseFloat(arg1);
                }
            },
            Sub: function (obj, runtime, args) {
                var arg1 = _this_1.args[0].evaluate(runtime, args);
                if (isNaN(parseFloat(obj)) || isNaN(parseFloat(arg1))) {
                    return "ERROR";
                }
                else {
                    return parseFloat(obj) - parseFloat(arg1);
                }
            },
            Translate: function (obj, runtime, args) {
                var evaluatedArgs = _this_1.args.map(function (arg) { return arg.evaluate(runtime, args); });
                var evaluatedObj = parseInt(obj);
                if (evaluatedObj >= evaluatedArgs.length || evaluatedObj < 0) {
                    return evaluatedArgs[0];
                }
                else {
                    return evaluatedArgs[evaluatedObj + 1];
                }
            },
            Capitalize: function (obj, runtime, args) {
                if (typeof obj === "string") {
                    var strObj = obj;
                    if (strObj.length === 0)
                        return strObj;
                    return strObj[0].toUpperCase() + strObj.substr(1);
                }
                else {
                    return obj;
                }
            }
        };
        return _this_1;
    }
    return AlterianMethodCall;
}(ExprNode));
exports.AlterianMethodCall = AlterianMethodCall;
/*
Since we're interpreting the parse nodes directly we can't simply directly
return from a function. We have to unroll the stack until we reach the function block.

A much simpler hack to do this is to simply throw an expection and catch it at function scope.
We check if the caught value has '__isReturnException' and we know it's a returned value, at which point we
return it naturally from the function.
*/
var ReturnException = /** @class */ (function () {
    function ReturnException(value) {
        this.value = value;
        this.__isReturnException = true;
    }
    return ReturnException;
}());
var FuncExpr = /** @class */ (function (_super) {
    __extends(FuncExpr, _super);
    function FuncExpr() {
        var _this_1 = _super.call(this, ExprType.Function) || this;
        _this_1.params = [];
        _this_1.evaluate = function (runtime, args) {
            var closure = new closure_1.FuncClosure();
            closure.funcExpr = _this_1;
            closure.runtime = runtime;
            closure.scope = runtime.getFullScope();
            var _this = _this_1;
            closure.func = function () {
                var funcArgs = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    funcArgs[_i] = arguments[_i];
                }
                closure.runtime.pushStack(closure);
                closure.runtime.pushScope(closure.scope);
                closure.runtime.pushScope(_this.mapArgsToScope(closure.funcExpr.params, funcArgs));
                try {
                    _this.body.evaluate(closure.runtime, __assign({}, args, funcArgs));
                }
                catch (e) {
                    if (e.__isReturnException) {
                        closure.runtime.popScope();
                        closure.runtime.popScope();
                        closure.runtime.popStack();
                        return e.value;
                    }
                    else {
                        throw e;
                    }
                }
                //const result = _this.body.evaluate(closure.runtime, {...args, ...funcArgs});
                closure.runtime.popScope();
                closure.runtime.popScope();
                closure.runtime.popStack();
                //return result;
            };
            return closure;
            //return (...args) => { return closure.evaluate(runtime, args); };
        };
        _this_1.mapArgsToScope = function (params, args) {
            var scope = {};
            params.forEach(function (param, index) {
                scope[param] = args[index];
            });
            return scope;
        };
        return _this_1;
    }
    return FuncExpr;
}(ExprNode));
exports.FuncExpr = FuncExpr;
var IfExpr = /** @class */ (function (_super) {
    __extends(IfExpr, _super);
    function IfExpr() {
        var _this_1 = _super.call(this, ExprType.IfRules) || this;
        /*
        Explicitly states that the if-statement is an expression.
    
        This means that we don't have to explicitly return values from the 'then' and 'else'
        blocks, we can just put the values and they will be automatically returned
    
        This is because an if-statement essentially is syntactic sugar for a ternary operator
        */
        _this_1.setAsExpression = function (returnOnFirstValue) {
            if (returnOnFirstValue === void 0) { returnOnFirstValue = true; }
            if (_this_1.result.stmtType == StmtType.Block) {
                _this_1.result.returnOnFirstValue = returnOnFirstValue;
            }
            if (_this_1.elseResult && _this_1.elseResult.stmtType == StmtType.Block) {
                _this_1.elseResult.returnOnFirstValue = returnOnFirstValue;
            }
        };
        _this_1.generateVarConfig = function (runtime, args) {
            var varConfig = {
                default: '',
                rules: []
            };
            var cur = _this_1;
            while (cur && cur.stmtType == StmtType.Expr && cur.exprType == ExprType.IfRules) {
                var ifExpr = cur;
                var conditions = [];
                ifExpr.condition.generateConditions(runtime, args, conditions);
                var resultStmt = ifExpr.result;
                var evaluatedResult = resultStmt.evaluate(runtime, args);
                var type = typeof evaluatedResult;
                var isHtml = evaluatedResult instanceof HTMLExpr;
                if (type !== "number" && type !== "boolean" && type !== "string" && !isHtml && !evaluatedResult.__isYielded) {
                    throw new errors_1.CompilerError("Illegal result type '" + type + "'. Yielded conditional expressions must result in 'boolean', 'number', 'string' or 'html'", ifExpr.startPosition, ifExpr.endPosition);
                }
                varConfig.rules.push({
                    conditions: conditions,
                    result: evaluatedResult + ''
                });
                if (ifExpr.elseResult) {
                    cur = ifExpr.elseResult;
                }
                else {
                    cur = null;
                }
            }
            if (cur) {
                varConfig.default = cur.evaluate(runtime, args) + '';
            }
            return varConfig;
        };
        _this_1.evaluate = function (runtime, args) {
            // Wrap in try/catch and see if it throws a 'cannot resolve'
            // This means it's trying to load a public var and can't resolve at runtime
            // so we instead create a section variable
            try {
                var result = undefined;
                if (runtime.checkForYieldedLoad(function () { return _this_1.condition.evaluate(runtime, args); }))
                    result = _this_1.result.evaluate(runtime, args);
                else if (_this_1.elseResult)
                    result = _this_1.elseResult.evaluate(runtime, args);
                return result;
            }
            catch (e) {
                if (e.__cannotResolveException === true) {
                    runtime.shouldThrowOnYieldedLoad = false;
                    /*
                    In the case that we have a function as such:
                    const MyComponent = () => {
                        if (SomeYieldedVar == 5) {
                            return <p>foo</p>;
                        }
                    };
    
                    The intuition is that it will return <p>foo</p> when SomeYieldedVar=5
                    But actually the if-statement is an expression, that, in this case, resolves to a
                    logic variable. Since the if-statement itself isn't being returned, the return value of
                    MyComponent is undefined.
    
                    In these cases, we want to trick it into returning the logic variable immediately
                    by telling the enclosing block to return it as soon as it's resolved, without
                    having to explicitly state the return
                    */
                    if (_this_1.enclosingBlock) {
                        _this_1.enclosingBlock.returnOnFirstValue = true;
                        _this_1.enclosingBlock.forceThrowReturn = true;
                    }
                    return runtime.generateDynamicSection(_this_1.generateVarConfig(runtime, args)).toString();
                }
                else {
                    throw e;
                }
            }
        };
        return _this_1;
    }
    return IfExpr;
}(ExprNode));
exports.IfExpr = IfExpr;
var HTMLExprType;
(function (HTMLExprType) {
    HTMLExprType["Document"] = "document";
    HTMLExprType["Element"] = "element";
    HTMLExprType["Text"] = "text";
    HTMLExprType["Dynamic"] = "dynamic";
    HTMLExprType["DocType"] = "doctype";
    HTMLExprType["Comment"] = "comment";
    HTMLExprType["Other"] = "other";
})(HTMLExprType = exports.HTMLExprType || (exports.HTMLExprType = {}));
var HTMLExpr = /** @class */ (function (_super) {
    __extends(HTMLExpr, _super);
    function HTMLExpr(htmlType) {
        var _this_1 = _super.call(this, ExprType.HTML) || this;
        _this_1.htmlType = htmlType;
        _this_1.content = function () { return ""; };
        _this_1.innerText = _this_1.content();
        _this_1.innerHTML = "";
        _this_1.attr = function (attrName) { return ""; };
        return _this_1;
    }
    return HTMLExpr;
}(ExprNode));
exports.HTMLExpr = HTMLExpr;
var HTMLDoc = /** @class */ (function (_super) {
    __extends(HTMLDoc, _super);
    function HTMLDoc() {
        var _this_1 = _super.call(this, HTMLExprType.Document) || this;
        _this_1.index = {};
        _this_1.content = function () { return _this_1.root.content(); };
        _this_1.evaluate = function (runtime, args) { return _this_1.root.evaluate(runtime, args); };
        _this_1.getElementById = function (id) { return _this_1.index[id]; };
        _this_1.getElementsByTagName = function (tagName) {
            var elements = [];
            _this_1._collectElementsByTagName(tagName, _this_1.root, elements);
            return elements;
        };
        _this_1._collectElementsByTagName = function (tagName, element, elements) {
            if (element.htmlType == HTMLExprType.Element) {
                var elem = element;
                if (elem.tag == tagName) {
                    elements.push(elem);
                }
                elem.childNodes.forEach(function (child) { return _this_1._collectElementsByTagName(tagName, child, elements); });
            }
        };
        return _this_1;
    }
    return HTMLDoc;
}(HTMLExpr));
exports.HTMLDoc = HTMLDoc;
var HTMLElemExpr = /** @class */ (function (_super) {
    __extends(HTMLElemExpr, _super);
    function HTMLElemExpr() {
        var _this_1 = _super.call(this, HTMLExprType.Element) || this;
        _this_1.tag = "";
        _this_1.attributes = {};
        _this_1.childNodes = [];
        _this_1.selfClosing = false;
        _this_1.content = function () {
            return entities.decode(_this_1.childNodes.map(function (child) {
                if (child === undefined)
                    return "";
                if (util_1.isString(child)) {
                    return child;
                }
                else {
                    if (child.content) {
                        return child.content();
                    }
                    else {
                        return child.toString();
                    }
                }
            }).join(''));
        };
        _this_1.attr = function (attrName) { return _this_1.attributes[attrName]; };
        _this_1.evaluateAttributes = function (runtime, args) {
            var evaluatedAttrs = {};
            var _this = _this_1;
            Object.keys(_this_1.attributes).forEach(function (attr) {
                evaluatedAttrs[attr] = _this.attributes[attr].evaluate(runtime, args);
            });
            return evaluatedAttrs;
        };
        _this_1.resolveChildren = function (runtime, args, node) {
            var evaluated = _this_1.childNodes.map(function (child) { return child.evaluate(runtime, args); });
            if (evaluated.find(function (val) { return val === undefined; })) {
                debugger;
            }
            evaluated.forEach(function (child) {
                if (util_1.isArray(child)) {
                    var childArray = child;
                    childArray.forEach(function (subChild) {
                        node.childNodes.push(subChild);
                    });
                }
                else {
                    node.childNodes.push(child);
                }
            });
        };
        _this_1.resolveComponentChildren = function (runtime, args) {
            var children = [];
            _this_1.childNodes.map(function (child) { return child.evaluate(runtime, args); }).forEach(function (child) {
                if (util_1.isArray(child)) {
                    var childArray = child;
                    childArray.forEach(function (subChild) {
                        children.push(subChild);
                    });
                }
                else {
                    children.push(child);
                }
            });
            return children;
        };
        _this_1.evaluateComponent = function (runtime, args) {
            var dummyLoad = new LoadExpr(_this_1.tag);
            var resolvedAttributes = _this_1.evaluateAttributes(runtime, args);
            var func = dummyLoad.evaluate(runtime, __assign({}, args, resolvedAttributes));
            var funcExpr = func.funcExpr;
            // Need to convert attributes to ordered array
            var attributeArray = [];
            funcExpr.params.forEach(function (param, index) {
                if (param == "children") {
                    attributeArray.push(_this_1.resolveComponentChildren(runtime, args));
                }
                else {
                    attributeArray.push(resolvedAttributes[param]);
                }
            });
            try {
                return func.evaluate(runtime, attributeArray);
            }
            catch (e) {
                if (e.__externalPluginError) {
                    throw new errors_1.PluginError(e.msg, _this_1.startPosition, _this_1.endPosition);
                }
                else {
                    throw e;
                }
            }
        };
        _this_1.evaluateHtml = function (runtime, args) {
            var evaluatedHtml = new HTMLElemExpr();
            evaluatedHtml.tag = _this_1.tag;
            evaluatedHtml.selfClosing = _this_1.selfClosing;
            evaluatedHtml.attributes = _this_1.evaluateAttributes(runtime, args);
            _this_1.resolveChildren(runtime, args, evaluatedHtml);
            evaluatedHtml.toString = function () {
                var resolvedAttrs = Object.keys(evaluatedHtml.attributes).map(function (attr) {
                    return " " + attr + "=\"" + evaluatedHtml.attributes[attr] + "\"";
                }).join('');
                if (_this_1.selfClosing) {
                    return "<" + _this_1.tag + " " + resolvedAttrs + " />";
                }
                var resolvedChildren = evaluatedHtml.childNodes.map(function (child) { return child ? child.toString() : ''; }).join('');
                if (_this_1.tag == "") {
                    return resolvedChildren;
                }
                return "<" + _this_1.tag + resolvedAttrs + ">" + resolvedChildren + "</" + _this_1.tag + ">";
            };
            return evaluatedHtml;
        };
        _this_1.evaluate = function (runtime, args) {
            var result = null;
            // First check if it's a known function
            var local = runtime.getLocal(_this_1.tag);
            if (local && local.__isClosure) {
                result = _this_1.evaluateComponent(runtime, args);
            }
            else {
                result = _this_1.evaluateHtml(runtime, args);
            }
            if (result === undefined) {
                throw new errors_1.RuntimeError("Cannot evaluate component '" + _this_1.tag + "'", _this_1.startPosition, _this_1.endPosition);
            }
            else if (util_1.isString(result)) {
                _this_1.innerHTML = result + '';
            }
            else if (result.htmlType) {
                result.innerHTML = result + '';
            }
            return result;
        };
        return _this_1;
    }
    return HTMLElemExpr;
}(HTMLExpr));
exports.HTMLElemExpr = HTMLElemExpr;
var HTMLTextExpr = /** @class */ (function (_super) {
    __extends(HTMLTextExpr, _super);
    function HTMLTextExpr(text) {
        var _this_1 = _super.call(this, HTMLExprType.Text) || this;
        _this_1.text = text;
        _this_1.content = function () { return _this_1.text; };
        _this_1.evaluate = function (runtime, args) {
            return _this_1.text;
        };
        return _this_1;
    }
    return HTMLTextExpr;
}(HTMLExpr));
exports.HTMLTextExpr = HTMLTextExpr;
var HTMLDynExpr = /** @class */ (function (_super) {
    __extends(HTMLDynExpr, _super);
    function HTMLDynExpr() {
        var _this_1 = _super.call(this, HTMLExprType.Dynamic) || this;
        _this_1.content = function () { return ""; };
        _this_1.evaluate = function (runtime, args) {
            return _this_1.expr.evaluate(runtime, args);
        };
        return _this_1;
    }
    return HTMLDynExpr;
}(HTMLExpr));
exports.HTMLDynExpr = HTMLDynExpr;
var HTMLDocType = /** @class */ (function (_super) {
    __extends(HTMLDocType, _super);
    function HTMLDocType() {
        var _this_1 = _super.call(this, HTMLExprType.DocType) || this;
        _this_1.values = [];
        _this_1.evaluate = function (runtime, args) {
            return _this_1;
        };
        _this_1.toString = function () {
            return "<!DOCTYPE " + _this_1.values.join(' ') + ">";
        };
        return _this_1;
    }
    return HTMLDocType;
}(HTMLExpr));
exports.HTMLDocType = HTMLDocType;
var HTMLComment = /** @class */ (function (_super) {
    __extends(HTMLComment, _super);
    function HTMLComment(comment) {
        var _this_1 = _super.call(this, HTMLExprType.Comment) || this;
        _this_1.evaluate = function (runtime, args) {
            return _this_1;
        };
        _this_1.toString = function () {
            return "<!--" + _this_1.comment + "-->";
        };
        _this_1.comment = comment;
        return _this_1;
    }
    return HTMLComment;
}(HTMLExpr));
exports.HTMLComment = HTMLComment;
var TemplateNode = /** @class */ (function (_super) {
    __extends(TemplateNode, _super);
    function TemplateNode() {
        var _this_1 = _super.call(this, ExprType.Template) || this;
        _this_1.expressions = [];
        _this_1.evaluate = function (runtime, args) {
            return _this_1.expressions.map(function (expr) { return expr.evaluate(runtime, args); }).join('');
        };
        return _this_1;
    }
    return TemplateNode;
}(ExprNode));
exports.TemplateNode = TemplateNode;
//# sourceMappingURL=parsenodes.js.map