import { IRuntimeOutput, Runtime } from './runtime';
import { evaluateVarConfig } from './varconfig';
import { AlterianParser } from './alterianparser';
import { Parser } from './parser';
import { HTMLExpr, HTMLExprType, HTMLTextExpr, HTMLDynExpr, HTMLElemExpr, ExprType, LoadExpr } from './parsenodes';
import { displayError } from './errors';
import { displayOutput } from './utils';

export const renderOutput = (text: string, output: IRuntimeOutput, runtime: Runtime, values: { [varName: string]: any }): string => {
    
    // Wrap in fragment to parse multiple top-level elements
    let htmlOutput = `<>${text}</>`;

    // Collect all rules
    const rules = {...output.sections, ...output.intermediates};

    const alterianParser = new AlterianParser();

    // Replace private variables
    Object.keys(output.yieldedVars).forEach(varName => {
        const yielded = output.yieldedVars[varName];

        if (yielded.name[0] == '_') {
            const expr = (yielded.default.__isYielded ? yielded.default.name : yielded.default) as string;

            // Poor man's method to check if it needs to be parsed
            // I'm not sure there's ever a case where an alterian expression doesn't start with '{'
            if (expr.length > 0 && expr[0] == '{') {
                const evaluated = alterianParser.parseString(expr).map(expr => expr.evaluate(runtime, values)).join('');
                
                htmlOutput = htmlOutput.replace(new RegExp(`{${yielded.name}}`, 'g'), evaluated);
            }
        }
    });


    /*
    We need to parse and evaluate Alterian methods (FormatDate etc).
    The problem is they do not behave like the rest of the language as their methods are
    actually part of the HTML text, and the objects they operate on are inside {}s and 
    are considered to be actual expressions. We can't evaluate these because then we can't
    evaluate the Alterian functions.

    Before we replace any yields with real values, we first parse the HTML and visit every node.
    If it's an HTML element (i.e. not an expression or a text element), we generate an 'innerText' of it.

    We can now attempt to parse this string using the Alterian parser. If it fails, we just
    return the actual node as-is, but if it succeeds, we evaluate the parsed expressions using
    the live values (so it actually runs FormatDate etc) and return a new element with the result in the
    place of the original node.
    */
    try {

        // Parse and visit each element
        const parser = new Parser();
        const parsed = parser.parseHTMLDoc("", htmlOutput, (node: HTMLExpr) => {

            //console.log(node.htmlType, (node.htmlType == HTMLExprType.Element) ? (node as any).tag : ( (node.htmlType == HTMLExprType.Text) ? (node as HTMLTextExpr).text : '' ));

            // We're only concerned with actual HTML elements, not text or dynamic or whatever
            // Otherwise just return the element as-is
            if (node.htmlType == HTMLExprType.Element) {
                const elem = node as HTMLElemExpr;

                try {

                    // Try to evaluate all the child elements and build
                    // an 'innerText' of the element
                    const innerText = elem.childNodes.map(child => {
                        const evaluated = child.evaluate(runtime, {});

                        if (evaluated === undefined) {
                            throw new Error();
                        }

                        return evaluated + '';
                    }).join('');

                    // Parse that innerText using the Alterian parser.
                    // If it fails it'll throw an error and we just return the node as-is

                    // We assume that it's not valid if it starts with <
                    if (innerText.length > 0 && innerText[0] != '<') {
                        const parsed = alterianParser.parseString(innerText);

                        /*
                        The innerText was successfully parsed, so we evaluate the results.
                        However, we only do this if we have more than one result.
                        Alterian expressions follow the form of {expr}.MethodName([args]), which will always
                        have at least two expressions: the {expr} and the MethodName

                        If we only have one expression, it might just be a normal variable that we want to replace
                        with a rule or private variable later
                        */
                        if (parsed.length > 1) {
                            const result = parsed.map(expr => expr.evaluate(runtime, values) + '').join('');

                            // Reset child nodes with the evaluated result
                            (node as HTMLElemExpr).childNodes = [new HTMLTextExpr(result)];
                            return node;
                        }
                    }
                } catch (e) {
                    return node;
                }
            }

            return node;
        });

        try {

            /*
            Now we've got a new HTML parse-tree of the document with all the Alterian
            functions evaluated, and now we need to join it all back into a string.

            We do this by evaluating the whole document (so the toString methods are created).
            However, in doing so it'll find and try to evaluate section variables and
            intermediates (_s1, _e1 etc), which it can't do. So we create a dummy object
            so these variables are replaced with themselves
            */
            const ruleIds = {};
            Object.keys(rules).forEach(ruleName => ruleIds[ruleName] = `{${ruleName}}`);

            const evaluated = parsed.evaluate(runtime, ruleIds);
            htmlOutput = evaluated + '';

        } catch (e) {
            //displayError(e);
        }
    } catch (e) {
        displayError(e);
    }


    // Replace provided settings variables
    Object.keys(values).forEach(varName => {
        htmlOutput = htmlOutput.replace(new RegExp(`{${varName}}`, 'g'), values[varName]);
    });

    // Evaluate rules and replace in text
    Object.keys(rules).forEach(ruleName => {
        if (htmlOutput.indexOf(`{${ruleName}}`) >= 0) {
            const evaluated = evaluateVarConfig(rules[ruleName], output, runtime, values);

            if (evaluated) {
                htmlOutput = htmlOutput.replace(new RegExp(`{${ruleName}}`, 'g'), evaluated);
            } else {
                htmlOutput = htmlOutput.replace(new RegExp(`{${ruleName}}`, 'g'), '');
            }
        }
    });

    return htmlOutput;
};