var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// variables/ground-truth.json
var ground_truth_exports = {};
__export(ground_truth_exports, {
  default: () => ground_truth_default
});
var ground_truth_default;
var init_ground_truth = __esm({
  "variables/ground-truth.json"() {
    ground_truth_default = {
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
            "main",
            "nav",
            "section"
          ],
          ratings: {
            article: 0.95,
            aside: 0.85,
            body: 0.9,
            div: 0.3,
            footer: 0.7,
            header: 0.75,
            html: 0.1,
            main: 0.85,
            nav: 0.8,
            section: 0.9
          },
          fallbackRating: 0
        },
        actionable: {
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
        textFormatting: {
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
          ]
        }
      },
      typeAttribute: {
        ratings: {
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
          "data-uid": 1
        },
        fallbackRating: 0
      }
    };
  }
});

// src/GroundTruth.ts
var HARD_FALLBACK_RATING = 0;
var GroundTruth = class {
  groundTruth;
  constructor(groundTruth) {
    this.groundTruth = groundTruth;
  }
  isElementType(type, tagName) {
    const isNativeElement = (this.groundTruth?.typeElement[type]?.tagNames ?? []).includes(tagName.toLowerCase());
    if (isNativeElement) return true;
    if (type !== "container") return isNativeElement;
    const isCustomElement = ![
      ...this.groundTruth?.typeElement.actionable?.tagNames ?? [],
      ...this.groundTruth?.typeElement.textFormatting?.tagNames ?? []
    ].includes(tagName.toLowerCase());
    return isCustomElement;
  }
  getContainerRating(tagName) {
    if (!tagName) return -Infinity;
    const rating = (this.groundTruth?.typeElement?.container?.ratings ?? {})[tagName.toLowerCase()];
    if (rating !== void 0) return rating;
    const fallbackRating = this.groundTruth?.typeElement?.container?.fallbackRating;
    return fallbackRating ?? HARD_FALLBACK_RATING;
  }
  getAttributeRating(attributeName) {
    if (!attributeName) return -Infinity;
    const rating = (this.groundTruth?.typeAttribute?.ratings ?? {})[attributeName.toLowerCase()];
    if (rating !== void 0) return rating;
    const fallbackRating = this.groundTruth?.typeAttribute?.fallbackRating;
    return fallbackRating ?? HARD_FALLBACK_RATING;
  }
};
async function createDefaultGroundTruth() {
  return new GroundTruth(
    (await Promise.resolve().then(() => (init_ground_truth(), ground_truth_exports))).default
  );
}
export {
  GroundTruth,
  createDefaultGroundTruth
};
