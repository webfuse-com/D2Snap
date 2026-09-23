import { NodeFilter, NodeType } from "./types.js";
import { CONFIG } from "./var.CONFIG.js";
import { DEFAULT_FILTER_TAG_NAMES, DEFAULT_LABEL_TO_TEXT_TAG_NAMES } from "./var.DEFAULTS_TAGS.js";
import { traverseDom } from "./util.dom.js";
import { formatHTML, isVoidElement } from "./util.html.js";
const DATA_URL_ATTRIBUTE_NAME = "src";
const DATA_URL_ATTRIBUTE_VALUE_REGEX = /^data:/i;
function tagNamesToNormalizedSet(tagNames) {
  return new Set(
    tagNames.map((tagName) => tagName.toUpperCase())
  );
}
function liftImageDescription(document, elementNode) {
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
    elementNode.replaceWith(document.createTextNode(label));
  } else {
    elementNode.remove();
  }
}
function preProcessDOM(domRoot, document, options) {
  const optionsWithDefaults = {
    uniqueIDs: false,
    ...options,
    filter: {
      dataURLs: true,
      tagNames: DEFAULT_FILTER_TAG_NAMES,
      ...options.filter ?? {}
    },
    labelToText: {
      iconFonts: true,
      tagNames: DEFAULT_LABEL_TO_TEXT_TAG_NAMES,
      ...options.labelToText ?? {}
    }
  };
  const filterTagNames = tagNamesToNormalizedSet(optionsWithDefaults.filter?.tagNames ?? []);
  const labelToTextTagNames = tagNamesToNormalizedSet(optionsWithDefaults.labelToText?.tagNames ?? []);
  let i = 0;
  traverseDom(
    domRoot,
    NodeFilter.SHOW_ALL,
    (node) => {
      if (node.nodeType === NodeType.COMMENT_NODE) {
        node.parentNode?.removeChild(node);
        return;
      }
      if (node.nodeType !== NodeType.ELEMENT_NODE) return;
      const elementNode = node;
      if (filterTagNames.has(elementNode.tagName.toUpperCase())) {
        elementNode.remove();
        return;
      }
      if (optionsWithDefaults.uniqueIDs) {
        elementNode.setAttribute(CONFIG.uniqueAttributeName, i.toString());
        i++;
      }
      if (optionsWithDefaults.filter?.dataURLs ?? []) {
        for (const attr of Array.from(elementNode.attributes)) {
          if (attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME || !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)) continue;
          elementNode.removeAttribute(attr.name);
        }
      }
      if (labelToTextTagNames.has(elementNode.tagName.toUpperCase())) {
        liftImageDescription(document, elementNode);
      }
    }
  );
}
function postProcessDOM(domRoot, options, isActionableElement) {
  const optionsWithDefaults = {
    filter: {
      emptyElements: true,
      ...options.filter ?? {}
    }
  };
  if (optionsWithDefaults.filter?.emptyElements ?? []) {
    let hasRemovedElement;
    do {
      hasRemovedElement = false;
      traverseDom(
        domRoot,
        NodeFilter.SHOW_ELEMENT,
        (elementNode) => {
          if (isActionableElement(elementNode)) return;
          if (isVoidElement(elementNode.tagName)) return;
          if (elementNode.children.length || elementNode.textContent.trim().length) return;
          elementNode.remove();
          hasRemovedElement = true;
        }
      );
    } while (hasRemovedElement);
  }
}
function postProcessHTML(html, options) {
  const optionsWithDefaults = {
    debug: false,
    minify: true,
    ...options
  };
  let processedHTML = html;
  if (optionsWithDefaults.minify) {
    processedHTML = processedHTML.replace(/\s+/g, " ").replace(/>\s+</g, "><").replace(/\s+>/g, ">").replace(/<\s+/g, "<").replace(/\s+\/>/g, "/>").trim();
  }
  if (optionsWithDefaults.debug) {
    processedHTML = formatHTML(processedHTML);
  }
  return processedHTML;
}
export {
  postProcessDOM,
  postProcessHTML,
  preProcessDOM
};
