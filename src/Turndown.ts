// --------------------------
// Copyright (c) Dom Christie
// --------------------------

import TurndownService from "turndown";
import { gfm } from "@truto/turndown-plugin-gfm"


const _escape = TurndownService.prototype.escape.bind(null);
TurndownService.prototype.escape = s => _escape(s).replace(/</g, '&lt;');


export class Turndown {
	private readonly service: TurndownService;

	constructor(retainElementCbs: ((elementNode: Element) => boolean)[] = []) {
		this.service = new TurndownService({
			headingStyle: "atx",
			bulletListMarker: "-",
			codeBlockStyle: "fenced",
		});

		this.service
			.addRule("retain", {
				filter: (node: Node) => {
					if(node.nodeType !== 1) return false;

					const elementNode: Element = node as Element;

					for(const retainElementCb of retainElementCbs) {
						if(retainElementCb(elementNode)) return true;
					}

					return false;
				},
				replacement: (_content: string, node: Node) => (node as Element).outerHTML
			})
			.addRule("imageWithoutSrc", {
				filter: (node: HTMLElement) => {
					return (
						node.nodeName === "IMG"
						&& !(node.getAttribute("src") ?? "").trim()
					);
				},
				replacement: (_content: string, node: HTMLElement) => {
					const alt: string = (node.getAttribute("alt") ?? "").trim();

					return alt ? `![${alt}]()` : "";
				}
			});

		this.service.use(gfm);
	}

	public translate(html: string): string {
		return this.service
			.turndown(html)
			.trim();
	}
}