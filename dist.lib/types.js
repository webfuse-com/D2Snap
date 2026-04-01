// src/types.ts
var NodeFilter = /* @__PURE__ */ ((NodeFilter2) => {
  NodeFilter2[NodeFilter2["SHOW_ALL"] = 4294967295] = "SHOW_ALL";
  NodeFilter2[NodeFilter2["SHOW_ELEMENT"] = 1] = "SHOW_ELEMENT";
  NodeFilter2[NodeFilter2["SHOW_ATTRIBUTE"] = 2] = "SHOW_ATTRIBUTE";
  NodeFilter2[NodeFilter2["SHOW_COMMENT"] = 128] = "SHOW_COMMENT";
  NodeFilter2[NodeFilter2["SHOW_TEXT"] = 4] = "SHOW_TEXT";
  return NodeFilter2;
})(NodeFilter || {});
var Node = /* @__PURE__ */ ((Node2) => {
  Node2[Node2["ELEMENT_NODE"] = 1] = "ELEMENT_NODE";
  Node2[Node2["ATTRIBUTE_NODE"] = 2] = "ATTRIBUTE_NODE";
  Node2[Node2["TEXT_NODE"] = 3] = "TEXT_NODE";
  return Node2;
})(Node || {});
export {
  Node,
  NodeFilter
};
