export enum NodeType {
    ATTRIBUTE,
    ELEMENT,
    TEXT
}

type Node = {
    type: NodeType;
};

export type AttributeNode = Node & {
    name: string;
    value: string
};

export type ElementNode = Node & {
    attributes: AttributeNode[];
    children: DOM;
    depth: number;
    tagName: string;
    parentElement?: ElementNode;
};

export type TextNode = Node & {
    textContent: string;
};

type DOM = (ElementNode | TextNode)[];


export type TransformCallbacks = {
    onElement: (el: ElementNode) => (ElementNode | string | null) | Promise<(ElementNode | string | null)>;
    onText: (txt: TextNode) => (TextNode | null) | Promise<(TextNode | null)>;
};


export class HTMLParserTransformer {
    private static singletonTagNames = [
        "AREA", "BASE", "BR", "COL", "COMMAND", "EMBED", "HR", "IMG", "INPUT", "KEYGEN", "LINK", "MENUITEM", "META", "PARAM", "SOURCE", "TRACK", "WBR"
    ];

    private static rawTextTagNames = [
        "SCRIPT", "STYLE", "TEXTAREA", "TITLE"
    ];

    public static outerHTML(dom: DOM): string {
        type Frame = {
            node: ElementNode;
            childIndex: number
        };

        const buffer: string[] = [];
        const stack: Frame[] = [];

        let nodes: DOM = dom;
        let index: number = 0;

        while(true) {
            if(index >= nodes.length) {
                if(stack.length === 0) break;

                const frame: Frame = stack.pop() as Frame;
                const tagName: string = frame.node.tagName.toLowerCase();

                buffer.push(`</${tagName}>`);

                nodes = (stack.length > 0)
                    ? stack[stack.length - 1].node.children
                    : dom;
                index = frame.childIndex;

                continue;
            }

            const node: ElementNode | TextNode = nodes[index++];
            if(node === null) continue;

            if(node.type === NodeType.TEXT) {
                buffer.push(node.textContent);

                continue;
            }

            const tagName: string = node.tagName.toLowerCase();

            buffer.push(`<${tagName}`);

            for(let j: number = 0; j < node.attributes.length; j++) {
                const attr: AttributeNode = node.attributes[j];

                buffer.push(" ", attr.name);

                if(attr.value === "") continue;

                buffer.push(`="${attr.value.replace(/"/g, "&quot;")}"`);
            }

            buffer.push(">");

            if(HTMLParserTransformer.singletonTagNames.includes(tagName)) continue;

            if(node.children.length) {
                stack.push({
                    node,
                    childIndex: index
                });
                nodes = node.children;
                index = 0;
            } else {
                buffer.push(`</${tagName}>`);
            }
        }

        return buffer.join("");
    }

    private static async parseNode(html: string): Promise<ElementNode | TextNode | null> {
        const dom = (await new HTMLParserTransformer().parse(html)).dom;

        return dom[0] ?? null;
    }

    private readonly transformCallbacks: TransformCallbacks;
    private readonly skipTagNames: string[];

    private index: number = 0;
    private depth: number = 0;

    #html: string = "";

    constructor(transformCallbacks: Partial<TransformCallbacks> = {}, skipTagNames: string[] = []) {
        const idFn = <T>(o: T): T => o;

        this.transformCallbacks = {
            onElement: idFn,
            onText: idFn,
            ...transformCallbacks
        };
        this.skipTagNames = skipTagNames
            .map((tagName: string) => tagName.toUpperCase());
    }

    public async parse(html: string): Promise<{ dom: DOM; html: string; }> {
        this.#html = html;
        const len: number = html.length;
        const stack: ElementNode[] = [];
        const dom: DOM = [];

        const finalizeElement = async(elementNode: ElementNode, container: DOM): Promise<void> => {
            const result = await this.transformCallbacks.onElement(elementNode);
            const resultElement = typeof(result) === "string"
                ? await HTMLParserTransformer.parseNode(result)
                : result;

            if(resultElement === elementNode) return;

            const parent: ElementNode | undefined = elementNode.parentElement;
            const target: DOM = parent ? parent.children : container;
            const elementIndex: number = target.indexOf(elementNode);

            if(elementIndex === -1) return;

            if(resultElement === null) {
                target.splice(elementIndex, 1);
            } else {
                target[elementIndex] = resultElement;
            }
        };

        while(this.index < len) {
            if(this.#html[this.index] !== "<") {
                const text: string = this.readText();
                if(!text.trim().length) continue;

                const txtNode: TextNode = {
                    type: NodeType.TEXT,
                    textContent: text
                };

                let writeTxtNode = await this.transformCallbacks.onText(txtNode);
                if(!writeTxtNode) continue;

                if(stack.length > 0) {
                    stack[stack.length - 1].children.push(writeTxtNode);
                } else {
                    dom.push(writeTxtNode);
                }

                continue;
            }

            if(this.#html.startsWith("<!--", this.index)) {
                this.skipComment();

                continue;
            }

            if(this.#html.startsWith("<!", this.index)) {
                this.skipDoctype();

                continue;
            }

            const isClosingTag: boolean = (this.#html[this.index + 1] === "/");
            if(isClosingTag) {
                const closeTagEnd: number = this.#html.indexOf(">", this.index);
                if(closeTagEnd === -1) break;

                this.index = closeTagEnd + 1;
                this.depth--;

                const closedElementNode: ElementNode | undefined = stack.pop();
                if(!closedElementNode) continue;

                await finalizeElement(closedElementNode, dom);

                continue;
            }

            const { tagName: rawTagName, attributes, selfClosing } = this.parseTag();
            const tagName: string = rawTagName.toUpperCase();
            const isVoid: boolean = HTMLParserTransformer.singletonTagNames.includes(tagName);
            const isRaw: boolean = HTMLParserTransformer.rawTextTagNames.includes(tagName);

            if(this.skipTagNames.includes(tagName)) {
                if(!isVoid && !selfClosing) {
                    this.skipIgnoredTag(tagName);
                }

                continue;
            }

            const elementNode: ElementNode = {
                attributes,
                children: [],
                depth: this.depth,
                type: NodeType.ELEMENT,
                tagName: tagName
            };

            if(stack.length > 0) {
                const parentElement: ElementNode = stack[stack.length - 1];

                parentElement.children.push(elementNode);

                elementNode.parentElement = parentElement;
            } else {
                dom.push(elementNode);
            }

            if(!selfClosing && !isVoid) {
                if(isRaw) {
                    const rawText: string = this.readRawText(tagName);

                    if(rawText.length) {
                        const rawTxtNode: TextNode = {
                            type: NodeType.TEXT,
                            textContent: rawText
                        };

                        const writeTxtNode = await this.transformCallbacks.onText(rawTxtNode);
                        if(writeTxtNode) {
                            elementNode.children.push(writeTxtNode);
                        }
                    }

                    const closeTagEnd: number = this.#html.indexOf(">", this.index);
                    this.index = (closeTagEnd === -1) ? this.#html.length : closeTagEnd + 1;

                    await finalizeElement(elementNode, dom);
                } else {
                    stack.push(elementNode);

                    this.depth++;
                }
            } else {
                await finalizeElement(elementNode, dom);
            }
        }

        return {
            dom,
            html: HTMLParserTransformer.outerHTML(dom)
        };
    }

    private readRawText(tagName: string): string {
        const lower: string = this.#html.toLowerCase();
        const closeTag: string = `</${tagName.toLowerCase()}`;
        let i: number = this.index;

        while(i < this.#html.length) {
            const closeIndex: number = lower.indexOf(closeTag, i);
            if(closeIndex === -1) {
                const text: string = this.#html.slice(this.index, this.#html.length);
                this.index = this.#html.length;
                return text;
            }

            const afterClose: string = this.#html[closeIndex + closeTag.length];
            if(afterClose === ">" || afterClose === "/" || /\s/.test(afterClose)) {
                const text: string = this.#html.slice(this.index, closeIndex);
                this.index = closeIndex + closeTag.length;
                return text;
            }

            i = closeIndex + 1;
        }

        const text: string = this.#html.slice(this.index);
        this.index = this.#html.length;
        return text;
    }

    private skipIgnoredTag(tagName: string): void {
        let depth: number = 1;
        const lower: string = tagName.toLowerCase();

        while(this.index < this.#html.length && depth > 0) {
            if(HTMLParserTransformer.rawTextTagNames.includes(tagName)) {
                this.readRawText(tagName);
                const closeTagEnd: number = this.#html.indexOf(">", this.index);
                this.index = (closeTagEnd === -1) ? this.#html.length : closeTagEnd + 1;
                return;
            }

            const openingIndex: number = this.#html.indexOf("<", this.index);
            if(openingIndex === -1) {
                this.index = this.#html.length;
                return;
            }

            this.index = openingIndex;

            if(this.#html.startsWith("<!--", this.index)) {
                this.skipComment();

                continue;
            }

            if(this.#html.startsWith("<!", this.index)) {
                this.skipDoctype();

                continue;
            }

            const slice: string = this.#html.slice(this.index + 1, this.index + 1 + lower.length + 2).toLowerCase();

            if(
                slice.startsWith("/" + lower)
                && (slice.length <= lower.length + 1 || /[\s>]/.test(slice[lower.length + 1]))
            ) {
                depth--;

                if(depth === 0) return;

                const closingIndex: number = this.#html.indexOf(">", this.index);
                this.index = (closingIndex === -1) ? this.#html.length : closingIndex + 1;

                continue;
            }

            if(
                slice.startsWith(lower)
                && (slice.length <= lower.length || /[\s/>]/.test(slice[lower.length]))
            ) {
                depth++;

                const closingIndex: number = this.#html.indexOf(">", this.index);
                this.index = (closingIndex === -1) ? this.#html.length : closingIndex + 1;

                continue;
            }

            const closingIndex: number = this.#html.indexOf(">", this.index);
            this.index = (closingIndex === -1) ? this.#html.length : closingIndex + 1;
        }
    }

    private skipComment(): void {
        const end: number = this.#html!.indexOf("-->", this.index + 4);
        this.index = end === -1 ? this.#html.length : end + 3;
    }

    private skipDoctype(): void {
        const end: number = this.#html.indexOf(">", this.index);
        this.index = end === -1 ? this.#html.length : end + 1;
    }

    private parseTag(): { tagName: string; attributes: AttributeNode[]; selfClosing: boolean } {
        let i: number = this.index + 1;
        let tagName: string = "";
        while(i < this.#html.length && /[^\s/>]/.test(this.#html[i])) {
            tagName += this.#html[i++];
        }

        const attributes: AttributeNode[] = [];
        while(i < this.#html.length && this.#html[i] !== ">" && !(this.#html[i] === "/" && this.#html[i + 1] === ">")) {
            while(i < this.#html.length && /\s/.test(this.#html[i])) i++;

            if(this.#html[i] === ">" || (this.#html[i] === "/" && this.#html[i + 1] === ">")) break;

            let attributeName: string = "";
            while(i < this.#html.length && /[^\s=/>]/.test(this.#html[i])) {
                attributeName += this.#html[i++];
            }
            while(i < this.#html.length && /\s/.test(this.#html[i])) i++;

            let value: string = "";
            if(this.#html[i] === "=") {
                i++;
                while(i < this.#html.length && /\s/.test(this.#html[i])) i++;

                const quote: string = (this.#html[i] === "\"" || this.#html[i] === "'")
                    ? this.#html[i++]
                    : "";
                const startIndex: number = i;

                while(
                    (i < this.#html.length)
                    && (quote ? this.#html[i] !== quote : /[^\s>]/.test(this.#html[i]))
                ) i++;

                value = this.#html.slice(startIndex, i);

                i += +!!quote;
            }

            if(attributeName) {
                attributes.push({
                    type: NodeType.ATTRIBUTE,
                    name: attributeName,
                    value
                });
            }
        }

        const selfClosing: boolean = (this.#html[i] === "/" && this.#html[i + 1] === ">");
        const endTagIndex: number = this.#html.indexOf(">", i);
        this.index = (endTagIndex === -1)
            ? this.#html.length
            : endTagIndex + 1;

        return {
            attributes,
            selfClosing,
            tagName: tagName.toUpperCase()
        };
    }

    private readText(): string {
        const nextTagIndex: number = this.#html.indexOf("<", this.index);
        const endIndex: number = (nextTagIndex === -1)
            ? this.#html.length
            : nextTagIndex;
        const text: string = this.#html.slice(this.index, endIndex);

        this.index = endIndex;

        return text;
    }
}