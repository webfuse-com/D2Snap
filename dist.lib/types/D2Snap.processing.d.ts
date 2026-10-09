import { type D2SnapOptions } from "./types.js";
interface DOMPreProcessingOptions {
    filter: Pick<D2SnapOptions["filter"], "attributes" | "dataURLs" | "elements" | "emptyElements">;
    normalize: Pick<D2SnapOptions["normalize"], "iconClasses" | "labelAttributes" | "svgToImg">;
}
interface DOMPostProcessingOptions {
    filter: Pick<D2SnapOptions["filter"], "emptyElements">;
    minify: boolean;
}
interface HTMLPostProcessingOptions {
    debug: boolean;
}
export declare function preProcessDOM(domRoot: Element, document: Document, options: DOMPreProcessingOptions, isActionableElement: (elementNode: Element) => boolean): void;
export declare function postProcessDOM(domRoot: Element, options: DOMPostProcessingOptions, isActionableElement: (elementNode: Element) => boolean): void;
export declare function postProcessHTML(html: string, options: Partial<HTMLPostProcessingOptions>): string;
export {};
