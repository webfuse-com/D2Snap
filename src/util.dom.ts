import { type DOM, NodeFilter, NodeType, TextNode } from "./types.js";
import { isInlineElement, isRawTextElement } from "./util.html.js";


export async function ensureDOM(domOrString: DOM | string): Promise<DOM> {
	if(typeof (domOrString) !== "string") return domOrString;

	if(typeof window !== "undefined") {
		return new DOMParser()
			.parseFromString(domOrString, "text/html");
	}

	try {
		const jsdom = await import("jsdom");

		const dom = new jsdom.JSDOM(domOrString);

		return (dom.window as unknown as { document: Document }).document;
	} catch (err) {
		if((err as { code: string; })?.code !== "ERR_MODULE_NOT_FOUND") throw err;

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
	while(doc) {
		if ("createTreeWalker" in doc) return doc;

		doc = doc?.parentNode;
	}

	return null;
}

export function resolveRoot(node: DOM): Element {
	return (node as Document)?.body ?? (node as Document)?.documentElement ?? node;
}

export function traverseDom<T>(
	root: Element,
	filter: number = NodeFilter.SHOW_ALL,
	cb: (node: T) => Node[] | void
) {
	const showElement: boolean = ((filter & NodeFilter.SHOW_ELEMENT) !== 0);
	const showText: boolean = ((filter & NodeFilter.SHOW_TEXT) !== 0);
	const showComment = ((filter & NodeFilter.SHOW_COMMENT) !== 0);

	// Pre-order DFS
	const stack: Node[] = [];
	for(let i = root.childNodes.length - 1; i >= 0; i--) {
		stack.push(root.childNodes[i]);
	}

	while(stack.length) {
		const node: Node = stack.pop()!;

		const children: Node[] = [ ...node.childNodes ];
		const childIndex = stack.length;
		const childCount = children.length;
		for(let i = children.length - 1; i >= 0; i--) {
			stack.push(children[i]);
		}

		const passes = (filter === NodeFilter.SHOW_ALL)
            || ((node.nodeType === NodeType.ELEMENT_NODE) && showElement)
            || ((node.nodeType === NodeType.TEXT_NODE) && showText)
            || ((node.nodeType === NodeType.COMMENT_NODE) && showComment);

		if(!passes) continue;

		const replacingNodes: Node[] | void = cb(node as T);

		if(!replacingNodes?.length) continue;

		// Swap the original (now-detached) children on the stack with the
		// replacement nodes. Insert reversed so the first replacement is at
		// the top of the stack and gets popped first.
		stack.splice(childIndex, childCount, ...[ ...replacingNodes ].reverse());
	}
}

export function minifyDOM(domRoot: Element): void {
	traverseDom<HTMLElement>(
		domRoot,
		NodeFilter.SHOW_TEXT,
		(textNode: TextNode) => {
			const parent = textNode.parentElement;
			if(!parent) return;

			if(isRawTextElement(parent.tagName.toLowerCase())) return;

			const value = textNode.nodeValue ?? "";
			if(!value) return;

			textNode.nodeValue = value.replace(/\s+/g, " ");
		}
	);

	traverseDom<HTMLElement>(
		domRoot,
		NodeFilter.SHOW_TEXT,
		(textNode: TextNode) => {
			const parent = textNode.parentElement;
			if(!parent) return;

			if(isRawTextElement(parent.tagName.toLowerCase())) return;

			let value = textNode.nodeValue ?? "";
			if(!value) {
				textNode.parentNode?.removeChild(textNode);

				return;
			}

			const previous = textNode.previousSibling;
			const next = textNode.nextSibling;
			const previousIsText = previous?.nodeType === NodeType.TEXT_NODE;
			const nextIsText = next?.nodeType === NodeType.TEXT_NODE;
			const previousIsElement = previous?.nodeType === NodeType.ELEMENT_NODE;
			const nextIsElement = next?.nodeType === NodeType.ELEMENT_NODE;
			const previousTag = previousIsElement
				? (previous as Element).tagName.toLowerCase()
				: "";
			const nextTag = nextIsElement
				? (next as Element).tagName.toLowerCase()
				: "";
			const previousIsBR = (previousIsElement && previousTag === "br");
			const nextIsBR = (nextIsElement && nextTag === "br");
			const previousIsInline = previousIsText ||
				(
					previousIsElement &&
					isInlineElement(previousTag)
				);
			const nextIsInline = nextIsText ||
				(
					nextIsElement &&
					isInlineElement(nextTag)
				);

			if(value.trim() === "") {
				if(
					previousIsInline &&
					nextIsInline &&
					!previousIsBR &&
					!nextIsBR
				) {
					if(previousIsText) {
						const previousText = previous as TextNode;

						previousText.nodeValue =
							(previousText.nodeValue ?? "").trimEnd();
					}

					if(nextIsText) {
						const nextText = next as TextNode;

						nextText.nodeValue =
							(nextText.nodeValue ?? "").trimStart();
					}

					textNode.nodeValue = " ";

					return;
				}

				textNode.parentNode?.removeChild(textNode);

				return;
			}

			if(previousIsBR) {
				value = value.trimStart();
			}

			if(nextIsBR) {
				value = value.trimEnd();
			}

			if(
				/^\s/.test(value) &&
				previousIsElement &&
				!previousIsInline
			) {
				value = value.trimStart();
			}

			if(/^\s/.test(value) && !previous) {
				value = value.trimStart();
			}

			if(
				/\s$/.test(value) &&
				nextIsElement &&
				!nextIsInline
			) {
				value = value.trimEnd();
			}

			if(/\s$/.test(value) && !next) {
				value = value.trimEnd();
			}

			textNode.nodeValue = value;
		}
	);

	traverseDom<HTMLElement>(
		domRoot,
		NodeFilter.SHOW_TEXT,
		(textNode: TextNode) => {
			if(textNode.nodeValue === "") {
				textNode.parentNode?.removeChild(textNode);
			}
		}
	);
}