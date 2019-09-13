import { CompilerError } from './errors';

export interface IPosition {
    position: number;
    line: number;
    column: number;
    file: string;
}

export enum TokenType {
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


export const isOp = (token: IToken): boolean => {
    return  token.type == TokenType.Operator ||
            token.type == TokenType.TagLT ||
            token.type == TokenType.TagGT;
};

export const isAssignmentOp = (op: string): boolean => {
    return ['=', '+=', '-=', '*=', '/='].indexOf(op) >= 0;
};

export const isComparisonOp = (op: string): boolean => {
    return ['==', '===', '!=', '!==', '<', '<=', '>', '>=', 'instanceof'].indexOf(op) >= 0;
};

export const isBooleanOp = (op: string): boolean => {
    return ['&&', '||'].indexOf(op) >= 0;
};

export const isArithmeticOp = (op: string): boolean => {
    return ['+', '-', '*', '/'].indexOf(op) >= 0;
};

export const isBitwiseOp = (op: string): boolean => {
    return ['&', '|'].indexOf(op) >= 0;
};

export const isUnaryOp = (op: string): boolean => {
    return op == '!';
};

export const isXFixOp = (op: string): boolean => {
    return op == '--' || op == '++';
};

export const getOpPrecedence = (op: string): number => {
    if (isAssignmentOp(op)) return 100;
    if (op == '?') return 10;
    if (isBooleanOp(op)) return 9;
    if (isComparisonOp(op)) return 8;
    if (isArithmeticOp(op)) {
        if (op == '*' || op == '/') return 7;
        else if (op == '+' || op == '-') return 6;
    }
    if (isBitwiseOp(op)) return 5;
    if (isXFixOp(op)) return 4;
    if (isUnaryOp(op)) return 3;
};

export const getAsOp = (token: IToken): IToken => {
    if (!this.isOp(token)) return null;

    if (token.type == TokenType.Operator) return token;
    
    if (token.type == TokenType.TagLT) {
        return {
            type: TokenType.Operator,
            value: '<'
        }
    }

    if (token.type == TokenType.TagGT) {
        return {
            type: TokenType.Operator,
            value: '>'
        }
    }
};

export class Lexer {

    private _file: string;
    private _input: string;
    private _position: number = 0;
    private _line: number = 1;
    private _column: number = 1;
    private _startPosition: IPosition = null;
    private _htmlContentStart: number = 0;
    private _templateContentStart: number = 0;
    private _lastFind: IToken = null;

    constructor(fileName: string, input: string) {
        this._file = fileName;
        this._input = input;
    }

    getStartPosition = (): IPosition => {
        this.check();
        return this._startPosition;
    }

    getEndPosition = (): IPosition => {

        // Perform a check to update start position of next token
        this.check();

        const nextTokenStart = this._startPosition;
        let thisTokenEnd = {...nextTokenStart};

        while (thisTokenEnd.position > 0 && Lexer.isWhiteChar(this._input[thisTokenEnd.position - 1])) {
            thisTokenEnd.position--;
            thisTokenEnd.column--;

            if (Lexer.isNewLine(this._input[thisTokenEnd.position])) {
                thisTokenEnd.line--;

                // Get column by finding previous new line or start, and the count to that position is the column number
                let pos = thisTokenEnd.position - 1;
                let diff = 1;
                while (pos > 0 && Lexer.isNewLine(this._input[pos])) {
                    pos--;
                    diff++;
                }

                thisTokenEnd.column = diff;
            }
        }

        return thisTokenEnd;
    };

    getPosition = (): IPosition => {
        return {
            position: this._position,
            line: this._line,
            column: this._column,
            file: this._file
        };
    };

    revert = (position: IPosition) => {
        this._position = position.position;
        this._line = position.line;
        this._column = position.column;
        this._lastFind = null;
        this._startPosition = position;
    };

    setHTMLContentStart = (start: number) => {
        this._htmlContentStart = start;
    };

    getHTMLContentStart = () => {
        return this._htmlContentStart;
    };

    setTemplateContentStart = (start: number) => {
        this._templateContentStart = start;
    };

    getTemplateContentStart = () => {
        return this._templateContentStart;
    };

    check = (type?: TokenType):IToken => {
        if (!this._lastFind) {
            this._lastFind = this.getNext();
        }

        if (!this._lastFind) return null;

        if (type) {
            if (this._lastFind.type == type) {
                return this._lastFind;
            }

            // Exception: if we're looking for an operator and we have an html open tag, etc
            if (type == TokenType.Operator) {
                if (this._lastFind.type == TokenType.TagLT)
                    return getAsOp(this._lastFind);

                if (this._lastFind.type == TokenType.TagGT)
                    return getAsOp(this._lastFind);
            }

            return null;
        } else {
            return this._lastFind;
        }
    }

    checkIdent = (ident: string, anyCase: boolean = false): IToken => {
        const check = this.check(TokenType.Ident);
        if (!check) return null;

        if (anyCase) {
            if ((check.value as string).toLowerCase() == ident.toLowerCase()) return check;
        } else {
            if (check.value == ident) return check;
        }
        return null;
    };

    checkOp = (opType: string): IToken => {
        const check = this.check(TokenType.Operator);
        if (!check) return null;

        if (check.value == opType) return check;
        return null;
    };

    accept = (type?: TokenType): IToken => {
        let lastToken = this._lastFind;
        this._lastFind = null;
        if (!lastToken) {
            lastToken = this.getNext();
        }

        if (!lastToken) throw new CompilerError(`Unexpected end-of-file. Expected '${type}'`, this.getStartPosition());

        if (type) {
            if (lastToken.type == type) {
                return lastToken;
            } else if (type == TokenType.Operator) {
                // Exception: if we're looking for an operator and we have an html open tag, etc

                if (lastToken.type == TokenType.TagLT)
                    return getAsOp(lastToken);

                if (lastToken.type == TokenType.TagGT)
                    return getAsOp(lastToken);
                    
            } else {
                throw new CompilerError(`Unexpected token '${lastToken.value ? (lastToken.value + '') : lastToken.type}'. Expected '${type}'`, this.getStartPosition())
            }
        } else {
            return lastToken;
        }
    }

    acceptOp = (opType: string): IToken => {
        const token = this.accept(TokenType.Operator);

        if (!token || token.value == opType) {
            return token;
        } else {
            throw new CompilerError(`Expected operator ${opType}`, this.getStartPosition());
        }
    };

    acceptIdent = (ident: string): IToken => {
        const token = this.accept(TokenType.Ident);

        if (token.value !== ident) {
            throw new CompilerError(`Expected '${ident}'`, this.getStartPosition());
        }

        return token;
    };

    acceptAny = (types?: TokenType[]): IToken => {
        let lastToken = this._lastFind;
        this._lastFind = null;
        if (!lastToken) {
            lastToken = this.getNext();
        }

        const expectedString = types.slice(0, -1).join(', ') + (types.length > 1 ? ((types.length > 2 ? ',' : '') + ' or ' + types[types.length - 1]) : '');

        if (!lastToken) throw new CompilerError(`Unexpected end-of-file. Expected '${expectedString}'`, this.getStartPosition());

        if (types) {
            if (types.indexOf(lastToken.type) >= 0) {
                return lastToken;
            } else if (types.indexOf(TokenType.Operator) >= 0) {
                // Exception: if we're looking for an operator and we have an html open tag, etc

                if (lastToken.type == TokenType.TagLT)
                    return getAsOp(lastToken);

                if (lastToken.type == TokenType.TagGT)
                    return getAsOp(lastToken);
                    
            } else {
                throw new CompilerError(`Unexpected token '${lastToken.value ? (lastToken.value + '') : lastToken.type}'. Expected '${expectedString}'`, this.getStartPosition())
            }
        } else {
            return lastToken;
        }
    };

    acceptUntil = (cb: (char: string)=>boolean): IToken => {
        let tokenText = "";

        this._lastFind = null;
        this._position = this._templateContentStart;
        while (this._position < this._input.length) {
            if (cb(this._input[this._position])) {
                return {
                    type: TokenType.TemplateText,
                    value: tokenText
                };
            } else {
                tokenText += this._input[this._position];
            }

            this._column++;
            if (Lexer.isNewLine(this._input[this._position])) {
                this._column = 1;
                this._line++;
            }

            this._position++;
        }

        throw new CompilerError("Unexpected EOF. Expected text", this.getStartPosition());
    };

    acceptHTMLAttribute = (): IToken => {
        let attrToken = this._lastFind.value as string;
        this._lastFind = null;
        while (
            Lexer.isAlpha(this._input[this._position]) ||
            Lexer.isDigit(this._input[this._position]) ||
            this._input[this._position] == '-' ||
            this._input[this._position] == ':') {
                attrToken += this._input[this._position];

                this._column++;
                if (Lexer.isNewLine(this._input[this._position])) {
                    this._column = 1;
                    this._line++;
                }
                this._position++;
            }

        return { type: TokenType.HTMLAttr, value: attrToken };
    };

    acceptHTMLText = (stopForExpressions: boolean = true): IToken => {
        //this._eatWhiteSpace();
        let tokenText = "";

        this._lastFind = null;
        this._position = this._htmlContentStart;
        while (this._position < this._input.length) {
            if (this._input[this._position] == '<' || (stopForExpressions && this._input[this._position] == '{')) {
                return {
                    type: TokenType.HTMLText,
                    value: tokenText
                };
            } else {
                tokenText += this._input[this._position];
            }

            this._column++;
            if (Lexer.isNewLine(this._input[this._position])) {
                this._column = 1;
                this._line++;
            }

            this._position++;
        }

        return {
            type: TokenType.HTMLText,
            value: tokenText
        };
        //throw new CompilerError("Unexpected EOF. Expected HTML text", this.getStartPosition());
    };

    acceptTemplateText = (): IToken => {
        //this._eatWhiteSpace();
        let tokenText = "";

        this._lastFind = null;
        this._position = this._templateContentStart;
        while (this._position < this._input.length) {
            if (this._input[this._position] == '$' && (this._position < this._input.length - 1 && this._input[this._position + 1] == '{')) {
                //this._position--;
                return {
                    type: TokenType.TemplateText,
                    value: tokenText
                };
            } else if (this._input[this._position] == '`') {
                return {
                    type: TokenType.TemplateText,
                    value: tokenText
                };
            } else {
                tokenText += this._input[this._position];
            }

            this._column++;
            if (Lexer.isNewLine(this._input[this._position])) {
                this._column = 1;
                this._line++;
            }

            this._position++;
        }

        throw new CompilerError("Unexpected EOF. Expected template string", this.getStartPosition());
    };

    // Accepts everything after <!--
    // This is in case of comments like <!------------>
    acceptRestOfHTMLComment = (): IToken => {
        let tokenText = "";

        this._lastFind = null;
        //this._position = this._templateContentStart;
        while (this._position < this._input.length) {
            if (this._input[this._position] == '>') {
                if (!tokenText.endsWith("--")) {
                    throw new CompilerError(`HTML comments must end with '--'`, this.getStartPosition());
                }
                return {
                    type: TokenType.String,
                    value: tokenText.substr(0, tokenText.length - 2)
                };
            } else {
                tokenText += this._input[this._position];
            }

            this._column++;
            if (Lexer.isNewLine(this._input[this._position])) {
                this._column = 1;
                this._line++;
            }

            this._position++;
        }

        throw new CompilerError("Unexpected EOF. Expected HTML comment", this.getStartPosition());
    };

    hasNext = () => {
        return this._position < this._input.length;
    }

    // Gets next token excluding comments
    getNext = (): IToken => {
        let token = this._getNext();
        while (token && (token.type == TokenType.SingleComment || token.type == TokenType.MultiComment)) {
            token = this._getNext();
        }

        return token;
    };

    isWhite = (position?: number): boolean => {
        if (position) {
            return Lexer.isWhiteChar(this._input[position]);
        } else {
            return Lexer.isWhiteChar(this._input[this._position]);
        }
    };

    // Gets next token including comments
    private _getNext = (): IToken => {
        let state: TokenType = TokenType.None;
        let curToken = "";
        let inString: 'single'|'double'|'none' = 'none';

        this._eatWhiteSpace();

        while (this._position < this._input.length) {
            const curChar = this._input[this._position];

            this._column++;
            if (Lexer.isNewLine(curChar)) {
                this._column = 1;
                this._line++;
            }

            switch (state) {
                case TokenType.None: {

                    if (Lexer.isAlpha(curChar))                state = TokenType.Ident;
                    else if (Lexer.isDigit(curChar))           state = TokenType.Integer;
                    else if (curChar == "'")  {
                        inString = 'single'
                        state = TokenType.String;
                    } else if (curChar == '"')  {
                        inString = 'double'
                        state = TokenType.String;
                    }

                    else if (curChar == '@') {
                        this._position++;
                        return { type: TokenType.At };
                    }
                    else if (curChar == ';') {
                        this._position++;
                        return { type: TokenType.Semicolon };
                    }
                    else if (curChar == '(') {
                        this._position++;
                        return  { type: TokenType.ParOpen };
                    }
                    else if (curChar == ')') {
                        this._position++;
                        return  { type: TokenType.ParClose };
                    }
                    else if (curChar == '{') {
                        this._position++;
                        return  { type: TokenType.BraceOpen };
                    }
                    else if (curChar == '}') {
                        this._position++;
                        return  { type: TokenType.BraceClose };
                    }
                    else if (curChar == '[') {
                        this._position++;
                        return  { type: TokenType.SquareOpen };
                    }
                    else if (curChar == ']') {
                        this._position++;
                        return  { type: TokenType.SquareClose };
                    }
                    else if (curChar == ',') {
                        this._position++;
                        return  { type: TokenType.Comma };
                    }
                    else if (curChar == '.') {
                        this._position++;
                        return  { type: TokenType.Dot };
                    }
                    else if (curChar == '?') {
                        this._position++;
                        return  { type: TokenType.Operator, value: '?' };
                    }
                    else if (curChar == ':') {
                        this._position++;
                        return  { type: TokenType.Colon };
                    }
                    else if (curChar == '`') {
                        this._position++;
                        return  { type: TokenType.TemplateTick };
                    }
                    else if (['<', '>', '/', '=', '+', '-', '*', '!', '&', '|', '$'].indexOf(curChar) >= 0) {
                        this._position--;
                        this._column--;
                        state = TokenType.Operator;
                    }

                    break;
                }

                case TokenType.Ident: {
                    if (!Lexer.isAlpha(curChar) && !Lexer.isDigit(curChar)) {

                        this._column--;

                        // Check if it's a keyword
                        switch (curToken) {
                            case "as":          return { type: TokenType.KW_As };
                            case "import":      return { type: TokenType.KW_Import };
                            case "export":      return { type: TokenType.KW_Export };
                            case "yield":       return { type: TokenType.KW_Yield };
                            case "from":        return { type: TokenType.KW_From };
                            case "var":         return { type: TokenType.KW_Var };
                            case "let":         return { type: TokenType.KW_Let };
                            case "const":       return { type: TokenType.KW_Const };
                            case "function":    return { type: TokenType.KW_Function };
                            case "if":          return { type: TokenType.KW_If };
                            case "else":        return { type: TokenType.KW_Else };
                            case "in":          return { type: TokenType.KW_In };
                            case "return":      return { type: TokenType.KW_Return };
                            case "for":         return { type: TokenType.KW_For };
                            case "of":          return { type: TokenType.KW_Of };
                            case "while":       return { type: TokenType.KW_While };
                            case "do":          return { type: TokenType.KW_Do };

                            case "true":        return { type: TokenType.True, value: true };
                            case "false":       return { type: TokenType.False, value: false };
                            case "null":        return { type: TokenType.Null, value: null };

                            case "new":         return { type: TokenType.KW_New };
                            case "typeof":      return { type: TokenType.KW_Typeof };

                            case "describe":    return { type: TokenType.KW_Describe };

                            case "class":       return { type: TokenType.KW_Class };
                            case "extends":     return { type: TokenType.KW_Extends };
                            case "constructor": return { type: TokenType.KW_Constructor };

                            // The following are treated as operators
                            case "instanceof":  return { type: TokenType.Operator, value: "instanceof" };
                        }

                        const token = { type: state, value: curToken };
                        curToken = "";
                        return token;
                    }

                    break;
                }
                
                case TokenType.Integer: {
                    if (curChar == '.') {
                        state = TokenType.Float;
                    } else if (!Lexer.isDigit(curChar)) {
                        const token = { type: TokenType.Number, value: parseInt(curToken) };
                        curToken = "";
                        return token;
                    }
                    break;
                }

                case TokenType.Float: {
                    if (curChar == '.') {
                        throw new CompilerError("Unexpected character '.'", this.getStartPosition());
                    } else if (!Lexer.isDigit(curChar)) {
                        const token = { type: TokenType.Number, value: parseFloat(curToken) };
                        curToken = "";
                        return token;
                    }

                    break;
                }

                case TokenType.String: {
                    if (inString == 'single' && curChar == "'") {
                        this._position++;
                        const token = { type: state, value: curToken.substr(1) };
                        curToken = "";
                        return token;
                    } else if (inString == 'double' && curChar == '"') {
                        this._position++;
                        const token = { type: state, value: curToken.substr(1) };
                        curToken = "";
                        return token;
                    }
                    break;
                }

                case TokenType.SingleComment: {
                    if (Lexer.isNewLine(curChar)) {
                        this._line--;
                        return { type: state, value: curToken };
                    }
                    break;
                }

                case TokenType.MultiComment: {

                    const next: string|null = (this._position < this._input.length - 1) ? this._input[this._position + 1] : null;

                    if (curChar == '*') {
                        if (next && next == '/') {
                            this._position += 2;
                            return { type: TokenType.MultiComment, value: curToken };
                        }
                    }

                    break;
                }

                case TokenType.Operator: {
                    // == != < <= > >= + - * / && ||
                    // </ /> =>
                    // ++ --
                    // = += -= *= /=

                    let next: string|null = (this._position < this._input.length - 1) ? this._input[this._position + 1] : null;

                    if (curChar == '$') {
                        if (next && next == '{') {
                            this._position += 2;
                            return { type: TokenType.TemplateExprStart };
                        } else {
                            this._position++;
                            return { type: TokenType.Ident, value: '$' };
                        }
                    }

                    else if (curChar == '<') {
                        if (next && next == '=') {
                            this._position += 2;
                            return { type: TokenType.Operator, value: '<=' };
                        } else if (next && next == '/') {
                            this._position += 2;
                            return { type: TokenType.TagClose };
                        } else {
                            this._position++;
                            return { type: TokenType.TagLT };
                        }
                    }

                    else if (curChar == '>') {
                        if (next && next == '=') {
                            this._position += 2;
                            return { type: TokenType.Operator, value: '>=' };
                        } else {
                            this._position++;
                            this.setHTMLContentStart(this._position);
                            return { type: TokenType.TagGT };
                        }
                    }

                    else if (curChar == '/') {
                        if (next && next == '=') {
                            this._position += 2;
                            return { type: TokenType.Operator, value: '/=' };
                        } else if (next && next == '>') {
                            this._position += 2;
                            return { type: TokenType.TagSelfClose };
                        } else if (next && next == '/') {
                            this._position++;
                            state = TokenType.SingleComment;
                        } else if (next && next == '*') {
                            this._position++;
                            state = TokenType.MultiComment;
                        } else {
                            this._position++;
                            return { type: TokenType.Operator, value: '/' };
                        }
                    }

                    else if (curChar == '=') {
                        if (next && next == '=') {
                            next = (this._position < this._input.length - 2) ? this._input[this._position + 2] : null;
                            if (next && next == '=') {
                                this._position += 3;
                                return { type: TokenType.Operator, value: '===' };
                            } else {
                                this._position += 2;
                                return { type: TokenType.Operator, value: '==' };
                            }
                        } else if (next && next == '>') {
                            this._position += 2;
                            return { type: TokenType.Arrow };
                        } else {
                            this._position++;
                            return { type: TokenType.Operator, value: '=' };
                        }
                    }

                    else if (curChar == '!') {
                        if (next && next == '=') {
                            next = (this._position < this._input.length - 2) ? this._input[this._position + 2] : null;
                            if (next && next == '=') {
                                this._position += 3;
                                return { type: TokenType.Operator, value: '!==' };
                            } else {
                                this._position += 2;
                                return { type: TokenType.Operator, value: '!=' };
                            }
                        } else {
                            this._position++;
                            return { type: TokenType.Operator, value: '!' };
                        }
                    }

                    else if (curChar == '+') {
                        if (next && next == '=') {
                            this._position += 2;
                            return { type: TokenType.Operator, value: '+=' };
                        } else if (next && next == '+') {
                            this._position += 2;
                            return { type: TokenType.Operator, value: '++' };
                        } else {
                            this._position++;
                            return { type: TokenType.Operator, value: '+' };
                        }
                    }

                    else if (curChar == '-') {
                        if (next && next == '=') {
                            this._position += 2;
                            return { type: TokenType.Operator, value: '-=' };
                        } else if (next && next == '-') {
                            this._position += 2;
                            return { type: TokenType.Operator, value: '--' };
                        } else {
                            this._position++;
                            return { type: TokenType.Operator, value: '-' };
                        }
                    }

                    else if (curChar == '*') {
                        if (next && next == '=') {
                            this._position += 2;
                            return { type: TokenType.Operator, value: '*=' };
                        } else {
                            this._position++;
                            return { type: TokenType.Operator, value: '*' };
                        }
                    }

                    else if (curChar == '&') {
                        /*this._position++;
                        if (this._input[this._position] == '&') {
                            this._position++;
                            return { type: TokenType.Operator, value: '&&' };
                        } else {
                            throw new CompilerError("Expected '&&'", this.getStartPosition());
                        }*/
                        if (next && next == '&') {
                            this._position += 2;
                            return { type: TokenType.Operator, value: '&&' };
                        } else {
                            this._position++;
                            return { type: TokenType.Operator, value: '&' };
                        }
                    }

                    else if (curChar == '|') {
                        /*this._position++;
                        if (this._input[this._position] == '|') {
                            this._position++;
                            return { type: TokenType.Operator, value: '||' };
                        } else {
                            throw new CompilerError("Expected '||'", this.getStartPosition());
                        }*/
                        if (next && next == '|') {
                            this._position += 2;
                            return { type: TokenType.Operator, value: '||' };
                        } else {
                            this._position++;
                            return { type: TokenType.Operator, value: '|' };
                        }
                    }

                    break;
                }

            }

            this._position++;

            if (inString == 'none' && state !== TokenType.SingleComment && state !== TokenType.MultiComment) {
                if (!Lexer.isWhite(curChar)) {
                    curToken += curChar;
                }
            } else {
                curToken += curChar;
            }
        }
    };


    private _eatWhiteSpace = () => {
        while (this._position < this._input.length && Lexer.isWhiteChar(this._input[this._position])) {
            this._column++;
            if (Lexer.isNewLine(this._input[this._position])) {
                this._column = 1;
                this._line++;
            }

            this._position++;
        }

        this._updateStartPosition();
    };

    private _updateStartPosition = () => {
        this._startPosition = {
            position: this._position,
            line: this._line,
            column: this._column,
            file: this._file
        };
    };


    public static isWhite = (char: string): boolean => (char[0] == ' ' || char[0] == '\t' || Lexer.isNewLine(char[0]));
    public static isWhiteChar = (char: string): boolean => (char == ' ' || char == '\t' || Lexer.isNewLine(char));
    public static isAlpha = (char: string): boolean => (char[0] >= 'a' && char[0] <= 'z') || (char[0] >= 'A' && char[0] <= 'Z') || (char == '_');
    public static isDigit = (char: string): boolean => (char[0] >= '0' && char[0] <= '9');
    public static isNewLine = char => char === '\n' || char === '\n\r';

}