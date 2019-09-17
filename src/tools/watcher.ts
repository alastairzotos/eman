import * as path from 'path';
import * as fs from 'fs';

import { EmanCLI } from './emancli';
import { CoreTool, IConfig, IFlagDocs, ICommandExample } from './coretool';

import { Runtime, IRuntimeOutput } from '../lang/runtime';

import * as argvParser from 'argv-parser';
import chalk from 'chalk';

import nodeWatch from 'node-watch';
import * as log from 'single-line-log';


export class WatcherTool extends CoreTool<any> {
    constructor(program: EmanCLI, config: IConfig, argv: string[]) {
        super(program, config, argv);
    }

    run = (cb: (err: any, result: any)=>void) => {
        this.program.isWatchingForTypes = true;

        const twoDigits = (input: number): string => {
            if (input < 10) return '0' + input;
            return '' + input;
        };

        const getTime = ():string => {
            const now = new Date();

            return chalk.gray(`[${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}:${twoDigits(now.getSeconds())}] `);
        };

        console.log(getTime() + chalk.cyan("Watching files..."));
        console.log("");
        this.build(this.config.file, cb);

        const watcher = nodeWatch(this.getProjPath(), { recursive: true }, (eventType, fileName) => {
            if (fileName.endsWith(".aml")) {

                // Clear console
                process.stdout.write('\x1Bc');

                console.log(getTime() + chalk.cyan("Change detected in ") + chalk.gray(fileName));

                try {
                    Runtime.clearStaticData();
                    this.build(fileName, cb);
                } catch (e) {
                    this.program.displayError(e);
                }
            }
        })
    }

    private build = (filename: string, cb: (err: any, result: any)=>void) => {
        const runtime = new Runtime();
        const output = runtime.run(filename);

        const shortName = filename.split('/').pop();
        const defFileName = path.join(this.getProjPath(), shortName + '.d.ts');

        // If we have any type declarations, save them
        if (output.typeDeclarations.length > 0) {

            // Generate output
            const typeDeclOutput = `
            // Type declarations for '${shortName}'
            import * as React from 'react';

            ${this.getHtmlTypeDef()}

            ${output.typeDeclarations.join('\n')}
            `
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            .trim();

            fs.writeFileSync(defFileName, typeDeclOutput, 'utf8');
        } else {
            if (fs.existsSync(defFileName)) {
                fs.unlinkSync(defFileName);
            }
        }
    };

    private getHtmlTypeDef = (): string => {
        return `
            export type html = {
            \tinnerText: string;
            \tinnerHtml: string;

            \tcontent: ()=>string;
            \tattr: (attrName: string)=>any;
            };
        `
    };
}