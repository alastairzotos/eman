#!/usr/bin/env node
/*
import * as fs from 'fs';
import * as argvParser from 'argv-parser';
import * as path from 'path';
import chalk from 'chalk';


import { startAML } from './aml';


// Process args
const argvRules = {
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
let {
    source,
    display,
    displayfull,
    publish,
    test,
    testQuiet,
    pdf,
    settings
} = argvParser.parse(process.argv, { rules: argvRules }).parsed;

console.clear();

if (!source) {
    if (process.argv.length > 2 && process.argv[2].length > 0 && process.argv[2][0] !== '-') {
        source = process.argv[2];
    } else {
        source = "config.json";
    }
}

if (source) {
    if (!fs.existsSync(source)) {
        console.log(chalk.red("Error:"), `Cannot find configuration file '${chalk.magenta(source)}'`);
    } else {
        let config = null;
        try {
            config = JSON.parse(fs.readFileSync(source, { encoding: "utf8" }));

            const configPath = source.split('/').slice(0, -1).join('/');
            const file = path.resolve(process.cwd(), path.join(configPath, config.file));
            
            startAML({
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

        } catch (e) {
            console.log(chalk.red("Error:"), `Cannot parse '${chalk.magenta(source)}'`);
            console.log(e);
        }
    }
} else {
    console.log(chalk.red("Error:"), "You must provide a source configuration. Example:", chalk.gray("npm run build -- -s=./scripts/myscript/config.json"));
}

*/ 
//# sourceMappingURL=main_.js.map