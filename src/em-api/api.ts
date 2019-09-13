import * as factory from './factory';
import chalk from 'chalk';

import { callAPI } from './core';
import { IRuntimeOutput } from '../lang/runtime';
import { ILookupTable, ILookupTables } from '../lang/remotevars';
import { logOutput, stopLog } from './uploadlogger';


// Uploads the output defined variables. Doesn't check for existing variables
const _uploadDefinedVariables = (campaignId: number, output: IRuntimeOutput, foundVars: factory.IVarInfo[], lookupTableIds: { [name: string]: number }, onComplete: (errors, responses)=>void) => {
    let varNames = Object.keys(output.yieldedVars);

    const errors = [];
    const responses = [];

    const createNext = ([head, ...tail]: string[], cb: (error, result)=>void, update: factory.IVarInfo = null) => {
        if (head) {
            //logOutput(chalk.gray((update !== null ? chalk.cyan("Update: ") : chalk.cyan("Create: ")) + head));
            logOutput((update ? chalk.cyanBright("Create: ") : chalk.cyan("Create: ")) + head);

            const lookup = output.yieldLookups[head];
            const lookupId = lookupTableIds[lookup];

            let request = update
                            ? factory.updateDefinedVariable(campaignId, update, output.yieldedVars[head], lookupId)
                            : factory.createDefinedVariable(campaignId, head, output.yieldedVars[head], lookupId);

            callAPI(request)
                .then(response => {
                    responses.push(response);
                    createNext(tail, cb);
                })
                .catch(error => {

                    let found = false;

                    // Check if it's one of the provided variables
                    foundVars.forEach(foundVar => {
                        if (error.Message == `a variable named "${foundVar.Name}" already exists.`) {

                            // Need to update variable
                            found = true;
                            createNext([head, ...tail], cb, foundVar);
                        }
                    });

                    if (!found) {
                        errors.push(error);
                        cb(error, null);
                    }
                });
        } else {
            onComplete(errors.length > 0 ? errors : null, responses);
        }
    };

    createNext(varNames, (e, r) => {});
};

// Uploads the output private variables. Doesn't check for existing variables. Ignores HTML etc
const _uploadPrivateOutputVariables = (campaignId: number, output: IRuntimeOutput, foundVars: factory.IVarInfo[], onComplete: (errors, responses)=>void) => {

    let privateVars = {...output.sections, ...output.intermediates};
    let varNames = Object.keys(privateVars);

    const errors = [];
    const responses = [];
    const createNext = ([head, ...tail]: string[], cb: (error, result)=>void, update: factory.IVarInfo = null) => {
        if (head) {

            /*if (head[0] == '{') {
                head = head.substr(1, head.length - 2);
            }*/
            //logOutput(chalk.gray((update !== null ? chalk.cyan("Update: ") : chalk.cyan("Create: ")) + head));
            logOutput((update ? chalk.cyanBright("Create: ") : chalk.cyan("Create: ")) + head);

            let request = update
                            ? factory.updatePrivateVariable(campaignId, update, privateVars[head])
                            : factory.createPrivateVariable(campaignId, head, privateVars[head]);

            callAPI(request)
                .then(response => {
                    responses.push(response);
                    createNext(tail, cb);
                })
                .catch(error => {

                    let found = false;

                    // Check if it's one of the provided variables
                    foundVars.forEach(foundVar => {
                        if (error.Message == `a variable named "${foundVar.Name}" already exists.`) {

                            // Need to update variable
                            found = true;
                            createNext([head, ...tail], cb, foundVar);
                        }
                    });

                    if (!found) {
                        errors.push(error);
                        cb(error, null);
                    }
                });

        } else {
            onComplete(errors.length > 0 ? errors : null, responses);
        }
    };

    createNext(varNames, (error, results) => {});
};


// Removes a set of variables
const _removeVariables = (campaignId: number, vars: factory.IVarInfo[], onComplete: (error, response)=>void) => {

    const deleteNext = ([head, ...tail]: factory.IVarInfo[], cb: (error, result)=>void) => {
        if (head) {
            logOutput(chalk.gray(chalk.red("Remove: ") + head.Name));
            callAPI(factory.deleteVariable(campaignId, head.ID))
                .then(res => {
                    deleteNext(tail, cb);
                })
                .catch(err => {
                    onComplete(err, null);
                });
        } else {
            onComplete(null, null);
        }
    };

    deleteNext(vars, (err, res) => {});
};

// Removes a list of lookup tables
const _removeLookupTables = (campaignId: number, lookupTables: any[], onComplete: (error, response)=>void) => {

    const deleteNext = ([head, ...tail]: any[], cb: (error, result)=>void) => {
        if (head) {
            logOutput(chalk.gray(chalk.red("Remove: ") + head.Name));

            callAPI(factory.deleteLookupTable(campaignId, head.ID))
                .then(res => {
                    deleteNext(tail, cb);
                })
                .catch(err => {
                    onComplete(err, null);
                });

        } else {
            onComplete(null, null);
        }
    };

    deleteNext(lookupTables, (err, res) => {});
};

// Upload lookup table
const _uploadLookupTable = (campaignId: number, name: string, table: ILookupTable, onComplete: (error, response)=>void) => {

    logOutput(chalk.gray(chalk.cyan("Upload: ") + name));

    // Begin save
    callAPI(factory.beginLookupTableSave(campaignId))
        .then(response => {
            const saveId = response.BeginNewLookupTableSaveResult;

            // Update columns
            callAPI(factory.queueLookupTableColumnUpdate(campaignId, saveId))
                .then(response => {

                    // Update records
                    callAPI(factory.queueLookupTableRecordAdditions(campaignId, table, saveId))
                        .then(response => {

                            // Update name
                            callAPI(factory.queueLookupTableNameUpdate(campaignId, name, saveId))
                                .then(response => {

                                    // Commit save
                                    callAPI(factory.commitLookupTableSave(campaignId, saveId))
                                        .then(response => {
                                            onComplete(null, response);
                                        })
                                        .catch(error => {
                                            onComplete(error, null);
                                        });

                                })
                                .catch(error => {
                                    onComplete(error, null);
                                });

                        })
                        .catch(error => {
                            onComplete(error, null);
                        });
                
                    

                })
                .catch(error => {
                    onComplete(error, null);
                });

        })
        .catch(error => {
            onComplete(error, null);
        });
};


// Uploads lookup tables
const _uploadLookupTables = (campaignId: number, lookupTables: ILookupTables, onComplete: (errors, responses)=>void) => {

    const tableNames = Object.keys(lookupTables);
    const responses = {};

    const createNext = ([head, ...tail]: string[], cb: (err, res)=>void) => {

        if (head) {

            _uploadLookupTable(campaignId, head, lookupTables[head], (err, res) => {
                if (err) {
                    //onComplete(err, null);
                    createNext(tail, cb);
                } else {
                    responses[head] = res.CommitLookupTableSaveResult;
                    createNext(tail, cb);
                }
            });

        } else {
            onComplete(null, responses);
        }
    };

    createNext(tableNames, (err, res) => {});
};


const saveHtml = (campaignId: number, creativeId: number, html: string, onComplete: (errors, responses)=>void) => {

    // Begin clearing html
    callAPI(factory.beginSave(campaignId))
        .then(saveResponse => {

            const saveId = saveResponse.BeginCampaignSaveResult;

            // Queue cleared html
            callAPI(factory.queueContentUpdate(campaignId, creativeId, saveId, html))
                .then(queueRes => {

                    // Save
                    callAPI(factory.commitSave(campaignId, saveId))
                        .then(commitRes => {
                            onComplete(null, commitRes);
                        })
                        .catch(error => {
                            onComplete(error, null);
                        });
                })
                .catch(error => {
                    onComplete(error, null);
                });
        })
        .catch(error => {
            onComplete(error, null);
        })
};

// Uploads the output of a compilation
export const uploadOutput = async(campaignId: number, token: string, output: IRuntimeOutput, onComplete: (errors, responses)=>void) => {

    try {

        factory.setToken(token);

        logOutput(chalk.cyan("Getting campaign data..."));
        const campaignData = await callAPI(factory.getCampaign(campaignId));

        // Collect campaign info
        const creativeId = campaignData.GetCampaignResult.Contains[0].ID;

        // First get all remote non-system variables
        logOutput(chalk.cyan("Getting remote variables..."));
        const rawVariables = await callAPI(factory.getCampaignVariables(campaignId));
        const remoteVariables = rawVariables.GetCampaignVariablesResult
            .filter(rawVar => rawVar.System == false)
            .map(rawVar => ({
                Name: rawVar.Name,
                ID: rawVar.ID
            }));

        // Get all remote variables that are no longer needed
        let privateVarsMap = {...output.sections, ...output.intermediates};
        let privateVars = Object.keys(privateVarsMap).map(varName => varName.substr(1, varName.length - 2));

        const removedRemoteVariables = remoteVariables
                                            .filter(remoteVar => privateVars.concat(Object.keys(output.yieldedVars)).indexOf(remoteVar.Name) < 0);

        // Get all lookup tables that are no longer needed
        logOutput(chalk.cyan("Getting remote lookup tables..."));
        const remoteLookupTablesRaw = await callAPI(factory.getCampaignLookupTables(campaignId));
        const remoteLookupTables = remoteLookupTablesRaw.GetCampaignLookupTablesResult
            .filter(table => !table.Shared)
            .map(table => ({
                ID: table.ID,
                Name: table.Name
            }));
        
        // Clear html
        logOutput(chalk.cyan("Clearing html..."));
        saveHtml(campaignId, creativeId, "", (errors, response) => {
            if (!errors) {

                // Remove unused remote variables
                logOutput(chalk.cyan("Removing unused variables..."));
                _removeVariables(campaignId, removedRemoteVariables, (error, response) => {
                    if (error) {
                        onComplete(error, null);
                    } else {

                        // Remove unused remote lookup tables
                        logOutput(chalk.cyan("Removing unused lookup tables..."));
                        _removeLookupTables(campaignId, remoteLookupTables, (error, response) => {
                            if (errors) {
                                onComplete(errors, null);
                            } else {

                                // Upload lookup tables
                                logOutput(chalk.cyan("Uploading lookup tables..."));
                                _uploadLookupTables(campaignId, output.lookupTables, (errors, responses) => {
                                    if (errors) {
                                        onComplete(errors, null);
                                    } else {

                                        const lookupTableIds = responses;

                                        // Upload defined variables
                                        logOutput(chalk.cyan("Uploading variables..."));
                                        _uploadDefinedVariables(campaignId, output, remoteVariables, lookupTableIds, (errors, responses) => {

                                            if (errors) {
                                                onComplete(errors, null);
                                            } else {

                                                // Upload private variables
                                                logOutput(chalk.cyan("Uploading sections..."));
                                                _uploadPrivateOutputVariables(campaignId, output, remoteVariables, (errors, responses) => {

                                                    if (errors) {
                                                        onComplete(errors, null);
                                                    } else {

                                                        // Save html
                                                        logOutput(chalk.cyan("Saving html..."));
                                                        saveHtml(campaignId, creativeId, output.output, (errors, responses) => {
                                                            stopLog();
                                                            onComplete(errors, responses);
                                                        });
                                                    }
                                                });

                                            }
                                        });
                                
                                    }
                                });

                            }
                        });

                    }
                });

            } else {
                onComplete(errors, null);
            }
        });
        

    } catch (error) {
        onComplete(error, null);
    }

};