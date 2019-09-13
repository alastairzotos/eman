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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var factory = require("./factory");
var chalk_1 = require("chalk");
var core_1 = require("./core");
var uploadlogger_1 = require("./uploadlogger");
// Uploads the output defined variables. Doesn't check for existing variables
var _uploadDefinedVariables = function (campaignId, output, foundVars, lookupTableIds, onComplete) {
    var varNames = Object.keys(output.yieldedVars);
    var errors = [];
    var responses = [];
    var createNext = function (_a, cb, update) {
        var head = _a[0], tail = _a.slice(1);
        if (update === void 0) { update = null; }
        if (head) {
            //logOutput(chalk.gray((update !== null ? chalk.cyan("Update: ") : chalk.cyan("Create: ")) + head));
            uploadlogger_1.logOutput((update ? chalk_1.default.cyanBright("Create: ") : chalk_1.default.cyan("Create: ")) + head);
            var lookup = output.yieldLookups[head];
            var lookupId = lookupTableIds[lookup];
            var request = update
                ? factory.updateDefinedVariable(campaignId, update, output.yieldedVars[head], lookupId)
                : factory.createDefinedVariable(campaignId, head, output.yieldedVars[head], lookupId);
            core_1.callAPI(request)
                .then(function (response) {
                responses.push(response);
                createNext(tail, cb);
            })
                .catch(function (error) {
                var found = false;
                // Check if it's one of the provided variables
                foundVars.forEach(function (foundVar) {
                    if (error.Message == "a variable named \"" + foundVar.Name + "\" already exists.") {
                        // Need to update variable
                        found = true;
                        createNext([head].concat(tail), cb, foundVar);
                    }
                });
                if (!found) {
                    errors.push(error);
                    cb(error, null);
                }
            });
        }
        else {
            onComplete(errors.length > 0 ? errors : null, responses);
        }
    };
    createNext(varNames, function (e, r) { });
};
// Uploads the output private variables. Doesn't check for existing variables. Ignores HTML etc
var _uploadPrivateOutputVariables = function (campaignId, output, foundVars, onComplete) {
    var privateVars = __assign({}, output.sections, output.intermediates);
    var varNames = Object.keys(privateVars);
    var errors = [];
    var responses = [];
    var createNext = function (_a, cb, update) {
        var head = _a[0], tail = _a.slice(1);
        if (update === void 0) { update = null; }
        if (head) {
            /*if (head[0] == '{') {
                head = head.substr(1, head.length - 2);
            }*/
            //logOutput(chalk.gray((update !== null ? chalk.cyan("Update: ") : chalk.cyan("Create: ")) + head));
            uploadlogger_1.logOutput((update ? chalk_1.default.cyanBright("Create: ") : chalk_1.default.cyan("Create: ")) + head);
            var request = update
                ? factory.updatePrivateVariable(campaignId, update, privateVars[head])
                : factory.createPrivateVariable(campaignId, head, privateVars[head]);
            core_1.callAPI(request)
                .then(function (response) {
                responses.push(response);
                createNext(tail, cb);
            })
                .catch(function (error) {
                var found = false;
                // Check if it's one of the provided variables
                foundVars.forEach(function (foundVar) {
                    if (error.Message == "a variable named \"" + foundVar.Name + "\" already exists.") {
                        // Need to update variable
                        found = true;
                        createNext([head].concat(tail), cb, foundVar);
                    }
                });
                if (!found) {
                    errors.push(error);
                    cb(error, null);
                }
            });
        }
        else {
            onComplete(errors.length > 0 ? errors : null, responses);
        }
    };
    createNext(varNames, function (error, results) { });
};
// Removes a set of variables
var _removeVariables = function (campaignId, vars, onComplete) {
    var deleteNext = function (_a, cb) {
        var head = _a[0], tail = _a.slice(1);
        if (head) {
            uploadlogger_1.logOutput(chalk_1.default.gray(chalk_1.default.red("Remove: ") + head.Name));
            core_1.callAPI(factory.deleteVariable(campaignId, head.ID))
                .then(function (res) {
                deleteNext(tail, cb);
            })
                .catch(function (err) {
                onComplete(err, null);
            });
        }
        else {
            onComplete(null, null);
        }
    };
    deleteNext(vars, function (err, res) { });
};
// Removes a list of lookup tables
var _removeLookupTables = function (campaignId, lookupTables, onComplete) {
    var deleteNext = function (_a, cb) {
        var head = _a[0], tail = _a.slice(1);
        if (head) {
            uploadlogger_1.logOutput(chalk_1.default.gray(chalk_1.default.red("Remove: ") + head.Name));
            core_1.callAPI(factory.deleteLookupTable(campaignId, head.ID))
                .then(function (res) {
                deleteNext(tail, cb);
            })
                .catch(function (err) {
                onComplete(err, null);
            });
        }
        else {
            onComplete(null, null);
        }
    };
    deleteNext(lookupTables, function (err, res) { });
};
// Upload lookup table
var _uploadLookupTable = function (campaignId, name, table, onComplete) {
    uploadlogger_1.logOutput(chalk_1.default.gray(chalk_1.default.cyan("Upload: ") + name));
    // Begin save
    core_1.callAPI(factory.beginLookupTableSave(campaignId))
        .then(function (response) {
        var saveId = response.BeginNewLookupTableSaveResult;
        // Update columns
        core_1.callAPI(factory.queueLookupTableColumnUpdate(campaignId, saveId))
            .then(function (response) {
            // Update records
            core_1.callAPI(factory.queueLookupTableRecordAdditions(campaignId, table, saveId))
                .then(function (response) {
                // Update name
                core_1.callAPI(factory.queueLookupTableNameUpdate(campaignId, name, saveId))
                    .then(function (response) {
                    // Commit save
                    core_1.callAPI(factory.commitLookupTableSave(campaignId, saveId))
                        .then(function (response) {
                        onComplete(null, response);
                    })
                        .catch(function (error) {
                        onComplete(error, null);
                    });
                })
                    .catch(function (error) {
                    onComplete(error, null);
                });
            })
                .catch(function (error) {
                onComplete(error, null);
            });
        })
            .catch(function (error) {
            onComplete(error, null);
        });
    })
        .catch(function (error) {
        onComplete(error, null);
    });
};
// Uploads lookup tables
var _uploadLookupTables = function (campaignId, lookupTables, onComplete) {
    var tableNames = Object.keys(lookupTables);
    var responses = {};
    var createNext = function (_a, cb) {
        var head = _a[0], tail = _a.slice(1);
        if (head) {
            _uploadLookupTable(campaignId, head, lookupTables[head], function (err, res) {
                if (err) {
                    //onComplete(err, null);
                    createNext(tail, cb);
                }
                else {
                    responses[head] = res.CommitLookupTableSaveResult;
                    createNext(tail, cb);
                }
            });
        }
        else {
            onComplete(null, responses);
        }
    };
    createNext(tableNames, function (err, res) { });
};
var saveHtml = function (campaignId, creativeId, html, onComplete) {
    // Begin clearing html
    core_1.callAPI(factory.beginSave(campaignId))
        .then(function (saveResponse) {
        var saveId = saveResponse.BeginCampaignSaveResult;
        // Queue cleared html
        core_1.callAPI(factory.queueContentUpdate(campaignId, creativeId, saveId, html))
            .then(function (queueRes) {
            // Save
            core_1.callAPI(factory.commitSave(campaignId, saveId))
                .then(function (commitRes) {
                onComplete(null, commitRes);
            })
                .catch(function (error) {
                onComplete(error, null);
            });
        })
            .catch(function (error) {
            onComplete(error, null);
        });
    })
        .catch(function (error) {
        onComplete(error, null);
    });
};
// Uploads the output of a compilation
exports.uploadOutput = function (campaignId, token, output, onComplete) { return __awaiter(_this, void 0, void 0, function () {
    var campaignData, creativeId_1, rawVariables, remoteVariables_1, privateVarsMap, privateVars_1, removedRemoteVariables_1, remoteLookupTablesRaw, remoteLookupTables_1, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                factory.setToken(token);
                uploadlogger_1.logOutput(chalk_1.default.cyan("Getting campaign data..."));
                return [4 /*yield*/, core_1.callAPI(factory.getCampaign(campaignId))];
            case 1:
                campaignData = _a.sent();
                creativeId_1 = campaignData.GetCampaignResult.Contains[0].ID;
                // First get all remote non-system variables
                uploadlogger_1.logOutput(chalk_1.default.cyan("Getting remote variables..."));
                return [4 /*yield*/, core_1.callAPI(factory.getCampaignVariables(campaignId))];
            case 2:
                rawVariables = _a.sent();
                remoteVariables_1 = rawVariables.GetCampaignVariablesResult
                    .filter(function (rawVar) { return rawVar.System == false; })
                    .map(function (rawVar) { return ({
                    Name: rawVar.Name,
                    ID: rawVar.ID
                }); });
                privateVarsMap = __assign({}, output.sections, output.intermediates);
                privateVars_1 = Object.keys(privateVarsMap).map(function (varName) { return varName.substr(1, varName.length - 2); });
                removedRemoteVariables_1 = remoteVariables_1
                    .filter(function (remoteVar) { return privateVars_1.concat(Object.keys(output.yieldedVars)).indexOf(remoteVar.Name) < 0; });
                // Get all lookup tables that are no longer needed
                uploadlogger_1.logOutput(chalk_1.default.cyan("Getting remote lookup tables..."));
                return [4 /*yield*/, core_1.callAPI(factory.getCampaignLookupTables(campaignId))];
            case 3:
                remoteLookupTablesRaw = _a.sent();
                remoteLookupTables_1 = remoteLookupTablesRaw.GetCampaignLookupTablesResult
                    .filter(function (table) { return !table.Shared; })
                    .map(function (table) { return ({
                    ID: table.ID,
                    Name: table.Name
                }); });
                // Clear html
                uploadlogger_1.logOutput(chalk_1.default.cyan("Clearing html..."));
                saveHtml(campaignId, creativeId_1, "", function (errors, response) {
                    if (!errors) {
                        // Remove unused remote variables
                        uploadlogger_1.logOutput(chalk_1.default.cyan("Removing unused variables..."));
                        _removeVariables(campaignId, removedRemoteVariables_1, function (error, response) {
                            if (error) {
                                onComplete(error, null);
                            }
                            else {
                                // Remove unused remote lookup tables
                                uploadlogger_1.logOutput(chalk_1.default.cyan("Removing unused lookup tables..."));
                                _removeLookupTables(campaignId, remoteLookupTables_1, function (error, response) {
                                    if (errors) {
                                        onComplete(errors, null);
                                    }
                                    else {
                                        // Upload lookup tables
                                        uploadlogger_1.logOutput(chalk_1.default.cyan("Uploading lookup tables..."));
                                        _uploadLookupTables(campaignId, output.lookupTables, function (errors, responses) {
                                            if (errors) {
                                                onComplete(errors, null);
                                            }
                                            else {
                                                var lookupTableIds = responses;
                                                // Upload defined variables
                                                uploadlogger_1.logOutput(chalk_1.default.cyan("Uploading variables..."));
                                                _uploadDefinedVariables(campaignId, output, remoteVariables_1, lookupTableIds, function (errors, responses) {
                                                    if (errors) {
                                                        onComplete(errors, null);
                                                    }
                                                    else {
                                                        // Upload private variables
                                                        uploadlogger_1.logOutput(chalk_1.default.cyan("Uploading sections..."));
                                                        _uploadPrivateOutputVariables(campaignId, output, remoteVariables_1, function (errors, responses) {
                                                            if (errors) {
                                                                onComplete(errors, null);
                                                            }
                                                            else {
                                                                // Save html
                                                                uploadlogger_1.logOutput(chalk_1.default.cyan("Saving html..."));
                                                                saveHtml(campaignId, creativeId_1, output.output, function (errors, responses) {
                                                                    uploadlogger_1.stopLog();
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
                    }
                    else {
                        onComplete(errors, null);
                    }
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                onComplete(error_1, null);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
//# sourceMappingURL=api.js.map