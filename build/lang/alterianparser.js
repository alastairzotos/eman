"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lexer_1 = require("./lexer");
var parsenodes_1 = require("./parsenodes");
var AlterianParser = /** @class */ (function () {
    function AlterianParser() {
        var _this = this;
        this.parseString = function (input) {
            var expressions = [];
            _this._lexer = new lexer_1.Lexer("", input);
            while (_this._lexer.check()) {
                /*if (this._lexer.isWhite(this._lexer.getHTMLContentStart())) {
                    expressions.push(new LitExpr(this._lexer.acceptHTMLText().value as string));
                    this._lexer.setHTMLContentStart(this._lexer.getEndPosition().position + 1);
                } else if (this._lexer.check(TokenType.BraceOpen)) {
                    expressions.push(this.parseValue());
                    this._lexer.setHTMLContentStart(this._lexer.getEndPosition().position);
                } else {
                    this._lexer.getNext();
                }*/
                // Get whitespace
                if (_this._lexer.isWhite(_this._lexer.getHTMLContentStart())) {
                    expressions.push(new parsenodes_1.LitExpr(_this._lexer.acceptHTMLText().value));
                    // Not entirely sure about the + 1 here
                    _this._lexer.setHTMLContentStart(_this._lexer.getPosition().position + 1);
                }
                // We can't parse other HTML elements
                else if (_this._lexer.check(lexer_1.TokenType.TagLT)) {
                    throw new Error();
                }
                // {Expressions}(.Methods())*
                else if (_this._lexer.check(lexer_1.TokenType.BraceOpen)) {
                    expressions.push(_this.parseValue());
                    _this._lexer.setHTMLContentStart(_this._lexer.getEndPosition().position);
                }
                // Text 
                else {
                    expressions.push(new parsenodes_1.LitExpr(_this._lexer.acceptHTMLText().value));
                    _this._lexer.setHTMLContentStart(_this._lexer.getEndPosition().position + 1);
                }
            }
            return expressions;
        };
        this.parseValue = function () {
            var result;
            if (_this._lexer.check(lexer_1.TokenType.BraceOpen)) {
                _this._lexer.accept(lexer_1.TokenType.BraceOpen);
                result = new parsenodes_1.LoadExpr(_this._lexer.accept(lexer_1.TokenType.Ident).value);
                _this._lexer.accept(lexer_1.TokenType.BraceClose);
            }
            while (_this._lexer.check(lexer_1.TokenType.Dot)) {
                _this._lexer.accept();
                var property = _this._lexer.accept(lexer_1.TokenType.Ident).value;
                if (_this._lexer.check(lexer_1.TokenType.ParOpen)) {
                    _this._lexer.accept();
                    var call = new parsenodes_1.AlterianMethodCall();
                    call.obj = result;
                    call.prop = property;
                    while (!_this._lexer.check(lexer_1.TokenType.ParClose)) {
                        call.args.push(_this.parseArg());
                    }
                    _this._lexer.accept(lexer_1.TokenType.ParClose);
                    result = call;
                }
                else {
                    var access = new parsenodes_1.AccessObjExpr();
                    access.obj = result;
                    access.prop = property;
                    result = access;
                }
            }
            return result;
        };
        this.parseArg = function () {
            _this._lexer.accept(lexer_1.TokenType.SquareOpen);
            _this._lexer.setTemplateContentStart(_this._lexer.getEndPosition().position);
            var text = _this._lexer.acceptUntil(function (char) { return char == ']'; }).value;
            _this._lexer.accept(lexer_1.TokenType.SquareClose);
            return new parsenodes_1.LitExpr(text);
        };
    }
    return AlterianParser;
}());
exports.AlterianParser = AlterianParser;
//# sourceMappingURL=alterianparser.js.map