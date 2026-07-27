<h1 align="center">D2Snap</h1>

![Example of downsampling on an image (top) and a DOM (bottom)](./.github/downsampling-example.png)

**D2Snap** is a first-of-its-kind DOM downsampling algorithm, designed for use with LLM-based web agents.

##

### Integrate

``` ts
D2Snap.d2Snap(
  dom: DOM,
  rE: number, rA: number, rT: number,
  options?: Options
): Promise<{
  html: string;
  meta: {};
}>

D2Snap.adaptiveD2Snap(
  dom: DOM,
  maxTokens: number = 4096,
  maxIterations: number = 5,
  options?: Options
): Promise<{
  html: string;
  meta: {};
  parameters: {};
  adaptiveIterations: number;
}>
```

``` ts
type DOM = Document | Element | string;
type Options = {
  debug?: boolean;                              // false
  uiFeatureHeuristics?: object;                 // compare src/types.ts:UIFeatureHeuristicsJSON
  uiFeatureHeuristicsReplaceDefault?: boolean;  // false
  skipMarkdown?: boolean;                       // false
  skipTextRank?: boolean;                       // false
  uniqueIDs?: boolean;                          // false
};
```

> The downsampling [UI feature heuristics](./src/var.UI_FEATURE_HEURISTICS.ts) can be overridden via `options.uiFeatureHeuristics` (full replacement via `uiFeatureHeuristicsReplaceDefault: true`).
> Wildcards for `aria` and `data` attributes are supported (`{aria-|data-}*`).

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

#### Evaluate

> Provide LLM API provider key(s) to .env (compare [example](./.env.example)).

``` console
cs eval && pip install -r requirements.txt
```

``` console
npm run eval:success:<subject>
npm run eval:ratio
```

> `<subject>` ∈ { `gui`, `dom`, `bu`, `D2Snap` }

``` console
npm run eval:success:D2Snap -- --verbose --split 10,20 --provider openai --model gpt-4o
```

#### Re-create Snapshots

``` console
npm run snapshots:create
```

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