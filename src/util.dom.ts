import { DOM } from "./types.js";


export async function ensureDOM(domOrString: DOM | string): Promise<DOM> {
    if(typeof(domOrString) !== "string") return domOrString;

    if (typeof window !== "undefined") {
        return new DOMParser()
            .parseFromString(domOrString, "text/html");
    }

    try {
        const jsdom = await import("jsdom");

        const dom = new jsdom.JSDOM(domOrString);

        return (dom.window as unknown as { document: Document }).document;
    } catch(err) {
        if((err as { code: string; })?.code !== "ERR_MODULE_NOT_FOUND") throw err;

        throw new ReferenceError("Install 'jsdom' to use D2Snap with a non-browser runtime");
    }
}

export function resolveDocument(dom: DOM): Document | null {
    let doc: Node | Document | null;
    try {
        let doc: Node | Document | null = (window ?? {}).document;
        if(doc) return doc as Document;
    } catch { /**/ }

    doc = dom;
    while(doc) {
        if("createTreeWalker" in doc) return doc as Document;

        doc = doc?.parentNode;
    }

    return null;
}

export function resolveRoot(node: DOM): Element {
    return (node as Document)?.body ?? (node as Document)?.documentElement ?? node;
}

export async function traverseDom<T>(
    doc: Document,
    root: Element,
    filter: number = NodeFilter.SHOW_ALL,
    cb: (node: T) => void
) {
    const resolvedDoc = resolveDocument(doc);
    if(!resolvedDoc) throw new Error("Could not resolve document");

    const walker = resolvedDoc.createTreeWalker(root, filter);

    const nodes: T[] = [];
    let node = walker.firstChild() as T;
    while(node) {
        nodes.push(node);

        node = walker.nextNode() as T;
    }
    while(nodes.length) {
        await cb(nodes.shift()!);
    }
}