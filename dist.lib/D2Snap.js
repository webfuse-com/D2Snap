import { transformWithTextRank } from "./TextRank.js";
import { Turndown } from "./Turndown.js";
import {
  NodeFilter,
  NodeType
} from "./types.js";
import { CONFIG } from "./var.CONFIG.js";
import {
  DEFAULT_ATTRIBUTE_SCORES
} from "./var.DEFAULTS_ATTRIBUTE_SCORES.js";
import {
  DEFAULT_FILTER_ATTRIBUTE_NAMES,
  DEFAULT_NORMALIZE_ATTRIBUTE_ICONFONT_VALUES,
  DEFAULT_NORMALIZE_LABEL_ATTRIBUTE_NAMES
} from "./var.DEFAULTS_ATTRIBUTES.js";
import {
  DEFAULT_CLASS_ACTIONABLE_TAG_NAMES,
  DEFAULT_CLASS_TEXT_TAG_NAMES,
  DEFAULT_FILTER_TAG_NAMES
} from "./var.DEFAULTS_TAGS.js";
import { ACTIONABLE_ROLE_ATTRIBUTE_VALUES as ACTIONABLE_ROLE_ATTRIBUTE_VALUES_ARRAY } from "./var.SEMANTICS_ATTRIBUTES.js";
import { resolveDocument, resolveRoot, traverseDom } from "./util.dom.js";
import { isInlineElement, isVoidElement } from "./util.html.js";
import { postProcessDOM, postProcessHTML, preProcessDOM } from "./D2Snap.processing.js";
import { deepMerge } from "./util.obj.js";
const WHITESPACE_REGEX = /^\s$/;
const COLON_SCHEME_TAG_REGEX = /^[a-z][a-z0-9+.-]*:(?![a-z_][a-z0-9_.-]*$)/i;
const ACTIONABLE_ROLE_ATTRIBUTE_VALUES = new Set(
  ACTIONABLE_ROLE_ATTRIBUTE_VALUES_ARRAY.map((t) => t.toLowerCase())
);
function validateUnitParameter(name, value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
  }
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
  Object.entries(DEFAULT_ATTRIBUTE_SCORES).map((entry) => [entry[0].toLowerCase(), entry[1]])
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
function isActionableElement(elementNode, actionableElementTagNames = new Set(DEFAULT_CLASS_ACTIONABLE_TAG_NAMES), actionableRoleAttributeValues = ACTIONABLE_ROLE_ATTRIBUTE_VALUES) {
  return actionableElementTagNames.has(elementNode.tagName.toUpperCase()) || actionableRoleAttributeValues.has(
    elementNode.getAttribute("role")?.toLowerCase() ?? elementNode.role ?? ""
  );
}
function d2Snap(dom, rE, rA, rT, options = {}) {
  validateUnitParameter("rE", rE);
  validateUnitParameter("rA", rA);
  validateUnitParameter("rT", rT);
  const document = resolveDocument(dom);
  if (!document) throw new ReferenceError("Could not resolve a valid document object from DOM");
  const rootElement = resolveRoot(dom);
  const originalSize = rootElement.innerHTML.length;
  const optionsWithDefaults = deepMerge({
    attributeScores: DEFAULT_ATTRIBUTE_SCORES,
    classification: {
      actionableElements: DEFAULT_CLASS_ACTIONABLE_TAG_NAMES,
      textElements: DEFAULT_CLASS_TEXT_TAG_NAMES
    },
    debug: false,
    filter: {
      attributes: DEFAULT_FILTER_ATTRIBUTE_NAMES,
      dataURLs: true,
      elements: DEFAULT_FILTER_TAG_NAMES,
      emptyElements: true
    },
    minify: true,
    normalize: {
      iconfontsFromNames: DEFAULT_NORMALIZE_ATTRIBUTE_ICONFONT_VALUES,
      labelsFromAttributes: DEFAULT_NORMALIZE_LABEL_ATTRIBUTE_NAMES,
      svgToImg: true
    },
    skip: {
      markdown: false,
      textRank: false
    },
    uniqueIDs: false
  }, options);
  optionsWithDefaults.attributeScores = {
    ...DEFAULT_ATTRIBUTE_SCORES,
    ...options.attributeScoring ?? {},
    ...options.attributeScores ?? {}
  };
  const attributeScores = new Map(
    Object.entries(optionsWithDefaults.attributeScores).map((entry) => [entry[0].toLowerCase(), entry[1]])
  );
  const actionableElementTagNames = new Set(
    (optionsWithDefaults.classification?.actionableElements ?? []).map((tagName) => tagName.toUpperCase())
  );
  const textElementTagNames = new Set(
    (optionsWithDefaults.classification?.textElements ?? []).map((tagName) => tagName.toUpperCase())
  );
  const _isActionableElement = (elementNode) => {
    return isActionableElement(elementNode, actionableElementTagNames);
  };
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
  function snapElementTextFormattingNode(document2, elementNode) {
    if (optionsWithDefaults.skip?.markdown) return;
    if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
    if (_isActionableElement(elementNode)) return;
    if (!textElementTagNames.has(elementNode.tagName.toUpperCase())) return;
    const markdown = turndown.translate(elementNode.outerHTML);
    const markdownNodesFragment = document2.createRange().createContextualFragment(markdown);
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
    elementNode.replaceWith(...[document2.createTextNode(" "), ...replacingNodes, document2.createTextNode(" ")]);
    const sourceTagName = elementNode.tagName.toLowerCase();
    return replacingNodes.filter((n) => n.nodeType !== NodeType.ELEMENT_NODE || n.tagName.toLowerCase() !== sourceTagName);
  }
  function snapTextNode(textNode, rT2) {
    if (textNode.nodeType !== NodeType.TEXT_NODE) return;
    const text = textNode.textContent;
    if (!(text ?? "").trim().length) return;
    const leadingSpace = WHITESPACE_REGEX.test(text.charAt(0)) ? " " : "";
    const trailingSpace = WHITESPACE_REGEX.test(text.charAt(text.length - 1)) ? " " : "";
    textNode.textContent = [
      leadingSpace,
      transformWithTextRank(text, 1 - rT2, !!optionsWithDefaults.skip?.textRank, true, optionsWithDefaults.textRankOptions),
      trailingSpace
    ].join("");
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
  if (optionsWithDefaults.uniqueIDs) {
    let i = 0;
    traverseDom(
      rootElement,
      NodeFilter.SHOW_ELEMENT,
      (node) => {
        const elementNode = node;
        if (isInlineElement(elementNode.tagName) && isVoidElement(elementNode.tagName)) return;
        elementNode.setAttribute(CONFIG.uniqueAttributeName, i.toString());
        i++;
      }
    );
  }
  t0 = t();
  const inertDoc = document.implementation.createHTMLDocument("");
  const virtualDOM = inertDoc.importNode(rootElement, true);
  timings.clone = t() - t0;
  t0 = t();
  preProcessDOM(virtualDOM, inertDoc, {
    filter: optionsWithDefaults.filter,
    normalize: optionsWithDefaults.normalize
  }, _isActionableElement);
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
  traverseDom(
    virtualDOM,
    NodeFilter.SHOW_TEXT,
    (node) => snapTextNode(node, rT)
  );
  timings.textNodes = t() - t0;
  t0 = t();
  traverseDom(
    virtualDOM,
    NodeFilter.SHOW_ELEMENT,
    (node) => snapElementTextFormattingNode(inertDoc, node),
    true
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
    filter: optionsWithDefaults.filter,
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
        return getHTML("innerHTML").length;
      },
      get sizeRatio() {
        return getHTML("innerHTML").length / originalSize;
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
  isActionableElement
};
