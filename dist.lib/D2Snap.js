import { transform } from "./TextRank.js";
import { Turndown } from "./Turndown.js";
import {
  NodeFilter,
  NodeType
} from "./types.js";
import { resolveDocument, resolveRoot, traverseDom } from "./util.dom.js";
import { formatHTML } from "./util.html.js";
import { CONFIG } from "./var.CONFIG.js";
import {
  FILTERED_TAG_NAMES as DEFAULT_FILTERED_TAG_NAMES,
  VOID_TAG_NAMES,
  ACTIONABLE_TAG_NAMES,
  TEXT_TAG_NAMES,
  REPLACE_WITH_LABELS_TAG_NAMES
} from "./var.CLASS_TAGS.js";
import { ACTIONABLE_ROLE_ATTRIBUTE_VALUES } from "./var.CLASS_ATTRIBUTES.js";
import { ATTRIBUTE_SCORING as DEFAULT_ATTRIBUTE_SCORING } from "./var.ATTRIBUTE_SCORING.js";
const DATA_URL_ATTRIBUTE_NAME = "src";
const DATA_URL_ATTRIBUTE_VALUE_REGEX = /^data:/i;
const WHITESPACE_REGEX = /^\s$/;
const COLON_SCHEME_TAG_REGEX = /^[a-z][a-z0-9+.-]*:(?![a-z_][a-z0-9_.-]*$)/i;
function validateParameter(name, value) {
  if (value < 0 || value > 1) {
    throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
  }
}
function unwrapColonTaggedElements(parent) {
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType !== NodeType.ELEMENT_NODE) continue;
    unwrapColonTaggedElements(child);
    if (!COLON_SCHEME_TAG_REGEX.test(child.tagName)) continue;
    while (child.firstChild) {
      parent.insertBefore(child.firstChild, child);
    }
    parent.removeChild(child);
  }
}
function d2Snap(dom, rE, rA, rT, options = {}) {
  validateParameter("rE", rE);
  validateParameter("rA", rA);
  validateParameter("rT", rT);
  const optionsWithDefaults = {
    attributeScoringFallback: 0,
    debug: false,
    filterDataURLs: true,
    filterEmptyElements: false,
    filteredTagNames: DEFAULT_FILTERED_TAG_NAMES,
    liftImageDescription: true,
    skipMarkdown: false,
    skipTextRank: false,
    textRankOptions: {},
    uniqueIDs: false,
    ...options,
    attributeScoring: {
      ...DEFAULT_ATTRIBUTE_SCORING,
      ...options.attributeScoring ?? {}
    }
  };
  const attributeScoring = new Map(
    Object.entries(optionsWithDefaults.attributeScoring).map((entry) => [entry[0].toLowerCase(), entry[1]])
  );
  const filteredTagNames = new Set(
    optionsWithDefaults.filteredTagNames.map((t2) => t2.toUpperCase())
  );
  const actionableTagNames = new Set(
    ACTIONABLE_TAG_NAMES.map((tagName) => tagName.toUpperCase())
  );
  const actionableRoleAttributeValues = new Set(
    ACTIONABLE_ROLE_ATTRIBUTE_VALUES.map((t2) => t2.toLowerCase())
  );
  function hasMDRetainTagName(elementNode) {
    return actionableTagNames.has(elementNode.tagName.toUpperCase());
  }
  function hasActionableRole(elementNode) {
    return actionableRoleAttributeValues.has(elementNode.getAttribute("role")?.toLowerCase() ?? "");
  }
  const turndown = new Turndown([hasMDRetainTagName, hasActionableRole]);
  function snapElementContainerNode(elementNode, rE2) {
    if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
    if (hasActionableRole(elementNode)) return;
    if (ACTIONABLE_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;
    if (VOID_TAG_NAMES.has(elementNode.tagName.toUpperCase())) return;
    const considerContainerElement = (elementNode2) => {
      if (elementNode2.nodeType !== NodeType.ELEMENT_NODE) return false;
      if (hasActionableRole(elementNode2)) return false;
      const tagName = elementNode2.tagName.toUpperCase();
      if (VOID_TAG_NAMES.has(tagName)) return false;
      if (ACTIONABLE_TAG_NAMES.includes(tagName)) return false;
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
    if (optionsWithDefaults.skipMarkdown) return;
    if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
    if (hasActionableRole(elementNode)) return;
    if (!TEXT_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;
    const markdown = turndown.translate(elementNode.outerHTML);
    const markdownNodesFragment = resolveDocument(dom).createRange().createContextualFragment(markdown);
    unwrapColonTaggedElements(markdownNodesFragment);
    const replacingNodes = [...markdownNodesFragment.childNodes];
    elementNode.replaceWith(...[document2.createTextNode(" "), ...replacingNodes, document2.createTextNode(" ")]);
    const sourceTagName = elementNode.tagName.toLowerCase();
    return replacingNodes.filter((n2) => n2.nodeType !== NodeType.ELEMENT_NODE || n2.tagName.toLowerCase() !== sourceTagName);
  }
  function snapTextNode(textNode, rT2) {
    if (textNode.nodeType !== NodeType.TEXT_NODE) return;
    const text = textNode?.innerText ?? textNode.textContent;
    if (!(text ?? "").trim().length) return;
    const leadingSpace = WHITESPACE_REGEX.test(text.charAt(0)) ? " " : "";
    const trailingSpace = WHITESPACE_REGEX.test(text.charAt(text.length - 1)) ? " " : "";
    textNode.textContent = [
      leadingSpace,
      transform(text, 1 - rT2, optionsWithDefaults.skipTextRank, true, optionsWithDefaults.textRankOptions),
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
      const attributeScore = attributeScoring.get(normalizedName.toLowerCase()) ?? optionsWithDefaults.attributeScoringFallback;
      if (attributeScore >= rA2) continue;
      elementNode.removeAttribute(attr.name);
    }
  }
  function liftImageDescription(document2, elementNode) {
    if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
    if (!REPLACE_WITH_LABELS_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;
    let label = null;
    for (const attrName of ["aria-label", "title", "alt"]) {
      const value = elementNode.getAttribute(attrName);
      const trimmed = (value ?? "").trim();
      if (trimmed) {
        label = trimmed;
        break;
      }
    }
    if (!label) {
      for (const child of Array.from(elementNode.children)) {
        if (!["title", "desc"].includes(child.tagName)) continue;
        const trimmed = (child.textContent ?? "").trim();
        if (trimmed) {
          label = trimmed;
          break;
        }
      }
    }
    if (label !== null) {
      elementNode.replaceWith(document2.createTextNode(label));
    } else {
      elementNode.remove();
    }
  }
  const document = resolveDocument(dom);
  if (!document) throw new ReferenceError("Could not resolve a valid document object from DOM");
  const rootElement = resolveRoot(dom);
  const originalSize = rootElement.innerHTML.length;
  const t = optionsWithDefaults.debug ? performance.now.bind(performance) : () => 0;
  let t0;
  const timings = {
    uniqueIDs: 0,
    clone: 0,
    init: 0,
    liftImageDescription: 0,
    textNodes: 0,
    textFormatting: 0,
    containers: 0,
    attributes: 0,
    serialize: 0,
    minify: 0,
    formatDebugOnly: 0
  };
  t0 = t();
  const virtualDom = rootElement.cloneNode(true);
  timings.clone = t() - t0;
  let domTreeHeight = 0;
  traverseDom(
    virtualDom,
    NodeFilter.SHOW_ALL,
    (node) => {
      if (node.nodeType === NodeType.COMMENT_NODE) {
        node.parentNode?.removeChild(node);
        return;
      }
      if (node.nodeType !== NodeType.ELEMENT_NODE) return;
      const elementNode = node;
      if (filteredTagNames.has(elementNode.tagName.toUpperCase())) {
        elementNode.remove();
        return;
      }
      if (optionsWithDefaults.filterDataURLs) {
        for (const attr of Array.from(elementNode.attributes)) {
          if (attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME || !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)) continue;
          elementNode.removeAttribute(attr.name);
        }
      }
      const depth = (elementNode.parentNode.depth ?? 0) + 1;
      elementNode.depth = depth;
      domTreeHeight = Math.max(depth, domTreeHeight);
    }
  );
  timings.init = t() - t0;
  let n = 0;
  optionsWithDefaults.uniqueIDs && traverseDom(
    rootElement,
    NodeFilter.SHOW_ELEMENT,
    (elementNode) => {
      elementNode.setAttribute(CONFIG.uniqueAttributeName, (n++).toString());
    }
  );
  timings.uniqueIDs = t() - t0;
  t0 = t();
  optionsWithDefaults.liftImageDescription && traverseDom(
    virtualDom,
    NodeFilter.SHOW_ELEMENT,
    (node) => liftImageDescription(document, node)
  );
  timings.liftImageDescription = t() - t0;
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
  if (optionsWithDefaults.filterEmptyElements) {
    let hasRemovedElement;
    do {
      hasRemovedElement = false;
      traverseDom(
        virtualDom,
        NodeFilter.SHOW_ELEMENT,
        (elementNode) => {
          if (ACTIONABLE_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;
          if (hasActionableRole(elementNode)) return;
          if (elementNode.children.length || elementNode.textContent.trim().length) return;
          elementNode.remove();
          hasRemovedElement = true;
        }
      );
    } while (hasRemovedElement);
  }
  if (rE === 1) {
    const dissolveToplevelTags = (rootElement2) => {
      [...rootElement2.children].forEach((element) => {
        element.replaceWith(...element.childNodes);
      });
    };
    dissolveToplevelTags(virtualDom);
    [
      ...virtualDom.querySelectorAll(ACTIONABLE_TAG_NAMES.join(", ")),
      ...virtualDom.querySelectorAll(
        [...ACTIONABLE_ROLE_ATTRIBUTE_VALUES].map((role) => `[role="${role}"]`).join(", ")
      )
    ].forEach((actionableElement) => dissolveToplevelTags(actionableElement));
  }
  t0 = t();
  const snapshot = virtualDom.innerHTML;
  timings.serialize = t() - t0;
  t0 = t();
  let html = snapshot.replace(/\s+/g, " ").replace(/>\s+</g, "><").replace(/\s+>/g, ">").replace(/<\s+/g, "<").replace(/\s+\/>/g, "/>").trim();
  timings.minify = t() - t0;
  if (optionsWithDefaults.debug) {
    t0 = t();
    html = formatHTML(html);
    timings.formatDebugOnly = t() - t0;
  }
  return {
    html,
    meta: {
      originalSize,
      snapshotSize: snapshot.length,
      sizeRatio: snapshot.length / originalSize,
      tokenEstimate: Math.round(snapshot.length / 4),
      // according to https://platform.openai.com/tokenizer
      ...optionsWithDefaults.debug && { timings }
    }
  };
}
export {
  d2Snap
};
