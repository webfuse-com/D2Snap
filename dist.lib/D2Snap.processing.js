import { NodeType, NodeFilter } from "./enums.js";
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
  const iconClasses = options.normalize?.iconClasses ?? [];
  const labelAttributes = options.normalize?.labelAttributes ?? [];
  const preResolvedLabels = /* @__PURE__ */ new WeakMap();
  for (const referrer of document.querySelectorAll("[aria-labelledby]")) {
    const label = getElementLabelAttribute(referrer, document, labelAttributes);
    label && preResolvedLabels.set(referrer, label);
  }
  const resolveLabel = (element) => {
    return preResolvedLabels.get(element) ?? getElementLabelAttribute(element, document, labelAttributes);
  };
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
      if (options.filter?.emptyElements) {
        if (elementHasTagName(elementNode, "IMG") && !resolveLabel(elementNode)) {
          if (!resolveAttributeAsString(elementNode, "src") && !resolveAttributeAsString(elementNode, "alt")) {
            elementNode.remove();
            return;
          }
        }
      }
      if (elementHasTagName(elementNode, "SVG")) {
        if (options.normalize?.svgToImg) {
          let labelValue = "";
          for (const svgLabelTagName of SVG_LABEL_TAG_NAMES) {
            labelValue = (elementNode.querySelector(svgLabelTagName.toLowerCase())?.textContent ?? "").trim();
            if (labelValue) break;
          }
          labelValue ||= resolveLabel(elementNode) ?? "";
          return [replaceElementByImage(elementNode, document, labelValue)];
        }
      } else if (iconClasses.length) {
        if (elementHasNoTextContent(elementNode) && elementNode.children.length === 0) {
          let iconfontsInClass = null;
          for (const className of [...elementNode.classList].reverse()) {
            const iconfontName = iconClasses.find((name) => {
              return className.startsWith(`${name}${UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER}`);
            });
            if (!iconfontName) continue;
            iconfontsInClass = className.slice(iconfontName.length + UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER.length);
            break;
          }
          if (iconfontsInClass) {
            const alt = resolveLabel(elementNode) ?? iconfontsInClass;
            if (!isActionableElement(elementNode)) {
              return [replaceElementByImage(elementNode, document, alt)];
            } else {
              elementNode.prepend(createImage(document, alt));
            }
          }
        }
      }
      if (labelAttributes.length) {
        if (!isRawTextElement(elementNode.tagName)) {
          const labelAttributeValue = resolveLabel(elementNode);
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
