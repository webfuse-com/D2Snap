import { transformWithTextRank } from "./TextRank.js";
import { Turndown } from "./Turndown.js";
import {
  NodeFilter,
  NodeType
} from "./types.js";
import { CONFIG } from "./var.CONFIG.js";
import { VOID_TAG_NAMES } from "./var.SEMANTICS_TAGS.js";
import { DEFAULT_CLASS_ACTIONABLE_TAG_NAMES, DEFAULT_CLASS_TEXT_TAG_NAMES } from "./var.DEFAULTS_TAGS.js";
import { ACTIONABLE_ROLE_ATTRIBUTE_VALUES } from "./var.SEMANTICS_ATTRIBUTES.js";
import { DEFAULT_ATTRIBUTE_SCORING } from "./var.DEFAULTS_ATTRIBUTE_SCORING.js";
import { resolveDocument, resolveRoot, traverseDom } from "./util.dom.js";
import { postProcessDOM, postProcessHTML, preProcessDOM } from "./D2Snap.processing.js";
const WHITESPACE_REGEX = /^\s$/;
const COLON_SCHEME_TAG_REGEX = /^[a-z][a-z0-9+.-]*:(?![a-z_][a-z0-9_.-]*$)/i;
function validateUnitParameter(name, value) {
  if (value < 0 || value > 1) {
    throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
  }
}
function d2Snap(dom, rE, rA, rT, options = {}) {
  validateUnitParameter("rE", rE);
  validateUnitParameter("rA", rA);
  validateUnitParameter("rT", rT);
  const optionsWithDefaults = {
    debug: false,
    filter: void 0,
    labelToText: void 0,
    minify: true,
    textRankOptions: void 0,
    uniqueIDs: false,
    ...options,
    attributeScores: {
      ...DEFAULT_ATTRIBUTE_SCORING,
      ...options.attributeScoring ?? {},
      // deprecated
      ...options.attributeScores ?? {}
    },
    elementClasses: {
      actionables: DEFAULT_CLASS_ACTIONABLE_TAG_NAMES,
      text: DEFAULT_CLASS_TEXT_TAG_NAMES,
      ...options.elementClasses ?? {}
    },
    skip: {
      markdown: false,
      textRank: false,
      ...options.skip ?? {}
    }
  };
  const attributeScoring = new Map(
    Object.entries(optionsWithDefaults.attributeScores).map((entry) => [entry[0].toLowerCase(), entry[1]])
  );
  const actionableElementTagNames = new Set(
    (optionsWithDefaults.elementClasses?.actionables ?? []).map((tagName) => tagName.toUpperCase())
  );
  const textElementTagNames = new Set(
    (optionsWithDefaults.elementClasses?.text ?? []).map((tagName) => tagName.toUpperCase())
  );
  const actionableRoleAttributeValues = new Set(
    ACTIONABLE_ROLE_ATTRIBUTE_VALUES.map((t2) => t2.toLowerCase())
  );
  const hasMDRetainTagName = (elementNode) => {
    return actionableElementTagNames.has(elementNode.tagName.toUpperCase());
  };
  const hasActionableRole = (elementNode) => {
    return actionableRoleAttributeValues.has(elementNode.getAttribute("role")?.toLowerCase() ?? "");
  };
  const isActionable = (elementNode) => {
    return actionableElementTagNames.has(elementNode.tagName.toUpperCase()) || hasActionableRole(elementNode);
  };
  const turndown = new Turndown([hasMDRetainTagName, hasActionableRole]);
  function snapElementContainerNode(elementNode, rE2) {
    const considerContainerElement = (elementNode2) => {
      if (elementNode2.nodeType !== NodeType.ELEMENT_NODE) return false;
      if (isActionable(elementNode2)) return false;
      if (VOID_TAG_NAMES.has(elementNode2.tagName.toUpperCase())) return false;
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
    if (isActionable(elementNode)) return;
    if (!textElementTagNames.has(elementNode.tagName.toUpperCase())) return;
    const markdown = turndown.translate(elementNode.outerHTML);
    const markdownNodesFragment = resolveDocument(dom).createRange().createContextualFragment(markdown);
    const replacingNodes = [...markdownNodesFragment.childNodes];
    elementNode.replaceWith(...[document2.createTextNode(" "), ...replacingNodes, document2.createTextNode(" ")]);
    const sourceTagName = elementNode.tagName.toLowerCase();
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
    return replacingNodes.filter((n) => n.nodeType !== NodeType.ELEMENT_NODE || n.tagName.toLowerCase() !== sourceTagName);
  }
  function snapTextNode(textNode, rT2) {
    if (textNode.nodeType !== NodeType.TEXT_NODE) return;
    const text = textNode?.innerText ?? textNode.textContent;
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
      let normalizedName = attr.name;
      if (!attributeScoring.has(normalizedName)) {
        if (normalizedName.includes("-")) {
          normalizedName = `${normalizedName.split("-").slice(0, -1).join("-")}-*`;
        }
      }
      const attributeScore = attributeScoring.get(normalizedName.toLowerCase()) ?? attributeScoring.get(CONFIG.attributeScoringFallbackKey) ?? 0;
      if (attributeScore >= rA2) continue;
      elementNode.removeAttribute(attr.name);
    }
  }
  const document = resolveDocument(dom);
  if (!document) throw new ReferenceError("Could not resolve a valid document object from DOM");
  const rootElement = resolveRoot(dom);
  const originalSize = rootElement.innerHTML.length;
  const t = optionsWithDefaults.debug ? performance.now.bind(performance) : () => 0;
  let t0;
  const timings = {};
  t0 = t();
  const virtualDom = rootElement.cloneNode(true);
  timings.clone = t() - t0;
  t0 = t();
  preProcessDOM(virtualDom, document, {
    filter: optionsWithDefaults.filter,
    labelToText: optionsWithDefaults.labelToText,
    uniqueIDs: optionsWithDefaults.uniqueIDs
  });
  timings.preProcessing = t() - t0;
  let domTreeHeight = 0;
  traverseDom(
    virtualDom,
    NodeFilter.SHOW_ELEMENT,
    (node) => {
      const depth = (node.parentNode.depth ?? 0) + 1;
      node.depth = depth;
      domTreeHeight = Math.max(depth, domTreeHeight);
    }
  );
  timings.writeDepth = t() - t0;
  t0 = t();
  traverseDom(
    virtualDom,
    NodeFilter.SHOW_TEXT,
    (node) => snapTextNode(node, rT)
  );
  timings.textNodes = t() - t0;
  t0 = t();
  traverseDom(
    virtualDom,
    NodeFilter.SHOW_ELEMENT,
    (node) => snapElementTextFormattingNode(document, node)
  );
  timings.textFormatting = t() - t0;
  t0 = t();
  traverseDom(
    virtualDom,
    NodeFilter.SHOW_ELEMENT,
    (node) => snapElementContainerNode(node, rE)
  );
  timings.containers = t() - t0;
  t0 = t();
  traverseDom(
    virtualDom,
    NodeFilter.SHOW_ELEMENT,
    (node) => snapAttributeNode(node, rA)
    // work on parent element
  );
  timings.attributes = t() - t0;
  if (rE === 1) {
    [...virtualDom.querySelectorAll("*")].filter((elementNode) => !isActionable(elementNode)).forEach((element) => {
      element.replaceWith(...element.childNodes);
    });
  }
  t0 = t();
  postProcessDOM(virtualDom, {
    filter: optionsWithDefaults.filter
  }, isActionable);
  timings.domPostProcessing = t() - t0;
  t0 = t();
  let htmlSnapshot = virtualDom.innerHTML;
  timings.serialize = t() - t0;
  t0 = t();
  htmlSnapshot = postProcessHTML(htmlSnapshot, {
    debug: optionsWithDefaults.debug,
    minify: optionsWithDefaults.minify
  });
  timings.htmlPostProcessing = t() - t0;
  return {
    html: htmlSnapshot,
    meta: {
      originalSize,
      snapshotSize: htmlSnapshot.length,
      sizeRatio: htmlSnapshot.length / originalSize,
      tokenEstimate: Math.round(htmlSnapshot.length / 4),
      // according to https://platform.openai.com/tokenizer
      ...optionsWithDefaults.debug && { timings }
    }
  };
}
export {
  d2Snap
};
