import { INLINE_TAG_NAMES, RAW_TEXT_TAG_NAMES, VOID_TAG_NAMES } from "./var.SEMANTICS_TAGS.js";
function tokenize(html) {
  const tokens = [];
  const n = html.length;
  let i = 0;
  while (i < n) {
    if (html[i] !== "<") {
      const start = i;
      while (i < n && html[i] !== "<") i++;
      const raw2 = html.slice(start, i);
      if (raw2.trim()) tokens.push({
        kind: "text",
        raw: raw2
      });
      continue;
    }
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      const stop = end < 0 ? n : end + 3;
      tokens.push({
        kind: "comment",
        raw: html.slice(i, stop)
      });
      i = stop;
      continue;
    }
    const tagStart = i;
    i++;
    const isClose = html[i] === "/";
    isClose && i++;
    let quote = null;
    while (i < n) {
      const c = html[i];
      if (quote) {
        if (c === quote) quote = null;
        i++;
        continue;
      }
      if (c === '"' || c === "'") {
        quote = c;
        i++;
        continue;
      }
      if (c === ">") break;
      i++;
    }
    if (i >= n) {
      tokens.push({
        kind: "text",
        raw: html.slice(tagStart)
      });
      break;
    }
    i++;
    const raw = html.slice(tagStart, i);
    const inner = raw.slice(isClose ? 2 : 1, raw.length - 1).trim();
    const selfClosing = inner.endsWith("/");
    const tagName = (inner.match(/^[a-zA-Z][\w:-]*/)?.[0] ?? "").toUpperCase();
    if (!tagName) {
      tokens.push({
        kind: "text",
        raw
      });
      continue;
    }
    if (isClose) {
      tokens.push({
        kind: "close",
        tag: tagName,
        raw
      });
      continue;
    }
    if (isVoidElement(tagName) || selfClosing) {
      tokens.push({
        kind: "void",
        tag: tagName,
        raw
      });
      continue;
    }
    if (isRawTextElement(tagName)) {
      const rest = html.slice(i);
      const m = rest.match(new RegExp(`</${tagName}\\s*>`, "i"));
      if (!m) {
        tokens.push({ kind: "raw", tag: tagName, openRaw: raw, content: rest, closeRaw: "" });
        i = n;
        continue;
      }
      const contentEnd = i + m.index;
      const content = html.slice(i, contentEnd);
      const closeRaw = html.slice(contentEnd, contentEnd + m[0].length);
      tokens.push({
        kind: "raw",
        tag: tagName,
        openRaw: raw,
        content,
        closeRaw
      });
      i = contentEnd + m[0].length;
      continue;
    }
    tokens.push({ kind: "open", tag: tagName, raw, selfClosing: false });
  }
  return tokens;
}
function isVoidElement(tagName) {
  return VOID_TAG_NAMES.has(tagName.toUpperCase());
}
function isInlineElement(tagName) {
  return INLINE_TAG_NAMES.has(tagName.toUpperCase());
}
function isRawTextElement(tagName) {
  return RAW_TEXT_TAG_NAMES.has(tagName.toUpperCase());
}
function formatHTML(html, indentSize = 2) {
  const indent = " ".repeat(indentSize);
  const tokens = tokenize(html);
  const lines = [];
  const stack = [];
  let buffer = "";
  let bufferDepth = 0;
  const flushBuffer = () => {
    const text = buffer.replace(/\s+/g, " ").trim();
    text && lines.push(indent.repeat(bufferDepth) + text);
    buffer = "";
  };
  const emit = (line, depth) => {
    flushBuffer();
    lines.push(indent.repeat(depth) + line);
  };
  const isInline = (tagName) => {
    tagName = tagName.toUpperCase();
    return isInlineElement(tagName) || isVoidElement(tagName);
  };
  for (const token of tokens) {
    switch (token.kind) {
      case "text":
        if (buffer === "") {
          bufferDepth = stack.length;
        }
        buffer += token.raw;
        break;
      case "comment":
      case "doctype":
      case "cdata":
        emit(token.raw, stack.length);
        break;
      case "void":
        if (isInline(token.tag)) {
          if (buffer === "") {
            bufferDepth = stack.length;
          }
          buffer += token.raw;
        } else {
          emit(token.raw, stack.length);
        }
        break;
      case "raw":
        emit(`${token.openRaw}${token.content}${token.closeRaw}`, stack.length);
        break;
      case "open":
        if (isInline(token.tag)) {
          if (buffer === "") {
            bufferDepth = stack.length;
          }
          buffer += token.raw;
          stack.push(token.tag);
        } else {
          flushBuffer();
          lines.push(indent.repeat(stack.length) + token.raw);
          stack.push(token.tag);
        }
        break;
      case "close":
        if (isInline(token.tag)) {
          buffer += token.raw;
          stack[stack.length - 1] === token.tag && stack.pop();
        } else {
          while (stack.length && stack[stack.length - 1] !== token.tag) stack.pop();
          stack.length && stack.pop();
          flushBuffer();
          lines.push(indent.repeat(stack.length) + token.raw);
        }
        break;
    }
  }
  flushBuffer();
  return lines.join("\n");
}
export {
  formatHTML,
  isInlineElement,
  isRawTextElement,
  isVoidElement
};
