type Token =
    | { kind: "open"; tag: string; raw: string; selfClosing: boolean }
    | { kind: "close"; tag: string; raw: string }
    | { kind: "void"; tag: string; raw: string }
    | { kind: "text"; raw: string }
    | { kind: "comment"; raw: string }
    | { kind: "doctype"; raw: string }
    | { kind: "cdata"; raw: string }
    | { kind: "raw"; tag: string; openRaw: string; content: string; closeRaw: string };


const INLINE_TAG_NAMES: string[] = [
	"A", "ABBR", "B", "BDI", "BDO", "CITE", "CODE", "DATA", "DFN", "EM", "I", "KBD", "MARK", "Q", "RP", "RT", "RUBY", "S", "SAMP", "SMALL", "SPAN", "STRONG", "SUB", "SUP", "TIME", "U", "VAR", "WBR", "BR"
];
const RAW_TEXT_TAG_NAMES: string[] = [
	"SCRIPT", "STYLE", "TEXTAREA", "TITLE"
];
const VOID_TAG_NAMES: string[] = [
	"AREA", "BASE", "BR", "COL", "EMBED", "HR", "IMG", "INPUT", "LINK", "META", "SOURCE", "TRACK", "WBR"
];


function tokenize(html: string): Token[] {
	const tokens: Token[] = [];
	const n: number = html.length;

	let i: number = 0;
	while(i < n) {
		if(html[i] !== "<") {
			const start: number = i;

			while(i < n && html[i] !== "<") i++;

			const raw: string = html.slice(start, i);

			if(raw.trim()) tokens.push({
				kind: "text",
				raw
			});

			continue;
		}

		// Comment
		if(html.startsWith("<!--", i)) {
			const end: number = html.indexOf("-->", i + 4);
			const stop: number = (end < 0) ? n : end + 3;

			tokens.push({
				kind: "comment",
				raw: html.slice(i, stop)
			});

			i = stop;

			continue;
		}

		// Tag
		const tagStart: number = i;
		i++; // <

		const isClose = html[i] === "/";

		isClose && i++;

		let quote: string | null = null;
		while(i < n) {
			const c = html[i];

			if(quote) {
				if(c === quote) quote = null;

				i++;

				continue;
			}

			if(c === '"' || c === "'") {
				quote = c;

				i++;

				continue;
			}

			if(c === ">") break;

			i++;
		}

		if(i >= n) {
			// Unterminated tag
			tokens.push({
				kind: "text",
				raw: html.slice(tagStart)
			});

			break;
		}

		i++; // >

		const raw: string = html.slice(tagStart, i);
		const inner: string = raw.slice(isClose ? 2 : 1, raw.length - 1).trim();
		const selfClosing: boolean = inner.endsWith("/");
		const tagName: string = (inner.match(/^[a-zA-Z][\w:-]*/)?.[0] ?? "").toUpperCase();

		if(!tagName) {
			tokens.push({
				kind: "text",
				raw
			});

			continue;
		}

		if(isClose) {
			tokens.push({
				kind: "close",
				tag: tagName,
				raw
			});

			continue;
		}

		if(VOID_TAG_NAMES.includes(tagName) || selfClosing) {
			tokens.push({
				kind: "void",
				tag: tagName,
				raw
			});

			continue;
		}

		if(RAW_TEXT_TAG_NAMES.includes(tagName)) {
			const rest: string = html.slice(i);
			const m = rest.match(new RegExp(`</${tagName}\\s*>`, "i"));

			if(!m) {
				tokens.push({ kind: "raw", tag: tagName, openRaw: raw, content: rest, closeRaw: "" });

				i = n;

				continue;
			}

			const contentEnd: number = i + m.index!;
			const content: string = html.slice(i, contentEnd);
			const closeRaw: string = html.slice(contentEnd, contentEnd + m[0].length);

			tokens.push({
				kind: "raw",
				tag: tagName,
				openRaw: raw,
				content,
				closeRaw
			});

			i = contentEnd + m[0].length;

			continue;
		}

		tokens.push({ kind: "open", tag: tagName, raw, selfClosing: false });
	}

	return tokens;
}

export function formatHTML(html: string, indentSize: number = 2): string {
	const indent: string = " ".repeat(indentSize);
	const tokens: Token[] = tokenize(html);
	const lines: string[] = [];
	const stack: string[] = [];

	let buffer: string = "";
	let bufferDepth: number = 0;

	const flushBuffer = () => {
		const text: string = buffer.replace(/\s+/g, " ").trim();

		text
			&& lines.push(indent.repeat(bufferDepth) + text);

		buffer = "";
	};

	const emit = (line: string, depth: number) => {
		flushBuffer();

		lines.push(indent.repeat(depth) + line);
	}

	const isInline = (tag: string) => {
		return INLINE_TAG_NAMES.includes(tag) || VOID_TAG_NAMES.includes(tag);
	}

	for(const token of tokens) {
		switch(token.kind) {
			case "text":
				if(buffer === "") {
					bufferDepth = stack.length;
				}

				buffer += token.raw;

				break;
			case "comment":
			case "doctype":
			case "cdata":
				emit(token.raw, stack.length);

				break;
			case "void":
				if(isInline(token.tag)) {
					if(buffer === "") {
						bufferDepth = stack.length;
					}

					buffer += token.raw;
				} else {
					emit(token.raw, stack.length);
				}

				break;
			case "raw":
				// Verbatim
				emit(`${token.openRaw}${token.content}${token.closeRaw}`, stack.length);

				break;
			case "open":
				if(isInline(token.tag)) {
					if(buffer === "") {
						bufferDepth = stack.length;
					}

					buffer += token.raw;

					stack.push(token.tag);
				} else {
					flushBuffer();

					lines.push(indent.repeat(stack.length) + token.raw);
					stack.push(token.tag);
				}

				break;

			case "close":
				if(isInline(token.tag)) {
					buffer += token.raw;

					(stack[stack.length - 1] === token.tag)
						&& stack.pop();
				} else {
					while(stack.length && stack[stack.length - 1] !== token.tag) stack.pop();

					stack.length
						&& stack.pop();

					flushBuffer();

					lines.push(indent.repeat(stack.length) + token.raw);
				}

				break;
		}
	}

	flushBuffer();

	return lines.join("\n");
}