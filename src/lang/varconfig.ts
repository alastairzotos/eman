import { Runtime, IRuntimeOutput } from "./runtime";
import { renderOutput } from "./renderer";

export const createRuleConditions = (conditions: IRuleCondition[], left: any, right: any, operation: IRuleOp, type: IRuleType = "end") => {
    if (operation == '>=') {
        conditions.push({
            type: "||",
            operation: '>',
            left: left + '',
            right: right + ''
        });
        conditions.push({
            type,
            operation: '==',
            left: left + '',
            right: right + ''
        });
    } else if (operation == '<=') {
        conditions.push({
            type: "||",
            operation: '<',
            left: left + '',
            right: right + ''
        });
        conditions.push({
            type,
            operation: '==',
            left: left + '',
            right: right + ''
        });
    } else if (operation == '===') {
        conditions.push({
            type,
            operation: '==',
            left: left + '',
            right: right + ''
        });
    } else if (operation == '!==') {
        conditions.push({
            type,
            operation: '!=',
            left: left + '',
            right: right + ''
        });
    } else {
        conditions.push({
            type,
            operation,
            left: left + '',
            right: right + ''
        });
    }
};


export type IRuleOp = '=='|'==='|'!=='|'!='|'<'|'>'|'>='|'<='|'startsWith'|'endsWith'|'notStartsWith'|'notEndsWith'|'contains'|'notContains';
export type IRuleType = '&&'|'||'|'end';

export interface IRuleCondition {
    type: IRuleType;

    operation: IRuleOp;

    left: string;
    right: string;
}

export interface IVarRule {
    conditions: IRuleCondition[];
    result: string;
}

export interface IVarConfig {
    rules: IVarRule[];
    default: string;
}

const evaluateCondition = (current: boolean, type: IRuleType, condition: IRuleCondition, runtime: Runtime, output: IRuntimeOutput, values: { [varName: string]: any }): any => {
    const replaceVars = (item: string): string => {
        let newItem = item;

        // Replace values
        Object.keys(values).forEach(key => {
            newItem = newItem.replace(new RegExp(`{${key}}`, 'g'), values[key]);
        });

        // Replace rules and intermediates
        const rules = {...output.sections, ...output.intermediates};
        Object.keys(rules).forEach(ruleName => {
            if (newItem.indexOf(`{${ruleName}}`) >= 0) {
                const evaluated = evaluateVarConfig(rules[ruleName], output, runtime, values);

                if (evaluated) {
                    newItem = newItem.replace(new RegExp(`{${ruleName}}`, 'g'), evaluated);
                } else {
                    newItem = newItem.replace(new RegExp(`{${ruleName}}`, 'g'), '');
                }
            }
        });

        return newItem;
    };

    const evaluate = (): boolean => {
        const left = replaceVars(condition.left);
        const right = replaceVars(condition.right);

        switch (condition.operation) {
            case "==":              return left == right;
            case "===":             return left === right;
            case "!=":              return left != right;
            case "!==":             return left !== right;
            case "<":               return parseFloat(left) < parseFloat(right);
            case "<=":              return parseFloat(left) <= parseFloat(right);
            case ">":               return parseFloat(left) > parseFloat(right);
            case ">=":              return parseFloat(left) >= parseFloat(right);
            case "contains":        return left.indexOf(right) >= 0;
            case "notContains":     return left.indexOf(right) < 0;
            case "startsWith":      return left.startsWith(right);
            case "notStartsWith":   return !left.startsWith(right);
            case "endsWith":        return left.endsWith(right);
            case "notEndsWith":     return !left.endsWith(right);
        }

        return false;
    };

    if (type == "end") {
        return evaluate();
    } else if (type == "&&") {
        return current && evaluate();
    } else {
        return current || evaluate();
    }
};

export const evaluateVarConfig = (varConfig: IVarConfig, output: IRuntimeOutput, runtime: Runtime, values: { [varName: string]: any }): any => {

    let result = varConfig.default;

    for (let rule of varConfig.rules) {
        let currentCondition = true;
        let currentType: IRuleType = "&&";

        rule.conditions.forEach(condition => {
            currentCondition = evaluateCondition(currentCondition, currentType, condition, runtime, output, values);
            currentType = condition.type;
        });


        if (currentCondition) {
            result = rule.result;
            break;
        }
    }

    if (result || result == '') {
        return renderOutput(result, output, runtime, values);
    }
    return null;
};