<h1 align="center">D2Snap</h1>

![Example of downsampling on an image (top) and a DOM (bottom)](./.github/downsampling-example.png)

**D2Snap** is a first-of-its-kind DOM downsampling algorithm, designed for use with LLM-based web agents.


> _Downsampling is a technique to reduce data through local, lossy consolidation, such that encoded features are largely preserved. A digital image can be locally consolidated by averaging an n-tile of pixels – the depicted object would remain recognisable. We transfer this principle to the DOM: it can analogously be locally consolidated by merging n-subtrees of nodes into a single ’average’ node. What constitutes a feature thereby depends on the intended purpose of the downsampled DOM; in our case, features are implied by the downsampled DOM’s utility as a snapshot for a web agent’s LLM backend. A gradual increase of the downsampling ratio should yield a gradual DOM reduction. Since HTML lexemes have unbounded length, however, monotonic size reduction is a strong aim, and linear size reduction a weak, best-effort aim._

##

### Example

``` html
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
</section>
```

<p align="center">↓ D2Snap ↓</p>

``` html
<section class="container" required="true" type="example">
  <div class="mx-auto" required="false">
    # Our Pizza
    <div>
      ## Margherita
      A simple classic: mozzarella, tomatoes and basil.
      An everyday choice!
      <button type="button">Add</button>
      ## Capricciosa
      A rich taste: mozzarella, ham, mushrooms, artichokes and olives.
      A true favourite!
      <button type="button">Add</button>
    </div>
  </div>
</section>
```

<p align="center">↓ D2Snap ↓</p>

``` html
# Our Pizza
## Margherita
A simple classic: mozzarella, tomatoes and basil.
An everyday choice!
<button>Add</button>
## Capricciosa
A rich taste: mozzarella, ham, mushrooms, artichokes and olives.
A true favourite!
<button>Add</button>
```

##

### Integrate

``` ts
D2Snap.d2Snap(
  dom: DOM,
  rE: number, rA: number, rT: number,
  options?: Options
): Promise<{
  dom: string;
  innerHTML: string;  // alias: html
  outerHTML: string;
  meta: {
    tokenEstimate: number;
    originalSize: number;
    sizeRatio: number;
    snapshotSize: number;
  };
}>

D2Snap.adaptiveD2Snap(
  dom: DOM,
  maxTokens: number = 4096,
  maxIterations: number = 5,
  options?: Options
): Promise<{
  dom: string;
  html: string;
  meta: {};
  parameters: {};
  adaptiveIterations: number;
}>
```

``` ts
type DOM = Document | Element | string;
type Options = {
  debug?: boolean;            // false
  minify?: boolean;           // true
  outerHTML?: boolean;        // false
  uniqueIDs?: boolean;        // false
  attributeScoring?: {        // compare src/var.ATTRIBUTE_SCORING.ts
    [ name: string ]: number;
  };
  labelToText?: {
    iconFonts?: boolean;       // false
    tagNames?: string[];       // [ "IMG", "SVG" ]
  }>;
  skip?: {
    markdown?: boolean;       // false
    skipTextRank?: boolean;   // false
  };
};
```

> The attribute scoring lookup table supports wildcards for `aria` and `data` (`{aria-|data-}*`).

#### Browser

``` html
<script src="https://cdn.jsdelivr.net/gh/webfuse-com/D2Snap@main/dist.browser/D2Snap.js"></script>
```

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

##

### Experiments

#### Setup

``` console
npm install
npm install jsdom
```

#### Build

``` console
npm run build
```

#### Test

``` console
npm run test
```

##### Unit Test(s)

``` console
npm run test:unit
npm run test:unit -- <test-name> # e.g., D2Snap.option.filters
```

##### Regression Tests

``` console
npm run test:regression
```

#### Evaluate

> Provide LLM API provider key(s) to .env (compare [example](./.env.example)).

``` console
cs eval && pip install -r requirements.txt
```

##### Success Rate

``` console
npm run eval:success:<subject>
```

> `<subject>` ∈ { `gui`, `dom`, `bu`, `D2Snap` }

``` console
npm run eval:success:D2Snap -- --verbose --split 10,20 --provider openai --model gpt-4o
```

> Does use the LLM backend.

##### Size Ratio

``` console
npm run eval:ratio
```

> Does not use the LLM backend.

#### Re-create Snapshots

``` console
npm run snapshots:create
```

> 

##

<p align="center">
  <strong>Beyond Pixels: Exploring DOM Downsampling for LLM-Based Web Agents</strong>
  <br>
  <sub><a href="https://github.com/t-ski" target="_blank">Thassilo M. Schiepanski</a></sub>
  &hairsp;
  <sub><a href="https://nl.linkedin.com/in/nicholasp" target="_blank">Nicholas Piël</a></sub>
  <br>
  <sub>Surfly BV</sub>
</p>