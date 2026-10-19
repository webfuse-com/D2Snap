"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/api.ts
  var api_exports = {};
  __export(api_exports, {
    adaptiveD2Snap: () => adaptiveD2Snap2,
    d2Snap: () => d2Snap2,
    defaults: () => constants_defaults_exports,
    normalizeDOM: () => normalizeDOM2
  });

  // src/constants.semantics.ts
  var VOID_TAG_NAMES = /* @__PURE__ */ new Set([
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
  var INLINE_TAG_NAMES = /* @__PURE__ */ new Set([
    "A",
    "ABBR",
    "B",
    "BDI",
    "BDO",
    "CITE",
    "CODE",
    "DATA",
    "DFN",
    "EM",
    "I",
    "KBD",
    "MARK",
    "Q",
    "RP",
    "RT",
    "RUBY",
    "S",
    "SAMP",
    "SMALL",
    "SPAN",
    "STRONG",
    "SUB",
    "SUP",
    "TIME",
    "U",
    "VAR",
    "WBR",
    "BR"
  ]);
  var RAW_TEXT_TAG_NAMES = /* @__PURE__ */ new Set([
    "IFRAME",
    "NOSCRIPT",
    "SCRIPT",
    "STYLE",
    "TEXTAREA",
    "TITLE"
  ]);
  var PREFORMATTED_TAG_NAMES = /* @__PURE__ */ new Set([
    "PRE"
  ]);
  var NON_RENDERED_TAG_NAMES = /* @__PURE__ */ new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE"
  ]);
  var SVG_LABEL_TAG_NAMES = [
    "title",
    "desc"
  ];
  var ACTIONABLE_ROLE_ATTRIBUTE_VALUES = [
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
  ];

  // src/util.html.ts
  function tokenize(html) {
    const tokens = [];
    const n = html.length;
    let i = 0;
    while (i < n) {
      if (html[i] !== "<") {
        const start = i;
        while (i < n && html[i] !== "<") i++;
        const raw2 = html.slice(start, i);
        tokens.push({
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
      if (isWhitespacePreservingElement(tagName)) {
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
  function isWhitespacePreservingElement(tagName) {
    return isRawTextElement(tagName) || PREFORMATTED_TAG_NAMES.has(tagName.toUpperCase());
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

  // src/util.dom.ts
  async function ensureDOM(domOrStringOrBuffer) {
    let domOrString;
    try {
      domOrString = Buffer.isBuffer(domOrStringOrBuffer) ? domOrStringOrBuffer.toString() : domOrStringOrBuffer;
    } catch {
      domOrString = domOrStringOrBuffer;
    }
    if (typeof domOrString !== "string") return domOrString;
    const html = domOrString.trim();
    if (typeof window !== "undefined") {
      return new DOMParser().parseFromString(html, "text/html");
    }
    try {
      const jsdom = await import("jsdom");
      const virtualConsole = new jsdom.VirtualConsole();
      virtualConsole.on("error", () => {
      });
      virtualConsole.on("warn", () => {
      });
      virtualConsole.on("info", () => {
      });
      virtualConsole.on("log", () => {
      });
      const dom = new jsdom.JSDOM(html, {
        runScripts: void 0,
        virtualConsole
      }).window.document;
      return dom;
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;
      throw new ReferenceError("Install 'jsdom' to use D2Snap with a non-browser runtime");
    }
  }
  function resolveDocument(dom) {
    return dom.nodeType === 9 ? dom : dom.ownerDocument;
  }
  function resolveRoot(node) {
    return node?.body ?? node?.documentElement ?? node;
  }
  function serializeSnapshotRoot(rootElement) {
    switch (rootElement.localName.toLowerCase()) {
      case "html":
        return (rootElement.querySelector("body") ?? rootElement).innerHTML;
      case "body":
        return rootElement.innerHTML;
      default:
        return rootElement.outerHTML;
    }
  }
  function resolveSlottedNodes(node) {
    if (node.nodeName !== "SLOT" || !node.getRootNode().host) return [node];
    const assignedNodes = node.assignedNodes({ flatten: true });
    return assignedNodes.length ? assignedNodes : [...node.childNodes].flatMap((childNode) => resolveSlottedNodes(childNode));
  }
  function resolveComposedChildNodes(node) {
    return [...(node.shadowRoot ?? node).childNodes].flatMap((childNode) => resolveSlottedNodes(childNode));
  }
  function resolveReplacingNodes(parentNode, previousSibling, nextSibling) {
    if (!parentNode) return [];
    if (previousSibling && previousSibling.parentNode !== parentNode) return [];
    if (nextSibling && nextSibling.parentNode !== parentNode) return [];
    const replacingNodes = [];
    let currentNode = previousSibling ? previousSibling.nextSibling : parentNode.firstChild;
    while (currentNode && currentNode !== nextSibling) {
      replacingNodes.push(currentNode);
      currentNode = currentNode.nextSibling;
    }
    return replacingNodes;
  }
  function traverseDom(root2, filter = 4294967295 /* SHOW_ALL */, cb) {
    const showElement = (filter & 1 /* SHOW_ELEMENT */) !== 0;
    const showText = (filter & 4 /* SHOW_TEXT */) !== 0;
    const showComment = (filter & 128 /* SHOW_COMMENT */) !== 0;
    const showAttribute = (filter & 2 /* SHOW_ATTRIBUTE */) !== 0;
    const isRootConnected = root2.isConnected;
    const isInRoot = (node) => {
      return isRootConnected ? node.isConnected : root2.contains(node);
    };
    const stack = [];
    for (let i = root2.childNodes.length - 1; i >= 0; i--) {
      stack.push(root2.childNodes[i]);
    }
    while (stack.length) {
      const node = stack.pop();
      if (!isInRoot(node)) continue;
      const parentNode = node.parentNode;
      const previousSibling = node.previousSibling;
      const nextSibling = node.nextSibling;
      const passes = filter === 4294967295 /* SHOW_ALL */ || node.nodeType === 1 /* ELEMENT_NODE */ && showElement || node.nodeType === 3 /* TEXT_NODE */ && showText || node.nodeType === 8 /* COMMENT_NODE */ && showComment;
      if (showAttribute && node.nodeType === 1 /* ELEMENT_NODE */) {
        for (const attr of [...node.attributes]) {
          if (!isInRoot(node)) break;
          if (attr.ownerElement !== node) continue;
          cb(attr);
        }
      }
      const replacingNodes = passes && isInRoot(node) ? cb(node) : void 0;
      const nextNodes = isInRoot(node) ? [...node.childNodes] : replacingNodes ?? resolveReplacingNodes(parentNode, previousSibling, nextSibling);
      for (let i = nextNodes.length - 1; i >= 0; i--) {
        stack.push(nextNodes[i]);
      }
    }
  }
  function isWithinWhitespacePreservingElement(element, domRoot) {
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      if (isWhitespacePreservingElement(ancestor.tagName)) return true;
      if (ancestor === domRoot) break;
    }
    return false;
  }
  function minifyDOM(domRoot) {
    traverseDom(
      domRoot,
      4 /* SHOW_TEXT */,
      (textNode) => {
        const parent = textNode.parentElement;
        if (!parent) return;
        if (isWithinWhitespacePreservingElement(parent, domRoot)) return;
        const value = textNode.nodeValue ?? "";
        if (!value) return;
        textNode.nodeValue = value.replace(/\s+/g, " ");
      }
    );
    traverseDom(
      domRoot,
      4 /* SHOW_TEXT */,
      (textNode) => {
        const parent = textNode.parentElement;
        if (!parent) return;
        if (isWithinWhitespacePreservingElement(parent, domRoot)) return;
        let value = textNode.nodeValue ?? "";
        if (!value) {
          textNode.parentNode?.removeChild(textNode);
          return;
        }
        const previous = textNode.previousSibling;
        const next2 = textNode.nextSibling;
        const previousIsText = previous?.nodeType === 3 /* TEXT_NODE */;
        const nextIsText = next2?.nodeType === 3 /* TEXT_NODE */;
        const previousIsElement = previous?.nodeType === 1 /* ELEMENT_NODE */;
        const nextIsElement = next2?.nodeType === 1 /* ELEMENT_NODE */;
        const previousTag = previousIsElement ? previous.tagName.toLowerCase() : "";
        const nextTag = nextIsElement ? next2.tagName.toLowerCase() : "";
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
              const nextText = next2;
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
        if (/\s$/.test(value) && !next2) {
          value = value.trimEnd();
        }
        textNode.nodeValue = value;
      }
    );
    traverseDom(
      domRoot,
      4 /* SHOW_TEXT */,
      (textNode) => {
        if (textNode.nodeValue === "") {
          textNode.parentNode?.removeChild(textNode);
        }
      }
    );
  }

  // node_modules/turndown/lib/turndown.browser.es.js
  function extend(destination) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) destination[key] = source[key];
      }
    }
    return destination;
  }
  function repeat(character, count) {
    return Array(count + 1).join(character);
  }
  function trimLeadingNewlines(string) {
    return string.replace(/^\n*/, "");
  }
  function trimTrailingNewlines(string) {
    var indexEnd = string.length;
    while (indexEnd > 0 && string[indexEnd - 1] === "\n") indexEnd--;
    return string.substring(0, indexEnd);
  }
  function trimNewlines(string) {
    return trimTrailingNewlines(trimLeadingNewlines(string));
  }
  var blockElements = ["ADDRESS", "ARTICLE", "ASIDE", "AUDIO", "BLOCKQUOTE", "BODY", "CANVAS", "CENTER", "DD", "DIR", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "FRAMESET", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HGROUP", "HR", "HTML", "ISINDEX", "LI", "MAIN", "MENU", "NAV", "NOFRAMES", "NOSCRIPT", "OL", "OUTPUT", "P", "PRE", "SECTION", "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD", "TR", "UL"];
  function isBlock(node) {
    return is(node, blockElements);
  }
  var voidElements = ["AREA", "BASE", "BR", "COL", "COMMAND", "EMBED", "HR", "IMG", "INPUT", "KEYGEN", "LINK", "META", "PARAM", "SOURCE", "TRACK", "WBR"];
  function isVoid(node) {
    return is(node, voidElements);
  }
  function hasVoid(node) {
    return has(node, voidElements);
  }
  var meaningfulWhenBlankElements = ["A", "TABLE", "THEAD", "TBODY", "TFOOT", "TH", "TD", "IFRAME", "SCRIPT", "AUDIO", "VIDEO"];
  function isMeaningfulWhenBlank(node) {
    return is(node, meaningfulWhenBlankElements);
  }
  function hasMeaningfulWhenBlank(node) {
    return has(node, meaningfulWhenBlankElements);
  }
  function is(node, tagNames) {
    return tagNames.indexOf(node.nodeName) >= 0;
  }
  function has(node, tagNames) {
    return node.getElementsByTagName && tagNames.some(function(tagName) {
      return node.getElementsByTagName(tagName).length;
    });
  }
  var markdownEscapes = [[/\\/g, "\\\\"], [/\*/g, "\\*"], [/^-/g, "\\-"], [/^\+ /g, "\\+ "], [/^(=+)/g, "\\$1"], [/^(#{1,6}) /g, "\\$1 "], [/`/g, "\\`"], [/^~~~/g, "\\~~~"], [/\[/g, "\\["], [/\]/g, "\\]"], [/^>/g, "\\>"], [/_/g, "\\_"], [/^(\d+)\. /g, "$1\\. "]];
  function escapeMarkdown(string) {
    return markdownEscapes.reduce(function(accumulator, escape) {
      return accumulator.replace(escape[0], escape[1]);
    }, string);
  }
  var rules = {};
  rules.paragraph = {
    filter: "p",
    replacement: function(content) {
      return "\n\n" + content + "\n\n";
    }
  };
  rules.lineBreak = {
    filter: "br",
    replacement: function(content, node, options) {
      return options.br + "\n";
    }
  };
  rules.heading = {
    filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
    replacement: function(content, node, options) {
      var hLevel = Number(node.nodeName.charAt(1));
      if (options.headingStyle === "setext" && hLevel < 3) {
        var underline = repeat(hLevel === 1 ? "=" : "-", content.length);
        return "\n\n" + content + "\n" + underline + "\n\n";
      } else {
        return "\n\n" + repeat("#", hLevel) + " " + content + "\n\n";
      }
    }
  };
  rules.blockquote = {
    filter: "blockquote",
    replacement: function(content) {
      content = trimNewlines(content).replace(/^/gm, "> ");
      return "\n\n" + content + "\n\n";
    }
  };
  rules.list = {
    filter: ["ul", "ol"],
    replacement: function(content, node) {
      var parent = node.parentNode;
      if (parent.nodeName === "LI" && parent.lastElementChild === node) {
        return "\n" + content;
      } else {
        return "\n\n" + content + "\n\n";
      }
    }
  };
  rules.listItem = {
    filter: "li",
    replacement: function(content, node, options) {
      var prefix = options.bulletListMarker + "   ";
      var parent = node.parentNode;
      if (parent.nodeName === "OL") {
        var start = parent.getAttribute("start");
        var index = Array.prototype.indexOf.call(parent.children, node);
        prefix = (start ? Number(start) + index : index + 1) + ".  ";
      }
      var isParagraph = /\n$/.test(content);
      content = trimNewlines(content) + (isParagraph ? "\n" : "");
      content = content.replace(/\n/gm, "\n" + " ".repeat(prefix.length));
      return prefix + content + (node.nextSibling ? "\n" : "");
    }
  };
  rules.indentedCodeBlock = {
    filter: function(node, options) {
      return options.codeBlockStyle === "indented" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
    },
    replacement: function(content, node, options) {
      return "\n\n    " + node.firstChild.textContent.replace(/\n/g, "\n    ") + "\n\n";
    }
  };
  rules.fencedCodeBlock = {
    filter: function(node, options) {
      return options.codeBlockStyle === "fenced" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
    },
    replacement: function(content, node, options) {
      var className = node.firstChild.getAttribute("class") || "";
      var language = (className.match(/language-(\S+)/) || [null, ""])[1];
      var code = node.firstChild.textContent;
      var fenceChar = options.fence.charAt(0);
      var fenceSize = 3;
      var fenceInCodeRegex = new RegExp("^" + fenceChar + "{3,}", "gm");
      var match;
      while (match = fenceInCodeRegex.exec(code)) {
        if (match[0].length >= fenceSize) {
          fenceSize = match[0].length + 1;
        }
      }
      var fence = repeat(fenceChar, fenceSize);
      return "\n\n" + fence + language + "\n" + code.replace(/\n$/, "") + "\n" + fence + "\n\n";
    }
  };
  rules.horizontalRule = {
    filter: "hr",
    replacement: function(content, node, options) {
      return "\n\n" + options.hr + "\n\n";
    }
  };
  rules.inlineLink = {
    filter: function(node, options) {
      return options.linkStyle === "inlined" && node.nodeName === "A" && node.getAttribute("href");
    },
    replacement: function(content, node) {
      var href = escapeLinkDestination(node.getAttribute("href"));
      var title = escapeLinkTitle(cleanAttribute(node.getAttribute("title")));
      var titlePart = title ? ' "' + title + '"' : "";
      return "[" + content + "](" + href + titlePart + ")";
    }
  };
  rules.referenceLink = {
    filter: function(node, options) {
      return options.linkStyle === "referenced" && node.nodeName === "A" && node.getAttribute("href");
    },
    replacement: function(content, node, options) {
      var href = escapeLinkDestination(node.getAttribute("href"));
      var title = cleanAttribute(node.getAttribute("title"));
      if (title) title = ' "' + escapeLinkTitle(title) + '"';
      var replacement;
      var reference;
      switch (options.linkReferenceStyle) {
        case "collapsed":
          replacement = "[" + content + "][]";
          reference = "[" + content + "]: " + href + title;
          break;
        case "shortcut":
          replacement = "[" + content + "]";
          reference = "[" + content + "]: " + href + title;
          break;
        default:
          var id = this.references.length + 1;
          replacement = "[" + content + "][" + id + "]";
          reference = "[" + id + "]: " + href + title;
      }
      this.references.push(reference);
      return replacement;
    },
    references: [],
    append: function(options) {
      var references = "";
      if (this.references.length) {
        references = "\n\n" + this.references.join("\n") + "\n\n";
        this.references = [];
      }
      return references;
    }
  };
  rules.emphasis = {
    filter: ["em", "i"],
    replacement: function(content, node, options) {
      if (!content.trim()) return "";
      return options.emDelimiter + content + options.emDelimiter;
    }
  };
  rules.strong = {
    filter: ["strong", "b"],
    replacement: function(content, node, options) {
      if (!content.trim()) return "";
      return options.strongDelimiter + content + options.strongDelimiter;
    }
  };
  rules.code = {
    filter: function(node) {
      var hasSiblings = node.previousSibling || node.nextSibling;
      var isCodeBlock = node.parentNode.nodeName === "PRE" && !hasSiblings;
      return node.nodeName === "CODE" && !isCodeBlock;
    },
    replacement: function(content) {
      if (!content) return "";
      content = content.replace(/\r?\n|\r/g, " ");
      var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(content) ? " " : "";
      var delimiter = "`";
      var matches = content.match(/`+/gm) || [];
      while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + "`";
      return delimiter + extraSpace + content + extraSpace + delimiter;
    }
  };
  rules.image = {
    filter: "img",
    replacement: function(content, node) {
      var alt = escapeMarkdown(cleanAttribute(node.getAttribute("alt")));
      var src = escapeLinkDestination(node.getAttribute("src") || "");
      var title = cleanAttribute(node.getAttribute("title"));
      var titlePart = title ? ' "' + escapeLinkTitle(title) + '"' : "";
      return src ? "![" + alt + "](" + src + titlePart + ")" : "";
    }
  };
  function cleanAttribute(attribute) {
    return attribute ? attribute.replace(/(\n+\s*)+/g, "\n") : "";
  }
  function escapeLinkDestination(destination) {
    var escaped = destination.replace(/([<>()])/g, "\\$1");
    return escaped.indexOf(" ") >= 0 ? "<" + escaped + ">" : escaped;
  }
  function escapeLinkTitle(title) {
    return title.replace(/"/g, '\\"');
  }
  function Rules(options) {
    this.options = options;
    this._keep = [];
    this._remove = [];
    this.blankRule = {
      replacement: options.blankReplacement
    };
    this.keepReplacement = options.keepReplacement;
    this.defaultRule = {
      replacement: options.defaultReplacement
    };
    this.array = [];
    for (var key in options.rules) this.array.push(options.rules[key]);
  }
  Rules.prototype = {
    add: function(key, rule) {
      this.array.unshift(rule);
    },
    keep: function(filter) {
      this._keep.unshift({
        filter,
        replacement: this.keepReplacement
      });
    },
    remove: function(filter) {
      this._remove.unshift({
        filter,
        replacement: function() {
          return "";
        }
      });
    },
    forNode: function(node) {
      if (node.isBlank) return this.blankRule;
      var rule;
      if (rule = findRule(this.array, node, this.options)) return rule;
      if (rule = findRule(this._keep, node, this.options)) return rule;
      if (rule = findRule(this._remove, node, this.options)) return rule;
      return this.defaultRule;
    },
    forEach: function(fn) {
      for (var i = 0; i < this.array.length; i++) fn(this.array[i], i);
    }
  };
  function findRule(rules3, node, options) {
    for (var i = 0; i < rules3.length; i++) {
      var rule = rules3[i];
      if (filterValue(rule, node, options)) return rule;
    }
    return void 0;
  }
  function filterValue(rule, node, options) {
    var filter = rule.filter;
    if (typeof filter === "string") {
      if (filter === node.nodeName.toLowerCase()) return true;
    } else if (Array.isArray(filter)) {
      if (filter.indexOf(node.nodeName.toLowerCase()) > -1) return true;
    } else if (typeof filter === "function") {
      if (filter.call(rule, node, options)) return true;
    } else {
      throw new TypeError("`filter` needs to be a string, array, or function");
    }
  }
  function collapseWhitespace(options) {
    var element = options.element;
    var isBlock2 = options.isBlock;
    var isVoid2 = options.isVoid;
    var isPre = options.isPre || function(node2) {
      return node2.nodeName === "PRE";
    };
    if (!element.firstChild || isPre(element)) return;
    var prevText = null;
    var keepLeadingWs = false;
    var prev = null;
    var node = next(prev, element, isPre);
    while (node !== element) {
      if (node.nodeType === 3 || node.nodeType === 4) {
        var text = node.data.replace(/[ \r\n\t]+/g, " ");
        if ((!prevText || / $/.test(prevText.data)) && !keepLeadingWs && text[0] === " ") {
          text = text.substr(1);
        }
        if (!text) {
          node = remove(node);
          continue;
        }
        node.data = text;
        prevText = node;
      } else if (node.nodeType === 1) {
        if (isBlock2(node) || node.nodeName === "BR") {
          if (prevText) {
            prevText.data = prevText.data.replace(/ $/, "");
          }
          prevText = null;
          keepLeadingWs = false;
        } else if (isVoid2(node) || isPre(node)) {
          prevText = null;
          keepLeadingWs = true;
        } else if (prevText) {
          keepLeadingWs = false;
        }
      } else {
        node = remove(node);
        continue;
      }
      var nextNode = next(prev, node, isPre);
      prev = node;
      node = nextNode;
    }
    if (prevText) {
      prevText.data = prevText.data.replace(/ $/, "");
      if (!prevText.data) {
        remove(prevText);
      }
    }
  }
  function remove(node) {
    var next2 = node.nextSibling || node.parentNode;
    node.parentNode.removeChild(node);
    return next2;
  }
  function next(prev, current, isPre) {
    if (prev && prev.parentNode === current || isPre(current)) {
      return current.nextSibling || current.parentNode;
    }
    return current.firstChild || current.nextSibling || current.parentNode;
  }
  var root = typeof window !== "undefined" ? window : {};
  function canParseHTMLNatively() {
    var Parser = root.DOMParser;
    var canParse = false;
    try {
      if (new Parser().parseFromString(trustedTypes?.emptyHTML ?? "", "text/html")) {
        canParse = true;
      }
    } catch (e) {
    }
    return canParse;
  }
  function createHTMLParser() {
    var Parser = function() {
    };
    {
      if (shouldUseActiveX()) {
        Parser.prototype.parseFromString = function(string) {
          var doc = new window.ActiveXObject("htmlfile");
          doc.designMode = "on";
          doc.open();
          doc.write(string);
          doc.close();
          return doc;
        };
      } else {
        Parser.prototype.parseFromString = function(string) {
          var doc = document.implementation.createHTMLDocument("");
          doc.open();
          doc.write(string);
          doc.close();
          return doc;
        };
      }
    }
    return Parser;
  }
  function shouldUseActiveX() {
    var useActiveX = false;
    try {
      document.implementation.createHTMLDocument("").open();
    } catch (e) {
      if (root.ActiveXObject) useActiveX = true;
    }
    return useActiveX;
  }
  var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();
  function RootNode(input, options) {
    var root2;
    if (typeof input === "string") {
      var doc = htmlParser().parseFromString(
        // DOM parsers arrange elements in the <head> and <body>.
        // Wrapping in a custom element ensures elements are reliably arranged in
        // a single element.
        '<x-turndown id="turndown-root">' + input + "</x-turndown>",
        "text/html"
      );
      root2 = doc.getElementById("turndown-root");
    } else {
      root2 = input.cloneNode(true);
    }
    collapseWhitespace({
      element: root2,
      isBlock,
      isVoid,
      isPre: options.preformattedCode ? isPreOrCode : null
    });
    return root2;
  }
  var _htmlParser;
  function htmlParser() {
    _htmlParser = _htmlParser || new HTMLParser();
    return _htmlParser;
  }
  function isPreOrCode(node) {
    return node.nodeName === "PRE" || node.nodeName === "CODE";
  }
  function Node(node, options) {
    node.isBlock = isBlock(node);
    node.isCode = node.nodeName === "CODE" || node.parentNode.isCode;
    node.isBlank = isBlank(node);
    node.flankingWhitespace = flankingWhitespace(node, options);
    return node;
  }
  function isBlank(node) {
    return !isVoid(node) && !isMeaningfulWhenBlank(node) && /^\s*$/i.test(node.textContent) && !hasVoid(node) && !hasMeaningfulWhenBlank(node);
  }
  function flankingWhitespace(node, options) {
    if (node.isBlock || options.preformattedCode && node.isCode) {
      return {
        leading: "",
        trailing: ""
      };
    }
    var edges = edgeWhitespace(node.textContent);
    if (edges.leadingAscii && isFlankedByWhitespace("left", node, options)) {
      edges.leading = edges.leadingNonAscii;
    }
    if (edges.trailingAscii && isFlankedByWhitespace("right", node, options)) {
      edges.trailing = edges.trailingNonAscii;
    }
    return {
      leading: edges.leading,
      trailing: edges.trailing
    };
  }
  function edgeWhitespace(string) {
    var m = string.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
    return {
      leading: m[1],
      // whole string for whitespace-only strings
      leadingAscii: m[2],
      leadingNonAscii: m[3],
      trailing: m[4],
      // empty for whitespace-only strings
      trailingNonAscii: m[5],
      trailingAscii: m[6]
    };
  }
  function isFlankedByWhitespace(side, node, options) {
    var sibling;
    var regExp;
    var isFlanked;
    if (side === "left") {
      sibling = node.previousSibling;
      regExp = / $/;
    } else {
      sibling = node.nextSibling;
      regExp = /^ /;
    }
    if (sibling) {
      if (sibling.nodeType === 3) {
        isFlanked = regExp.test(sibling.nodeValue);
      } else if (options.preformattedCode && sibling.nodeName === "CODE") {
        isFlanked = false;
      } else if (sibling.nodeType === 1 && !isBlock(sibling)) {
        isFlanked = regExp.test(sibling.textContent);
      }
    }
    return isFlanked;
  }
  var reduce = Array.prototype.reduce;
  function TurndownService(options) {
    if (!(this instanceof TurndownService)) return new TurndownService(options);
    var defaults = {
      rules,
      headingStyle: "setext",
      hr: "* * *",
      bulletListMarker: "*",
      codeBlockStyle: "indented",
      fence: "```",
      emDelimiter: "_",
      strongDelimiter: "**",
      linkStyle: "inlined",
      linkReferenceStyle: "full",
      br: "  ",
      preformattedCode: false,
      blankReplacement: function(content, node) {
        return node.isBlock ? "\n\n" : "";
      },
      keepReplacement: function(content, node) {
        return node.isBlock ? "\n\n" + node.outerHTML + "\n\n" : node.outerHTML;
      },
      defaultReplacement: function(content, node) {
        return node.isBlock ? "\n\n" + content + "\n\n" : content;
      }
    };
    this.options = extend({}, defaults, options);
    this.rules = new Rules(this.options);
  }
  TurndownService.prototype = {
    /**
     * The entry point for converting a string or DOM node to Markdown
     * @public
     * @param {String|HTMLElement} input The string or DOM node to convert
     * @returns A Markdown representation of the input
     * @type String
     */
    turndown: function(input) {
      if (!canConvert(input)) {
        throw new TypeError(input + " is not a string, or an element/document/fragment node.");
      }
      if (input === "") return "";
      var output = process.call(this, new RootNode(input, this.options));
      return postProcess.call(this, output);
    },
    /**
     * Add one or more plugins
     * @public
     * @param {Function|Array} plugin The plugin or array of plugins to add
     * @returns The Turndown instance for chaining
     * @type Object
     */
    use: function(plugin) {
      if (Array.isArray(plugin)) {
        for (var i = 0; i < plugin.length; i++) this.use(plugin[i]);
      } else if (typeof plugin === "function") {
        plugin(this);
      } else {
        throw new TypeError("plugin must be a Function or an Array of Functions");
      }
      return this;
    },
    /**
     * Adds a rule
     * @public
     * @param {String} key The unique key of the rule
     * @param {Object} rule The rule
     * @returns The Turndown instance for chaining
     * @type Object
     */
    addRule: function(key, rule) {
      this.rules.add(key, rule);
      return this;
    },
    /**
     * Keep a node (as HTML) that matches the filter
     * @public
     * @param {String|Array|Function} filter The unique key of the rule
     * @returns The Turndown instance for chaining
     * @type Object
     */
    keep: function(filter) {
      this.rules.keep(filter);
      return this;
    },
    /**
     * Remove a node that matches the filter
     * @public
     * @param {String|Array|Function} filter The unique key of the rule
     * @returns The Turndown instance for chaining
     * @type Object
     */
    remove: function(filter) {
      this.rules.remove(filter);
      return this;
    },
    /**
     * Escapes Markdown syntax
     * @public
     * @param {String} string The string to escape
     * @returns A string with Markdown syntax escaped
     * @type String
     */
    escape: function(string) {
      return escapeMarkdown(string);
    }
  };
  function process(parentNode) {
    var self = this;
    return reduce.call(parentNode.childNodes, function(output, node) {
      node = new Node(node, self.options);
      var replacement = "";
      if (node.nodeType === 3) {
        replacement = node.isCode ? node.nodeValue : self.escape(node.nodeValue);
      } else if (node.nodeType === 1) {
        replacement = replacementForNode.call(self, node);
      }
      return join(output, replacement);
    }, "");
  }
  function postProcess(output) {
    var self = this;
    this.rules.forEach(function(rule) {
      if (typeof rule.append === "function") {
        output = join(output, rule.append(self.options));
      }
    });
    return output.replace(/^[\t\r\n]+/, "").replace(/[\t\r\n\s]+$/, "");
  }
  function replacementForNode(node) {
    var rule = this.rules.forNode(node);
    var content = process.call(this, node);
    var whitespace = node.flankingWhitespace;
    if (whitespace.leading || whitespace.trailing) content = content.trim();
    return whitespace.leading + rule.replacement(content, node, this.options) + whitespace.trailing;
  }
  function join(output, replacement) {
    var s1 = trimTrailingNewlines(output);
    var s2 = trimLeadingNewlines(replacement);
    var nls = Math.max(output.length - s1.length, replacement.length - s2.length);
    var separator = "\n\n".substring(0, nls);
    return s1 + separator + s2;
  }
  function canConvert(input) {
    return input != null && (typeof input === "string" || input.nodeType && (input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11));
  }

  // node_modules/@truto/turndown-plugin-gfm/lib/index.js
  var highlightRegExp = /highlight-(?:(?:text|source)-)?([a-z0-9]+)/;
  function highlightedCodeBlock(turndownService) {
    turndownService.addRule("highlightedCodeBlock", {
      filter: function(node) {
        var firstChild = node.firstChild;
        return node.nodeName === "DIV" && highlightRegExp.test(node.className) && firstChild && firstChild.nodeName === "PRE";
      },
      replacement: function(content, node, options) {
        var className = node.className || "";
        var language = (className.match(highlightRegExp) || [null, ""])[1];
        return "\n\n" + options.fence + language + "\n" + node.firstChild.textContent + "\n" + options.fence + "\n\n";
      }
    });
  }
  function strikethrough(turndownService) {
    turndownService.addRule("strikethrough", {
      filter: ["del", "s", "strike"],
      replacement: function(content) {
        return "~~" + content + "~~";
      }
    });
  }
  var rules2 = {};
  function cleanCellContent(content) {
    if (!content) return "   ";
    let cleaned = content.trim().replace(/\s+/g, " ").replace(/\|/g, "\\|").replace(/\\/g, "\\\\").replace(/\n+/g, " ").replace(/\r+/g, " ");
    if (!cleaned || cleaned.match(/^\s*$/)) {
      return "   ";
    }
    if (cleaned.length < 3) {
      cleaned += " ".repeat(3 - cleaned.length);
    }
    return cleaned;
  }
  function cell(content, node, index) {
    if (index === null && node && node.parentNode) {
      index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
    }
    if (index === null) index = 0;
    var prefix = " ";
    if (index === 0) prefix = "| ";
    let cellContent = cleanCellContent(content);
    let colspan = 1;
    if (node && node.getAttribute) {
      colspan = parseInt(node.getAttribute("colspan") || "1", 10);
      if (isNaN(colspan) || colspan < 1) colspan = 1;
    }
    let result = prefix + cellContent + " |";
    for (let i = 1; i < colspan; i++) {
      result += "   |";
    }
    return result;
  }
  function isHeadingRow(tr) {
    if (!tr || !tr.parentNode) return false;
    var parentNode = tr.parentNode;
    if (parentNode.nodeName === "THEAD") return true;
    if (parentNode.firstChild === tr && (parentNode.nodeName === "TABLE" || parentNode.nodeName === "TBODY")) {
      var cellNodes = Array.prototype.filter.call(tr.childNodes, function(n) {
        return n.nodeType === 1;
      });
      if (cellNodes.length === 0) return false;
      return Array.prototype.every.call(cellNodes, function(n) {
        return n.nodeName === "TH";
      });
    }
    return false;
  }
  function getTableColCount(table) {
    if (!table || !table.rows) return 0;
    let maxCols = 0;
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      if (!row || !row.childNodes) continue;
      let colCount = 0;
      for (let j = 0; j < row.childNodes.length; j++) {
        const cell2 = row.childNodes[j];
        if (cell2.nodeType === 1 && (cell2.nodeName === "TD" || cell2.nodeName === "TH")) {
          const colspan = parseInt(cell2.getAttribute("colspan") || "1", 10);
          colCount += isNaN(colspan) ? 1 : Math.max(1, colspan);
        }
      }
      if (colCount > maxCols) maxCols = colCount;
    }
    return maxCols;
  }
  function shouldSkipTable(table) {
    if (!table) return true;
    if (!table.rows || table.rows.length === 0) return true;
    let contentCells = 0;
    let totalCells = 0;
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      if (!row || !row.childNodes) continue;
      for (let j = 0; j < row.childNodes.length; j++) {
        const cell2 = row.childNodes[j];
        if (cell2.nodeType === 1 && (cell2.nodeName === "TD" || cell2.nodeName === "TH")) {
          totalCells++;
          if (cell2.textContent && cell2.textContent.trim()) {
            contentCells++;
          }
        }
      }
    }
    if (totalCells === 0) return true;
    if (totalCells === 1 && contentCells === 0) return true;
    return false;
  }
  rules2.tableCell = {
    filter: ["th", "td"],
    replacement: function(content, node) {
      return cell(content, node, null);
    }
  };
  rules2.tableRow = {
    filter: "tr",
    replacement: function(content, node) {
      if (!content || !content.trim()) return "";
      var borderCells = "";
      if (isHeadingRow(node)) {
        const table = node.closest("table");
        if (table) {
          const colCount = getTableColCount(table);
          if (colCount > 0) {
            for (var i = 0; i < colCount; i++) {
              const prefix = i === 0 ? "| " : " ";
              borderCells += prefix + "--- |";
            }
          }
        }
      }
      return "\n" + content + (borderCells ? "\n" + borderCells : "");
    }
  };
  rules2.table = {
    filter: "table",
    replacement: function(content, node) {
      if (shouldSkipTable(node)) {
        return "";
      }
      content = content.replace(/\n+/g, "\n").trim();
      if (!content) return "";
      const lines = content.split("\n").filter((line) => line.trim());
      if (lines.length === 0) return "";
      const hasHeaderSeparator = lines.length >= 2 && /\|\s*-+/.test(lines[1]);
      let result = lines.join("\n");
      if (!hasHeaderSeparator && lines.length >= 1) {
        const firstLine = lines[0];
        const colCount = (firstLine.match(/\|/g) || []).length - 1;
        if (colCount > 0) {
          let separator = "|";
          for (let i = 0; i < colCount; i++) {
            separator += " --- |";
          }
          const resultLines = [lines[0], separator, ...lines.slice(1)];
          result = resultLines.join("\n");
        }
      }
      return "\n\n" + result + "\n\n";
    }
  };
  rules2.tableSection = {
    filter: ["thead", "tbody", "tfoot"],
    replacement: function(content) {
      return content;
    }
  };
  rules2.tableCaption = {
    filter: ["caption"],
    replacement: function() {
      return "";
    }
  };
  rules2.tableColgroup = {
    filter: ["colgroup", "col"],
    replacement: function() {
      return "";
    }
  };
  function tables(turndownService) {
    for (var key in rules2) {
      turndownService.addRule(key, rules2[key]);
    }
  }
  function taskListItems(turndownService) {
    turndownService.addRule("taskListItems", {
      filter: function(node) {
        return node.type === "checkbox" && node.parentNode.nodeName === "LI";
      },
      replacement: function(content, node) {
        return (node.checked ? "[x]" : "[ ]") + " ";
      }
    });
  }
  function gfm(turndownService) {
    turndownService.use([
      highlightedCodeBlock,
      strikethrough,
      tables,
      taskListItems
    ]);
  }

  // src/Turndown.ts
  var BRACKET_REGEX = /[[\]\\]/g;
  var _escape = turndown_browser_es_default.prototype.escape.bind(null);
  turndown_browser_es_default.prototype.escape = (s) => _escape(s).replace(/</g, "&lt;");
  var Turndown = class {
    service;
    constructor(retainElementCbs = []) {
      this.service = new TurndownService({
        headingStyle: "atx",
        bulletListMarker: "-",
        codeBlockStyle: "fenced"
      });
      this.service.addRule("retain", {
        filter: (node) => {
          if (node.nodeType !== 1) return false;
          const elementNode = node;
          for (const retainElementCb of retainElementCbs) {
            if (retainElementCb(elementNode)) return true;
          }
          return false;
        },
        replacement: (_content, node) => node.outerHTML
      }).addRule("imageWithoutSrc", {
        filter: (node) => {
          return node.nodeName === "IMG" && !(node.getAttribute("src") ?? "").trim() && !retainElementCbs.some((cb) => cb(node));
        },
        replacement: (_content, node) => {
          const alt = (node.getAttribute("alt") ?? "").trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(BRACKET_REGEX, "\\$&");
          return alt ? `![${alt}]()` : "";
        }
      });
      this.service.use(gfm);
    }
    translate(html) {
      return this.service.turndown(html).trim();
    }
  };

  // src/config.ts
  var CONFIG = {
    uniqueAttributeName: "data-uid",
    attributeScoresDefaultFallbackValue: 0,
    attributeScoresFallbackKey: "*"
  };

  // src/processing.ts
  function hasSlotChildNode(virtualNode) {
    return !!virtualNode.querySelector?.(":scope > slot");
  }
  function composeAndMapChildNodes(virtualNode, liveNode, liveByVirtual, document2, shadowDOM) {
    if (shadowDOM && (liveNode.shadowRoot || hasSlotChildNode(virtualNode))) {
      const liveChildNodes2 = resolveComposedChildNodes(liveNode);
      const virtualChildNodes2 = liveChildNodes2.map((liveChildNode) => document2.importNode(liveChildNode, true));
      virtualNode.replaceChildren(...virtualChildNodes2);
      for (let i = 0; i < virtualChildNodes2.length; i++) {
        liveByVirtual.set(virtualChildNodes2[i], liveChildNodes2[i]);
      }
      return;
    }
    const virtualChildNodes = virtualNode.childNodes;
    const liveChildNodes = liveNode.childNodes;
    for (let i = 0; i < Math.min(virtualChildNodes.length, liveChildNodes.length); i++) {
      if (virtualChildNodes[i].nodeName !== liveChildNodes[i].nodeName) continue;
      liveByVirtual.set(virtualChildNodes[i], liveChildNodes[i]);
    }
  }
  function resolveLiveNode(virtualNode, liveByVirtual, inheritedLiveByVirtual) {
    const resolve = (node) => {
      return liveByVirtual.get(node) ?? inheritedLiveByVirtual.get(node);
    };
    if (virtualNode.nodeType !== 2 /* ATTRIBUTE_NODE */) return resolve(virtualNode) ?? virtualNode;
    const virtualAttr = virtualNode;
    const liveElement = virtualAttr.ownerElement ? resolve(virtualAttr.ownerElement) : void 0;
    return liveElement?.getAttributeNodeNS(virtualAttr.namespaceURI, virtualAttr.localName) ?? virtualAttr;
  }
  function applyNormalizers(normalizers, virtualNode, liveNode, inheritedLiveByVirtual, context) {
    for (const normalizer of normalizers) {
      const parentNode = virtualNode.parentNode;
      const previousSibling = virtualNode.previousSibling;
      const nextSibling = virtualNode.nextSibling;
      const ownerElement = virtualNode.ownerElement ?? null;
      normalizer(virtualNode, liveNode, context);
      const isAttached = virtualNode.nodeType === 2 /* ATTRIBUTE_NODE */ ? virtualNode.ownerElement === ownerElement : virtualNode.parentNode === parentNode;
      if (isAttached) continue;
      for (const replacingNode of resolveReplacingNodes(parentNode, previousSibling, nextSibling)) {
        replacingNode.nodeType === liveNode.nodeType && inheritedLiveByVirtual.set(replacingNode, liveNode);
      }
      return;
    }
  }
  function preProcessDOM(virtualDomRoot, liveDomRoot, document2, options) {
    const normalizers = options.normalizers;
    const context = {
      classifiers: options.classifiers,
      document: document2
    };
    const liveByVirtual = /* @__PURE__ */ new Map();
    const inheritedLiveByVirtual = /* @__PURE__ */ new Map();
    const virtualDomRootEquivalent = virtualDomRoot.tagName === liveDomRoot.tagName ? virtualDomRoot : virtualDomRoot.firstElementChild ?? virtualDomRoot;
    liveByVirtual.set(virtualDomRootEquivalent, liveDomRoot);
    virtualDomRootEquivalent === virtualDomRoot && composeAndMapChildNodes(virtualDomRoot, liveDomRoot, liveByVirtual, document2, options.shadowDOM);
    traverseDom(
      virtualDomRoot,
      4294967295 /* SHOW_ALL */,
      (node) => {
        const pairedLiveNode = liveByVirtual.get(node);
        pairedLiveNode && node.nodeType === 1 /* ELEMENT_NODE */ && composeAndMapChildNodes(node, pairedLiveNode, liveByVirtual, document2, options.shadowDOM);
        applyNormalizers(
          normalizers,
          node,
          resolveLiveNode(node, liveByVirtual, inheritedLiveByVirtual),
          inheritedLiveByVirtual,
          context
        );
      }
    );
  }
  function postProcessDOM(domRoot, options, isActionableElement) {
    if (options.filterEmptyElements) {
      const elementNodes = [...domRoot.getElementsByTagName("*")];
      for (let i = elementNodes.length - 1; i >= 0; i--) {
        const elementNode = elementNodes[i];
        if (isActionableElement(elementNode)) continue;
        if (isVoidElement(elementNode.tagName)) continue;
        if (elementNode.children.length || (elementNode.textContent ?? "").trim().length) continue;
        elementNode.remove();
      }
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

  // src/util.obj.ts
  function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      const targetValue = result[key];
      const sourceValue = source[key];
      if (sourceValue === void 0) continue;
      if (targetValue !== null && sourceValue !== null && typeof targetValue === "object" && typeof sourceValue === "object" && !Array.isArray(targetValue) && !Array.isArray(sourceValue)) {
        result[key] = deepMerge(
          targetValue,
          sourceValue
        );
      } else {
        result[key] = sourceValue;
      }
    }
    return result;
  }

  // src/util.text.ts
  var SENTENCE_DELIMITER_REGEX = /(?<=\p{Sentence_Terminal})\s|\n|\r/gu;
  function tokenizeSentences(text) {
    return text.split(SENTENCE_DELIMITER_REGEX).map((rawSentence) => rawSentence.trim()).filter((sentence) => !!sentence);
  }
  function transformWithRanking(text, ratio, rankSentencesFn, noEmpty = false) {
    const sentences = tokenizeSentences(text);
    const k = Math.min(
      Math.max(
        Math.ceil(sentences.length * ratio),
        +noEmpty
      ),
      sentences.length
    );
    if (sentences.length <= k) return sentences.join("\n");
    const keptSentenceCounts = /* @__PURE__ */ new Map();
    for (const sentence of rankSentencesFn([...sentences]).slice(0, k)) {
      keptSentenceCounts.set(sentence, (keptSentenceCounts.get(sentence) ?? 0) + 1);
    }
    return sentences.filter((sentence) => {
      const keptSentenceCount = keptSentenceCounts.get(sentence) ?? 0;
      if (!keptSentenceCount) return false;
      keptSentenceCounts.set(sentence, keptSentenceCount - 1);
      return true;
    }).join("\n");
  }
  var TEXT_ENCODER = new TextEncoder();
  function getByteLength(text) {
    return TEXT_ENCODER.encode(text).length;
  }
  function getSizeRatio(snapshotSize, originalSize) {
    if (originalSize === 0) return snapshotSize === 0 ? 1 : Infinity;
    return snapshotSize / originalSize;
  }

  // src/D2Snap.text.ts
  var SENTENCE_BOUNDARY_REGEX = /(?<=\p{Sentence_Terminal})\s+/gu;
  function intersect(range, start, end) {
    const intersectionStart = Math.max(range.start, start);
    const intersectionEnd = Math.min(range.end, end);
    return intersectionStart < intersectionEnd ? { start: intersectionStart, end: intersectionEnd } : null;
  }
  function segmentSentences(text) {
    const sentences = [];
    const pushSentence = (start2, end) => {
      const segment = text.slice(start2, end);
      const leading = segment.length - segment.trimStart().length;
      const trailing = segment.length - segment.trimEnd().length;
      start2 + leading < end - trailing && sentences.push({ start: start2 + leading, end: end - trailing, segmentStart: start2, segmentEnd: end });
    };
    let start = 0;
    for (const boundary of text.matchAll(SENTENCE_BOUNDARY_REGEX)) {
      pushSentence(start, boundary.index);
      start = boundary.index + boundary[0].length;
    }
    pushSentence(start, text.length);
    return sentences;
  }
  function resolveSentenceIndex(sentences, position) {
    for (let i = 0; i < sentences.length; i++) {
      if (position <= sentences[i].segmentEnd) return i;
    }
    return -1;
  }
  function rankSentenceIndices(sentences, ratio, sentenceRanker, prioritisedIndices = /* @__PURE__ */ new Set()) {
    const k = Math.min(Math.max(Math.ceil(sentences.length * ratio), 1), sentences.length);
    if (k >= sentences.length) return sentences.map((_, i) => i);
    const rankGroup = (indices) => {
      if (!indices.length) return [];
      const indicesBySentence = /* @__PURE__ */ new Map();
      indices.forEach((index) => {
        indicesBySentence.set(sentences[index], [...indicesBySentence.get(sentences[index]) ?? [], index]);
      });
      const rankedIndices = [];
      for (const sentence of sentenceRanker(indices.map((index) => sentences[index]))) {
        const index = indicesBySentence.get(sentence)?.shift();
        index !== void 0 && rankedIndices.push(index);
      }
      return rankedIndices;
    };
    const allIndices = sentences.map((_, i) => i);
    return [
      ...rankGroup(allIndices.filter((index) => prioritisedIndices.has(index))),
      ...rankGroup(allIndices.filter((index) => !prioritisedIndices.has(index)))
    ].slice(0, k).sort((a, b) => a - b);
  }
  function snapTextSiblings(textNodes, siblingElements, ratio, sentenceRanker, isActionableElement) {
    const offsets = [];
    let text = "";
    for (const textNode of textNodes) {
      offsets.push({ start: text.length, end: text.length + textNode.data.length });
      text += textNode.data;
    }
    const sentences = segmentSentences(text);
    if (!sentences.length) return;
    const sentenceIndexByElement = new Map(siblingElements.map((sibling) => [sibling.element, resolveSentenceIndex(sentences, sibling.position)]));
    const actionableSentenceIndices = new Set(siblingElements.filter((sibling) => isActionableElement(sibling.element)).map((sibling) => sentenceIndexByElement.get(sibling.element)).filter((index) => index >= 0));
    const visibleSentences = sentences.map((sentence, sentenceIndex) => {
      let visibleText = "";
      let cursor = sentence.start;
      for (const sibling of siblingElements) {
        if (sentenceIndexByElement.get(sibling.element) !== sentenceIndex) continue;
        const position = Math.min(Math.max(sibling.position, sentence.start), sentence.end);
        visibleText += text.slice(cursor, position) + (sibling.element.textContent ?? "");
        cursor = position;
      }
      return (visibleText + text.slice(cursor, sentence.end)).replace(/\s+/g, " ").trim();
    });
    const keptIndices = rankSentenceIndices(
      visibleSentences,
      ratio,
      sentenceRanker,
      actionableSentenceIndices
    );
    if (keptIndices.length === sentences.length) return;
    const keptRanges = [];
    keptIndices.forEach((index, i) => {
      const isAdjacent = i > 0 && keptIndices[i - 1] === index - 1;
      isAdjacent ? keptRanges[keptRanges.length - 1].end = sentences[index].end : keptRanges.push({ ...sentences[index] });
    });
    textNodes.forEach((textNode, i) => {
      const { start, end } = offsets[i];
      const parts = keptRanges.map((range) => intersect(range, start, end)).filter((part) => !!part);
      if (!parts.length) {
        textNode.data.length && (textNode.data = " ");
        return;
      }
      const keptText = parts.map((part) => text.slice(part.start, part.end)).join(" ");
      const leadingSpace = parts[0].start > start ? " " : "";
      const trailingSpace = parts[parts.length - 1].end < end ? " " : "";
      textNode.data = `${leadingSpace}${keptText}${trailingSpace}`;
    });
    const keptIndexSet = new Set(keptIndices);
    for (const { element } of siblingElements) {
      const sentenceIndex = sentenceIndexByElement.get(element);
      if (sentenceIndex < 0 || keptIndexSet.has(sentenceIndex)) continue;
      if (isActionableElement(element)) continue;
      element.remove();
    }
    for (const textNode of textNodes) {
      const previousNode = textNode.previousSibling;
      if (previousNode?.nodeType !== 3 /* TEXT_NODE */) continue;
      if (!/\s$/.test(previousNode.data) || !/^\s/.test(textNode.data)) continue;
      textNode.data = textNode.data.trimStart();
    }
  }
  function snapTextBlocks(root2, ratio, sentenceRanker, isActionableElement) {
    const elements = [root2];
    while (elements.length) {
      const element = elements.pop();
      if (element !== root2 && !element.parentNode) continue;
      const textNodes = [];
      const siblingElements = [];
      let position = 0;
      for (let child = element.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 3 /* TEXT_NODE */) {
          textNodes.push(child);
          position += child.data.length;
        } else if (child.nodeType === 1 /* ELEMENT_NODE */) {
          siblingElements.push({ element: child, position });
        }
      }
      textNodes.some((textNode) => textNode.data.trim()) && snapTextSiblings(textNodes, siblingElements, ratio, sentenceRanker, isActionableElement);
      for (let i = siblingElements.length - 1; i >= 0; i--) {
        elements.push(siblingElements[i].element);
      }
    }
  }

  // src/constants.defaults.ts
  var constants_defaults_exports = {};
  __export(constants_defaults_exports, {
    ATTRIBUTE_SCORES: () => ATTRIBUTE_SCORES,
    CLASSIFIERS: () => CLASSIFIERS,
    CLASSIFIER_SETTINGS: () => CLASSIFIER_SETTINGS,
    NORMALIZERS: () => NORMALIZERS,
    NORMALIZER_SETTINGS: () => NORMALIZER_SETTINGS,
    SENTENCE_RANKER: () => SENTENCE_RANKER,
    SENTENCE_RANKER_SETTINGS: () => SENTENCE_RANKER_SETTINGS,
    classifiers: () => options_classifiers_exports,
    normalizers: () => options_normalizers_exports,
    sentenceRankers: () => options_sentenceRankers_exports
  });

  // src/options.classifiers/is-actionable-element.ts
  var DEFAULT_SETTINGS = Object.freeze({
    roleAttributeValues: Object.freeze([...ACTIONABLE_ROLE_ATTRIBUTE_VALUES]),
    tagNames: Object.freeze([
      "A",
      "BUTTON",
      "DETAILS",
      "FORM",
      "INPUT",
      "LABEL",
      "SELECT",
      "OPTION",
      "SUMMARY",
      "TEXTAREA"
    ])
  });
  var normalizeTagName = (name) => name.toUpperCase();
  var normalizeRoleAttributeValue = (name) => name.toLowerCase();
  var NAME_SETS_BY_NORMALIZER = /* @__PURE__ */ new WeakMap();
  var NAME_SETS_BY_KEY = /* @__PURE__ */ new Map();
  function resolveNameSet(names, normalize) {
    let nameSetsByList = NAME_SETS_BY_NORMALIZER.get(normalize);
    if (!nameSetsByList) {
      nameSetsByList = /* @__PURE__ */ new WeakMap();
      NAME_SETS_BY_NORMALIZER.set(normalize, nameSetsByList);
    }
    let nameSet = nameSetsByList.get(names);
    if (nameSet) return nameSet;
    const normalizedNames = names.map(normalize);
    const key = normalizedNames.join("\n");
    nameSet = NAME_SETS_BY_KEY.get(key) ?? new Set(normalizedNames);
    NAME_SETS_BY_KEY.set(key, nameSet);
    nameSetsByList.set(names, nameSet);
    return nameSet;
  }
  function is_actionable_element_default(elementNode, settings = {}) {
    const tagNames = resolveNameSet(settings.tagNames ?? DEFAULT_SETTINGS.tagNames, normalizeTagName);
    const roleAttributeValues = resolveNameSet(settings.roleAttributeValues ?? DEFAULT_SETTINGS.roleAttributeValues, normalizeRoleAttributeValue);
    return tagNames.has(elementNode.tagName.toUpperCase()) || roleAttributeValues.has(
      elementNode.getAttribute("role")?.toLowerCase() ?? elementNode.role ?? ""
    );
  }

  // src/options.classifiers/is-text-element.ts
  var TAG_NAME_SETS_BY_LIST = /* @__PURE__ */ new WeakMap();
  var TAG_NAME_SETS_BY_KEY = /* @__PURE__ */ new Map();
  var DEFAULT_SETTINGS2 = Object.freeze({
    tagNames: Object.freeze([
      "ADDRESS",
      "BLOCKQUOTE",
      "B",
      "CODE",
      "EM",
      "FIGURE",
      "FIGCAPTION",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "HR",
      "IMG",
      "LI",
      "OL",
      "P",
      "PRE",
      "SMALL",
      "SPAN",
      "STRONG",
      "SUB",
      "SUP",
      "TABLE",
      "TBODY",
      "TD",
      "THEAD",
      "TH",
      "TR",
      "UL"
    ])
  });
  function resolveTagNameSet(tagNames) {
    let tagNameSet = TAG_NAME_SETS_BY_LIST.get(tagNames);
    if (tagNameSet) return tagNameSet;
    const normalizedTagNames = tagNames.map((tagName) => tagName.toUpperCase());
    const key = normalizedTagNames.join("\n");
    tagNameSet = TAG_NAME_SETS_BY_KEY.get(key) ?? new Set(normalizedTagNames);
    TAG_NAME_SETS_BY_KEY.set(key, tagNameSet);
    TAG_NAME_SETS_BY_LIST.set(tagNames, tagNameSet);
    return tagNameSet;
  }
  function is_text_element_default(elementNode, settings = {}) {
    return resolveTagNameSet(settings.tagNames ?? DEFAULT_SETTINGS2.tagNames).has(elementNode.tagName.toUpperCase());
  }

  // src/options.normalizers.ts
  var options_normalizers_exports = {};
  __export(options_normalizers_exports, {
    assignUniqueIds: () => assign_unique_ids_default,
    filterAttributes: () => filter_attributes_default,
    filterComments: () => filter_comments_default,
    filterDataUrls: () => filter_data_urls_default,
    filterEmptyImages: () => filter_empty_images_default,
    filterNoiseElements: () => filter_noise_elements_default,
    normalizeIconClassesToImgs: () => normalize_icon_classes_to_imgs_default,
    normalizeSvgsToImgs: () => normalize_svgs_to_imgs_default,
    normalizeTextLabelAttributesToContent: () => normalize_text_label_attributes_to_content_default
  });

  // src/options.normalizers/util.normalizers.ts
  function forElements(normalizer) {
    return (virtualNode, liveNode, context, settings) => {
      if (virtualNode.nodeType !== 1 /* ELEMENT_NODE */) return;
      normalizer(virtualNode, liveNode, context, settings);
    };
  }
  function forAttributes(normalizer) {
    return (virtualNode, liveNode, context, settings) => {
      if (virtualNode.nodeType !== 2 /* ATTRIBUTE_NODE */) return;
      normalizer(virtualNode, liveNode, context, settings);
    };
  }
  function forComments(normalizer) {
    return (virtualNode, liveNode, context, settings) => {
      if (virtualNode.nodeType !== 8 /* COMMENT_NODE */) return;
      normalizer(virtualNode, liveNode, context, settings);
    };
  }

  // src/options.normalizers/filter-attributes.ts
  var ATTRIBUTE_NAME_SETS_BY_LIST = /* @__PURE__ */ new WeakMap();
  var ATTRIBUTE_NAME_SETS_BY_KEY = /* @__PURE__ */ new Map();
  var DEFAULT_SETTINGS3 = Object.freeze({
    attributeNames: Object.freeze([])
  });
  function normalizeCaseInsensitive(str) {
    return str.toUpperCase();
  }
  function normalizeCaseInsensitiveArray(tagNames) {
    return tagNames.map((tagName) => normalizeCaseInsensitive(tagName));
  }
  function resolveAttributeNameSet(attributeNames) {
    let attributeNameSet = ATTRIBUTE_NAME_SETS_BY_LIST.get(attributeNames);
    if (attributeNameSet) return attributeNameSet;
    const normalizedAttributeNames = normalizeCaseInsensitiveArray(attributeNames);
    const key = normalizedAttributeNames.join("\n");
    attributeNameSet = ATTRIBUTE_NAME_SETS_BY_KEY.get(key) ?? new Set(normalizedAttributeNames);
    ATTRIBUTE_NAME_SETS_BY_KEY.set(key, attributeNameSet);
    ATTRIBUTE_NAME_SETS_BY_LIST.set(attributeNames, attributeNameSet);
    return attributeNameSet;
  }
  var filter_attributes_default = forAttributes((virtualAttr, _liveAttr, _context, settings = {}) => {
    const attributeNames = resolveAttributeNameSet(settings.attributeNames ?? DEFAULT_SETTINGS3.attributeNames);
    if (attributeNames.has(normalizeCaseInsensitive(virtualAttr.name))) {
      virtualAttr.ownerElement?.removeAttribute(virtualAttr.name);
    }
  });

  // src/options.normalizers/filter-comments.ts
  var DEFAULT_SETTINGS4 = Object.freeze({
    keepPattern: null
  });
  var filter_comments_default = forComments((virtualComment, _liveComment, _context, settings = {}) => {
    const keepPattern = settings.keepPattern ?? DEFAULT_SETTINGS4.keepPattern;
    if (keepPattern) {
      keepPattern.lastIndex = 0;
      if (keepPattern.test(virtualComment.data)) return;
    }
    virtualComment.parentNode?.removeChild(virtualComment);
  });

  // src/options.normalizers/filter-data-urls.ts
  var DEFAULT_SETTINGS5 = Object.freeze({
    attributeNames: Object.freeze(["src"]),
    valuePattern: /^data:/i
  });
  var filter_data_urls_default = forAttributes((virtualAttr, _liveAttr, _context, settings = {}) => {
    const attributeNames = settings.attributeNames ?? DEFAULT_SETTINGS5.attributeNames;
    const valuePattern = settings.valuePattern ?? DEFAULT_SETTINGS5.valuePattern;
    if (!attributeNames.some((attributeName) => attributeName.toLowerCase() === virtualAttr.name.toLowerCase())) return;
    valuePattern.lastIndex = 0;
    if (!valuePattern.test(virtualAttr.value)) return;
    virtualAttr.ownerElement?.removeAttribute(virtualAttr.name);
  });

  // src/options.normalizers/filter-noise-elements.ts
  var DEFAULT_SETTINGS6 = Object.freeze({
    tagNames: Object.freeze([
      "CIRCLE",
      "CLIPPATH",
      "DEFS",
      "ELLIPSE",
      "FILTER",
      "G",
      "IMAGE",
      "LINE",
      "LINEARGRADIENT",
      "LINK",
      "MASK",
      "META",
      "NOSCRIPT",
      "PATH",
      "PATTERN",
      "POLYGON",
      "POLYLINE",
      "RADIALGRADIENT",
      "RECT",
      "SCRIPT",
      "STOP",
      "STYLE",
      "TEMPLATE",
      "USE"
    ])
  });
  var TAG_NAME_SETS_BY_LIST2 = /* @__PURE__ */ new WeakMap();
  var TAG_NAME_SETS_BY_KEY2 = /* @__PURE__ */ new Map();
  function normalizeCaseInsensitive2(str) {
    return str.toUpperCase();
  }
  function normalizeCaseInsensitiveArray2(tagNames) {
    return tagNames.map((tagName) => normalizeCaseInsensitive2(tagName));
  }
  function resolveTagNameSet2(tagNames) {
    let tagNameSet = TAG_NAME_SETS_BY_LIST2.get(tagNames);
    if (tagNameSet) return tagNameSet;
    const normalizedTagNames = normalizeCaseInsensitiveArray2(tagNames);
    const key = normalizedTagNames.join("\n");
    tagNameSet = TAG_NAME_SETS_BY_KEY2.get(key) ?? new Set(normalizedTagNames);
    TAG_NAME_SETS_BY_KEY2.set(key, tagNameSet);
    TAG_NAME_SETS_BY_LIST2.set(tagNames, tagNameSet);
    return tagNameSet;
  }
  var filter_noise_elements_default = forElements((virtualElement, _liveElement, _context, settings = {}) => {
    const tagNames = resolveTagNameSet2(settings.tagNames ?? DEFAULT_SETTINGS6.tagNames);
    if (tagNames.has(normalizeCaseInsensitive2(virtualElement.tagName))) {
      virtualElement.remove();
    }
  });

  // src/options.normalizers/filter-empty-images.ts
  var DEFAULT_SETTINGS7 = Object.freeze({
    labelAttributeNames: Object.freeze([
      "aria-labelledby",
      "aria-label",
      "title"
    ])
  });
  function normalizeCaseInsensitive3(str) {
    return str.toUpperCase();
  }
  function elementHasTagName(elementNode, tagName) {
    return normalizeCaseInsensitive3(elementNode.tagName) === normalizeCaseInsensitive3(tagName);
  }
  function resolveAttributeAsString(elementNode, attributeName) {
    return (elementNode.getAttribute(attributeName) ?? "").trim();
  }
  function resolveIdReferenceText(elementNode, document2, id) {
    const selector = `[id="${id.replace(/["\\]/g, "\\$&")}"]`;
    const scopes = [elementNode.getRootNode(), document2];
    for (const scope of scopes) {
      for (const candidate of scope.querySelectorAll?.(selector) ?? []) {
        const text = (candidate.textContent ?? "").trim();
        if (text) return text;
      }
    }
    return "";
  }
  function getElementLabelAttribute(elementNode, document2, labelAttributeNames) {
    for (const labelAttributeName of labelAttributeNames) {
      const labelAttributeValue = resolveAttributeAsString(elementNode, labelAttributeName.toLowerCase());
      if (!labelAttributeValue) continue;
      if (normalizeCaseInsensitive3(labelAttributeName) !== normalizeCaseInsensitive3("aria-labelledby")) {
        return labelAttributeValue;
      }
      const referencedText = labelAttributeValue.split(/\s+/).map((id) => resolveIdReferenceText(elementNode, document2, id)).filter(Boolean).join(" ");
      if (referencedText) return referencedText;
    }
    return null;
  }
  function resolveLabel(liveElement, document2, labelAttributeNames) {
    return getElementLabelAttribute(liveElement, document2, labelAttributeNames);
  }
  var filter_empty_images_default = forElements((virtualElement, liveElement, context, settings = {}) => {
    const document2 = context.document;
    const labelAttributeNames = settings.labelAttributeNames ?? DEFAULT_SETTINGS7.labelAttributeNames;
    if (elementHasTagName(virtualElement, "IMG") && !resolveLabel(liveElement, document2, labelAttributeNames)) {
      if (!resolveAttributeAsString(virtualElement, "src") && !resolveAttributeAsString(virtualElement, "alt")) {
        virtualElement.remove();
      }
    }
  });

  // src/options.normalizers/normalize-icon-classes-to-imgs.ts
  var DEFAULT_SETTINGS8 = Object.freeze({
    iconClassPrefixes: Object.freeze([]),
    labelAttributeNames: Object.freeze([
      "aria-labelledby",
      "aria-label",
      "title"
    ])
  });
  var UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER = "-";
  function normalizeCaseInsensitive4(str) {
    return str.toUpperCase();
  }
  function elementHasTagName2(elementNode, tagName) {
    return normalizeCaseInsensitive4(elementNode.tagName) === normalizeCaseInsensitive4(tagName);
  }
  function hasRenderedText(node) {
    for (const child of node.childNodes) {
      if (child.nodeType === 3 /* TEXT_NODE */) {
        if ((child.nodeValue ?? "").trim()) return true;
        continue;
      }
      if (child.nodeType !== 1 /* ELEMENT_NODE */) continue;
      if (NON_RENDERED_TAG_NAMES.has(normalizeCaseInsensitive4(child.tagName))) continue;
      if (hasRenderedText(child)) return true;
    }
    return false;
  }
  function elementHasNoTextContent(elementNode) {
    return !hasRenderedText(elementNode) && ![...elementNode.getElementsByTagName("img")].some((image) => !!resolveAttributeAsString2(image, "alt"));
  }
  function resolveAttributeAsString2(elementNode, attributeName) {
    return (elementNode.getAttribute(attributeName) ?? "").trim();
  }
  function resolveIdReferenceText2(elementNode, document2, id) {
    const selector = `[id="${id.replace(/["\\]/g, "\\$&")}"]`;
    const scopes = [elementNode.getRootNode(), document2];
    for (const scope of scopes) {
      for (const candidate of scope.querySelectorAll?.(selector) ?? []) {
        const text = (candidate.textContent ?? "").trim();
        if (text) return text;
      }
    }
    return "";
  }
  function getElementLabelAttribute2(elementNode, document2, labelAttributeNames) {
    for (const labelAttributeName of labelAttributeNames) {
      const labelAttributeValue = resolveAttributeAsString2(elementNode, labelAttributeName.toLowerCase());
      if (!labelAttributeValue) continue;
      if (normalizeCaseInsensitive4(labelAttributeName) !== normalizeCaseInsensitive4("aria-labelledby")) {
        return labelAttributeValue;
      }
      const referencedText = labelAttributeValue.split(/\s+/).map((id) => resolveIdReferenceText2(elementNode, document2, id)).filter(Boolean).join(" ");
      if (referencedText) return referencedText;
    }
    return null;
  }
  function resolveLabel2(liveElement, document2, labelAttributeNames) {
    return getElementLabelAttribute2(liveElement, document2, labelAttributeNames);
  }
  function createImage(document2, alt = "") {
    const imgSubstituteElementNode = document2.createElement("img");
    alt && imgSubstituteElementNode.setAttribute("alt", alt);
    return imgSubstituteElementNode;
  }
  function replaceElementByImage(elementNode, document2, alt = "") {
    const imgSubstituteElementNode = createImage(document2, alt);
    elementNode.replaceWith(imgSubstituteElementNode);
    return imgSubstituteElementNode;
  }
  var normalize_icon_classes_to_imgs_default = forElements((virtualElement, liveElement, context, settings = {}) => {
    const document2 = context.document;
    const labelAttributeNames = settings.labelAttributeNames ?? DEFAULT_SETTINGS8.labelAttributeNames;
    const iconClassPrefixes = settings.iconClassPrefixes ?? DEFAULT_SETTINGS8.iconClassPrefixes;
    if (elementHasTagName2(virtualElement, "SVG")) return;
    if (virtualElement.children.length === 0 && elementHasNoTextContent(virtualElement)) {
      let iconfontsInClass = null;
      for (const className of [...virtualElement.classList].reverse()) {
        const iconfontName = iconClassPrefixes.find((name) => {
          return className.startsWith(`${name}${UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER}`);
        });
        if (!iconfontName) continue;
        iconfontsInClass = className.slice(iconfontName.length + UNIVERSAL_ICONFONT_PREFIX_SUFFIX_DELIMITER.length);
        break;
      }
      if (iconfontsInClass) {
        const alt = resolveLabel2(liveElement, document2, labelAttributeNames) ?? iconfontsInClass;
        if (!context.classifiers.actionableElement(liveElement)) {
          replaceElementByImage(virtualElement, document2, alt);
        } else {
          virtualElement.prepend(createImage(document2, alt));
        }
      }
    }
  });

  // src/options.normalizers/normalize-text-label-attributes-to-content.ts
  var DEFAULT_SETTINGS9 = Object.freeze({
    labelAttributeNames: Object.freeze([
      "aria-labelledby",
      "aria-label",
      "title"
    ])
  });
  function normalizeCaseInsensitive5(str) {
    return str.toUpperCase();
  }
  function elementHasTagName3(elementNode, tagName) {
    return normalizeCaseInsensitive5(elementNode.tagName) === normalizeCaseInsensitive5(tagName);
  }
  function hasRenderedText2(node) {
    for (const child of node.childNodes) {
      if (child.nodeType === 3 /* TEXT_NODE */) {
        if ((child.nodeValue ?? "").trim()) return true;
        continue;
      }
      if (child.nodeType !== 1 /* ELEMENT_NODE */) continue;
      if (NON_RENDERED_TAG_NAMES.has(normalizeCaseInsensitive5(child.tagName))) continue;
      if (hasRenderedText2(child)) return true;
    }
    return false;
  }
  function elementHasNoTextContent2(elementNode) {
    return !hasRenderedText2(elementNode) && ![...elementNode.getElementsByTagName("img")].some((image) => !!resolveAttributeAsString3(image, "alt"));
  }
  function resolveAttributeAsString3(elementNode, attributeName) {
    return (elementNode.getAttribute(attributeName) ?? "").trim();
  }
  function resolveIdReferenceText3(elementNode, document2, id) {
    const selector = `[id="${id.replace(/["\\]/g, "\\$&")}"]`;
    const scopes = [elementNode.getRootNode(), document2];
    for (const scope of scopes) {
      for (const candidate of scope.querySelectorAll?.(selector) ?? []) {
        const text = (candidate.textContent ?? "").trim();
        if (text) return text;
      }
    }
    return "";
  }
  function getElementLabelAttribute3(elementNode, document2, labelAttributeNames) {
    for (const labelAttributeName of labelAttributeNames) {
      const labelAttributeValue = resolveAttributeAsString3(elementNode, labelAttributeName.toLowerCase());
      if (!labelAttributeValue) continue;
      if (normalizeCaseInsensitive5(labelAttributeName) !== normalizeCaseInsensitive5("aria-labelledby")) {
        return labelAttributeValue;
      }
      const referencedText = labelAttributeValue.split(/\s+/).map((id) => resolveIdReferenceText3(elementNode, document2, id)).filter(Boolean).join(" ");
      if (referencedText) return referencedText;
    }
    return null;
  }
  function resolveLabel3(liveElement, document2, labelAttributeNames) {
    return getElementLabelAttribute3(liveElement, document2, labelAttributeNames);
  }
  var normalize_text_label_attributes_to_content_default = forElements((virtualElement, liveElement, context, settings = {}) => {
    const document2 = context.document;
    const labelAttributeNames = settings.labelAttributeNames ?? DEFAULT_SETTINGS9.labelAttributeNames;
    if (!isRawTextElement(virtualElement.tagName)) {
      const labelAttributeValue = resolveLabel3(liveElement, document2, labelAttributeNames);
      if (labelAttributeValue) {
        if (elementHasTagName3(virtualElement, "IMG")) {
          const altAttributeValue = resolveAttributeAsString3(virtualElement, "alt");
          !altAttributeValue && virtualElement.setAttribute("alt", labelAttributeValue);
        } else if (!isVoidElement(virtualElement.tagName)) {
          elementHasNoTextContent2(virtualElement) && virtualElement.prepend(labelAttributeValue);
        }
      }
    }
  });

  // src/options.normalizers/normalize-svgs-to-imgs.ts
  var DEFAULT_SETTINGS10 = Object.freeze({
    labelAttributeNames: Object.freeze([
      "aria-labelledby",
      "aria-label",
      "title"
    ])
  });
  function normalizeCaseInsensitive6(str) {
    return str.toUpperCase();
  }
  function elementHasTagName4(elementNode, tagName) {
    return normalizeCaseInsensitive6(elementNode.tagName) === normalizeCaseInsensitive6(tagName);
  }
  function resolveAttributeAsString4(elementNode, attributeName) {
    return (elementNode.getAttribute(attributeName) ?? "").trim();
  }
  function resolveIdReferenceText4(elementNode, document2, id) {
    const selector = `[id="${id.replace(/["\\]/g, "\\$&")}"]`;
    const scopes = [elementNode.getRootNode(), document2];
    for (const scope of scopes) {
      for (const candidate of scope.querySelectorAll?.(selector) ?? []) {
        const text = (candidate.textContent ?? "").trim();
        if (text) return text;
      }
    }
    return "";
  }
  function getElementLabelAttribute4(elementNode, document2, labelAttributeNames) {
    for (const labelAttributeName of labelAttributeNames) {
      const labelAttributeValue = resolveAttributeAsString4(elementNode, labelAttributeName.toLowerCase());
      if (!labelAttributeValue) continue;
      if (normalizeCaseInsensitive6(labelAttributeName) !== normalizeCaseInsensitive6("aria-labelledby")) {
        return labelAttributeValue;
      }
      const referencedText = labelAttributeValue.split(/\s+/).map((id) => resolveIdReferenceText4(elementNode, document2, id)).filter(Boolean).join(" ");
      if (referencedText) return referencedText;
    }
    return null;
  }
  function resolveLabel4(liveElement, document2, labelAttributeNames) {
    return getElementLabelAttribute4(liveElement, document2, labelAttributeNames);
  }
  function createImage2(document2, alt = "") {
    const imgSubstituteElementNode = document2.createElement("img");
    alt && imgSubstituteElementNode.setAttribute("alt", alt);
    return imgSubstituteElementNode;
  }
  function replaceElementByImage2(elementNode, document2, alt = "") {
    const imgSubstituteElementNode = createImage2(document2, alt);
    elementNode.replaceWith(imgSubstituteElementNode);
    return imgSubstituteElementNode;
  }
  var normalize_svgs_to_imgs_default = forElements((virtualElement, liveElement, context, settings = {}) => {
    const document2 = context.document;
    const labelAttributeNames = settings.labelAttributeNames ?? DEFAULT_SETTINGS10.labelAttributeNames;
    if (!elementHasTagName4(virtualElement, "SVG")) return;
    let labelValue = "";
    for (const svgLabelTagName of SVG_LABEL_TAG_NAMES) {
      labelValue = (virtualElement.querySelector(svgLabelTagName.toLowerCase())?.textContent ?? "").trim();
      if (labelValue) break;
    }
    labelValue ||= resolveLabel4(liveElement, document2, labelAttributeNames) ?? "";
    replaceElementByImage2(virtualElement, document2, labelValue);
  });

  // src/options.normalizers/assign-unique-ids.ts
  var DEFAULT_SETTINGS11 = Object.freeze({
    attributeName: CONFIG.uniqueAttributeName
  });
  var NEXT_UNIQUE_IDS = /* @__PURE__ */ new WeakMap();
  var OCCUPIED_UNIQUE_IDS = /* @__PURE__ */ new WeakMap();
  function resolveAttributeAsString5(elementNode, attributeName) {
    return (elementNode.getAttribute(attributeName) ?? "").trim();
  }
  function resolveMap(map, key) {
    !map.has(key) && map.set(key, /* @__PURE__ */ new Map());
    return map.get(key);
  }
  function allocateUniqueID(liveDocument, virtualDocument, attributeName) {
    const occupiedUniqueIDsByAttribute = resolveMap(OCCUPIED_UNIQUE_IDS, virtualDocument);
    if (!occupiedUniqueIDsByAttribute.has(attributeName)) {
      occupiedUniqueIDsByAttribute.set(attributeName, new Set(
        [...liveDocument.querySelectorAll(`[${attributeName}]`)].map((elementNode) => resolveAttributeAsString5(elementNode, attributeName))
      ));
    }
    const occupiedUniqueIDs = occupiedUniqueIDsByAttribute.get(attributeName);
    const nextUniqueIDs = resolveMap(NEXT_UNIQUE_IDS, liveDocument);
    let uniqueID = nextUniqueIDs.get(attributeName) ?? [...occupiedUniqueIDs].reduce((max, id) => Math.max(max, parseInt(id) || 0), -1) + 1;
    while (occupiedUniqueIDs.has(uniqueID.toString())) uniqueID++;
    occupiedUniqueIDs.add(uniqueID.toString());
    nextUniqueIDs.set(attributeName, uniqueID + 1);
    return uniqueID.toString();
  }
  var assign_unique_ids_default = forElements((virtualElement, liveElement, context, settings = {}) => {
    const attributeName = settings.attributeName ?? DEFAULT_SETTINGS11.attributeName;
    if (liveElement === virtualElement) return;
    if (isInlineElement(liveElement.tagName) && isVoidElement(liveElement.tagName)) return;
    let uniqueID = resolveAttributeAsString5(liveElement, attributeName);
    if (!uniqueID) {
      uniqueID = allocateUniqueID(liveElement.ownerDocument, context.document, attributeName);
      liveElement.setAttribute(attributeName, uniqueID);
    }
    virtualElement.setAttribute(attributeName, uniqueID);
  });

  // src/TextRank.ts
  var TOKEN_PATTERN_REGEX = /[\p{L}\p{N}]+/gu;
  var DEFAULT_SETTINGS12 = Object.freeze({
    damping: 0.75,
    maxIterations: 20,
    minSimilarity: 0.1,
    tolerance: 1e-4
  });
  function initArray(n) {
    return Array.from({ length: n }, () => null);
  }
  function textRank(sentences, options = {}) {
    if (!sentences.length) return [];
    const optionsWithDefaults = deepMerge({ ...DEFAULT_SETTINGS12 }, options);
    const sentenceCount = sentences.length;
    const termFrequencyPerSentence = initArray(sentenceCount);
    const sentenceVectorNorms = new Float64Array(sentenceCount);
    for (let i = 0; i < sentenceCount; i++) {
      const termFrequencies = /* @__PURE__ */ new Map();
      const lowercaseSentence = sentences[i].toLowerCase();
      let tokenMatch;
      while ((tokenMatch = TOKEN_PATTERN_REGEX.exec(lowercaseSentence)) !== null) {
        const token = tokenMatch[0];
        const previousCount = termFrequencies.get(token) ?? 0;
        termFrequencies.set(token, previousCount + 1);
      }
      termFrequencyPerSentence[i] = termFrequencies;
      let sumOfSquaredCounts = 0;
      for (const count of termFrequencies.values()) {
        sumOfSquaredCounts += count * count;
      }
      sentenceVectorNorms[i] = Math.sqrt(sumOfSquaredCounts);
    }
    const tokenPostings = /* @__PURE__ */ new Map();
    for (let i = 0; i < sentenceCount; i++) {
      for (const token of termFrequencyPerSentence[i].keys()) {
        let postingList = tokenPostings.get(token);
        if (!postingList) {
          postingList = [];
          tokenPostings.set(token, postingList);
        }
        postingList.push(i);
      }
    }
    const neighborIndicesPerSentence = initArray(sentenceCount);
    const neighborWeightsPerSentence = initArray(sentenceCount);
    const weightedOutDegree = new Float64Array(sentenceCount);
    const dotProductAccumulator = new Float64Array(sentenceCount);
    const touchedNeighbors = [];
    for (let i = 0; i < sentenceCount; i++) {
      const sourceNorm = sentenceVectorNorms[i];
      if (sourceNorm === 0) {
        neighborIndicesPerSentence[i] = [];
        neighborWeightsPerSentence[i] = new Float64Array(0);
        continue;
      }
      const sourceTermFrequencies = termFrequencyPerSentence[i];
      for (const [token, sourceCount] of sourceTermFrequencies) {
        const postingList = tokenPostings.get(token);
        for (let j = 0; j < postingList.length; j++) {
          const targetIndex = postingList[j];
          if (targetIndex === i) continue;
          if (dotProductAccumulator[targetIndex] === 0) {
            touchedNeighbors.push(targetIndex);
          }
          const targetCount = termFrequencyPerSentence[targetIndex].get(token);
          dotProductAccumulator[targetIndex] += sourceCount * targetCount;
        }
      }
      const neighborIndices = [];
      const neighborWeights = [];
      let outDegreeSum = 0;
      for (let k = 0; k < touchedNeighbors.length; k++) {
        const targetIndex = touchedNeighbors[k];
        const dotProduct = dotProductAccumulator[targetIndex];
        const targetNorm = sentenceVectorNorms[targetIndex];
        if (dotProduct > 0 && targetNorm > 0) {
          const cosineSimilarity = dotProduct / (sourceNorm * targetNorm);
          if (cosineSimilarity > optionsWithDefaults.minSimilarity) {
            neighborIndices.push(targetIndex);
            neighborWeights.push(cosineSimilarity);
            outDegreeSum += cosineSimilarity;
          }
        }
        dotProductAccumulator[targetIndex] = 0;
      }
      touchedNeighbors.length = 0;
      neighborIndicesPerSentence[i] = neighborIndices;
      neighborWeightsPerSentence[i] = Float64Array.from(neighborWeights);
      weightedOutDegree[i] = outDegreeSum;
    }
    let currentScores = new Float64Array(sentenceCount).fill(1);
    let nextScores = new Float64Array(sentenceCount);
    const damping = optionsWithDefaults.damping;
    const teleportTerm = 1 - damping;
    const tolerance = optionsWithDefaults.tolerance;
    const maxIterations = optionsWithDefaults.maxIterations;
    for (let i = 0; i < maxIterations; i++) {
      let totalAbsoluteDelta = 0;
      for (let j = 0; j < sentenceCount; j++) {
        const neighborIndices = neighborIndicesPerSentence[j];
        const neighborWeights = neighborWeightsPerSentence[j];
        let weightedScoreSum = 0;
        for (let k = 0; k < neighborIndices.length; k++) {
          const neighborIndex = neighborIndices[k];
          const neighborOutDegree = weightedOutDegree[neighborIndex];
          if (neighborOutDegree > 0) {
            weightedScoreSum += neighborWeights[k] / neighborOutDegree * currentScores[neighborIndex];
          }
        }
        const updatedScore = teleportTerm + damping * weightedScoreSum;
        const scoreDifference = updatedScore - currentScores[j];
        nextScores[j] = updatedScore;
        totalAbsoluteDelta += scoreDifference < 0 ? -scoreDifference : scoreDifference;
      }
      const swapBuffer = currentScores;
      currentScores = nextScores;
      nextScores = swapBuffer;
      if (totalAbsoluteDelta < tolerance * sentenceCount) break;
    }
    return sentences.map((sentence, i) => ({
      sentence,
      index: i,
      score: currentScores[i]
    })).sort((a, b) => b.score - a.score);
  }
  function rankSentences(sentences, options = {}) {
    return textRank(sentences, options).map((obj) => obj.sentence);
  }

  // src/options.sentenceRankers/text-rank.ts
  var DEFAULT_SETTINGS13 = DEFAULT_SETTINGS12;
  function textRank2(sentences, settings = {}) {
    return rankSentences(sentences, settings);
  }

  // src/options.classifiers.ts
  var options_classifiers_exports = {};
  __export(options_classifiers_exports, {
    isActionableElement: () => is_actionable_element_default,
    isTextElement: () => is_text_element_default
  });

  // src/options.sentenceRankers.ts
  var options_sentenceRankers_exports = {};
  __export(options_sentenceRankers_exports, {
    textRank: () => textRank2
  });

  // src/constants.defaults.ts
  var ATTRIBUTE_SCORES = Object.freeze({
    // Maximum preservance:
    "data-uid": 1,
    "role": 1,
    "alt": 1,
    // Affordance-frequency balanced (to render rA a latent ratio, otherwise threshold)
    "href": 0.91,
    "src": 0.83,
    "class": 0.77,
    "id": 0.68,
    "value": 0.43,
    "name": 0.4,
    "type": 0.38,
    "checked": 0.36,
    "controls": 0.36,
    "selected": 0.35,
    "disabled": 0.34,
    "readonly": 0.33,
    "required": 0.33,
    "label": 0.31,
    "lang": 0.3,
    "for": 0.3,
    "title": 0.29,
    "hidden": 0.28,
    "action": 0.27,
    "method": 0.27,
    "form": 0.26,
    "multiple": 0.26,
    "placeholder": 0.25,
    "accept": 0.24,
    "min": 0.23,
    "max": 0.23,
    "pattern": 0.22,
    "step": 0.22,
    "maxlength": 0.21,
    "minlength": 0.21,
    "srcset": 0.2,
    "sizes": 0.19,
    "rel": 0.18,
    "enctype": 0.17,
    "target": 0.17,
    "autofocus": 0.16,
    "tabindex": 0.16,
    "autocomplete": 0.15,
    "contenteditable": 0.15,
    "datetime": 0.15,
    "style": 0.1,
    "content": 0.05,
    "loop": 0.04,
    "muted": 0.04,
    "size": 0.04,
    "media": 0.03,
    "autoplay": 0.03,
    "poster": 0.03,
    "preload": 0.02,
    "spellcheck": 0.02,
    "download": 0.02,
    "hreflang": 0.02,
    "novalidate": 0.02,
    "accept-charset": 0.01,
    "autocapitalize": 0.01,
    "draggable": 0.01,
    "cite": 0.01,
    "usemap": 0.01,
    "ismap": 0,
    "dropzone": 0,
    "accesskey": 0,
    "coords": 0,
    "shape": 0,
    "ping": 0,
    "wrap": 0.01,
    "http-equiv": 0.01,
    "aria-*": 0.62,
    // Fallback:
    "*": 0
  });
  var CLASSIFIERS = Object.freeze({
    actionableElement: is_actionable_element_default,
    textFormattingElement: is_text_element_default
  });
  var NORMALIZERS = Object.freeze([
    filter_comments_default,
    filter_noise_elements_default,
    filter_empty_images_default,
    normalize_svgs_to_imgs_default,
    normalize_icon_classes_to_imgs_default,
    normalize_text_label_attributes_to_content_default,
    filter_attributes_default,
    filter_data_urls_default
  ]);
  var SENTENCE_RANKER = textRank2;
  var CLASSIFIER_SETTINGS = Object.freeze({
    isActionableElement: DEFAULT_SETTINGS,
    isTextElement: DEFAULT_SETTINGS2
  });
  var NORMALIZER_SETTINGS = Object.freeze({
    filterAttributes: DEFAULT_SETTINGS3,
    filterComments: DEFAULT_SETTINGS4,
    filterDataUrls: DEFAULT_SETTINGS5,
    filterNoiseElements: DEFAULT_SETTINGS6,
    filterEmptyImages: DEFAULT_SETTINGS7,
    normalizeIconClassesToImgs: DEFAULT_SETTINGS8,
    normalizeTextLabelAttributesToContent: DEFAULT_SETTINGS9,
    normalizeSvgsToImgs: DEFAULT_SETTINGS10,
    assignUniqueIds: DEFAULT_SETTINGS11
  });
  var SENTENCE_RANKER_SETTINGS = Object.freeze({
    textRank: DEFAULT_SETTINGS13
  });

  // src/D2Snap.ts
  var COLON_SCHEME_TAG_REGEX = /^[a-z][a-z0-9+.-]*:(?![a-z_][a-z0-9_.-]*$)/i;
  var WHITESPACE_REGEX = /^\s$/;
  function validateUnitParameter(name, value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
    }
  }
  function resolveD2SnapArgs(args) {
    const [ratiosOrRE, optionsOrRA] = args;
    if (typeof ratiosOrRE === "object" && ratiosOrRE !== null) {
      const ratios = ratiosOrRE;
      ratios.r !== void 0 && validateUnitParameter("r", ratios.r);
      const r = ratios.r ?? 0;
      return {
        rE: ratios.rE ?? r,
        rA: ratios.rA ?? r,
        rT: ratios.rT ?? r,
        options: optionsOrRA ?? {}
      };
    }
    const [rE, rA, rT, options] = args;
    return {
      rE,
      rA,
      rT,
      options: options ?? {}
    };
  }
  function defineNonEnumerableProperty(obj, prop, value) {
    Object.defineProperty(obj, prop, {
      value,
      writable: false,
      configurable: true,
      enumerable: false
    });
  }
  function getAttributeScore(attrName, attributeScores = new Map(
    Object.entries(ATTRIBUTE_SCORES).map((entry) => [entry[0].toLowerCase(), entry[1]])
  )) {
    let normalizedName = attrName.toLowerCase();
    if (!attributeScores.has(normalizedName)) {
      const nameParts = normalizedName.split("-");
      for (let i = nameParts.length - 1; i > 0; i--) {
        const wildcardName = `${nameParts.slice(0, i).join("-")}-*`;
        if (attributeScores.has(wildcardName)) {
          normalizedName = wildcardName;
          break;
        }
      }
    }
    const attributeScore = attributeScores.get(normalizedName) ?? attributeScores.get(CONFIG.attributeScoresFallbackKey) ?? CONFIG.attributeScoresDefaultFallbackValue;
    return attributeScore;
  }
  function createVirtualDOM(document2, rootElement) {
    const inertDoc = document2.implementation.createHTMLDocument("");
    const rootElementClone = inertDoc.importNode(rootElement, true);
    switch (rootElement.localName.toLowerCase()) {
      case "html":
        inertDoc.replaceChild(rootElementClone, inertDoc.documentElement);
        break;
      case "body":
        inertDoc.documentElement.replaceChild(rootElementClone, inertDoc.body);
        break;
      default:
        inertDoc.body.appendChild(rootElementClone);
    }
    const virtualDOM = rootElement.nodeType === 9 /* DOCUMENT_NODE */ ? inertDoc.documentElement : inertDoc.body;
    const liveDOM = rootElement.localName.toLowerCase() === "html" ? rootElement.querySelector("body") ?? rootElement : rootElement;
    return { inertDoc, virtualDOM, liveDOM };
  }
  function resolveNormalizers(options) {
    const normalizers = [...options.normalizers];
    options.uniqueIDs && !normalizers.includes(assign_unique_ids_default) && normalizers.push(assign_unique_ids_default);
    return normalizers;
  }
  function normalizeDOM(dom, options = {}) {
    const document2 = resolveDocument(dom);
    if (!document2) throw new ReferenceError("Could not resolve a valid document object from DOM");
    const rootElement = resolveRoot(dom);
    const optionsWithDefaults = deepMerge({
      classifiers: CLASSIFIERS,
      normalizers: NORMALIZERS,
      shadowDOM: false,
      uniqueIDs: false
    }, options);
    const { inertDoc, virtualDOM, liveDOM } = createVirtualDOM(document2, rootElement);
    preProcessDOM(virtualDOM, liveDOM, inertDoc, {
      classifiers: optionsWithDefaults.classifiers,
      normalizers: resolveNormalizers(optionsWithDefaults),
      shadowDOM: optionsWithDefaults.shadowDOM
    });
    return {
      dom: virtualDOM,
      get html() {
        return virtualDOM.innerHTML;
      },
      get innerHTML() {
        return virtualDOM.innerHTML;
      },
      get outerHTML() {
        return virtualDOM.outerHTML;
      }
    };
  }
  function d2Snap(dom, ...args) {
    const { rE, rA, rT, options } = resolveD2SnapArgs(args);
    validateUnitParameter("rE", rE);
    validateUnitParameter("rA", rA);
    validateUnitParameter("rT", rT);
    const document2 = resolveDocument(dom);
    if (!document2) throw new ReferenceError("Could not resolve a valid document object from DOM");
    const rootElement = resolveRoot(dom);
    const originalSize = getByteLength(serializeSnapshotRoot(rootElement));
    const optionsWithDefaults = deepMerge({
      attributeScores: ATTRIBUTE_SCORES,
      classifiers: CLASSIFIERS,
      debug: false,
      filterEmptyElements: true,
      prose: false,
      minify: true,
      normalizers: NORMALIZERS,
      shadowDOM: false,
      sentenceRanker: SENTENCE_RANKER,
      markdown: true,
      uniqueIDs: false
    }, options);
    const attributeScores = new Map(
      Object.entries(optionsWithDefaults.attributeScores).map((entry) => [entry[0].toLowerCase(), entry[1]])
    );
    const _isActionableElement = optionsWithDefaults.classifiers.actionableElement;
    const _isTextElement = optionsWithDefaults.classifiers.textFormattingElement;
    const _sentenceRanker = optionsWithDefaults.sentenceRanker ?? ((sentences) => sentences);
    const turndown = new Turndown([_isActionableElement]);
    function snapElementContainerNode(elementNode, rE2) {
      const considerContainerElement = (elementNode2) => {
        if (elementNode2.nodeType !== 1 /* ELEMENT_NODE */) return false;
        if (_isActionableElement(elementNode2)) return false;
        if (isVoidElement(elementNode2.tagName)) return false;
        return true;
      };
      if (!considerContainerElement(elementNode)) return;
      if (!elementNode.parentElement || !considerContainerElement(elementNode.parentElement)) return;
      const ratio = Math.min(1, Math.max(0, rE2));
      const isMergeLevel = elementNode.depth > 1 && Math.floor(elementNode.depth * ratio) > Math.floor((elementNode.depth - 1) * ratio);
      if (!isMergeLevel) return;
      const targetElement = elementNode.parentElement;
      const sourceElement = elementNode;
      while (sourceElement.childNodes.length) {
        targetElement.insertBefore(sourceElement.childNodes[0], sourceElement);
      }
      sourceElement.parentNode?.removeChild(sourceElement);
    }
    function snapTextNode(textNode, rT2) {
      if (textNode.nodeType !== 3 /* TEXT_NODE */) return;
      const text = textNode.textContent;
      if (!(text ?? "").trim().length) return;
      const leadingSpace = WHITESPACE_REGEX.test(text.charAt(0)) ? " " : "";
      const trailingSpace = WHITESPACE_REGEX.test(text.charAt(text.length - 1)) ? " " : "";
      textNode.textContent = [
        leadingSpace,
        transformWithRanking(text, 1 - rT2, _sentenceRanker, true),
        trailingSpace
      ].join("");
    }
    let contextualFragmentRange = null;
    let createTextNode = null;
    function snapElementTextFormattingNode(document3, elementNode) {
      if (!optionsWithDefaults.markdown) return;
      if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
      if (_isActionableElement(elementNode)) return;
      if (!_isTextElement(elementNode)) return;
      contextualFragmentRange ??= document3.createRange();
      createTextNode ??= document3.createTextNode.bind(document3);
      const markdown = turndown.translate(elementNode.outerHTML);
      if (!/[<&\r\0]/.test(markdown)) {
        const replacingNodes2 = markdown ? [createTextNode(markdown)] : [];
        elementNode.replaceWith(...[createTextNode(" "), ...replacingNodes2, createTextNode(" ")]);
        return replacingNodes2;
      }
      const markdownNodesFragment = contextualFragmentRange.createContextualFragment(markdown);
      const unwrapColonTaggedElements = (parent) => {
        for (const child of [...parent.childNodes]) {
          if (child.nodeType !== 1 /* ELEMENT_NODE */) continue;
          unwrapColonTaggedElements(child);
          if (!COLON_SCHEME_TAG_REGEX.test(child.tagName)) continue;
          while (child.firstChild) {
            parent.insertBefore(child.firstChild, child);
          }
          parent.removeChild(child);
        }
      };
      unwrapColonTaggedElements(markdownNodesFragment);
      const replacingNodes = [...markdownNodesFragment.childNodes];
      elementNode.replaceWith(...[createTextNode(" "), ...replacingNodes, createTextNode(" ")]);
      const sourceTagName = elementNode.tagName.toLowerCase();
      return replacingNodes.filter((n) => n.nodeType !== 1 /* ELEMENT_NODE */ || n.tagName.toLowerCase() !== sourceTagName);
    }
    function snapAttributeNode(elementNode, rA2) {
      if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
      for (const attr of Array.from(elementNode.attributes)) {
        if (getAttributeScore(attr.name, attributeScores) >= rA2) continue;
        elementNode.removeAttribute(attr.name);
      }
    }
    const t = optionsWithDefaults.debug ? performance.now.bind(performance) : () => 0;
    let t0;
    const timings = {};
    t0 = t();
    const { inertDoc, virtualDOM, liveDOM } = createVirtualDOM(document2, rootElement);
    timings.clone = t() - t0;
    t0 = t();
    preProcessDOM(virtualDOM, liveDOM, inertDoc, {
      classifiers: optionsWithDefaults.classifiers,
      normalizers: resolveNormalizers(optionsWithDefaults),
      shadowDOM: optionsWithDefaults.shadowDOM
    });
    timings.preProcessing = t() - t0;
    t0 = t();
    traverseDom(
      virtualDOM,
      1 /* SHOW_ELEMENT */,
      (element) => {
        const depth = (element?.parentNode?.depth ?? 0) + 1;
        defineNonEnumerableProperty(element, "depth", depth);
        const role = element.getAttribute("role");
        role && defineNonEnumerableProperty(element, "role", role);
      }
    );
    timings.writeDepth = t() - t0;
    t0 = t();
    optionsWithDefaults.prose ? snapTextBlocks(virtualDOM, 1 - rT, _sentenceRanker, _isActionableElement) : traverseDom(
      virtualDOM,
      4 /* SHOW_TEXT */,
      (node) => snapTextNode(node, rT)
    );
    timings.textNodes = t() - t0;
    t0 = t();
    traverseDom(
      virtualDOM,
      1 /* SHOW_ELEMENT */,
      (node) => snapElementTextFormattingNode(inertDoc, node)
    );
    timings.textFormatting = t() - t0;
    t0 = t();
    traverseDom(
      virtualDOM,
      1 /* SHOW_ELEMENT */,
      (node) => snapElementContainerNode(node, rE)
    );
    timings.containers = t() - t0;
    t0 = t();
    traverseDom(
      virtualDOM,
      1 /* SHOW_ELEMENT */,
      (node) => snapAttributeNode(node, rA)
    );
    timings.attributes = t() - t0;
    if (rE === 1) {
      [...virtualDOM.querySelectorAll("*")].filter((elementNode) => !_isActionableElement(elementNode)).forEach((element) => {
        element.replaceWith(...element.childNodes);
      });
    }
    t0 = t();
    postProcessDOM(virtualDOM, {
      filterEmptyElements: optionsWithDefaults.filterEmptyElements,
      minify: optionsWithDefaults.minify
    }, _isActionableElement);
    timings.domPostProcessing = t() - t0;
    const serialisation = {};
    const getHTML = (property) => {
      if (serialisation[property] !== void 0) {
        return serialisation[property];
      }
      t0 = t();
      let html = virtualDOM[property];
      timings.serialize = t() - t0;
      t0 = t();
      html = postProcessHTML(html, {
        debug: optionsWithDefaults.debug
      });
      timings.htmlPostProcessing = t() - t0;
      serialisation[property] = html;
      return html;
    };
    return {
      dom: virtualDOM,
      get html() {
        return getHTML("innerHTML");
      },
      get innerHTML() {
        return getHTML("innerHTML");
      },
      get outerHTML() {
        return getHTML("outerHTML");
      },
      meta: {
        originalSize,
        get snapshotSize() {
          return getByteLength(getHTML("innerHTML"));
        },
        get sizeRatio() {
          return getSizeRatio(getByteLength(getHTML("innerHTML")), originalSize);
        },
        get tokenEstimate() {
          return Math.round(getHTML("innerHTML").length / 4);
        },
        // according to https://platform.openai.com/tokenizer
        ...optionsWithDefaults.debug && { timings }
      }
    };
  }

  // src/util.search.ts
  function searchITP(f, bracket, options) {
    let { a, fa, b, fb } = bracket;
    let evaluations = 0;
    if (fa !== 0 && Math.sign(fa) === Math.sign(fb)) {
      throw new RangeError("Bracket does not enclose a sign change");
    }
    if (fa === 0 || fb === 0) return { a, fa, b, fb, evaluations };
    const width = b - a;
    const k1 = options.k1 ?? 0.2 / width;
    const k2 = options.k2 ?? 2;
    const n0 = options.n0 ?? 1;
    const nMax = Math.max(Math.ceil(Math.log2(width / (2 * options.epsilon))), 0) + n0;
    const targetWidth = 2 * options.epsilon * (1 + 1e-12);
    for (let j = 0; b - a > targetWidth; j++) {
      if (evaluations >= options.maxEvaluations) break;
      if (options.stop?.()) break;
      const xHalf = (a + b) / 2;
      const radius = options.epsilon * 2 ** (nMax - j) - (b - a) / 2;
      const delta = k1 * (b - a) ** k2;
      const xF = (fb * a - fa * b) / (fb - fa);
      const sigma = Math.sign(xHalf - xF);
      const xT = delta <= Math.abs(xHalf - xF) ? xF + sigma * delta : xHalf;
      const x = Math.abs(xT - xHalf) <= radius ? xT : xHalf - sigma * radius;
      const fx = f(x);
      evaluations++;
      if (fx === 0) return {
        a: x,
        fa: fx,
        b: x,
        fb: fx,
        evaluations
      };
      if (Math.sign(fx) === Math.sign(fa)) {
        a = x;
        fa = fx;
      } else {
        b = x;
        fb = fx;
      }
    }
    return {
      a,
      fa,
      b,
      fb,
      evaluations
    };
  }

  // src/AdaptiveD2Snap.ts
  var TOKEN_TOLERANCE = 0.05;
  var RATIO_RESOLUTION = 1e-3;
  var ITP_K1 = 0.05;
  var PLATEAU_TOKEN_SHARE = 0.85;
  function throwTokenLimitError(maxTokens, tokenEstimate) {
    const err = new RangeError(
      `Unable to create snapshot below ${maxTokens} tokens (last estimate: ${tokenEstimate})`
    );
    err.meta = {
      lastEstimate: tokenEstimate
    };
    throw err;
  }
  function adaptiveD2Snap(dom, maxTokens = 2 ** 15, maxIterations = 5, options = {}) {
    const originalSize = getByteLength(serializeSnapshotRoot(resolveRoot(dom)));
    const normalizedDOM = normalizeDOM(dom, options).dom;
    const snapshotOptions = {
      ...options,
      normalizers: [],
      shadowDOM: false,
      uniqueIDs: false
    };
    let snapshotCount = 0;
    let closestSnapshot = null;
    let closestRatio = 0;
    let aboveTokenEstimate = -1;
    let withinTokenEstimate = -1;
    let isPlateau = false;
    const snap = (r) => {
      const snapshot = d2Snap(normalizedDOM, r, r, r, snapshotOptions);
      const tokenEstimate = snapshot.meta.tokenEstimate;
      snapshotCount++;
      isPlateau = tokenEstimate === aboveTokenEstimate || tokenEstimate === withinTokenEstimate;
      if (tokenEstimate > maxTokens) {
        aboveTokenEstimate = tokenEstimate;
      } else {
        withinTokenEstimate = tokenEstimate;
      }
      if (tokenEstimate <= maxTokens && tokenEstimate > (closestSnapshot?.meta.tokenEstimate ?? -1)) {
        closestSnapshot = snapshot;
        closestRatio = r;
      }
      return tokenEstimate;
    };
    const isCloseTo = (share) => {
      return closestSnapshot.meta.tokenEstimate >= maxTokens * share;
    };
    const unreducedTokenEstimate = snap(0);
    if (!closestSnapshot) {
      if (maxIterations < 1) throwTokenLimitError(maxTokens, unreducedTokenEstimate);
      const reducedTokenEstimate = snap(1);
      if (!closestSnapshot) throwTokenLimitError(maxTokens, reducedTokenEstimate);
      searchITP(
        (r) => snap(r) - maxTokens,
        {
          a: 0,
          fa: unreducedTokenEstimate - maxTokens,
          b: 1,
          fb: reducedTokenEstimate - maxTokens
        },
        {
          epsilon: RATIO_RESOLUTION / 2,
          maxEvaluations: maxIterations - 1,
          k1: ITP_K1,
          stop: () => isCloseTo(1 - TOKEN_TOLERANCE) || isPlateau && isCloseTo(PLATEAU_TOKEN_SHARE)
        }
      );
    }
    const result = closestSnapshot;
    result.parameters = {
      rE: closestRatio,
      rA: closestRatio,
      rT: closestRatio
    };
    result.adaptiveIterations = snapshotCount - 1;
    result.meta.originalSize = originalSize;
    Object.defineProperty(result.meta, "sizeRatio", {
      get: () => getSizeRatio(result.meta.snapshotSize, originalSize),
      enumerable: true
    });
    return result;
  }

  // src/api.ts
  async function d2Snap2(domOrString, ...args) {
    return d2Snap(await ensureDOM(domOrString), ...args);
  }
  async function normalizeDOM2(domOrString, ...args) {
    return normalizeDOM(await ensureDOM(domOrString), ...args);
  }
  async function adaptiveD2Snap2(domOrString, ...args) {
    return adaptiveD2Snap(await ensureDOM(domOrString), ...args);
  }

  // src/api.browser.ts
  window.D2Snap = {
    ...api_exports
  };
})();
