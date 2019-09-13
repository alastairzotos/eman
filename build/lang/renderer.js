"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var varconfig_1 = require("./varconfig");
var alterianparser_1 = require("./alterianparser");
var parser_1 = require("./parser");
var parsenodes_1 = require("./parsenodes");
var errors_1 = require("./errors");
exports.renderOutput = function (text, output, runtime, values) {
    // Wrap in fragment to parse multiple top-level elements
    var htmlOutput = "<>" + text + "</>";
    // Collect all rules
    var rules = __assign({}, output.sections, output.intermediates);
    var alterianParser = new alterianparser_1.AlterianParser();
    // Replace private variables
    Object.keys(output.yieldedVars).forEach(function (varName) {
        var yielded = output.yieldedVars[varName];
        if (yielded.name[0] == '_') {
            var expr = (yielded.default.__isYielded ? yielded.default.name : yielded.default);
            // Poor man's method to check if it needs to be parsed
            // I'm not sure there's ever a case where an alterian expression doesn't start with '{'
            if (expr.length > 0 && expr[0] == '{') {
                var evaluated = alterianParser.parseString(expr).map(function (expr) { return expr.evaluate(runtime, values); }).join('');
                htmlOutput = htmlOutput.replace(new RegExp("{" + yielded.name + "}", 'g'), evaluated);
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
        var parser = new parser_1.Parser();
        var parsed = parser.parseHTMLDoc("", htmlOutput, function (node) {
            //console.log(node.htmlType, (node.htmlType == HTMLExprType.Element) ? (node as any).tag : ( (node.htmlType == HTMLExprType.Text) ? (node as HTMLTextExpr).text : '' ));
            // We're only concerned with actual HTML elements, not text or dynamic or whatever
            // Otherwise just return the element as-is
            if (node.htmlType == parsenodes_1.HTMLExprType.Element) {
                var elem = node;
                try {
                    // Try to evaluate all the child elements and build
                    // an 'innerText' of the element
                    var innerText = elem.childNodes.map(function (child) {
                        var evaluated = child.evaluate(runtime, {});
                        if (evaluated === undefined) {
                            throw new Error();
                        }
                        return evaluated + '';
                    }).join('');
                    // Parse that innerText using the Alterian parser.
                    // If it fails it'll throw an error and we just return the node as-is
                    // We assume that it's not valid if it starts with <
                    if (innerText.length > 0 && innerText[0] != '<') {
                        var parsed_1 = alterianParser.parseString(innerText);
                        /*
                        The innerText was successfully parsed, so we evaluate the results.
                        However, we only do this if we have more than one result.
                        Alterian expressions follow the form of {expr}.MethodName([args]), which will always
                        have at least two expressions: the {expr} and the MethodName

                        If we only have one expression, it might just be a normal variable that we want to replace
                        with a rule or private variable later
                        */
                        if (parsed_1.length > 1) {
                            var result = parsed_1.map(function (expr) { return expr.evaluate(runtime, values) + ''; }).join('');
                            // Reset child nodes with the evaluated result
                            node.childNodes = [new parsenodes_1.HTMLTextExpr(result)];
                            return node;
                        }
                    }
                }
                catch (e) {
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
            var ruleIds_1 = {};
            Object.keys(rules).forEach(function (ruleName) { return ruleIds_1[ruleName] = "{" + ruleName + "}"; });
            var evaluated = parsed.evaluate(runtime, ruleIds_1);
            htmlOutput = evaluated + '';
        }
        catch (e) {
            //displayError(e);
        }
    }
    catch (e) {
        errors_1.displayError(e);
    }
    // Replace provided settings variables
    Object.keys(values).forEach(function (varName) {
        htmlOutput = htmlOutput.replace(new RegExp("{" + varName + "}", 'g'), values[varName]);
    });
    // Evaluate rules and replace in text
    Object.keys(rules).forEach(function (ruleName) {
        if (htmlOutput.indexOf("{" + ruleName + "}") >= 0) {
            var evaluated = varconfig_1.evaluateVarConfig(rules[ruleName], output, runtime, values);
            if (evaluated) {
                htmlOutput = htmlOutput.replace(new RegExp("{" + ruleName + "}", 'g'), evaluated);
            }
            else {
                htmlOutput = htmlOutput.replace(new RegExp("{" + ruleName + "}", 'g'), '');
            }
        }
    });
    return htmlOutput;
};
//# sourceMappingURL=renderer.js.map