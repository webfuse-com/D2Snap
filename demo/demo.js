(() => {
	const DEFAULT_HTML_INPUT = `
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
		`.trim();
	const MAX_INDEX_LIST_TEXT_LENGTH = 100;
	const MIN_PANEL_WIDTH_FRACTION = 0.2;


	const textareaHTMLInput = document.querySelector("textarea[name='html-input']");
	const textareaHTMLOutput = document.querySelector("textarea[name='html-output']");
	const textareaIndexOutput = document.querySelector("textarea[name='index-output']");
	const inputFrame = document.querySelector("[data-frame='input']");
	const outputFrame = document.querySelector("[data-frame='output']");
	const canvas = document.querySelector("canvas#dom-relief");
	const domRelief = new DOMRelief.DOMRelief();

	const downsamplingInputs = {
		rE: document.querySelector("input[name='downsampling-rE']"),
		rA: document.querySelector("input[name='downsampling-rA']"),
		rT: document.querySelector("input[name='downsampling-rT']"),
		markdown: document.querySelector("input[name='downsampling-markdown']"),
		textRank: document.querySelector("input[name='downsampling-textrank']")
	};


	function formatNumber(num) {
		return num.toLocaleString("en-US", {
			maximumFractionDigits: 2
		});
	}

	function formatBytes(bytes) {
		return (bytes >= 2**10)
			? `${formatNumber(bytes / 2**10)} kB`
			: `${formatNumber(bytes)} B`;
	}

	function getDirectText(element) {
		return [ ...element.childNodes ]
			.filter(node => node.nodeType == Node.TEXT_NODE)
			.map(node => node.textContent.trim())
			.filter(Boolean)
			.join(" ");
	}

	function getDOMIndex(dom) {
		return [ ...dom.querySelectorAll("*") ]
			.map((element, i) => {
				const directText = getDirectText(element);
				const text = (directText.length > MAX_INDEX_LIST_TEXT_LENGTH)
					? `${directText.slice(0, MAX_INDEX_LIST_TEXT_LENGTH)}…`
					: directText;

				return `[${i}] ${element.tagName.toUpperCase()}${text ? ` "${text}"` : ""}`;
			})
			.join("\n");
	}

	function updateMeta(meta) {
		for(const [key, value] of Object.entries(meta)) {
			const span = document.querySelector(`#dom-results [data-key="${key}"]`);

			if(!span) continue;

			span.textContent = value;
		}
	}

	function renderResult(htmlInput, result) {
		const htmlOutput = result.html;

		textareaHTMLOutput.value = htmlOutput;
		textareaIndexOutput.value = getDOMIndex(result.dom);

		inputFrame.srcdoc = htmlInput;
		outputFrame.srcdoc = htmlOutput;

		domRelief.update({
			documents: [ htmlInput, htmlOutput ]
		});

		const [ originalDOMMeta, snapshotDOMMeta ] = domRelief.meta.documents;

		domRelief.update({
			layerThickness: Math.max(1, snapshotDOMMeta.nodes / 2500)
		});

		updateMeta({
			tokenEstimate: formatNumber(result.meta.tokenEstimate),
			sizeRatio: Math.round(result.meta.sizeRatio * 100),
			originalSize: formatBytes(result.meta.originalSize),
			snapshotSize: formatBytes(result.meta.snapshotSize),
			originalNodes: formatNumber(originalDOMMeta.nodes),
			snapshotNodes: formatNumber(snapshotDOMMeta.nodes)
		});
	}

	let updateId = 0;

	async function updateState() {
		const id = ++updateId;
		const htmlInput = textareaHTMLInput.value;

		const result = await D2Snap.d2Snap(
			htmlInput,
			parseFloat(downsamplingInputs.rE.value),
			parseFloat(downsamplingInputs.rA.value),
			parseFloat(downsamplingInputs.rT.value),
			{
				debug: true,
				skip: {
					markdown: !downsamplingInputs.markdown.checked,
					textRank: !downsamplingInputs.textRank.checked
				}
			}
		);

		if(id != updateId) return;

		renderResult(htmlInput, result);
	}


	function setupTabs() {
		document.querySelectorAll(".tabs")
			.forEach(tabs => {
				const buttons = [ ...tabs.querySelectorAll(".tabs-header > button") ];
				const tabViews = [ ...tabs.querySelectorAll(".tabs-body > *") ];

				function activateTab(index) {
					buttons.forEach((button, i) => {
						button.classList.toggle("active", i == index);
					});

					tabViews.forEach((tabView, i) => {
						tabView.classList.toggle("active", i == index);
					});
				}

				buttons.forEach((button, i) => {
					button.addEventListener("click", () => {
						activateTab(i);
					});
				});

				activateTab(0);
			});
	}

	function setupDownsamplingParams() {
		document.querySelectorAll("form[name='downsampling-params'] input")
			.forEach(input => {
				const output = document.querySelector(`output[for="${input.name}"]`);

				function updateOutput() {
					if(!output) return;

					output.textContent = parseFloat(input.value).toFixed(1);
				}

				updateOutput();

				input.addEventListener("input", () => {
					updateOutput();
					updateState();
				});
			});

		textareaHTMLInput.value ||= DEFAULT_HTML_INPUT;

		textareaHTMLInput.addEventListener("input", updateState);
	}

	function setupRelief() {
		canvas
			.addEventListener("mousedown", () => {
				domRelief.update({
					autoRotate: false
				});
			}, {
				once: true
			});

		document.querySelector("input[name='relief-flat']")
			?.addEventListener("change", e => {
				domRelief.update({
					orientation: e.target.checked ? "horizontal" : "vertical"
				});
			});

		document.querySelector("input[name='relief-ortho']")
			?.addEventListener("change", e => {
				domRelief.update({
					projection: e.target.checked ? "orthographic" : "perspective"
				});
			});

		domRelief.attach(canvas);
		domRelief.update({
			orientation: "vertical",
			background: "#383B3B",
			gridColor: "#080F0F",
			gap: 0.2,
			textNodes: true,
			autoRotate: true
		});
	}

	function setupResizers() {
		const panelContainer = document.querySelector("main");
		const panels = [ ...document.querySelectorAll(".panel") ];
		const resizers = [ ...document.querySelectorAll(".resizer") ];

		let fractions = panels.map(() => 1 / panels.length);

		function applyLayout() {
			panelContainer.style.gridTemplateColumns = fractions
				.map(f => `minmax(0, ${f}fr)`)
				.join(" var(--space-s) ");
		}

		function stopResizing(resizer, e) {
			if(resizer.hasPointerCapture(e.pointerId)) {
				resizer.releasePointerCapture(e.pointerId);
			}

			document.body.classList.remove("resizing");
		}

		applyLayout();

		resizers.forEach((resizer, i) => {
			let startX, startA, startB;

			resizer.addEventListener("pointerdown", e => {
				resizer.setPointerCapture(e.pointerId);

				document.body.classList.add("resizing");

				startX = e.clientX;
				startA = fractions[i];
				startB = fractions[i + 1];
			});

			resizer.addEventListener("pointermove", e => {
				if(!resizer.hasPointerCapture(e.pointerId)) return;

				const style = getComputedStyle(panelContainer);
				const resizerTotal = resizers.reduce((sum, r) => sum + r.offsetWidth, 0);
				const available = panelContainer.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - resizerTotal;

				if(available <= 0) return;

				const delta = (e.clientX - startX) / available;
				const pair = startA + startB;
				const min = Math.min(MIN_PANEL_WIDTH_FRACTION, pair / 2);
				const a = Math.min(Math.max(startA + delta, min), pair - min);

				fractions[i] = a;
				fractions[i + 1] = pair - a;

				applyLayout();
			});

			resizer.addEventListener("pointerup", e => {
				stopResizing(resizer, e);
			});

			resizer.addEventListener("pointercancel", e => {
				stopResizing(resizer, e);
			});
		});
	}


	setupTabs();
	setupDownsamplingParams();
	setupRelief();
	setupResizers();

	updateState();
})();