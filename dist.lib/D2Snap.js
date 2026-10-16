import { Turndown } from "./Turndown.js";
import { NodeType, NodeFilter } from "./enums.js";
import { CONFIG } from "./config.js";
import { resolveDocument, resolveRoot, serializeSnapshotRoot, traverseDom } from "./util.dom.js";
import { isVoidElement } from "./util.html.js";
import { postProcessDOM, postProcessHTML, preProcessDOM } from "./processing.js";
import { deepMerge } from "./util.obj.js";
import { getByteLength, getSizeRatio, transformWithRanking } from "./util.text.js";
import { snapTextBlocks } from "./D2Snap.text.js";
import * as defaults from "./constants.defaults.js";
import { assignUniqueIds } from "./options.normalizers.js";
const COLON_SCHEME_TAG_REGEX = /^[a-z][a-z0-9+.-]*:(?![a-z_][a-z0-9_.-]*$)/i;
const WHITESPACE_REGEX = /^\s$/;
function validateUnitParameter(name, value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
  }
}
function resolveD2SnapArgs(args) {
  const [ratiosOrRE, optionsOrRA] = args;
  if (typeof ratiosOrRE === "object" && ratiosOrRE !== null) {
    const ratios = ratiosOrRE;
    ratios.r !== void 0 && validateUnitParameter("r", ratios.r);
    const r = ratios.r ?? 0;
    return {
      rE: ratios.rE ?? r,
      rA: ratios.rA ?? r,
      rT: ratios.rT ?? r,
      options: optionsOrRA ?? {}
    };
  }
  const [rE, rA, rT, options] = args;
  return {
    rE,
    rA,
    rT,
    options: options ?? {}
  };
}
function defineNonEnumerableProperty(obj, prop, value) {
  Object.defineProperty(obj, prop, {
    value,
    writable: false,
    configurable: true,
    enumerable: false
  });
}
function getAttributeScore(attrName, attributeScores = new Map(
  Object.entries(defaults.ATTRIBUTE_SCORES).map((entry) => [entry[0].toLowerCase(), entry[1]])
)) {
  let normalizedName = attrName.toLowerCase();
  if (!attributeScores.has(normalizedName)) {
    const nameParts = normalizedName.split("-");
    for (let i = nameParts.length - 1; i > 0; i--) {
      const wildcardName = `${nameParts.slice(0, i).join("-")}-*`;
      if (attributeScores.has(wildcardName)) {
        normalizedName = wildcardName;
        break;
      }
    }
  }
  const attributeScore = attributeScores.get(normalizedName) ?? attributeScores.get(CONFIG.attributeScoresFallbackKey) ?? CONFIG.attributeScoresDefaultFallbackValue;
  return attributeScore;
}
function createVirtualDOM(document, rootElement) {
  const inertDoc = document.implementation.createHTMLDocument("");
  const rootElementClone = inertDoc.importNode(rootElement, true);
  switch (rootElement.localName.toLowerCase()) {
    case "html":
      inertDoc.replaceChild(rootElementClone, inertDoc.documentElement);
      break;
    case "body":
      inertDoc.documentElement.replaceChild(rootElementClone, inertDoc.body);
      break;
    default:
      inertDoc.body.appendChild(rootElementClone);
  }
  const virtualDOM = rootElement.nodeType === NodeType.DOCUMENT_NODE ? inertDoc.documentElement : inertDoc.body;
  const liveDOM = rootElement.localName.toLowerCase() === "html" ? rootElement.querySelector("body") ?? rootElement : rootElement;
  return { inertDoc, virtualDOM, liveDOM };
}
function resolveNormalizers(options) {
  const normalizers = [...options.normalizers];
  options.uniqueIDs && !normalizers.includes(assignUniqueIds) && normalizers.push(assignUniqueIds);
  return normalizers;
}
function normalizeDOM(dom, options = {}) {
  const document = resolveDocument(dom);
  if (!document) throw new ReferenceError("Could not resolve a valid document object from DOM");
  const rootElement = resolveRoot(dom);
  const optionsWithDefaults = deepMerge({
    classifiers: defaults.CLASSIFIERS,
    normalizers: defaults.NORMALIZERS,
    shadowDOM: false,
    uniqueIDs: false
  }, options);
  const { inertDoc, virtualDOM, liveDOM } = createVirtualDOM(document, rootElement);
  preProcessDOM(virtualDOM, liveDOM, inertDoc, {
    classifiers: optionsWithDefaults.classifiers,
    normalizers: resolveNormalizers(optionsWithDefaults),
    shadowDOM: optionsWithDefaults.shadowDOM
  });
  return {
    dom: virtualDOM,
    get html() {
      return virtualDOM.innerHTML;
    },
    get innerHTML() {
      return virtualDOM.innerHTML;
    },
    get outerHTML() {
      return virtualDOM.outerHTML;
    }
  };
}
function d2Snap(dom, ...args) {
  const { rE, rA, rT, options } = resolveD2SnapArgs(args);
  validateUnitParameter("rE", rE);
  validateUnitParameter("rA", rA);
  validateUnitParameter("rT", rT);
  const document = resolveDocument(dom);
  if (!document) throw new ReferenceError("Could not resolve a valid document object from DOM");
  const rootElement = resolveRoot(dom);
  const originalSize = getByteLength(serializeSnapshotRoot(rootElement));
  const optionsWithDefaults = deepMerge({
    attributeScores: defaults.ATTRIBUTE_SCORES,
    classifiers: defaults.CLASSIFIERS,
    debug: false,
    filterEmptyElements: true,
    prose: false,
    minify: true,
    normalizers: defaults.NORMALIZERS,
    shadowDOM: false,
    sentenceRanker: defaults.SENTENCE_RANKER,
    markdown: true,
    uniqueIDs: false
  }, options);
  const attributeScores = new Map(
    Object.entries(optionsWithDefaults.attributeScores).map((entry) => [entry[0].toLowerCase(), entry[1]])
  );
  const _isActionableElement = optionsWithDefaults.classifiers.actionableElement;
  const _isTextElement = optionsWithDefaults.classifiers.textFormattingElement;
  const _sentenceRanker = optionsWithDefaults.sentenceRanker ?? ((sentences) => sentences);
  const turndown = new Turndown([_isActionableElement]);
  function snapElementContainerNode(elementNode, rE2) {
    const considerContainerElement = (elementNode2) => {
      if (elementNode2.nodeType !== NodeType.ELEMENT_NODE) return false;
      if (_isActionableElement(elementNode2)) return false;
      if (isVoidElement(elementNode2.tagName)) return false;
      return true;
    };
    if (!considerContainerElement(elementNode)) return;
    if (!elementNode.parentElement || !considerContainerElement(elementNode.parentElement)) return;
    const ratio = Math.min(1, Math.max(0, rE2));
    const isMergeLevel = elementNode.depth > 1 && Math.floor(elementNode.depth * ratio) > Math.floor((elementNode.depth - 1) * ratio);
    if (!isMergeLevel) return;
    const targetElement = elementNode.parentElement;
    const sourceElement = elementNode;
    while (sourceElement.childNodes.length) {
      targetElement.insertBefore(sourceElement.childNodes[0], sourceElement);
    }
    sourceElement.parentNode?.removeChild(sourceElement);
  }
  function snapTextNode(textNode, rT2) {
    if (textNode.nodeType !== NodeType.TEXT_NODE) return;
    const text = textNode.textContent;
    if (!(text ?? "").trim().length) return;
    const leadingSpace = WHITESPACE_REGEX.test(text.charAt(0)) ? " " : "";
    const trailingSpace = WHITESPACE_REGEX.test(text.charAt(text.length - 1)) ? " " : "";
    textNode.textContent = [
      leadingSpace,
      transformWithRanking(text, 1 - rT2, _sentenceRanker, true),
      trailingSpace
    ].join("");
  }
  let contextualFragmentRange = null;
  let createTextNode = null;
  function snapElementTextFormattingNode(document2, elementNode) {
    if (!optionsWithDefaults.markdown) return;
    if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
    if (_isActionableElement(elementNode)) return;
    if (!_isTextElement(elementNode)) return;
    contextualFragmentRange ??= document2.createRange();
    createTextNode ??= document2.createTextNode.bind(document2);
    const markdown = turndown.translate(elementNode.outerHTML);
    if (!/[<&\r\0]/.test(markdown)) {
      const replacingNodes2 = markdown ? [createTextNode(markdown)] : [];
      elementNode.replaceWith(...[createTextNode(" "), ...replacingNodes2, createTextNode(" ")]);
      return replacingNodes2;
    }
    const markdownNodesFragment = contextualFragmentRange.createContextualFragment(markdown);
    const unwrapColonTaggedElements = (parent) => {
      for (const child of [...parent.childNodes]) {
        if (child.nodeType !== NodeType.ELEMENT_NODE) continue;
        unwrapColonTaggedElements(child);
        if (!COLON_SCHEME_TAG_REGEX.test(child.tagName)) continue;
        while (child.firstChild) {
          parent.insertBefore(child.firstChild, child);
        }
        parent.removeChild(child);
      }
    };
    unwrapColonTaggedElements(markdownNodesFragment);
    const replacingNodes = [...markdownNodesFragment.childNodes];
    elementNode.replaceWith(...[createTextNode(" "), ...replacingNodes, createTextNode(" ")]);
    const sourceTagName = elementNode.tagName.toLowerCase();
    return replacingNodes.filter((n) => n.nodeType !== NodeType.ELEMENT_NODE || n.tagName.toLowerCase() !== sourceTagName);
  }
  function snapAttributeNode(elementNode, rA2) {
    if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
    for (const attr of Array.from(elementNode.attributes)) {
      if (getAttributeScore(attr.name, attributeScores) >= rA2) continue;
      elementNode.removeAttribute(attr.name);
    }
  }
  const t = optionsWithDefaults.debug ? performance.now.bind(performance) : () => 0;
  let t0;
  const timings = {};
  t0 = t();
  const { inertDoc, virtualDOM, liveDOM } = createVirtualDOM(document, rootElement);
  timings.clone = t() - t0;
  t0 = t();
  preProcessDOM(virtualDOM, liveDOM, inertDoc, {
    classifiers: optionsWithDefaults.classifiers,
    normalizers: resolveNormalizers(optionsWithDefaults),
    shadowDOM: optionsWithDefaults.shadowDOM
  });
  timings.preProcessing = t() - t0;
  t0 = t();
  traverseDom(
    virtualDOM,
    NodeFilter.SHOW_ELEMENT,
    (element) => {
      const depth = (element?.parentNode?.depth ?? 0) + 1;
      defineNonEnumerableProperty(element, "depth", depth);
      const role = element.getAttribute("role");
      role && defineNonEnumerableProperty(element, "role", role);
    }
  );
  timings.writeDepth = t() - t0;
  t0 = t();
  optionsWithDefaults.prose ? snapTextBlocks(virtualDOM, 1 - rT, _sentenceRanker, _isActionableElement) : traverseDom(
    virtualDOM,
    NodeFilter.SHOW_TEXT,
    (node) => snapTextNode(node, rT)
  );
  timings.textNodes = t() - t0;
  t0 = t();
  traverseDom(
    virtualDOM,
    NodeFilter.SHOW_ELEMENT,
    (node) => snapElementTextFormattingNode(inertDoc, node)
  );
  timings.textFormatting = t() - t0;
  t0 = t();
  traverseDom(
    virtualDOM,
    NodeFilter.SHOW_ELEMENT,
    (node) => snapElementContainerNode(node, rE)
  );
  timings.containers = t() - t0;
  t0 = t();
  traverseDom(
    virtualDOM,
    NodeFilter.SHOW_ELEMENT,
    (node) => snapAttributeNode(node, rA)
  );
  timings.attributes = t() - t0;
  if (rE === 1) {
    [...virtualDOM.querySelectorAll("*")].filter((elementNode) => !_isActionableElement(elementNode)).forEach((element) => {
      element.replaceWith(...element.childNodes);
    });
  }
  t0 = t();
  postProcessDOM(virtualDOM, {
    filterEmptyElements: optionsWithDefaults.filterEmptyElements,
    minify: optionsWithDefaults.minify
  }, _isActionableElement);
  timings.domPostProcessing = t() - t0;
  const serialisation = {};
  const getHTML = (property) => {
    if (serialisation[property] !== void 0) {
      return serialisation[property];
    }
    t0 = t();
    let html = virtualDOM[property];
    timings.serialize = t() - t0;
    t0 = t();
    html = postProcessHTML(html, {
      debug: optionsWithDefaults.debug
    });
    timings.htmlPostProcessing = t() - t0;
    serialisation[property] = html;
    return html;
  };
  return {
    dom: virtualDOM,
    get html() {
      return getHTML("innerHTML");
    },
    get innerHTML() {
      return getHTML("innerHTML");
    },
    get outerHTML() {
      return getHTML("outerHTML");
    },
    meta: {
      originalSize,
      get snapshotSize() {
        return getByteLength(getHTML("innerHTML"));
      },
      get sizeRatio() {
        return getSizeRatio(getByteLength(getHTML("innerHTML")), originalSize);
      },
      get tokenEstimate() {
        return Math.round(getHTML("innerHTML").length / 4);
      },
      // according to https://platform.openai.com/tokenizer
      ...optionsWithDefaults.debug && { timings }
    }
  };
}
export {
  d2Snap,
  getAttributeScore,
  normalizeDOM,
  resolveD2SnapArgs
};
