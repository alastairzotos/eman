import { IRuntimeOutput } from '../lang/runtime';
export declare const uploadOutput: (campaignId: number, token: string, output: IRuntimeOutput, onComplete: (errors: any, responses: any) => void) => Promise<void>;
