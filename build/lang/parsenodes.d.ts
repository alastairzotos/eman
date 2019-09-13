import { IPosition } from './lexer';
import { Runtime, IScope } from './runtime';
import { IRuleCondition } from './varconfig';
import { IValues, IEvaluatable } from './values';
export declare enum NodeType {
    Root = "root",
    Import = "import",
    Var = "var",
    Lookup = "lookup",
    Const = "const",
    Statement = "statement"
}
export declare class ParseNode {
    type: NodeType;
    startPosition: IPosition;
    endPosition: IPosition;
    constructor(type: NodeType);
}
export declare class RootNode extends ParseNode {
    yields: {
        [name: string]: YieldNode;
    };
    lookups: {
        [name: string]: LookupTableNode;
    };
    imports: ImportNode[];
    statements: StmtNode[];
    constructor();
}
export declare class ImportNode extends ParseNode {
    asName: string;
    members: string[];
    file: string;
    constructor();
}
export declare class YieldNode extends ParseNode {
    name: string;
    value: ExprNode;
    lookup: string;
    constructor();
}
export declare class LookupTableNode extends YieldNode {
    items: {
        [key: string]: ExprNode;
    };
    constructor(items: ObjExpr);
}
export declare enum StmtType {
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
export declare class StmtNode extends ParseNode implements IEvaluatable {
    stmtType: StmtType;
    protected _exported: boolean;
    constructor(stmtType: StmtType);
    isExported: () => boolean;
    setExported: () => void;
    generateConditionValue: (runtime: Runtime, args: IValues) => any;
    generateConditions: (runtime: Runtime, args: IValues, conditions: IRuleCondition[]) => void;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class NoopStmt extends StmtNode {
    constructor();
}
export declare class StmtList extends StmtNode {
    statements: StmtNode[];
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class BlockStmt extends StmtNode {
    statements: StmtNode[];
    returnOnFirstValue: boolean;
    forceThrowReturn: boolean;
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class ReturnStmt extends StmtNode {
    expr: ExprNode;
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class VarDeclStmt extends StmtNode {
    name: string;
    value: ExprNode;
    isConst: boolean;
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class WhileStmt extends StmtNode {
    condition: ExprNode;
    body: StmtNode;
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class ForStmt extends StmtNode {
    init: StmtNode;
    condition: ExprNode;
    after: StmtNode;
    body: StmtNode;
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class ForOfStmt extends StmtNode {
    initDecl: "var" | "let" | "const" | null;
    initLoad: string;
    collection: ExprNode;
    body: StmtNode;
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class DoWhileStmt extends StmtNode {
    condition: ExprNode;
    body: StmtNode;
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class DescribeNode extends StmtNode {
    description: string;
    testRuns: RunNode[];
    constructor();
}
export declare enum RunNodeType {
    Test = "test",
    Todo = "todo"
}
export declare class RunNode extends StmtNode {
    runNodeType: RunNodeType;
    description: string;
    constructor(runNodeType: RunNodeType);
}
export declare class RunTestNode extends RunNode {
    settings: {
        [varName: string]: ExprNode;
    };
    assertion: ExprNode;
    constructor();
}
export declare class RunTodoNode extends RunNode {
    constructor();
}
export declare enum ExprType {
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
export declare class ExprNode extends StmtNode {
    exprType: ExprType;
    constructor(exprType: ExprType);
    unpack: () => ExprNode;
}
export declare class LitExpr extends ExprNode {
    literal: any;
    constructor(literal: any);
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class LoadExpr extends ExprNode {
    varName: string;
    constructor(varName: string);
    generateConditions: (runtime: Runtime, args: IValues, conditions: IRuleCondition[]) => void;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class ParExpr extends ExprNode {
    expr: ExprNode;
    constructor(expr: ExprNode);
    generateConditionValue: (runtime: Runtime, args: IValues) => string;
    generateConditions: (runtime: Runtime, args: IValues, conditions: IRuleCondition[]) => void;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class NewExpr extends ExprNode {
    className: LoadExpr;
    args: ExprNode[];
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare type OpType = '-' | '*' | '/' | '<' | '<=' | '>' | '>=' | '==' | '===' | '!=' | '!==' | '&&' | '||' | '+=' | '-=' | '*=' | '/=' | '=' | '+' | 'instanceof';
export declare type UnOpType = '-' | '!' | '--' | '++';
export declare class OpExpr extends ExprNode {
    opType: OpType;
    expr1: ExprNode;
    expr2: ExprNode;
    constructor(opType: OpType);
    generateConditions: (runtime: Runtime, args: IValues, conditions: IRuleCondition[]) => void;
    generateConditionValue: (runtime: Runtime, args: IValues) => any;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class UnaryExpr extends ExprNode {
    opType: UnOpType;
    expr: ExprNode;
    postFix: boolean;
    constructor(opType: UnOpType);
    generateConditions: (runtime: Runtime, args: IValues, conditions: IRuleCondition[]) => void;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class ObjExpr extends ExprNode {
    values: {
        [key: string]: ExprNode;
    };
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class ArrayExpr extends ExprNode {
    values: ExprNode[];
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class AccessObjExpr extends ExprNode {
    obj: ExprNode;
    prop: string;
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class AccessArrExpr extends ExprNode {
    obj: ExprNode;
    index: ExprNode;
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class CallExpr extends ExprNode {
    func: ExprNode;
    args: ExprNode[];
    constructor();
    generateConditions: (runtime: Runtime, args: IValues, conditions: IRuleCondition[]) => void;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class MethodCallExpr extends ExprNode {
    obj: ExprNode;
    prop: string;
    args: ExprNode[];
    constructor();
    private generateMethodCallConditions;
    generateConditions: (runtime: Runtime, args: IValues, conditions: IRuleCondition[]) => void;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class AlterianMethodCall extends ExprNode {
    obj: ExprNode;
    prop: string;
    args: ExprNode[];
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
    private _functions;
}
export declare class FuncExpr extends ExprNode {
    params: string[];
    body: StmtNode;
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
    mapArgsToScope: (params: string[], args: any[]) => IScope;
}
export declare class IfExpr extends ExprNode {
    condition: ExprNode;
    result: StmtNode;
    elseResult: StmtNode;
    enclosingBlock: BlockStmt;
    constructor();
    setAsExpression: (returnOnFirstValue?: boolean) => void;
    private generateVarConfig;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare enum HTMLExprType {
    Document = "document",
    Element = "element",
    Text = "text",
    Dynamic = "dynamic",
    DocType = "doctype",
    Comment = "comment",
    Other = "other"
}
export declare class HTMLExpr extends ExprNode {
    htmlType: HTMLExprType;
    constructor(htmlType: HTMLExprType);
    content: () => string;
    innerText: string;
    innerHTML: string;
    attr: (attrName: string) => string;
}
export declare class HTMLDoc extends HTMLExpr {
    index: {
        [id: string]: HTMLElemExpr;
    };
    root: HTMLExpr;
    constructor();
    content: () => string;
    evaluate: (runtime: Runtime, args: IValues) => any;
    getElementById: (id: string) => HTMLElemExpr;
    getElementsByTagName: (tagName: string) => HTMLElemExpr[];
    private _collectElementsByTagName;
}
export declare class HTMLElemExpr extends HTMLExpr {
    tag: string;
    attributes: {
        [attr: string]: ExprNode | any;
    };
    childNodes: HTMLExpr[];
    selfClosing: boolean;
    constructor();
    content: () => any;
    attr: (attrName: string) => any;
    private evaluateAttributes;
    private resolveChildren;
    private resolveComponentChildren;
    private evaluateComponent;
    private evaluateHtml;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class HTMLTextExpr extends HTMLExpr {
    text: string;
    constructor(text: string);
    content: () => string;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class HTMLDynExpr extends HTMLExpr {
    expr: ExprNode;
    constructor();
    content: () => string;
    evaluate: (runtime: Runtime, args: IValues) => any;
}
export declare class HTMLDocType extends HTMLExpr {
    values: string[];
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
    toString: () => string;
}
export declare class HTMLComment extends HTMLExpr {
    comment: string;
    constructor(comment: string);
    evaluate: (runtime: Runtime, args: IValues) => any;
    toString: () => string;
}
export declare class TemplateNode extends ExprNode {
    expressions: ExprNode[];
    constructor();
    evaluate: (runtime: Runtime, args: IValues) => any;
}
