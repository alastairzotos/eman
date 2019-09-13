"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var FuncClosure = /** @class */ (function () {
    function FuncClosure() {
        var _this = this;
        this.__isClosure = true;
        this.scope = {};
        this.prototype = Object.prototype;
        this.evaluate = function (runtime, args, thisArg) {
            _this.thisArg = thisArg;
            return _this.func.apply(thisArg || global, args);
        };
        this.apply = function (thisArg, args) {
            _this.thisArg = thisArg;
            return _this.func.apply(thisArg, args);
        };
    }
    return FuncClosure;
}());
exports.FuncClosure = FuncClosure;
//# sourceMappingURL=closure.js.map