export declare class YieldVar {
    name: string;
    wrapBraces: boolean;
    __isYielded: boolean;
    constructor(name: string, wrapBraces?: boolean);
    toString(): string;
}
export declare class IntermediateRef {
    name: string;
    __intermediateRef: boolean;
    constructor(name: string);
    toString(): string;
}
export interface IYieldedVar {
    name: string;
    scope: "public" | "private";
    default: any;
}
export declare type IYieldedVars = {
    [name: string]: IYieldedVar;
};
export interface ILookupTable {
    [key: string]: any;
}
export declare type ILookupTables = {
    [name: string]: ILookupTable;
};
export interface ILookupMappings {
}
