import { DOM } from "./types.js";
export declare function ensureDOM(domOrString: DOM | string): Promise<DOM>;
export declare function resolveDocument(dom: DOM): Document | null;
export declare function resolveRoot(node: DOM): Element;
export declare function traverseDom<T>(doc: Document, root: Element, filter: number | undefined, cb: (node: T) => void): Promise<void>;
