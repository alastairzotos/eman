import chalk from 'chalk';

import { EmanCLI } from './emancli';
import { IConfig, CoreTool, IFlagDocs, CLI_CMD } from './coretool';

const Table = require('cli-table3');

const HELP_DESC = "An ECMAScript-like language and tool-set for developing Alterian Email Manager emails.";

export class HelpTool extends CoreTool<any> {
    constructor(program: EmanCLI, config: IConfig, argv: string[]) {
        super(program, config, argv);
    }

    getDescription = (): string => "You're viewing it right now";

    run = (cb: (err, res)=>void) => {

        if (this.argv.length == 1) {
            this.displayAllCommands();
        } else {
            const command = this.argv[1];

            const commands = this.program.getCommands();
            if (commands[command]) {
                const tool = new commands[command].tool(this.program, this.config, this.argv);
                tool.displayToolDocs(command);
            } else {
                this.displayAllCommands(command);
            }
        }

        cb(null, null);
    };

    private displayAllCommands = (withError?: string) => {
        const commands = this.program.getCommands();

        if (withError) {
            this.program.displayError(`Cannot find command '${chalk.magenta(withError)}'\n`);
        } else {
            console.group(chalk.bgBlue(` ${chalk.yellow(chalk.bold(CLI_CMD.toUpperCase()))} `));
            console.log('');

            console.log(chalk.white(HELP_DESC), '\n');

            console.log(chalk.white(`For full documentation please visit ${chalk.blue('https://alastairzotos.github.io/eman-docs/')}`), '\n');

            console.groupEnd();
        }

        console.group(chalk.magenta(chalk.bold('Usage:')));
        console.log('');
        console.log(`${chalk.green(CLI_CMD)} ${chalk.green(chalk.bold('<command>'))} ${chalk.white(`[${chalk.gray('path/to/project')}]?`)} ${chalk.white(`[${chalk.yellow('-flags')}]*`)}`);
        console.groupEnd();
        console.log('');

        // Commands

        console.group(chalk.magenta(chalk.bold("Commands:")));
        console.log('');

        console.log(chalk.gray(`Type ${chalk.green('eman help ' + chalk.bold('<command>'))} to view documentation and examples for each command`));
        console.log('');

        var table = new Table({ head: [] });
        Object.keys(commands).forEach(command => {
            const tool = new commands[command].tool(this.program, this.config, this.argv);
            
            if (command !== "help") {
                let desc = this.wrapLine(tool.getDescription(), 80);

                table.push([
                    { content: chalk.green(CLI_CMD + ' ' + chalk.bold(command)), vAlign: 'center' },
                    chalk.cyan(desc)
                ]);
            }
        });
        console.log(table.toString());
        console.groupEnd();

        console.log('');
    };
}