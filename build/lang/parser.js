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
var errors_1 = require("./errors");
var lexer_1 = require("./lexer");
var parsenodes_1 = require("./parsenodes");
var Parser = /** @class */ (function () {
    function Parser() {
        var _this = this;
        this.parseHTMLDoc = function (fileName, input, visitor) {
            _this._lexer = new lexer_1.Lexer(fileName, input);
            var doc = new parsenodes_1.HTMLDoc();
            doc.startPosition = _this._lexer.getStartPosition();
            doc.root = _this.parseHTML(doc, visitor);
            doc.endPosition = _this._lexer.getEndPosition();
            return doc;
        };
        this.parseFile = function (fileName) {
            var input = fs.readFileSync(fileName, { encoding: "utf8" });
            return _this.parseInput(fileName, input);
        };
        this.parseInput = function (fileName, input) {
            var rootNode = new parsenodes_1.RootNode();
            _this._lexer = new lexer_1.Lexer(fileName, input);
            rootNode.startPosition = _this._lexer.getStartPosition();
            var _loop_1 = function () {
                // Check for yields
                if (_this._lexer.check(lexer_1.TokenType.KW_Yield)) {
                    var yields_1 = _this.parseYields();
                    var yieldVars_1 = {};
                    var yieldLookups_1 = {};
                    Object.keys(yields_1).forEach(function (key) {
                        if (yields_1[key].type == parsenodes_1.NodeType.Var) {
                            yieldVars_1[key] = yields_1[key];
                        }
                        else if (yields_1[key].type == parsenodes_1.NodeType.Lookup) {
                            yieldLookups_1[key] = yields_1[key];
                        }
                    });
                    rootNode.yields = __assign({}, rootNode.yields, yieldVars_1);
                    rootNode.lookups = __assign({}, rootNode.lookups, yieldLookups_1);
                }
                // Imports
                else if (_this._lexer.check(lexer_1.TokenType.KW_Import)) {
                    rootNode.imports.push(_this.parseImport());
                }
                // Exports
                else if (_this._lexer.check(lexer_1.TokenType.KW_Export)) {
                    rootNode.statements.push(_this.parseExport());
                }
                // Everything else
                else {
                    rootNode.statements.push(_this.parseStatement());
                }
            };
            while (_this._lexer.check()) {
                _loop_1();
            }
            rootNode.endPosition = _this._lexer.getEndPosition();
            return rootNode;
        };
        this.parseExport = function () {
            _this._lexer.accept(lexer_1.TokenType.KW_Export);
            var statement = _this.parseStatement();
            statement.setExported();
            return statement;
        };
        this.parseImport = function () {
            var importNode = new parsenodes_1.ImportNode();
            importNode.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept();
            if (_this._lexer.checkOp('*')) {
                _this._lexer.accept();
                _this._lexer.accept(lexer_1.TokenType.KW_As);
                importNode.asName = _this._lexer.accept(lexer_1.TokenType.Ident).value;
                _this._lexer.accept(lexer_1.TokenType.KW_From);
            }
            else if (_this._lexer.check(lexer_1.TokenType.BraceOpen)) {
                _this._lexer.accept();
                importNode.members = [];
                if (!_this._lexer.check(lexer_1.TokenType.BraceClose)) {
                    importNode.members.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                    while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                        _this._lexer.accept();
                        importNode.members.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                    }
                }
                _this._lexer.accept(lexer_1.TokenType.BraceClose);
                _this._lexer.accept(lexer_1.TokenType.KW_From);
            }
            importNode.file = _this._lexer.accept(lexer_1.TokenType.String).value;
            if (_this._lexer.check(lexer_1.TokenType.Semicolon)) {
                _this._lexer.accept();
            }
            importNode.endPosition = _this._lexer.getEndPosition();
            return importNode;
        };
        this.parseYields = function () {
            _this._lexer.accept();
            var vars = {};
            var parsed = _this.parseYield();
            vars[parsed.name] = parsed;
            while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                _this._lexer.accept();
                parsed = _this.parseYield();
                vars[parsed.name] = parsed;
            }
            if (_this._lexer.check(lexer_1.TokenType.Semicolon)) {
                _this._lexer.accept(lexer_1.TokenType.Semicolon);
            }
            return vars;
        };
        this.parseYield = function () {
            var varNode = new parsenodes_1.YieldNode();
            varNode.startPosition = _this._lexer.getStartPosition();
            varNode.name = _this._lexer.accept(lexer_1.TokenType.Ident).value;
            if (_this._lexer.check(lexer_1.TokenType.Arrow)) {
                _this._lexer.accept();
                varNode.lookup = _this._lexer.accept(lexer_1.TokenType.Ident).value;
            }
            if (_this._lexer.checkOp('=')) {
                _this._lexer.accept();
                varNode.value = _this.parseExpression();
                if (varNode.value && varNode.value.exprType !== parsenodes_1.ExprType.Literal) {
                    if (varNode.value.exprType == parsenodes_1.ExprType.Object) {
                        var itemsObj_1 = varNode.value;
                        var lookupNode_1 = new parsenodes_1.LookupTableNode(itemsObj_1);
                        lookupNode_1.name = varNode.name;
                        lookupNode_1.startPosition = varNode.startPosition;
                        Object.keys(itemsObj_1.values).forEach(function (key) {
                            lookupNode_1.items[key] = itemsObj_1.values[key];
                        });
                        lookupNode_1.endPosition = _this._lexer.getEndPosition();
                        return lookupNode_1;
                    } /*else {
                        throw new CompilerError(`Expected literal value`, varNode.startPosition, this._lexer.getEndPosition());
                    }*/
                }
            }
            return varNode;
        };
        this.parseStatement = function () {
            switch (_this._lexer.check().type) {
                case lexer_1.TokenType.Semicolon:
                    _this._lexer.accept();
                    return new parsenodes_1.NoopStmt();
                case lexer_1.TokenType.KW_Describe: return _this.parseDescribe();
                case lexer_1.TokenType.KW_Return: return _this.parseReturn();
                case lexer_1.TokenType.BraceOpen: return _this.parseBlock();
                case lexer_1.TokenType.KW_Class: return _this.parseClassDecl();
                case lexer_1.TokenType.KW_If: return _this.parseIf();
                case lexer_1.TokenType.KW_Var:
                case lexer_1.TokenType.KW_Let:
                case lexer_1.TokenType.KW_Const: return _this.parseVarDecl();
                case lexer_1.TokenType.KW_Function: return _this.parseFuncDecl();
                case lexer_1.TokenType.KW_While: return _this.parseWhile();
                case lexer_1.TokenType.KW_Do: return _this.parseDoWhile();
                case lexer_1.TokenType.KW_For: {
                    /*
                    'for' is ambiguous as it might be a normal for-loop, i.e., for (var a = 0; a < 10; a++)
                    or it might be a 'for-of', i.e. for (var a of list)
    
                    We can't know until a few tokens in, so we start by trying to parse a regular for loop
                    and it that fails we revert back to the start and parse a for-of
                    */
                    var revertPosition = _this._lexer.getPosition();
                    var startPosition = _this._lexer.getStartPosition();
                    try {
                        return _this.parseFor();
                    }
                    catch (e) {
                        try {
                            _this._lexer.revert(startPosition);
                            return _this.parseForOf();
                        }
                        catch (e) {
                            _this._lexer.revert(revertPosition);
                            return _this.parseForOf();
                        }
                    }
                }
                default: {
                    var expr = _this.parseExpression();
                    if (_this._lexer.check(lexer_1.TokenType.Semicolon)) {
                        _this._lexer.accept(lexer_1.TokenType.Semicolon);
                    }
                    // Ensure correct assignments
                    if (expr.exprType == parsenodes_1.ExprType.Operator && expr.opType == '=') {
                        _this.verifyLValue(expr.expr1);
                    }
                    return expr;
                }
            }
        };
        this.parseDescribe = function () {
            var descNode = new parsenodes_1.DescribeNode();
            descNode.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.KW_Describe);
            _this._lexer.accept(lexer_1.TokenType.ParOpen);
            descNode.description = _this._lexer.accept(lexer_1.TokenType.String).value;
            _this._lexer.accept(lexer_1.TokenType.Comma);
            _this._lexer.accept(lexer_1.TokenType.SquareOpen);
            if (!_this._lexer.check(lexer_1.TokenType.SquareClose)) {
                descNode.testRuns.push(_this.parseTestOrTodo());
                while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                    _this._lexer.accept();
                    // Allow trailing comma
                    if (_this._lexer.check(lexer_1.TokenType.SquareClose)) {
                        break;
                    }
                    descNode.testRuns.push(_this.parseTestOrTodo());
                }
            }
            _this._lexer.accept(lexer_1.TokenType.SquareClose);
            _this._lexer.accept(lexer_1.TokenType.ParClose);
            if (_this._lexer.check(lexer_1.TokenType.Semicolon)) {
                _this._lexer.accept(lexer_1.TokenType.Semicolon);
            }
            descNode.endPosition = _this._lexer.getEndPosition();
            return descNode;
        };
        this.parseTestOrTodo = function () {
            if (_this._lexer.checkIdent("run")) {
                return _this.parseTestRun();
            }
            else if (_this._lexer.checkIdent("todo")) {
                return _this.parseTodoRun();
            }
            else {
                throw new errors_1.CompilerError("Expected 'run' or 'todo'", _this._lexer.getStartPosition(), _this._lexer.getEndPosition());
            }
        };
        this.parseTodoRun = function () {
            var todoNode = new parsenodes_1.RunTodoNode();
            todoNode.startPosition = _this._lexer.getStartPosition();
            _this._lexer.acceptIdent("todo");
            _this._lexer.accept(lexer_1.TokenType.ParOpen);
            todoNode.description = _this._lexer.accept(lexer_1.TokenType.String).value;
            // Allow trailing comma
            if (_this._lexer.check(lexer_1.TokenType.Comma)) {
                _this._lexer.accept();
            }
            _this._lexer.accept(lexer_1.TokenType.ParClose);
            todoNode.endPosition = _this._lexer.getEndPosition();
            return todoNode;
        };
        this.parseTestRun = function () {
            var runNode = new parsenodes_1.RunTestNode();
            runNode.startPosition = _this._lexer.getStartPosition();
            _this._lexer.acceptIdent("run");
            _this._lexer.accept(lexer_1.TokenType.ParOpen);
            runNode.description = _this._lexer.accept(lexer_1.TokenType.String).value;
            _this._lexer.accept(lexer_1.TokenType.Comma);
            _this._lexer.accept(lexer_1.TokenType.BraceOpen);
            if (!_this._lexer.check(lexer_1.TokenType.BraceClose)) {
                var varName = _this._lexer.accept(lexer_1.TokenType.Ident).value;
                _this._lexer.accept(lexer_1.TokenType.Colon);
                runNode.settings[varName] = _this.parseExpression();
                while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                    _this._lexer.accept();
                    // Allow trailing comma
                    if (_this._lexer.check(lexer_1.TokenType.BraceClose)) {
                        break;
                    }
                    varName = _this._lexer.accept(lexer_1.TokenType.Ident).value;
                    _this._lexer.accept(lexer_1.TokenType.Colon);
                    runNode.settings[varName] = _this.parseExpression();
                }
            }
            _this._lexer.accept(lexer_1.TokenType.BraceClose);
            _this._lexer.accept(lexer_1.TokenType.Comma);
            runNode.assertion = _this.parseExpression();
            // Allow trailing comma
            if (_this._lexer.check(lexer_1.TokenType.Comma)) {
                _this._lexer.accept();
            }
            _this._lexer.accept(lexer_1.TokenType.ParClose);
            runNode.endPosition = _this._lexer.getEndPosition();
            return runNode;
        };
        this.parseWhile = function () {
            var whileLoop = new parsenodes_1.WhileStmt();
            whileLoop.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.KW_While);
            _this._lexer.accept(lexer_1.TokenType.ParOpen);
            whileLoop.condition = _this.parseExpression();
            _this._lexer.accept(lexer_1.TokenType.ParClose);
            whileLoop.body = _this.parseStatement();
            whileLoop.endPosition = _this._lexer.getEndPosition();
            return whileLoop;
        };
        this.parseFor = function () {
            var forLoop = new parsenodes_1.ForStmt();
            forLoop.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.KW_For);
            _this._lexer.accept(lexer_1.TokenType.ParOpen);
            forLoop.init = _this.parseStatement();
            forLoop.condition = _this.parseExpression();
            _this._lexer.accept(lexer_1.TokenType.Semicolon);
            forLoop.after = _this.parseStatement();
            _this._lexer.accept(lexer_1.TokenType.ParClose);
            forLoop.body = _this.parseStatement();
            forLoop.endPosition = _this._lexer.getEndPosition();
            return forLoop;
        };
        this.parseForOf = function () {
            var forLoop = new parsenodes_1.ForOfStmt();
            forLoop.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.KW_For);
            _this._lexer.accept(lexer_1.TokenType.ParOpen);
            if (_this._lexer.check(lexer_1.TokenType.KW_Var)) {
                _this._lexer.accept();
                forLoop.initDecl = "var";
            }
            else if (_this._lexer.check(lexer_1.TokenType.KW_Let)) {
                _this._lexer.accept();
                forLoop.initDecl = "let";
            }
            else if (_this._lexer.check(lexer_1.TokenType.KW_Const)) {
                _this._lexer.accept();
                forLoop.initDecl = "const";
            }
            forLoop.initLoad = _this._lexer.accept(lexer_1.TokenType.Ident).value;
            _this._lexer.accept(lexer_1.TokenType.KW_Of);
            forLoop.collection = _this.parseExpression();
            _this._lexer.accept(lexer_1.TokenType.ParClose);
            forLoop.body = _this.parseStatement();
            forLoop.endPosition = _this._lexer.getEndPosition();
            return forLoop;
        };
        this.parseDoWhile = function () {
            var doLoop = new parsenodes_1.DoWhileStmt();
            doLoop.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.KW_Do);
            doLoop.body = _this.parseStatement();
            _this._lexer.accept(lexer_1.TokenType.KW_While);
            _this._lexer.accept(lexer_1.TokenType.ParOpen);
            doLoop.condition = _this.parseExpression();
            _this._lexer.accept(lexer_1.TokenType.ParClose);
            doLoop.endPosition = _this._lexer.getEndPosition();
            return doLoop;
        };
        this.verifyLValue = function (expr) {
            switch (expr.exprType) {
                case parsenodes_1.ExprType.Load:
                case parsenodes_1.ExprType.AccessArr:
                case parsenodes_1.ExprType.AccessObj:
                    break;
                default:
                    throw new errors_1.CompilerError("Illegal l-value", expr.startPosition, expr.endPosition, true);
            }
        };
        this.parseVarDecl = function () {
            var varNode = new parsenodes_1.VarDeclStmt();
            varNode.startPosition = _this._lexer.getStartPosition();
            var keyword = _this._lexer.accept();
            if (keyword.type == lexer_1.TokenType.KW_Const) {
                varNode.isConst = true;
            }
            varNode.name = _this._lexer.accept(lexer_1.TokenType.Ident).value;
            if (_this._lexer.checkOp('=')) {
                _this._lexer.accept();
                varNode.value = _this.parseExpression();
            }
            else if (varNode.isConst) {
                throw new errors_1.CompilerError("Const variable '" + varNode.name + "' must be immediately assigned", varNode.startPosition, _this._lexer.getEndPosition());
            }
            if (_this._lexer.check(lexer_1.TokenType.Semicolon)) {
                _this._lexer.accept(lexer_1.TokenType.Semicolon);
            }
            varNode.endPosition = _this._lexer.getEndPosition();
            return varNode;
        };
        this.parseClassDecl = function () {
            var className = "";
            var classExpr = _this.parseClass(function (name) {
                className = name;
            });
            var varDecl = new parsenodes_1.VarDeclStmt();
            varDecl.name = className;
            varDecl.value = classExpr;
            return varDecl;
        };
        this.parseClass = function (onGetName) {
            // A class is syntactic sugar for a self-calling function, within it having a block
            // declaring the constructor and each method
            if (onGetName === void 0) { onGetName = null; }
            // The inner function to call
            var scopeFunc = new parsenodes_1.FuncExpr();
            var body = new parsenodes_1.BlockStmt();
            scopeFunc.body = body;
            // The call that calls scopeFunc()
            var funcCall = new parsenodes_1.CallExpr();
            funcCall.func = scopeFunc;
            funcCall.startPosition = _this._lexer.getStartPosition();
            // Parse
            _this._lexer.accept(lexer_1.TokenType.KW_Class);
            // Check if there's a name otherwise use a dummy name
            var name = "";
            if (_this._lexer.check(lexer_1.TokenType.Ident)) {
                name = _this._lexer.accept(lexer_1.TokenType.Ident).value;
                if (onGetName) {
                    onGetName(name);
                }
            }
            else {
                name = "class_1";
            }
            _this._lexer.accept(lexer_1.TokenType.BraceOpen);
            while (!_this._lexer.check(lexer_1.TokenType.BraceClose)) {
                if (_this._lexer.check(lexer_1.TokenType.KW_Constructor)) {
                    body.statements.push(_this.parseConstructor(name));
                }
                else if (_this._lexer.check(lexer_1.TokenType.Ident)) {
                    var fieldName = _this._lexer.accept().value;
                    // Check if shortcut for method
                    var value = null;
                    if (_this._lexer.check(lexer_1.TokenType.ParOpen)) {
                        var funcExpr = new parsenodes_1.FuncExpr();
                        funcExpr.startPosition = _this._lexer.getStartPosition();
                        _this._lexer.accept(lexer_1.TokenType.ParOpen);
                        if (!_this._lexer.check(lexer_1.TokenType.ParClose)) {
                            funcExpr.params.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                            while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                                _this._lexer.accept();
                                // Allow trailing commas
                                if (_this._lexer.check(lexer_1.TokenType.ParClose)) {
                                    break;
                                }
                                funcExpr.params.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                            }
                        }
                        _this._lexer.accept(lexer_1.TokenType.ParClose);
                        funcExpr.body = _this.parseBlock(true);
                        funcExpr.endPosition = _this._lexer.getEndPosition();
                        value = funcExpr;
                    }
                    else {
                        _this._lexer.acceptOp("=");
                        value = _this.parseExpression();
                        if (_this._lexer.check(lexer_1.TokenType.Semicolon)) {
                            _this._lexer.accept(lexer_1.TokenType.Semicolon);
                        }
                    }
                    // Add to prototype
                    var protoLoad = new parsenodes_1.AccessObjExpr();
                    protoLoad.obj = new parsenodes_1.LoadExpr(name);
                    protoLoad.prop = "prototype";
                    var fieldLoad = new parsenodes_1.AccessObjExpr();
                    fieldLoad.obj = protoLoad;
                    fieldLoad.prop = fieldName;
                    var store = new parsenodes_1.OpExpr("=");
                    store.expr1 = fieldLoad;
                    store.expr2 = value;
                    body.statements.push(store);
                }
                else {
                    throw new errors_1.CompilerError("Expected 'constructor' or declaration", _this._lexer.getPosition());
                }
            }
            _this._lexer.accept(lexer_1.TokenType.BraceClose);
            // Return function
            var finalReturn = new parsenodes_1.ReturnStmt();
            finalReturn.expr = new parsenodes_1.LoadExpr(name);
            body.statements.push(finalReturn);
            funcCall.endPosition = _this._lexer.getEndPosition();
            return funcCall;
        };
        this.parseConstructor = function (className) {
            var varDecl = new parsenodes_1.VarDeclStmt();
            varDecl.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.KW_Constructor);
            varDecl.name = className;
            var funcExpr = new parsenodes_1.FuncExpr();
            varDecl.value = funcExpr;
            funcExpr.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.ParOpen);
            if (!_this._lexer.check(lexer_1.TokenType.ParClose)) {
                funcExpr.params.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                    _this._lexer.accept();
                    // Allow trailing commas
                    if (_this._lexer.check(lexer_1.TokenType.ParClose)) {
                        break;
                    }
                    funcExpr.params.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                }
            }
            _this._lexer.accept(lexer_1.TokenType.ParClose);
            funcExpr.body = _this.parseBlock(true);
            funcExpr.endPosition = _this._lexer.getEndPosition();
            varDecl.endPosition = _this._lexer.getEndPosition();
            return varDecl;
        };
        this.parseFuncDecl = function () {
            var varDecl = new parsenodes_1.VarDeclStmt();
            varDecl.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.KW_Function);
            varDecl.name = _this._lexer.accept(lexer_1.TokenType.Ident).value;
            var funcExpr = new parsenodes_1.FuncExpr();
            varDecl.value = funcExpr;
            funcExpr.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.ParOpen);
            if (!_this._lexer.check(lexer_1.TokenType.ParClose)) {
                funcExpr.params.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                    _this._lexer.accept();
                    // Allow trailing commas
                    if (_this._lexer.check(lexer_1.TokenType.ParClose)) {
                        break;
                    }
                    funcExpr.params.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                }
            }
            _this._lexer.accept(lexer_1.TokenType.ParClose);
            funcExpr.body = _this.parseBlock(true);
            funcExpr.endPosition = _this._lexer.getEndPosition();
            varDecl.endPosition = _this._lexer.getEndPosition();
            return varDecl;
        };
        this.parseReturn = function () {
            var returnNode = new parsenodes_1.ReturnStmt();
            returnNode.startPosition = _this._lexer.getStartPosition();
            /*
            Need to check line numbers of return statement and return value for ASI
    
            If return value is after the return statement, it is not returned, and a semi-colon
            is automatically inserted after the return
            */
            var returnTokenLine = _this._lexer.getStartPosition().line;
            _this._lexer.accept(lexer_1.TokenType.KW_Return);
            var returnValueLine = _this._lexer.getStartPosition().line;
            if (!_this._lexer.check(lexer_1.TokenType.Semicolon) && returnValueLine === returnTokenLine) {
                returnNode.expr = _this.parseExpression();
            }
            if (_this._lexer.check(lexer_1.TokenType.Semicolon)) {
                _this._lexer.accept(lexer_1.TokenType.Semicolon);
            }
            returnNode.endPosition = _this._lexer.getEndPosition();
            return returnNode;
        };
        this.parseBlock = function (isFuncBlock) {
            if (isFuncBlock === void 0) { isFuncBlock = false; }
            var blockNode = new parsenodes_1.BlockStmt();
            blockNode.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.BraceOpen);
            while (!_this._lexer.check(lexer_1.TokenType.BraceClose)) {
                var stmt = _this.parseStatement();
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
    
                The runtime is able to find such cases. When it does it tells its enclosing block
                to return the first resolved value (in this case, the logic variable generated from
                    the if statement)
                
                To achieve this we need to tell the if-statement to remember its enclosing block
                so the runtime can then modify the block to return the generated logic variable
                */
                if (isFuncBlock && stmt.stmtType == parsenodes_1.StmtType.Expr && stmt.exprType == parsenodes_1.ExprType.IfRules) {
                    stmt.enclosingBlock = blockNode;
                }
                blockNode.statements.push(stmt);
            }
            _this._lexer.accept(lexer_1.TokenType.BraceClose);
            blockNode.endPosition = _this._lexer.getEndPosition();
            return blockNode;
        };
        // Template string
        this.parseTemplate = function () {
            var template = new parsenodes_1.TemplateNode();
            template.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept();
            _this._lexer.setTemplateContentStart(_this._lexer.getEndPosition().position);
            while (!_this._lexer.check(lexer_1.TokenType.TemplateTick)) {
                if (_this._lexer.isWhite(_this._lexer.getTemplateContentStart())) {
                    template.expressions.push(new parsenodes_1.LitExpr(_this._lexer.acceptTemplateText().value));
                    _this._lexer.setTemplateContentStart(_this._lexer.getPosition().position);
                }
                else if (_this._lexer.check(lexer_1.TokenType.TemplateExprStart)) {
                    _this._lexer.accept();
                    template.expressions.push(_this.parseExpression());
                    _this._lexer.accept(lexer_1.TokenType.BraceClose);
                    _this._lexer.setTemplateContentStart(_this._lexer.getEndPosition().position);
                }
                else {
                    template.expressions.push(new parsenodes_1.LitExpr(_this._lexer.acceptTemplateText().value));
                    _this._lexer.setTemplateContentStart(_this._lexer.getEndPosition().position + 1);
                }
            }
            _this._lexer.accept(lexer_1.TokenType.TemplateTick);
            template.endPosition = _this._lexer.getEndPosition();
            return template;
        };
        this.parseHTML = function (doc, visitor) {
            _this._lexer.accept();
            visitor = visitor || (function (node) { return node; });
            // Check for comments, doctype, etc
            if (_this._lexer.checkOp('!')) {
                _this._lexer.accept();
                // Doctype
                if (_this._lexer.checkIdent("doctype", true)) {
                    _this._lexer.accept();
                    var docTypeElem = new parsenodes_1.HTMLDocType();
                    while (!_this._lexer.check(lexer_1.TokenType.TagGT)) {
                        var docTypeValueToken = _this._lexer.accept();
                        if (docTypeValueToken.type == lexer_1.TokenType.String) {
                            docTypeElem.values.push('"' + docTypeValueToken.value + '"');
                        }
                        else {
                            docTypeElem.values.push(docTypeValueToken.value + '');
                        }
                    }
                    _this._lexer.accept(lexer_1.TokenType.TagGT);
                    return visitor(docTypeElem);
                }
                // Comments
                else if (_this._lexer.checkOp('--')) {
                    _this._lexer.accept();
                    var comment = _this._lexer.acceptRestOfHTMLComment().value;
                    _this._lexer.accept(lexer_1.TokenType.TagGT);
                    return visitor(new parsenodes_1.HTMLComment(comment));
                }
                else {
                    throw new errors_1.CompilerError("Expected 'DOCTYPE' or '--'", _this._lexer.getStartPosition());
                }
            }
            var startPosition = _this._lexer.getStartPosition();
            var tagName = "";
            if (_this._lexer.check(lexer_1.TokenType.Ident)) {
                tagName = _this._lexer.accept(lexer_1.TokenType.Ident).value;
            }
            var htmlNode = new parsenodes_1.HTMLElemExpr();
            htmlNode.tag = tagName;
            htmlNode.startPosition = startPosition;
            // Shortcut for id
            var id = "";
            if (tagName != "") {
                if (_this._lexer.check(lexer_1.TokenType.Dot)) {
                    _this._lexer.accept();
                    id = _this._lexer.accept(lexer_1.TokenType.Ident).value;
                    htmlNode.attributes["id"] = new parsenodes_1.LitExpr({ type: lexer_1.TokenType.String, value: id });
                }
            }
            // Get attributes
            while (_this._lexer.check(lexer_1.TokenType.Ident)) {
                var attrName = _this._lexer.acceptHTMLAttribute().value; // this._lexer.accept().value as string;
                if (_this._lexer.checkOp('=')) {
                    _this._lexer.acceptOp('=');
                    if (_this._lexer.check(lexer_1.TokenType.String)) {
                        var attrString = _this._lexer.accept();
                        htmlNode.attributes[attrName] = new parsenodes_1.LitExpr(attrString.value);
                        if (doc && attrName == "id") {
                            doc.index[attrString.value] = htmlNode;
                        }
                        /*if (attrName == "id") {
                            this._htmlIdIndex[attrString.value as string] = htmlNode;
                        }*/
                    }
                    else {
                        _this._lexer.accept(lexer_1.TokenType.BraceOpen);
                        htmlNode.attributes[attrName] = _this.parseExpression();
                        _this._lexer.accept(lexer_1.TokenType.BraceClose);
                    }
                }
                else {
                    htmlNode.attributes[attrName] = new parsenodes_1.LitExpr({ type: lexer_1.TokenType.Number, value: 1 });
                }
            }
            // Check if self-closing tag
            if (_this._lexer.check(lexer_1.TokenType.TagSelfClose)) {
                htmlNode.selfClosing = true;
                _this._lexer.accept();
            }
            else {
                _this._lexer.accept(lexer_1.TokenType.TagGT);
            }
            // If not self-closing we must parse child nodes
            if (!htmlNode.selfClosing) {
                // Script and style tags just get all as text
                if (htmlNode.tag == "style" || htmlNode.tag == "script") {
                    var textStart = _this._lexer.getStartPosition();
                    _this._lexer.setHTMLContentStart(textStart.position);
                    var text = _this._lexer.acceptHTMLText(false).value;
                    var htmlText = new parsenodes_1.HTMLTextExpr(text);
                    htmlText.startPosition = textStart;
                    htmlText.endPosition = _this._lexer.getEndPosition();
                    htmlNode.childNodes.push(htmlText);
                }
                else {
                    while (!_this._lexer.check(lexer_1.TokenType.TagClose)) {
                        _this._lexer.setHTMLContentStart(_this._lexer.getEndPosition().position);
                        // Parse html nodes
                        if (_this._lexer.check(lexer_1.TokenType.TagLT)) {
                            htmlNode.childNodes.push(_this.parseHTML(doc, visitor));
                        }
                        // Shortcut for if statements
                        else if (_this._lexer.check(lexer_1.TokenType.KW_If)) {
                            var dynStart = _this._lexer.getStartPosition();
                            var htmlExprNode = new parsenodes_1.HTMLDynExpr();
                            htmlExprNode.startPosition = dynStart;
                            htmlExprNode.expr = _this.parseIf();
                            htmlExprNode.endPosition = _this._lexer.getEndPosition();
                            htmlNode.childNodes.push(visitor(htmlExprNode));
                        }
                        // Parse expression nodes
                        else if (_this._lexer.check(lexer_1.TokenType.BraceOpen)) {
                            var dynStart = _this._lexer.getStartPosition();
                            _this._lexer.accept();
                            var htmlExprNode = new parsenodes_1.HTMLDynExpr();
                            htmlExprNode.startPosition = dynStart;
                            htmlExprNode.expr = _this.parseExpression();
                            _this._lexer.accept(lexer_1.TokenType.BraceClose);
                            htmlExprNode.endPosition = _this._lexer.getEndPosition();
                            htmlNode.childNodes.push(visitor(htmlExprNode));
                            // Check if there's any whitespace
                            if (_this._lexer.isWhite(_this._lexer.getEndPosition().position)) {
                                _this._lexer.setHTMLContentStart(_this._lexer.getEndPosition().position);
                                htmlNode.childNodes.push(visitor(new parsenodes_1.HTMLTextExpr(_this._lexer.acceptHTMLText().value)));
                            }
                        }
                        // Inner text
                        else {
                            var text = new parsenodes_1.HTMLTextExpr(_this._lexer.acceptHTMLText().value);
                            htmlNode.childNodes.push(visitor(text));
                        }
                    }
                    // If last one is white space, remove it
                    if (htmlNode.childNodes.length > 1 && htmlNode.childNodes[htmlNode.childNodes.length - 1].htmlType == parsenodes_1.HTMLExprType.Text) {
                        var lastNode = htmlNode.childNodes[htmlNode.childNodes.length - 1];
                        if (lastNode.text.trim() == '') {
                            htmlNode.childNodes.pop();
                        }
                    }
                }
                // Close tag
                _this._lexer.accept(lexer_1.TokenType.TagClose);
                if (tagName !== "") {
                    var closeTag = _this._lexer.accept(lexer_1.TokenType.Ident).value;
                    if (closeTag != tagName) {
                        throw new errors_1.CompilerError("Expected </" + tagName + ">", _this._lexer.getStartPosition());
                    }
                    // Optionally add id
                    if (_this._lexer.check(lexer_1.TokenType.Dot)) {
                        _this._lexer.accept();
                        _this._lexer.acceptIdent(id);
                    }
                }
                _this._lexer.accept(lexer_1.TokenType.TagGT);
            }
            htmlNode.endPosition = _this._lexer.getEndPosition();
            return visitor(htmlNode);
        };
        this.parseExpression = function () {
            /*
            We can't know an expression is an arrow function until we are
            already a few tokens in and find the =>
    
            So we assume every expression is going to be an arrow function and parse it as such
            and if the parsing fails, it reverts back to the start and parse the expression normally
            */
            return _this.tryParseArrowFunction(function () {
                return _this.parseExpressionNormally();
            });
        };
        this.tryParseArrowFunction = function (onFail) {
            var revertPosition = _this._lexer.getPosition();
            var startPosition = _this._lexer.getStartPosition();
            var funcNode = new parsenodes_1.FuncExpr();
            funcNode.startPosition = startPosition;
            try {
                if (_this._lexer.check(lexer_1.TokenType.ParOpen)) {
                    _this._lexer.accept();
                    if (!_this._lexer.check(lexer_1.TokenType.ParClose)) {
                        funcNode.params.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                        while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                            _this._lexer.accept();
                            // Allow trailing commas
                            if (_this._lexer.check(lexer_1.TokenType.ParClose)) {
                                break;
                            }
                            funcNode.params.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                        }
                    }
                    _this._lexer.accept(lexer_1.TokenType.ParClose);
                }
                else {
                    funcNode.params = [_this._lexer.accept(lexer_1.TokenType.Ident).value];
                }
                _this._lexer.accept(lexer_1.TokenType.Arrow);
            }
            catch (e) {
                if (!e.important) {
                    try {
                        _this._lexer.revert(startPosition);
                        return onFail();
                    }
                    catch (e) {
                        _this._lexer.revert(revertPosition);
                        if (!e.important) {
                            return onFail();
                        }
                        else {
                            throw e;
                        }
                    }
                }
                else {
                    throw e;
                }
            }
            /*
            We parse the rest out here because we've already found the arrow.
    
            Any errors in the function body shouldn't force us to try to parse the whole thing
            as a normal expression because we've already confirmed that it's an arrow function
            and we want to confine the syntax errors to the function body
            */
            if (_this._lexer.check(lexer_1.TokenType.BraceOpen)) {
                funcNode.body = _this.parseBlock(true);
            }
            else {
                var block = new parsenodes_1.BlockStmt();
                var ret = new parsenodes_1.ReturnStmt();
                ret.expr = _this.parseExpression();
                block.statements.push(ret);
                funcNode.body = block;
            }
            funcNode.endPosition = _this._lexer.getEndPosition();
            return funcNode;
        };
        this.parseIf = function () {
            _this._lexer.accept();
            var ifNode = new parsenodes_1.IfExpr();
            ifNode.startPosition = _this._lexer.getStartPosition();
            _this._lexer.accept(lexer_1.TokenType.ParOpen);
            ifNode.condition = _this.parseExpression();
            if (ifNode.condition.unpack().exprType == parsenodes_1.ExprType.IfRules) {
                throw new errors_1.CompilerError('If condition cannot be if statement or ternany operation', ifNode.startPosition, _this._lexer.getEndPosition());
            }
            _this._lexer.accept(lexer_1.TokenType.ParClose);
            ifNode.result = _this.parseStatement();
            if (_this._lexer.check(lexer_1.TokenType.KW_Else)) {
                _this._lexer.accept();
                ifNode.elseResult = _this.parseStatement();
            }
            ifNode.endPosition = _this._lexer.getEndPosition();
            ifNode.setAsExpression();
            return ifNode;
        };
        this.parseExpressionNormally = function (precedence) {
            if (precedence === void 0) { precedence = 10000; }
            if (_this._lexer.check(lexer_1.TokenType.KW_If))
                return _this.parseIf();
            if (_this._lexer.check(lexer_1.TokenType.TagLT))
                return _this.parseHTML();
            if (_this._lexer.check(lexer_1.TokenType.TemplateTick))
                return _this.parseTemplate();
            precedence = precedence || 10000;
            _this._lexer.check();
            var startPosition = _this._lexer.getStartPosition();
            var value = null;
            // Check for unary operators
            if (_this._lexer.checkOp('-') || _this._lexer.checkOp('!') || _this._lexer.checkOp('++') || _this._lexer.checkOp('--')) {
                var op = lexer_1.getAsOp(_this._lexer.accept());
                var opExpr = new parsenodes_1.UnaryExpr(op.value);
                opExpr.expr = _this.parseValue();
                if (op.value == '++' || op.value == '--') {
                    _this.verifyLValue(opExpr.expr);
                }
                opExpr.startPosition = startPosition;
                opExpr.endPosition = _this._lexer.getEndPosition();
                value = opExpr;
            }
            // Check for new
            else if (_this._lexer.check(lexer_1.TokenType.KW_New)) {
                var newOp = new parsenodes_1.NewExpr();
                newOp.startPosition = _this._lexer.getStartPosition();
                _this._lexer.accept();
                newOp.className = new parsenodes_1.LoadExpr(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                if (_this._lexer.check(lexer_1.TokenType.ParOpen)) {
                    _this._lexer.accept();
                    if (!_this._lexer.check(lexer_1.TokenType.ParClose)) {
                        newOp.args.push(_this.parseExpression());
                        while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                            _this._lexer.accept();
                            // Allow trailing commas
                            if (_this._lexer.check(lexer_1.TokenType.ParClose)) {
                                break;
                            }
                            newOp.args.push(_this.parseExpression());
                        }
                    }
                    _this._lexer.accept(lexer_1.TokenType.ParClose);
                }
                newOp.endPosition = _this._lexer.getEndPosition();
                value = newOp;
            }
            // Any other value
            else {
                value = _this.parseValue();
            }
            while (_this._lexer.check() && lexer_1.isOp(_this._lexer.check()) && lexer_1.getOpPrecedence(lexer_1.getAsOp(_this._lexer.check()).value) < precedence) {
                var op = lexer_1.getAsOp(_this._lexer.accept());
                if (op.value == '?') {
                    var b = _this.parseExpressionNormally(lexer_1.getOpPrecedence(op.value));
                    _this._lexer.accept(lexer_1.TokenType.Colon);
                    var c = _this.parseExpressionNormally(lexer_1.getOpPrecedence(op.value));
                    var expr = new parsenodes_1.IfExpr();
                    expr.condition = value;
                    expr.result = b;
                    expr.elseResult = c;
                    value = expr;
                    value.startPosition = startPosition;
                    value.endPosition = _this._lexer.getEndPosition();
                }
                else {
                    var b = _this.parseExpressionNormally(lexer_1.getOpPrecedence(op.value));
                    var expr = new parsenodes_1.OpExpr(op.value);
                    expr.expr1 = value;
                    expr.expr2 = b;
                    value = expr;
                    value.startPosition = startPosition;
                    value.endPosition = _this._lexer.getEndPosition();
                }
            }
            return value;
        };
        this.parseValue = function () {
            var curToken = _this._lexer.check();
            var startPosition = _this._lexer.getStartPosition();
            var result = null;
            switch (curToken.type) {
                case lexer_1.TokenType.String:
                case lexer_1.TokenType.Number:
                case lexer_1.TokenType.True:
                case lexer_1.TokenType.False:
                case lexer_1.TokenType.Null:
                    {
                        _this._lexer.accept();
                        result = new parsenodes_1.LitExpr(curToken.value);
                        break;
                    }
                case lexer_1.TokenType.Ident: {
                    _this._lexer.accept();
                    result = new parsenodes_1.LoadExpr(curToken.value);
                    break;
                }
                case lexer_1.TokenType.ParOpen: {
                    /*
                    When we open brackets it might be the start of an arrow function, i.e. (a, b) => a + b
                    or it might just be a parenthesised expression, i.e. (a + b)
    
                    We can't know until we see a few tokens ahead, so we start by assuming it's going to be
                    an arrow function, and if that fails we revert back to the start and try to parse
                    a normal parenthesised expression
                    */
                    result = _this.tryParseArrowFunction(function () {
                        _this._lexer.accept();
                        var inner = _this.parseExpression();
                        _this._lexer.accept(lexer_1.TokenType.ParClose);
                        return new parsenodes_1.ParExpr(inner);
                    });
                    break;
                }
                case lexer_1.TokenType.BraceOpen: {
                    _this._lexer.accept();
                    var objExpr = new parsenodes_1.ObjExpr();
                    if (!_this._lexer.check(lexer_1.TokenType.BraceClose)) {
                        var key = _this._lexer.acceptAny([lexer_1.TokenType.Ident, lexer_1.TokenType.String]).value;
                        if (_this._lexer.check(lexer_1.TokenType.Colon)) {
                            _this._lexer.accept(lexer_1.TokenType.Colon);
                            objExpr.values[key] = _this.parseExpression();
                        }
                        else {
                            objExpr.values[key] = undefined;
                        }
                        while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                            _this._lexer.accept();
                            // Allow trailing comma
                            if (_this._lexer.check(lexer_1.TokenType.BraceClose)) {
                                break;
                            }
                            key = _this._lexer.acceptAny([lexer_1.TokenType.Ident, lexer_1.TokenType.String]).value;
                            if (_this._lexer.check(lexer_1.TokenType.Colon)) {
                                _this._lexer.accept(lexer_1.TokenType.Colon);
                                objExpr.values[key] = _this.parseExpression();
                            }
                            else {
                                objExpr.values[key] = undefined;
                            }
                        }
                    }
                    _this._lexer.accept(lexer_1.TokenType.BraceClose);
                    result = objExpr;
                    break;
                }
                case lexer_1.TokenType.SquareOpen: {
                    _this._lexer.accept();
                    var arrExpr = new parsenodes_1.ArrayExpr();
                    if (!_this._lexer.check(lexer_1.TokenType.SquareClose)) {
                        arrExpr.values.push(_this.parseExpression());
                        while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                            _this._lexer.accept();
                            // Allow trailing comma
                            if (_this._lexer.check(lexer_1.TokenType.SquareClose)) {
                                break;
                            }
                            arrExpr.values.push(_this.parseExpression());
                        }
                    }
                    _this._lexer.accept(lexer_1.TokenType.SquareClose);
                    result = arrExpr;
                    break;
                }
                case lexer_1.TokenType.KW_Function: {
                    _this._lexer.accept();
                    var funcExpr = new parsenodes_1.FuncExpr();
                    _this._lexer.accept(lexer_1.TokenType.ParOpen);
                    if (!_this._lexer.check(lexer_1.TokenType.ParClose)) {
                        funcExpr.params.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                        while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                            _this._lexer.accept();
                            // Allow trailing commas
                            if (_this._lexer.check(lexer_1.TokenType.ParClose)) {
                                break;
                            }
                            funcExpr.params.push(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                        }
                    }
                    _this._lexer.accept(lexer_1.TokenType.ParClose);
                    funcExpr.body = _this.parseBlock(true);
                    result = funcExpr;
                    break;
                }
                case lexer_1.TokenType.KW_Class: {
                    result = _this.parseClass();
                    break;
                }
            }
            if (result) {
                // Check if we're accessing an object or array, or performing a call (method or function)
                while (_this._lexer.check(lexer_1.TokenType.Dot) || _this._lexer.check(lexer_1.TokenType.SquareOpen) || _this._lexer.check(lexer_1.TokenType.ParOpen)) {
                    // Object access and method calls
                    if (_this._lexer.check(lexer_1.TokenType.Dot)) {
                        _this._lexer.accept();
                        var property = _this._lexer.accept(lexer_1.TokenType.Ident).value;
                        if (_this._lexer.check(lexer_1.TokenType.ParOpen)) {
                            _this._lexer.accept(lexer_1.TokenType.ParOpen);
                            var methodCall = new parsenodes_1.MethodCallExpr();
                            methodCall.obj = result;
                            methodCall.prop = property;
                            if (!_this._lexer.check(lexer_1.TokenType.ParClose)) {
                                methodCall.args.push(_this.parseExpression());
                                while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                                    _this._lexer.accept();
                                    // Allow trailing commas
                                    if (_this._lexer.check(lexer_1.TokenType.ParClose)) {
                                        break;
                                    }
                                    methodCall.args.push(_this.parseExpression());
                                }
                            }
                            _this._lexer.accept(lexer_1.TokenType.ParClose);
                            result = methodCall;
                        }
                        else {
                            var objAccess = new parsenodes_1.AccessObjExpr();
                            objAccess.obj = result;
                            objAccess.prop = property;
                            result = objAccess;
                        }
                    }
                    // Array access
                    else if (_this._lexer.check(lexer_1.TokenType.SquareOpen)) {
                        _this._lexer.accept();
                        var arrAccess = new parsenodes_1.AccessArrExpr();
                        var index = _this.parseExpression();
                        _this._lexer.accept(lexer_1.TokenType.SquareClose);
                        arrAccess.obj = result;
                        arrAccess.index = index;
                        result = arrAccess;
                    }
                    // Function call
                    else if (_this._lexer.check(lexer_1.TokenType.ParOpen)) {
                        _this._lexer.accept();
                        var callExpr = new parsenodes_1.CallExpr();
                        callExpr.func = result;
                        if (!_this._lexer.check(lexer_1.TokenType.ParClose)) {
                            callExpr.args.push(_this.parseExpression());
                            while (_this._lexer.check(lexer_1.TokenType.Comma)) {
                                _this._lexer.accept();
                                // Allow trailing commas
                                if (_this._lexer.check(lexer_1.TokenType.ParClose)) {
                                    break;
                                }
                                callExpr.args.push(_this.parseExpression());
                            }
                        }
                        _this._lexer.accept(lexer_1.TokenType.ParClose);
                        result = callExpr;
                    }
                }
                // Check for '++' or '--'
                if (_this._lexer.checkOp('++')) {
                    _this._lexer.accept();
                    var unOp = new parsenodes_1.UnaryExpr('++');
                    unOp.postFix = true;
                    unOp.expr = result;
                    result = unOp;
                }
                else if (_this._lexer.checkOp('--')) {
                    _this._lexer.accept();
                    var unOp = new parsenodes_1.UnaryExpr('--');
                    unOp.postFix = true;
                    unOp.expr = result;
                    result = unOp;
                }
                result.startPosition = startPosition;
                _this._lexer.check();
                result.endPosition = _this._lexer.getEndPosition();
                return result;
            }
            throw new errors_1.CompilerError("Unexpected token '" + _this._lexer.check().type + "'. Expected value", startPosition, _this._lexer.getEndPosition());
        };
    }
    return Parser;
}());
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map