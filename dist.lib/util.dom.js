import { NodeFilter, Node as NodeType } from "./types.js";
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
async function traverseDom(root, filter = NodeFilter.SHOW_ALL, cb) {
  const showElement = (filter & NodeFilter.SHOW_ELEMENT) !== 0;
  const showText = (filter & NodeFilter.SHOW_TEXT) !== 0;
  const showComment = (filter & NodeFilter.SHOW_COMMENT) !== 0;
  const nodes = [];
  const stack = [];
  for (let i = root.childNodes.length - 1; i >= 0; i--) {
    stack.push(root.childNodes[i]);
  }
  while (stack.length) {
    const node = stack.pop();
    const passes = filter === NodeFilter.SHOW_ALL || node.nodeType === NodeType.ELEMENT_NODE && showElement || node.nodeType === NodeType.TEXT_NODE && showText || node.nodeType === NodeType.COMMENT_NODE && showComment;
    passes && nodes.push(node);
    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }
  while (nodes.length) {
    await cb(nodes.shift());
  }
}
export {
  ensureDOM,
  resolveDocument,
  resolveRoot,
  traverseDom
};
