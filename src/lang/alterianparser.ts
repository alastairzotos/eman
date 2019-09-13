import { Lexer, TokenType } from './lexer';
import { ExprNode, LoadExpr, AccessObjExpr, MethodCallExpr, LitExpr, AlterianMethodCall } from './parsenodes';


export class AlterianParser {
    private _lexer: Lexer;

    constructor() {

    }

    parseString = (input: string): ExprNode[] => {
        const expressions: ExprNode[] = [];
        this._lexer = new Lexer("", input);

        while (this._lexer.check()) {
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
            if (this._lexer.isWhite(this._lexer.getHTMLContentStart())) {
                expressions.push(new LitExpr(this._lexer.acceptHTMLText().value as string));

                // Not entirely sure about the + 1 here
                this._lexer.setHTMLContentStart(this._lexer.getPosition().position + 1);
            }

            // We can't parse other HTML elements
            else if (this._lexer.check(TokenType.TagLT)) {
                throw new Error();
            }
            
            // {Expressions}(.Methods())*
            else if (this._lexer.check(TokenType.BraceOpen)) {
                expressions.push(this.parseValue());
                this._lexer.setHTMLContentStart(this._lexer.getEndPosition().position);
            }
            
            // Text 
            else {
                expressions.push(new LitExpr(this._lexer.acceptHTMLText().value as string));
                this._lexer.setHTMLContentStart(this._lexer.getEndPosition().position + 1);
            }
        }

        return expressions;
    };


    private parseValue = (): ExprNode => {
        let result: ExprNode;

        if (this._lexer.check(TokenType.BraceOpen)) {
            this._lexer.accept(TokenType.BraceOpen);
            result = new LoadExpr(this._lexer.accept(TokenType.Ident).value as string);
            this._lexer.accept(TokenType.BraceClose);
        }

        while (this._lexer.check(TokenType.Dot)) {
            this._lexer.accept();

            const property = this._lexer.accept(TokenType.Ident).value as string;

            if (this._lexer.check(TokenType.ParOpen)) {
                this._lexer.accept();

                const call = new AlterianMethodCall();
                call.obj = result;
                call.prop = property;

                while (!this._lexer.check(TokenType.ParClose)) {
                    call.args.push(this.parseArg());
                }

                this._lexer.accept(TokenType.ParClose);

                result = call;
            } else {
                const access = new AccessObjExpr();
                access.obj = result;
                access.prop = property;

                result = access;
            }
        }

        return result;
    };

    private parseArg = (): LitExpr => {
        this._lexer.accept(TokenType.SquareOpen);
        this._lexer.setTemplateContentStart(this._lexer.getEndPosition().position);
        const text = this._lexer.acceptUntil(char => char == ']').value as string;
        this._lexer.accept(TokenType.SquareClose);

        return new LitExpr(text);
    };
}