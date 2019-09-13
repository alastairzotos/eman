import { ExprNode } from './parsenodes';
export declare class AlterianParser {
    private _lexer;
    constructor();
    parseString: (input: string) => ExprNode[];
    private parseValue;
    private parseArg;
}
