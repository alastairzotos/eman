import { IPosition } from './lexer';
export declare const extractFilename: (fileName: string) => string;
export declare class CoreError {
    msg: string;
    startPosition: IPosition;
    endPosition?: IPosition;
    protected _type: any;
    fileName: string;
    constructor(msg: string, startPosition: IPosition, endPosition?: IPosition);
    display: () => void;
}
export declare class CompilerError extends CoreError {
    msg: string;
    startPosition: IPosition;
    endPosition?: IPosition;
    important: boolean;
    private __compilerError;
    constructor(msg: string, startPosition: IPosition, endPosition?: IPosition, important?: boolean);
}
export declare class RuntimeError extends CoreError {
    msg: string;
    startPosition: IPosition;
    endPosition?: IPosition;
    private __runtimeError;
    constructor(msg: string, startPosition: IPosition, endPosition?: IPosition);
}
export declare class PluginError extends CoreError {
    msg: string;
    startPosition: IPosition;
    endPosition?: IPosition;
    private __pluginError;
    constructor(msg: string, startPosition: IPosition, endPosition?: IPosition);
}
export declare const displayError: (e: any) => void;
