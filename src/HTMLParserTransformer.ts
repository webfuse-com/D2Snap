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


// Key assumption:
// DOM is syntactically correct, which holds true for a browser-based DOM stringification
export class HTMLParserTransformer {
    private static singletonTagNames = [
        "AREA", "BASE", "BR", "COL", "COMMAND", "EMBED", "HR", "IMG", "INPUT", "KEYGEN", "LINK", "MENUITEM", "META", "PARAM", "SOURCE", "TRACK", "WBR"
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
    private ignoreDepth: number = 0;

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
                stack.push(elementNode);

                this.depth++;
            } else {
                await finalizeElement(elementNode, dom);
            }
        }

        return {
            dom,
            html: HTMLParserTransformer.outerHTML(dom)
        };
    }

    private skipIgnoredTag(tagName: string): void {
        let depth: number = 1;
        while(this.index < this.#html.length && depth > 0) {
            const openingIndex: number = this.#html.indexOf("<", this.index);
            if(openingIndex === -1) {
                this.index = this.#html.length;
                return;
            }

            this.index = openingIndex;

            if( this.#html.startsWith("<!--", this.index)) {
                const end = this.#html.indexOf("-->", this.index + 4);
                this.index = (end === -1 ? this.#html.length : end + 3);

                continue;
            }

            const htmlHead: string = this.#html
                .slice(this.index + 1, this.index + 1 + tagName.length + 1)
                .toUpperCase();

            let closingIndex: number;

            if(
                htmlHead.startsWith("/" + tagName)
                && (htmlHead.length === tagName.length + 1 || /[\s>]/.test(htmlHead[tagName.length + 1]))
            ) {
                depth--;

                closingIndex = this.#html.indexOf(">", this.index);
                this.index = (closingIndex === -1) ? this.#html.length : closingIndex + 1;

                continue;
            }

            if(
                htmlHead.startsWith(tagName)
                && (htmlHead.length === tagName.length || /[\s/>]/.test(htmlHead[tagName.length]))
            ) {
                depth++;

                closingIndex = this.#html.indexOf(">", this.index);
                this.index = (closingIndex === -1) ? this.#html.length : closingIndex + 1;

                continue;
            }

            closingIndex = this.#html.indexOf(">", this.index);
            this.index = (closingIndex === -1) ? this.#html.length : closingIndex + 1;
        }
    }

    private skipComment(): void {
        const end: number = this.#html!.indexOf("-->", this.index + 4);
        this.index = end === -1 ? this.#html.length : end + 3;
    }

    private parseTag(): { tagName: string; attributes: AttributeNode[]; selfClosing: boolean } {
        let i: number = this.index + 1;
        let tagName: string = "";
        while(i < this.#html.length && /[^\s/>]/.test(this.#html[i])) {
            tagName += this.#html[i++];
        }

        const attributes: AttributeNode[] = [];
        while(i < this.#html.length && this.#html[i] !== ">" && this.#html[i] !== "/") {
            while(/\s/.test(this.#html[i])) i++;

            if(this.#html[i] === ">" || this.#html[i] === "/") break;

            let attributeName: string = "";
            while(i < this.#html.length && /[^\s=/>]/.test(this.#html[i])) {
                attributeName += this.#html[i++];
            }
            while(/\s/.test(this.#html[i])) i++;

            let value: string = "";
            if(this.#html[i] === "=") {
                i++;
                while(/\s/.test(this.#html[i])) i++;

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

            attributes.push({
                type: NodeType.ATTRIBUTE,
                name: attributeName,
                value
            });
        }

        const endTagIndex: number = this.#html.indexOf(">", i);
        this.index = (endTagIndex === -1)
            ? this.#html.length
            : endTagIndex + 1;

        return {
            attributes,
            selfClosing: (this.#html[i] === "/"),
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