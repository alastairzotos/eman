import { IAlterianRequest } from './core';
import { IRuleCondition, IVarConfig, IVarRule } from '../lang/varconfig';
import { IYieldedVar, ILookupTable } from '../lang/remotevars';


export interface IVarInfo {
    Name: string;
    ID: number;
}

const OPERATOR_LOOKUP = {
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

let __token: string;

export const setToken = (token: string) => {
    __token = token;
};

export const createRequestBase = (endpoint: string, campaignId: number, payload?: any): IAlterianRequest => {
    return {
        endpoint: endpoint,
        payload: {
            Token: __token,
            CampaignID: campaignId,
            ...payload
        }
    };
};

export const createRequestBaseNoCampaignId = (endpoint: string, payload?: any): IAlterianRequest => {
    return {
        endpoint: endpoint,
        payload: {
            Token: __token,
            ...payload
        }
    };
};

export const getCampaign = (campaignId: number): IAlterianRequest => {
    return createRequestBase("GetCampaign", campaignId);
};

export const getCampaignVariables = (campaignId: number): IAlterianRequest => {
    return createRequestBase("GetCampaignVariables", campaignId);
};

export const getCampaignLookupTables = (campaignId: number): IAlterianRequest => {
    return createRequestBase("GetCampaignLookupTables", campaignId);
};

export const deleteVariable = (campaignId: number, variableId: number): IAlterianRequest => {
    return createRequestBase("DeleteCampaignVariable", campaignId, {
        VariableID: variableId
    });
};

export const deleteLookupTable = (campaignId: number, lookupTableId: number): IAlterianRequest => {
    return createRequestBase("DeleteCampaignLookupTable", campaignId, {
        LookupID: lookupTableId
    })
};

export const beginLookupTableSave = (campaignId: number): IAlterianRequest => {
    return createRequestBase("BeginNewLookupTableSave", campaignId);
};

export const commitLookupTableSave = (campaignId: number, saveId: number): IAlterianRequest => {
    return createRequestBaseNoCampaignId("CommitLookupTableSave", {
        SaveContextID: saveId,
    });
};

export const queueLookupTableNameUpdate = (campaignId: number, name: string, saveId: number): IAlterianRequest => {
    return createRequestBase("QueueLookupTableMetadataUpdate", campaignId, {
        SaveContextID: saveId,
        Name: name,
        KeyName: "Key",
        Description: null
    });
};

export const queueLookupTableColumnUpdate = (campaignId: number, saveId: number): IAlterianRequest => {
    return createRequestBase("QueueLookupTableColumnAddition", campaignId, {
        SaveContextID: saveId,
        Columns: [
            {
                ID: -1,
                Name: "Value"
            }
        ]
    });
};

export const queueLookupTableRecordAdditions = (campaignId: number, lookupTable: ILookupTable, saveId: number): IAlterianRequest => {

    return createRequestBaseNoCampaignId("QueueLookupTableRecordAddition", {
        SaveContextID: saveId,
        LookupRecords: Object.keys(lookupTable).map(key => ({
            KeyValue: key,
            Values: [
                {
                    ColumnID: 1,
                    Value: lookupTable[key] + ''
                }
            ]
        }))
    });
};


export const createDefinedVariable = (campaignId: number, name: string, info: IYieldedVar, lookupId: number): IAlterianRequest => {
    let defValue = info.default;

    if (defValue === true) defValue = '1';
    else if (defValue === false) defValue = '0';
    else if (defValue === null) defValue = '';
    else defValue = defValue + '';

    const defaultValue = {
        ConditionalValues: [],
        Value: defValue,
    };

    return createRequestBase("CreateCampaignVariable", campaignId, {
        RowOrder: 0,
        VariableName: name,
        ParseName: `{${name}}`,

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

export const updateDefinedVariable = (campaignId: number, variable: IVarInfo, info: IYieldedVar, lookupId: number): IAlterianRequest => {
    let createVar = createDefinedVariable(campaignId, variable.Name, info, lookupId);

    createVar.endpoint = "UpdateCampaignVariable";
    createVar.payload.VariableID = variable.ID;

    return createVar;
};

export const createPrivateVariable = (campaignId: number, name: string, varConfig: IVarConfig): IAlterianRequest => {

    const defaultValue = {
        ConditionalValues: [],
        Value: '',
    };

    if (varConfig) {
        defaultValue.Value = varConfig.default;

        varConfig.rules.forEach(rule => {
            defaultValue.ConditionalValues.push({
                Conditions: rule.conditions.map(condition => {
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

    return createRequestBase("CreateCampaignVariable", campaignId, {
        RowOrder: 0,
        VariableName: name,
        ParseName: `{${name}}`,

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

export const updatePrivateVariable = (campaignId: number, variable: IVarInfo, varConfig: IVarConfig): IAlterianRequest => {
    let createVar = createPrivateVariable(campaignId, variable.Name, varConfig);

    createVar.endpoint = "UpdateCampaignVariable";
    createVar.payload.VariableID = variable.ID;

    return createVar;
};

export const beginSave = (campaignId: number): IAlterianRequest => {
    return createRequestBase("BeginCampaignSave", campaignId);
};

export const commitSave = (campaignId: number, saveId: number): IAlterianRequest => {
    return createRequestBase("CommitCampaignSave", campaignId, {
        CampaignSaveID: saveId
    });
};


export const queueContentUpdate = (campaignId: number, creativeId: number, saveId: number, html: string): IAlterianRequest => {
    return createRequestBase("QueueCampaignCreativeContentUpdate", campaignId, {
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