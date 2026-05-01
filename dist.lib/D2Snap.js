import {
  NodeFilter,
  Node
} from "./types.js";
import { traverseDom, resolveDocument, resolveRoot } from "./util.dom.js";
import { formatHTML } from "./util.html.js";
import { GroundTruth } from "./GroundTruth.js";
import { relativeTextRank } from "./TextRank.js";
import { KEEP_LINE_BREAK_MARK, turndown } from "./Turndown.js";
import { CONFIG } from "./var.CONFIG.js";
import { GROUND_TRUTH as DEFAULT_GROUND_TRUTH } from "./var.GROUND_TRUTH.js";
import { mergeJSONs } from "./util.json.js";
const PRE_FILTER_TAG_NAMES = [
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
    groundTruth: DEFAULT_GROUND_TRUTH,
    groundTruthReplaceDefault: false,
    textRankOptions: {},
    skipMarkdown: false,
    uniqueIDs: false,
    ...options
  };
  const groundTruth = new GroundTruth(
    !optionsWithDefaults.groundTruthReplaceDefault ? mergeJSONs(DEFAULT_GROUND_TRUTH, optionsWithDefaults.groundTruth) : optionsWithDefaults.groundTruth
  );
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
    if (elementNode.nodeType !== Node.ELEMENT_NODE) return;
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
    const targetElement = elements[0];
    const sourceElement = elements[1];
    if (isTopdownMerge) {
      const mergedAttributes = Array.from(targetElement.attributes);
      for (const attr of sourceElement.attributes) {
        if (mergedAttributes.some((targetAttr) => targetAttr.name === attr.name)) continue;
        mergedAttributes.push(attr);
      }
      for (const attr of targetElement.attributes) {
        targetElement.removeAttribute(attr.name);
      }
      for (const attr of mergedAttributes) {
        targetElement.setAttribute(attr.name, attr.value);
      }
    }
    if (!isTopdownMerge) {
      while (sourceElement.childNodes.length) {
        targetElement.insertBefore(sourceElement.childNodes[0], sourceElement);
      }
    } else {
      const before = [];
      const after = [];
      let isAfterTarget = false;
      for (const child of sourceElement.childNodes) {
        if (child === targetElement) {
          isAfterTarget = true;
          continue;
        }
        (isAfterTarget ? after : before).push(child);
      }
      for (let i = before.length - 1; i >= 0; i--) {
        targetElement.insertBefore(before[i], targetElement.firstChild);
      }
      for (const child of after) {
        targetElement.appendChild(child);
      }
      targetElement.depth = sourceElement.depth;
      sourceElement.parentNode?.insertBefore(targetElement, sourceElement);
    }
    sourceElement.parentNode?.removeChild(sourceElement);
  }
  function snapElementContentNode(elementNode) {
    if (elementNode.nodeType !== Node.ELEMENT_NODE) return;
    if (!groundTruth.isElementType("textFormatting", elementNode.tagName)) return;
    if (optionsWithDefaults.skipMarkdown) return;
    const markdown = turndown(elementNode.outerHTML);
    const markdownNodesFragment = resolveDocument(dom).createRange().createContextualFragment(markdown);
    elementNode.replaceWith(...markdownNodesFragment.childNodes);
  }
  function snapElementInteractiveNode(elementNode) {
    if (elementNode.nodeType !== Node.ELEMENT_NODE) return;
    if (!groundTruth.isElementType("actionable", elementNode.tagName)) return;
  }
  function snapTextNode(textNode, l) {
    if (textNode.nodeType !== Node.TEXT_NODE) return;
    const text = textNode?.innerText ?? textNode.textContent;
    textNode.textContent = relativeTextRank(text, 1 - l, optionsWithDefaults.textRankOptions, true);
  }
  function snapAttributeNode(elementNode, m) {
    if (elementNode.nodeType !== Node.ELEMENT_NODE) return;
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
    NodeFilter.SHOW_ELEMENT,
    (elementNode) => {
      if (!groundTruth.isElementType("container", elementNode.tagName) && !groundTruth.isElementType("actionable", elementNode.tagName)) return;
      elementNode.setAttribute(CONFIG.uniqueAttributeName, (n++).toString());
    }
  );
  const virtualDom = rootElement.cloneNode(true);
  await traverseDom(
    document,
    virtualDom,
    NodeFilter.SHOW_COMMENT,
    (node) => node.parentNode?.removeChild(node)
  );
  await traverseDom(
    document,
    virtualDom,
    NodeFilter.SHOW_ELEMENT,
    (elementNode) => {
      if (!PRE_FILTER_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;
      elementNode.parentNode?.removeChild(elementNode);
    }
  );
  let domTreeHeight = 0;
  await traverseDom(
    document,
    virtualDom,
    NodeFilter.SHOW_ELEMENT,
    (elementNode) => {
      const depth = (elementNode.parentNode.depth ?? 0) + 1;
      elementNode.depth = depth;
      domTreeHeight = Math.max(depth, domTreeHeight);
    }
  );
  await traverseDom(
    document,
    virtualDom,
    NodeFilter.SHOW_TEXT,
    (node) => snapTextNode(node, rT)
  );
  await traverseDom(
    document,
    virtualDom,
    NodeFilter.SHOW_ELEMENT,
    (node) => snapElementNode(node)
  );
  await traverseDom(
    document,
    virtualDom,
    NodeFilter.SHOW_ELEMENT,
    (node) => {
      if (!groundTruth.isElementType("container", node.tagName)) return;
      return snapElementContainerNode(node, rE, domTreeHeight);
    }
  );
  await traverseDom(
    document,
    virtualDom,
    NodeFilter.SHOW_ELEMENT,
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
export {
  d2Snap
};
