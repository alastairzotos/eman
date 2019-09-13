import { Runtime, IRuntimeOutput } from './lang/runtime';
import { TestResult } from './tools/unittester';
interface IAMLOptions {
    file: string;
    displayOutput?: boolean;
    displayFullOutput?: boolean;
    runTests?: boolean;
    runTestsQuiet?: boolean;
    generatePdf?: string;
    settings?: string;
    publish?: boolean;
    campaignId?: number;
    browserSync?: boolean;
    outputPath?: string;
    onRuntimeCreated?: (runtime: Runtime) => void;
    onOutput?: (output: IRuntimeOutput) => void;
    onTestsCompleted?: (results: TestResult) => void;
    onUploadCompleted?: (errors: any, responses: any) => void;
    onTestsGenerated?: (csv: string) => void;
    onPdfGenerated?: () => void;
}
export declare const startAML: (options: IAMLOptions) => void;
export {};
