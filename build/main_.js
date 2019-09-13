#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var argvParser = require("argv-parser");
var path = require("path");
var chalk_1 = require("chalk");
var aml_1 = require("./aml");
// Process args
var argvRules = {
    source: {
        short: "s",
        type: String,
        value: ""
    },
    display: {
        short: "d",
        type: Boolean,
        value: false
    },
    "displayfull": {
        short: "df",
        type: Boolean,
        value: false
    },
    publish: {
        short: "p",
        type: Boolean,
        value: false
    },
    test: {
        short: "t",
        type: Boolean,
        value: false
    },
    testQuiet: {
        short: "tq",
        type: Boolean,
        value: false
    },
    pdf: {
        type: String,
        value: ''
    },
    settings: {
        type: String,
        value: ''
    }
};
var _a = argvParser.parse(process.argv, { rules: argvRules }).parsed, source = _a.source, display = _a.display, displayfull = _a.displayfull, publish = _a.publish, test = _a.test, testQuiet = _a.testQuiet, pdf = _a.pdf, settings = _a.settings;
console.clear();
if (!source) {
    if (process.argv.length > 2 && process.argv[2].length > 0 && process.argv[2][0] !== '-') {
        source = process.argv[2];
    }
    else {
        source = "config.json";
    }
}
if (source) {
    if (!fs.existsSync(source)) {
        console.log(chalk_1.default.red("Error:"), "Cannot find configuration file '" + chalk_1.default.magenta(source) + "'");
    }
    else {
        var config = null;
        try {
            config = JSON.parse(fs.readFileSync(source, { encoding: "utf8" }));
            var configPath = source.split('/').slice(0, -1).join('/');
            var file = path.resolve(process.cwd(), path.join(configPath, config.file));
            aml_1.startAML({
                file: file,
                campaignId: config.campaignId,
                publish: publish,
                runTests: test,
                runTestsQuiet: testQuiet,
                generatePdf: pdf,
                settings: settings,
                displayOutput: display,
                displayFullOutput: displayfull,
                browserSync: true,
                outputPath: "/build/index.html"
            });
        }
        catch (e) {
            console.log(chalk_1.default.red("Error:"), "Cannot parse '" + chalk_1.default.magenta(source) + "'");
            console.log(e);
        }
    }
}
else {
    console.log(chalk_1.default.red("Error:"), "You must provide a source configuration. Example:", chalk_1.default.gray("npm run build -- -s=./scripts/myscript/config.json"));
}
//# sourceMappingURL=main_.js.map