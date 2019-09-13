/*import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import * as log from 'single-line-log';
import * as readline from 'readline';

import { Runtime, IRuntimeOutput } from './lang/runtime';
import { displayOutput } from './lang/utils';
import { uploadOutput } from './em-api/api';
import { UnitTester, TestResult } from './tools/unittester';
import { PDFGenerator } from './tools/pdfgenerator';


interface IAMLOptions {
    file: string;

    displayOutput?: boolean;
    displayFullOutput?: boolean;
    runTests?: boolean;
    runTestsQuiet?: boolean;
    generatePdf?: string;
    settings?: string;

    publish?: boolean;

    campaignId?: number;

    browserSync?: boolean;
    outputPath?: string;

    onRuntimeCreated?: (runtime: Runtime)=>void;
    onOutput?: (output: IRuntimeOutput)=>void;
    onTestsCompleted?: (results: TestResult)=>void;
    onUploadCompleted?: (errors, responses)=>void;
    onTestsGenerated?: (csv: string)=>void;
    onPdfGenerated?: ()=>void;
}

export const startAML = (options: IAMLOptions) => {
    options = {
        displayOutput: true,
        runTests: true,
        publish: false,
        browserSync: false,

        ...options
    };

    const runtime = new Runtime();
    if (options.onRuntimeCreated) options.onRuntimeCreated(runtime);

    // Let front-end know that we are publishing
    if (options.publish) {
        runtime.getScope()['runtime'].publishing = true;
    }

    // Run the code and get output
    const output = runtime.run(options.file);
    if (options.onOutput) options.onOutput(output);

    if (output) {

        const filePath = options.file.split('/').slice(0, -1).join('/');
        const outputParts = options.outputPath.split('/');
        const outputPath = outputParts.slice(0, -1).join('/');
        const fullOutputPath = path.join(filePath, outputPath);

        // Display output
        if (options.displayOutput || options.displayFullOutput) {
            displayOutput(output, options.displayFullOutput);
        }

        // Browsersync
        if (options.browserSync && options.outputPath) {
            if (!fs.existsSync(fullOutputPath)) {
                fs.mkdir(fullOutputPath, (err) => {});
            }

            fs.writeFileSync(fullOutputPath + '/' + outputParts[outputParts.length - 1], output.output);
        }

        // Run tests
        let testResults = TestResult.Passed;
        if (options.runTests || options.runTestsQuiet) {

            const unittester = new UnitTester();
            testResults = unittester.runTests(options.file, options.runTestsQuiet);
            if (options.onTestsCompleted) options.onTestsCompleted(testResults);
        }

        // Generate PDF
        if (options.generatePdf && options.generatePdf !== '' && options.generatePdf !== 'true') {
            const pdfGenerator = new PDFGenerator(outputPath);

            let outputFile = options.generatePdf;
            if (!outputFile.endsWith('.pdf')) outputFile += '.pdf';

            const fullPdfOutput = path.join(fullOutputPath, outputFile);

            const startTime = Date.now();
            pdfGenerator.generatePdf(options.file, fullPdfOutput, options.settings, err => {
                if (err) {
                    log.stdout(chalk.red("\u2716 Error creating PDF:"), err, '\n');
                } else {
                    const elapsed = Date.now() - startTime;
                    log.stdout(chalk.green(chalk.bold(`\u2714 Success [${chalk.yellow(elapsed + 'ms')}]: `)) + `PDF saved to ${chalk.gray(fullPdfOutput)}\n`);

                    if (options.onPdfGenerated) options.onPdfGenerated();
                }
            });
        }

        // Publish
        if (options.publish && options.campaignId) {
            
            // Only publish if tests have passed
            if (testResults === TestResult.Failed) {
                console.log(chalk.red("\u2716 Cannot publish: ") + chalk.white("All tests must pass to publish"));
            } else {

                const performPublish = () => {
                    console.log(chalk.bgBlue(chalk.yellow(" Publishing...")));
                    console.log("");
                    uploadOutput(options.campaignId, output, (errors, responses) => {

                        if (errors) {
                            log.stdout(chalk.red("\u2716 There were errors:"), errors, '\n');
                        } else {
                            log.stdout(chalk.green(chalk.bold("\u2714 Done\n")));
                        }

                        if (options.onUploadCompleted) options.onUploadCompleted(errors, responses);
                    });
                };


                // If we have some todos, ask for confirmation
                if (testResults === TestResult.Todo) {

                    const rl = readline.createInterface(process.stdin, process.stdout);
                    rl.question(chalk.yellow('\u26a0') + chalk.cyan(" There are some unfinished todos.") + " Are you sure you want to publish? " + chalk.white("(y/n) "), answer => {
                        if (answer.trim().toLowerCase() == "y") {
                            console.log("");
                            performPublish();
                        }
                        rl.close();
                    });

                } else {
                    performPublish();
                }

            }

        }
    }

};*/ 
//# sourceMappingURL=aml.js.map