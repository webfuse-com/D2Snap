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
    let doc2 = (window ?? {}).document;
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
async function traverseDom(doc, root, filter = NodeFilter.SHOW_ALL, cb) {
  const resolvedDoc = resolveDocument(doc);
  if (!resolvedDoc) throw new Error("Could not resolve document");
  const walker = resolvedDoc.createTreeWalker(root, filter);
  const nodes = [];
  let node = walker.firstChild();
  while (node) {
    nodes.push(node);
    node = walker.nextNode();
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
