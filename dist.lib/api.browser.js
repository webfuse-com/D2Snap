var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// variables/ground-truth.json
var ground_truth_exports = {};
__export(ground_truth_exports, {
  default: () => ground_truth_default
});
var ground_truth_default;
var init_ground_truth = __esm({
  "variables/ground-truth.json"() {
    ground_truth_default = {
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
            "main",
            "nav",
            "section"
          ],
          ratings: {
            article: 0.95,
            aside: 0.85,
            body: 0.9,
            div: 0.3,
            footer: 0.7,
            header: 0.75,
            html: 0.1,
            main: 0.85,
            nav: 0.8,
            section: 0.9
          },
          fallbackRating: 0
        },
        actionable: {
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
        textFormatting: {
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
          ]
        }
      },
      typeAttribute: {
        ratings: {
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
          "data-uid": 1
        },
        fallbackRating: 0
      }
    };
  }
});

// src/util.dom.ts
async function ensureDOM(domOrString) {
  if (typeof domOrString !== "string") return domOrString;
  if (typeof window !== "undefined") {
    return new DOMParser().parseFromString(domOrString, "text/html");
  }
  try {
    const jsdom = await import("jsdom");
    const dom = new jsdom.JSDOM(domOrString);
    return dom.window.document;
  } catch (err) {
    if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;
    throw new ReferenceError("Install 'jsdom' to use D2Snap with a non-browser runtime");
  }
}
function resolveDocument(dom) {
  let doc;
  try {
    let doc2 = (window ?? {}).document;
    if (doc2) return doc2;
  } catch {
  }
  doc = dom;
  while (doc) {
    if ("createTreeWalker" in doc) return doc;
    doc = doc?.parentNode;
  }
  return null;
}
function resolveRoot(node) {
  return node?.body ?? node?.documentElement ?? node;
}
async function traverseDom(doc, root, filter = NodeFilter.SHOW_ALL, cb) {
  const resolvedDoc = resolveDocument(doc);
  if (!resolvedDoc) throw new Error("Could not resolve document");
  const walker = resolvedDoc.createTreeWalker(root, filter);
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

// src/util.html.ts
function formatHTML(html, indentSize = 2) {
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

// src/GroundTruth.ts
var HARD_FALLBACK_RATING = 0;
var GroundTruth = class {
  groundTruth;
  constructor(groundTruth) {
    this.groundTruth = groundTruth;
  }
  isElementType(type, tagName) {
    const isNativeElement = (this.groundTruth?.typeElement[type]?.tagNames ?? []).includes(tagName.toLowerCase());
    if (isNativeElement) return true;
    if (type !== "container") return isNativeElement;
    const isCustomElement = ![
      ...this.groundTruth?.typeElement.actionable?.tagNames ?? [],
      ...this.groundTruth?.typeElement.textFormatting?.tagNames ?? []
    ].includes(tagName.toLowerCase());
    return isCustomElement;
  }
  getContainerRating(tagName) {
    if (!tagName) return -Infinity;
    const rating = (this.groundTruth?.typeElement?.container?.ratings ?? {})[tagName.toLowerCase()];
    if (rating !== void 0) return rating;
    const fallbackRating = this.groundTruth?.typeElement?.container?.fallbackRating;
    return fallbackRating ?? HARD_FALLBACK_RATING;
  }
  getAttributeRating(attributeName) {
    if (!attributeName) return -Infinity;
    const rating = (this.groundTruth?.typeAttribute?.ratings ?? {})[attributeName.toLowerCase()];
    if (rating !== void 0) return rating;
    const fallbackRating = this.groundTruth?.typeAttribute?.fallbackRating;
    return fallbackRating ?? HARD_FALLBACK_RATING;
  }
};
async function createDefaultGroundTruth() {
  return new GroundTruth(
    (await Promise.resolve().then(() => (init_ground_truth(), ground_truth_exports))).default
  );
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
import { gfm } from "turndown-plugin-gfm";
var KEEP_TAG_NAMES = ["a"];
var SERVICE = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced"
});
SERVICE.addRule("keep", {
  filter: KEEP_TAG_NAMES,
  replacement: (_, node) => "outerHTML" in node ? node.outerHTML : ""
});
SERVICE.use(gfm);
var KEEP_LINE_BREAK_MARK = "@@@";
function turndown(markup) {
  return SERVICE.turndown(markup).trim().replace(/\n/g, KEEP_LINE_BREAK_MARK);
}

// variables/config.json
var config_default = {
  uniqueAttributeName: "data-uid"
};

// src/D2Snap.ts
var PRE_FILTER_TAG_NAMES = [
  "SCRIPT",
  "STYLE",
  "LINK"
];
async function validateParameter(name, value, allowInfinity = false) {
  if (allowInfinity && value === Infinity) return;
  if (value < 0 || value > 1) {
    throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
  }
}
async function d2Snap(dom, rE, rA, rT, options = {}) {
  validateParameter("rE", rE, true);
  validateParameter("rA", rA);
  validateParameter("rT", rT);
  const optionsWithDefaults = {
    debug: false,
    groundTruth: void 0,
    textRankOptions: {},
    skipMarkdown: false,
    uniqueIDs: false,
    ...options
  };
  const groundTruth = optionsWithDefaults.groundTruth ? new GroundTruth(optionsWithDefaults.groundTruth) : await createDefaultGroundTruth();
  function snapElementNode(elementNode) {
    if (groundTruth.isElementType("container", elementNode.tagName)) return;
    if (groundTruth.isElementType("textFormatting", elementNode.tagName)) {
      return snapElementContentNode(elementNode);
    }
    if (groundTruth.isElementType("actionable", elementNode.tagName)) {
      snapElementInteractiveNode(elementNode);
      return;
    }
    elementNode.parentNode?.removeChild(elementNode);
  }
  function snapElementContainerNode(elementNode, k, domTreeHeight2) {
    if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
    if (!groundTruth.isElementType("container", elementNode.tagName)) return;
    if (!elementNode.parentElement || !groundTruth.isElementType("container", elementNode.parentElement.tagName)) return;
    const mergeLevels = Math.max(
      Math.round(domTreeHeight2 * Math.min(1, k)),
      1
    );
    if ((elementNode.depth - 1) % mergeLevels === 0) return;
    const elements = [
      elementNode.parentElement,
      elementNode
    ];
    const isTopdownMerge = groundTruth.getContainerRating(elements[0].tagName) < groundTruth.getContainerRating(elements[1].tagName);
    isTopdownMerge && elements.reverse();
    const targetEl = elements[0];
    const sourceEl = elements[1];
    if (isTopdownMerge) {
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
    }
    if (!isTopdownMerge) {
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
    if (!groundTruth.isElementType("textFormatting", elementNode.tagName)) return;
    if (optionsWithDefaults.skipMarkdown) return;
    const markdown = turndown(elementNode.outerHTML);
    const markdownNodesFragment = resolveDocument(dom).createRange().createContextualFragment(markdown);
    elementNode.replaceWith(...markdownNodesFragment.childNodes);
  }
  function snapElementInteractiveNode(elementNode) {
    if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
    if (!groundTruth.isElementType("actionable", elementNode.tagName)) return;
  }
  function snapTextNode(textNode, l) {
    if (textNode.nodeType !== 3 /* TEXT_NODE */) return;
    const text = textNode?.innerText ?? textNode.textContent;
    textNode.textContent = relativeTextRank(text, 1 - l, optionsWithDefaults.textRankOptions, true);
  }
  function snapAttributeNode(elementNode, m) {
    if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
    for (const attr of Array.from(elementNode.attributes)) {
      if (groundTruth.getAttributeRating(attr.name) >= m) continue;
      elementNode.removeAttribute(attr.name);
    }
  }
  const document = resolveDocument(dom);
  if (!document) throw new ReferenceError("Could not resolve a valid document object from DOM");
  const rootElement = resolveRoot(dom);
  const originalSize = rootElement.innerHTML.length;
  let n = 0;
  optionsWithDefaults.uniqueIDs && await traverseDom(
    document,
    rootElement,
    1 /* SHOW_ELEMENT */,
    (elementNode) => {
      if (!groundTruth.isElementType("container", elementNode.tagName) && !groundTruth.isElementType("actionable", elementNode.tagName)) return;
      elementNode.setAttribute(config_default.uniqueAttributeName, (n++).toString());
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
      if (!PRE_FILTER_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;
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
    (node) => snapTextNode(node, rT)
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
      if (!groundTruth.isElementType("container", node.tagName)) return;
      return snapElementContainerNode(node, rE, domTreeHeight);
    }
  );
  await traverseDom(
    document,
    virtualDom,
    1 /* SHOW_ELEMENT */,
    (node) => snapAttributeNode(node, rA)
    // work on parent element
  );
  const snapshot = virtualDom.innerHTML;
  let html = optionsWithDefaults.debug ? formatHTML(snapshot) : snapshot;
  html = html.replace(new RegExp(KEEP_LINE_BREAK_MARK, "g"), "\n").replace(/\n *(\n|$)/g, "");
  html = virtualDom.children.length === 1 && rE === Infinity && virtualDom.children.length ? html.trim().replace(/^<[^>]+>\s*/, "").replace(/\s*<\/[^<]+>$/, "") : html;
  return {
    html,
    meta: {
      originalSize,
      snapshotSize: snapshot.length,
      sizeRatio: snapshot.length / originalSize,
      tokenEstimate: Math.round(snapshot.length / 4)
      // according to https://platform.openai.com/tokenizer
    }
  };
}

// src/AdaptiveD2Snap.ts
function* generateHalton() {
  const halton = (index, base) => {
    let result = 0;
    let f = 1 / base;
    let i2 = index;
    while (i2 > 0) {
      result += f * (i2 % base);
      i2 = Math.floor(i2 / base);
      f /= base;
    }
    return result;
  };
  let i = 0;
  while (true) {
    i++;
    yield [
      halton(i, 7),
      halton(i, 3),
      halton(i, 3)
    ];
  }
}
async function adaptiveD2Snap(d2SnapFn, dom, maxTokens = 4096, maxIterations = 5, options = {}) {
  const S = (typeof dom !== "string" ? resolveRoot(dom).outerHTML : dom).length;
  const M = 1e6;
  let i = 0;
  let sCalc = S;
  let parameters, snapshot;
  const haltonGenerator = generateHalton();
  while (true) {
    const haltonPoint = haltonGenerator.next().value;
    const computeParam = (haltonValue) => Math.min(sCalc / M * haltonValue, 1);
    parameters = {
      rE: computeParam(haltonPoint[0]),
      rA: computeParam(haltonPoint[1]),
      rT: computeParam(haltonPoint[2])
    };
    snapshot = await d2SnapFn.call(null, dom, parameters.rE, parameters.rA, parameters.rT, options);
    sCalc = sCalc ** 1.125;
    if (snapshot.meta.tokenEstimate <= maxTokens)
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
async function d2Snap2(domOrString, ...args) {
  return d2Snap(await ensureDOM(domOrString), ...args);
}
async function adaptiveD2Snap2(domOrString, ...args) {
  return adaptiveD2Snap(d2Snap2, await ensureDOM(domOrString), ...args);
}

// src/api.browser.ts
window.D2Snap = {
  d2Snap: d2Snap2,
  adaptiveD2Snap: adaptiveD2Snap2
};
