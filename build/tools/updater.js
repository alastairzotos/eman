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
var log = require("single-line-log");
var child_process = require("child_process");
var coretool_1 = require("./coretool");
var uploadlogger_1 = require("../em-api/uploadlogger");
var Updater = /** @class */ (function (_super) {
    __extends(Updater, _super);
    function Updater(program, config, argv) {
        var _this = _super.call(this, program, config, argv) || this;
        _this.getDescription = function () { return "Updates your version of " + coretool_1.CLI_CMD; };
        _this.run = function (cb) {
            uploadlogger_1.logOutput("Updating...");
            child_process.exec("npm install -g eman-script", function (error, stdout, stderr) {
                uploadlogger_1.stopLog();
                log.stdout(chalk_1.default.green("\u2714 Update complete\n"));
                cb(null, null);
            });
        };
        return _this;
    }
    return Updater;
}(coretool_1.CoreTool));
exports.Updater = Updater;
//# sourceMappingURL=updater.js.map