// --------------------------
// Copyright (c) Dom Christie
// --------------------------

import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm"


export class Turndown {
	private readonly service: TurndownService;

	constructor(keepTagNames: string[]) {
		this.service = new TurndownService({
			headingStyle: "atx",
			bulletListMarker: "-",
			codeBlockStyle: "fenced",
		});

		const normalizedKeepTagNames: Set<string> = new Set(keepTagNames.map(tag => tag.toLowerCase()));

		this.service
			.addRule("keep", {
				filter: (node: Node) => (
					(node.nodeType === 1)
					&& normalizedKeepTagNames.has((node as Element).tagName.toLowerCase())
				),
				replacement: (_content: string, node: Node) => (
					node.nodeType === 1
						? (node as Element).outerHTML
						: ""
				)
			});

		this.service.use(gfm);
	}

	public translate(html: string): string {
		return this.service
			.turndown(html)
			.trim();
	}
}