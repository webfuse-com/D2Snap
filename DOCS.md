# D2Snap API

`webfuse-com/d2snap` is a typed JavaScript library implementing the [D2Snap](https://arxiv.org/abs/2508.04412) algorithm.

## How It Works – In a Nutshell

D2Snap reduces an input DOM by "averaging" features that render in the UI. The reduction is controlled by a defined ratio (e.g., `0.5`):

- **Element** nodes are folded into each other. The DOM height is set to reduce by ratio (with `0.5`: half the original height).
- **Text** contents are truncated at the least relevant sentences; relevance is translated by _TextRank_ centrality. Each text is set to reduce by ratio at the sentence level (with `0.5`: half of the sentences)
- **Attribute** removal is implied with bottom-up folds (assumption: attributes are reflexiv or forward-transitive). Additionally, attributes are removed if they score below a ratio-equivalent threshold (with `0.5`: all attributes less relevant than `0.5`). Scoring is thereby an affordance-frequency mapping between attribute names and a value on the ratio scale. Note that this technique is idempotent.

The API adds additional absolute measures to reduce the DOM, e.g., by removing noise.

## Installation

#### Module

``` console
npm install webfuse-com/D2Snap
```

> Install [jsdom](https://github.com/jsdom/jsdom) to use the library with Node.js:
> ``` console
> npm install jsdom
> ```

``` js
import * as D2Snap from "@webfuse-com/d2snap";
```

#### Browser

``` html
<script src="https://cdn.jsdelivr.net/gh/webfuse-com/D2Snap@main/dist.browser/D2Snap.js"></script>
```

## Downsampling Functions

### `d2Snap()`

Downsample a DOM – given a DOM and specific downsampling ratios.

``` ts
function d2Snap(
  domOrHTML: Document | Element | string,
  rE: number, rA: number, rT: number,
  options?: D2SnapOptions
): Promise<D2SnapResult>
```

> The DOM-parsed input is always wrapped by a `BODY` element to allow destructive filtering operations on the passed root node.

#### Parameters

| Parameter | Description | Range |
| :-| :- | :- |
| `domOrHTML` | Input DOM given as fully qualified document reference (tree), an element reference (subtree) or an equivalent HTML serialisation. | Tree |
| `rE` | Element downsampling ratio. Controls the preserved DOM height by ratio. | `[0, 1]` |
| `rA` | Attribute downsampling ratio (threshold). Controls which attributes are preserved by score threshold (latent ratio if scores are affordance-frequency balanced). Attribute scores are predefined based on empirical adjustment, but can be overriden via `options`. | `[0, 1]` |
| `rT` | Text downsampling ratio. Controls the preserved sentence-based text length per text node. | `[0, 1]` |
| `options` | Specific configuration options (see below). | `D2SnapOptions` |

#### Return Value

``` ts
type D2SnapResult = {
  dom: DOM,
  innerHTML: string; html: string;
  outerHTML: string;
  meta: {
    tokenEstimate: number;
    originalSize: number;
    sizeRatio: number;
    snapshotSize: number;
    timings?: {
      [ step: string ]: number;
    };
  }
}
```

| Property | Description |
| :-| :- |
| `dom` | The downsampled DOM, cloned from the input DOM; hydrated from serialised input. |
| `innerHTML`, `html` | The serialised downsampled DOM, excluding the root element. |
| `outerHTML` | The serialised downsampled DOM, including the root element. |
| `meta` | Information about the downsampling results: `tokenEstimate` – estimated token count of the HTML-serialised output DOM (based on [https://platform.openai.com](https://platform.openai.com/tokenizer)), `originalSize` – byte size of the HTML-serialised input DOM, `sizeRatio` – size ratio of the HTML-serialised output DOM compared to the input DOM, `snapshotSize` – byte size of the HTML-serialised output DOM, `timings` (debug mode only) – durations of individual downsampling steps. |

> The HTML-serialised input DOM is always parsed into a fully qualified document. For string or `Document` inputs, the returned `dom` is the cloned `BODY`.

#### Examples

``` ts
await d2Snap(`
  <section class="container" tabindex="3" required="true" type="example">
    <div class="mx-auto" data-topic="products" required="false">
      <h1>Our Pizza</h1>
      <div>
        <div class="shadow-lg">
          <h2>Margherita</h2>
          <p>
          A simple classic: mozzarella, tomatoes and basil.
          An everyday choice!
          </p>
          <button type="button">Add</button>
        </div>
        <div class="shadow-lg">
          <h2>Capricciosa</h2>
          <p>
            A rich taste: mozzarella, ham, mushrooms, artichokes and olives.
            A true favourite!
          </p>
          <button type="button">Add</button>
        </div>
      </div>
    </div>
  </section>`,
  0.9, 0.4, 0.7,
  {
    debug: true
  }
);
```

``` html
# Our Pizza
## Margherita
A simple classic: mozzarella, tomatoes and basil.
<button>Add</button>
## Capricciosa
A rich taste: mozzarella, ham, mushrooms, artichokes and olives.
<button>Add</button>
```

### `adaptiveD2Snap()`

Adaptively downsample a DOM – given downsampling results constraints rather than specific ratios.

``` ts
function adaptiveD2Snap(
  domOrHTML: Document | Element | string,
  maxTokens: number = 2**15,  // 32768
  maxIterations: number = 5,
  options?: D2SnapOptions
): Promise<AdaptiveD2SnapResult>
```

#### Parameters

| Parameter | Description | Range |
| :-| :- | :- |
| `domOrHTML` | Input DOM given as fully qualified document reference (tree), an element reference (subtree) or an equivalent HTML serialisation. | `Document`, `Element`, `string` |
| `maxTokens` | Maximum estimated amount of tokens the HTML-serialised output DOM is allowed to have. The result aims for being close to the bound. Throws an error if the constraint cannot be satisfied. | `[0, ∞)` |
| `maxIterations` | Maximum amount of iterations to run to try satisfying the `maxTokens` constraint. | `[0, ∞)` |
| `options` | Specific configuration options (see below). | `D2SnapOptions` |

#### Return Value

``` ts
type AdaptiveD2SnapResult = D2SnapResult & {
  parameters: {
    rE: number; rA: number; rT: number;
  };
  adaptiveIterations: number;
}
```

| Property | Description |
| :-| :- |
| `parameters` | Applied D2Snap downsampling parameters to satisfy the constraints. |
| `adaptiveIterations` | Amount of iterations that ran until the constrains were satisfied. |

### Options

``` ts
interface D2SnapOptions {
  debug?: boolean;
  minify?: boolean;
  uniqueIDs?: boolean;
  attributeScores?: {
    [ name: string ]: number;
  };
  classification?: {
    actionableElements?: string[];
    textElements?: string[];
  };
  filter?: {
    attributes?: string[];
    elements?: string[];
    dataURLs?: boolean;
    emptyElements?: boolean;
  };
  normalize?: {
    iconClasses?: string[];
    labelAttributes?: string[];
    svgToImg?: boolean;
  };
  skip?: {
    markdown?: boolean;
    textRank?: boolean;
  };
  textRankOptions?: {
    damping?: number;
    maxIterations?: number;
    minSimilarity?: number;
    tolerance?: number;
  };
};
```

| Property | Description |
| :-| :- |
| `debug` | Toggle debug mode. Debug mode collects timings of individual downsampling steps, output HTML is formatted. |
| `minify` | Toggle minification of the output DOM. |
| `uniqueIDs` | Toggle whether to add unique IDs to the input and output DOM via `data-uid` attribute. If the input DOM is a live reference, elements from the downsampled DOM can be traced back to elements in the live DOM (e.g., for dispatching actions). |
| `attributeScores` | Attribute scores for threshold-based removal. | [var.DEFAULTS_ATTRIBUTE_SCORES.ts](./src/var.DEFAULTS_ATTRIBUTE_SCORES.ts) |
| `classification` | HTML syntax-to-concept classifications: `actionableElements` – what counts as an actionable, `textElements` – what should be translated to Markdown. |
| `filter` | Filter elements from the output DOM by absolute measures: `attributes` – attributes by name, `elements` – elements by tag name, `dataURLs` – data URLs from attribute src values, `emptyElements` – elements with no contents (also images without `alt` and `src`). |
| `normalize` | Normalise the DOM for more idiomatic results; anti-patterns are recovered: `iconClasses` – names of icon fonts used via `class` attribute, `labelAttributes` – element text contents or image `alt` attribute values from text-label attributes (e.g., `aria-label`; precedence order), `svgToImg` – convert `SVG` to `IMG` elements for Markdown translation. |
| `skip` | Toggle absolute downsampling measures: `markdown` – whether to translate text formatting elements (`classification.textElements`) to Markdown, `textRank` – whether to rank text sentences by centrality before text-downsampling truncation. |
| `textRankOptions` | Configure TextRank, which is embedded in the text downsampling procedure. |

> The attribute scores map supports wildcards for `aria` and `data` (`{aria-|data-}*`).

#### Defaults

``` ts
{
  attributeScores: {},  // see src/var.DEFAULTS_ATTRIBUTE_SCORES.ts
  classification: {
    actionableElements: [
      "A",      "BUTTON", "DETAILS",
      "FORM",   "INPUT",  "LABEL",
      "SELECT", "OPTION", "SUMMARY",
      "TEXTAREA"
    ],
    textElements: [
      "ADDRESS",    "BLOCKQUOTE", "B",
      "CODE",       "EM",         "FIGURE",
      "FIGCAPTION", "H1",         "H2",
      "H3",         "H4",         "H5",
      "H6",         "HR",         "IMG",
      "LI",         "OL",         "P",
      "PRE",        "SMALL",      "SPAN",
      "STRONG",     "SUB",        "SUP",
      "TABLE",      "TBODY",      "TD",
      "THEAD",      "TH",         "TR",
      "UL"
    ],
  },
  filter: {
    attributes: [],
    elements: [
      "CIRCLE",   "CLIPPATH", "DEFS",
      "ELLIPSE",  "FILTER",   "G",
      "IMAGE",    "LINE",     "LINEARGRADIENT",
      "LINK",     "MASK",     "META",
      "NOSCRIPT", "PATH",     "PATTERN",
      "POLYGON",  "POLYLINE", "RADIALGRADIENT",
      "RECT",     "SCRIPT",   "STOP",
      "STYLE",    "TEMPLATE", "USE"
    ],
    dataURLs: true,
    emptyElements: true
  },
  normalize: {
    iconClasses: [],
    labelAttributes: [
      "aria-labelledby", "aria-label", "title"
    ],
    svgToImg: true
  },
  skip: {
    markdown: false,
    textRank: false
  },
  textRankOptions: {}   // see src/TextRank.ts
}
```

Filtering removes features outright (e.g., all elements with a specific tag). Normalisation alters DOM features to streamline them for uniform downsampling results (e.g., single MD syntax for images): elements that are not idiomatically described are altered to be idiomatic: elements without text get the most expressive text-label attribute promoted to text; the alt attribute is analogous to its text for IMG elements (void) in that matter. Prevalent text-label attributes are `aria-label` and `title`. SVGs and arbitrary, empty elements with a supported font `class` are converted to images.

#### Examples

``` ts
await d2Snap(`
  <nav>
    <div>
      <h1>
        <strong>Menu</strong>
      </h1>
    </div>
    <!-- IDIOMATIC -->
    <button class="button-primary" aria-label="Submit forms">Submit</button>
    <button class="button-primary">
      <p class="text-l text-bold" aria-label="Submit">
        <span class="50da9f 1dd45e ab0be3">Submit</span>
      </p>
      <span title="Forms">Forms</span>
    </button>
    <!-- SVG ICON -->
    <button class="button-primary">
      <svg viewBox="0 0 24 24"><title>Submit</title><path d="m5 12h14m-6-6 6 6-6 6"/></svg>
    </button>
    <!-- IMAGE ICON FONT -->
    <button class="button-primary">
      <img src="/ico/03f8aa.svg" aria-label="Submit">
    </button>
    <!-- ICON FONT ICON -->
    <button class="button-primary">
      <i class="dd8190 fa fa-submit"></i>
    </button>
  </nav>`,
  1, 1, 1,
  {
    filter: {
      elements: [ "H1" ],
      emptyElements: true
    },
    normalize: {
        iconClasses: [ "fa" ],
        labelAttributes: [ "aria-label", "title" ],
        svgToImg: true
    }
  }
);
```

``` html
<button>Submit</button>
<button>Submit Forms</button>
<button>![Submit]() </button>
<button>![Submit](/ico/03f8aa.svg)</button>
<button>![submit]() </button>
```

## Using D2Snap-Downsampled DOM Snapshots with LLM-Based Web Agents

Calling D2Snap sits in the first step of the LLM-based agent loop: (1) taking a web page snapshot, (2) prompting the model with the snapshot and a directed task, (3) performing model-elicited actions in the live web page UI.

```
(1) snapshot ⟵ D2Snap()

(2) actions  ⟵ promptModel()

(3) driveActions(actions)
```