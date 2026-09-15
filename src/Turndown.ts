// --------------------------
// Copyright (c) Dom Christie
// --------------------------

import TurndownService from "turndown";
import { gfm } from "@truto/turndown-plugin-gfm"


export class Turndown {
	private readonly service: TurndownService;

	constructor(retainElementCbs: ((elementNode: Element) => boolean)[] = []) {
		const isRetained = (node: Node): boolean => {
			if(node.nodeType !== 1) return false;

			const elementNode: Element = node as Element;

			for(const retainElementCb of retainElementCbs) {
				if(retainElementCb(elementNode)) return true;
			}

			return false;
		};

		// Outermost retained elements at or below a node. Retained elements are not
		// descended into: each one is emitted whole.
		const collectRetained = (node: Node): Element[] => {
			if(isRetained(node)) return [ node as Element ];

			const found: Element[] = [];
			for(const child of Array.from(node.childNodes ?? [])) {
				found.push(...collectRetained(child));
			}

			return found;
		};

		this.service = new TurndownService({
			headingStyle: "atx",
			bulletListMarker: "-",
			codeBlockStyle: "fenced",

			// Turndown consults its blank rule before any custom rule, and its
			// "meaningful when blank" list holds no BUTTON, SELECT or TEXTAREA. A
			// control left without text — an icon button whose icon was lifted away —
			// was therefore discarded before the retain rule below could keep it, as
			// was every control inside a textless wrapper.
			blankReplacement: (_content: string, node: Node) => {
				const retained: Element[] = collectRetained(node);
				if(retained.length) {
					return retained
						.map((elementNode: Element) => elementNode.outerHTML)
						.join("");
				}

				return (node as Node & { isBlock?: boolean }).isBlock ? "\n\n" : "";
			}
		});

		this.service
			.addRule("retain", {
				filter: (node: Node) => isRetained(node),
				replacement: (_content: string, node: Node) => (node as Element).outerHTML
			});

		this.service.use(gfm);
	}

	public translate(html: string): string {
		return this.service
			.turndown(html)
			.trim();
	}
}