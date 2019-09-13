import chalk from 'chalk';
import highlight from 'cli-highlight';
import { IRuleCondition } from './varconfig';
import { IRuntimeOutput, Runtime } from './runtime';


export const conditionToString = (cond: IRuleCondition): string => {
    let combine = "\n\t";
    if (cond.type == "&&") combine = ' and \n    ';
    else if (cond.type == "||") combine = " or \n    ";

    let right = cond.right;
    if (right === '') right = "''";

    return `${chalk.green(cond.left)} ${chalk.magenta(cond.operation)} ${chalk.green(right)}${combine}`;
};

export const conditionsToString = (conds: IRuleCondition[]): string => {
    return conds.map(cond => conditionToString(cond)).join('');
};

export const displayFormattedOutput = (compiled: IRuntimeOutput, fullOutput: boolean) => {
    if (compiled) {
        console.log(chalk.yellow(chalk.bgBlue(" HTML Output:")));
        console.log("");
        console.log(highlight(compiled.output, { language: "html" }));

        if (fullOutput) {
            console.log("");
            console.log(chalk.yellow(chalk.bgBlue(" Variables:")));
            console.log("");

            const publicVars = Object.keys(compiled.yieldedVars).filter(varName => compiled.yieldedVars[varName].scope == 'public');
            const privateVars = Object.keys(compiled.yieldedVars).filter(varName => compiled.yieldedVars[varName].scope == 'private');

            publicVars.forEach(varName => {
                const defVar = compiled.yieldedVars[varName];
                console.log(chalk.magenta(defVar.scope) + ' ' + chalk.yellow(varName) + (defVar.default ? (chalk.gray(' = ') + chalk.blue(defVar.default)) : '') );
            });
            console.log("");
            privateVars.forEach(varName => {
                const defVar = compiled.yieldedVars[varName];
                console.log(chalk.magenta(defVar.scope) + ' ' + chalk.yellow(varName) + (defVar.default ? (chalk.gray(' = ') + chalk.blue(defVar.default)) : '') );
            });
            
            console.log("");
            console.log(chalk.yellow(chalk.bgBlue(" Sections:")));
            Object.keys(compiled.sections).forEach(secName => {
                console.log("");
                console.log(chalk.yellow(chalk.underline(secName)) + ':');

                const varConfig = compiled.sections[secName];
                console.log(chalk.gray("Default: ") + highlight(varConfig.default));
                console.log("");

                varConfig.rules.forEach(rule => {
                    console.log(`${chalk.red('if')} ${chalk.magenta('(')}\n    ${conditionsToString(rule.conditions)}\n${chalk.magenta(')')}`);
                    console.log(chalk.gray("  Result:"), highlight(rule.result.split('\n').join(''), { language: "html" }));
                    console.log("");
                });
            });

            console.log("");
            console.log(chalk.yellow(chalk.bgBlue(" Intermediates:")));
            Object.keys(compiled.intermediates).forEach(intName => {
                console.log("");
                console.log(chalk.yellow(chalk.underline(intName)));

                const varConfig = compiled.intermediates[intName];

                if (varConfig.default != '0') {
                    console.log(chalk.gray("Default: ") + varConfig.default);
                    console.log("");
                }

                varConfig.rules.forEach(rule => {
                    console.log(`${chalk.red('if')} ${chalk.magenta('(')}\n    ${conditionsToString(rule.conditions)}\n${chalk.magenta(')')}`);
                    console.log(chalk.gray('  Result:'), highlight(rule.result.split('\n').join(''), { language: "html" }));
                    console.log("");
                });
            });
        }

        console.log("");
    }
};

export const displayOutputObject = (compiled: IRuntimeOutput, alterianVersion: boolean = false) => {
    console.log(JSON.stringify(compiled, null, 4));
};

export const displayOutput = (output: IRuntimeOutput, fullOutput: boolean) => {
    displayFormattedOutput(output, fullOutput);
};


export const stringHash = (input: string): string => {
    let hash = 0;
    if (input.length == 0) {
        return Buffer.from(hash + '').toString('base64');
    }
    for (var i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Buffer.from(hash + '').toString('base64');
};

export const generateNowSetting = (): string => {
    const date = new Date();
    const month = date.getMonth() + 1;
    return `${month < 10 ? '0' + month : month}/${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()}/${date.getFullYear()}`;
};