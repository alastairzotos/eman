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
var OPERATOR_LOOKUP = {
    '==': 1,
    '!=': 2,
    '<': 3,
    '>': 4,
    'startsWith': 5,
    'notStartsWith': 6,
    'endsWith': 7,
    'notEndsWith': 8,
    'contains': 9,
    'notContains': 10
};
var __token;
exports.setToken = function (token) {
    __token = token;
};
exports.createRequestBase = function (endpoint, campaignId, payload) {
    return {
        endpoint: endpoint,
        payload: __assign({ Token: __token, CampaignID: campaignId }, payload)
    };
};
exports.createRequestBaseNoCampaignId = function (endpoint, payload) {
    return {
        endpoint: endpoint,
        payload: __assign({ Token: __token }, payload)
    };
};
exports.getCampaign = function (campaignId) {
    return exports.createRequestBase("GetCampaign", campaignId);
};
exports.getCampaignVariables = function (campaignId) {
    return exports.createRequestBase("GetCampaignVariables", campaignId);
};
exports.getCampaignLookupTables = function (campaignId) {
    return exports.createRequestBase("GetCampaignLookupTables", campaignId);
};
exports.deleteVariable = function (campaignId, variableId) {
    return exports.createRequestBase("DeleteCampaignVariable", campaignId, {
        VariableID: variableId
    });
};
exports.deleteLookupTable = function (campaignId, lookupTableId) {
    return exports.createRequestBase("DeleteCampaignLookupTable", campaignId, {
        LookupID: lookupTableId
    });
};
exports.beginLookupTableSave = function (campaignId) {
    return exports.createRequestBase("BeginNewLookupTableSave", campaignId);
};
exports.commitLookupTableSave = function (campaignId, saveId) {
    return exports.createRequestBaseNoCampaignId("CommitLookupTableSave", {
        SaveContextID: saveId,
    });
};
exports.queueLookupTableNameUpdate = function (campaignId, name, saveId) {
    return exports.createRequestBase("QueueLookupTableMetadataUpdate", campaignId, {
        SaveContextID: saveId,
        Name: name,
        KeyName: "Key",
        Description: null
    });
};
exports.queueLookupTableColumnUpdate = function (campaignId, saveId) {
    return exports.createRequestBase("QueueLookupTableColumnAddition", campaignId, {
        SaveContextID: saveId,
        Columns: [
            {
                ID: -1,
                Name: "Value"
            }
        ]
    });
};
exports.queueLookupTableRecordAdditions = function (campaignId, lookupTable, saveId) {
    return exports.createRequestBaseNoCampaignId("QueueLookupTableRecordAddition", {
        SaveContextID: saveId,
        LookupRecords: Object.keys(lookupTable).map(function (key) { return ({
            KeyValue: key,
            Values: [
                {
                    ColumnID: 1,
                    Value: lookupTable[key] + ''
                }
            ]
        }); })
    });
};
exports.createDefinedVariable = function (campaignId, name, info, lookupId) {
    var defValue = info.default;
    if (defValue === true)
        defValue = '1';
    else if (defValue === false)
        defValue = '0';
    else if (defValue === null)
        defValue = '';
    else
        defValue = defValue + '';
    var defaultValue = {
        ConditionalValues: [],
        Value: defValue,
    };
    return exports.createRequestBase("CreateCampaignVariable", campaignId, {
        RowOrder: 0,
        VariableName: name,
        ParseName: "{" + name + "}",
        VariableType: 7,
        DefaultValue: defaultValue,
        LookupID: lookupId ? lookupId : 0,
        LookupResult: lookupId ? 1 : 0,
        LookupCombo: 0,
        SampleValue: "",
        UseDefaultForSample: true,
        ForceMap: true,
        DefaultField: 0,
        Required: false,
        Hidden: info.scope === "private",
        Readonly: false,
        Shared: false,
        Description: ""
    });
};
exports.updateDefinedVariable = function (campaignId, variable, info, lookupId) {
    var createVar = exports.createDefinedVariable(campaignId, variable.Name, info, lookupId);
    createVar.endpoint = "UpdateCampaignVariable";
    createVar.payload.VariableID = variable.ID;
    return createVar;
};
exports.createPrivateVariable = function (campaignId, name, varConfig) {
    var defaultValue = {
        ConditionalValues: [],
        Value: '',
    };
    if (varConfig) {
        defaultValue.Value = varConfig.default;
        varConfig.rules.forEach(function (rule) {
            defaultValue.ConditionalValues.push({
                Conditions: rule.conditions.map(function (condition) {
                    return {
                        __type: 'DMCondition:#DMLibrary',
                        Operator: OPERATOR_LOOKUP[condition.operation],
                        Operand1: condition.left,
                        Operand2: condition.right,
                        Combine: condition.type == "&&" ? 2 : 3
                    };
                }),
                Value: rule.result
            });
        });
    }
    return exports.createRequestBase("CreateCampaignVariable", campaignId, {
        RowOrder: 0,
        VariableName: name,
        ParseName: "{" + name + "}",
        VariableType: 7,
        DefaultValue: defaultValue,
        LookupID: 0,
        LookupResult: 0,
        LookupCombo: 0,
        SampleValue: "",
        UseDefaultForSample: true,
        ForceMap: true,
        DefaultField: 0,
        Required: false,
        Hidden: true,
        Readonly: true,
        Shared: false,
        Description: ""
    });
};
exports.updatePrivateVariable = function (campaignId, variable, varConfig) {
    var createVar = exports.createPrivateVariable(campaignId, variable.Name, varConfig);
    createVar.endpoint = "UpdateCampaignVariable";
    createVar.payload.VariableID = variable.ID;
    return createVar;
};
exports.beginSave = function (campaignId) {
    return exports.createRequestBase("BeginCampaignSave", campaignId);
};
exports.commitSave = function (campaignId, saveId) {
    return exports.createRequestBase("CommitCampaignSave", campaignId, {
        CampaignSaveID: saveId
    });
};
exports.queueContentUpdate = function (campaignId, creativeId, saveId, html) {
    return exports.createRequestBase("QueueCampaignCreativeContentUpdate", campaignId, {
        CampaignSaveID: saveId,
        EMCreativeID: creativeId,
        InsertUnsubText: false,
        InsertMsgOpenAndAttachments: false,
        Content: {
            Content: html,
            Encoding: "iso-8859-1",
            Type: 0,
            SnippetOn: false
        }
    });
};
//# sourceMappingURL=factory.js.map