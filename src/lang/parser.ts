import * as fs from 'fs';

import { CompilerError } from './errors';
import { Lexer, TokenType, getOpPrecedence, getAsOp, isOp } from './lexer';
import { RootNode, YieldNode, ExprNode, ExprType, AccessArrExpr, AccessObjExpr, CallExpr, ArrayExpr, ObjExpr, ParExpr, LoadExpr, LitExpr, OpExpr, UnaryExpr, FuncExpr, IfExpr, HTMLTextExpr, HTMLExpr, HTMLExprType, HTMLElemExpr, HTMLDynExpr, StmtNode, ReturnStmt, BlockStmt, VarDeclStmt, ImportNode, NoopStmt, WhileStmt, ForStmt, ForOfStmt, DoWhileStmt, MethodCallExpr, NewExpr, LookupTableNode, NodeType, DescribeNode, RunNode, HTMLDoc, TemplateNode, RunTestNode, RunTodoNode, StmtType, StmtList, HTMLDocType, HTMLComment } from './parsenodes';
import { AlterianParser } from './alterianparser';


export class Parser {
    private _lexer: Lexer;

    constructor() {
    }

    parseHTMLDoc = (fileName: string, input: string, visitor?: (node: HTMLExpr)=>HTMLExpr) => {
        this._lexer = new Lexer(fileName, input);

        const doc = new HTMLDoc();
        doc.startPosition = this._lexer.getStartPosition();

        doc.root = this.parseHTML(doc, visitor);

        doc.endPosition = this._lexer.getEndPosition();
        return doc;
    };

    parseFile = (fileName: string): RootNode => {
        const input = fs.readFileSync(fileName, { encoding: "utf8" });

        return this.parseInput(fileName, input);
    };

    private parseInput = (fileName: string, input: string): RootNode => {
        const rootNode = new RootNode();

        this._lexer = new Lexer(fileName, input);

        rootNode.startPosition = this._lexer.getStartPosition();

        while (this._lexer.check()) {

            // Check for yields
            if (this._lexer.check(TokenType.KW_Yield)) {
                const yields = this.parseYields();
                const yieldVars: { [name: string]: YieldNode } = {};
                const yieldLookups: { [name: string]: LookupTableNode } = {};

                Object.keys(yields).forEach(key => {
                    if (yields[key].type == NodeType.Var) {
                        yieldVars[key] = yields[key];
                    } else if (yields[key].type == NodeType.Lookup) {
                        yieldLookups[key] = yields[key] as LookupTableNode;
                    }
                });

                rootNode.yields = {...rootNode.yields, ...yieldVars};
                rootNode.lookups = {...rootNode.lookups, ...yieldLookups};
            }

            // Imports
            else if (this._lexer.check(TokenType.KW_Import)) {
                rootNode.imports.push(this.parseImport());
            }

            // Exports
            else if (this._lexer.check(TokenType.KW_Export)) {
                rootNode.statements.push(this.parseExport());
            }

            // Everything else
            else {
                rootNode.statements.push(this.parseStatement());
            }
        }

        rootNode.endPosition = this._lexer.getEndPosition();

        return rootNode;
    };

    private parseExport = (): StmtNode => {
        this._lexer.accept(TokenType.KW_Export);

        const statement = this.parseStatement();
        statement.setExported();

        return statement;
    };

    private parseImport = (): ImportNode => {
        const importNode = new ImportNode();
        importNode.startPosition = this._lexer.getStartPosition();
        
        this._lexer.accept();

        if (this._lexer.checkOp('*')) {
            this._lexer.accept();
            this._lexer.accept(TokenType.KW_As);
            importNode.asName = this._lexer.accept(TokenType.Ident).value as string;
            this._lexer.accept(TokenType.KW_From);
        } else if (this._lexer.check(TokenType.BraceOpen)) {
            this._lexer.accept();

            importNode.members = [];
            if (!this._lexer.check(TokenType.BraceClose)) {
                importNode.members.push(this._lexer.accept(TokenType.Ident).value);

                while (this._lexer.check(TokenType.Comma)) {
                    this._lexer.accept();

                    importNode.members.push(this._lexer.accept(TokenType.Ident).value);
                }
            }

            this._lexer.accept(TokenType.BraceClose);
            this._lexer.accept(TokenType.KW_From);
        }

        importNode.file = this._lexer.accept(TokenType.String).value as string;

        if (this._lexer.check(TokenType.Semicolon)) {
            this._lexer.accept();
        }

        importNode.endPosition = this._lexer.getEndPosition();
        return importNode;

    };

    private parseYields = (): { [name: string]: YieldNode } => {
        this._lexer.accept();

        let vars: { [name: string]: YieldNode } = {};

        let parsed = this.parseYield();
        vars[parsed.name] = parsed;

        while (this._lexer.check(TokenType.Comma)) {
            this._lexer.accept();

            parsed = this.parseYield();
            vars[parsed.name] = parsed;
        }

        if (this._lexer.check(TokenType.Semicolon)) {
            this._lexer.accept(TokenType.Semicolon);
        }

        return vars;
    };

    private parseYield = (): YieldNode => {
        const varNode = new YieldNode();
        varNode.startPosition = this._lexer.getStartPosition();

        varNode.name = this._lexer.accept(TokenType.Ident).value as string;

        if (this._lexer.check(TokenType.Arrow)) {
            this._lexer.accept();

            varNode.lookup = this._lexer.accept(TokenType.Ident).value as string;
        }

        if (this._lexer.checkOp('=')) {
            this._lexer.accept();

            varNode.value = this.parseExpression();

            if (varNode.value && varNode.value.exprType !== ExprType.Literal) {
                if (varNode.value.exprType == ExprType.Object) {
                    const itemsObj = varNode.value as ObjExpr;
                    const lookupNode = new LookupTableNode(itemsObj);
                    lookupNode.name = varNode.name;

                    lookupNode.startPosition = varNode.startPosition;

                    Object.keys(itemsObj.values).forEach(key => {
                        lookupNode.items[key] = itemsObj.values[key];
                    });

                    lookupNode.endPosition = this._lexer.getEndPosition();
                    return lookupNode;
                } /*else {
                    throw new CompilerError(`Expected literal value`, varNode.startPosition, this._lexer.getEndPosition());
                }*/
            }
        }


        return varNode;
    };

    parseStatement = (): StmtNode => {
        switch (this._lexer.check().type) {
            case TokenType.Semicolon:   this._lexer.accept(); return new NoopStmt();
            case TokenType.KW_Describe: return this.parseDescribe();
            case TokenType.KW_Return:   return this.parseReturn();
            case TokenType.BraceOpen:   return this.parseBlock();
            case TokenType.KW_Class:    return this.parseClassDecl();
            case TokenType.KW_If:       return this.parseIf();
            case TokenType.KW_Var:
            case TokenType.KW_Let:
            case TokenType.KW_Const:    return this.parseVarDecl();
            case TokenType.KW_Function: return this.parseFuncDecl();
            case TokenType.KW_While:    return this.parseWhile();
            case TokenType.KW_Do:       return this.parseDoWhile();
            case TokenType.KW_For: {

                /*
                'for' is ambiguous as it might be a normal for-loop, i.e., for (var a = 0; a < 10; a++)
                or it might be a 'for-of', i.e. for (var a of list)

                We can't know until a few tokens in, so we start by trying to parse a regular for loop
                and it that fails we revert back to the start and parse a for-of
                */
                const revertPosition = this._lexer.getPosition();
                const startPosition = this._lexer.getStartPosition();

                try {
                    return this.parseFor();
                } catch (e) {
                    try {
                        this._lexer.revert(startPosition);
                        return this.parseForOf();
                    } catch (e) {
                        this._lexer.revert(revertPosition);
                        return this.parseForOf();
                    }
                }
            }

            default:    {
                const expr = this.parseExpression();

                if (this._lexer.check(TokenType.Semicolon)) {
                    this._lexer.accept(TokenType.Semicolon);
                }

                // Ensure correct assignments
                if (expr.exprType == ExprType.Operator && (expr as OpExpr).opType == '=') {
                    this.verifyLValue((expr as OpExpr).expr1);
                }
                return expr;
            }
        }
    };

    parseDescribe = (): DescribeNode => {
        const descNode = new DescribeNode();
        descNode.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.KW_Describe);
        this._lexer.accept(TokenType.ParOpen);

        descNode.description = this._lexer.accept(TokenType.String).value as string;

        this._lexer.accept(TokenType.Comma);
        this._lexer.accept(TokenType.SquareOpen);

        if (!this._lexer.check(TokenType.SquareClose)) {

            descNode.testRuns.push(this.parseTestOrTodo());

            while (this._lexer.check(TokenType.Comma)) {
                this._lexer.accept();

                // Allow trailing comma
                if (this._lexer.check(TokenType.SquareClose)) {
                    break;
                }

                descNode.testRuns.push(this.parseTestOrTodo());
            }
        }

        this._lexer.accept(TokenType.SquareClose);
        this._lexer.accept(TokenType.ParClose);

        if (this._lexer.check(TokenType.Semicolon)) {
            this._lexer.accept(TokenType.Semicolon);
        }

        descNode.endPosition = this._lexer.getEndPosition();
        return descNode;
    };

    parseTestOrTodo = (): RunNode => {
        if (this._lexer.checkIdent("run")) {
            return this.parseTestRun();
        } else if (this._lexer.checkIdent("todo")) {
            return this.parseTodoRun();
        } else {
            throw new CompilerError(`Expected 'run' or 'todo'`, this._lexer.getStartPosition(), this._lexer.getEndPosition());
        }
    };

    parseTodoRun = (): RunTodoNode => {
        const todoNode = new RunTodoNode();
        todoNode.startPosition = this._lexer.getStartPosition();

        this._lexer.acceptIdent("todo");
        this._lexer.accept(TokenType.ParOpen);

        todoNode.description = this._lexer.accept(TokenType.String).value as any;

        // Allow trailing comma
        if (this._lexer.check(TokenType.Comma)) {
            this._lexer.accept();
        }

        this._lexer.accept(TokenType.ParClose);

        todoNode.endPosition = this._lexer.getEndPosition();
        return todoNode;
    };

    parseTestRun = (): RunTestNode => {
        const runNode = new RunTestNode();
        runNode.startPosition = this._lexer.getStartPosition();

        this._lexer.acceptIdent("run");
        this._lexer.accept(TokenType.ParOpen);

        runNode.description = this._lexer.accept(TokenType.String).value as string;
        this._lexer.accept(TokenType.Comma);

        this._lexer.accept(TokenType.BraceOpen);

        if (!this._lexer.check(TokenType.BraceClose)) {
            let varName = this._lexer.accept(TokenType.Ident).value as string;
            this._lexer.accept(TokenType.Colon);
            runNode.settings[varName] = this.parseExpression();

            while (this._lexer.check(TokenType.Comma)) {
                this._lexer.accept();

                // Allow trailing comma
                if (this._lexer.check(TokenType.BraceClose)) {
                    break;
                }

                varName = this._lexer.accept(TokenType.Ident).value as string;
                this._lexer.accept(TokenType.Colon);
                runNode.settings[varName] = this.parseExpression();
            }
        }

        this._lexer.accept(TokenType.BraceClose);
        this._lexer.accept(TokenType.Comma);

        runNode.assertion = this.parseExpression();

        // Allow trailing comma
        if (this._lexer.check(TokenType.Comma)) {
            this._lexer.accept();
        }

        this._lexer.accept(TokenType.ParClose);

        runNode.endPosition = this._lexer.getEndPosition();
        return runNode;
    };

    parseWhile = (): WhileStmt => {
        const whileLoop = new WhileStmt();
        whileLoop.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.KW_While);
        this._lexer.accept(TokenType.ParOpen);

        whileLoop.condition = this.parseExpression();

        this._lexer.accept(TokenType.ParClose);

        whileLoop.body = this.parseStatement();

        whileLoop.endPosition = this._lexer.getEndPosition();
        return whileLoop;
    };

    parseFor = (): ForStmt => {
        const forLoop = new ForStmt();
        forLoop.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.KW_For);
        this._lexer.accept(TokenType.ParOpen);

        forLoop.init = this.parseStatement();

        forLoop.condition = this.parseExpression();
        this._lexer.accept(TokenType.Semicolon);
        forLoop.after = this.parseStatement();

        this._lexer.accept(TokenType.ParClose);
        
        forLoop.body = this.parseStatement();

        forLoop.endPosition = this._lexer.getEndPosition();
        return forLoop;
    };


    parseForOf = (): ForOfStmt => {
        const forLoop = new ForOfStmt();
        forLoop.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.KW_For);
        this._lexer.accept(TokenType.ParOpen);

        if (this._lexer.check(TokenType.KW_Var)) {
            this._lexer.accept();
            forLoop.initDecl = "var";
        } else if (this._lexer.check(TokenType.KW_Let)) {
            this._lexer.accept();
            forLoop.initDecl = "let";
        } else if (this._lexer.check(TokenType.KW_Const)) {
            this._lexer.accept();
            forLoop.initDecl = "const";
        }

        forLoop.initLoad = this._lexer.accept(TokenType.Ident).value as string;

        this._lexer.accept(TokenType.KW_Of);

        forLoop.collection = this.parseExpression();

        this._lexer.accept(TokenType.ParClose);

        forLoop.body = this.parseStatement();

        forLoop.endPosition = this._lexer.getEndPosition();
        return forLoop;
    };

    parseDoWhile = (): DoWhileStmt => {
        const doLoop = new DoWhileStmt();
        doLoop.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.KW_Do);

        doLoop.body = this.parseStatement();

        this._lexer.accept(TokenType.KW_While);
        this._lexer.accept(TokenType.ParOpen);

        doLoop.condition = this.parseExpression();

        this._lexer.accept(TokenType.ParClose);

        doLoop.endPosition = this._lexer.getEndPosition();
        return doLoop;
    };


    verifyLValue = (expr: ExprNode) => {
        switch (expr.exprType) {
            case ExprType.Load:
            case ExprType.AccessArr:
            case ExprType.AccessObj:
                break;
            
            default:
                throw new CompilerError(`Illegal l-value`, expr.startPosition, expr.endPosition, true);
        }
    };

    parseVarDecl = (): VarDeclStmt => {
        const varNode = new VarDeclStmt();
        varNode.startPosition = this._lexer.getStartPosition();

        const keyword = this._lexer.accept();
        if (keyword.type == TokenType.KW_Const) {
            varNode.isConst = true;
        }

        varNode.name = this._lexer.accept(TokenType.Ident).value as string;

        if (this._lexer.checkOp('=')) {
            this._lexer.accept();

            varNode.value = this.parseExpression();
        } else if (varNode.isConst) {
            throw new CompilerError(`Const variable '${varNode.name}' must be immediately assigned`, varNode.startPosition, this._lexer.getEndPosition());
        }

        if (this._lexer.check(TokenType.Semicolon)) {
            this._lexer.accept(TokenType.Semicolon);
        }

        varNode.endPosition = this._lexer.getEndPosition();
        return varNode;
    };

    parseClassDecl = (): VarDeclStmt => {
        let className: string = "";

        const classExpr = this.parseClass(name => {
            className = name;
        })

        const varDecl = new VarDeclStmt();
        varDecl.name = className;
        varDecl.value = classExpr;

        return varDecl;
    };

    parseClass = (onGetName: (name: string)=>void = null): ExprNode => {
        
        // A class is syntactic sugar for a self-calling function, within it having a block
        // declaring the constructor and each method

        // The inner function to call
        const scopeFunc = new FuncExpr();
        const body = new BlockStmt();
        scopeFunc.body = body;

        // The call that calls scopeFunc()
        const funcCall = new CallExpr();
        funcCall.func = scopeFunc;
        funcCall.startPosition = this._lexer.getStartPosition();


        // Parse
        this._lexer.accept(TokenType.KW_Class);

        // Check if there's a name otherwise use a dummy name
        let name: string = "";
        if (this._lexer.check(TokenType.Ident)) {
            name = this._lexer.accept(TokenType.Ident).value as string;

            if (onGetName) {
                onGetName(name);
            }
        } else {
            name = "class_1";
        }

        this._lexer.accept(TokenType.BraceOpen);

        while (!this._lexer.check(TokenType.BraceClose)) {

            if (this._lexer.check(TokenType.KW_Constructor)) {
                body.statements.push(this.parseConstructor(name));
            }

            else if (this._lexer.check(TokenType.Ident)) {
                const fieldName = this._lexer.accept().value as string;

                // Check if shortcut for method
                let value: ExprNode = null;
                if (this._lexer.check(TokenType.ParOpen)) {

                    const funcExpr = new FuncExpr();
                    funcExpr.startPosition = this._lexer.getStartPosition();
            
                    this._lexer.accept(TokenType.ParOpen);
            
                    if (!this._lexer.check(TokenType.ParClose)) {
                        funcExpr.params.push(this._lexer.accept(TokenType.Ident).value as string);
            
                        while (this._lexer.check(TokenType.Comma)) {
                            this._lexer.accept();
            
                            // Allow trailing commas
                            if (this._lexer.check(TokenType.ParClose)) {
                                break;
                            }
            
                            funcExpr.params.push(this._lexer.accept(TokenType.Ident).value as string);
                        }
                    }
            
                    this._lexer.accept(TokenType.ParClose);
                    funcExpr.body = this.parseBlock(true);
            
                    funcExpr.endPosition = this._lexer.getEndPosition();

                    value = funcExpr;

                } else {
                    this._lexer.acceptOp("=");

                    value = this.parseExpression();

                    if (this._lexer.check(TokenType.Semicolon)) {
                        this._lexer.accept(TokenType.Semicolon);
                    }
                }

                // Add to prototype
                const protoLoad = new AccessObjExpr();
                protoLoad.obj = new LoadExpr(name);
                protoLoad.prop = "prototype";

                const fieldLoad = new AccessObjExpr();
                fieldLoad.obj = protoLoad;
                fieldLoad.prop = fieldName;

                const store = new OpExpr("=");
                store.expr1 = fieldLoad;
                store.expr2 = value;

                body.statements.push(store);
            }

            else {
                throw new CompilerError("Expected 'constructor' or declaration", this._lexer.getPosition());
            }
        }

        this._lexer.accept(TokenType.BraceClose);

        // Return function
        const finalReturn = new ReturnStmt();
        finalReturn.expr = new LoadExpr(name);
        body.statements.push(finalReturn);

        funcCall.endPosition = this._lexer.getEndPosition();
        return funcCall;
    };

    parseConstructor = (className: string): VarDeclStmt => {
        const varDecl = new VarDeclStmt();
        varDecl.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.KW_Constructor);
        varDecl.name = className;

        const funcExpr = new FuncExpr();
        varDecl.value = funcExpr;
        funcExpr.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.ParOpen);

        if (!this._lexer.check(TokenType.ParClose)) {
            funcExpr.params.push(this._lexer.accept(TokenType.Ident).value as string);

            while (this._lexer.check(TokenType.Comma)) {
                this._lexer.accept();

                // Allow trailing commas
                if (this._lexer.check(TokenType.ParClose)) {
                    break;
                }

                funcExpr.params.push(this._lexer.accept(TokenType.Ident).value as string);
            }
        }

        this._lexer.accept(TokenType.ParClose);
        funcExpr.body = this.parseBlock(true);

        funcExpr.endPosition = this._lexer.getEndPosition();

        varDecl.endPosition = this._lexer.getEndPosition();
        return varDecl;
    };

    parseFuncDecl = (): VarDeclStmt => {
        const varDecl = new VarDeclStmt();
        varDecl.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.KW_Function);
        varDecl.name = this._lexer.accept(TokenType.Ident).value as string;

        const funcExpr = new FuncExpr();
        varDecl.value = funcExpr;
        funcExpr.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.ParOpen);

        if (!this._lexer.check(TokenType.ParClose)) {
            funcExpr.params.push(this._lexer.accept(TokenType.Ident).value as string);

            while (this._lexer.check(TokenType.Comma)) {
                this._lexer.accept();

                // Allow trailing commas
                if (this._lexer.check(TokenType.ParClose)) {
                    break;
                }

                funcExpr.params.push(this._lexer.accept(TokenType.Ident).value as string);
            }
        }

        this._lexer.accept(TokenType.ParClose);
        funcExpr.body = this.parseBlock(true);

        funcExpr.endPosition = this._lexer.getEndPosition();

        varDecl.endPosition = this._lexer.getEndPosition();
        return varDecl;
    };

    parseReturn = (): ReturnStmt => {
        const returnNode = new ReturnStmt();
        returnNode.startPosition = this._lexer.getStartPosition();

        /*
        Need to check line numbers of return statement and return value for ASI

        If return value is after the return statement, it is not returned, and a semi-colon
        is automatically inserted after the return
        */

        const returnTokenLine = this._lexer.getStartPosition().line;
        this._lexer.accept(TokenType.KW_Return);

        const returnValueLine = this._lexer.getStartPosition().line;
        if (!this._lexer.check(TokenType.Semicolon) && returnValueLine === returnTokenLine) {
            returnNode.expr = this.parseExpression();
        }

        if (this._lexer.check(TokenType.Semicolon)) {
            this._lexer.accept(TokenType.Semicolon);
        }
        returnNode.endPosition = this._lexer.getEndPosition();

        return returnNode;
    };

    parseBlock = (isFuncBlock: boolean = false): BlockStmt => {
        const blockNode = new BlockStmt();
        blockNode.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.BraceOpen);

        while (!this._lexer.check(TokenType.BraceClose)) {
            const stmt = this.parseStatement();

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
            if (isFuncBlock && stmt.stmtType == StmtType.Expr && (stmt as ExprNode).exprType == ExprType.IfRules) {
                (stmt as IfExpr).enclosingBlock = blockNode;
            }

            blockNode.statements.push(stmt);
        }

        this._lexer.accept(TokenType.BraceClose);

        blockNode.endPosition = this._lexer.getEndPosition();
        return blockNode;
    };

    // Template string
    parseTemplate = (): TemplateNode => {
        const template = new TemplateNode();
        template.startPosition = this._lexer.getStartPosition();

        this._lexer.accept();
        this._lexer.setTemplateContentStart(this._lexer.getEndPosition().position);

        while (!this._lexer.check(TokenType.TemplateTick)) {

            if (this._lexer.isWhite(this._lexer.getTemplateContentStart())) {
                template.expressions.push(new LitExpr(this._lexer.acceptTemplateText().value as string));
                this._lexer.setTemplateContentStart(this._lexer.getPosition().position);
            }
            else if (this._lexer.check(TokenType.TemplateExprStart)) {
                this._lexer.accept();
                template.expressions.push(this.parseExpression());
                this._lexer.accept(TokenType.BraceClose);
                this._lexer.setTemplateContentStart(this._lexer.getEndPosition().position);
            } else {
                template.expressions.push(new LitExpr(this._lexer.acceptTemplateText().value as string));
                this._lexer.setTemplateContentStart(this._lexer.getEndPosition().position + 1);
            }
        }

        this._lexer.accept(TokenType.TemplateTick);

        template.endPosition = this._lexer.getEndPosition();
        return template;
    };

    parseHTML = (doc?: HTMLDoc, visitor?: (node: HTMLExpr)=>HTMLExpr): HTMLExpr => {
        this._lexer.accept();

        visitor = visitor || ((node: HTMLExpr) => node);

        // Check for comments, doctype, etc
        if (this._lexer.checkOp('!')) {

            this._lexer.accept();

            // Doctype
            if (this._lexer.checkIdent("doctype", true)) {
                this._lexer.accept();

                const docTypeElem = new HTMLDocType();
                while (!this._lexer.check(TokenType.TagGT)) {
                    const docTypeValueToken = this._lexer.accept();

                    if (docTypeValueToken.type == TokenType.String) {
                        docTypeElem.values.push('"' + docTypeValueToken.value + '"');
                    } else {
                        docTypeElem.values.push(docTypeValueToken.value + '');
                    }
                }

                this._lexer.accept(TokenType.TagGT);

                return visitor(docTypeElem);
            }

            // Comments
            else if (this._lexer.checkOp('--')) {
                this._lexer.accept();

                let comment = this._lexer.acceptRestOfHTMLComment().value as string;
                this._lexer.accept(TokenType.TagGT);

                return visitor(new HTMLComment(comment));
            }

            else {
                throw new CompilerError(`Expected 'DOCTYPE' or '--'`, this._lexer.getStartPosition());
            }
        }

        const startPosition = this._lexer.getStartPosition();

        let tagName = "";
        if (this._lexer.check(TokenType.Ident)) {
            tagName = this._lexer.accept(TokenType.Ident).value as string;
        }

        let htmlNode = new HTMLElemExpr();
        htmlNode.tag = tagName;
        htmlNode.startPosition = startPosition;

        // Shortcut for id
        let id = "";
        if (tagName != "") {
            if (this._lexer.check(TokenType.Dot)) {
                this._lexer.accept();

                id = this._lexer.accept(TokenType.Ident).value as string;
                htmlNode.attributes["id"] = new LitExpr({ type: TokenType.String, value: id });
            }
        }

        // Get attributes
        while (this._lexer.check(TokenType.Ident)) {

            const attrName = this._lexer.acceptHTMLAttribute().value as string;// this._lexer.accept().value as string;

            if (this._lexer.checkOp('=')) {
                this._lexer.acceptOp('=');
                if (this._lexer.check(TokenType.String)) {
                    const attrString = this._lexer.accept();
                    htmlNode.attributes[attrName] = new LitExpr(attrString.value as string);
                    
                    if (doc && attrName == "id") {
                        doc.index[attrString.value as string] = htmlNode;
                    }

                    /*if (attrName == "id") {
                        this._htmlIdIndex[attrString.value as string] = htmlNode;
                    }*/
                } else {
                    this._lexer.accept(TokenType.BraceOpen);
                    htmlNode.attributes[attrName] = this.parseExpression();
                    this._lexer.accept(TokenType.BraceClose);
                }
            } else {
                htmlNode.attributes[attrName] = new LitExpr({ type: TokenType.Number, value: 1 });
            }
        }

        // Check if self-closing tag
        if (this._lexer.check(TokenType.TagSelfClose)) {
            htmlNode.selfClosing = true;
            this._lexer.accept();
        } else {
            this._lexer.accept(TokenType.TagGT);
        }

        // If not self-closing we must parse child nodes
        if (!htmlNode.selfClosing) {

            // Script and style tags just get all as text
            if (htmlNode.tag == "style" || htmlNode.tag == "script") {
                const textStart = this._lexer.getStartPosition();
                this._lexer.setHTMLContentStart(textStart.position);
                let text = this._lexer.acceptHTMLText(false).value;
                const htmlText = new HTMLTextExpr(text);
                htmlText.startPosition = textStart;
                htmlText.endPosition = this._lexer.getEndPosition();
                htmlNode.childNodes.push(htmlText);
            } else {

                while (!this._lexer.check(TokenType.TagClose)) {
                    this._lexer.setHTMLContentStart(this._lexer.getEndPosition().position);

                    // Parse html nodes
                    if (this._lexer.check(TokenType.TagLT)) {
                        htmlNode.childNodes.push(this.parseHTML(doc, visitor));
                    }

                    // Shortcut for if statements
                    else if (this._lexer.check(TokenType.KW_If)) {
                        const dynStart = this._lexer.getStartPosition();

                        const htmlExprNode = new HTMLDynExpr();
                        htmlExprNode.startPosition = dynStart;

                        htmlExprNode.expr = this.parseIf();

                        htmlExprNode.endPosition = this._lexer.getEndPosition();

                        htmlNode.childNodes.push(visitor(htmlExprNode));
                    }
                    
                    // Parse expression nodes
                    else if (this._lexer.check(TokenType.BraceOpen)) {
                        const dynStart = this._lexer.getStartPosition();
                        this._lexer.accept();

                        const htmlExprNode = new HTMLDynExpr();
                        htmlExprNode.startPosition = dynStart;

                        htmlExprNode.expr = this.parseExpression();
                        
                        this._lexer.accept(TokenType.BraceClose);
                        htmlExprNode.endPosition = this._lexer.getEndPosition();

                        htmlNode.childNodes.push(visitor(htmlExprNode));

                        // Check if there's any whitespace
                        if (this._lexer.isWhite(this._lexer.getEndPosition().position)) {
                            this._lexer.setHTMLContentStart(this._lexer.getEndPosition().position);
                            htmlNode.childNodes.push(visitor(new HTMLTextExpr(this._lexer.acceptHTMLText().value)));
                        }
                    }
                    
                    
                    // Inner text
                    else {
                        const text = new HTMLTextExpr(this._lexer.acceptHTMLText().value);
                        htmlNode.childNodes.push(visitor(text));
                    }
                }

                // If last one is white space, remove it
                if (htmlNode.childNodes.length > 1 && htmlNode.childNodes[htmlNode.childNodes.length - 1].htmlType == HTMLExprType.Text) {
                    const lastNode = htmlNode.childNodes[htmlNode.childNodes.length - 1] as HTMLTextExpr;

                    if (lastNode.text.trim() == '') {
                        htmlNode.childNodes.pop();
                    }
                }
            }

            // Close tag
            this._lexer.accept(TokenType.TagClose);
            if (tagName !== "") {
                let closeTag = this._lexer.accept(TokenType.Ident).value;
                if (closeTag != tagName) {
                    throw new CompilerError(`Expected </${tagName}>`, this._lexer.getStartPosition());
                }

                // Optionally add id
                if (this._lexer.check(TokenType.Dot)) {
                    this._lexer.accept();
                    this._lexer.acceptIdent(id);
                }
            }
            this._lexer.accept(TokenType.TagGT);
        }

        htmlNode.endPosition = this._lexer.getEndPosition();

        return visitor(htmlNode);
    }

    private parseExpression = () => {
        /*
        We can't know an expression is an arrow function until we are
        already a few tokens in and find the =>

        So we assume every expression is going to be an arrow function and parse it as such
        and if the parsing fails, it reverts back to the start and parse the expression normally
        */
        return this.tryParseArrowFunction(() => {
            return this.parseExpressionNormally();
        });
    };

    private tryParseArrowFunction = (onFail: ()=>ExprNode): ExprNode => {

        const revertPosition = this._lexer.getPosition();
        const startPosition = this._lexer.getStartPosition();

        const funcNode = new FuncExpr();
        funcNode.startPosition = startPosition;

        try {

            if (this._lexer.check(TokenType.ParOpen)) {
                this._lexer.accept();

                if (!this._lexer.check(TokenType.ParClose)) {
                    funcNode.params.push(this._lexer.accept(TokenType.Ident).value as string);

                    while (this._lexer.check(TokenType.Comma)) {
                        this._lexer.accept();

                        // Allow trailing commas
                        if (this._lexer.check(TokenType.ParClose)) {
                            break;
                        }

                        funcNode.params.push(this._lexer.accept(TokenType.Ident).value as string);
                    }
                }

                this._lexer.accept(TokenType.ParClose);
            } else {
                funcNode.params = [this._lexer.accept(TokenType.Ident).value as string];
            }

            this._lexer.accept(TokenType.Arrow);

        } catch (e) {
            if (!e.important) {
                try {
                    this._lexer.revert(startPosition);
                    return onFail();
                } catch (e) {
                    this._lexer.revert(revertPosition);

                    if (!e.important) {
                        return onFail();
                    } else {
                        throw e;
                    }
                }
            } else {
                throw e;
            }
        }

        /*
        We parse the rest out here because we've already found the arrow.

        Any errors in the function body shouldn't force us to try to parse the whole thing
        as a normal expression because we've already confirmed that it's an arrow function
        and we want to confine the syntax errors to the function body
        */

        if (this._lexer.check(TokenType.BraceOpen)) {
            funcNode.body = this.parseBlock(true);
        } else {
            const block = new BlockStmt();
            const ret = new ReturnStmt();
            ret.expr = this.parseExpression();
            block.statements.push(ret);
            funcNode.body = block;
        }

        funcNode.endPosition = this._lexer.getEndPosition();
        return funcNode;
    };

    private parseIf = (): IfExpr => {
        this._lexer.accept();

        const ifNode = new IfExpr();
        ifNode.startPosition = this._lexer.getStartPosition();

        this._lexer.accept(TokenType.ParOpen);
        ifNode.condition = this.parseExpression();

        if (ifNode.condition.unpack().exprType == ExprType.IfRules) {
            throw new CompilerError('If condition cannot be if statement or ternany operation', ifNode.startPosition, this._lexer.getEndPosition());
        }

        this._lexer.accept(TokenType.ParClose);

        ifNode.result = this.parseStatement();

        if (this._lexer.check(TokenType.KW_Else)) {
            this._lexer.accept();

            ifNode.elseResult = this.parseStatement();
        }

        ifNode.endPosition = this._lexer.getEndPosition();

        ifNode.setAsExpression();
        return ifNode;
    };

    private parseExpressionNormally = (precedence: number = 10000): ExprNode => {

        if (this._lexer.check(TokenType.KW_If)) return this.parseIf();
        if (this._lexer.check(TokenType.TagLT)) return this.parseHTML();
        if (this._lexer.check(TokenType.TemplateTick)) return this.parseTemplate();

        precedence = precedence || 10000;

        this._lexer.check();
        let startPosition = this._lexer.getStartPosition();
        let value: ExprNode = null;

        // Check for unary operators
        if (this._lexer.checkOp('-') || this._lexer.checkOp('!') || this._lexer.checkOp('++') || this._lexer.checkOp('--')) {
            const op = getAsOp(this._lexer.accept());

            const opExpr = new UnaryExpr(op.value);
            opExpr.expr = this.parseValue();

            if (op.value == '++' || op.value == '--') {
                this.verifyLValue(opExpr.expr);
            }

            opExpr.startPosition = startPosition;
            opExpr.endPosition = this._lexer.getEndPosition();

            value = opExpr;
        }

        // Check for new
        else if (this._lexer.check(TokenType.KW_New)) {
            const newOp = new NewExpr();
            newOp.startPosition = this._lexer.getStartPosition();
            
            this._lexer.accept();

            newOp.className = new LoadExpr(this._lexer.accept(TokenType.Ident).value as string);

            if (this._lexer.check(TokenType.ParOpen)) {
                this._lexer.accept();

                if (!this._lexer.check(TokenType.ParClose)) {
                    newOp.args.push(this.parseExpression());

                    while (this._lexer.check(TokenType.Comma)) {
                        this._lexer.accept();

                        // Allow trailing commas
                        if (this._lexer.check(TokenType.ParClose)) {
                            break;
                        }

                        newOp.args.push(this.parseExpression());
                    }
                }

                this._lexer.accept(TokenType.ParClose);
            }

            newOp.endPosition = this._lexer.getEndPosition();
            value = newOp;
        }

        // Any other value
        else {
            value = this.parseValue();
        }

        while (this._lexer.check() && isOp(this._lexer.check()) && getOpPrecedence(getAsOp(this._lexer.check()).value) < precedence) {
            const op = getAsOp(this._lexer.accept());

            if (op.value == '?') {
                let b = this.parseExpressionNormally(getOpPrecedence(op.value));
                this._lexer.accept(TokenType.Colon);
                let c = this.parseExpressionNormally(getOpPrecedence(op.value));

                let expr = new IfExpr();
                expr.condition = value;
                expr.result = b;
                expr.elseResult = c;

                value = expr;

                value.startPosition = startPosition;

                value.endPosition = this._lexer.getEndPosition();


            } else {
                let b = this.parseExpressionNormally(getOpPrecedence(op.value));

                let expr = new OpExpr(op.value);
                expr.expr1 = value;
                expr.expr2 = b;

                value = expr;

                value.startPosition = startPosition;

                value.endPosition = this._lexer.getEndPosition();
            }
        }

        return value;
    };

    private parseValue = (): ExprNode => {
        const curToken = this._lexer.check();
        const startPosition = this._lexer.getStartPosition();

        let result: ExprNode = null;

        switch (curToken.type) {
            case TokenType.String:
            case TokenType.Number:
            case TokenType.True:
            case TokenType.False:
            case TokenType.Null:
            {
                this._lexer.accept();
                result = new LitExpr(curToken.value);
                break;
            }

            case TokenType.Ident: {
                this._lexer.accept();

                result = new LoadExpr(curToken.value);
                break;
            }

            case TokenType.ParOpen: {

                /*
                When we open brackets it might be the start of an arrow function, i.e. (a, b) => a + b
                or it might just be a parenthesised expression, i.e. (a + b)

                We can't know until we see a few tokens ahead, so we start by assuming it's going to be
                an arrow function, and if that fails we revert back to the start and try to parse
                a normal parenthesised expression
                */
                result = this.tryParseArrowFunction(() => {
                    this._lexer.accept();

                    let inner = this.parseExpression();
                    this._lexer.accept(TokenType.ParClose);

                    return new ParExpr(inner);
                });
                
                break;
            }

            case TokenType.BraceOpen: {
                this._lexer.accept();

                const objExpr = new ObjExpr();

                if (!this._lexer.check(TokenType.BraceClose)) {

                    let key = this._lexer.acceptAny([TokenType.Ident, TokenType.String]).value as string;

                    if (this._lexer.check(TokenType.Colon)) {
                        this._lexer.accept(TokenType.Colon);
                        objExpr.values[key] = this.parseExpression();
                    } else {
                        objExpr.values[key] = undefined;
                    }

                    while (this._lexer.check(TokenType.Comma)) {
                        this._lexer.accept();

                        // Allow trailing comma
                        if (this._lexer.check(TokenType.BraceClose)) {
                            break;
                        }

                        key = this._lexer.acceptAny([TokenType.Ident, TokenType.String]).value as string;

                        if (this._lexer.check(TokenType.Colon)) {
                            this._lexer.accept(TokenType.Colon);
                            objExpr.values[key] = this.parseExpression();
                        } else {
                            objExpr.values[key] = undefined;
                        }
                    }
                }

                this._lexer.accept(TokenType.BraceClose);

                result = objExpr;
                break;
            }

            case TokenType.SquareOpen: {
                this._lexer.accept();

                const arrExpr = new ArrayExpr();

                if (!this._lexer.check(TokenType.SquareClose)) {
                    arrExpr.values.push(this.parseExpression());

                    while (this._lexer.check(TokenType.Comma)) {
                        this._lexer.accept();

                        // Allow trailing comma
                        if (this._lexer.check(TokenType.SquareClose)) {
                            break;
                        }

                        arrExpr.values.push(this.parseExpression());
                    }
                }

                this._lexer.accept(TokenType.SquareClose);

                result = arrExpr;
                break;
            }

            case TokenType.KW_Function: {
                this._lexer.accept();
                const funcExpr = new FuncExpr();

                this._lexer.accept(TokenType.ParOpen);

                if (!this._lexer.check(TokenType.ParClose)) {
                    funcExpr.params.push(this._lexer.accept(TokenType.Ident).value as string);

                    while (this._lexer.check(TokenType.Comma)) {
                        this._lexer.accept();

                        // Allow trailing commas
                        if (this._lexer.check(TokenType.ParClose)) {
                            break;
                        }

                        funcExpr.params.push(this._lexer.accept(TokenType.Ident).value as string);
                    }
                }

                this._lexer.accept(TokenType.ParClose);

                funcExpr.body = this.parseBlock(true);

                result = funcExpr;
                break;
            }

            case TokenType.KW_Class: {
                result = this.parseClass();
                break;
            }

        }

        if (result) {

            // Check if we're accessing an object or array, or performing a call (method or function)
            while (this._lexer.check(TokenType.Dot) || this._lexer.check(TokenType.SquareOpen) || this._lexer.check(TokenType.ParOpen)) {

                // Object access and method calls
                if (this._lexer.check(TokenType.Dot)) {
                    this._lexer.accept();
                    const property = this._lexer.accept(TokenType.Ident).value as string;

                    if (this._lexer.check(TokenType.ParOpen)) {
                        this._lexer.accept(TokenType.ParOpen);

                        const methodCall = new MethodCallExpr();
                        methodCall.obj = result;
                        methodCall.prop = property;

                        if (!this._lexer.check(TokenType.ParClose)) {
                            methodCall.args.push(this.parseExpression());

                            while (this._lexer.check(TokenType.Comma)) {
                                this._lexer.accept();

                                // Allow trailing commas
                                if (this._lexer.check(TokenType.ParClose)) {
                                    break;
                                }

                                methodCall.args.push(this.parseExpression());
                            }
                        }

                        this._lexer.accept(TokenType.ParClose);

                        result = methodCall;
                    } else {
                        const objAccess = new AccessObjExpr();

                        objAccess.obj = result;
                        objAccess.prop = property;

                        result = objAccess;
                    }
                }

                // Array access
                else if (this._lexer.check(TokenType.SquareOpen)) {
                    this._lexer.accept();

                    const arrAccess = new AccessArrExpr();

                    const index = this.parseExpression();
                    this._lexer.accept(TokenType.SquareClose);

                    arrAccess.obj = result;
                    arrAccess.index = index;

                    result = arrAccess;
                }

                // Function call
                else if (this._lexer.check(TokenType.ParOpen)) {
                    this._lexer.accept();

                    const callExpr = new CallExpr();
                    callExpr.func = result;

                    if (!this._lexer.check(TokenType.ParClose)) {
                        callExpr.args.push(this.parseExpression());

                        while (this._lexer.check(TokenType.Comma)) {
                            this._lexer.accept();

                            // Allow trailing commas
                            if (this._lexer.check(TokenType.ParClose)) {
                                break;
                            }

                            callExpr.args.push(this.parseExpression());
                        }
                    }

                    this._lexer.accept(TokenType.ParClose);

                    result = callExpr;
                }
            }

            // Check for '++' or '--'
            if (this._lexer.checkOp('++')) {
                this._lexer.accept();
                const unOp = new UnaryExpr('++');
                unOp.postFix = true;

                unOp.expr = result;
                result = unOp;
            } else if (this._lexer.checkOp('--')) {
                this._lexer.accept();
                const unOp = new UnaryExpr('--');
                unOp.postFix = true;

                unOp.expr = result;
                result = unOp;
            }

            result.startPosition = startPosition;
            this._lexer.check();
            result.endPosition = this._lexer.getEndPosition();

            return result;
        }

        throw new CompilerError(`Unexpected token '${this._lexer.check().type}'. Expected value`, startPosition, this._lexer.getEndPosition());
    };
}