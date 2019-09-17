import * as fs from 'fs';
import * as path from 'path';
import * as pretty from 'pretty';

import { RuntimeError, displayError, CompilerError } from './errors';
import { RootNode, ParseNode, ExprNode, FuncExpr, ImportNode, VarDeclStmt, StmtNode, StmtType } from './parsenodes';
import { Parser } from './parser';
import { IVarConfig, IRuleCondition, createRuleConditions, IVarRule } from './varconfig';
import { FuncClosure } from './closure';
import { IValues } from './values';
import { IntermediateRef, IYieldedVars, ILookupTable, ILookupTables, YieldVar } from './remotevars';

export const TEST_SETTINGS_NAME = "TestSettings";

export interface IScope {
    [name: string]: any;
}

export interface IRuntimeOutput {
    output: string;
    yieldedVars: IYieldedVars;
    lookupTables: ILookupTables;
    yieldLookups: { [name: string]: string };
    sections: { [name: string]: IVarConfig };
    intermediates: { [name: string]: IVarConfig };
    exports: { [name: string]: any };
    testCases: StmtNode[];

    typeDeclarations: string[];
}

export class Runtime {

    public yieldedVars: IValues = {};

    public static sections: { [name: string]: IVarConfig } = {};
    public static intermediates: { [name: string]: IVarConfig } = {};
    public static lookupTables: ILookupTables = {};
    public static yieldLookups: { [name: string]: string } = {};

    private static _sectionCount: number = 0;
    private static _intermediateCount: number = 0;
    private static _importCache = {};

    public static clearStaticData = () => {
        Runtime.sections = {};
        Runtime.intermediates = {};
        Runtime.lookupTables = {};
        Runtime.yieldLookups = {};
        Runtime._sectionCount = 0;
        Runtime._intermediateCount = 0;
        Runtime._importCache = {};
    };

    public shouldThrowOnYieldedLoad: boolean = false;
    public warningsSuppressed = false;

    private _variables: IYieldedVars = {};
    private _scope: IScope[] = [{}];
    private _consts: string[][] = [[]];
    private _exports: { [name: string]: any } = {};
    private _stack: FuncClosure[] = [];
    private _tests: StmtNode[] = [];

    constructor() {

        // Add built-in runtime variable
        this.getScope()["runtime"] = {
            renderingPdf: false,
            runningTests: false
        };
        this.setConst("runtime");

        /*
        Component to display current test settings

        Should return nothing in the general case.
        This function can be overridden when we want an output
        */
        this.registerFunction(TEST_SETTINGS_NAME, () => "");

    }

    run = (file: string): IRuntimeOutput => {

        const fileName = file.split('/').pop().split('.').slice(0, -1).join('.');
        const filePath = file.split('/').slice(0, -1).join('/');

        try {
            const parser = new Parser();

            // Update require path
            const curRequire = global["require"];
            (global as any).require = (moduleName) => {
                if (moduleName.length > 0 && moduleName[0] == '.')
                    return require(path.resolve(filePath, moduleName));

                return require(moduleName);
            };

            // Parse file
            const rootNode = parser.parseFile(file);

            // Handle imports
            this.handleImports(filePath, rootNode.imports);

            // Collect parsed members
            this.collectObjects(rootNode);

            // Evaluate all statements, add exports and type declarations
            const typeDeclarations: string[] = [];
            for (let statement of rootNode.statements) {
                statement.evaluate(this, {});

                // Add exports
                if (statement.isExported()) {
                    const varDecl = statement as VarDeclStmt;
                    this._exports[varDecl.name] = this.getScope()[varDecl.name];
                }

                // Add type declaration
                if (statement.stmtType == StmtType.VarDecl) {
                    const varDecl = statement as VarDeclStmt;

                    if (varDecl.docComment) {
                        typeDeclarations.push(varDecl.docComment.toTSDef(varDecl.name));
                    }
                }
            }

            // If we have a main function then run it and get returned value
            let mainOutput = '';
            if (this.getScope().main !== undefined) {
                mainOutput = pretty( this.getScope().main.evaluate(this, {}) + '' );
            }

            // Check for tests function
            if (this.getScope().tests !== undefined) {
                this._tests.push(...this.getScope().tests.funcExpr.body.statements);
            }

            // Reset require back to original
            global["require"] = curRequire;

            return {
                output: mainOutput,
                intermediates: Runtime.intermediates,
                sections: Runtime.sections,
                yieldedVars: this._variables,
                exports: this._exports,
                lookupTables: Runtime.lookupTables,
                yieldLookups: Runtime.yieldLookups,
                testCases: this._tests,
                typeDeclarations
            };

        } catch (e) {
            displayError(e);
        }
        
        return null;
    };

    onNotFound = (varName: string, parseNode: ParseNode) => {
        throw new RuntimeError(`Cannot find '${varName}'`, parseNode.startPosition, parseNode.endPosition);
    };

    pushStack = (func: FuncClosure) => {
        this._stack.push(func);
    };

    popStack = (): FuncClosure => {
        return this._stack.pop();
    };

    stackTop = (): FuncClosure => {
        if (this._stack.length == 0) return null;
        return this._stack[this._stack.length - 1];
    };

    pushScope = (scope: IScope = null) => {
        this._scope.push(scope || {});
        this._consts.push([]);
    };

    popScope = (): IScope => {
        this._consts.pop();
        return this._scope.pop();
    };

    getScope = (): IScope => {
        if (this._scope.length > 0) {
            return this._scope[this._scope.length - 1];
        }

        return null;
    };

    getFullScope = (): IScope => {
        const scope: IScope = {};

        this._scope.forEach(scp => {
            Object.keys(scp).forEach(sk => {
                scope[sk] = scp[sk];
            });
        });

        return scope;
    };

    getLocal = (varName: string): any => {
        for (let i = this._scope.length; i > 0; i--) {
            if (this._scope[i - 1][varName] !== undefined) {
                return this._scope[i - 1][varName];
            }
        }

        return undefined;
    };

    setLocal = (varName: string, value: any) => {
        for (let i = this._scope.length; i > 0; i--) {
            if (this._scope[i - 1][varName] !== undefined) {
                this._scope[i - 1][varName] = value;
            }
        }
    };

    setConst = (varName: string): void => {
        this._consts[this._consts.length - 1].push(varName);
    };

    isConst = (varName: string): boolean => {
        for (let i = this._consts.length; i > 0; i--) {
            if (this._consts[i - 1].indexOf(varName) >= 0)
                return true;
        }

        return false;
    };

    checkForYieldedLoad = (cb: ()=>any): any => {
        this.shouldThrowOnYieldedLoad = true;
        const returnValue = cb();
        this.shouldThrowOnYieldedLoad = false;

        return returnValue;
    };


    generateDynamicSection = (varConfig: IVarConfig): YieldVar => {
        const secName = `_s${++Runtime._sectionCount}`;
        Runtime.sections[secName] = varConfig;

        return new YieldVar(secName);
    };

    switchOnTestSettings = (output: string) => {
        this.registerFunction(TEST_SETTINGS_NAME, () => output);
    };

    generateIntermediateValue = (conditions: IRuleCondition[]): IntermediateRef => {
        const intName = `_e${++Runtime._intermediateCount}`;
        Runtime.intermediates[intName] = {
            default: '',
            rules: [
                {
                    conditions: conditions,
                    result: '1'
                }
            ]
        };

        return new IntermediateRef(intName);
    };

    generateIntermediateConditions = (currentConditions: IRuleCondition[], conditions: IRuleCondition[]) => {
        createRuleConditions(currentConditions, this.generateIntermediateValue(conditions).toString(), '1', '==');
    };

    private handlePluginLoad = (path: string, importNode: ImportNode, imported: any): string[] => {
        const registeredComponents: string[] = [];

        if (imported.registerPlugin) {
            let defFileOutput = `// Type definitions for '${importNode.file}' plugin\nimport * as React from 'react';\n\n`;

            this._onComponentRegistered = (name: string, params: { [name: string]: string }, func: (...args)=>any) => {
                let paramString = `{ ${Object.keys(params).map(param => { return `${param}: ${params[param]}`; }).join(', ')} }`;

                defFileOutput += `export const ${name}: React.FC<${paramString}>;\n`;
                registeredComponents.push(name);

                if (importNode.asName !== undefined) {
                    return true;
                }

                return importNode.members.indexOf(name) >= 0;
            };

            imported.registerPlugin(this);

            // Save type definitions type
            fs.writeFileSync(path + '.d.ts', defFileOutput, { encoding: "utf8" });
        }

        return registeredComponents;
    };

    private handleImports = (filePath: string, imports: ImportNode[]) => {

        imports.forEach(importNode => {
            let fullPath = path.resolve(filePath, importNode.file);

            // Check if it's a node_module
            if ( fs.existsSync('node_modules/' + importNode.file) ) {
                fullPath = path.resolve('node_modules', importNode.file);

                // Check for package.json
                if (fs.existsSync(fullPath + "/package.json")) {
                    const pckjson = JSON.parse(fs.readFileSync(fullPath + "/package.json", { encoding: "utf8" }));
                    if (pckjson.main) {
                        fullPath = path.join(fullPath, pckjson.main.split('.').slice(0, -1).join('.'));
                    }
                }
            }

            // If there is a javascript file
            // then look for plugin registration
            if ((fullPath.endsWith('.js') && fs.existsSync(fullPath)) || fs.existsSync(fullPath + '.js')) {

                const imported = require(fullPath.endsWith('.js') ? fullPath : (fullPath + '.js'));

                let registeredComponents = this.handlePluginLoad(fullPath, importNode, imported);

                // Import other members
                if (importNode.asName !== undefined) {
                    this.getScope()[importNode.asName] = {};
                    Object.keys(imported).forEach(memberName => {
                        this.getScope()[importNode.asName][memberName] = imported[memberName];
                    });
                } else if (importNode.members) {
                    importNode.members.forEach(memberName => {
                        if (imported[memberName] !== undefined) {
                            this.getScope()[memberName] = imported[memberName];
                        } else if (registeredComponents.indexOf(memberName) < 0) {
                            throw new RuntimeError(`Module '${importNode.file}' has no exported member '${memberName}'`, importNode.startPosition, importNode.endPosition);
                        }
                    });
                }

            }
            
            // Import other aml members
            else if ((fullPath.endsWith('.aml') && fs.existsSync(fullPath)) || fs.existsSync(fullPath + '.aml')) {

                let output: IRuntimeOutput = null;
                if (Runtime._importCache[fullPath] === undefined) {
                    output = (new Runtime()).run(fullPath.endsWith('.aml') ? fullPath : fullPath + '.aml');
                    Runtime._importCache[fullPath] = output;
                } else {
                    output = Runtime._importCache[fullPath];
                }

                // Update exported functions to use this runtime
                Object.keys(output.exports).forEach(exportName => {
                    if (output.exports[exportName].__isClosure) {
                        (output.exports[exportName] as FuncClosure).runtime = this;
                    }
                });

                // Add in exports
                if (importNode.asName !== undefined) {
                    this.getScope()[importNode.asName] = output.exports;
                } else if (importNode.members) {
                    importNode.members.forEach(memberName => {
                        if (output.exports[memberName] !== undefined) {
                            this.getScope()[memberName] = output.exports[memberName];
                        } else {
                            throw new RuntimeError(`Module '${importNode.file}' has no exported member '${memberName}'`, importNode.startPosition, importNode.endPosition);
                        }
                    });
                } else {
                    Object.keys(output.exports).forEach(memberName => {
                        this.getScope()[memberName] = output.exports[memberName];
                    });
                }

                // Import yielded variables
                this._variables = { ...this._variables, ...output.yieldedVars };
                this.yieldedVars = { ...this.yieldedVars, ...output.yieldedVars };

                // Import tests
                this._tests.push(...output.testCases);
            }
        });

    };

    private collectObjects = (rootNode: RootNode) => {

        const _this = this;

        // Built-in campaign variables
        this.yieldedVars["now"] = '';

        // First add regular yields        
        Object.keys(rootNode.yields).forEach(varName => {

            _this.yieldedVars[varName] = '';

            _this._variables[varName] = {
                default: this.yieldedVars[varName],
                name: varName,
                scope: varName[0] == '_' ? "private" : "public"
            };
        });


        // Next add lookup tables
        Object.keys(rootNode.lookups).forEach(varName => {
            const lookupTable = {};

            const lookupItemExprs = rootNode.lookups[varName].items;
            Object.keys(lookupItemExprs).forEach(key => {
                lookupTable[key] = lookupItemExprs[key].evaluate(_this, {});
            });

            Runtime.lookupTables[varName] = lookupTable;
        });


        // Next create config and connect yields to lookups
        Object.keys(rootNode.yields).forEach(varName => {
            if (rootNode.yields[varName].lookup) {
                const lookupTable = Runtime.lookupTables[rootNode.yields[varName].lookup];

                if (lookupTable === undefined) {
                    throw new CompilerError(`Cannot find lookup table '${rootNode.yields[varName].lookup}'`, rootNode.yields[varName].startPosition, rootNode.yields[varName].endPosition);
                }

                if (rootNode.yields[varName].value) {
                    const evaluated = rootNode.yields[varName].value.evaluate(_this, {});
                    if (lookupTable[evaluated] === undefined) {
                        throw new CompilerError(`Cannot find entry '${_this.yieldedVars[varName]}' in lookup table '${rootNode.yields[varName].lookup}'`,  rootNode.yields[varName].startPosition, rootNode.yields[varName].endPosition);
                    }
                }

                const varConfig = {
                    default: '',
                    rules: []
                } as IVarConfig;
    
                Object.keys(lookupTable).forEach(key => {
                    const conditions: IRuleCondition[] = [];
    
                    createRuleConditions(conditions, `{${varName}}`, key, '==');
    
                    varConfig.rules.push({
                        result: lookupTable[key] + '',
                        conditions
                    } as IVarRule);
                });

                const dynamicSection = _this.generateDynamicSection(varConfig);
                this.getScope()[varName] = dynamicSection;
                this.setConst(varName);
                this._exports[varName] = dynamicSection;
            }
        });

        // Reset regular yield values now so they can reference other yielded vars
        Object.keys(rootNode.yields).forEach(varName => {

            if (rootNode.yields[varName].value) {
                this.yieldedVars[varName] = rootNode.yields[varName].value.evaluate(this, {});
            } else {
                this.yieldedVars[varName] = '';
            }

            _this._variables[varName] = {
                default: this.yieldedVars[varName],
                name: varName,
                scope: varName[0] == '_' ? "private" : "public"
            };
        });

    };


    private _onComponentRegistered: (name, params: { [name: string]: string }, func: (...args)=>any)=>boolean;
    registerComponent = (name: string, params: { [name: string]: string}, func: (...args)=>any) => {
        if (this._onComponentRegistered) {
            if (this._onComponentRegistered(name, params, func)) {
                this.registerFunction(name, func);
            }
        } else {
            this.registerFunction(name, func);
        }
    };

    registerFunction = (name: string, func: (...args)=>any) => {
        const closure = new FuncClosure();
        closure.func = func;

        const dummyExpr = new FuncExpr();
        dummyExpr.params = this._getParamNames(func);
        closure.funcExpr = dummyExpr;

        this.getScope()[name] = closure;
    };

    private STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
    private ARGUMENT_NAMES = /([^\s,]+)/g;

    private _getParamNames = (func) => {
        const fnStr = func.toString().replace(this.STRIP_COMMENTS, '');
        const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(this.ARGUMENT_NAMES);
        if (result === null)
            return [];
        
        return result;
    }
}
