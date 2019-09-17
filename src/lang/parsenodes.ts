import { isArray, isFunction, isString } from 'util';

import { CompilerError, RuntimeError, PluginError } from './errors';
import { IToken, IPosition, isComparisonOp, isBooleanOp, isArithmeticOp, Lexer, TokenType } from './lexer';
import { Runtime, IScope } from './runtime';
import { IRuleCondition, IVarRule, IVarConfig, createRuleConditions } from './varconfig';
import { FuncClosure } from './closure';
import { IValues, IEvaluatable } from './values';
import { YieldVar } from './remotevars';
import chalk from 'chalk';


const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

//****************************************************
// Main
//****************************************************

export enum NodeType {
    Root = "root",
    Import = "import",
    Var = "var",
    Lookup = "lookup",
    Const = "const",
    Statement = "statement",
    DocComment = "doccomment",
    Type = "type"
}

export class ParseNode {
    public startPosition: IPosition;
    public endPosition: IPosition;

    constructor(public type: NodeType) {
    }
}


export class RootNode extends ParseNode {
    public yields: { [name: string]: YieldNode } = {};
    public lookups: { [name: string]: LookupTableNode } = {};

    public imports: ImportNode[] = [];

    public statements: StmtNode[] = [];

    constructor() {
        super(NodeType.Root);
    }
}

export class ImportNode extends ParseNode {
    public asName: string;
    public members: string[];
    public file: string;

    constructor() {
        super(NodeType.Import);
    }
}

export class YieldNode extends ParseNode {
    public name: string;
    public value: ExprNode;
    public lookup: string = null;

    constructor() {
        super(NodeType.Var);
    }
}

export class LookupTableNode extends YieldNode {
    public items: { [key: string]: ExprNode } = {};

    constructor(items: ObjExpr) {
        super();
        this.type = NodeType.Lookup;
        this.value = items;
    }

}

export interface IDocCommentParam {
    name: string;
    type: TypeNode;
    desc: string;
}

export class DocCommentNode extends ParseNode {
    public declType: "template"|"other";

    public desc: string;
    public params: IDocCommentParam[] = [];
    public returnType: TypeNode = null;
    public type_: TypeNode = null;

    constructor() {
        super(NodeType.DocComment);

        this.declType = "other";
    }

    // Converts to a TS definition
    toTSDef = (decl: string): string => {
        if (this.declType == "template") {
            return `export const ${decl}: React.FC<{ ${this.params.map(param => `${param.name}: ${param.type.toTSDef()}`).join(', ')} }>;`;
        } else {
            
            if (this.params.length > 0) {
                return `export const ${decl}: (${this.params.map(param => `${param.name}: ${param.type.toTSDef()}`).join(', ')})=>${this.returnType ? this.returnType.toTSDef() : 'any'};`;
            } else if (this.type_) {
                return `export const ${decl}: ${this.type_.toTSDef()};`;
            } else {
                return "";
            }
        }
    };
}

//****************************************************
// Statements
//****************************************************

export enum StmtType {
    Noop = "noop",
    Block = "block",
    StmtList = "stmtlist",
    Return = "return",
    VarDecl = "vardecl",
    For = "for",
    ForOf = "forof",
    While = "while",
    DoWhile = "dowhile",
    Expr = "expr",
    Describe = "describe",
    Run = "run"
}

export class StmtNode extends ParseNode implements IEvaluatable {
    protected _exported: boolean = false;

    constructor(public stmtType: StmtType) {
        super(NodeType.Statement);
    }

    isExported = () => this._exported;

    setExported = () => {
        if (this.stmtType == StmtType.VarDecl) {
            this._exported = true;
        } else {
            throw new CompilerError(`Only declarations can be exported`, this.startPosition, this.endPosition);
        }
    };

    generateConditionValue = (runtime: Runtime, args: IValues): any => {
        try {
            const evaluated = this.evaluate(runtime, args);
            if (evaluated !== undefined) {
                return evaluated + '';
            }
            return '';
        } catch (e) {
            if (e.__cannotResolveException) {
                throw new CompilerError("Alterian does not support this operation", this.startPosition, this.endPosition);
            } else {
                throw e;
            }
        }
    };

    generateConditions = (runtime: Runtime, args: IValues, conditions: IRuleCondition[]) => {
        //throw new CompilerError(`Alterian doesn't support this operation`, this.startPosition, this.endPosition);
    };

    evaluate = (runtime: Runtime, args: IValues): any => {
        return undefined;
    };
}

export class NoopStmt extends StmtNode {
    constructor() {
        super(StmtType.Noop);
    }
}

export class StmtList extends StmtNode {
    public statements: StmtNode[] = [];

    constructor() {
        super(StmtType.StmtList);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        for (let stmt of this.statements) {
            stmt.evaluate(runtime, args);
        }
    };
}

export class BlockStmt extends StmtNode {
    public statements: StmtNode[] = [];
    public returnOnFirstValue: boolean = false;
    public forceThrowReturn: boolean = false;

    constructor() {
        super(StmtType.Block);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        runtime.pushScope();
        for (let stmt of this.statements) {
            const evaluated = stmt.evaluate(runtime, args);

            if (this.returnOnFirstValue && evaluated !== undefined) {
                runtime.popScope();

                if (this.forceThrowReturn) {
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
}

export class ReturnStmt extends StmtNode {
    public expr: ExprNode;

    constructor() {
        super(StmtType.Return);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        if (this.expr) return this.expr.evaluate(runtime, args);

        return undefined;
    };
}

export class VarDeclStmt extends StmtNode {
    public name: string;
    public value: ExprNode;
    public isConst: boolean = false;

    public docComment: DocCommentNode = null;

    constructor() {
        super(StmtType.VarDecl);
    }

    // Looks at value and tries to generate a doc comment from it if it's a const variable
    generateOwnDocComment = () => {
        if (!this.isConst) return;

        this.docComment = new DocCommentNode();
        this.docComment.type_ = this.value.tryCreateType();
    };

    evaluate = (runtime: Runtime, args: IValues): any => {
        if (runtime.getScope()[this.name] !== undefined) {
            throw new CompilerError(`Redefinition of '${this.name}'`, this.startPosition, this.endPosition);
        }
        if (this.isConst) runtime.setConst(this.name);
        runtime.getScope()[this.name] = this.value.evaluate(runtime, args);
    };
}

export class WhileStmt extends StmtNode {
    public condition: ExprNode;
    public body: StmtNode;

    constructor() {
        super(StmtType.While);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        try {
            while (runtime.checkForYieldedLoad(() => this.condition.evaluate(runtime, args))) {
                this.body.evaluate(runtime, args);
            }
        } catch (e) {
            if (e.__cannotResolveException === true) {
                throw new CompilerError('Attempting to use a yielded variable in while loop condition', this.condition.startPosition, this.condition.endPosition);
            } else throw e;
        }
    };
}


export class ForStmt extends StmtNode {
    public init: StmtNode;
    public condition: ExprNode;
    public after: StmtNode;
    public body: StmtNode;

    constructor() {
        super(StmtType.For);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        runtime.pushScope();

        this.init.evaluate(runtime, args);

        try {
            while (runtime.checkForYieldedLoad(() => this.condition.evaluate(runtime, args))) {
                this.body.evaluate(runtime, args);
                this.after.evaluate(runtime, args);
            }
        } catch (e) {
            if (e.__cannotResolveException) {
                throw new CompilerError('Attempting to use a yielded variable in for loop condition', this.condition.startPosition, this.condition.endPosition);
            } else throw e;
        }

        runtime.popScope();
    };
}

export class ForOfStmt extends StmtNode {
    public initDecl: "var"|"let"|"const"|null = null;
    public initLoad: string;
    public collection: ExprNode;
    public body: StmtNode;

    constructor() {
        super(StmtType.ForOf);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        const evaluatedCollection = this.collection.evaluate(runtime, args);
        const iter = evaluatedCollection[Symbol.iterator]();

        runtime.pushScope();

        let next;
        if (this.initDecl == "const") {
            runtime.setConst(this.initLoad);
        }
        while (!(next = iter.next()).done) {
            runtime.getScope()[this.initLoad] = next.value;

            this.body.evaluate(runtime, args);
        }

        runtime.popScope();
    };
}

export class DoWhileStmt extends StmtNode {
    public condition: ExprNode;
    public body: StmtNode;

    constructor() {
        super(StmtType.DoWhile);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        try {
            do {
                this.body.evaluate(runtime, args);
            } while (runtime.checkForYieldedLoad(() => this.condition.evaluate(runtime, args)))
        } catch (e) {
            if (e.__cannotResolveException) {
                throw new CompilerError('Attempting to use a yielded variable in do/while loop condition', this.condition.startPosition, this.condition.endPosition);
            } else throw e;
        }
    };
}


//****************************************************
// Test cases
//****************************************************


export class DescribeNode extends StmtNode {
    public description: string;
    public testRuns: RunNode[] = [];

    constructor() {
        super(StmtType.Describe);
    }
}

export enum RunNodeType {
    Test = "test",
    Todo = "todo"
}

export class RunNode extends StmtNode {
    public description: string;
    
    constructor(public runNodeType: RunNodeType) {
        super(StmtType.Run);
    }
}

export class RunTestNode extends RunNode {
    public settings: { [varName: string]: ExprNode } = {};
    public assertion: ExprNode;

    constructor() {
        super(RunNodeType.Test);
    }
}

export class RunTodoNode extends RunNode {
    constructor() {
        super(RunNodeType.Todo);
    }
}


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
class CannotResolve {
    public __cannotResolveException = true;

    constructor(public startPosition: IPosition, public endPosition?: IPosition) {
    }
}




export enum ExprType {
    Literal = "literal",
    Load = "load",
    Parentheses = "parentheses",
    UnaryOp = "unaryop",
    Operator = "op",
    Object = "object",
    Array = "array",
    AccessObj = "accobj",
    AccessArr = "accarr",
    Call = "call",
    MethodCall = "methodcall",
    AlterianMethodCall = "alterianmethodcall",
    Function = "function",
    IfRules = "ifrules",
    HTML = "html",
    New = "new",
    Template = "template"
}


export class ExprNode extends StmtNode {
    constructor(public exprType: ExprType) {
        super(StmtType.Expr);
    }

    // Tries to create a type from the expression, i.e. 42 -> number, {x: "hello"} -> {x: string}, etc
    // Defaults to 'any'
    tryCreateType = (): TypeNode => TypeNode.getBasicType("any");

    // Removes any parentheses
    unpack = (): ExprNode => {
        let expr: any = this;

        while (expr && expr.exprType == ExprType.Parentheses) {
            expr = (expr as ParExpr).expr;
        }

        return expr as ExprNode;
    };
}


export class LitExpr extends ExprNode {
    constructor(public literal: any) {
        super(ExprType.Literal);
    }

    tryCreateType = (): TypeNode => {

        if (typeof this.literal === "string") {
            return TypeNode.getBasicType("string");
        } else if (typeof this.literal === "number") {
            return TypeNode.getBasicType("number");
        } else if (this.literal === true) {
            return TypeNode.getBasicType("boolean");
        } else if (this.literal === false) {
            return TypeNode.getBasicType("boolean");
        } else if (this.literal === null) {
            return TypeNode.getBasicType("any");
        }

        return null;
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        return this.literal;
    };
}

export class LoadExpr extends ExprNode {
    constructor(public varName: string) {
        super(ExprType.Load);
    }

    generateConditions = (runtime: Runtime, args: IValues, conditions: IRuleCondition[]): void => {
        createRuleConditions(conditions, this.generateConditionValue(runtime, args), '', '!=');
    }

    evaluate = (runtime: Runtime, args: IValues): any => {

        let result = null;

        // Special
        if (this.varName == '__dirname') {
            return __dirname;
        }

        // This
        else if (this.varName == 'this') {
            const stackTop = runtime.stackTop();
            if (!stackTop) return undefined;

            return stackTop.thisArg;
        }

        // Local variables
        else if (runtime.getLocal(this.varName) !== undefined) {
            result = runtime.getLocal(this.varName);
        }

        // Local arguments
        else if (args[this.varName] !== undefined) {
            result = args[this.varName];
        }
        
        // Yielded variables
        else if (runtime.yieldedVars[this.varName] !== undefined) {
            //if (runtime.shouldThrowOnPublic) throw new CannotResolve;
            result = new YieldVar(this.varName);
        }

        // Global javascript objects
        else if (global[this.varName] !== undefined) {
            result = global[this.varName];
        }

        // Error if referencing a lookup table
        else if (Runtime.lookupTables[this.varName] !== undefined) {
            let firstValue = "";
            if (Object.keys(Runtime.lookupTables[this.varName]).length > 0) {
                firstValue = chalk.yellow(' = ') + ` ${chalk.red( '"' + Object.keys(Runtime.lookupTables[this.varName])[0] + '"')}`;
            }
            const example = `${chalk.blue("yield")} MyVar ${chalk.bold(chalk.yellow('=>'))} ${chalk.green(this.varName)}${firstValue};`;
            throw new CompilerError(`Cannot directly reference lookup table '${this.varName}'. Create a new yield that resolves to a value in the table, i.e.,\n\t ${example}`, this.startPosition, this.endPosition);
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

        if (runtime.shouldThrowOnYieldedLoad && result.__isYielded) throw new CannotResolve(this.startPosition, this.endPosition);

        return result;
    };
}

export class ParExpr extends ExprNode {
    constructor(public expr: ExprNode) {
        super(ExprType.Parentheses);
    }

    tryCreateType = (): TypeNode => new ParTypeNode(this.expr.tryCreateType());

    generateConditionValue = (runtime: Runtime, args: IValues): string => {
        return this.expr.generateConditionValue(runtime, args);
    };

    generateConditions = (runtime: Runtime, args: IValues, conditions: IRuleCondition[]): void => {
        const parConditions: IRuleCondition[] = [];
        this.expr.generateConditions(runtime, args, parConditions);

        runtime.generateIntermediateConditions(conditions, parConditions);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        return this.expr.evaluate(runtime, args);
    }
}


export class NewExpr extends ExprNode {
    public className: LoadExpr;
    public args: ExprNode[] = [];

    constructor() {
        super(ExprType.New);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        const loaded = this.className.evaluate(runtime, args);

        const resolvedArgs = this.args.map(arg => arg.evaluate(runtime, args));

        let func = loaded;
        if (func.__isClosure) {
            const newObj = Object.create(func.prototype);
            newObj.prototype = func.prototype;
            func.apply(newObj, resolvedArgs);
            return newObj;
        } else {
            return new func(...resolvedArgs);
        }
    }
}

export type OpType = '-'|'*'|'/'|'<'|'<='|'>'|'>='|'=='|'==='|'!='|'!=='|'&&'|'||'|'+='|'-='|'*='|'/='|'='|'+'|'instanceof';
export type UnOpType = '-'|'!'|'--'|'++';


const storeValue = (runtime: Runtime, args: IValues, value: any, location: ExprNode) => {

    switch (location.exprType) {
        case ExprType.Load: {
            const loadExpr = location as LoadExpr;
            if (runtime.isConst(loadExpr.varName)) {
                throw new RuntimeError(`Attempting to reassign const variable '${loadExpr.varName}'`, this.startPosition, this.endPosition);
            } else if (runtime.yieldedVars[loadExpr.varName] !== undefined) {
                throw new RuntimeError(`Attempting to assign a yielded variable '${loadExpr.varName}'`, this.startPosition, this.endPosition);
            }
            runtime.setLocal(loadExpr.varName, value);
            break;
        }

        case ExprType.AccessArr: {
            const accExpr = location as AccessArrExpr;
            const arr = accExpr.obj.evaluate(runtime, args);
            const index = accExpr.index.evaluate(runtime, args);

            arr[index] = value;

            break;
        }

        case ExprType.AccessObj: {
            const accExpr = location as AccessObjExpr;
            const obj = accExpr.obj.evaluate(runtime, args);
            obj[accExpr.prop] = value;

            break;
        }
    }
};

export class OpExpr extends ExprNode {
    public expr1: ExprNode;
    public expr2: ExprNode;

    constructor(public opType: OpType) {
        super(ExprType.Operator);
    }

    generateConditions = (runtime: Runtime, args: IValues, conditions: IRuleCondition[]): void => {

        if (isComparisonOp(this.opType)) {

            /*
            Special case for {x}.indexOf("y") <operator> 0

            We can look at certain patterns and create a condition operator
            such as 'startsWith' or 'contains' etc depending on the current operator and RHS
            */
            if (this.expr1.exprType == ExprType.MethodCall) {
                const leftMethodCall = this.expr1 as MethodCallExpr;

                const obj = leftMethodCall.obj.evaluate(runtime, args);
                const right = this.expr2.evaluate(runtime, args);

                if (obj && obj.__isYielded && leftMethodCall.prop == "indexOf") {
                    const resolvedArgs = leftMethodCall.args.map(arg => arg.evaluate(runtime, args));

                    if (right === 0) {
                        if (this.opType == "==" || this.opType == "===") {
                            createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "startsWith");
                            return;
                        } else if (this.opType == "!=" || this.opType == "!==") {
                            createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "notStartsWith");
                            return;
                        } else if (this.opType == ">") {
                            createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "contains", "&&");
                            createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "notStartsWith");
                            return;
                        } else if (this.opType == ">=") {
                            createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "contains");
                            return;
                        } else if (this.opType == "<") {
                            createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "notContains");
                            return;
                        } else if (this.opType == "<=") {
                            createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "startsWith", "||");
                            createRuleConditions(conditions, obj.toString(), resolvedArgs[0], "notContains");
                            return;
                        }
                    }
                }
            }

            const left = this.expr1.generateConditionValue(runtime, args);
            const right = this.expr2.generateConditionValue(runtime, args);

            createRuleConditions(conditions, left, right, this.opType as any);
        }

        else if (isBooleanOp(this.opType)) {
            let leftConditions: IRuleCondition[] = [];
            let rightConditions: IRuleCondition[] = [];

            this.expr1.generateConditions(runtime, args, leftConditions);
            this.expr2.generateConditions(runtime, args, rightConditions);

            if (leftConditions.length > 1) {
                let newLeftConditions = [];
                runtime.generateIntermediateConditions(newLeftConditions, leftConditions);
                leftConditions = newLeftConditions;
            }
            if (rightConditions.length > 1) {
                let newRightConditions = [];
                runtime.generateIntermediateConditions(newRightConditions, rightConditions);
                rightConditions = newRightConditions;
            }

            leftConditions[leftConditions.length - 1].type = this.opType as any;

            conditions.push(...leftConditions);
            conditions.push(...rightConditions);
        }

        else if (isArithmeticOp(this.opType)) {
            const left = this.generateConditionValue(runtime, args);
            createRuleConditions(conditions, left, '', '!=');
        }
    };

    generateConditionValue = (runtime: Runtime, args: IValues): any => {
        const left = this.expr1.generateConditionValue(runtime, args);
        const right = this.expr2.generateConditionValue(runtime, args);

        let stringExpr = "";
        switch (this.opType) {
            case '+':   stringExpr = left + `.Add([${right}])`; break;
            case '-':   stringExpr = left + `.Sub([${right}])`; break;
            
            default:
                throw new CompilerError("Alterian doesn't support this operation", this.startPosition, this.endPosition);
        }

        return new YieldVar(stringExpr, false);
    };

    evaluate = (runtime: Runtime, args: IValues): any => {

        if (this.opType == "=") {
            storeValue(runtime, args, this.expr2.evaluate(runtime, args), this.expr1);
            return undefined;
        } else if (this.opType == '+=') {
            storeValue(
                runtime,
                args,
                this.expr1.evaluate(runtime, args) + this.expr2.evaluate(runtime, args),
                this.expr1
            );

            return undefined;
        } else if (this.opType == '-=') {
            storeValue(
                runtime,
                args,
                this.expr1.evaluate(runtime, args) - this.expr2.evaluate(runtime, args),
                this.expr1
            );

            return undefined;
        } else if (this.opType == '*=') {
            storeValue(
                runtime,
                args,
                this.expr1.evaluate(runtime, args) * this.expr2.evaluate(runtime, args),
                this.expr1
            );

            return undefined;
        } else if (this.opType == '/=') {
            storeValue(
                runtime,
                args,
                this.expr1.evaluate(runtime, args) / this.expr2.evaluate(runtime, args),
                this.expr1
            );

            return undefined;
        }

        const left = this.expr1.evaluate(runtime, args);
        const right = this.expr2.evaluate(runtime, args);

        if ((left && left.__isYielded) || (right && right.__isYielded)) {
            return this.generateConditionValue(runtime, args);
        }

        switch (this.opType) {
            case '+':    return left + right;
            case '-':    return left - right;
            case '*':    return left * right;
            case '/':    return left / right;
            case '<':    return left < right;
            case '<=':   return left <= right;
            case '>=':   return left >= right;
            case '>':    return left > right;
            case '==':   return left == right;
            case '===':  return left === right;
            case '!=':   return left != right;
            case '!==':  return left !== right;
            case '&&':   return left && right;
            case '||':   return left || right;

            case 'instanceof':  {
                if (right && right.__isClosure) {
                    return left instanceof right.func;
                }
                return left instanceof right;
            }
        }

        return null;
    };
}

export class UnaryExpr extends ExprNode {
    public expr: ExprNode;
    public postFix: boolean = null;

    constructor(public opType: UnOpType) {
        super(ExprType.UnaryOp);
    }

    tryCreateType = (): TypeNode => {
        const exprType = this.expr.tryCreateType();

        if (exprType.typeType == TypeNodeType.Literal) {
            const litType = exprType as LiteralTypeNode;

            if (litType.literal.type === TokenType.True) {
                return new LiteralTypeNode({ type: TokenType.False, value: false });
            } else if (litType.literal.type === TokenType.False) {
                return new LiteralTypeNode({ type: TokenType.True, value: true });
            }
        }

        return exprType;
    };

    generateConditions = (runtime: Runtime, args: IValues, conditions: IRuleCondition[]): void => {
        try {
            runtime.checkForYieldedLoad(() => {
                const obj = this.expr.evaluate(runtime, args);
            });
        } catch (e) {
            if (e.__cannotResolveException) {
                runtime.shouldThrowOnYieldedLoad = false;

                const conditionCount = conditions.length;
                this.expr.generateConditions(runtime, args, conditions);

                if (conditions.length > conditionCount) {
                    for (let condId = conditionCount; condId < conditions.length; condId++) {
                        const cond = conditions[condId];

                        if (this.opType == "!") {

                            // Invert whatever operation is here
                            switch (cond.operation) {
                                case "!=":              conditions[condId].operation = "=="; break;
                                case "!==":             conditions[condId].operation = "==="; break;
                                case "==":              conditions[condId].operation = "!="; break;
                                case "===":             conditions[condId].operation = "!=="; break;
                                case "<":               conditions[condId].operation = ">="; break;
                                case "<=":              conditions[condId].operation = ">"; break;
                                case ">":               conditions[condId].operation = "<="; break;
                                case ">=":              conditions[condId].operation = "<"; break;
                                case "contains":        conditions[condId].operation = "notContains"; break;
                                case "notContains":     conditions[condId].operation = "contains"; break;
                                case "startsWith":      conditions[condId].operation = "notStartsWith"; break;
                                case "notStartsWith":   conditions[condId].operation = "startsWith"; break;
                                case "endsWith":        conditions[condId].operation = "notEndsWith"; break;
                                case "notEndsWith":     conditions[condId].operation = "endsWith"; break;
                            }

                        } else {
                            throw new CompilerError(`Alterian does not support this operation`, this.startPosition, this.endPosition);
                        }
                    }
                }
            } else {
                throw e;
            }
        }
    };

    evaluate = (runtime: Runtime, args: IValues): any => {
        const operand = this.expr.evaluate(runtime, args);

        switch (this.opType) {
            case '!':   return !operand;
            case '-':   return -operand;
            case '++': {
                if (this.postFix) {
                    const evaluated = this.expr.evaluate(runtime, args) + 1;
                    storeValue(runtime, args, evaluated, this.expr);
                    return evaluated;
                } else {
                    const evaluated = this.expr.evaluate(runtime, args);
                    storeValue(runtime, args, evaluated, this.expr);
                    return evaluated + 1;
                }
            }
            case '--': {
                if (this.postFix) {
                    const evaluated = this.expr.evaluate(runtime, args) - 1;
                    storeValue(runtime, args, evaluated, this.expr);
                    return evaluated;
                } else {
                    const evaluated = this.expr.evaluate(runtime, args);
                    storeValue(runtime, args, evaluated, this.expr);
                    return evaluated - 1;
                }
            }
        }

        return null;
    }
}


export class ObjExpr extends ExprNode {
    public values: { [key: string]: ExprNode } = {};

    constructor() {
        super(ExprType.Object);
    }

    tryCreateType = (): TypeNode => {
        const objType = new ObjectTypeNode();

        Object.keys(this.values).forEach(key => {
            objType.props[key] = this.values[key].tryCreateType();
        })

        return objType;
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        const obj = {};

        Object.keys(this.values).forEach(key => {

            if (this.values[key] !== undefined) {
                obj[key] = this.values[key].evaluate(runtime, args);
            } else {

                /*
                In the case where we don't explicitly set a value and expect a local variable, i.e.

                const a = 4;
                const obj = { a };
                */
                obj[key] = runtime.getLocal(key);
            }
        });

        return obj;
    }
}

export class ArrayExpr extends ExprNode {
    public values: ExprNode[] = [];

    constructor() {
        super(ExprType.Array);
    }

    tryCreateType = (): TypeNode => {

        if (this.values.length > 0) {

            // If all the types are the same we can use that type
            const allTypesSame = this.values
                .map(value => value.tryCreateType())
                .every((elemType, index, array) => elemType.matches(array[0]));

            if (allTypesSame) {
                return new ArrayTypeNode(this.values[0].tryCreateType());
            }
        }

        // Default to 'any' array
        return new ArrayTypeNode(TypeNode.getBasicType("any"));
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        const array = this.values.map(val => val.evaluate(runtime, args));

        return array;
    }
}

export class AccessObjExpr extends ExprNode {
    public obj: ExprNode;
    public prop: string;

    constructor() {
        super(ExprType.AccessObj);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        const obj = this.obj.evaluate(runtime, args);
        
        if (obj === undefined) {
            throw new RuntimeError(`Cannot access property '${this.prop}' of undefined`, this.startPosition, this.endPosition);
        } else if (obj === null) {
            throw new RuntimeError(`Cannot access property '${this.prop}' of null`, this.startPosition, this.endPosition);
        }

        if (obj[this.prop] === undefined) {
            throw new RuntimeError(`Cannot find property '${this.prop}' on object`, this.startPosition, this.endPosition);
        }

        return obj[this.prop];
    }
}

export class AccessArrExpr extends ExprNode {
    public obj: ExprNode;
    public index: ExprNode;

    constructor() {
        super(ExprType.AccessArr);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        const obj = this.obj.evaluate(runtime, args);

        if (obj === undefined) {
            throw new RuntimeError(`Cannot access array index of undefined`, this.startPosition, this.endPosition);
        } else if (obj === null) {
            throw new RuntimeError(`Cannot access array index of null`, this.startPosition, this.endPosition);
        }

        return obj[this.index.evaluate(runtime, args)];
    }
}

export class CallExpr extends ExprNode {
    public func: ExprNode;
    public args: ExprNode[] = [];

    constructor() {
        super(ExprType.Call);
    }

    generateConditions = (runtime: Runtime, args: IValues, conditions: IRuleCondition[]): void => {
        createRuleConditions(conditions, this.generateConditionValue(runtime, args), '', '!=');
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        let resolvedArgs = this.args.map(arg => arg.evaluate(runtime, args));
        let func = this.func.evaluate(runtime, {...args, ...resolvedArgs});

        if (func === undefined) return undefined;

        // Odd cases where the function is yielded because
        // it uses a yielded parameter
        if (func.__isYielded) {
            func = func.name;
        }

        if (func.__isClosure) {
            const result = (func as FuncClosure).evaluate(runtime, resolvedArgs);

            // If there are any yielded values, the whole result has to be yielded
            const hasYielded = resolvedArgs.find(arg => arg.__isYielded === true);
            if (hasYielded !== undefined) {

                // No need to re-yield and already yielded value
                if (result.__isYielded) return result;

                return new YieldVar(result, false);
            }

            return result;
        }

        // If there are any closures as arguments, unpack them and get the actual js function
        // so we can call native methods like .map() etc
        resolvedArgs = resolvedArgs.map(resArg => {
            if (resArg) {
                if (resArg.__isClosure) {
                    return (resArg as FuncClosure).func;
                }
            }
            return resArg;
        });

        return func.apply(global, resolvedArgs);
    }
}

export class MethodCallExpr extends ExprNode {
    public obj: ExprNode;
    public prop: string;
    public args: ExprNode[] = [];

    constructor() {
        super(ExprType.MethodCall);
    }

    private generateMethodCallConditions = (runtime: Runtime, args: IValues, conditions: IRuleCondition[]): void => {

        let resolvedArgs = this.args.map(arg => arg.evaluate(runtime, args));
        const obj = this.obj.evaluate(runtime, args).toString();


        switch (this.prop) {
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
                throw new CompilerError('Alterian does not support this operation', this.startPosition, this.endPosition);
        }
    };

    /*generateConditionValue = (runtime: Runtime, args: IValues): any => {
        const conditions: IRuleCondition[] = [];

        this.generateConditions(runtime, args, conditions);
        return runtime.generateIntermediateValue(conditions);
    };*/

    generateConditions = (runtime: Runtime, args: IValues, conditions: IRuleCondition[]): void => {
        try {
            runtime.checkForYieldedLoad(() => {
                createRuleConditions(conditions, this.generateConditionValue(runtime, args), '', '!=');
            });
        } catch (e) {
            if (e.__cannotResolveException === true) {
                runtime.shouldThrowOnYieldedLoad = false;
                this.generateMethodCallConditions(runtime, args, conditions);
            } else {
                throw e;
            } 
        }
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        let resolvedArgs = this.args.map(arg => arg.evaluate(runtime, args));
        const obj = this.obj.evaluate(runtime, args);

        if (obj === undefined) {
            throw new RuntimeError(`Cannot call method '${this.prop}' on undefined`, this.startPosition, this.endPosition);
        } else if (obj === null) {
            throw new RuntimeError(`Cannot call method '${this.prop}' on null`, this.startPosition, this.endPosition);
        }

        // Check if it's a custom closure
        if (obj[this.prop] && obj[this.prop].__isClosure) {
            return (obj[this.prop] as FuncClosure).evaluate(runtime, resolvedArgs, obj);
        }

        // If any argument is a custom closure convert it to a native function
        resolvedArgs = resolvedArgs.map(resArg => {
            if (resArg && resArg.__isClosure) return (resArg as FuncClosure).func;
            return resArg;
        });

        // If yielded we can't evaluate it (unless it's toString())
        if (obj && obj.__isYielded) {
            if (this.prop === "toString") {
                return obj.toString();
            } else {
                throw new CannotResolve(this.startPosition, this.endPosition);
            }
        }

        return obj[this.prop].apply(obj, resolvedArgs);
    }
}


type AlterianFunction = (obj: any, runtime: Runtime, args: IValues)=>any;
export class AlterianMethodCall extends ExprNode {
    public obj: ExprNode;
    public prop: string;
    public args: ExprNode[] = [];

    constructor() {
        super(ExprType.AlterianMethodCall);
    }

    evaluate = (runtime: Runtime, args: IValues) => {
        let resolvedArgs = this.args.map(arg => arg.evaluate(runtime, args));
        const obj = this.obj.evaluate(runtime, args);

        if (obj === undefined) {
            throw new RuntimeError(`Cannot call method '${this.prop}' on undefined`, this.startPosition, this.endPosition);
        } else if (obj === null) {
            throw new RuntimeError(`Cannot call method '${this.prop}' on null`, this.startPosition, this.endPosition);
        }

        // Check if we're calling a native alterian method
        if (this._functions[this.prop] !== undefined) {
            if (obj === undefined) return "";
            if (obj.__isYielded) return "";
            return this._functions[this.prop](obj, runtime, args);
        } else {
            throw new CompilerError(`No such Alterian method '${this.prop}'`, this.startPosition, this.endPosition);
        }
    };

    private _functions: { [name: string]: AlterianFunction } = {

        FormatDate: (obj: any, runtime: Runtime, args: IValues) => {
            const [month, day, year] = obj.split('/');

            if (month === undefined || day === undefined || year === undefined) return "";

            let output = "";
            const format = this.args[0].evaluate(runtime, args);

            const lexer = new Lexer("", format + ' ');
            const formatArgs: string[] = [];
            while (lexer.hasNext()) {
                if (lexer.isWhite(lexer.getTemplateContentStart())) {
                    formatArgs.push(lexer.acceptUntil(char => { return Lexer.isAlpha(char) || Lexer.isDigit(char) }).value as string);
                    lexer.setTemplateContentStart(lexer.getEndPosition().position + 1);
                } else {
                    formatArgs.push(lexer.accept(TokenType.Ident).value as string);
                    lexer.setTemplateContentStart(lexer.getEndPosition().position);
                }
            }

            for (let formatArg of formatArgs) {
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


        Trim: (obj: any, runtime: Runtime, args: IValues) => obj.trim(),

        Add: (obj: any, runtime: Runtime, args: IValues) => {
            const arg1 = this.args[0].evaluate(runtime, args);

            if (isNaN(parseFloat(obj)) || isNaN(parseFloat(arg1))) {
                return obj + arg1;
            } else {
                return parseFloat(obj) + parseFloat(arg1);
            }
        },

        Sub: (obj: any, runtime: Runtime, args: IValues) => {
            const arg1 = this.args[0].evaluate(runtime, args);

            if (isNaN(parseFloat(obj)) || isNaN(parseFloat(arg1))) {
                return "ERROR";
            } else {
                return parseFloat(obj) - parseFloat(arg1);
            }
        },


        Translate: (obj: any, runtime: Runtime, args: IValues) => {
            const evaluatedArgs = this.args.map(arg => arg.evaluate(runtime, args));
            const evaluatedObj = parseInt(obj);

            if (evaluatedObj >= evaluatedArgs.length || evaluatedObj < 0) {
                return evaluatedArgs[0];
            } else {
                return evaluatedArgs[evaluatedObj + 1];
            }
        },


        Capitalize: (obj: any, runtime: Runtime, args: IValues) => {
            if (typeof obj === "string") {
                const strObj = obj as string;
                if (strObj.length === 0) return strObj;
                return strObj[0].toUpperCase() + strObj.substr(1);
            } else {
                return obj;
            }
        }

    };

}


/*
Since we're interpreting the parse nodes directly we can't simply directly
return from a function. We have to unroll the stack until we reach the function block.

A much simpler hack to do this is to simply throw an expection and catch it at function scope.
We check if the caught value has '__isReturnException' and we know it's a returned value, at which point we
return it naturally from the function.
*/
class ReturnException {
    private __isReturnException = true;

    constructor(public value: any) {

    }
}

export class FuncExpr extends ExprNode {
    public params: string[] = [];
    public body: StmtNode;

    constructor() {
        super(ExprType.Function);
    }

    tryCreateType = (): TypeNode => {
        const funcType = new FunctionTypeNode();
        funcType.returnType = TypeNode.getBasicType("any");

        for (let param of this.params) {
            funcType.params.push({
                name: param,
                type: TypeNode.getBasicType("any")
            })
        }

        return funcType;
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        const closure = new FuncClosure();
        closure.funcExpr = this;

        closure.runtime = runtime;
        closure.scope = runtime.getFullScope();

        const _this = this;
        closure.func = (...funcArgs) => {

            closure.runtime.pushStack(closure);

            closure.runtime.pushScope(closure.scope);
            closure.runtime.pushScope(_this.mapArgsToScope(closure.funcExpr.params, funcArgs));

            try {
                _this.body.evaluate(closure.runtime, {...args, ...funcArgs});
            } catch (e) {
                if (e.__isReturnException) {
                    closure.runtime.popScope();
                    closure.runtime.popScope();

                    closure.runtime.popStack();

                    return e.value;
                } else {
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
    }

    mapArgsToScope = (params: string[], args: any[]): IScope => {
        const scope: IScope = {};

        params.forEach((param, index) => {
            scope[param] = args[index];
        });

        return scope;
    };
}


export class IfExpr extends ExprNode {
    public condition: ExprNode;
    public result: StmtNode;
    public elseResult: StmtNode;

    public enclosingBlock: BlockStmt;

    constructor() {
        super(ExprType.IfRules);
    }

    tryCreateType = (): TypeNode => {
        const unionType = new UnionTypeNode();

        if (this.result.stmtType === StmtType.Expr) {
            unionType.types.push((this.result as ExprNode).tryCreateType());
        } else {
            unionType.types.push(TypeNode.getBasicType("any"));
        }

        if (this.elseResult && this.elseResult.stmtType === StmtType.Expr) {
            unionType.types.push((this.result as ExprNode).tryCreateType());
        } else {
            unionType.types.push(TypeNode.getBasicType("any"));
        }

        return unionType;
    }

    /*
    Explicitly states that the if-statement is an expression.

    This means that we don't have to explicitly return values from the 'then' and 'else'
    blocks, we can just put the values and they will be automatically returned

    This is because an if-statement essentially is syntactic sugar for a ternary operator
    */
    public setAsExpression = (returnOnFirstValue: boolean = true) => {
        if (this.result.stmtType == StmtType.Block) {
            (this.result as BlockStmt).returnOnFirstValue = returnOnFirstValue;
        }

        if (this.elseResult && this.elseResult.stmtType == StmtType.Block) {
            (this.elseResult as BlockStmt).returnOnFirstValue = returnOnFirstValue;
        }
    };

    private generateVarConfig = (runtime: Runtime, args: IValues): IVarConfig => {
        const varConfig = {
            default: '',
            rules: []
        } as IVarConfig;

        let cur = this as StmtNode;
        while (cur && cur.stmtType == StmtType.Expr && (cur as ExprNode).exprType == ExprType.IfRules) {
            const ifExpr = cur as IfExpr;

            let conditions: IRuleCondition[] = [];
            ifExpr.condition.generateConditions(runtime, args, conditions);

            const resultStmt = ifExpr.result;
            const evaluatedResult = resultStmt.evaluate(runtime, args);
            const type = typeof evaluatedResult;
            const isHtml = evaluatedResult instanceof HTMLExpr;

            if (type !== "number" && type !== "boolean" && type !== "string" && !isHtml && !evaluatedResult.__isYielded) {
                throw new CompilerError(`Illegal result type '${type}'. Yielded conditional expressions must result in 'boolean', 'number', 'string' or 'html'`, ifExpr.startPosition, ifExpr.endPosition);
            }

            varConfig.rules.push({
                conditions: conditions,
                result: evaluatedResult + ''
            });

            if (ifExpr.elseResult) {
                cur = ifExpr.elseResult;
            } else {
                cur = null;
            }
        }

        if (cur) {
            varConfig.default = cur.evaluate(runtime, args) + '';
        }

        return varConfig;
    };

    evaluate = (runtime: Runtime, args: IValues): any => {
        
        // Wrap in try/catch and see if it throws a 'cannot resolve'
        // This means it's trying to load a public var and can't resolve at runtime
        // so we instead create a section variable
        try {
            let result = undefined;

            if (runtime.checkForYieldedLoad( () => this.condition.evaluate(runtime, args) ))
                result = this.result.evaluate(runtime, args);
            
            else if (this.elseResult)
                result = this.elseResult.evaluate(runtime, args);

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
                if (this.enclosingBlock) {
                    this.enclosingBlock.returnOnFirstValue = true;
                    this.enclosingBlock.forceThrowReturn = true;
                }

                return runtime.generateDynamicSection(this.generateVarConfig(runtime, args)).toString();
            } else {
                throw e;
            }
        }

    }
}

export enum HTMLExprType {
    Document = "document",
    Element = "element",
    Text = "text",
    Dynamic = "dynamic",
    DocType = "doctype",
    Comment = "comment",
    Other = "other"
}

export class HTMLExpr extends ExprNode {
    constructor(public htmlType: HTMLExprType) {
        super(ExprType.HTML);
    }

    tryCreateType = (): TypeNode => TypeNode.getBasicType("html");

    content = () => "";
    public innerText = this.content();
    public innerHTML = "";

    attr = (attrName: string) => "";
}

export class HTMLDoc extends HTMLExpr {
    public index: { [id: string]: HTMLElemExpr } = {};
    public root: HTMLExpr;

    constructor() {
        super(HTMLExprType.Document);
    }

    content = () => this.root.content();

    evaluate = (runtime: Runtime, args: IValues) => this.root.evaluate(runtime, args);

    getElementById = (id: string): HTMLElemExpr => this.index[id];

    getElementsByTagName = (tagName: string): HTMLElemExpr[] => {
        const elements: HTMLElemExpr[] = [];

        this._collectElementsByTagName(tagName, this.root, elements);

        return elements;
    };

    private _collectElementsByTagName = (tagName: string, element: HTMLExpr, elements: HTMLElemExpr[]) => {
        if (element.htmlType == HTMLExprType.Element) {
            const elem = element as HTMLElemExpr;

            if (elem.tag == tagName) {
                elements.push(elem);
            }

            elem.childNodes.forEach(child => this._collectElementsByTagName(tagName, child, elements));
        }
    };
}

export class HTMLElemExpr extends HTMLExpr {
    public tag: string = "";
    public attributes: { [attr: string]: ExprNode|any } = {};
    public childNodes: HTMLExpr[] = [];
    public selfClosing: boolean = false;

    constructor() {
        super(HTMLExprType.Element);
    }

    content = () => {
        return entities.decode(this.childNodes.map(child => {
            if (child === undefined) return "";
            if (isString(child)) {
                return child;
            } else {
                if (child.content) {
                    return child.content();
                } else {
                    return child.toString();
                }
            }
        }).join(''));
    };

    attr = (attrName: string) => this.attributes[attrName];

    private evaluateAttributes = (runtime: Runtime, args: IValues): { [attr: string]: any } => {
        const evaluatedAttrs = {};
        const _this = this;
        Object.keys(this.attributes).forEach(attr => {
            evaluatedAttrs[attr] = (_this.attributes[attr] as ExprNode).evaluate(runtime, args);
        });

        return evaluatedAttrs;
    };

    private resolveChildren = (runtime: Runtime, args: IValues, node: HTMLElemExpr) => {
        const evaluated = this.childNodes.map(child => child.evaluate(runtime, args));

        if (evaluated.find(val => val === undefined)) {
            debugger;
        }
        evaluated.forEach(child => {
            if (isArray(child)) {
                const childArray = child as any[];
                childArray.forEach(subChild => {
                    node.childNodes.push(subChild as HTMLExpr);
                });
            } else {
                node.childNodes.push(child);
            }
        });
    };

    private resolveComponentChildren = (runtime: Runtime, args: IValues): any[] => {
        const children = [];
        this.childNodes.map(child => child.evaluate(runtime, args)).forEach(child => {
            if (isArray(child)) {
                const childArray = child as any[];
                childArray.forEach(subChild => {
                    children.push(subChild as HTMLExpr);
                });
            } else {
                children.push(child);
            }
        });
        return children;
    };

    private evaluateComponent = (runtime: Runtime, args: IValues): any => {
        const dummyLoad = new LoadExpr(this.tag);

        const resolvedAttributes = this.evaluateAttributes(runtime, args);
        const func = dummyLoad.evaluate(runtime, {...args, ...resolvedAttributes});
        const funcExpr = func.funcExpr as FuncExpr;

        // Need to convert attributes to ordered array
        const attributeArray = [];

        funcExpr.params.forEach((param, index) => {
            if (param == "children") {
                attributeArray.push(this.resolveComponentChildren(runtime, args));
            } else {
                attributeArray.push(resolvedAttributes[param]);
            }
        });

        try {
            return func.evaluate(runtime, attributeArray);
        } catch (e) {
            if (e.__externalPluginError) {
                throw new PluginError(e.msg, this.startPosition, this.endPosition);
            } else {
                throw e;
            }
        }
    };

    private evaluateHtml = (runtime: Runtime, args: IValues): any => {
        const evaluatedHtml = new HTMLElemExpr();
        evaluatedHtml.tag = this.tag;
        evaluatedHtml.selfClosing = this.selfClosing;
        evaluatedHtml.attributes = this.evaluateAttributes(runtime, args);
        this.resolveChildren(runtime, args, evaluatedHtml);

        evaluatedHtml.toString = (): string => {
            
            const resolvedAttrs = Object.keys(evaluatedHtml.attributes).map(attr => {
                return ` ${attr}="${evaluatedHtml.attributes[attr]}"`;
            }).join('');
    
            if (this.selfClosing) {
                return `<${this.tag} ${resolvedAttrs} />`;
            }
    
            const resolvedChildren = evaluatedHtml.childNodes.map(child => child ? child.toString() : '').join('');

            if (this.tag == "") {
                return resolvedChildren;
            }

            return `<${this.tag}${resolvedAttrs}>${resolvedChildren}</${this.tag}>`;
        };

        return evaluatedHtml;
    };

    evaluate = (runtime: Runtime, args: IValues): any => {

        let result = null;

        // First check if it's a known function
        const local = runtime.getLocal(this.tag);
        if (local && local.__isClosure) {
            result = this.evaluateComponent(runtime, args);
        }

        else {
            result = this.evaluateHtml(runtime, args);
        }

        if (result === undefined) {
            throw new RuntimeError(`Cannot evaluate component '${this.tag}'`, this.startPosition, this.endPosition);
        }
        else if (isString(result)) {
            this.innerHTML = result + '';
        }
        else if (result.htmlType) {
            result.innerHTML = result + '';
        }
        return result;
    }
}

export class HTMLTextExpr extends HTMLExpr {
    constructor(public text: string) {
        super(HTMLExprType.Text);
    }

    content = () => this.text;

    evaluate = (runtime: Runtime, args: IValues): any => {
        return this.text;
    }
}

export class HTMLDynExpr extends HTMLExpr {
    public expr: ExprNode;

    constructor() {
        super(HTMLExprType.Dynamic);
    }

    content = () => "";

    evaluate = (runtime: Runtime, args: IValues): any => {
        return this.expr.evaluate(runtime, args);
    }
}

export class HTMLDocType extends HTMLExpr {
    public values: string[] = [];

    constructor() {
        super(HTMLExprType.DocType);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        return this;
    };

    toString = (): string => {
        return `<!DOCTYPE ${this.values.join(' ')}>`;
    };
}

export class HTMLComment extends HTMLExpr {
    public comment: string;

    constructor(comment: string) {
        super(HTMLExprType.Comment);

        this.comment = comment;
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        return this;
    };

    toString = (): string => {
        return `<!--${this.comment}-->`;
    };
}


export class TemplateNode extends ExprNode {
    public expressions: ExprNode[] = [];

    constructor() {
        super(ExprType.Template);
    }

    evaluate = (runtime: Runtime, args: IValues): any => {
        return this.expressions.map(expr => expr.evaluate(runtime, args)).join('');
    };
}


//****************************************************
// Types
//****************************************************

export enum TypeNodeType {
    Basic = "basic",
    Parenthesised = "par",
    Array = "array",
    Object = "object",
    Function = "function",
    Union = "union",
    Literal = "literal"
}

export class TypeNode extends ParseNode {
    constructor(public typeType) {
        super(NodeType.Type);
    }

    static _basicTypes: { [name: string]: BasicTypeNode } = {};
    static getBasicType = (typeName: string): BasicTypeNode => {
        if (TypeNode._basicTypes[typeName] === undefined) {
            const newType = new BasicTypeNode(typeName);
            TypeNode._basicTypes[typeName] = newType;

            return newType;
        } else {
            return TypeNode._basicTypes[typeName];
        }
    };

    matches = (otherType: TypeNode): boolean => false;

    protected matchesType = <T extends TypeNode>(otherType: TypeNode, detail: (otherType: T)=>boolean): boolean => {
        if (!otherType || this.typeType !== otherType.typeType) return false;

        return detail(otherType as T);
    };

    toTSDef = () => "";
}

export class BasicTypeNode extends TypeNode {
    constructor(public name: string) {
        super(TypeNodeType.Basic);
    }

    matches = (otherType: TypeNode) => {
        return this.matchesType<BasicTypeNode>(otherType, otherType => {
            return this.name == otherType.name;
        });
    }

    toTSDef = () => this.name;
}

export class ParTypeNode extends TypeNode {
    constructor(public elem: TypeNode) {
        super(TypeNodeType.Parenthesised);
    }

    matches = (otherType: TypeNode) => this.elem.matches(otherType);

    toTSDef = () => `(${this.elem.toTSDef()})`;
}

export class ArrayTypeNode extends TypeNode {
    constructor(public obj: TypeNode) {
        super(TypeNodeType.Array);
    }

    matches = (otherType: TypeNode) => {
        return this.matchesType<ArrayTypeNode>(otherType, otherType => {
            return otherType.obj.matches(this.obj);
        });
    }

    toTSDef = () => {
        if (this.obj.typeType == TypeNodeType.Function || this.obj.typeType == TypeNodeType.Union) {
            return `(${this.obj.toTSDef()})[]`;
        } else {
            return this.obj.toTSDef() + '[]';
        }
    }
}

export class ObjectTypeNode extends TypeNode {
    public props: { [name: string]: TypeNode } = {};

    constructor() {
        super(TypeNodeType.Object);
    }

    matches = (otherType: TypeNode) => {
        const this_ = this;
        return this.matchesType<ObjectTypeNode>(otherType, otherType => {

            return Object.keys(this_.props)
                .every(name => {
                    return otherType.props[name] !== undefined
                        && otherType.props[name].matches(this_.props[name]);
                });

        });
    };

    toTSDef = () => `{ ${ Object.keys(this.props).map(propName => `${propName}: ${this.props[propName].toTSDef()}`).join(', ') } }`;
}

export interface IFuncParamType {
    name: string;
    type: TypeNode;
}

export class FunctionTypeNode extends TypeNode {
    public params: IFuncParamType[] = [];
    public returnType: TypeNode;

    constructor() {
        super(TypeNodeType.Function);
    }

    matches = (otherType: TypeNode) => {
        return this.matchesType<FunctionTypeNode>(otherType, otherType => {
            return this.returnType.matches(otherType.returnType)
                && this.params.length === otherType.params.length
                && this.params.reduce((prev, paramType, index) => {
                    return prev
                        && paramType.name == otherType.params[index].name
                        && paramType.type.matches(otherType.params[index].type);
                }, true)
        });
    }

    toTSDef = () => `(${this.params.map(param => `${param.name}: ${param.type.toTSDef()}`).join(', ')})${this.returnType ? `=>${this.returnType.toTSDef()}` : ''}`;
}

export class UnionTypeNode extends TypeNode {
    public types: TypeNode[] = [];

    constructor() {
        super(TypeNodeType.Union);
    }

    toTSDef = () => this.types.map(type => type.toTSDef()).join('|');
}

export class LiteralTypeNode extends TypeNode {
    constructor(public literal: IToken) {
        super(TypeNodeType.Literal);
    }

    toTSDef = () => {
        switch (this.literal.type) {
            case TokenType.String:      return `"${this.literal.value}"`;
            case TokenType.Number:      return this.literal.value + '';
            case TokenType.True:        return 'true';
            case TokenType.False:       return 'false';
            case TokenType.Null:        return 'null';
        }

        return "";
    };
}