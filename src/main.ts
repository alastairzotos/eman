#!/usr/bin/env node

import { EmanCLI }      from './tools/emancli';
import { Builder }      from './tools/builder';
import { RenderTool }   from './tools/rendertool';
import { UnitTester }   from './tools/unittester';
import { PDFGenerator } from './tools/pdfGenerator';
import { Publisher }    from './tools/publisher';
import { Updater }      from './tools/updater';
import { HelpTool }     from './tools/helptool';
import { WatcherTool }  from './tools/watcher';


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
cli.registerTool("watch",   WatcherTool);


// Run
cli.start();

/*import { VersionChecker } from './tools/versionchecker';

const versionChecker = new VersionChecker();
versionChecker.performVersionCheck();

cli.start(() => {
    console.log(versionChecker.getUpdate());
});*/