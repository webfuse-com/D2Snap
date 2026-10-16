export interface SearchBracket {
    a: number;
    fa: number;
    b: number;
    fb: number;
}
export interface SearchITPOptions {
    epsilon: number;
    maxEvaluations: number;
    stop?: () => boolean;
    k1?: number;
    k2?: number;
    n0?: number;
}
export interface SearchITPResult extends SearchBracket {
    evaluations: number;
}
export declare function searchITP(f: (x: number) => number, bracket: SearchBracket, options: SearchITPOptions): SearchITPResult;
