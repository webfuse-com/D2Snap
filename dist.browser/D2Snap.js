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

  // src/util.dom.ts
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
  function traverseDom(root2, filter = 4294967295 /* SHOW_ALL */, cb) {
    const showElement = (filter & 1 /* SHOW_ELEMENT */) !== 0;
    const showText = (filter & 4 /* SHOW_TEXT */) !== 0;
    const showComment = (filter & 128 /* SHOW_COMMENT */) !== 0;
    const stack = [];
    for (let i = root2.childNodes.length - 1; i >= 0; i--) {
      stack.push(root2.childNodes[i]);
    }
    while (stack.length) {
      const node = stack.pop();
      const children = [...node.childNodes];
      const childIndex = stack.length;
      const childCount = children.length;
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
      const passes = filter === 4294967295 /* SHOW_ALL */ || node.nodeType === 1 /* ELEMENT_NODE */ && showElement || node.nodeType === 3 /* TEXT_NODE */ && showText || node.nodeType === 8 /* COMMENT_NODE */ && showComment;
      if (!passes) continue;
      const replacingNodes = cb(node);
      if (!replacingNodes?.length) continue;
      stack.splice(childIndex, childCount, ...[...replacingNodes].reverse());
    }
  }

  // src/util.html.ts
  var INLINE_TAG_NAMES = [
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
  ];
  var RAW_TEXT_TAG_NAMES = [
    "SCRIPT",
    "STYLE",
    "TEXTAREA",
    "TITLE"
  ];
  var VOID_TAG_NAMES = [
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
    "SOURCE",
    "TRACK",
    "WBR"
  ];
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
      if (VOID_TAG_NAMES.includes(tagName) || selfClosing) {
        tokens.push({
          kind: "void",
          tag: tagName,
          raw
        });
        continue;
      }
      if (RAW_TEXT_TAG_NAMES.includes(tagName)) {
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
    const isInline = (tag) => {
      return INLINE_TAG_NAMES.includes(tag) || VOID_TAG_NAMES.includes(tag);
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
  function dissolveToplevelTags(html) {
    const tokens = tokenize(html);
    const outputParts = [];
    let nestingDepth = 0;
    for (const token of tokens) {
      switch (token.kind) {
        case "open": {
          const isTopLevel = nestingDepth === 0;
          !isTopLevel && outputParts.push(token.raw);
          nestingDepth++;
          break;
        }
        case "close": {
          const isTopLevel = nestingDepth === 1;
          !isTopLevel && outputParts.push(token.raw);
          nestingDepth = Math.max(0, nestingDepth - 1);
          break;
        }
        case "void": {
          const isTopLevel = nestingDepth === 0;
          !isTopLevel && outputParts.push(token.raw);
          break;
        }
        case "raw": {
          if (nestingDepth === 0) {
            outputParts.push(token.content);
          } else {
            outputParts.push(
              [
                token.openRaw,
                token.content,
                token.closeRaw
              ].join("")
            );
          }
          break;
        }
        case "text":
        case "comment":
        case "doctype":
        case "cdata":
          outputParts.push(token.raw);
          break;
      }
    }
    return outputParts.join("");
  }

  // src/util.json.ts
  function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function mergeJSONs(source, target) {
    const result = {
      ...source
    };
    for (const key of Object.keys(target)) {
      const sourceValue = result[key];
      const targetValue = target[key];
      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = mergeJSONs(sourceValue, targetValue);
        continue;
      }
      if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
        result[key] = [.../* @__PURE__ */ new Set([...sourceValue, ...targetValue])];
        continue;
      }
      result[key] = targetValue;
    }
    return result;
  }

  // src/GroundTruth.ts
  var HARD_FALLBACK_RATING = 0;
  var SUPPORTED_WILDCARD_ATTRIBUTE_PREFIXES = [
    "aria-",
    "data-"
  ];
  var ATTRIBUTE_SUFFIX_WILDCARD = "*";
  var GroundTruth = class {
    groundTruth;
    elementsByType;
    elementTypeSets;
    nonContainerTagNames;
    containerRatings;
    containerFallbackRating;
    attributeRatings;
    attributeFallbackRating;
    attributeRatingCache = /* @__PURE__ */ new Map();
    constructor(groundTruth) {
      this.groundTruth = groundTruth;
      this.elementsByType = {
        container: this.groundTruth?.typeElement?.container?.tagNames ?? [],
        actionable: this.groundTruth?.typeElement?.actionable?.tagNames ?? [],
        textFormatting: this.groundTruth?.typeElement?.textFormatting?.tagNames ?? []
      };
      this.elementTypeSets = {
        container: new Set(this.elementsByType.container.map((t) => t.toLowerCase())),
        actionable: new Set(this.elementsByType.actionable.map((t) => t.toLowerCase())),
        textFormatting: new Set(this.elementsByType.textFormatting.map((t) => t.toLowerCase()))
      };
      this.nonContainerTagNames = /* @__PURE__ */ new Set([
        ...this.elementTypeSets.actionable,
        ...this.elementTypeSets.textFormatting
      ]);
      this.containerRatings = this.groundTruth?.typeElement?.container?.ratings ?? {};
      this.containerFallbackRating = this.groundTruth?.typeElement?.container?.fallbackRating ?? HARD_FALLBACK_RATING;
      this.attributeRatings = this.groundTruth?.typeAttribute?.ratings ?? {};
      this.attributeFallbackRating = this.groundTruth?.typeAttribute?.fallbackRating;
    }
    getElementsByType(type) {
      return [...this.elementsByType[type]];
    }
    isElementType(type, tagName) {
      const lowerTagName = tagName.toLowerCase();
      const isNativeElement = this.elementTypeSets[type].has(lowerTagName);
      if (isNativeElement) return true;
      if (type !== "container") return isNativeElement;
      const isCustomElement = !this.nonContainerTagNames.has(lowerTagName);
      return isCustomElement;
    }
    getContainerRating(tagName) {
      if (!tagName) return -Infinity;
      const rating = this.containerRatings[tagName.toLowerCase()];
      if (rating !== void 0) return rating;
      return this.containerFallbackRating;
    }
    getAttributeRatingPrecise(attributeName) {
      if (!attributeName) return -Infinity;
      const rating = this.attributeRatings[attributeName.toLowerCase()];
      if (rating !== void 0) return rating;
      return this.attributeFallbackRating;
    }
    getAttributeRating(attributeName) {
      const cached = this.attributeRatingCache.get(attributeName);
      if (cached !== void 0) return cached;
      let rating = this.getAttributeRatingPrecise(attributeName);
      if (!rating) {
        for (const prefix of SUPPORTED_WILDCARD_ATTRIBUTE_PREFIXES) {
          if (!attributeName.toLocaleLowerCase().startsWith(prefix)) continue;
          rating = this.getAttributeRatingPrecise(`${prefix}${ATTRIBUTE_SUFFIX_WILDCARD}`);
          break;
        }
      }
      const finalRating = rating ?? HARD_FALLBACK_RATING;
      this.attributeRatingCache.set(attributeName, finalRating);
      return finalRating;
    }
  };

  // src/TextRank.ts
  function initArray(n) {
    return Array.from({ length: n }, () => null);
  }
  function tokenizeSentences(text) {
    return text.split(/(?<=\p{Sentence_Terminal})\s|\n|\r/gu).map((rawSentence) => rawSentence.trim()).filter((sentence) => !!sentence);
  }
  function textRank(sentences, options = {}) {
    if (!sentences.length) return [];
    const optionsWithDefaults = {
      damping: 0.75,
      maxIterations: 20,
      minSimilarity: 0.1,
      tolerance: 1e-4,
      ...options
    };
    const sentenceCount = sentences.length;
    const termFrequencyPerSentence = initArray(sentenceCount);
    const sentenceVectorNorms = new Float64Array(sentenceCount);
    const tokenPattern = /[a-z0-9]+/g;
    for (let i = 0; i < sentenceCount; i++) {
      const termFrequencies = /* @__PURE__ */ new Map();
      const lowercaseSentence = sentences[i].toLowerCase();
      let tokenMatch;
      while ((tokenMatch = tokenPattern.exec(lowercaseSentence)) !== null) {
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
  function transform(text, ratio = 0.5, simple = false, noEmpty = false, textRankOptions = {}) {
    const sentences = tokenizeSentences(text);
    const k = Math.min(
      Math.max(
        Math.round(sentences.length * ratio),
        +noEmpty
      ),
      sentences.length
    );
    if (sentences.length <= k) return sentences.join("\n");
    if (simple) {
      return sentences.slice(0, k).join("\n");
    }
    return textRank(sentences, textRankOptions).slice(0, k).sort((a, b) => a.index - b.index).map((obj) => obj.sentence).join("\n");
  }

  // node_modules/turndown/lib/turndown.browser.es.js
  function extend(destination) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (source.hasOwnProperty(key)) destination[key] = source[key];
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
  var blockElements = [
    "ADDRESS",
    "ARTICLE",
    "ASIDE",
    "AUDIO",
    "BLOCKQUOTE",
    "BODY",
    "CANVAS",
    "CENTER",
    "DD",
    "DIR",
    "DIV",
    "DL",
    "DT",
    "FIELDSET",
    "FIGCAPTION",
    "FIGURE",
    "FOOTER",
    "FORM",
    "FRAMESET",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HEADER",
    "HGROUP",
    "HR",
    "HTML",
    "ISINDEX",
    "LI",
    "MAIN",
    "MENU",
    "NAV",
    "NOFRAMES",
    "NOSCRIPT",
    "OL",
    "OUTPUT",
    "P",
    "PRE",
    "SECTION",
    "TABLE",
    "TBODY",
    "TD",
    "TFOOT",
    "TH",
    "THEAD",
    "TR",
    "UL"
  ];
  function isBlock(node) {
    return is(node, blockElements);
  }
  var voidElements = [
    "AREA",
    "BASE",
    "BR",
    "COL",
    "COMMAND",
    "EMBED",
    "HR",
    "IMG",
    "INPUT",
    "KEYGEN",
    "LINK",
    "META",
    "PARAM",
    "SOURCE",
    "TRACK",
    "WBR"
  ];
  function isVoid(node) {
    return is(node, voidElements);
  }
  function hasVoid(node) {
    return has(node, voidElements);
  }
  var meaningfulWhenBlankElements = [
    "A",
    "TABLE",
    "THEAD",
    "TBODY",
    "TFOOT",
    "TH",
    "TD",
    "IFRAME",
    "SCRIPT",
    "AUDIO",
    "VIDEO"
  ];
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
      content = content.replace(/^\n+|\n+$/g, "");
      content = content.replace(/^/gm, "> ");
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
      content = content.replace(/^\n+/, "").replace(/\n+$/, "\n").replace(/\n/gm, "\n    ");
      var prefix = options.bulletListMarker + "   ";
      var parent = node.parentNode;
      if (parent.nodeName === "OL") {
        var start = parent.getAttribute("start");
        var index = Array.prototype.indexOf.call(parent.children, node);
        prefix = (start ? Number(start) + index : index + 1) + ".  ";
      }
      return prefix + content + (node.nextSibling && !/\n$/.test(content) ? "\n" : "");
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
      var href = node.getAttribute("href");
      if (href) href = href.replace(/([()])/g, "\\$1");
      var title = cleanAttribute(node.getAttribute("title"));
      if (title) title = ' "' + title.replace(/"/g, '\\"') + '"';
      return "[" + content + "](" + href + title + ")";
    }
  };
  rules.referenceLink = {
    filter: function(node, options) {
      return options.linkStyle === "referenced" && node.nodeName === "A" && node.getAttribute("href");
    },
    replacement: function(content, node, options) {
      var href = node.getAttribute("href");
      var title = cleanAttribute(node.getAttribute("title"));
      if (title) title = ' "' + title + '"';
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
      var alt = cleanAttribute(node.getAttribute("alt"));
      var src = node.getAttribute("src") || "";
      var title = cleanAttribute(node.getAttribute("title"));
      var titlePart = title ? ' "' + title + '"' : "";
      return src ? "![" + alt + "](" + src + titlePart + ")" : "";
    }
  };
  function cleanAttribute(attribute) {
    return attribute ? attribute.replace(/(\n+\s*)+/g, "\n") : "";
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
      if (new Parser().parseFromString("", "text/html")) {
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
      return { leading: "", trailing: "" };
    }
    var edges = edgeWhitespace(node.textContent);
    if (edges.leadingAscii && isFlankedByWhitespace("left", node, options)) {
      edges.leading = edges.leadingNonAscii;
    }
    if (edges.trailingAscii && isFlankedByWhitespace("right", node, options)) {
      edges.trailing = edges.trailingNonAscii;
    }
    return { leading: edges.leading, trailing: edges.trailing };
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
  var escapes = [
    [/\\/g, "\\\\"],
    [/\*/g, "\\*"],
    [/^-/g, "\\-"],
    [/^\+ /g, "\\+ "],
    [/^(=+)/g, "\\$1"],
    [/^(#{1,6}) /g, "\\$1 "],
    [/`/g, "\\`"],
    [/^~~~/g, "\\~~~"],
    [/\[/g, "\\["],
    [/\]/g, "\\]"],
    [/^>/g, "\\>"],
    [/_/g, "\\_"],
    [/^(\d+)\. /g, "$1\\. "]
  ];
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
        throw new TypeError(
          input + " is not a string, or an element/document/fragment node."
        );
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
      return escapes.reduce(function(accumulator, escape) {
        return accumulator.replace(escape[0], escape[1]);
      }, string);
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
  var turndown_browser_es_default = TurndownService;

  // node_modules/turndown-plugin-gfm/lib/turndown-plugin-gfm.es.js
  var highlightRegExp = /highlight-(?:text|source)-([a-z0-9]+)/;
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
        return "~" + content + "~";
      }
    });
  }
  var indexOf = Array.prototype.indexOf;
  var every = Array.prototype.every;
  var rules2 = {};
  rules2.tableCell = {
    filter: ["th", "td"],
    replacement: function(content, node) {
      return cell(content, node);
    }
  };
  rules2.tableRow = {
    filter: "tr",
    replacement: function(content, node) {
      var borderCells = "";
      var alignMap = { left: ":--", right: "--:", center: ":-:" };
      if (isHeadingRow(node)) {
        for (var i = 0; i < node.childNodes.length; i++) {
          var border = "---";
          var align = (node.childNodes[i].getAttribute("align") || "").toLowerCase();
          if (align) border = alignMap[align] || border;
          borderCells += cell(border, node.childNodes[i]);
        }
      }
      return "\n" + content + (borderCells ? "\n" + borderCells : "");
    }
  };
  rules2.table = {
    // Only convert tables with a heading row.
    // Tables with no heading row are kept using `keep` (see below).
    filter: function(node) {
      return node.nodeName === "TABLE" && isHeadingRow(node.rows[0]);
    },
    replacement: function(content) {
      content = content.replace("\n\n", "\n");
      return "\n\n" + content + "\n\n";
    }
  };
  rules2.tableSection = {
    filter: ["thead", "tbody", "tfoot"],
    replacement: function(content) {
      return content;
    }
  };
  function isHeadingRow(tr) {
    var parentNode = tr.parentNode;
    return parentNode.nodeName === "THEAD" || parentNode.firstChild === tr && (parentNode.nodeName === "TABLE" || isFirstTbody(parentNode)) && every.call(tr.childNodes, function(n) {
      return n.nodeName === "TH";
    });
  }
  function isFirstTbody(element) {
    var previousSibling = element.previousSibling;
    return element.nodeName === "TBODY" && (!previousSibling || previousSibling.nodeName === "THEAD" && /^\s*$/i.test(previousSibling.textContent));
  }
  function cell(content, node) {
    var index = indexOf.call(node.parentNode.childNodes, node);
    var prefix = " ";
    if (index === 0) prefix = "| ";
    return prefix + content + " |";
  }
  function tables(turndownService) {
    turndownService.keep(function(node) {
      return node.nodeName === "TABLE" && !isHeadingRow(node.rows[0]);
    });
    for (var key in rules2) turndownService.addRule(key, rules2[key]);
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
  var Turndown = class {
    service;
    constructor(keepTagNames) {
      this.service = new turndown_browser_es_default({
        headingStyle: "atx",
        bulletListMarker: "-",
        codeBlockStyle: "fenced"
      });
      const normalizedKeepTagNames = new Set(keepTagNames.map((tag) => tag.toLowerCase()));
      this.service.addRule("keep", {
        filter: (node) => node.nodeType === 1 && normalizedKeepTagNames.has(node.tagName.toLowerCase()),
        replacement: (_content, node) => node.outerHTML
      });
      this.service.use(gfm);
    }
    translate(html) {
      return this.service.turndown(html).trim();
    }
  };

  // src/var.CONFIG.ts
  var CONFIG = {
    filteredTagNames: [
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
    ],
    uniqueAttributeName: "data-uid"
  };

  // src/var.GROUND_TRUTH.ts
  var GROUND_TRUTH = {
    "typeElement": {
      "container": {
        "tagNames": [
          "article",
          "aside",
          "body",
          "div",
          "footer",
          "header",
          "html",
          "main",
          "nav",
          "section"
        ],
        "ratings": {
          "article": 0.95,
          "aside": 0.85,
          "body": 0.9,
          "div": 0.3,
          "footer": 0.7,
          "header": 0.75,
          "html": 0.1,
          "main": 0.85,
          "nav": 0.8,
          "section": 0.9
        },
        "fallbackRating": 0
      },
      "actionable": {
        "tagNames": [
          "a",
          "button",
          "details",
          "form",
          "input",
          "label",
          "select",
          "option",
          "summary",
          "textarea"
        ]
      },
      "textFormatting": {
        "tagNames": [
          "address",
          "blockquote",
          "b",
          "code",
          "em",
          "figure",
          "figcaption",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "hr",
          "img",
          "li",
          "ol",
          "p",
          "pre",
          "small",
          "span",
          "strong",
          "sub",
          "sup",
          "table",
          "tbody",
          "td",
          "thead",
          "th",
          "tr",
          "ul"
        ]
      }
    },
    "typeAttribute": {
      "ratings": {
        "alt": 0.9,
        "href": 0.9,
        "src": 0.8,
        "id": 0.8,
        "class": 0.7,
        "title": 0.6,
        "lang": 0.6,
        "role": 0.6,
        "placeholder": 0.5,
        "label": 0.5,
        "for": 0.5,
        "value": 0.5,
        "checked": 0.5,
        "disabled": 0.5,
        "readonly": 0.5,
        "required": 0.5,
        "maxlength": 0.5,
        "minlength": 0.5,
        "pattern": 0.5,
        "step": 0.5,
        "min": 0.5,
        "max": 0.5,
        "accept": 0.4,
        "accept-charset": 0.4,
        "action": 0.4,
        "method": 0.4,
        "enctype": 0.4,
        "target": 0.4,
        "rel": 0.4,
        "media": 0.4,
        "sizes": 0.4,
        "srcset": 0.4,
        "preload": 0.4,
        "autoplay": 0.4,
        "controls": 0.4,
        "loop": 0.4,
        "muted": 0.4,
        "poster": 0.4,
        "autofocus": 0.3,
        "autocomplete": 0.3,
        "autocapitalize": 0.3,
        "spellcheck": 0.3,
        "contenteditable": 0.3,
        "draggable": 0.3,
        "dropzone": 0.3,
        "tabindex": 0.3,
        "accesskey": 0.3,
        "cite": 0.3,
        "datetime": 0.3,
        "coords": 0.3,
        "shape": 0.3,
        "usemap": 0.3,
        "ismap": 0.3,
        "download": 0.3,
        "ping": 0.3,
        "hreflang": 0.3,
        "type": 0.3,
        "name": 0.3,
        "form": 0.3,
        "novalidate": 0.2,
        "multiple": 0.2,
        "selected": 0.2,
        "size": 0.2,
        "wrap": 0.2,
        "hidden": 0.1,
        "style": 0.1,
        "content": 0.1,
        "http-equiv": 0.1,
        "aria-*": 0.6,
        "data-uid": 1
      },
      "fallbackRating": 0
    }
  };

  // src/D2Snap.ts
  var DATA_URL_ATTRIBUTE_NAME = "src";
  var DATA_URL_ATTRIBUTE_VALUE_REGEX = /^data:/i;
  var WHITESPACE_REGEX = /^\s$/;
  function validateParameter(name, value, allowInfinity = false) {
    if (allowInfinity && value === Infinity) return;
    if (value < 0 || value > 1) {
      throw new RangeError(`Parameter ${name} expects value in [0, 1], got ${value}`);
    }
  }
  function d2Snap(dom, rE, rA, rT, options = {}) {
    validateParameter("rE", rE, true);
    validateParameter("rA", rA);
    validateParameter("rT", rT);
    const optionsWithDefaults = {
      debug: false,
      groundTruth: GROUND_TRUTH,
      groundTruthReplaceDefault: false,
      filterDataURLs: true,
      filteredTagNames: CONFIG.filteredTagNames,
      skipMarkdown: false,
      skipTextRank: false,
      textRankOptions: {},
      uniqueIDs: false,
      ...options
    };
    const groundTruth = new GroundTruth(
      !optionsWithDefaults.groundTruthReplaceDefault ? mergeJSONs(GROUND_TRUTH, optionsWithDefaults.groundTruth) : optionsWithDefaults.groundTruth
    );
    const turndown = new Turndown(
      groundTruth.getElementsByType("actionable")
    );
    const filteredTagNames = new Set(
      optionsWithDefaults.filteredTagNames.map((t) => t.toUpperCase())
    );
    function snapElementContainerNode(document3, elementNode, rE2, domTreeHeight2) {
      if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
      if (!groundTruth.isElementType("container", elementNode.tagName)) return;
      if (!elementNode.parentElement || !groundTruth.isElementType("container", elementNode.parentElement.tagName)) return;
      const mergeLevels = Math.max(
        Math.round(domTreeHeight2 * Math.min(1, rE2)),
        1
      );
      if ((elementNode.depth - 1) % mergeLevels === 0) return;
      const elements = [
        elementNode.parentElement,
        elementNode
      ];
      const isTopdownMerge = groundTruth.getContainerRating(elements[0].tagName) < groundTruth.getContainerRating(elements[1].tagName);
      isTopdownMerge && elements.reverse();
      const targetElement = elements[0];
      const sourceElement = elements[1];
      if (isTopdownMerge) {
        const mergedAttributes = Array.from(targetElement.attributes);
        for (const attr of sourceElement.attributes) {
          if (mergedAttributes.some((targetAttr) => targetAttr.name === attr.name)) continue;
          mergedAttributes.push(attr);
        }
        for (const attr of targetElement.attributes) {
          targetElement.removeAttribute(attr.name);
        }
        for (const attr of mergedAttributes) {
          targetElement.setAttribute(attr.name, attr.value);
        }
      }
      if (!isTopdownMerge) {
        while (sourceElement.childNodes.length) {
          targetElement.insertBefore(sourceElement.childNodes[0], sourceElement);
        }
      } else {
        const before = [];
        const after = [];
        let isAfterTarget = false;
        for (const child of sourceElement.childNodes) {
          if (child === targetElement) {
            isAfterTarget = true;
            continue;
          }
          (isAfterTarget ? after : before).push(child);
        }
        for (let i = before.length - 1; i >= 0; i--) {
          const child = before[i];
          if (targetElement.childNodes.length && i === before.length - 1) {
            if (child.nodeType === 3 /* TEXT_NODE */) {
              child.textContent = `${child.textContent} `;
            } else {
              child.appendChild(document3.createTextNode(" "));
            }
          }
          targetElement.insertBefore(child, targetElement.firstChild);
        }
        for (let i = 0; i < after.length; i++) {
          const child = after[i];
          if (targetElement.childNodes.length && i === 0) {
            if (child.nodeType === 3 /* TEXT_NODE */) {
              child.textContent = ` ${child.textContent}`;
            } else {
              child.insertBefore(document3.createTextNode(" "), child.firstChild);
            }
          }
          targetElement.appendChild(child);
        }
        targetElement.depth = sourceElement.depth;
        sourceElement.parentNode?.insertBefore(targetElement, sourceElement);
      }
      sourceElement.parentNode?.removeChild(sourceElement);
    }
    function snapElementTextFormattingNode(document3, elementNode) {
      if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
      if (!groundTruth.isElementType("textFormatting", elementNode.tagName)) return;
      if (optionsWithDefaults.skipMarkdown) return;
      const markdown = turndown.translate(elementNode.outerHTML);
      const markdownNodesFragment = resolveDocument(dom).createRange().createContextualFragment(markdown);
      const replacingNodes = [...markdownNodesFragment.childNodes];
      elementNode.replaceWith(...[document3.createTextNode(" "), ...replacingNodes, document3.createTextNode(" ")]);
      const sourceTagName = elementNode.tagName.toLowerCase();
      return replacingNodes.filter((n2) => n2.nodeType !== 1 /* ELEMENT_NODE */ || n2.tagName.toLowerCase() !== sourceTagName);
    }
    function snapTextNode(textNode, rT2) {
      if (textNode.nodeType !== 3 /* TEXT_NODE */) return;
      const text = textNode?.innerText ?? textNode.textContent;
      if (!(text ?? "").trim().length) return;
      const leadingSpace = WHITESPACE_REGEX.test(text.charAt(0)) ? " " : "";
      const trailingSpace = WHITESPACE_REGEX.test(text.charAt(text.length - 1)) ? " " : "";
      textNode.textContent = [
        leadingSpace,
        transform(text, 1 - rT2, optionsWithDefaults.skipTextRank, true, optionsWithDefaults.textRankOptions),
        trailingSpace
      ].join("");
    }
    function snapAttributeNode(elementNode, rA2) {
      if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
      for (const attr of Array.from(elementNode.attributes)) {
        if (groundTruth.getAttributeRating(attr.name) >= rA2) continue;
        elementNode.removeAttribute(attr.name);
      }
    }
    const document2 = resolveDocument(dom);
    if (!document2) throw new ReferenceError("Could not resolve a valid document object from DOM");
    const rootElement = resolveRoot(dom);
    const originalSize = rootElement.innerHTML.length;
    let n = 0;
    optionsWithDefaults.uniqueIDs && traverseDom(
      rootElement,
      1 /* SHOW_ELEMENT */,
      (elementNode) => {
        if (!groundTruth.isElementType("container", elementNode.tagName) && !groundTruth.isElementType("actionable", elementNode.tagName)) return;
        elementNode.setAttribute(CONFIG.uniqueAttributeName, (n++).toString());
      }
    );
    const virtualDom = rootElement.cloneNode(true);
    let domTreeHeight = 0;
    traverseDom(
      virtualDom,
      4294967295 /* SHOW_ALL */,
      (node) => {
        if (node.nodeType === 8 /* COMMENT_NODE */) {
          node.parentNode?.removeChild(node);
          return;
        }
        if (node.nodeType !== 1 /* ELEMENT_NODE */) return;
        const elementNode = node;
        if (filteredTagNames.has(elementNode.tagName.toUpperCase())) {
          elementNode.remove();
          return;
        }
        for (const attr of Array.from(elementNode.attributes)) {
          if (attr.name.toLowerCase() !== DATA_URL_ATTRIBUTE_NAME || !DATA_URL_ATTRIBUTE_VALUE_REGEX.test(attr.value)) continue;
          elementNode.removeAttribute(attr.name);
        }
        const depth = (elementNode.parentNode.depth ?? 0) + 1;
        elementNode.depth = depth;
        domTreeHeight = Math.max(depth, domTreeHeight);
      }
    );
    traverseDom(
      virtualDom,
      4 /* SHOW_TEXT */,
      (node) => snapTextNode(node, rT)
    );
    traverseDom(
      virtualDom,
      1 /* SHOW_ELEMENT */,
      (node) => snapElementTextFormattingNode(document2, node)
    );
    traverseDom(
      virtualDom,
      1 /* SHOW_ELEMENT */,
      (node) => {
        if (!groundTruth.isElementType("container", node.tagName)) return;
        return snapElementContainerNode(document2, node, rE, domTreeHeight);
      }
    );
    traverseDom(
      virtualDom,
      1 /* SHOW_ELEMENT */,
      (node) => snapAttributeNode(node, rA)
      // work on parent element
    );
    const snapshot = virtualDom.innerHTML;
    let html = snapshot.replace(/\s+/g, " ").replace(/>\s+</g, "><").replace(/\s+>/g, ">").replace(/<\s+/g, "<").replace(/\s+\/>/g, "/>").trim();
    if (rE === Infinity) {
      html = dissolveToplevelTags(html);
    }
    if (optionsWithDefaults.debug) {
      html = formatHTML(html);
    }
    return {
      html,
      meta: {
        originalSize,
        snapshotSize: snapshot.length,
        sizeRatio: snapshot.length / originalSize,
        tokenEstimate: Math.round(snapshot.length / 4)
        // according to https://platform.openai.com/tokenizer
      }
    };
  }

  // src/AdaptiveD2Snap.ts
  function* generateHalton() {
    const halton = (index, base) => {
      let result = 0;
      let f = 1 / base;
      let i2 = index;
      while (i2 > 0) {
        result += f * (i2 % base);
        i2 = Math.floor(i2 / base);
        f /= base;
      }
      return result;
    };
    let i = 0;
    while (true) {
      i++;
      yield [
        halton(i, 2),
        halton(i, 3),
        halton(i, 5)
      ];
    }
  }
  function adaptiveD2Snap(d2SnapFn, dom, maxTokens = 4096, maxIterations = 5, options = {}) {
    const haltonGenerator = generateHalton();
    const parameters = {
      rE: 0,
      rA: 0,
      rT: 0
    };
    let aggressiveness = 0;
    let snapshot;
    for (let i = 0; i <= maxIterations; i++) {
      const haltonPoint = haltonGenerator.next().value;
      const jitter = (h) => 0.5 + 0.5 * h;
      parameters.rE = Math.min(aggressiveness * jitter(haltonPoint[0]), 1);
      parameters.rA = Math.min(aggressiveness * jitter(haltonPoint[1]), 1);
      parameters.rT = Math.min(aggressiveness * jitter(haltonPoint[2]), 1);
      snapshot = d2SnapFn.call(null, dom, parameters.rE, parameters.rA, parameters.rT, options);
      if (snapshot.meta.tokenEstimate <= maxTokens) {
        return {
          ...snapshot,
          parameters,
          adaptiveIterations: i
        };
      }
      const overshoot = snapshot.meta.tokenEstimate / maxTokens;
      if (i === 0) {
        aggressiveness = Math.min(0.9, 1 - 1 / overshoot);
        continue;
      }
      const logOver = Math.log2(overshoot);
      const step = Math.max(0.05, 0.15 * logOver);
      aggressiveness = Math.min(1, aggressiveness + step);
    }
    throw new RangeError(
      `Unable to create snapshot below ${maxTokens} tokens (last estimate: ${snapshot?.meta.tokenEstimate})`
    );
  }

  // src/api.ts
  async function d2Snap2(domOrString, ...args) {
    return d2Snap(await ensureDOM(domOrString), ...args);
  }
  async function adaptiveD2Snap2(domOrString, ...args) {
    return adaptiveD2Snap(d2Snap, await ensureDOM(domOrString), ...args);
  }

  // src/api.browser.ts
  window.D2Snap = {
    d2Snap: d2Snap2,
    adaptiveD2Snap: adaptiveD2Snap2
  };
})();
