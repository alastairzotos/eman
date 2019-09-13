"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = require("chalk");
exports.extractFilename = function (fileName) {
    if (fileName.indexOf('/') >= 0)
        return fileName.split('/').pop();
    return fileName;
};
var renderErrorMessage = function (message) {
    var output = "";
    var currentToken = "";
    var inString = false;
    for (var _i = 0, message_1 = message; _i < message_1.length; _i++) {
        var char = message_1[_i];
        if (char == "'") {
            if (inString) {
                inString = false;
                output += chalk_1.default.green(currentToken);
                currentToken = "'";
            }
            else {
                inString = true;
                output += chalk_1.default.magenta(currentToken + "'");
                currentToken = "";
            }
        }
        else {
            currentToken += char;
        }
    }
    if (inString) {
        output += chalk_1.default.yellow(currentToken);
    }
    else {
        output += chalk_1.default.magenta(currentToken);
    }
    return output;
};
var CoreError = /** @class */ (function () {
    function CoreError(msg, startPosition, endPosition) {
        var _this = this;
        this.msg = msg;
        this.startPosition = startPosition;
        this.endPosition = endPosition;
        this.display = function () {
            if (_this.startPosition) {
                console.log(chalk_1.default.red(_this._type + " error ") + chalk_1.default.gray("(in " + chalk_1.default.yellow(exports.extractFilename(_this.startPosition.file)) + ", line " + chalk_1.default.yellow(_this.startPosition.line + '') + ", column " + chalk_1.default.yellow(_this.startPosition.column + '') + ")") + chalk_1.default.red(": ") + renderErrorMessage(_this.msg));
            }
            else {
                console.log(chalk_1.default.red(_this._type + " error: ") + renderErrorMessage(_this.msg));
            }
        };
    }
    return CoreError;
}());
exports.CoreError = CoreError;
var CompilerError = /** @class */ (function (_super) {
    __extends(CompilerError, _super);
    function CompilerError(msg, startPosition, endPosition, important) {
        if (important === void 0) { important = false; }
        var _this = _super.call(this, msg, startPosition, endPosition) || this;
        _this.msg = msg;
        _this.startPosition = startPosition;
        _this.endPosition = endPosition;
        _this.important = important;
        _this.__compilerError = true;
        _this._type = "Compiler";
        return _this;
    }
    return CompilerError;
}(CoreError));
exports.CompilerError = CompilerError;
var RuntimeError = /** @class */ (function (_super) {
    __extends(RuntimeError, _super);
    function RuntimeError(msg, startPosition, endPosition) {
        var _this = _super.call(this, msg, startPosition, endPosition) || this;
        _this.msg = msg;
        _this.startPosition = startPosition;
        _this.endPosition = endPosition;
        _this.__runtimeError = true;
        _this._type = "Runtime";
        return _this;
    }
    return RuntimeError;
}(CoreError));
exports.RuntimeError = RuntimeError;
var PluginError = /** @class */ (function (_super) {
    __extends(PluginError, _super);
    function PluginError(msg, startPosition, endPosition) {
        var _this = _super.call(this, msg, startPosition, endPosition) || this;
        _this.msg = msg;
        _this.startPosition = startPosition;
        _this.endPosition = endPosition;
        _this.__pluginError = true;
        _this._type = "Plugin";
        return _this;
    }
    return PluginError;
}(CoreError));
exports.PluginError = PluginError;
exports.displayError = function (e) {
    if (e.__compilerError || e.__runtimeError) {
        e.display();
    }
    else if (e.__pluginError) {
        console.log();
        e.display();
    }
    else {
        console.log(e);
    }
};
//# sourceMappingURL=errors.js.map