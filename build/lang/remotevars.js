"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// A running instance of a campaign variable
// Used to check if it's being used in logic to alter compilation
// Resolves to it's name if used in a string
var YieldVar = /** @class */ (function () {
    function YieldVar(name, wrapBraces) {
        if (wrapBraces === void 0) { wrapBraces = true; }
        this.name = name;
        this.wrapBraces = wrapBraces;
        this.__isYielded = true;
    }
    YieldVar.prototype.toString = function () {
        if (this.wrapBraces) {
            return "{" + this.name + "}";
        }
        else {
            return this.name;
        }
    };
    return YieldVar;
}());
exports.YieldVar = YieldVar;
// A running instance of an automatically generated intermediate variable
// Resolves to it's name in braces
var IntermediateRef = /** @class */ (function () {
    function IntermediateRef(name) {
        this.name = name;
        this.__intermediateRef = true;
    }
    IntermediateRef.prototype.toString = function () {
        return "{" + this.name + "}";
    };
    return IntermediateRef;
}());
exports.IntermediateRef = IntermediateRef;
//# sourceMappingURL=remotevars.js.map