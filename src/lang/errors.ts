import chalk from 'chalk';

import { IPosition } from './lexer';


export const extractFilename = (fileName: string): string => {
    if (fileName.indexOf('/') >= 0)
        return fileName.split('/').pop();
    
    return fileName;
};

const renderErrorMessage = (message: string): string => {
    let output = "";

    let currentToken = "";
    let inString = false;
    for (var char of message) {
        if (char == "'") {
            if (inString) {
                inString = false;
                output += chalk.green(currentToken);
                currentToken = "'";
            } else {
                inString = true;
                output += chalk.magenta(currentToken + "'");
                currentToken = "";
            }
        } else {
            currentToken += char;
        }
    }

    if (inString) {
        output += chalk.yellow(currentToken);
    } else {
        output += chalk.magenta(currentToken);
    }

    return output;
};

export class CoreError {
    protected _type;
    public fileName: string;

    constructor(public msg: string, public startPosition: IPosition, public endPosition?: IPosition) {
    }

    display = () => {
        if (this.startPosition) {
            console.log( chalk.red(`${this._type} error `) + chalk.gray(`(in ${chalk.yellow( extractFilename(this.startPosition.file) )}, line ${chalk.yellow( this.startPosition.line + '' )}, column ${chalk.yellow( this.startPosition.column + '' )})`) + chalk.red(": ") + renderErrorMessage(this.msg) );
        } else {
            console.log(chalk.red(`${this._type} error: `) + renderErrorMessage(this.msg));
        }
    };
}

export class CompilerError extends CoreError {
    private __compilerError: boolean = true;
    
    constructor(public msg: string, public startPosition: IPosition, public endPosition?: IPosition, public important: boolean = false) {
        super(msg, startPosition, endPosition);
        this._type = "Compiler";
    }
}

export class RuntimeError extends CoreError {
    private __runtimeError: boolean = true;
    
    constructor(public msg: string, public startPosition: IPosition, public endPosition?: IPosition) {
        super(msg, startPosition, endPosition);
        this._type = "Runtime";
    }
}

export class PluginError extends CoreError {
    private __pluginError: boolean = true;
    
    constructor(public msg: string, public startPosition: IPosition, public endPosition?: IPosition) {
        super(msg, startPosition, endPosition);
        this._type = "Plugin";
    }
}


export const displayError = (e: any) => {
    if (e.__compilerError || e.__runtimeError) {
        e.display();
    } else if (e.__pluginError) {
        console.log();
        e.display();
    } else {
        console.log(e);
    }
};