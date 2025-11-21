(() => {
  // src/util.ts
  function resolveDocument(dom) {
    let doc;
    try {
      let doc2 = (window ?? {}).document;
      if (doc2) return doc2;
    } catch {
    }
    doc = dom;
    while (doc) {
      if (!!doc["createTreeWalker"]) return doc;
      doc = doc?.parentNode;
    }
    return null;
  }
  function resolveRoot(dom) {
    return dom["outerHTML"] ? dom : dom?.documentElement;
  }
  async function traverseDom(doc, root2, filter = NodeFilter.SHOW_ALL, cb) {
    doc = resolveDocument(doc);
    const walker = doc.createTreeWalker(root2, filter);
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
  function formatHtml(html, indentSize = 2) {
    const tokens = html.replace(/>\s+</g, "><").trim().split(/(<[^>]+>)/).filter((token) => token.trim().length);
    const indentChar = " ".repeat(indentSize);
    let indentLevel = 0;
    const formattedHtml = [];
    for (const token of tokens) {
      if (token.match(/^<\/\w/)) {
        indentLevel = Math.max(indentLevel - 1, 0);
        formattedHtml.push(indentChar.repeat(indentLevel) + token);
        continue;
      }
      if (token.match(/^<\w[^>]*[^\/]>$/)) {
        formattedHtml.push(indentChar.repeat(indentLevel) + token);
        indentLevel++;
        continue;
      }
      if (token.match(/^<[^>]+\/>$/)) {
        formattedHtml.push(indentChar.repeat(indentLevel) + token);
        continue;
      }
      if (token.match(/^<[^!]/)) {
        formattedHtml.push(indentChar.repeat(indentLevel) + token);
        continue;
      }
      formattedHtml.push(indentChar.repeat(indentLevel) + token.trim());
    }
    return formattedHtml.join("\n").trim();
  }

  // src/ground-truth.json
  var ground_truth_default = {
    typeElement: {
      container: {
        tagNames: [
          "article",
          "aside",
          "body",
          "div",
          "footer",
          "header",
          "html",
          "iframe",
          "main",
          "nav",
          "section"
        ],
        semantics: {
          article: 0.95,
          aside: 0.85,
          body: 0.9,
          div: 0.3,
          footer: 0.7,
          header: 0.75,
          html: 0.1,
          iframe: 0.5,
          main: 0.85,
          nav: 0.8,
          section: 0.9
        }
      },
      interactive: {
        tagNames: [
          "a",
          "button",
          "details",
          "form",
          "input",
          "label",
          "select",
          "summary",
          "textarea"
        ]
      },
      content: {
        tagNames: [
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
        ],
        skipTagNames: [
          "li",
          "tbody",
          "td",
          "thead",
          "tr"
        ]
      }
    },
    typeAttribute: {
      semantics: {
        alt: 0.9,
        href: 0.9,
        src: 0.8,
        id: 0.8,
        class: 0.7,
        title: 0.6,
        lang: 0.6,
        role: 0.6,
        "aria-*": 0.6,
        placeholder: 0.5,
        label: 0.5,
        for: 0.5,
        value: 0.5,
        checked: 0.5,
        disabled: 0.5,
        readonly: 0.5,
        required: 0.5,
        maxlength: 0.5,
        minlength: 0.5,
        pattern: 0.5,
        step: 0.5,
        min: 0.5,
        max: 0.5,
        accept: 0.4,
        "accept-charset": 0.4,
        action: 0.4,
        method: 0.4,
        enctype: 0.4,
        target: 0.4,
        rel: 0.4,
        media: 0.4,
        sizes: 0.4,
        srcset: 0.4,
        preload: 0.4,
        autoplay: 0.4,
        controls: 0.4,
        loop: 0.4,
        muted: 0.4,
        poster: 0.4,
        autofocus: 0.3,
        autocomplete: 0.3,
        autocapitalize: 0.3,
        spellcheck: 0.3,
        contenteditable: 0.3,
        draggable: 0.3,
        dropzone: 0.3,
        tabindex: 0.3,
        accesskey: 0.3,
        cite: 0.3,
        datetime: 0.3,
        coords: 0.3,
        shape: 0.3,
        usemap: 0.3,
        ismap: 0.3,
        download: 0.3,
        ping: 0.3,
        hreflang: 0.3,
        type: 0.3,
        name: 0.3,
        form: 0.3,
        novalidate: 0.2,
        multiple: 0.2,
        selected: 0.2,
        size: 0.2,
        wrap: 0.2,
        hidden: 0.1,
        style: 0.1,
        content: 0.1,
        "http-equiv": 0.1,
        "data-uid": 1,
        "data-aie": 1
      }
    }
  };

  // src/ground-truth.ts
  function isElementType(type, tagName) {
    return ground_truth_default.typeElement[type].tagNames.includes(tagName.toLowerCase());
  }
  function getContainerSemantics(tagName) {
    if (!tagName) return -Infinity;
    return ground_truth_default.typeElement.container.semantics[tagName.toLowerCase()];
  }
  function getAttributeSemantics(attributeName) {
    if (!attributeName) return -Infinity;
    return ground_truth_default.typeAttribute.semantics[attributeName.toLowerCase()];
  }

  // src/TextRank.ts
  function initArray(n, value = 0) {
    return Array.from({ length: n }, () => value);
  }
  function initMatrix(n, m = n) {
    return initArray(n).map(() => initArray(m));
  }
  function tokenizeSentences(text) {
    return text.replace(/[^\w\s.?!:]+/g, "").split(/[.?!:]\s|\n|\r/g).map((rawSentence) => rawSentence.trim()).filter((sentence) => !!sentence);
  }
  function textRank(textOrSentences, k = 3, options = {}) {
    if (!textOrSentences.length) return "";
    const sentences = !Array.isArray(textOrSentences) ? tokenizeSentences(textOrSentences) : textOrSentences;
    if (sentences.length <= k) return sentences.join("\n");
    const optionsWithDefaults = {
      damping: 0.75,
      maxIterations: 20,
      ...options
    };
    const sentenceTokens = sentences.map((sentence) => sentence.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((token) => !!token.trim()));
    const n = sentences.length;
    const similarityMatrix = initMatrix(n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const vector1 = [];
        const vector2 = [];
        for (const token of new Set(sentenceTokens[i].concat(sentenceTokens[j]))) {
          vector1.push(sentenceTokens[i].filter((w) => w === token).length);
          vector2.push(sentenceTokens[j].filter((w) => w === token).length);
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i2 = 0; i2 < vector1.length; i2++) {
          dotProduct += vector1[i2] * vector2[i2];
          normA += vector1[i2] * vector1[i2];
          normB += vector2[i2] * vector2[i2];
        }
        similarityMatrix[i][j] = dotProduct / (normA ** 0.5 * normB ** 0.5 + 1e-10);
      }
    }
    const scores = initArray(n, 1);
    for (let iteration = 0; iteration < optionsWithDefaults.maxIterations; iteration++) {
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          let norm = 0;
          for (let i2 = 0; i2 < similarityMatrix[j].length; i2++) {
            norm += similarityMatrix[j][i2] * similarityMatrix[i2][i2];
          }
          sum += similarityMatrix[j][i] / (norm || 1) * scores[j];
        }
        scores[i] = optionsWithDefaults.damping * sum + (1 - optionsWithDefaults.damping);
      }
    }
    return sentences.map((sentence, i) => {
      return {
        sentence,
        index: i,
        score: scores[i]
      };
    }).sort((a, b) => b.score - a.score).slice(0, Math.min(k, sentences.length)).sort((a, b) => a.index - b.index).map((obj) => obj.sentence).join("\n");
  }
  function relativeTextRank(text, ratio = 0.5, options = {}, noEmpty = false) {
    const sentences = tokenizeSentences(text);
    const k = Math.max(
      Math.round(sentences.length * ratio),
      1
    );
    return textRank(sentences, Math.max(k, +noEmpty), options);
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
  var KEEP_TAG_NAMES = ["a"];
  var SERVICE = new turndown_browser_es_default({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced"
  });
  SERVICE.addRule("keep", {
    filter: KEEP_TAG_NAMES,
    replacement: (_, node) => node.outerHTML
  });
  SERVICE.use(gfm);
  var KEEP_LINE_BREAK_MARK = "@@@";
  function turndown(markup) {
    return SERVICE.turndown(markup).trim().replace(/\n|$/g, KEEP_LINE_BREAK_MARK);
  }

  // src/D2Snap.util.ts
  async function validateParams(k, l, m) {
    const validateParam = (param, allowInfinity = false) => {
      if (allowInfinity && param === Infinity) return;
      if (param < 0 || param > 1) {
        throw new RangeError(`Invalid parameter ${param}, expects value in [0, 1]`);
      }
    };
    validateParam(k, true);
    validateParam(l);
    validateParam(m);
  }
  function getOptionsWithDefaults(options) {
    return {
      assignUniqueIDs: false,
      debug: false,
      keepUnknownElements: false,
      skipMarkdownTranslation: false,
      ...options
    };
  }

  // src/config.json
  var config_default = {
    uniqueIDAttribute: "data-uid"
  };

  // src/D2Snap.dom.ts
  var FILTER_TAG_NAMES = [
    "SCRIPT",
    "STYLE",
    "LINK"
  ];
  async function d2Snap(dom, k, l, m, options = {}) {
    validateParams(k, l, m);
    const optionsWithDefaults = getOptionsWithDefaults(options);
    function snapElementNode(elementNode) {
      if (isElementType("container", elementNode.tagName)) return;
      if (isElementType("content", elementNode.tagName)) {
        return snapElementContentNode(elementNode);
      }
      if (isElementType("interactive", elementNode.tagName)) {
        snapElementInteractiveNode(elementNode);
        return;
      }
      if (optionsWithDefaults.keepUnknownElements) return;
      elementNode.parentNode?.removeChild(elementNode);
    }
    function snapElementContainerNode(elementNode, k2, domTreeHeight2) {
      if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
      if (!isElementType("container", elementNode.tagName)) return;
      if (!elementNode.parentElement || !isElementType("container", elementNode.parentElement.tagName)) return;
      const mergeLevels = Math.max(
        Math.round(domTreeHeight2 * Math.min(1, k2)),
        1
      );
      if ((elementNode.depth - 1) % mergeLevels === 0) return;
      const elements = [
        elementNode.parentElement,
        elementNode
      ];
      const mergeUpwards = getContainerSemantics(elements[0].tagName) >= getContainerSemantics(elements[1].tagName);
      !mergeUpwards && elements.reverse();
      const targetEl = elements[0];
      const sourceEl = elements[1];
      const mergedAttributes = Array.from(targetEl.attributes);
      for (const attr of sourceEl.attributes) {
        if (mergedAttributes.some((targetAttr) => targetAttr.name === attr.name)) continue;
        mergedAttributes.push(attr);
      }
      for (const attr of targetEl.attributes) {
        targetEl.removeAttribute(attr.name);
      }
      for (const attr of mergedAttributes) {
        targetEl.setAttribute(attr.name, attr.value);
      }
      if (mergeUpwards) {
        while (sourceEl.childNodes.length) {
          targetEl.insertBefore(sourceEl.childNodes[0], sourceEl);
        }
      } else {
        let afterPivot = false;
        while (sourceEl.childNodes.length > 1) {
          const childNode = sourceEl.childNodes[+afterPivot];
          if (childNode === targetEl) {
            afterPivot = true;
            continue;
          }
          afterPivot || !targetEl.childNodes.length ? targetEl.appendChild(childNode) : targetEl.insertBefore(childNode, targetEl.childNodes[0]);
        }
        targetEl.depth = sourceEl.depth;
        sourceEl.parentNode?.insertBefore(targetEl, sourceEl);
      }
      sourceEl.parentNode?.removeChild(sourceEl);
    }
    function snapElementContentNode(elementNode) {
      if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
      if (!isElementType("content", elementNode.tagName)) return;
      if (optionsWithDefaults.skipMarkdownTranslation) return;
      const markdown = turndown(elementNode.outerHTML);
      const markdownNodesFragment = resolveDocument(dom).createRange().createContextualFragment(markdown);
      elementNode.replaceWith(...markdownNodesFragment.childNodes);
    }
    function snapElementInteractiveNode(elementNode) {
      if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
      if (!isElementType("interactive", elementNode.tagName)) return;
    }
    function snapTextNode(textNode, l2) {
      if (textNode.nodeType !== 3 /* TEXT_NODE */) return;
      const text = textNode?.innerText ?? textNode.textContent;
      textNode.textContent = relativeTextRank(text, 1 - l2, void 0, true);
    }
    function snapAttributeNode(elementNode, m2) {
      if (elementNode.nodeType !== 1 /* ELEMENT_NODE */) return;
      for (const attr of Array.from(elementNode.attributes)) {
        if (getAttributeSemantics(attr.name) >= m2) continue;
        elementNode.removeAttribute(attr.name);
      }
    }
    const document2 = resolveDocument(dom);
    if (!document2) throw new ReferenceError("Could not resolve a valid document object from DOM");
    const rootElement = resolveRoot(dom);
    const originalSize = rootElement.outerHTML.length;
    let n = 0;
    optionsWithDefaults.assignUniqueIDs && await traverseDom(
      document2,
      rootElement,
      1 /* SHOW_ELEMENT */,
      (elementNode) => {
        if (!isElementType("container", elementNode.tagName) && !isElementType("interactive", elementNode.tagName)) return;
        elementNode.setAttribute(config_default.uniqueIDAttribute, (n++).toString());
      }
    );
    const virtualDom = rootElement.cloneNode(true);
    await traverseDom(
      document2,
      virtualDom,
      128 /* SHOW_COMMENT */,
      (node) => node.parentNode?.removeChild(node)
    );
    await traverseDom(
      document2,
      virtualDom,
      1 /* SHOW_ELEMENT */,
      (elementNode) => {
        if (!FILTER_TAG_NAMES.includes(elementNode.tagName.toUpperCase())) return;
        elementNode.parentNode?.removeChild(elementNode);
      }
    );
    let domTreeHeight = 0;
    await traverseDom(
      document2,
      virtualDom,
      1 /* SHOW_ELEMENT */,
      (elementNode) => {
        const depth = (elementNode.parentNode.depth ?? 0) + 1;
        elementNode.depth = depth;
        domTreeHeight = Math.max(depth, domTreeHeight);
      }
    );
    await traverseDom(
      document2,
      virtualDom,
      4 /* SHOW_TEXT */,
      (node) => snapTextNode(node, l)
    );
    await traverseDom(
      document2,
      virtualDom,
      1 /* SHOW_ELEMENT */,
      (node) => snapElementNode(node)
    );
    await traverseDom(
      document2,
      virtualDom,
      1 /* SHOW_ELEMENT */,
      (node) => {
        if (!isElementType("container", node.tagName)) return;
        return snapElementContainerNode(node, k, domTreeHeight);
      }
    );
    await traverseDom(
      document2,
      virtualDom,
      1 /* SHOW_ELEMENT */,
      (node) => snapAttributeNode(node, m)
      // work on parent element
    );
    const snapshot = virtualDom.innerHTML;
    let serializedHtml = optionsWithDefaults.debug ? formatHtml(snapshot) : snapshot;
    serializedHtml = serializedHtml.replace(new RegExp(KEEP_LINE_BREAK_MARK, "g"), "\n").replace(/\n *(\n|$)/g, "");
    serializedHtml = k === Infinity && virtualDom.children.length ? serializedHtml.trim().replace(/^<[^>]+>\s*/, "").replace(/\s*<\/[^<]+>$/, "") : serializedHtml;
    return {
      serializedHtml,
      meta: {
        originalSize,
        snapshotSize: snapshot.length,
        sizeRatio: snapshot.length / originalSize,
        estimatedTokens: Math.round(snapshot.length / 4)
        // according to https://platform.openai.com/tokenizer
      }
    };
  }

  // src/HTMLParserTransformer.ts
  var HTMLParserTransformer = class _HTMLParserTransformer {
    static singletonTagNames = [
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
      "MENUITEM",
      "META",
      "PARAM",
      "SOURCE",
      "TRACK",
      "WBR"
    ];
    static outerHTML(dom) {
      const buffer = [];
      const stack = [];
      let nodes = dom;
      let index = 0;
      while (true) {
        if (index >= nodes.length) {
          if (stack.length === 0) break;
          const frame = stack.pop();
          const tagName2 = frame.node.tagName.toLowerCase();
          buffer.push(`</${tagName2}>`);
          nodes = stack.length > 0 ? stack[stack.length - 1].node.children : dom;
          index = frame.childIndex;
          continue;
        }
        const node = nodes[index++];
        if (node === null) continue;
        if (node.type === 2 /* TEXT */) {
          buffer.push(node.textContent);
          continue;
        }
        const tagName = node.tagName.toLowerCase();
        buffer.push(`<${tagName}`);
        for (let j = 0; j < node.attributes.length; j++) {
          const attr = node.attributes[j];
          buffer.push(" ", attr.name);
          if (attr.value === "") continue;
          buffer.push(`="${attr.value.replace(/"/g, "&quot;")}"`);
        }
        buffer.push(">");
        if (_HTMLParserTransformer.singletonTagNames.includes(tagName)) continue;
        if (node.children.length) {
          stack.push({
            node,
            childIndex: index
          });
          nodes = node.children;
          index = 0;
        } else {
          buffer.push(`</${tagName}>`);
        }
      }
      return buffer.join("");
    }
    static async parseNode(html) {
      const dom = (await new _HTMLParserTransformer().parse(html)).dom;
      return dom[0] ?? null;
    }
    transformCallbacks;
    skipTagNames;
    index = 0;
    depth = 0;
    ignoreDepth = 0;
    #html = "";
    constructor(transformCallbacks = {}, skipTagNames = []) {
      const idFn = (o) => o;
      this.transformCallbacks = {
        onElement: idFn,
        onText: idFn,
        ...transformCallbacks
      };
      this.skipTagNames = skipTagNames.map((tagName) => tagName.toUpperCase());
    }
    async parse(html) {
      this.#html = html;
      const len = html.length;
      const stack = [];
      const dom = [];
      const finalizeElement = async (elementNode, container) => {
        const result = await this.transformCallbacks.onElement(elementNode);
        const resultElement = typeof result === "string" ? await _HTMLParserTransformer.parseNode(result) : result;
        if (resultElement === elementNode) return;
        const parent = elementNode.parentElement;
        const target = parent ? parent.children : container;
        const elementIndex = target.indexOf(elementNode);
        if (elementIndex === -1) return;
        if (resultElement === null) {
          target.splice(elementIndex, 1);
        } else {
          target[elementIndex] = resultElement;
        }
      };
      while (this.index < len) {
        if (this.#html[this.index] !== "<") {
          const text = this.readText();
          if (!text.trim().length) continue;
          const txtNode = {
            type: 2 /* TEXT */,
            textContent: text
          };
          let writeTxtNode = await this.transformCallbacks.onText(txtNode);
          if (!writeTxtNode) continue;
          if (stack.length > 0) {
            stack[stack.length - 1].children.push(writeTxtNode);
          } else {
            dom.push(writeTxtNode);
          }
          continue;
        }
        if (this.#html.startsWith("<!--", this.index)) {
          this.skipComment();
          continue;
        }
        const isClosingTag = this.#html[this.index + 1] === "/";
        if (isClosingTag) {
          const closeTagEnd = this.#html.indexOf(">", this.index);
          if (closeTagEnd === -1) break;
          this.index = closeTagEnd + 1;
          this.depth--;
          const closedElementNode = stack.pop();
          if (!closedElementNode) continue;
          await finalizeElement(closedElementNode, dom);
          continue;
        }
        const { tagName: rawTagName, attributes, selfClosing } = this.parseTag();
        const tagName = rawTagName.toUpperCase();
        const isVoid2 = _HTMLParserTransformer.singletonTagNames.includes(tagName);
        if (this.skipTagNames.includes(tagName)) {
          if (!isVoid2 && !selfClosing) {
            this.skipIgnoredTag(tagName);
          }
          continue;
        }
        const elementNode = {
          attributes,
          children: [],
          depth: this.depth,
          type: 1 /* ELEMENT */,
          tagName
        };
        if (stack.length > 0) {
          const parentElement = stack[stack.length - 1];
          parentElement.children.push(elementNode);
          elementNode.parentElement = parentElement;
        } else {
          dom.push(elementNode);
        }
        if (!selfClosing && !isVoid2) {
          stack.push(elementNode);
          this.depth++;
        } else {
          await finalizeElement(elementNode, dom);
        }
      }
      return {
        dom,
        html: _HTMLParserTransformer.outerHTML(dom)
      };
    }
    skipIgnoredTag(tagName) {
      let depth = 1;
      while (this.index < this.#html.length && depth > 0) {
        const openingIndex = this.#html.indexOf("<", this.index);
        if (openingIndex === -1) {
          this.index = this.#html.length;
          return;
        }
        this.index = openingIndex;
        if (this.#html.startsWith("<!--", this.index)) {
          const end = this.#html.indexOf("-->", this.index + 4);
          this.index = end === -1 ? this.#html.length : end + 3;
          continue;
        }
        const htmlHead = this.#html.slice(this.index + 1, this.index + 1 + tagName.length + 1).toUpperCase();
        let closingIndex;
        if (htmlHead.startsWith("/" + tagName) && (htmlHead.length === tagName.length + 1 || /[\s>]/.test(htmlHead[tagName.length + 1]))) {
          depth--;
          closingIndex = this.#html.indexOf(">", this.index);
          this.index = closingIndex === -1 ? this.#html.length : closingIndex + 1;
          continue;
        }
        if (htmlHead.startsWith(tagName) && (htmlHead.length === tagName.length || /[\s/>]/.test(htmlHead[tagName.length]))) {
          depth++;
          closingIndex = this.#html.indexOf(">", this.index);
          this.index = closingIndex === -1 ? this.#html.length : closingIndex + 1;
          continue;
        }
        closingIndex = this.#html.indexOf(">", this.index);
        this.index = closingIndex === -1 ? this.#html.length : closingIndex + 1;
      }
    }
    skipComment() {
      const end = this.#html.indexOf("-->", this.index + 4);
      this.index = end === -1 ? this.#html.length : end + 3;
    }
    parseTag() {
      let i = this.index + 1;
      let tagName = "";
      while (i < this.#html.length && /[^\s/>]/.test(this.#html[i])) {
        tagName += this.#html[i++];
      }
      const attributes = [];
      while (i < this.#html.length && this.#html[i] !== ">" && this.#html[i] !== "/") {
        while (/\s/.test(this.#html[i])) i++;
        if (this.#html[i] === ">" || this.#html[i] === "/") break;
        let attributeName = "";
        while (i < this.#html.length && /[^\s=/>]/.test(this.#html[i])) {
          attributeName += this.#html[i++];
        }
        while (/\s/.test(this.#html[i])) i++;
        let value = "";
        if (this.#html[i] === "=") {
          i++;
          while (/\s/.test(this.#html[i])) i++;
          const quote = this.#html[i] === '"' || this.#html[i] === "'" ? this.#html[i++] : "";
          const startIndex = i;
          while (i < this.#html.length && (quote ? this.#html[i] !== quote : /[^\s>]/.test(this.#html[i]))) i++;
          value = this.#html.slice(startIndex, i);
          i += +!!quote;
        }
        attributes.push({
          type: 0 /* ATTRIBUTE */,
          name: attributeName,
          value
        });
      }
      const endTagIndex = this.#html.indexOf(">", i);
      this.index = endTagIndex === -1 ? this.#html.length : endTagIndex + 1;
      return {
        attributes,
        selfClosing: this.#html[i] === "/",
        tagName: tagName.toUpperCase()
      };
    }
    readText() {
      const nextTagIndex = this.#html.indexOf("<", this.index);
      const endIndex = nextTagIndex === -1 ? this.#html.length : nextTagIndex;
      const text = this.#html.slice(this.index, endIndex);
      this.index = endIndex;
      return text;
    }
  };

  // src/D2Snap.string.ts
  var FILTER_TAG_NAMES2 = [
    "SCRIPT",
    "STYLE",
    "LINK"
  ];
  var FILTER_CONTENT_TAG_NAMES = [
    "TH",
    "TR",
    "TD",
    "THEAD",
    "TBODY",
    "LI"
  ];
  function estimateDOMTreeHeight(html) {
    const tagRegex = /<\/?([a-zA-Z0-9\-]+)(\s[^>]*)?>/g;
    let currentDepth = 0;
    let maxDepth = 0;
    while (true) {
      let match = tagRegex.exec(html);
      if (!match) break;
      const tag = match[0];
      if (tag.startsWith("<!") || tag.startsWith("<?") || tag.startsWith("<!--")) continue;
      const isClosingTag = tag.startsWith("</");
      const isSelfClosingTag = tag.endsWith("/>") || /<\s*(br|hr|img|input|meta|link|source|area|base|col|embed|param|track|wbr)\b/i.test(tag);
      if (isClosingTag || isSelfClosingTag) {
        currentDepth = Math.max(0, currentDepth - 1);
        continue;
      }
      maxDepth = Math.max(++currentDepth, maxDepth);
    }
    return maxDepth;
  }
  async function mergeElementNode(element, mergeUpwardsCb, levels = Infinity) {
    const removeDuplicateAttributes = (attrs) => {
      const result = [];
      const seen = /* @__PURE__ */ new Set();
      for (const attr of attrs) {
        if (seen.has(attr.name)) continue;
        result.push(attr);
        seen.add(attr.name);
      }
      return result;
    };
    const mergeAttributes = (target, source) => {
      target.attributes = removeDuplicateAttributes([...target.attributes, ...source.attributes]);
    };
    let hasChanged = true;
    while (hasChanged) {
      hasChanged = false;
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        if (child.type !== 1 /* ELEMENT */ || !isElementType("container", child.tagName)) continue;
        if (child.depth - element.depth >= levels) continue;
        hasChanged = true;
        const mergeUpwards = mergeUpwardsCb(element.tagName, child.tagName);
        if (mergeUpwards) {
          mergeAttributes(element, child);
          element.children.splice(i, 1, ...child.children);
          for (const independentChild of child.children) {
            if (independentChild.type !== 1 /* ELEMENT */) continue;
            independentChild.parentElement = element;
          }
          i = -1;
          continue;
        }
        mergeAttributes(child, element);
        element.children.splice(i, 1, ...child.children);
        element.tagName = child.tagName;
        element.attributes = child.attributes;
        for (const independentChild of element.children) {
          if (independentChild.type !== 1 /* ELEMENT */) continue;
          element.parentElement = element;
        }
        i = -1;
      }
    }
  }
  function dissolveParentHTMLTag(html) {
    const match = html.trim().match(/^<([a-zA-Z0-9-]+)(\s[^>]*)?>([\s\S]*)<\/\1>$/i);
    return match ? match[3].trim() : html;
  }
  async function d2Snap2(dom, k, l, m, options = {}) {
    dom = dom.trim().replace(/^<!DOCTYPE +[a-z]+ *>\s*/i, "");
    validateParams(k, l, m);
    const optionsWithDefaults = getOptionsWithDefaults(options);
    const domTreeHeight = estimateDOMTreeHeight(dom);
    const mergeLevels = Math.max(Math.round(domTreeHeight * Math.min(1, k)), 1);
    const parserTransformer = new HTMLParserTransformer({
      onText(text) {
        text.textContent = relativeTextRank(text.textContent, 1 - l, void 0, true);
        return text;
      },
      onElement(element) {
        for (let i = 0; i < element.attributes.length; i++) {
          if (getAttributeSemantics(element.attributes[i].name) >= m) continue;
          element.attributes.splice(i, 1);
          i--;
        }
        if (isElementType("interactive", element.tagName)) return element;
        if (isElementType("content", element.tagName)) {
          if (FILTER_CONTENT_TAG_NAMES.includes(element.tagName.toUpperCase())) return element;
          if (optionsWithDefaults.skipMarkdownTranslation) return element;
          return turndown(HTMLParserTransformer.outerHTML([element]));
        }
        if (isElementType("container", element.tagName)) {
          if (element.depth % mergeLevels > 0) return element;
          mergeElementNode(element, (elementTagName, childTagName) => {
            return getContainerSemantics(elementTagName) >= getContainerSemantics(childTagName);
          }, mergeLevels);
          return element;
        }
        if (optionsWithDefaults.keepUnknownElements) return element;
        return null;
      }
    }, FILTER_TAG_NAMES2);
    let snapshot = (await parserTransformer.parse(dom)).html.replace(new RegExp(KEEP_LINE_BREAK_MARK, "g"), "\n");
    if (k === Infinity) {
      snapshot = dissolveParentHTMLTag(snapshot);
    }
    return {
      serializedHtml: optionsWithDefaults.debug ? formatHtml(snapshot) : snapshot,
      meta: {
        originalSize: dom.length,
        snapshotSize: snapshot.length,
        sizeRatio: snapshot.length / dom.length,
        estimatedTokens: Math.round(snapshot.length / 4)
      }
    };
  }

  // src/AdaptiveD2Snap.ts
  async function adaptiveD2Snap(d2SnapFn, dom, maxTokens = 4096, maxIterations = 5, options = {}) {
    const S = (typeof dom !== "string" ? resolveRoot(dom).outerHTML : dom).length;
    const M = 1e6;
    function* generateHalton() {
      const halton = (index, base) => {
        let result = 0;
        let f = 1 / base;
        let i3 = index;
        while (i3 > 0) {
          result += f * (i3 % base);
          i3 = Math.floor(i3 / base);
          f /= base;
        }
        return result;
      };
      let i2 = 0;
      while (true) {
        i2++;
        yield [
          halton(i2, 7),
          halton(i2, 3),
          halton(i2, 3)
        ];
      }
    }
    let i = 0;
    let sCalc = S;
    let parameters, snapshot;
    const haltonGenerator = generateHalton();
    while (true) {
      const haltonPoint = haltonGenerator.next().value;
      const computeParam = (haltonValue) => Math.min(sCalc / M * haltonValue, 1);
      parameters = {
        k: computeParam(haltonPoint[0]),
        l: computeParam(haltonPoint[1]),
        m: computeParam(haltonPoint[2])
      };
      snapshot = await d2SnapFn.call(null, dom, parameters.k, parameters.l, parameters.m, options);
      sCalc = sCalc ** 1.125;
      if (snapshot.meta.estimatedTokens <= maxTokens)
        break;
      if (i++ === maxIterations)
        throw new RangeError("Unable to create snapshot below given token threshold");
    }
    return {
      ...snapshot,
      parameters: {
        ...parameters,
        adaptiveIterations: i
      }
    };
  }

  // src/api.ts
  function isDOMString(domOrString) {
    return typeof domOrString === "string";
  }
  async function d2Snap3(domOrString, ...args) {
    return isDOMString(domOrString) ? d2Snap2(domOrString, ...args) : d2Snap(domOrString, ...args);
  }
  async function adaptiveD2Snap2(domOrString, ...args) {
    return adaptiveD2Snap(d2Snap3, domOrString, ...args);
  }

  // src/api.browser.ts
  window.D2Snap = {
    d2Snap: d2Snap3,
    adaptiveD2Snap: adaptiveD2Snap2
  };
})();
