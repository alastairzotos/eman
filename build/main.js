#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var emancli_1 = require("./tools/emancli");
var builder_1 = require("./tools/builder");
var rendertool_1 = require("./tools/rendertool");
var unittester_1 = require("./tools/unittester");
var pdfGenerator_1 = require("./tools/pdfGenerator");
var publisher_1 = require("./tools/publisher");
var updater_1 = require("./tools/updater");
var helptool_1 = require("./tools/helptool");
// Clear the console
process.stdout.write('\x1Bc');
// Create cli application
var cli = new emancli_1.EmanCLI();
// Register cli tools
cli.registerTool("help", helptool_1.HelpTool, { requiresConfig: false });
cli.registerTool("build", builder_1.Builder);
cli.registerTool("render", rendertool_1.RenderTool);
cli.registerTool("test", unittester_1.UnitTester);
cli.registerTool("pdf", pdfGenerator_1.PDFGenerator);
cli.registerTool("publish", publisher_1.Publisher);
cli.registerTool("update", updater_1.Updater, { requiresConfig: false });
// Run
cli.start();
//# sourceMappingURL=main.js.map