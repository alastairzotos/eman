export interface IPosition {
    position: number;
    line: number;
    column: number;
    file: string;
}
export declare enum TokenType {
    None = "none",
    SingleComment = "//",
    MultiComment = "/* */",
    Ident = "identifier",
    String = "string",
    Integer = "int",
    Float = "float",
    Number = "number",
    True = "true",
    False = "false",
    Null = "null",
    HTMLAttr = "html attribute",
    HTMLText = "html text",
    TemplateText = "template text",
    TagLT = "<",
    TagGT = ">",
    TagClose = "</",
    TagSelfClose = "/>",
    At = "@",
    ParOpen = "(",
    ParClose = ")",
    BraceOpen = "{",
    BraceClose = "}",
    SquareOpen = "[",
    SquareClose = "]",
    Comma = ",",
    Colon = ":",
    Semicolon = ";",
    Dot = ".",
    Arrow = "=>",
    TemplateTick = "`",
    TemplateExprStart = "${",
    KW_As = "as",
    KW_Import = "import",
    KW_Export = "export",
    KW_Yield = "yield",
    KW_From = "from",
    KW_Var = "var",
    KW_Let = "let",
    KW_Const = "const",
    KW_Function = "function",
    KW_If = "if",
    KW_Else = "else",
    KW_In = "in",
    KW_Return = "return",
    KW_For = "for",
    KW_Of = "of",
    KW_While = "while",
    KW_Do = "do",
    KW_New = "new",
    KW_Typeof = "typeof",
    KW_Describe = "describe",
    KW_Class = "class",
    KW_Extends = "extends",
    KW_Constructor = "constructor",
    Operator = "op"
}
export interface IToken {
    type: TokenType;
    value?: any;
}
export declare const isOp: (token: IToken) => boolean;
export declare const isAssignmentOp: (op: string) => boolean;
export declare const isComparisonOp: (op: string) => boolean;
export declare const isBooleanOp: (op: string) => boolean;
export declare const isArithmeticOp: (op: string) => boolean;
export declare const isBitwiseOp: (op: string) => boolean;
export declare const isUnaryOp: (op: string) => boolean;
export declare const isXFixOp: (op: string) => boolean;
export declare const getOpPrecedence: (op: string) => number;
export declare const getAsOp: (token: IToken) => IToken;
export declare class Lexer {
    private _file;
    private _input;
    private _position;
    private _line;
    private _column;
    private _startPosition;
    private _htmlContentStart;
    private _templateContentStart;
    private _lastFind;
    constructor(fileName: string, input: string);
    getStartPosition: () => IPosition;
    getEndPosition: () => IPosition;
    getPosition: () => IPosition;
    revert: (position: IPosition) => void;
    setHTMLContentStart: (start: number) => void;
    getHTMLContentStart: () => number;
    setTemplateContentStart: (start: number) => void;
    getTemplateContentStart: () => number;
    check: (type?: TokenType) => IToken;
    checkIdent: (ident: string, anyCase?: boolean) => IToken;
    checkOp: (opType: string) => IToken;
    accept: (type?: TokenType) => IToken;
    acceptOp: (opType: string) => IToken;
    acceptIdent: (ident: string) => IToken;
    acceptAny: (types?: TokenType[]) => IToken;
    acceptUntil: (cb: (char: string) => boolean) => IToken;
    acceptHTMLAttribute: () => IToken;
    acceptHTMLText: (stopForExpressions?: boolean) => IToken;
    acceptTemplateText: () => IToken;
    acceptRestOfHTMLComment: () => IToken;
    hasNext: () => boolean;
    getNext: () => IToken;
    isWhite: (position?: number) => boolean;
    private _getNext;
    private _eatWhiteSpace;
    private _updateStartPosition;
    static isWhite: (char: string) => boolean;
    static isWhiteChar: (char: string) => boolean;
    static isAlpha: (char: string) => boolean;
    static isDigit: (char: string) => boolean;
    static isNewLine: (char: any) => boolean;
}
