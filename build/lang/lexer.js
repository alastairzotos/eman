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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var errors_1 = require("./errors");
var TokenType;
(function (TokenType) {
    TokenType["None"] = "none";
    TokenType["SingleComment"] = "//";
    TokenType["MultiComment"] = "/* */";
    TokenType["DocCommentStart"] = "/**";
    TokenType["CommentClose"] = "*/";
    TokenType["Ident"] = "identifier";
    TokenType["String"] = "string";
    TokenType["Integer"] = "int";
    TokenType["Float"] = "float";
    TokenType["Number"] = "number";
    TokenType["True"] = "true";
    TokenType["False"] = "false";
    TokenType["Null"] = "null";
    TokenType["HTMLAttr"] = "html attribute";
    TokenType["HTMLText"] = "html text";
    TokenType["TemplateText"] = "template text";
    TokenType["TagLT"] = "<";
    TokenType["TagGT"] = ">";
    TokenType["TagClose"] = "</";
    TokenType["TagSelfClose"] = "/>";
    TokenType["At"] = "@";
    TokenType["ParOpen"] = "(";
    TokenType["ParClose"] = ")";
    TokenType["BraceOpen"] = "{";
    TokenType["BraceClose"] = "}";
    TokenType["SquareOpen"] = "[";
    TokenType["SquareClose"] = "]";
    TokenType["Comma"] = ",";
    TokenType["Colon"] = ":";
    TokenType["Semicolon"] = ";";
    TokenType["Dot"] = ".";
    TokenType["Arrow"] = "=>";
    TokenType["TemplateTick"] = "`";
    TokenType["TemplateExprStart"] = "${";
    TokenType["KW_As"] = "as";
    TokenType["KW_Import"] = "import";
    TokenType["KW_Export"] = "export";
    TokenType["KW_Yield"] = "yield";
    TokenType["KW_From"] = "from";
    TokenType["KW_Var"] = "var";
    TokenType["KW_Let"] = "let";
    TokenType["KW_Const"] = "const";
    TokenType["KW_Function"] = "function";
    TokenType["KW_If"] = "if";
    TokenType["KW_Else"] = "else";
    TokenType["KW_In"] = "in";
    TokenType["KW_Return"] = "return";
    TokenType["KW_For"] = "for";
    TokenType["KW_Of"] = "of";
    TokenType["KW_While"] = "while";
    TokenType["KW_Do"] = "do";
    TokenType["KW_New"] = "new";
    TokenType["KW_Typeof"] = "typeof";
    TokenType["KW_Describe"] = "describe";
    TokenType["KW_Class"] = "class";
    TokenType["KW_Extends"] = "extends";
    TokenType["KW_Constructor"] = "constructor";
    TokenType["Operator"] = "op";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
exports.isOp = function (token) {
    return token.type == TokenType.Operator ||
        token.type == TokenType.TagLT ||
        token.type == TokenType.TagGT;
};
exports.isAssignmentOp = function (op) {
    return ['=', '+=', '-=', '*=', '/='].indexOf(op) >= 0;
};
exports.isComparisonOp = function (op) {
    return ['==', '===', '!=', '!==', '<', '<=', '>', '>=', 'instanceof'].indexOf(op) >= 0;
};
exports.isBooleanOp = function (op) {
    return ['&&', '||'].indexOf(op) >= 0;
};
exports.isArithmeticOp = function (op) {
    return ['+', '-', '*', '/'].indexOf(op) >= 0;
};
exports.isBitwiseOp = function (op) {
    return ['&', '|'].indexOf(op) >= 0;
};
exports.isUnaryOp = function (op) {
    return op == '!';
};
exports.isXFixOp = function (op) {
    return op == '--' || op == '++';
};
exports.getOpPrecedence = function (op) {
    if (exports.isAssignmentOp(op))
        return 100;
    if (op == '?')
        return 10;
    if (exports.isBooleanOp(op))
        return 9;
    if (exports.isComparisonOp(op))
        return 8;
    if (exports.isArithmeticOp(op)) {
        if (op == '*' || op == '/')
            return 7;
        else if (op == '+' || op == '-')
            return 6;
    }
    if (exports.isBitwiseOp(op))
        return 5;
    if (exports.isXFixOp(op))
        return 4;
    if (exports.isUnaryOp(op))
        return 3;
};
exports.getAsOp = function (token) {
    if (!_this.isOp(token))
        return null;
    if (token.type == TokenType.Operator)
        return token;
    if (token.type == TokenType.TagLT) {
        return {
            type: TokenType.Operator,
            value: '<'
        };
    }
    if (token.type == TokenType.TagGT) {
        return {
            type: TokenType.Operator,
            value: '>'
        };
    }
};
var Lexer = /** @class */ (function () {
    function Lexer(fileName, input) {
        var _this = this;
        this._position = 0;
        this._line = 1;
        this._column = 1;
        this._startPosition = null;
        this._htmlContentStart = 0;
        this._templateContentStart = 0;
        this._lastFind = null;
        this.getStartPosition = function () {
            _this.check();
            return _this._startPosition;
        };
        this.getEndPosition = function () {
            // Perform a check to update start position of next token
            _this.check();
            var nextTokenStart = _this._startPosition;
            var thisTokenEnd = __assign({}, nextTokenStart);
            while (thisTokenEnd.position > 0 && Lexer.isWhiteChar(_this._input[thisTokenEnd.position - 1])) {
                thisTokenEnd.position--;
                thisTokenEnd.column--;
                if (Lexer.isNewLine(_this._input[thisTokenEnd.position])) {
                    thisTokenEnd.line--;
                    // Get column by finding previous new line or start, and the count to that position is the column number
                    var pos = thisTokenEnd.position - 1;
                    var diff = 1;
                    while (pos > 0 && Lexer.isNewLine(_this._input[pos])) {
                        pos--;
                        diff++;
                    }
                    thisTokenEnd.column = diff;
                }
            }
            return thisTokenEnd;
        };
        this.getPosition = function () {
            return {
                position: _this._position,
                line: _this._line,
                column: _this._column,
                file: _this._file
            };
        };
        this.revert = function (position) {
            _this._position = position.position;
            _this._line = position.line;
            _this._column = position.column;
            _this._lastFind = null;
            _this._startPosition = position;
        };
        this.setHTMLContentStart = function (start) {
            _this._htmlContentStart = start;
        };
        this.getHTMLContentStart = function () {
            return _this._htmlContentStart;
        };
        this.setTemplateContentStart = function (start) {
            _this._templateContentStart = start;
        };
        this.getTemplateContentStart = function () {
            return _this._templateContentStart;
        };
        this.check = function (type) {
            if (!_this._lastFind) {
                _this._lastFind = _this.getNext();
            }
            if (!_this._lastFind)
                return null;
            if (type) {
                if (_this._lastFind.type == type) {
                    return _this._lastFind;
                }
                // Exception: if we're looking for an operator and we have an html open tag, etc
                if (type == TokenType.Operator) {
                    if (_this._lastFind.type == TokenType.TagLT)
                        return exports.getAsOp(_this._lastFind);
                    if (_this._lastFind.type == TokenType.TagGT)
                        return exports.getAsOp(_this._lastFind);
                }
                return null;
            }
            else {
                return _this._lastFind;
            }
        };
        this.checkIdent = function (ident, anyCase) {
            if (anyCase === void 0) { anyCase = false; }
            var check = _this.check(TokenType.Ident);
            if (!check)
                return null;
            if (anyCase) {
                if (check.value.toLowerCase() == ident.toLowerCase())
                    return check;
            }
            else {
                if (check.value == ident)
                    return check;
            }
            return null;
        };
        this.checkOp = function (opType) {
            var check = _this.check(TokenType.Operator);
            if (!check)
                return null;
            if (check.value == opType)
                return check;
            return null;
        };
        this.accept = function (type) {
            var lastToken = _this._lastFind;
            _this._lastFind = null;
            if (!lastToken) {
                lastToken = _this.getNext();
            }
            if (!lastToken)
                throw new errors_1.CompilerError("Unexpected end-of-file. Expected '" + type + "'", _this.getStartPosition());
            if (type) {
                if (lastToken.type == type) {
                    return lastToken;
                }
                else if (type == TokenType.Operator) {
                    // Exception: if we're looking for an operator and we have an html open tag, etc
                    if (lastToken.type == TokenType.TagLT)
                        return exports.getAsOp(lastToken);
                    if (lastToken.type == TokenType.TagGT)
                        return exports.getAsOp(lastToken);
                }
                else {
                    throw new errors_1.CompilerError("Unexpected token '" + (lastToken.value ? (lastToken.value + '') : lastToken.type) + "'. Expected '" + type + "'", _this.getStartPosition());
                }
            }
            else {
                return lastToken;
            }
        };
        this.acceptOp = function (opType) {
            var token = _this.accept(TokenType.Operator);
            if (!token || token.value == opType) {
                return token;
            }
            else {
                throw new errors_1.CompilerError("Expected operator " + opType, _this.getStartPosition());
            }
        };
        this.acceptIdent = function (ident) {
            var token = _this.accept(TokenType.Ident);
            if (token.value !== ident) {
                throw new errors_1.CompilerError("Expected '" + ident + "'", _this.getStartPosition());
            }
            return token;
        };
        this.acceptAny = function (types) {
            var lastToken = _this._lastFind;
            _this._lastFind = null;
            if (!lastToken) {
                lastToken = _this.getNext();
            }
            var expectedString = types.slice(0, -1).join(', ') + (types.length > 1 ? ((types.length > 2 ? ',' : '') + ' or ' + types[types.length - 1]) : '');
            if (!lastToken)
                throw new errors_1.CompilerError("Unexpected end-of-file. Expected '" + expectedString + "'", _this.getStartPosition());
            if (types) {
                if (types.indexOf(lastToken.type) >= 0) {
                    return lastToken;
                }
                else if (types.indexOf(TokenType.Operator) >= 0) {
                    // Exception: if we're looking for an operator and we have an html open tag, etc
                    if (lastToken.type == TokenType.TagLT)
                        return exports.getAsOp(lastToken);
                    if (lastToken.type == TokenType.TagGT)
                        return exports.getAsOp(lastToken);
                }
                else {
                    throw new errors_1.CompilerError("Unexpected token '" + (lastToken.value ? (lastToken.value + '') : lastToken.type) + "'. Expected '" + expectedString + "'", _this.getStartPosition());
                }
            }
            else {
                return lastToken;
            }
        };
        this.acceptUntil = function (cb) {
            var tokenText = "";
            _this._lastFind = null;
            _this._position = _this._templateContentStart;
            while (_this._position < _this._input.length) {
                var next = _this._position < _this._input.length - 1 ? _this._input[_this._position + 1] : null;
                if (cb(_this._input[_this._position], next)) {
                    return {
                        type: TokenType.TemplateText,
                        value: tokenText
                    };
                }
                else {
                    tokenText += _this._input[_this._position];
                }
                _this._column++;
                if (Lexer.isNewLine(_this._input[_this._position])) {
                    _this._column = 1;
                    _this._line++;
                }
                _this._position++;
            }
            throw new errors_1.CompilerError("Unexpected EOF. Expected text", _this.getStartPosition());
        };
        this.acceptHTMLAttribute = function () {
            var attrToken = _this._lastFind.value;
            _this._lastFind = null;
            while (Lexer.isAlpha(_this._input[_this._position]) ||
                Lexer.isDigit(_this._input[_this._position]) ||
                _this._input[_this._position] == '-' ||
                _this._input[_this._position] == ':') {
                attrToken += _this._input[_this._position];
                _this._column++;
                if (Lexer.isNewLine(_this._input[_this._position])) {
                    _this._column = 1;
                    _this._line++;
                }
                _this._position++;
            }
            return { type: TokenType.HTMLAttr, value: attrToken };
        };
        this.acceptHTMLText = function (stopForExpressions) {
            if (stopForExpressions === void 0) { stopForExpressions = true; }
            //this._eatWhiteSpace();
            var tokenText = "";
            _this._lastFind = null;
            _this._position = _this._htmlContentStart;
            while (_this._position < _this._input.length) {
                if (_this._input[_this._position] == '<' || (stopForExpressions && _this._input[_this._position] == '{')) {
                    return {
                        type: TokenType.HTMLText,
                        value: tokenText
                    };
                }
                else {
                    tokenText += _this._input[_this._position];
                }
                _this._column++;
                if (Lexer.isNewLine(_this._input[_this._position])) {
                    _this._column = 1;
                    _this._line++;
                }
                _this._position++;
            }
            return {
                type: TokenType.HTMLText,
                value: tokenText
            };
            //throw new CompilerError("Unexpected EOF. Expected HTML text", this.getStartPosition());
        };
        this.acceptTemplateText = function () {
            //this._eatWhiteSpace();
            var tokenText = "";
            _this._lastFind = null;
            _this._position = _this._templateContentStart;
            while (_this._position < _this._input.length) {
                if (_this._input[_this._position] == '$' && (_this._position < _this._input.length - 1 && _this._input[_this._position + 1] == '{')) {
                    //this._position--;
                    return {
                        type: TokenType.TemplateText,
                        value: tokenText
                    };
                }
                else if (_this._input[_this._position] == '`') {
                    return {
                        type: TokenType.TemplateText,
                        value: tokenText
                    };
                }
                else {
                    tokenText += _this._input[_this._position];
                }
                _this._column++;
                if (Lexer.isNewLine(_this._input[_this._position])) {
                    _this._column = 1;
                    _this._line++;
                }
                _this._position++;
            }
            throw new errors_1.CompilerError("Unexpected EOF. Expected template string", _this.getStartPosition());
        };
        // Accepts everything after <!--
        // This is in case of comments like <!------------>
        this.acceptRestOfHTMLComment = function () {
            var tokenText = "";
            _this._lastFind = null;
            //this._position = this._templateContentStart;
            while (_this._position < _this._input.length) {
                if (_this._input[_this._position] == '>') {
                    if (!tokenText.endsWith("--")) {
                        throw new errors_1.CompilerError("HTML comments must end with '--'", _this.getStartPosition());
                    }
                    return {
                        type: TokenType.String,
                        value: tokenText.substr(0, tokenText.length - 2)
                    };
                }
                else {
                    tokenText += _this._input[_this._position];
                }
                _this._column++;
                if (Lexer.isNewLine(_this._input[_this._position])) {
                    _this._column = 1;
                    _this._line++;
                }
                _this._position++;
            }
            throw new errors_1.CompilerError("Unexpected EOF. Expected HTML comment", _this.getStartPosition());
        };
        this.hasNext = function () {
            return _this._position < _this._input.length;
        };
        // Gets next token excluding comments
        this.getNext = function () {
            var token = _this._getNext();
            while (token && (token.type == TokenType.SingleComment || token.type == TokenType.MultiComment)) {
                token = _this._getNext();
            }
            return token;
        };
        this.isWhite = function (position) {
            if (position) {
                return Lexer.isWhiteChar(_this._input[position]);
            }
            else {
                return Lexer.isWhiteChar(_this._input[_this._position]);
            }
        };
        // Gets next token including comments
        this._getNext = function () {
            var state = TokenType.None;
            var curToken = "";
            var inString = 'none';
            _this._eatWhiteSpace();
            while (_this._position < _this._input.length) {
                var curChar = _this._input[_this._position];
                _this._column++;
                if (Lexer.isNewLine(curChar)) {
                    _this._column = 1;
                    _this._line++;
                }
                switch (state) {
                    case TokenType.None: {
                        if (Lexer.isAlpha(curChar))
                            state = TokenType.Ident;
                        else if (Lexer.isDigit(curChar))
                            state = TokenType.Integer;
                        else if (curChar == "'") {
                            inString = 'single';
                            state = TokenType.String;
                        }
                        else if (curChar == '"') {
                            inString = 'double';
                            state = TokenType.String;
                        }
                        else if (curChar == '@') {
                            _this._position++;
                            return { type: TokenType.At };
                        }
                        else if (curChar == ';') {
                            _this._position++;
                            return { type: TokenType.Semicolon };
                        }
                        else if (curChar == '(') {
                            _this._position++;
                            return { type: TokenType.ParOpen };
                        }
                        else if (curChar == ')') {
                            _this._position++;
                            return { type: TokenType.ParClose };
                        }
                        else if (curChar == '{') {
                            _this._position++;
                            return { type: TokenType.BraceOpen };
                        }
                        else if (curChar == '}') {
                            _this._position++;
                            return { type: TokenType.BraceClose };
                        }
                        else if (curChar == '[') {
                            _this._position++;
                            return { type: TokenType.SquareOpen };
                        }
                        else if (curChar == ']') {
                            _this._position++;
                            return { type: TokenType.SquareClose };
                        }
                        else if (curChar == ',') {
                            _this._position++;
                            return { type: TokenType.Comma };
                        }
                        else if (curChar == '.') {
                            _this._position++;
                            return { type: TokenType.Dot };
                        }
                        else if (curChar == '?') {
                            _this._position++;
                            return { type: TokenType.Operator, value: '?' };
                        }
                        else if (curChar == ':') {
                            _this._position++;
                            return { type: TokenType.Colon };
                        }
                        else if (curChar == '`') {
                            _this._position++;
                            return { type: TokenType.TemplateTick };
                        }
                        else if (['<', '>', '/', '=', '+', '-', '*', '!', '&', '|', '$'].indexOf(curChar) >= 0) {
                            _this._position--;
                            _this._column--;
                            state = TokenType.Operator;
                        }
                        break;
                    }
                    case TokenType.Ident: {
                        if (!Lexer.isAlpha(curChar) && !Lexer.isDigit(curChar)) {
                            _this._column--;
                            // Check if it's a keyword
                            switch (curToken) {
                                case "as": return { type: TokenType.KW_As };
                                case "import": return { type: TokenType.KW_Import };
                                case "export": return { type: TokenType.KW_Export };
                                case "yield": return { type: TokenType.KW_Yield };
                                case "from": return { type: TokenType.KW_From };
                                case "var": return { type: TokenType.KW_Var };
                                case "let": return { type: TokenType.KW_Let };
                                case "const": return { type: TokenType.KW_Const };
                                case "function": return { type: TokenType.KW_Function };
                                case "if": return { type: TokenType.KW_If };
                                case "else": return { type: TokenType.KW_Else };
                                case "in": return { type: TokenType.KW_In };
                                case "return": return { type: TokenType.KW_Return };
                                case "for": return { type: TokenType.KW_For };
                                case "of": return { type: TokenType.KW_Of };
                                case "while": return { type: TokenType.KW_While };
                                case "do": return { type: TokenType.KW_Do };
                                case "true": return { type: TokenType.True, value: true };
                                case "false": return { type: TokenType.False, value: false };
                                case "null": return { type: TokenType.Null, value: null };
                                case "new": return { type: TokenType.KW_New };
                                case "typeof": return { type: TokenType.KW_Typeof };
                                case "describe": return { type: TokenType.KW_Describe };
                                case "class": return { type: TokenType.KW_Class };
                                case "extends": return { type: TokenType.KW_Extends };
                                case "constructor": return { type: TokenType.KW_Constructor };
                                // The following are treated as operators
                                case "instanceof": return { type: TokenType.Operator, value: "instanceof" };
                            }
                            var token = { type: state, value: curToken };
                            curToken = "";
                            return token;
                        }
                        break;
                    }
                    case TokenType.Integer: {
                        if (curChar == '.') {
                            state = TokenType.Float;
                        }
                        else if (!Lexer.isDigit(curChar)) {
                            var token = { type: TokenType.Number, value: parseInt(curToken) };
                            curToken = "";
                            return token;
                        }
                        break;
                    }
                    case TokenType.Float: {
                        if (curChar == '.') {
                            throw new errors_1.CompilerError("Unexpected character '.'", _this.getStartPosition());
                        }
                        else if (!Lexer.isDigit(curChar)) {
                            var token = { type: TokenType.Number, value: parseFloat(curToken) };
                            curToken = "";
                            return token;
                        }
                        break;
                    }
                    case TokenType.String: {
                        if (inString == 'single' && curChar == "'") {
                            _this._position++;
                            var token = { type: state, value: curToken.substr(1) };
                            curToken = "";
                            return token;
                        }
                        else if (inString == 'double' && curChar == '"') {
                            _this._position++;
                            var token = { type: state, value: curToken.substr(1) };
                            curToken = "";
                            return token;
                        }
                        break;
                    }
                    case TokenType.SingleComment: {
                        if (Lexer.isNewLine(curChar)) {
                            _this._line--;
                            return { type: state, value: curToken };
                        }
                        break;
                    }
                    case TokenType.MultiComment: {
                        var next = (_this._position < _this._input.length - 1) ? _this._input[_this._position + 1] : null;
                        if (curChar == '*') {
                            if (next && next == '/') {
                                _this._position += 2;
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
                        var next = (_this._position < _this._input.length - 1) ? _this._input[_this._position + 1] : null;
                        if (curChar == '$') {
                            if (next && next == '{') {
                                _this._position += 2;
                                return { type: TokenType.TemplateExprStart };
                            }
                            else {
                                _this._position++;
                                return { type: TokenType.Ident, value: '$' };
                            }
                        }
                        else if (curChar == '<') {
                            if (next && next == '=') {
                                _this._position += 2;
                                return { type: TokenType.Operator, value: '<=' };
                            }
                            else if (next && next == '/') {
                                _this._position += 2;
                                return { type: TokenType.TagClose };
                            }
                            else {
                                _this._position++;
                                return { type: TokenType.TagLT };
                            }
                        }
                        else if (curChar == '>') {
                            if (next && next == '=') {
                                _this._position += 2;
                                return { type: TokenType.Operator, value: '>=' };
                            }
                            else {
                                _this._position++;
                                _this.setHTMLContentStart(_this._position);
                                return { type: TokenType.TagGT };
                            }
                        }
                        else if (curChar == '/') {
                            if (next && next == '=') {
                                _this._position += 2;
                                return { type: TokenType.Operator, value: '/=' };
                            }
                            else if (next && next == '>') {
                                _this._position += 2;
                                return { type: TokenType.TagSelfClose };
                            }
                            else if (next && next == '/') {
                                _this._position++;
                                state = TokenType.SingleComment;
                            }
                            else if (next && next == '*') {
                                next = (_this._position < _this._input.length - 2) ? _this._input[_this._position + 2] : null;
                                if (next && next == '*') {
                                    _this._position += 3;
                                    return { type: TokenType.DocCommentStart };
                                }
                                else {
                                    _this._position++;
                                    state = TokenType.MultiComment;
                                }
                            }
                            else {
                                _this._position++;
                                return { type: TokenType.Operator, value: '/' };
                            }
                        }
                        else if (curChar == '=') {
                            if (next && next == '=') {
                                next = (_this._position < _this._input.length - 2) ? _this._input[_this._position + 2] : null;
                                if (next && next == '=') {
                                    _this._position += 3;
                                    return { type: TokenType.Operator, value: '===' };
                                }
                                else {
                                    _this._position += 2;
                                    return { type: TokenType.Operator, value: '==' };
                                }
                            }
                            else if (next && next == '>') {
                                _this._position += 2;
                                return { type: TokenType.Arrow };
                            }
                            else {
                                _this._position++;
                                return { type: TokenType.Operator, value: '=' };
                            }
                        }
                        else if (curChar == '!') {
                            if (next && next == '=') {
                                next = (_this._position < _this._input.length - 2) ? _this._input[_this._position + 2] : null;
                                if (next && next == '=') {
                                    _this._position += 3;
                                    return { type: TokenType.Operator, value: '!==' };
                                }
                                else {
                                    _this._position += 2;
                                    return { type: TokenType.Operator, value: '!=' };
                                }
                            }
                            else {
                                _this._position++;
                                return { type: TokenType.Operator, value: '!' };
                            }
                        }
                        else if (curChar == '+') {
                            if (next && next == '=') {
                                _this._position += 2;
                                return { type: TokenType.Operator, value: '+=' };
                            }
                            else if (next && next == '+') {
                                _this._position += 2;
                                return { type: TokenType.Operator, value: '++' };
                            }
                            else {
                                _this._position++;
                                return { type: TokenType.Operator, value: '+' };
                            }
                        }
                        else if (curChar == '-') {
                            if (next && next == '=') {
                                _this._position += 2;
                                return { type: TokenType.Operator, value: '-=' };
                            }
                            else if (next && next == '-') {
                                _this._position += 2;
                                return { type: TokenType.Operator, value: '--' };
                            }
                            else {
                                _this._position++;
                                return { type: TokenType.Operator, value: '-' };
                            }
                        }
                        else if (curChar == '*') {
                            if (next && next == '=') {
                                _this._position += 2;
                                return { type: TokenType.Operator, value: '*=' };
                            }
                            else if (next && next == '/') {
                                _this._position += 2;
                                return { type: TokenType.CommentClose };
                            }
                            else {
                                _this._position++;
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
                                _this._position += 2;
                                return { type: TokenType.Operator, value: '&&' };
                            }
                            else {
                                _this._position++;
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
                                _this._position += 2;
                                return { type: TokenType.Operator, value: '||' };
                            }
                            else {
                                _this._position++;
                                return { type: TokenType.Operator, value: '|' };
                            }
                        }
                        break;
                    }
                }
                _this._position++;
                if (inString == 'none' && state !== TokenType.SingleComment && state !== TokenType.MultiComment) {
                    if (!Lexer.isWhite(curChar)) {
                        curToken += curChar;
                    }
                }
                else {
                    curToken += curChar;
                }
            }
        };
        this._eatWhiteSpace = function () {
            while (_this._position < _this._input.length && Lexer.isWhiteChar(_this._input[_this._position])) {
                _this._column++;
                if (Lexer.isNewLine(_this._input[_this._position])) {
                    _this._column = 1;
                    _this._line++;
                }
                _this._position++;
            }
            _this._updateStartPosition();
        };
        this._updateStartPosition = function () {
            _this._startPosition = {
                position: _this._position,
                line: _this._line,
                column: _this._column,
                file: _this._file
            };
        };
        this._file = fileName;
        this._input = input;
    }
    Lexer.isWhite = function (char) { return (char[0] == ' ' || char[0] == '\t' || Lexer.isNewLine(char[0])); };
    Lexer.isWhiteChar = function (char) { return (char == ' ' || char == '\t' || Lexer.isNewLine(char)); };
    Lexer.isAlpha = function (char) { return (char[0] >= 'a' && char[0] <= 'z') || (char[0] >= 'A' && char[0] <= 'Z') || (char == '_'); };
    Lexer.isDigit = function (char) { return (char[0] >= '0' && char[0] <= '9'); };
    Lexer.isNewLine = function (char) { return char === '\n' || char === '\n\r'; };
    return Lexer;
}());
exports.Lexer = Lexer;
//# sourceMappingURL=lexer.js.map