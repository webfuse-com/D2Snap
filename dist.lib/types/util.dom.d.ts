import type { DOM } from "./types.js";
export declare function ensureDOM(domOrStringOrBuffer: DOM | string | Buffer): Promise<DOM>;
export declare function resolveDocument(dom: DOM): Document | null;
export declare function resolveRoot(node: DOM): Element;
export declare function traverseDom<T>(root: Element, filter: number | undefined, cb: (node: T) => Node[] | void): void;
export declare function minifyDOM(domRoot: Element): void;
