import { IAlterianRequest } from './core';
import { IVarConfig } from '../lang/varconfig';
import { IYieldedVar, ILookupTable } from '../lang/remotevars';
export interface IVarInfo {
    Name: string;
    ID: number;
}
export declare const setToken: (token: string) => void;
export declare const createRequestBase: (endpoint: string, campaignId: number, payload?: any) => IAlterianRequest;
export declare const createRequestBaseNoCampaignId: (endpoint: string, payload?: any) => IAlterianRequest;
export declare const getCampaign: (campaignId: number) => IAlterianRequest;
export declare const getCampaignVariables: (campaignId: number) => IAlterianRequest;
export declare const getCampaignLookupTables: (campaignId: number) => IAlterianRequest;
export declare const deleteVariable: (campaignId: number, variableId: number) => IAlterianRequest;
export declare const deleteLookupTable: (campaignId: number, lookupTableId: number) => IAlterianRequest;
export declare const beginLookupTableSave: (campaignId: number) => IAlterianRequest;
export declare const commitLookupTableSave: (campaignId: number, saveId: number) => IAlterianRequest;
export declare const queueLookupTableNameUpdate: (campaignId: number, name: string, saveId: number) => IAlterianRequest;
export declare const queueLookupTableColumnUpdate: (campaignId: number, saveId: number) => IAlterianRequest;
export declare const queueLookupTableRecordAdditions: (campaignId: number, lookupTable: ILookupTable, saveId: number) => IAlterianRequest;
export declare const createDefinedVariable: (campaignId: number, name: string, info: IYieldedVar, lookupId: number) => IAlterianRequest;
export declare const updateDefinedVariable: (campaignId: number, variable: IVarInfo, info: IYieldedVar, lookupId: number) => IAlterianRequest;
export declare const createPrivateVariable: (campaignId: number, name: string, varConfig: IVarConfig) => IAlterianRequest;
export declare const updatePrivateVariable: (campaignId: number, variable: IVarInfo, varConfig: IVarConfig) => IAlterianRequest;
export declare const beginSave: (campaignId: number) => IAlterianRequest;
export declare const commitSave: (campaignId: number, saveId: number) => IAlterianRequest;
export declare const queueContentUpdate: (campaignId: number, creativeId: number, saveId: number, html: string) => IAlterianRequest;
