# D2Snap API

`webfuse-com/d2snap` is a typed JavaScript library implementing the [D2Snap](https://arxiv.org/abs/2508.04412) algorithm.

## How It Works – In a Nutshell

D2Snap reduces an input DOM by "averaging" features that render in the UI. The reduction is controlled by a defined ratio (e.g., `0.5`):

- **Element** nodes are folded into each other. The DOM height is set to reduce by ratio (with `0.5`: half the original height).
- **Text** contents are truncated at the least relevant sentences; relevance is translated by _TextRank_ centrality. Each text is set to reduce by ratio at the sentence level (with `0.5`: half of the sentences); texts are text nodes or, with the `prose` option, the text of an element across its child elements
- **Attribute** removal is implied with bottom-up folds (assumption: attributes are reflexive or forward-transitive). Additionally, attributes are removed if they score below a ratio-equivalent threshold (with `0.5`: all attributes less relevant than `0.5`). Scoring is thereby an affordance-frequency mapping between attribute names and a value on the ratio scale. Note that this technique is idempotent.

Before downsampling, the DOM is normalised by a chain of callbacks (normalizers), e.g., to remove noise by absolute measures, or to recover anti-patterns for more idiomatic results. The API exposes the default callbacks, so they can be configured, reordered, or complemented with custom ones.

## Installation

#### Module

``` console
npm install webfuse-com/D2Snap
```

> Install [jsdom](https://github.com/jsdom/jsdom) to use the library with Node.js:
> ``` console
> npm install jsdom
> ```
> D2Snap is tested with jsdom 30 (requires Node.js `^22.22.2`, `^24.15.0`, or `>=26`). Older jsdom versions work, but are considerably slower on large DOMs.

``` js
import * as D2Snap from "@webfuse-com/d2snap";
```

#### Browser

``` html
<script src="https://cdn.jsdelivr.net/gh/webfuse-com/D2Snap@main/dist.browser/D2Snap.js"></script>
```

> The browser bundle exposes the API via the global `window.D2Snap`.

## Downsampling Functions

### `d2Snap()`

Downsample a DOM – given a DOM and downsampling ratios: specific ratios, or a ratios object.

``` ts
function d2Snap(
  domOrHTML: Document | Element | string,
  rE: number, rA: number, rT: number,
  options?: D2SnapOptions
): Promise<D2SnapResult>

function d2Snap(
  domOrHTML: Document | Element | string,
  ratios: { r?: number; rE?: number; rA?: number; rT?: number; },
  options?: D2SnapOptions
): Promise<D2SnapResult>
```

> The DOM-parsed input is always wrapped by a `BODY` element to allow destructive filtering operations on the passed root node.

#### Parameters

| Parameter | Description | Range |
| :-| :- | :- |
| `domOrHTML` | Input DOM given as fully qualified document reference (tree), an element reference (subtree) or an equivalent HTML serialisation. | `Document`, `Element`, `string` |
| `rE` | Element downsampling ratio. Controls the preserved DOM height by ratio. | `[0, 1]` |
| `rA` | Attribute downsampling ratio (threshold). Controls which attributes are preserved by score threshold (latent ratio if scores are affordance-frequency balanced). Attribute scores are predefined based on empirical adjustment, but can be overridden via `options`. | `[0, 1]` |
| `rT` | Text downsampling ratio. Controls the preserved sentence-based text length per text node (per element text with the `prose` option). | `[0, 1]` |
| `ratios` | Downsampling ratios object. Specific ratios (`rE`, `rA`, `rT`) fall back to `r`, else to `0` (no reduction). | `D2SnapRatios` |
| `options` | Specific configuration options (see below). | `D2SnapOptions` |

> Ratios outside of `[0, 1]` (or not of type `number`) throw a `RangeError`.

``` ts
await d2Snap(html, 0.5, 0.5, 0.5);        // specific ratios
await d2Snap(html, { r: 0.5 });           // equivalent: ratios object
await d2Snap(html, { r: 0.5, rT: 0 });    // all at 0.5, except text (no reduction)
await d2Snap(html, { rE: 0.8 });          // only elements (rA = rT = 0)
```

> `r` applies one value to all three ratios, which differ in kind: a relative ratio for `rE` and `rT`, but an absolute score threshold for `rA`.

> With `rT = 0`, all sentences are kept, but text is still re-joined at the sentence level: whitespace and line breaks between sentences are normalised (also within `PRE` and `TEXTAREA` elements).

> With the `prose` option, text is downsampled per element: the direct text nodes of an element form one text, ranked across its child elements, so complete sentences are kept (at least one per element). Element boundaries are hard boundaries: text within a child element (e.g., a link, a heading) is a text of its own. Child elements belong to the sentence at their position and are removed with dropped sentences – except actionable elements, which always survive in place; sentences containing actionable elements are ranked separately and rank first, so actionables tend to keep their context. With `rT = 0`, text remains untouched.

#### Return Value

``` ts
type D2SnapResult = {
  dom: Element,
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
| `meta` | Information about the downsampling results: `tokenEstimate` – estimated token count of the HTML-serialised output DOM (based on [https://platform.openai.com](https://platform.openai.com/tokenizer)), `originalSize` – byte size (UTF-8) of the HTML-serialised input DOM, `sizeRatio` – size ratio of the HTML-serialised output DOM compared to the input DOM (`1` for an empty input with an empty output), `snapshotSize` – byte size (UTF-8) of the HTML-serialised output DOM, `timings` (debug mode only) – durations of individual downsampling steps. |

> The HTML-serialised input DOM is always parsed into a fully qualified document. For string or `Document` inputs, the returned `dom` is the cloned `BODY`.

> Sizes compare the same root: the `BODY` contents for documents (`HEAD` is not part of snapshots), and the element itself for element inputs.

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
<section class="container">
  # Our Pizza ## Margherita A simple classic: mozzarella, tomatoes and basil.
  <button>
    Add
  </button>
  ## Capricciosa A rich taste: mozzarella, ham, mushrooms, artichokes and olives.
  <button>
    Add
  </button>
</section>
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
| `maxTokens` | Maximum estimated amount of tokens the HTML-serialised output DOM is allowed to have. The result aims for being close to the bound (within 5 % below it, as far as the snapshot steps allow). Throws a `RangeError` if the constraint cannot be satisfied (`error.meta.lastEstimate`: token estimate of the most reduced snapshot). | `[0, ∞)` |
| `maxIterations` | Maximum amount of snapshots after the first (unreduced) one to try satisfying and approaching the `maxTokens` constraint. | `[0, ∞)` |
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
| `parameters` | Applied D2Snap downsampling parameters to satisfy the constraints (`rE = rA = rT`). |
| `adaptiveIterations` | Amount of snapshots taken after the first (unreduced) one. |

The parameters are searched along a single ratio `r = rE = rA = rT`, as tokens fall (roughly linearly, in steps) with `r`:

1. `r = 0`: if the unreduced snapshot satisfies the constraint, it is the closest possible result.
2. `r = 1`: if the most reduced snapshot does not satisfy the constraint, no snapshot does (`RangeError`).
3. In between, the bracket is narrowed with the ITP method (interpolate, truncate, project; [Oliveira & Takahashi, 2020](https://doi.org/10.1145/3423597)): as fast as interpolation on regular token curves, and never slower than bisection in the worst case. The search ends once a snapshot lies within 5 % below the bound, a snapshot leaves the bracket unchanged (plateau) while the closest snapshot lies within 15 % below the bound, the ratio is resolved to `0.001`, or the iterations are exhausted.

The snapshot closest to the bound without exceeding it is returned. The DOM is pre-processed (normalized) only once: all snapshots of the search start from the same normalized DOM, which yields the same snapshots as individual `d2Snap()` calls.

> The token estimate refers to the HTML serialisation, so formatting (`debug`) counts towards the bound.

### Options

``` ts
interface D2SnapOptions {
  debug?: boolean;
  minify?: boolean;
  filterEmptyElements?: boolean;
  shadowDOM?: boolean;
  uniqueIDs?: boolean;
  attributeScores?: {
    [ name: string ]: number;
  };
  classifiers?: {
    actionableElement?: ElementClassifierFn<Element>;
    textFormattingElement?: ElementClassifierFn<Element>;
  };
  normalizers?: NodeNormalizerFn[];
  markdown?: boolean;
  prose?: boolean;
  sentenceRanker?: SentenceRankerFn | null;
};
```

| Property | Description |
| :-| :- |
| `debug` | Toggle debug mode. Debug mode collects timings of individual downsampling steps, output HTML is formatted. |
| `minify` | Toggle minification of the output DOM. |
| `filterEmptyElements` | Toggle removal of elements with no contents from the output DOM (void and actionable elements are kept). |
| `shadowDOM` | Toggle whether to compose open shadow roots (incl. slotted content) into the snapshot. Closed shadow roots are inaccessible, so only their light content is kept. |
| `uniqueIDs` | Toggle whether to add unique IDs to the input and output DOM via `data-uid` attribute. If the input DOM is a live reference, elements from the downsampled DOM can be traced back to elements in the live DOM (e.g., for dispatching actions). IDs are stable across snapshots of the same document. Shortcut for appending `defaults.normalizers.assignUniqueIds` to `normalizers` (unless already contained). |
| `attributeScores` | Attribute scores for threshold-based removal (see [constants.defaults.ts](./src/constants.defaults.ts)). |
| `classifiers` | HTML syntax-to-concept classification callbacks: `actionableElement` – whether an element is actionable, `textFormattingElement` – whether an element is a text formatting element (translated to Markdown) (see [Classifiers](#classifiers)). |
| `normalizers` | Ordered chain of callbacks that normalise the DOM before downsampling (see [Normalizers](#normalizers)). Replaces the default chain; reuse `defaults.NORMALIZERS` for subsets, supersets, or other orders. |
| `markdown` | Toggle translating text formatting elements (`classifiers.textFormattingElement`) to Markdown. |
| `prose` | Toggle per-element text downsampling: the direct text nodes of an element form one text, ranked across its child elements (see the note on text downsampling above). Off: per text node (as described in the paper). |
| `sentenceRanker` | Callback that ranks the sentences of a text by relevance, or `null` for no ranking (the leading sentences are kept; see [Sentence Rankers](#sentence-rankers)). |

> The attribute scores map supports wildcard suffixes for hyphenated attribute names (e.g., `aria-*` or `data-*`; the longest matching prefix wins), and a fallback score via `*`.

#### Defaults

``` ts
{
  debug: false,
  minify: true,
  filterEmptyElements: true,
  shadowDOM: false,
  uniqueIDs: false,
  attributeScores: defaults.ATTRIBUTE_SCORES,
  classifiers: defaults.CLASSIFIERS,
  normalizers: defaults.NORMALIZERS,
  markdown: true,
  prose: false,
  sentenceRanker: defaults.SENTENCE_RANKER
}
```

Filtering removes features outright (e.g., all elements with a specific tag). Normalisation alters DOM features to streamline them for uniform downsampling results (e.g., single MD syntax for images): elements that are not idiomatically described are altered to be idiomatic: elements without text get the most expressive text-label attribute promoted to text; the alt attribute is analogous to its text for IMG elements (void) in that matter. Prevalent text-label attributes are `aria-label` and `title`. SVGs and arbitrary, empty elements with a supported font `class` are converted to images. Both kinds of measures are implemented as normalizers.

#### Examples

``` ts
const { normalizers } = defaults;
const labelAttributeNames = [ "aria-label", "title" ];

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
    debug: true,
    normalizers: [
      normalizers.filterComments,
      (virtualNode, liveNode, context) => normalizers.filterNoiseElements(virtualNode, liveNode, context, {
        tagNames: [ "H1" ]
      }),
      (virtualNode, liveNode, context) => normalizers.filterEmptyImages(virtualNode, liveNode, context, {
        labelAttributeNames
      }),
      (virtualNode, liveNode, context) => normalizers.normalizeSvgsToImgs(virtualNode, liveNode, context, {
        labelAttributeNames
      }),
      (virtualNode, liveNode, context) => normalizers.normalizeIconClassesToImgs(virtualNode, liveNode, context, {
        iconClassPrefixes: [ "fa" ],
        labelAttributeNames
      }),
      (virtualNode, liveNode, context) => normalizers.normalizeTextLabelAttributesToContent(virtualNode, liveNode, context, {
        labelAttributeNames
      }),
      normalizers.filterAttributes,
      normalizers.filterDataUrls
    ]
  }
);
```

``` html
<button>
  Submit
</button>
<button>
  Submit Forms
</button>
<button>
  ![Submit]()
</button>
<button>
  ![Submit](/ico/03f8aa.svg)
</button>
<button>
  ![submit]()
</button>
```

## Normalisation Function

### `normalizeDOM()`

Normalise a DOM without downsampling – runs the normalizer chain only (no element folding, text truncation, attribute removal, or Markdown translation).

``` ts
function normalizeDOM(
  domOrHTML: Document | Element | string,
  options?: NormalizeDOMOptions
): Promise<NormalizeDOMResult>
```

> Normalisation is identical to the pre-processing step of `d2Snap()`. The input DOM is not mutated, except by normalizers that explicitly write to it (unique IDs).

#### Parameters

| Parameter | Description | Range |
| :-| :- | :- |
| `domOrHTML` | Input DOM given as fully qualified document reference (tree), an element reference (subtree) or an equivalent HTML serialisation. | `Document`, `Element`, `string` |
| `options` | The pre-processing subset of the downsampling options: `classifiers`, `normalizers`, `shadowDOM`, and `uniqueIDs` (same defaults). | `NormalizeDOMOptions` |

#### Return Value

``` ts
type NormalizeDOMResult = {
  dom: Element,
  innerHTML: string; html: string;
  outerHTML: string;
}
```

| Property | Description |
| :-| :- |
| `dom` | The normalised DOM, cloned from the input DOM; hydrated from serialised input. |
| `innerHTML`, `html` | The serialised normalised DOM, excluding the root element. |
| `outerHTML` | The serialised normalised DOM, including the root element. |

#### Examples

``` ts
const { normalizers } = defaults;

await normalizeDOM(`
  <nav>
    <!-- SVG ICON -->
    <button class="button-primary">
      <svg viewBox="0 0 24 24"><title>Submit</title><path d="m5 12h14m-6-6 6 6-6 6"/></svg>
    </button>
    <!-- ICON FONT ICON -->
    <button class="button-primary">
      <i class="dd8190 fa fa-submit"></i>
    </button>
  </nav>`,
  {
    normalizers: [
      normalizers.filterComments,
      normalizers.normalizeSvgsToImgs,
      (virtualNode, liveNode, context) => normalizers.normalizeIconClassesToImgs(virtualNode, liveNode, context, {
        iconClassPrefixes: [ "fa" ]
      })
    ]
  }
);
```

``` html
<nav>
    
    <button class="button-primary">
      <img alt="Submit">
    </button>
    
    <button class="button-primary">
      <img alt="submit">
    </button>
  </nav>
```

> The normalised DOM is not formatted or minified; whitespace is preserved from the input.

## Defaults

All defaults are provided via the `defaults` namespace – to reuse them, e.g., in custom subsets, supersets, or orders. All defaults are frozen.

> Callbacks (classifiers, normalizers, sentence rankers) are called synchronously. Errors thrown by a callback are not caught: they reject the promise returned by `d2Snap()`, `adaptiveD2Snap()`, or `normalizeDOM()`.

``` ts
import { defaults } from "@webfuse-com/d2snap";
```

| Property | Description |
| :-| :- |
| `ATTRIBUTE_SCORES` | Default attribute scores (`attributeScores` option). |
| `CLASSIFIERS` | Default classifiers (`classifiers` option): `{ actionableElement: classifiers.isActionableElement, textFormattingElement: classifiers.isTextElement }`. |
| `CLASSIFIER_SETTINGS` | Default settings per classifier callback (by name). |
| `NORMALIZERS` | Default normalizer chain (`normalizers` option). |
| `NORMALIZER_SETTINGS` | Default settings per normalizer callback (by name). |
| `SENTENCE_RANKER` | Default sentence ranker (`sentenceRanker` option): `sentenceRankers.textRank`. |
| `SENTENCE_RANKER_SETTINGS` | Default settings per sentence ranker callback (by name). |
| `classifiers` | All classifier callbacks. |
| `normalizers` | All normalizer callbacks, incl. opt-in ones (`assignUniqueIds`). |
| `sentenceRankers` | All sentence ranker callbacks. |

### Classifiers

``` ts
type ElementClassifierFn<T> = (element: T) => boolean;
```

Classifiers decide on element concepts. Each callback accepts its settings as optional second argument; wrap it to override the defaults (see [Overriding Callbacks](#overriding-callbacks)).

> Classifiers are called with elements of the virtual DOM during downsampling, and with elements of the live DOM when called by normalizers (`context.classifiers`; see [Virtual and Live Nodes](#virtual-and-live-nodes)). Custom classifiers should thus rely on features both carry, such as tag names or `role` attributes.

| Callback | Description | Settings (defaults) |
| :-| :- | :- |
| `isActionableElement` | Whether an element is actionable (kept as is, e.g., not translated to Markdown). | `tagNames` – actionable tag names (`A`, `BUTTON`, `DETAILS`, `FORM`, `INPUT`, `LABEL`, `SELECT`, `OPTION`, `SUMMARY`, `TEXTAREA`), `roleAttributeValues` – actionable `role` attribute values (`button`, `checkbox`, `link`, `menuitem`, `menuitemcheckbox`, `menuitemradio`, `option`, `radio`, `searchbox`, `slider`, `spinbutton`, `switch`, `textbox`, `combobox`, `listbox`) |
| `isTextElement` | Whether an element is a text formatting element (translated to Markdown). | `tagNames` – text formatting tag names (`ADDRESS`, `BLOCKQUOTE`, `B`, `CODE`, `EM`, `FIGURE`, `FIGCAPTION`, `H1`–`H6`, `HR`, `IMG`, `LI`, `OL`, `P`, `PRE`, `SMALL`, `SPAN`, `STRONG`, `SUB`, `SUP`, `TABLE`, `TBODY`, `TD`, `THEAD`, `TH`, `TR`, `UL`) |

### Normalizers

``` ts
type NodeNormalizerFn = (
  virtualNode: Node,
  liveNode: Node,
  context: NormalizerContext
) => void;

interface NormalizerContext {
  classifiers: D2SnapOptions["classifiers"];
  document: Document;
}
```

Normalizers are called for each node of the DOM (pre-order; elements, attributes, text, and comments), in the order of the chain. Attributes are visited before their element. A normalizer alters the cloned `virtualNode` (e.g., removes or replaces it); replacements are visited next, by the entire chain. The corresponding `liveNode` of the input DOM is meant for reading only (see [Virtual and Live Nodes](#virtual-and-live-nodes)). `context.document` is the document of the cloned DOM (e.g., to create nodes). Each built-in normalizer accepts its settings as optional fourth argument; wrap it to override the defaults (see [Overriding Callbacks](#overriding-callbacks)).

> Normalizers receive any type of node. Custom normalizers have to check the node type (e.g., `virtualNode.nodeType === 1` for elements; `Node` constants are not global in Node.js).

| Callback | Description | Settings (defaults) |
| :-| :- | :- |
| `filterComments` | Remove comments. | `keepPattern` – keep comments matching a pattern (`null`) |
| `filterNoiseElements` | Remove elements by tag name. | `tagNames` – tag names to remove (`CIRCLE`, `CLIPPATH`, `DEFS`, `ELLIPSE`, `FILTER`, `G`, `IMAGE`, `LINE`, `LINEARGRADIENT`, `LINK`, `MASK`, `META`, `NOSCRIPT`, `PATH`, `PATTERN`, `POLYGON`, `POLYLINE`, `RADIALGRADIENT`, `RECT`, `SCRIPT`, `STOP`, `STYLE`, `TEMPLATE`, `USE`) |
| `filterEmptyImages` | Remove images without `src`, `alt`, and text-label attribute. | `labelAttributeNames` – text-label attributes (`aria-labelledby`, `aria-label`, `title`) |
| `normalizeSvgsToImgs` | Convert `SVG` to `IMG` elements for Markdown translation (`alt` from SVG `title`, `desc`, or text-label attributes). | `labelAttributeNames` – text-label attributes (`aria-labelledby`, `aria-label`, `title`) |
| `normalizeIconClassesToImgs` | Convert empty elements with an icon font `class` to `IMG` elements (`alt` from text-label attributes, or the icon name). Actionable elements are kept; the image is prepended. | `iconClassPrefixes` – names of icon fonts used via `class` attribute (none), `labelAttributeNames` – text-label attributes (`aria-labelledby`, `aria-label`, `title`) |
| `normalizeTextLabelAttributesToContent` | Promote the most expressive text-label attribute to text content of elements without text (to `alt` for images; raw-text elements are not altered). | `labelAttributeNames` – text-label attributes in precedence order (`aria-labelledby`, `aria-label`, `title`) |
| `filterAttributes` | Remove attributes by name. | `attributeNames` – attribute names to remove (none) |
| `filterDataUrls` | Remove attributes with data URL values. | `attributeNames` – attribute names to check (`src`), `valuePattern` – data URL pattern (`/^data:/i`) |
| `assignUniqueIds` | Add stable unique IDs to elements of the input and output DOM (opt-in; see `uniqueIDs` option). | `attributeName` – ID attribute name (`data-uid`) |

> The default chain (`defaults.NORMALIZERS`) is: `filterComments`, `filterNoiseElements`, `filterEmptyImages`, `normalizeSvgsToImgs`, `normalizeIconClassesToImgs`, `normalizeTextLabelAttributesToContent`, `filterAttributes`, `filterDataUrls`. Text-label attribute names are case-insensitive; `aria-labelledby` references are resolved in the element's shadow root first, then in the document.

#### Virtual and Live Nodes

Snapshots are taken from a clone of the input DOM – the virtual DOM –, which normalisation and downsampling alter destructively. The input DOM – the live DOM – remains untouched: it is the web page an agent acts upon. Each normalizer call therefore receives a node of the virtual DOM together with its counterpart in the live DOM:

| Node | Description | Access |
| :-| :- | :- |
| `virtualNode` | The node to normalise, part of the snapshot. | Read and write. |
| `liveNode` | The corresponding original node of the input DOM. | Read only. |

Access to both is given for the following reasons:

- **Order independence**: Normalizers run in a chain. Previous normalizers may have removed or altered virtual nodes (e.g., a filtered element, a removed `aria-label` attribute). The live node still carries the original state, so a normalizer's result does not depend on its position in the chain.
- **Document context**: References across the DOM, such as `aria-labelledby` IDs, are resolved in the live node's root (shadow root first, then document). The virtual DOM may no longer contain the referenced element.
- **Uncloned state**: Shadow roots are not part of the clone. With the `shadowDOM` option enabled, their composed content is cloned from the live DOM during normalisation.
- **Traceability**: `assignUniqueIds` writes IDs to both nodes, so snapshot elements can be traced back to live elements (e.g., for dispatching actions). It is the only normalizer that writes to the live DOM.

Nodes are paired as follows:

- Child nodes are paired by position when their parent is visited, i.e., before any normalizer alters them.
- Attribute nodes are paired with the attribute of the same name on the live counterpart element.
- Replacements inherit the live counterpart of the node they replace, if of the same node type (e.g., an `IMG` replacing an `SVG` receives the live `SVG`). Subsequent normalizers thus still read the original.
- Nodes without a live counterpart (e.g., inserted nodes) receive the virtual node itself as `liveNode` (`liveNode === virtualNode`).

``` ts
const appendDescription = (virtualNode, liveNode, context) => {
  if(virtualNode.nodeType !== 1) return;  // Element nodes only

  const descriptionID = liveNode.getAttribute("aria-describedby");
  if(!descriptionID) return;

  // Resolve in the live DOM: the referenced element may be filtered from the virtual DOM already
  const description = liveNode.getRootNode()
    .getElementById(descriptionID)
    ?.textContent
    .trim();
  if(!description) return;

  virtualNode.append(context.document.createTextNode(` (${description})`));
};

await d2Snap(`
  <main>
    <p id="cola-info" class="hint">Free refills.</p>
    <button aria-describedby="cola-info">Add cola</button>
  </main>`,
  0, 0, 0,
  {
    debug: true,
    normalizers: [
      (virtualNode, liveNode, context) => normalizers.filterNoiseElements(virtualNode, liveNode, context, {
        tagNames: [ ...defaults.NORMALIZER_SETTINGS.filterNoiseElements.tagNames, "P" ]
      }),
      appendDescription
    ]
  }
);
```

``` html
<main>
  <button aria-describedby="cola-info">
    Add cola (Free refills.)
  </button>
</main>
```

> Resolved in the virtual DOM instead, the description would be missing: the referenced `P` element is filtered by the previous normalizer.

### Sentence Rankers

``` ts
type SentenceRankerFn = (sentences: string[]) => string[];
```

Sentence rankers order the sentences of a text by relevance (most relevant first). Text downsampling keeps the most relevant sentences, in their original order. With the `prose` option, the ranker receives sentences as visible (incl. the text of child elements), and sentences containing actionable elements are ranked separately and rank first. Up to one sentence ranker applies (`sentenceRanker` option); with `null`, sentences are not ranked, so the leading sentences are kept. Each callback accepts its settings as optional second argument; wrap it to override the defaults:

``` ts
const sentenceRanker = sentences => defaults.sentenceRankers.textRank(sentences, {
  damping: 0.85
});
```

| Callback | Description | Settings (defaults) |
| :-| :- | :- |
| `textRank` | Rank sentences by TextRank centrality (default). | `damping` – damping factor of the centrality iteration (`0.75`), `maxIterations` – maximum amount of centrality iterations (`20`), `minSimilarity` – minimum sentence similarity to connect sentences (`0.1`), `tolerance` – convergence tolerance of the centrality iteration (`1e-4`) |

### Overriding Callbacks

Default callbacks can be reused with custom settings: wrap the callback, pass the settings to override, and reuse the default settings (`defaults.CLASSIFIER_SETTINGS`, `defaults.NORMALIZER_SETTINGS`, `defaults.SENTENCE_RANKER_SETTINGS`) to derive them. Omitted settings keep their defaults. The defaults themselves remain untouched.

#### Normalizer

Reuse `normalizeTextLabelAttributesToContent` exactly as is – but with an additional text-label attribute (`data-label`; first in precedence order). Replace the callback in place, so the default chain remains in order:

``` ts
const { normalizers } = defaults;

const labelAttributeNames = [
  "data-label",
  ...defaults.NORMALIZER_SETTINGS.normalizeTextLabelAttributesToContent.labelAttributeNames
];

const normalizeTextLabelAttributesToContent = (virtualNode, liveNode, context) => {
  return normalizers.normalizeTextLabelAttributesToContent(virtualNode, liveNode, context, {
    labelAttributeNames
  });
};

await d2Snap(html, 0.5, 0.5, 0.5, {
  normalizers: defaults.NORMALIZERS
    .map(normalizer => (normalizer === normalizers.normalizeTextLabelAttributesToContent)
      ? normalizeTextLabelAttributesToContent
      : normalizer)
});
```

> Each label-aware normalizer (`filterEmptyImages`, `normalizeSvgsToImgs`, `normalizeIconClassesToImgs`, `normalizeTextLabelAttributesToContent`) has its own `labelAttributeNames` setting. To change text-label attributes consistently, wrap all of them:
> ``` ts
> const labelAwareNormalizers = [
>   normalizers.filterEmptyImages,
>   normalizers.normalizeSvgsToImgs,
>   normalizers.normalizeIconClassesToImgs,
>   normalizers.normalizeTextLabelAttributesToContent
> ];
>
> await d2Snap(html, 0.5, 0.5, 0.5, {
>   normalizers: defaults.NORMALIZERS
>     .map(normalizer => labelAwareNormalizers.includes(normalizer)
>       ? (virtualNode, liveNode, context) => normalizer(virtualNode, liveNode, context, {
>         labelAttributeNames
>       })
>       : normalizer)
> });
> ```

#### Classifier

Reuse `isActionableElement` exactly as is – but with an additional actionable tag name (`X-BUTTON`). Actionable `role` attribute values keep their defaults; the text elements classifier remains the default:

``` ts
const isActionableElement = element => {
  return defaults.classifiers.isActionableElement(element, {
    tagNames: [
      ...defaults.CLASSIFIER_SETTINGS.isActionableElement.tagNames,
      "X-BUTTON"
    ]
  });
};

await d2Snap(html, 0.5, 0.5, 0.5, {
  classifiers: {
    actionableElement: isActionableElement
  }
});
```

#### Examples

Both overrides combined:

``` ts
await d2Snap(`
  <nav>
    <button data-label="Add fries"></button>
    <button aria-label="Add ketchup" data-label="Add ketchup (free)"></button>
    <x-button>Checkout</x-button>
    <h2>Sides</h2>
  </nav>`,
  0.5, 0.5, 0.5,
  {
    debug: true,
    normalizers: defaults.NORMALIZERS
      .map(normalizer => (normalizer === normalizers.normalizeTextLabelAttributesToContent)
        ? normalizeTextLabelAttributesToContent
        : normalizer),
    classifiers: {
      actionableElement: isActionableElement
    }
  }
);
```

``` html
<nav>
  <button>
    Add fries
  </button>
  <button aria-label="Add ketchup">
    Add ketchup (free)
  </button>
  <x-button>
    Checkout
  </x-button>
  ## Sides
</nav>
```

> With the defaults, the first button remains empty, the second button is labelled `Add ketchup`, and `X-BUTTON` is folded into text.

## Types

Types are provided for TypeScript usage:

``` ts
import type { D2SnapOptions, D2SnapResult } from "@webfuse-com/d2snap";
```

| Type | Description |
| :-| :- |
| `D2SnapOptions` | Options of `d2Snap()` and `adaptiveD2Snap()` (passed partially). |
| `D2SnapResult` | Result of `d2Snap()`. |
| `AdaptiveD2SnapResult` | Result of `adaptiveD2Snap()`. |
| `AdaptiveD2SnapError` | Error thrown by `adaptiveD2Snap()` for an unsatisfiable token limit (`meta.lastEstimate`). |
| `D2SnapRatios` | Downsampling ratios object of `d2Snap()`. |
| `D2SnapArgs` | Argument forms of `d2Snap()` following the DOM (e.g., to pass all forms through a wrapper). |
| `NormalizeDOMOptions` | Options of `normalizeDOM()` (passed partially). |
| `NormalizeDOMResult` | Result of `normalizeDOM()`. |
| `AttributeScoring` | Attribute scores (`attributeScores` option). |
| `ElementClassifierFn` | Classifier callback. |
| `NodeNormalizerFn` | Normalizer callback. |
| `NormalizerContext` | Context passed to normalizers. |
| `SentenceRankerFn` | Sentence ranker callback. |

Settings types of the default callbacks are provided via the respective `defaults` namespaces, named after the callback (`<Callback>Settings`, e.g., `FilterNoiseElementsSettings` for `filterNoiseElements`):

``` ts
import { defaults } from "@webfuse-com/d2snap";

const settings: Partial<defaults.normalizers.FilterNoiseElementsSettings> = {
  tagNames: [ ...defaults.NORMALIZER_SETTINGS.filterNoiseElements.tagNames, "ASIDE" ]
};
```

## Limitations

- **Long texts**: TextRank compares all sentence pairs of a text, so time and memory grow quadratically with the sentence count per text node (per element text with the `prose` option). A single text with tens of thousands of sentences can exhaust memory; use another sentence ranker, or `null`, for such input.
- **Wide text formatting elements**: Markdown translation converts each text formatting element as a whole. For a single element with thousands of children (e.g., a long list), the conversion time grows quadratically (avoid with `markdown: false`).
- **Deep nesting (Node.js)**: jsdom's HTML serializer exceeds the call stack at roughly 3,000 levels of nesting.
- **jsdom versions (Node.js)**: DOM operations of older jsdom versions grow superlinearly for wide or deep DOMs; use jsdom 30 or later.

## Using D2Snap-Downsampled DOM Snapshots with LLM-Based Web Agents

Calling D2Snap sits in the first step of the LLM-based agent loop: (1) taking a web page snapshot, (2) prompting the model with the snapshot and a directed task, (3) performing model-elicited actions in the live web page UI.

```
(1) snapshot ⟵ D2Snap()

(2) actions  ⟵ promptModel(snapshot)

(3) driveActions(actions)
```
