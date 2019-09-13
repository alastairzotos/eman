#!/usr/bin/env node

import { EmanCLI }      from './tools/emancli';
import { Builder }      from './tools/builder';
import { RenderTool }      from './tools/rendertool';
import { UnitTester }   from './tools/unittester';
import { PDFGenerator } from './tools/pdfGenerator';
import { Publisher }    from './tools/publisher';
import { Updater }      from './tools/updater';
import { HelpTool }     from './tools/helptool';


// Clear the console
process.stdout.write('\x1Bc');

// Create cli application
const cli = new EmanCLI();

// Register cli tools
cli.registerTool("help",    HelpTool, { requiresConfig: false });
cli.registerTool("build",   Builder);
cli.registerTool("render",  RenderTool);
cli.registerTool("test",    UnitTester);
cli.registerTool("pdf",     PDFGenerator);
cli.registerTool("publish", Publisher);
cli.registerTool("update",  Updater, { requiresConfig: false });


// Run
cli.start();

import * as child_process from 'child_process';

child_process.exec("npm version", (err, stdout) => {
    const found = stdout.match(/'eman-script': '[0-9]+\.[0-9]+.[0-9]+'/);
    if (found) {
        const curVer = found[0].split(': ').pop().slice(1, -1).split('.').map(part => parseInt(part));

        console.log("Current version:", curVer);

        child_process.exec("npm show eman-script version", (err, stdout) => {
            const remoteVer = stdout.split('.').map(part => parseInt(part));
            console.log("Remote version:", remoteVer);
        });
    }
})