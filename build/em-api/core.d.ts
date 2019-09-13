export interface IAlterianRequest {
    endpoint: string;
    payload: any;
}
export declare const callAPI: (request: IAlterianRequest) => Promise<any>;
