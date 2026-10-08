import { NodeFilter, NodeType } from "./types.js";
import { minifyDOM, traverseDom } from "./util.dom.js";
import { formatHTML, isRawTextElement, isVoidElement } from "./util.html.js";
import { NON_RENDERED_TAG_NAMES, SVG_LABEL_TAG_NAMES } from "./var.SEMANTICS_TAGS.js";
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
function hasRenderedText(node) {
  for (const child of node.childNodes) {
    if (child.nodeType === NodeType.TEXT_NODE) {
      if ((child.nodeValue ?? "").trim()) return true;
      continue;
    }
    if (child.nodeType !== NodeType.ELEMENT_NODE) continue;
    if (NON_RENDERED_TAG_NAMES.has(normalizeCaseInsensitive(child.tagName))) continue;
    if (hasRenderedText(child)) return true;
  }
  return false;
}
function elementHasNoTextContent(elementNode) {
  return !hasRenderedText(elementNode) && ![...elementNode.querySelectorAll("img[alt]")].some((image) => !!resolveAttributeAsString(image, "alt"));
}
function resolveAttributeAsString(elementNode, attributeName) {
  return (elementNode.getAttribute(attributeName) ?? "").trim();
}
function resolveIdReferenceText(elementNode, document, id) {
  const selector = `[id="${id.replace(/["\\]/g, "\\$&")}"]`;
  const scopes = [elementNode.getRootNode(), document];
  for (const scope of scopes) {
    for (const candidate of scope.querySelectorAll?.(selector) ?? []) {
      const text = (candidate.textContent ?? "").trim();
      if (text) return text;
    }
  }
  return "";
}
function getElementLabelAttribute(elementNode, document, labelAttributeNames) {
  for (const labelAttributeName of labelAttributeNames) {
    const labelAttributeValue = resolveAttributeAsString(elementNode, labelAttributeName);
    if (!labelAttributeValue) continue;
    if (normalizeCaseInsensitive(labelAttributeName) !== normalizeCaseInsensitive("aria-labelledby")) {
      return labelAttributeValue;
    }
    const referencedText = labelAttributeValue.split(/\s+/).map((id) => resolveIdReferenceText(elementNode, document, id)).filter(Boolean).join(" ");
    if (referencedText) return referencedText;
  }
  return null;
}
function createImage(document, alt = "") {
  const imgSubstituteElementNode = document.createElement("img");
  alt && imgSubstituteElementNode.setAttribute("alt", alt);
  return imgSubstituteElementNode;
}
function replaceElementByImage(elementNode, document, alt = "") {
  const imgSubstituteElementNode = createImage(document, alt);
  elementNode.replaceWith(imgSubstituteElementNode);
  return imgSubstituteElementNode;
}
function preProcessDOM(domRoot, document, options, isActionableElement) {
  const filterElementsTagNames = new Set(normalizeCaseInsensitiveArray(options.filter?.elements ?? []));
  const filterAttributesNames = new Set(normalizeCaseInsensitiveArray(options.filter?.attributes ?? []));
  const iconfontsFromNames = options.normalize?.iconfontsFromNames ?? [];
  const labelsFromAttributes = options.normalize?.labelsFromAttributes ?? [];
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
      if (filterElementsTagNames.has(normalizeCaseInsensitive(elementNode.tagName))) {
        elementNode.remove();
        return;
      }
      if (options.filter?.emptyElements) {
        if (elementHasTagName(elementNode, "IMG") && !getElementLabelAttribute(elementNode, document, labelsFromAttributes)) {
          if (!resolveAttributeAsString(elementNode, "src") && !resolveAttributeAsString(elementNode, "alt")) {
            elementNode.remove();
            return;
          }
        }
      }
      for (const attr of [...elementNode.attributes]) {
        if (filterAttributesNames.has(normalizeCaseInsensitive(attr.name))) {
          elementNode.removeAttribute(attr.name);
        }
      }
      if (options.filter?.dataURLs) {
        for (const attr of Array.from(elementNode.attributes)) {
          if (attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME || !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)) continue;
          elementNode.removeAttribute(attr.name);
        }
      }
      if (elementHasTagName(elementNode, "SVG")) {
        if (options.normalize?.svgToImg) {
          let labelValue = "";
          for (const svgLabelTagName of SVG_LABEL_TAG_NAMES) {
            labelValue = (elementNode.querySelector(svgLabelTagName.toLowerCase())?.textContent ?? "").trim();
            if (labelValue) break;
          }
          labelValue ||= getElementLabelAttribute(elementNode, document, labelsFromAttributes) ?? "";
          return [replaceElementByImage(elementNode, document, labelValue)];
        }
      } else if (iconfontsFromNames.length) {
        if (elementHasNoTextContent(elementNode) && elementNode.children.length === 0) {
          let iconfontsInClass = null;
          for (const className of [...elementNode.classList].reverse()) {
            const iconfontName = iconfontsFromNames.find((name) => {
              return className.startsWith(`${name}${UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER}`);
            });
            if (!iconfontName) continue;
            iconfontsInClass = className.slice(iconfontName.length + UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER.length);
            break;
          }
          if (iconfontsInClass) {
            const alt = getElementLabelAttribute(elementNode, document, labelsFromAttributes) ?? iconfontsInClass;
            if (!isActionableElement(elementNode)) {
              return [replaceElementByImage(elementNode, document, alt)];
            } else {
              elementNode.prepend(createImage(document, alt));
            }
          }
        }
      }
      if (labelsFromAttributes.length) {
        if (!isRawTextElement(elementNode.tagName)) {
          const labelAttributeValue = getElementLabelAttribute(elementNode, document, labelsFromAttributes);
          if (labelAttributeValue) {
            if (elementHasTagName(elementNode, "IMG")) {
              const altAttributeValue = resolveAttributeAsString(elementNode, "alt");
              !altAttributeValue && elementNode.setAttribute("alt", labelAttributeValue);
            } else if (!isVoidElement(elementNode.tagName)) {
              elementHasNoTextContent(elementNode) && elementNode.prepend(labelAttributeValue);
            }
          }
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
        },
        true
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
