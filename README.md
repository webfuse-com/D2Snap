<h1 align="center">D2Snap</h1>

![Example of downsampling on an image (top) and a DOM (bottom)](./.github/downsampling.png)

**D2Snap** is a first-of-its-kind DOM downsampling algorithm, designed for use with LLM-based web agents.

##

### Integrate

``` ts
D2Snap.d2Snap(
  dom: DOM,
  r_e: number, r_a: number, r_t: number,
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
}>
```

``` ts
type DOM = Document | Element | string;
type Options = {
  debug?: boolean;                // false
  groundTruth: object;            // see variables/ground-truth.json
  keepUnknownElements?: boolean;  // false
  skipMarkdown?: boolean;         // false
  uniqueIDs?: boolean;            // false
};
```

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
<main class="container" tabindex="3" required="true" type="example">
  <div class="mx-auto" data-topic="products" required="false">
    <h1>Our Pizza</h1>
    <div>
      <strong>Choose one</strong>
      <section class="shadow-lg">
        <h2>Margherita</h2>
        <p>
         A simple classic: mozzarela, tomatoes and basil.
         An everyday choice!
        </p>
        <button type="button">Add</button>
      </section>
      <section class="shadow-lg">
        <h2>Capricciosa</h2>
        <p>
          A rich taste: mozzarella, ham, mushrooms, artichokes, and olives.
          A true favourite!
        </p>
        <button type="button">Add</button>
      </section>
    </div>
  </div>
</main>
```

<p align="center">↓ D2Snap ↓</p>

``` html
<main class="container" required="true">
  # Our Pizza
  <section class="shadow-lg">
    **Choose one**
    ## Margherita
    A simple classic mozzarela tomatoes and basil
    <button>
      Add
    </button>
    ## Capricciosa
    A rich taste
    A true favourite
    <button>
      Add
    </button>
  </section>
</main>
```

<p align="center">↓ D2Snap ↓</p>

``` html
# Our Pizza
**Choose one**
## Margherita
A simple classic
<button>Add</button>
## Capricciosa
A rich taste
<button>Add</button>
```

##

### Experiment

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
npm run eval:<snapshot>
```

> `<snapshot>` ∈ { `gui`, `dom`, `bu`, `D2Snap` }

``` console
npm run eval:D2Snap -- --verbose --split 10,20 --provider openai --model gpt-4o
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