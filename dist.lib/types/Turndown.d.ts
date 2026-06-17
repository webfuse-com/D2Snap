export declare class Turndown {
    private readonly service;
    constructor(retainElementCbs?: ((elementNode: Element) => boolean)[]);
    translate(html: string): string;
}
