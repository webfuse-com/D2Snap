// src/util.ts
function resolveDocument(dom) {
  let doc;
  try {
    let doc2 = (window ?? {}).document;
    if (doc2) return doc2;
  } catch {
  }
  doc = dom;
  while (doc) {
    if (!!doc["createTreeWalker"]) return doc;
    doc = doc?.parentNode;
  }
  return null;
}
function resolveRoot(dom) {
  return dom["outerHTML"] ? dom : dom?.documentElement;
}
async function traverseDom(doc, root, filter = NodeFilter.SHOW_ALL, cb) {
  doc = resolveDocument(doc);
  const walker = doc.createTreeWalker(root, filter);
  const nodes = [];
  let node = walker.firstChild();
  while (node) {
    nodes.push(node);
    node = walker.nextNode();
  }
  while (nodes.length) {
    await cb(nodes.shift());
  }
}
function formatHtml(html, indentSize = 2) {
  const tokens = html.replace(/>\s+</g, "><").trim().split(/(<[^>]+>)/).filter((token) => token.trim().length);
  const indentChar = " ".repeat(indentSize);
  let indentLevel = 0;
  const formattedHtml = [];
  for (const token of tokens) {
    if (token.match(/^<\/\w/)) {
      indentLevel = Math.max(indentLevel - 1, 0);
      formattedHtml.push(indentChar.repeat(indentLevel) + token);
      continue;
    }
    if (token.match(/^<\w[^>]*[^\/]>$/)) {
      formattedHtml.push(indentChar.repeat(indentLevel) + token);
      indentLevel++;
      continue;
    }
    if (token.match(/^<[^>]+\/>$/)) {
      formattedHtml.push(indentChar.repeat(indentLevel) + token);
      continue;
    }
    if (token.match(/^<[^!]/)) {
      formattedHtml.push(indentChar.repeat(indentLevel) + token);
      continue;
    }
    formattedHtml.push(indentChar.repeat(indentLevel) + token.trim());
  }
  return formattedHtml.join("\n").trim();
}

// src/ground-truth.json
var ground_truth_default = {
  typeElement: {
    container: {
      tagNames: [
        "article",
        "aside",
        "body",
        "div",
        "footer",
        "header",
        "html",
        "iframe",
        "main",
        "nav",
        "section"
      ],
      semantics: {
        article: 0.95,
        aside: 0.85,
        body: 0.9,
        div: 0.3,
        footer: 0.7,
        header: 0.75,
        html: 0.1,
        iframe: 0.5,
        main: 0.85,
        nav: 0.8,
        section: 0.9
      }
    },
    interactive: {
      tagNames: [
        "a",
        "button",
        "details",
        "form",
        "input",
        "label",
        "select",
        "summary",
        "textarea"
      ]
    },
    content: {
      tagNames: [
        "address",
        "blockquote",
        "b",
        "code",
        "em",
        "figure",
        "figcaption",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "hr",
        "img",
        "li",
        "ol",
        "p",
        "pre",
        "small",
        "span",
        "strong",
        "sub",
        "sup",
        "table",
        "tbody",
        "td",
        "thead",
        "th",
        "tr",
        "ul"
      ],
      skipTagNames: [
        "li",
        "tbody",
        "td",
        "thead",
        "tr"
      ]
    }
  },
  typeAttribute: {
    semantics: {
      alt: 0.9,
      href: 0.9,
      src: 0.8,
      id: 0.8,
      class: 0.7,
      title: 0.6,
      lang: 0.6,
      role: 0.6,
      "aria-*": 0.6,
      placeholder: 0.5,
      label: 0.5,
      for: 0.5,
      value: 0.5,
      checked: 0.5,
      disabled: 0.5,
      readonly: 0.5,
      required: 0.5,
      maxlength: 0.5,
      minlength: 0.5,
      pattern: 0.5,
      step: 0.5,
      min: 0.5,
      max: 0.5,
      accept: 0.4,
      "accept-charset": 0.4,
      action: 0.4,
      method: 0.4,
      enctype: 0.4,
      target: 0.4,
      rel: 0.4,
      media: 0.4,
      sizes: 0.4,
      srcset: 0.4,
      preload: 0.4,
      autoplay: 0.4,
      controls: 0.4,
      loop: 0.4,
      muted: 0.4,
      poster: 0.4,
      autofocus: 0.3,
      autocomplete: 0.3,
      autocapitalize: 0.3,
      spellcheck: 0.3,
      contenteditable: 0.3,
      draggable: 0.3,
      dropzone: 0.3,
      tabindex: 0.3,
      accesskey: 0.3,
      cite: 0.3,
      datetime: 0.3,
      coords: 0.3,
      shape: 0.3,
      usemap: 0.3,
      ismap: 0.3,
      download: 0.3,
      ping: 0.3,
      hreflang: 0.3,
      type: 0.3,
      name: 0.3,
      form: 0.3,
      novalidate: 0.2,
      multiple: 0.2,
      selected: 0.2,
      size: 0.2,
      wrap: 0.2,
      hidden: 0.1,
      style: 0.1,
      content: 0.1,
      "http-equiv": 0.1,
      "data-uid": 1,
      "data-aie": 1
    }
  }
};

// src/ground-truth.ts
function isElementType(type, tagName) {
  return ground_truth_default.typeElement[type].tagNames.includes(tagName.toLowerCase());
}
function getContainerSemantics(tagName) {
  if (!tagName) return -Infinity;
  return ground_truth_default.typeElement.container.semantics[tagName.toLowerCase()];
}
function getAttributeSemantics(attributeName) {
  if (!attributeName) return -Infinity;
  return ground_truth_default.typeAttribute.semantics[attributeName.toLowerCase()];
}

// src/TextRank.ts
function initArray(n, value = 0) {
  return Array.from({ length: n }, () => value);
}
function initMatrix(n, m = n) {
  return initArray(n).map(() => initArray(m));
}
function tokenizeSentences(text) {
  return text.replace(/[^\w\s.?!:]+/g, "").split(/[.?!:]\s|\n|\r/g).map((rawSentence) => rawSentence.trim()).filter((sentence) => !!sentence);
}
function textRank(textOrSentences, k = 3, options = {}) {
  if (!textOrSentences.length) return "";
  const sentences = !Array.isArray(textOrSentences) ? tokenizeSentences(textOrSentences) : textOrSentences;
  if (sentences.length <= k) return sentences.join("\n");
  const optionsWithDefaults = {
    damping: 0.75,
    maxIterations: 20,
    maxSentences: Infinity,
    ...options
  };
  const sentenceTokens = sentences.map((sentence) => sentence.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((token) => !!token.trim())).slice(0, optionsWithDefaults.maxSentences);
  const n = sentences.length;
  const similarityMatrix = initMatrix(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const vector1 = [];
      const vector2 = [];
      for (const token of new Set(sentenceTokens[i].concat(sentenceTokens[j]))) {
        vector1.push(sentenceTokens[i].filter((w) => w === token).length);
        vector2.push(sentenceTokens[j].filter((w) => w === token).length);
      }
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i2 = 0; i2 < vector1.length; i2++) {
        dotProduct += vector1[i2] * vector2[i2];
        normA += vector1[i2] * vector1[i2];
        normB += vector2[i2] * vector2[i2];
      }
      similarityMatrix[i][j] = dotProduct / (normA ** 0.5 * normB ** 0.5 + 1e-10);
    }
  }
  const scores = initArray(n, 1);
  for (let iteration = 0; iteration < optionsWithDefaults.maxIterations; iteration++) {
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        let norm = 0;
        for (let i2 = 0; i2 < similarityMatrix[j].length; i2++) {
          norm += similarityMatrix[j][i2] * similarityMatrix[i2][i2];
        }
        sum += similarityMatrix[j][i] / (norm || 1) * scores[j];
      }
      scores[i] = optionsWithDefaults.damping * sum + (1 - optionsWithDefaults.damping);
    }
  }
  return sentences.map((sentence, i) => {
    return {
      sentence,
      index: i,
      score: scores[i]
    };
  }).sort((a, b) => b.score - a.score).slice(0, Math.min(k, sentences.length)).sort((a, b) => a.index - b.index).map((obj) => obj.sentence).join("\n");
}
function relativeTextRank(text, ratio = 0.5, options = {}, noEmpty = false) {
  const sentences = tokenizeSentences(text);
  const k = Math.max(
    Math.round(sentences.length * ratio),
    1
  );
  return textRank(sentences, Math.max(k, +noEmpty), options);
}

// src/Turndown.ts
import TurndownService from "turndown";
import * as turndownPluginGfm from "turndown-plugin-gfm";
var KEEP_TAG_NAMES = ["a"];
var SERVICE = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced"
});
SERVICE.addRule("keep", {
  filter: KEEP_TAG_NAMES,
  replacement: (_, node) => node.outerHTML
});
SERVICE.use(turndownPluginGfm.gfm);
var KEEP_LINE_BREAK_MARK = "@@@";
function turndown(markup) {
  return SERVICE.turndown(markup).trim().replace(/\n|$/g, KEEP_LINE_BREAK_MARK);
}

// src/D2Snap.util.ts
async function validateParams(k, l, m) {
  const validateParam = (param, allowInfinity = false) => {
    if (allowInfinity && param === Infinity) return;
    if (param < 0 || param > 1) {
      throw new RangeError(`Invalid parameter ${param}, expects value in [0, 1]`);
    }
  };
  validateParam(k, true);
  validateParam(l);
  validateParam(m);
}
function getOptionsWithDefaults(options) {
  return {
    assignUniqueIDs: false,
    debug: false,
    keepUnknownElements: false,
    skipMarkdownTranslation: false,
    textRankOptions: {},
    ...options
  };
}

// src/config.json
var config_default = {
  uniqueIDAttribute: "data-uid"
};

// src/D2Snap.dom.ts
var FILTER_TAG_NAMES = [
  "SCRIPT",
  "STYLE",
  "LINK"
];
async function d2Snap(dom, k, l, m, options = {}) {
  validateParams(k, l, m);
  const optionsWithDefaults = getOptionsWithDefaults(options);
  function snapElementNode(elementNode) {
    if (isElementType("container", elementNode.tagName)) return;
    if (isElementType("content", elementNode.tagName)) {
      return snapElementContentNode(elementNode);
    }
    if (isElementType("interactive", elementNode.tagName)) {
      snapElementInteractiveNode(elementNode);
      return;
    }
    if (optionsWithDefaults.keepUnknownElements) return;
    elementNode.parentNode?.removeChild(elementNode);
  }
  function snapElementContainerNode(elementNode, k2, domTreeHeight2) {
    if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
    if (!isElementType("container", elementNode.tagName)) return;
    if (!elementNode.parentElement || !isElementType("container", elementNode.parentElement.tagName)) return;
    const mergeLevels = Math.max(
      Math.round(domTreeHeight2 * Math.min(1, k2)),
      1
    );
    if ((elementNode.depth - 1) % mergeLevels === 0) return;
    const elements = [
      elementNode.parentElement,
      elementNode
    ];
    const mergeUpwards = getContainerSemantics(elements[0].tagName) >= getContainerSemantics(elements[1].tagName);
    !mergeUpwards && elements.reverse();
    const targetEl = elements[0];
    const sourceEl = elements[1];
    const mergedAttributes = Array.from(targetEl.attributes);
    for (const attr of sourceEl.attributes) {
      if (mergedAttributes.some((targetAttr) => targetAttr.name === attr.name)) continue;
      mergedAttributes.push(attr);
    }
    for (const attr of targetEl.attributes) {
      targetEl.removeAttribute(attr.name);
    }
    for (const attr of mergedAttributes) {
      targetEl.setAttribute(attr.name, attr.value);
    }
    if (mergeUpwards) {
      while (sourceEl.childNodes.length) {
        targetEl.insertBefore(sourceEl.childNodes[0], sourceEl);
      }
    } else {
      let afterPivot = false;
      while (sourceEl.childNodes.length > 1) {
        const childNode = sourceEl.childNodes[+afterPivot];
        if (childNode === targetEl) {
          afterPivot = true;
          continue;
        }
        afterPivot || !targetEl.childNodes.length ? targetEl.appendChild(childNode) : targetEl.insertBefore(childNode, targetEl.childNodes[0]);
      }
      targetEl.depth = sourceEl.depth;
      sourceEl.parentNode?.insertBefore(targetEl, sourceEl);
    }
    sourceEl.parentNode?.removeChild(sourceEl);
  }
  function snapElementContentNode(elementNode) {
    if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
    if (!isElementType("content", elementNode.tagName)) return;
    if (optionsWithDefaults.skipMarkdownTranslation) return;
    const markdown = turndown(elementNode.outerHTML);
    const markdownNodesFragment = resolveDocument(dom).createRange().createContextualFragment(markdown);
    elementNode.replaceWith(...markdownNodesFragment.childNodes);
  }
  function snapElementInteractiveNode(elementNode) {
    if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
    if (!isElementType("interactive", elementNode.tagName)) return;
  }
  function snapTextNode(textNode, l2) {
    if (textNode.nodeType !== 3 /* TEXT_NODE */) return;
    const text = textNode?.innerText ?? textNode.textContent;
    textNode.textContent = relativeTextRank(text, 1 - l2, optionsWithDefaults.textRankOptions, true);
  }
  function snapAttributeNode(elementNode, m2) {
    if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
    for (const attr of Array.from(elementNode.attributes)) {
      if (getAttributeSemantics(attr.name) >= m2) continue;
      elementNode.removeAttribute(attr.name);
    }
  }
  const document = resolveDocument(dom);
  if (!document) throw new ReferenceError("Could not resolve a valid document object from DOM");
  const rootElement = resolveRoot(dom);
  const originalSize = rootElement.outerHTML.length;
  let n = 0;
  optionsWithDefaults.assignUniqueIDs && await traverseDom(
    document,
    rootElement,
    1 /* SHOW_ELEMENT */,
    (elementNode) => {
      if (!isElementType("container", elementNode.tagName) && !isElementType("interactive", elementNode.tagName)) return;
      elementNode.setAttribute(config_default.uniqueIDAttribute, (n++).toString());
    }
  );
  const virtualDom = rootElement.cloneNode(true);
  await traverseDom(
    document,
    virtualDom,
    128 /* SHOW_COMMENT */,
    (node) => node.parentNode?.removeChild(node)
  );
  await traverseDom(
    document,
    virtualDom,
    1 /* SHOW_ELEMENT */,
    (elementNode) => {
      if (!FILTER_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;
      elementNode.parentNode?.removeChild(elementNode);
    }
  );
  let domTreeHeight = 0;
  await traverseDom(
    document,
    virtualDom,
    1 /* SHOW_ELEMENT */,
    (elementNode) => {
      const depth = (elementNode.parentNode.depth ?? 0) + 1;
      elementNode.depth = depth;
      domTreeHeight = Math.max(depth, domTreeHeight);
    }
  );
  await traverseDom(
    document,
    virtualDom,
    4 /* SHOW_TEXT */,
    (node) => snapTextNode(node, l)
  );
  await traverseDom(
    document,
    virtualDom,
    1 /* SHOW_ELEMENT */,
    (node) => snapElementNode(node)
  );
  await traverseDom(
    document,
    virtualDom,
    1 /* SHOW_ELEMENT */,
    (node) => {
      if (!isElementType("container", node.tagName)) return;
      return snapElementContainerNode(node, k, domTreeHeight);
    }
  );
  await traverseDom(
    document,
    virtualDom,
    1 /* SHOW_ELEMENT */,
    (node) => snapAttributeNode(node, m)
    // work on parent element
  );
  const snapshot = virtualDom.innerHTML;
  let serializedHtml = optionsWithDefaults.debug ? formatHtml(snapshot) : snapshot;
  serializedHtml = serializedHtml.replace(new RegExp(KEEP_LINE_BREAK_MARK, "g"), "\n").replace(/\n *(\n|$)/g, "");
  serializedHtml = k === Infinity && virtualDom.children.length ? serializedHtml.trim().replace(/^<[^>]+>\s*/, "").replace(/\s*<\/[^<]+>$/, "") : serializedHtml;
  return {
    serializedHtml,
    meta: {
      originalSize,
      snapshotSize: snapshot.length,
      sizeRatio: snapshot.length / originalSize,
      estimatedTokens: Math.round(snapshot.length / 4)
      // according to https://platform.openai.com/tokenizer
    }
  };
}

// src/HTMLParserTransformer.ts
var HTMLParserTransformer = class _HTMLParserTransformer {
  static singletonTagNames = [
    "AREA",
    "BASE",
    "BR",
    "COL",
    "COMMAND",
    "EMBED",
    "HR",
    "IMG",
    "INPUT",
    "KEYGEN",
    "LINK",
    "MENUITEM",
    "META",
    "PARAM",
    "SOURCE",
    "TRACK",
    "WBR"
  ];
  static outerHTML(dom) {
    const buffer = [];
    const stack = [];
    let nodes = dom;
    let index = 0;
    while (true) {
      if (index >= nodes.length) {
        if (stack.length === 0) break;
        const frame = stack.pop();
        const tagName2 = frame.node.tagName.toLowerCase();
        buffer.push(`</${tagName2}>`);
        nodes = stack.length > 0 ? stack[stack.length - 1].node.children : dom;
        index = frame.childIndex;
        continue;
      }
      const node = nodes[index++];
      if (node === null) continue;
      if (node.type === 2 /* TEXT */) {
        buffer.push(node.textContent);
        continue;
      }
      const tagName = node.tagName.toLowerCase();
      buffer.push(`<${tagName}`);
      for (let j = 0; j < node.attributes.length; j++) {
        const attr = node.attributes[j];
        buffer.push(" ", attr.name);
        if (attr.value === "") continue;
        buffer.push(`="${attr.value.replace(/"/g, "&quot;")}"`);
      }
      buffer.push(">");
      if (_HTMLParserTransformer.singletonTagNames.includes(tagName)) continue;
      if (node.children.length) {
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
  static async parseNode(html) {
    const dom = (await new _HTMLParserTransformer().parse(html)).dom;
    return dom[0] ?? null;
  }
  transformCallbacks;
  skipTagNames;
  index = 0;
  depth = 0;
  ignoreDepth = 0;
  #html = "";
  constructor(transformCallbacks = {}, skipTagNames = []) {
    const idFn = (o) => o;
    this.transformCallbacks = {
      onElement: idFn,
      onText: idFn,
      ...transformCallbacks
    };
    this.skipTagNames = skipTagNames.map((tagName) => tagName.toUpperCase());
  }
  async parse(html) {
    this.#html = html;
    const len = html.length;
    const stack = [];
    const dom = [];
    const finalizeElement = async (elementNode, container) => {
      const result = await this.transformCallbacks.onElement(elementNode);
      const resultElement = typeof result === "string" ? await _HTMLParserTransformer.parseNode(result) : result;
      if (resultElement === elementNode) return;
      const parent = elementNode.parentElement;
      const target = parent ? parent.children : container;
      const elementIndex = target.indexOf(elementNode);
      if (elementIndex === -1) return;
      if (resultElement === null) {
        target.splice(elementIndex, 1);
      } else {
        target[elementIndex] = resultElement;
      }
    };
    while (this.index < len) {
      if (this.#html[this.index] !== "<") {
        const text = this.readText();
        if (!text.trim().length) continue;
        const txtNode = {
          type: 2 /* TEXT */,
          textContent: text
        };
        let writeTxtNode = await this.transformCallbacks.onText(txtNode);
        if (!writeTxtNode) continue;
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(writeTxtNode);
        } else {
          dom.push(writeTxtNode);
        }
        continue;
      }
      if (this.#html.startsWith("<!--", this.index)) {
        this.skipComment();
        continue;
      }
      const isClosingTag = this.#html[this.index + 1] === "/";
      if (isClosingTag) {
        const closeTagEnd = this.#html.indexOf(">", this.index);
        if (closeTagEnd === -1) break;
        this.index = closeTagEnd + 1;
        this.depth--;
        const closedElementNode = stack.pop();
        if (!closedElementNode) continue;
        await finalizeElement(closedElementNode, dom);
        continue;
      }
      const { tagName: rawTagName, attributes, selfClosing } = this.parseTag();
      const tagName = rawTagName.toUpperCase();
      const isVoid = _HTMLParserTransformer.singletonTagNames.includes(tagName);
      if (this.skipTagNames.includes(tagName)) {
        if (!isVoid && !selfClosing) {
          this.skipIgnoredTag(tagName);
        }
        continue;
      }
      const elementNode = {
        attributes,
        children: [],
        depth: this.depth,
        type: 1 /* ELEMENT */,
        tagName
      };
      if (stack.length > 0) {
        const parentElement = stack[stack.length - 1];
        parentElement.children.push(elementNode);
        elementNode.parentElement = parentElement;
      } else {
        dom.push(elementNode);
      }
      if (!selfClosing && !isVoid) {
        stack.push(elementNode);
        this.depth++;
      } else {
        await finalizeElement(elementNode, dom);
      }
    }
    return {
      dom,
      html: _HTMLParserTransformer.outerHTML(dom)
    };
  }
  skipIgnoredTag(tagName) {
    let depth = 1;
    while (this.index < this.#html.length && depth > 0) {
      const openingIndex = this.#html.indexOf("<", this.index);
      if (openingIndex === -1) {
        this.index = this.#html.length;
        return;
      }
      this.index = openingIndex;
      if (this.#html.startsWith("<!--", this.index)) {
        const end = this.#html.indexOf("-->", this.index + 4);
        this.index = end === -1 ? this.#html.length : end + 3;
        continue;
      }
      const htmlHead = this.#html.slice(this.index + 1, this.index + 1 + tagName.length + 1).toUpperCase();
      let closingIndex;
      if (htmlHead.startsWith("/" + tagName) && (htmlHead.length === tagName.length + 1 || /[\s>]/.test(htmlHead[tagName.length + 1]))) {
        depth--;
        closingIndex = this.#html.indexOf(">", this.index);
        this.index = closingIndex === -1 ? this.#html.length : closingIndex + 1;
        continue;
      }
      if (htmlHead.startsWith(tagName) && (htmlHead.length === tagName.length || /[\s/>]/.test(htmlHead[tagName.length]))) {
        depth++;
        closingIndex = this.#html.indexOf(">", this.index);
        this.index = closingIndex === -1 ? this.#html.length : closingIndex + 1;
        continue;
      }
      closingIndex = this.#html.indexOf(">", this.index);
      this.index = closingIndex === -1 ? this.#html.length : closingIndex + 1;
    }
  }
  skipComment() {
    const end = this.#html.indexOf("-->", this.index + 4);
    this.index = end === -1 ? this.#html.length : end + 3;
  }
  parseTag() {
    let i = this.index + 1;
    let tagName = "";
    while (i < this.#html.length && /[^\s/>]/.test(this.#html[i])) {
      tagName += this.#html[i++];
    }
    const attributes = [];
    while (i < this.#html.length && this.#html[i] !== ">" && this.#html[i] !== "/") {
      while (/\s/.test(this.#html[i])) i++;
      if (this.#html[i] === ">" || this.#html[i] === "/") break;
      let attributeName = "";
      while (i < this.#html.length && /[^\s=/>]/.test(this.#html[i])) {
        attributeName += this.#html[i++];
      }
      while (/\s/.test(this.#html[i])) i++;
      let value = "";
      if (this.#html[i] === "=") {
        i++;
        while (/\s/.test(this.#html[i])) i++;
        const quote = this.#html[i] === '"' || this.#html[i] === "'" ? this.#html[i++] : "";
        const startIndex = i;
        while (i < this.#html.length && (quote ? this.#html[i] !== quote : /[^\s>]/.test(this.#html[i]))) i++;
        value = this.#html.slice(startIndex, i);
        i += +!!quote;
      }
      attributes.push({
        type: 0 /* ATTRIBUTE */,
        name: attributeName,
        value
      });
    }
    const endTagIndex = this.#html.indexOf(">", i);
    this.index = endTagIndex === -1 ? this.#html.length : endTagIndex + 1;
    return {
      attributes,
      selfClosing: this.#html[i] === "/",
      tagName: tagName.toUpperCase()
    };
  }
  readText() {
    const nextTagIndex = this.#html.indexOf("<", this.index);
    const endIndex = nextTagIndex === -1 ? this.#html.length : nextTagIndex;
    const text = this.#html.slice(this.index, endIndex);
    this.index = endIndex;
    return text;
  }
};

// src/D2Snap.string.ts
var FILTER_TAG_NAMES2 = [
  "SCRIPT",
  "STYLE",
  "LINK"
];
var FILTER_CONTENT_TAG_NAMES = [
  "TH",
  "TR",
  "TD",
  "THEAD",
  "TBODY",
  "LI"
];
function estimateDOMTreeHeight(html) {
  const tagRegex = /<\/?([a-zA-Z0-9\-]+)(\s[^>]*)?>/g;
  let currentDepth = 0;
  let maxDepth = 0;
  while (true) {
    let match = tagRegex.exec(html);
    if (!match) break;
    const tag = match[0];
    if (tag.startsWith("<!") || tag.startsWith("<?") || tag.startsWith("<!--")) continue;
    const isClosingTag = tag.startsWith("</");
    const isSelfClosingTag = tag.endsWith("/>") || /<\s*(br|hr|img|input|meta|link|source|area|base|col|embed|param|track|wbr)\b/i.test(tag);
    if (isClosingTag || isSelfClosingTag) {
      currentDepth = Math.max(0, currentDepth - 1);
      continue;
    }
    maxDepth = Math.max(++currentDepth, maxDepth);
  }
  return maxDepth;
}
async function mergeElementNode(element, mergeUpwardsCb, levels = Infinity) {
  const removeDuplicateAttributes = (attrs) => {
    const result = [];
    const seen = /* @__PURE__ */ new Set();
    for (const attr of attrs) {
      if (seen.has(attr.name)) continue;
      result.push(attr);
      seen.add(attr.name);
    }
    return result;
  };
  const mergeAttributes = (target, source) => {
    target.attributes = removeDuplicateAttributes([...target.attributes, ...source.attributes]);
  };
  let hasChanged = true;
  while (hasChanged) {
    hasChanged = false;
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      if (child.type !== 1 /* ELEMENT */ || !isElementType("container", child.tagName)) continue;
      if (child.depth - element.depth >= levels) continue;
      hasChanged = true;
      const mergeUpwards = mergeUpwardsCb(element.tagName, child.tagName);
      if (mergeUpwards) {
        mergeAttributes(element, child);
        element.children.splice(i, 1, ...child.children);
        for (const independentChild of child.children) {
          if (independentChild.type !== 1 /* ELEMENT */) continue;
          independentChild.parentElement = element;
        }
        i = -1;
        continue;
      }
      mergeAttributes(child, element);
      element.children.splice(i, 1, ...child.children);
      element.tagName = child.tagName;
      element.attributes = child.attributes;
      for (const independentChild of element.children) {
        if (independentChild.type !== 1 /* ELEMENT */) continue;
        element.parentElement = element;
      }
      i = -1;
    }
  }
}
function dissolveParentHTMLTag(html) {
  const match = html.trim().match(/^<([a-zA-Z0-9-]+)(\s[^>]*)?>([\s\S]*)<\/\1>$/i);
  return match ? match[3].trim() : html;
}
async function d2Snap2(dom, k, l, m, options = {}) {
  dom = dom.trim().replace(/^<!DOCTYPE +[a-z]+ *>\s*/i, "");
  validateParams(k, l, m);
  const optionsWithDefaults = getOptionsWithDefaults(options);
  const domTreeHeight = estimateDOMTreeHeight(dom);
  const mergeLevels = Math.max(Math.round(domTreeHeight * Math.min(1, k)), 1);
  const parserTransformer = new HTMLParserTransformer({
    onText(text) {
      text.textContent = relativeTextRank(text.textContent, 1 - l, optionsWithDefaults.textRankOptions, true);
      return text;
    },
    onElement(element) {
      for (let i = 0; i < element.attributes.length; i++) {
        if (getAttributeSemantics(element.attributes[i].name) >= m) continue;
        element.attributes.splice(i, 1);
        i--;
      }
      if (isElementType("interactive", element.tagName)) return element;
      if (isElementType("content", element.tagName)) {
        if (FILTER_CONTENT_TAG_NAMES.includes(element.tagName.toUpperCase())) return element;
        if (optionsWithDefaults.skipMarkdownTranslation) return element;
        return turndown(HTMLParserTransformer.outerHTML([element]));
      }
      if (isElementType("container", element.tagName)) {
        if (element.depth % mergeLevels > 0) return element;
        mergeElementNode(element, (elementTagName, childTagName) => {
          return getContainerSemantics(elementTagName) >= getContainerSemantics(childTagName);
        }, mergeLevels);
        return element;
      }
      if (optionsWithDefaults.keepUnknownElements) return element;
      return null;
    }
  }, FILTER_TAG_NAMES2);
  let snapshot = (await parserTransformer.parse(dom)).html.replace(new RegExp(KEEP_LINE_BREAK_MARK, "g"), "\n");
  if (k === Infinity) {
    snapshot = dissolveParentHTMLTag(snapshot);
  }
  return {
    serializedHtml: optionsWithDefaults.debug ? formatHtml(snapshot) : snapshot,
    meta: {
      originalSize: dom.length,
      snapshotSize: snapshot.length,
      sizeRatio: snapshot.length / dom.length,
      estimatedTokens: Math.round(snapshot.length / 4)
    }
  };
}

// src/AdaptiveD2Snap.ts
async function adaptiveD2Snap(d2SnapFn, dom, maxTokens = 4096, maxIterations = 5, options = {}) {
  const S = (typeof dom !== "string" ? resolveRoot(dom).outerHTML : dom).length;
  const M = 1e6;
  function* generateHalton() {
    const halton = (index, base) => {
      let result = 0;
      let f = 1 / base;
      let i3 = index;
      while (i3 > 0) {
        result += f * (i3 % base);
        i3 = Math.floor(i3 / base);
        f /= base;
      }
      return result;
    };
    let i2 = 0;
    while (true) {
      i2++;
      yield [
        halton(i2, 7),
        halton(i2, 3),
        halton(i2, 3)
      ];
    }
  }
  let i = 0;
  let sCalc = S;
  let parameters, snapshot;
  const haltonGenerator = generateHalton();
  while (true) {
    const haltonPoint = haltonGenerator.next().value;
    const computeParam = (haltonValue) => Math.min(sCalc / M * haltonValue, 1);
    parameters = {
      k: computeParam(haltonPoint[0]),
      l: computeParam(haltonPoint[1]),
      m: computeParam(haltonPoint[2])
    };
    snapshot = await d2SnapFn.call(null, dom, parameters.k, parameters.l, parameters.m, options);
    sCalc = sCalc ** 1.125;
    if (snapshot.meta.estimatedTokens <= maxTokens)
      break;
    if (i++ === maxIterations)
      throw new RangeError("Unable to create snapshot below given token threshold");
  }
  return {
    ...snapshot,
    parameters: {
      ...parameters,
      adaptiveIterations: i
    }
  };
}

// src/api.ts
function isDOMString(domOrString) {
  return typeof domOrString === "string";
}
async function d2Snap3(domOrString, ...args) {
  return isDOMString(domOrString) ? d2Snap2(domOrString, ...args) : d2Snap(domOrString, ...args);
}
async function adaptiveD2Snap2(domOrString, ...args) {
  return adaptiveD2Snap(d2Snap3, domOrString, ...args);
}
export {
  adaptiveD2Snap2 as adaptiveD2Snap,
  d2Snap3 as d2Snap
};
