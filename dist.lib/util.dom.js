import { NodeFilter, NodeType } from "./types.js";
import { isInlineElement, isRawTextElement } from "./util.html.js";
async function ensureDOM(domOrString) {
  if (typeof domOrString !== "string") return domOrString;
  if (typeof window !== "undefined") {
    return new DOMParser().parseFromString(domOrString, "text/html");
  }
  try {
    const jsdom = await import("jsdom");
    const dom = new jsdom.JSDOM(domOrString);
    return dom.window.document;
  } catch (err) {
    if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;
    throw new ReferenceError("Install 'jsdom' to use D2Snap with a non-browser runtime");
  }
}
function resolveDocument(dom) {
  let doc;
  try {
    const doc2 = (window ?? {}).document;
    if (doc2) return doc2;
  } catch {
  }
  doc = dom;
  while (doc) {
    if ("createTreeWalker" in doc) return doc;
    doc = doc?.parentNode;
  }
  return null;
}
function resolveRoot(node) {
  return node?.body ?? node?.documentElement ?? node;
}
function traverseDom(root, filter = NodeFilter.SHOW_ALL, cb) {
  const showElement = (filter & NodeFilter.SHOW_ELEMENT) !== 0;
  const showText = (filter & NodeFilter.SHOW_TEXT) !== 0;
  const showComment = (filter & NodeFilter.SHOW_COMMENT) !== 0;
  const stack = [];
  for (let i = root.childNodes.length - 1; i >= 0; i--) {
    stack.push(root.childNodes[i]);
  }
  while (stack.length) {
    const node = stack.pop();
    const children = [...node.childNodes];
    const childIndex = stack.length;
    const childCount = children.length;
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
    const passes = filter === NodeFilter.SHOW_ALL || node.nodeType === NodeType.ELEMENT_NODE && showElement || node.nodeType === NodeType.TEXT_NODE && showText || node.nodeType === NodeType.COMMENT_NODE && showComment;
    if (!passes) continue;
    const replacingNodes = cb(node);
    if (!replacingNodes?.length) continue;
    stack.splice(childIndex, childCount, ...[...replacingNodes].reverse());
  }
}
function minifyDOM(domRoot) {
  traverseDom(
    domRoot,
    NodeFilter.SHOW_TEXT,
    (textNode) => {
      const parent = textNode.parentElement;
      if (!parent) return;
      if (isRawTextElement(parent.tagName.toLowerCase())) return;
      const value = textNode.nodeValue ?? "";
      if (!value) return;
      textNode.nodeValue = value.replace(/\s+/g, " ");
    }
  );
  traverseDom(
    domRoot,
    NodeFilter.SHOW_TEXT,
    (textNode) => {
      const parent = textNode.parentElement;
      if (!parent) return;
      if (isRawTextElement(parent.tagName.toLowerCase())) return;
      let value = textNode.nodeValue ?? "";
      if (!value) {
        textNode.parentNode?.removeChild(textNode);
        return;
      }
      const previous = textNode.previousSibling;
      const next = textNode.nextSibling;
      const previousIsText = previous?.nodeType === NodeType.TEXT_NODE;
      const nextIsText = next?.nodeType === NodeType.TEXT_NODE;
      const previousIsElement = previous?.nodeType === NodeType.ELEMENT_NODE;
      const nextIsElement = next?.nodeType === NodeType.ELEMENT_NODE;
      const previousTag = previousIsElement ? previous.tagName.toLowerCase() : "";
      const nextTag = nextIsElement ? next.tagName.toLowerCase() : "";
      const previousIsBR = previousIsElement && previousTag === "br";
      const nextIsBR = nextIsElement && nextTag === "br";
      const previousIsInline = previousIsText || previousIsElement && isInlineElement(previousTag);
      const nextIsInline = nextIsText || nextIsElement && isInlineElement(nextTag);
      if (value.trim() === "") {
        if (previousIsInline && nextIsInline && !previousIsBR && !nextIsBR) {
          if (previousIsText) {
            const previousText = previous;
            previousText.nodeValue = (previousText.nodeValue ?? "").trimEnd();
          }
          if (nextIsText) {
            const nextText = next;
            nextText.nodeValue = (nextText.nodeValue ?? "").trimStart();
          }
          textNode.nodeValue = " ";
          return;
        }
        textNode.parentNode?.removeChild(textNode);
        return;
      }
      if (previousIsBR) {
        value = value.trimStart();
      }
      if (nextIsBR) {
        value = value.trimEnd();
      }
      if (/^\s/.test(value) && previousIsElement && !previousIsInline) {
        value = value.trimStart();
      }
      if (/^\s/.test(value) && !previous) {
        value = value.trimStart();
      }
      if (/\s$/.test(value) && nextIsElement && !nextIsInline) {
        value = value.trimEnd();
      }
      if (/\s$/.test(value) && !next) {
        value = value.trimEnd();
      }
      textNode.nodeValue = value;
    }
  );
  traverseDom(
    domRoot,
    NodeFilter.SHOW_TEXT,
    (textNode) => {
      if (textNode.nodeValue === "") {
        textNode.parentNode?.removeChild(textNode);
      }
    }
  );
}
export {
  ensureDOM,
  minifyDOM,
  resolveDocument,
  resolveRoot,
  traverseDom
};
