import { NodeFilter, NodeType } from "./types.js";
import { CONFIG } from "./var.CONFIG.js";
import { minifyDOM, traverseDom } from "./util.dom.js";
import { formatHTML, isVoidElement } from "./util.html.js";
const DATA_URL_ATTRIBUTE_NAME = "src";
const DATA_URL_ATTRIBUTE_VALUE_REGEX = /^data:/i;
const UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER = "-";
function normalizeCaseInsensitive(str) {
  return str.toUpperCase();
}
function normalizeCaseInsensitiveArray(tagNames) {
  return tagNames.map((tagName) => normalizeCaseInsensitive(tagName));
}
function elementHasTagName(elementNode, tagName) {
  return normalizeCaseInsensitive(elementNode.tagName) === normalizeCaseInsensitive(tagName);
}
function elementHasNoTextContent(elementNode) {
  return !(elementNode.textContent ?? "").trim() && !elementNode.querySelector("img[alt]:not([alt=''])");
}
function getElementLabelAttribute(elementNode, labelAttributeNames) {
  for (const labelAttributeName of labelAttributeNames) {
    const labelAttributeValue = (elementNode.getAttribute(labelAttributeName) ?? "").trim();
    if (!labelAttributeValue) continue;
    if (labelAttributeName.toLowerCase() !== "aria-labelledby") return labelAttributeValue;
    const referencedText = labelAttributeValue.split(/\s+/).map((id) => (elementNode.ownerDocument.getElementById(id)?.textContent ?? "").trim()).filter(Boolean).join(" ");
    if (referencedText) return referencedText;
  }
  return null;
}
function replaceElementByImage(elementNode, document, alt = "") {
  const imgSubstituteElementNode = document.createElement("img");
  alt && imgSubstituteElementNode.setAttribute("alt", alt);
  elementNode.replaceWith(imgSubstituteElementNode);
  return imgSubstituteElementNode;
}
function preProcessDOM(domRoot, document, options) {
  const filterElementsTagNames = new Set(normalizeCaseInsensitiveArray(options.filter?.elements ?? []));
  const filterAttributesNames = new Set(normalizeCaseInsensitiveArray(options.filter?.attributes ?? []));
  const iconfontsFromNames = options.normalize?.iconfontsFromNames ?? [];
  const labelsFromAttributes = options.normalize?.labelsFromAttributes ?? [];
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
      if (elementHasTagName(elementNode, "SVG")) {
        if (options.normalize?.svgToImg) {
          const title = (elementNode.querySelector("title")?.textContent ?? "").trim();
          const labelAttributeValue = title || getElementLabelAttribute(elementNode, labelsFromAttributes);
          if (labelAttributeValue) {
            return [replaceElementByImage(elementNode, document, labelAttributeValue)];
          }
        }
      } else if (iconfontsFromNames.length) {
        if (elementHasNoTextContent(elementNode) && elementNode.children.length === 0) {
          let iconfontsInClass = null;
          for (const className of [...elementNode.classList].reverse()) {
            const parts = className.split(UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER);
            if (parts.length < 2 || !iconfontsFromNames.includes(parts[0])) continue;
            iconfontsInClass = parts.slice(1).join(UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER);
            break;
          }
          if (iconfontsInClass) {
            const alt = getElementLabelAttribute(elementNode, labelsFromAttributes) ?? iconfontsInClass;
            return [replaceElementByImage(elementNode, document, alt)];
          }
        }
      }
      if (labelsFromAttributes.length) {
        const labelAttributeValue = getElementLabelAttribute(elementNode, labelsFromAttributes);
        if (labelAttributeValue) {
          if (elementHasTagName(elementNode, "IMG")) {
            const altAttributeValue = (elementNode.getAttribute("alt") ?? "").trim();
            !altAttributeValue && elementNode.setAttribute("alt", labelAttributeValue);
          } else if (!isVoidElement(elementNode.tagName)) {
            elementHasNoTextContent(elementNode) && elementNode.prepend(labelAttributeValue);
          }
        }
      }
      if (filterElementsTagNames.has(normalizeCaseInsensitive(elementNode.tagName))) {
        elementNode.remove();
        return;
      }
      for (const attr of [...elementNode.attributes]) {
        if (filterAttributesNames.has(normalizeCaseInsensitive(attr.name))) {
          elementNode.removeAttribute(attr.name);
        }
      }
      if (options.uniqueIDs) {
        elementNode.setAttribute(CONFIG.uniqueAttributeName, i.toString());
        i++;
      }
      if (options.filter?.dataURLs) {
        for (const attr of Array.from(elementNode.attributes)) {
          if (attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME || !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)) continue;
          elementNode.removeAttribute(attr.name);
        }
      }
    }
  );
}
function postProcessDOM(domRoot, options, isActionableElement) {
  if (options.filter?.emptyElements) {
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
  if (options.minify) {
    minifyDOM(domRoot);
  }
}
function postProcessHTML(html, options) {
  const optionsWithDefaults = {
    debug: false,
    ...options
  };
  let processedHTML = html;
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
