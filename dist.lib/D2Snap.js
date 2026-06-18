import { GroundTruth } from "./GroundTruth.js";
import { transform } from "./TextRank.js";
import { Turndown } from "./Turndown.js";
import {
  NodeFilter,
  NodeType
} from "./types.js";
import { resolveDocument, resolveRoot, traverseDom } from "./util.dom.js";
import { formatHTML } from "./util.html.js";
import { mergeJSONs } from "./util.json.js";
import { CONFIG } from "./var.CONFIG.js";
import { FILTERED_TAG_NAMES as DEFAULT_FILTERED_TAG_NAMES } from "./var.FILTERED_TAG_NAMES.js";
import { GROUND_TRUTH as DEFAULT_GROUND_TRUTH } from "./var.GROUND_TRUTH.js";
const DATA_URL_ATTRIBUTE_NAME = "src";
const DATA_URL_ATTRIBUTE_VALUE_REGEX = /^data:/i;
const WHITESPACE_REGEX = /^\s$/;
const COLON_SCHEME_TAG_REGEX = /^[a-z][a-z0-9+.-]*:(?![a-z_][a-z0-9_.-]*$)/i;
const VOID_ELEMENT_TAG_NAMES = /* @__PURE__ */ new Set([
  "AREA",
  "BASE",
  "BR",
  "COL",
  "EMBED",
  "HR",
  "IMG",
  "INPUT",
  "LINK",
  "META",
  "PARAM",
  "SOURCE",
  "TRACK",
  "WBR"
]);
const ACTIONABLE_ROLE_ATTRIBUTE_VALUES = /* @__PURE__ */ new Set([
  "button",
  "checkbox",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "textbox",
  "combobox",
  "listbox"
]);
function validateParameter(name, value, allowInfinity = false) {
  if (allowInfinity && value === Infinity) return;
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
  validateParameter("rE", rE, true);
  validateParameter("rA", rA);
  validateParameter("rT", rT);
  const optionsWithDefaults = {
    debug: false,
    groundTruth: DEFAULT_GROUND_TRUTH,
    groundTruthReplaceDefault: false,
    filterDataURLs: true,
    filterEmptyElements: false,
    filteredTagNames: DEFAULT_FILTERED_TAG_NAMES,
    skipMarkdown: false,
    skipTextRank: false,
    textRankOptions: {},
    uniqueIDs: false,
    ...options
  };
  const groundTruth = new GroundTruth(
    !optionsWithDefaults.groundTruthReplaceDefault ? mergeJSONs(DEFAULT_GROUND_TRUTH, optionsWithDefaults.groundTruth) : optionsWithDefaults.groundTruth
  );
  const filteredTagNames = new Set(
    optionsWithDefaults.filteredTagNames.map((t2) => t2.toUpperCase())
  );
  const mdRetainedTagNames = new Set(
    groundTruth.getElementsByType("actionable").map((tagName) => tagName.toUpperCase())
  );
  function hasMDRetainTagName(elementNode) {
    return mdRetainedTagNames.has(elementNode.tagName.toUpperCase());
  }
  function hasActionableRole(elementNode) {
    return ACTIONABLE_ROLE_ATTRIBUTE_VALUES.has(elementNode.getAttribute("role")?.toLowerCase() ?? "");
  }
  const turndown = new Turndown([hasMDRetainTagName, hasActionableRole]);
  function snapElementContainerNode(document2, elementNode, rE2, domTreeHeight2) {
    if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
    if (hasActionableRole(elementNode)) return;
    if (VOID_ELEMENT_TAG_NAMES.has(elementNode.tagName.toUpperCase())) return;
    const considerContainerElement = (elementNode2) => {
      if (groundTruth.isElementType("container", elementNode2.tagName)) return true;
      if (optionsWithDefaults.skipMarkdown && groundTruth.isElementType("textFormatting", elementNode2.tagName)) return true;
      if (elementNode2.tagName.includes("-")) return true;
      return false;
    };
    if (!considerContainerElement(elementNode)) return;
    if (!elementNode.parentElement || !considerContainerElement(elementNode.parentElement)) return;
    const mergeLevels = Math.max(
      Math.round(domTreeHeight2 * Math.min(1, rE2)),
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
        try {
          targetElement.setAttribute(attr.name, attr.value);
        } catch (e) {
          if (e.name !== "InvalidCharacterError") throw e;
        }
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
        const child = before[i];
        if (targetElement.childNodes.length && i === before.length - 1) {
          if (child.nodeType === NodeType.TEXT_NODE) {
            child.textContent = `${child.textContent} `;
          } else {
            child.appendChild(document2.createTextNode(" "));
          }
        }
        targetElement.insertBefore(child, targetElement.firstChild);
      }
      for (let i = 0; i < after.length; i++) {
        const child = after[i];
        if (targetElement.childNodes.length && i === 0) {
          if (child.nodeType === NodeType.TEXT_NODE) {
            child.textContent = ` ${child.textContent}`;
          } else {
            child.insertBefore(document2.createTextNode(" "), child.firstChild);
          }
        }
        targetElement.appendChild(child);
      }
      targetElement.depth = sourceElement.depth;
      sourceElement.parentNode?.insertBefore(targetElement, sourceElement);
    }
    sourceElement.parentNode?.removeChild(sourceElement);
  }
  function snapElementReplaceWithLabelNode(document2, elementNode) {
    if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
    if (!groundTruth.isElementType("replaceWithLabel", elementNode.tagName)) return;
    let label = null;
    for (const attrName of groundTruth.getLabelAttrs()) {
      const value = elementNode.getAttribute(attrName);
      const trimmed = (value ?? "").trim();
      if (trimmed) {
        label = trimmed;
        break;
      }
    }
    if (!label) {
      for (const child of Array.from(elementNode.children)) {
        if (!groundTruth.isLabelChildTag(child.tagName)) continue;
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
  function snapElementTextFormattingNode(document2, elementNode) {
    if (elementNode.nodeType !== NodeType.ELEMENT_NODE) return;
    if (hasActionableRole(elementNode)) return;
    if (!groundTruth.isElementType("textFormatting", elementNode.tagName)) return;
    if (optionsWithDefaults.skipMarkdown) return;
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
      if (groundTruth.getAttributeRating(attr.name) >= rA2) continue;
      elementNode.removeAttribute(attr.name);
    }
  }
  const document = resolveDocument(dom);
  if (!document) throw new ReferenceError("Could not resolve a valid document object from DOM");
  const rootElement = resolveRoot(dom);
  const originalSize = rootElement.innerHTML.length;
  const t = optionsWithDefaults.debug ? performance.now.bind(performance) : () => 0;
  let t0 = t();
  const timings = { uniqueIDs: 0, clone: 0, init: 0, replaceWithLabel: 0, textNodes: 0, textFormatting: 0, containers: 0, attributes: 0, serialize: 0, minify: 0, formatDebugOnly: 0 };
  let n = 0;
  optionsWithDefaults.uniqueIDs && traverseDom(
    rootElement,
    NodeFilter.SHOW_ELEMENT,
    (elementNode) => {
      if (!groundTruth.isElementType("container", elementNode.tagName) && !groundTruth.isElementType("actionable", elementNode.tagName)) return;
      elementNode.setAttribute(CONFIG.uniqueAttributeName, (n++).toString());
    }
  );
  timings.uniqueIDs = t() - t0;
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
  t0 = t();
  if (groundTruth.getElementsByType("replaceWithLabel").length) {
    traverseDom(
      virtualDom,
      NodeFilter.SHOW_ELEMENT,
      (node) => snapElementReplaceWithLabelNode(document, node)
    );
  }
  timings.replaceWithLabel = t() - t0;
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
    (node) => snapElementContainerNode(document, node, rE, domTreeHeight)
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
          if (groundTruth.isElementType("actionable", elementNode.tagName)) return;
          if (hasActionableRole(elementNode)) return;
          if (elementNode.children.length || elementNode.textContent.trim().length) return;
          elementNode.remove();
          hasRemovedElement = true;
        }
      );
    } while (hasRemovedElement);
  }
  if (rE === Infinity) {
    [...virtualDom.children].forEach((element) => {
      element.replaceWith(...element.childNodes);
    });
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
