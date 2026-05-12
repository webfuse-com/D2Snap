import { type DOM, NodeFilter, Node as NodeType } from "./types.js";


export async function ensureDOM(domOrString: DOM | string): Promise<DOM> {
	if (typeof (domOrString) !== "string") return domOrString;

	if (typeof window !== "undefined") {
		return new DOMParser()
			.parseFromString(domOrString, "text/html");
	}

	try {
		const jsdom = await import("jsdom");

		const dom = new jsdom.JSDOM(domOrString);

		return (dom.window as unknown as { document: Document }).document;
	} catch (err) {
		if ((err as { code: string; })?.code !== "ERR_MODULE_NOT_FOUND") throw err;

		throw new ReferenceError("Install 'jsdom' to use D2Snap with a non-browser runtime");
	}
}

export function resolveDocument(dom: DOM): Document | null {
	let doc: Node | Document | null;
	try {
		const doc: Node | Document | null = (window ?? {}).document;
		if (doc) return doc as Document;
	} catch { /**/ }

	doc = dom;
	while (doc) {
		if ("createTreeWalker" in doc) return doc;

		doc = doc?.parentNode;
	}

	return null;
}

export function resolveRoot(node: DOM): Element {
	return (node as Document)?.body ?? (node as Document)?.documentElement ?? node;
}

export async function traverseDom<T>(
	root: Element,
	filter: number = NodeFilter.SHOW_ALL,
	cb: (node: T) => unknown
) {
	const showElement: boolean = ((filter & NodeFilter.SHOW_ELEMENT) !== 0);
	const showText: boolean = ((filter & NodeFilter.SHOW_TEXT) !== 0);
	const showComment = ((filter & NodeFilter.SHOW_COMMENT) !== 0);

	const nodes: Node[] = [];

	// Pre-order DFS
	const stack: Node[] = [];
	for (let i = root.childNodes.length - 1; i >= 0; i--) {
		stack.push(root.childNodes[i]);
	}

	while (stack.length) {
		const node: Node = stack.pop()!;

		const passes = (filter === NodeFilter.SHOW_ALL)
			|| ((node.nodeType === NodeType.ELEMENT_NODE) && showElement)
			|| ((node.nodeType === NodeType.TEXT_NODE) && showText)
			|| ((node.nodeType === NodeType.COMMENT_NODE) && showComment);

		passes
			&& nodes.push(node);

		const children = node.childNodes;
		for (let i = children.length - 1; i >= 0; i--) {
			stack.push(children[i]);
		}
	}

	while (nodes.length) {
		await cb(nodes.shift()! as T);
	}
}