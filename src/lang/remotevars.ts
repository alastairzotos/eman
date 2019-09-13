

// A running instance of a campaign variable
// Used to check if it's being used in logic to alter compilation
// Resolves to it's name if used in a string
export class YieldVar {
    public __isYielded = true;

    constructor(public name: string, public wrapBraces: boolean = true) {
    }

    toString() {
        if (this.wrapBraces) {
            return `{${this.name}}`;
        } else {
            return this.name;
        }
    }
}

// A running instance of an automatically generated intermediate variable
// Resolves to it's name in braces
export class IntermediateRef {
    public __intermediateRef = true;

    constructor(public name: string) {
    }

    toString() {
        return `{${this.name}}`;
    }
}

export interface IYieldedVar {
    name: string;
    scope: "public"|"private";
    default: any;
}
export type IYieldedVars = { [name: string]: IYieldedVar };


export interface ILookupTable {
    [key: string]: any;
}
export type ILookupTables = { [name: string]: ILookupTable };

export interface ILookupMappings {
    
}
