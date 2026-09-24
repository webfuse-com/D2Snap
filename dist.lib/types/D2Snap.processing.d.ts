interface DOMPreProcessingOptions {
    filter: Partial<{
        dataURLs: boolean;
        tagNames: string[];
    }>;
    labelToText: Partial<{
        iconFonts: boolean;
        tagNames: string[];
    }>;
    uniqueIDs: boolean;
}
interface DOMPostProcessingOptions {
    filter: Partial<{
        emptyElements: boolean;
    }>;
}
interface HTMLPostProcessingOptions {
    debug: boolean;
    minify: boolean;
}
export declare function preProcessDOM(domRoot: Element, document: Document, options: Partial<DOMPreProcessingOptions>): void;
export declare function postProcessDOM(domRoot: Element, options: Partial<DOMPostProcessingOptions>, isActionableElement: (elementNode: Element) => boolean): void;
export declare function postProcessHTML(html: string, options: Partial<HTMLPostProcessingOptions>): string;
export {};
