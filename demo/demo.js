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
	const LARGE_INPUT_SIZE_THRESHOLD = 100 * 2**10;	// 100 kB
	const FRAME_CONTENT_SECURITY_POLICY = "default-src 'none'; img-src * data: blob:";
	const TOOLTIP_OFFSET = 5;
	const TOOLTIP_SHOW_TIMEOUT_MS = 200;
	const TOOLTIP_HIDE_TIMEOUT_MS = 150;
	const SCREEN_S_MEDIA_QUERY = "(max-width: 920px)";

	const textareaHTMLInput = document.querySelector("textarea[name='html-input']");
	const textareaHTMLOutput = document.querySelector("textarea[name='html-output']");
	const textareaA11yTreeOutput = document.querySelector("textarea[name='a11y-tree-output']");
	const textareaIndexOutput = document.querySelector("textarea[name='index-output']");
	const textareaIndexJSONOutput = document.querySelector("textarea[name='index-json-output']");
	const outputTextareas = [
		textareaHTMLOutput,
		textareaA11yTreeOutput,
		textareaIndexOutput,
		textareaIndexJSONOutput
	];
	const adaptiveParametersElement = document.querySelector("[data-adaptive-parameters]");
	const exportButton = document.querySelector("button[data-export]");
	const outputTabs = textareaHTMLOutput.closest(".tabs");
	const inputFrame = document.querySelector("[data-frame='input']");
	const outputFrame = document.querySelector("[data-frame='output']");
	const canvas = document.querySelector("canvas#dom-relief");
	const panelContainer = document.querySelector("main");
	const panels = [ ...document.querySelectorAll(".panel") ];
	const resizers = [ ...document.querySelectorAll(".resizer") ];
	const tabs = [ ...document.querySelectorAll(".tabs") ];
	const metaElements = Object.fromEntries(
		[ ...document.querySelectorAll("#dom-results [data-key]") ]
			.map(element => [ element.dataset.key, element ])
	);
	const parameterOutputs = Object.fromEntries(
		[ ...document.querySelectorAll("form[name='downsampling-params'] output") ]
			.map(output => [ output.htmlFor, output ])
	);
	const snapshotButtons = [ ...document.querySelectorAll("button[data-snapshot]") ];
	const copyButtons = [ ...document.querySelectorAll("button[data-copy]") ];
	const clearButtons = [ ...document.querySelectorAll("button[data-clear]") ];
	const closeButtons = [ ...document.querySelectorAll("button[data-close]") ];
	const ratioButtons = [ ...document.querySelectorAll("button[data-ratios]") ];
	const tooltips = [ ...document.querySelectorAll(".tooltip") ];
	const parameterTabButtons = [ ...document.querySelectorAll("form[name='downsampling-params'] .tabs-header > button") ];
	const downsamplingInputs = {
		rE: document.querySelector("input[name='downsampling-rE']"),
		rA: document.querySelector("input[name='downsampling-rA']"),
		rT: document.querySelector("input[name='downsampling-rT']"),
		markdown: document.querySelector("input[name='downsampling-markdown']"),
		normalizers: document.querySelector("input[name='downsampling-normalizers']"),
		prose: document.querySelector("input[name='downsampling-prose']"),
		textRanker: document.querySelector("input[name='downsampling-text-ranker']"),
		uniqueIDs: document.querySelector("input[name='downsampling-unique-ids']"),
		maxTokens: document.querySelector("input[name='downsampling-max-tokens']"),
		maxIterations: document.querySelector("input[name='downsampling-max-iterations']")
	};
	const reliefInputs = {
		flat: document.querySelector("input[name='relief-flat']"),
		ortho: document.querySelector("input[name='relief-ortho']")
	};

	const domRelief = new DOMRelief.DOMRelief();

	const state = {
		isConstraintsMode: false,
		originalSize: 0,
		updateCount: 0
	};


	const isActionableOrTextElement = element => {
		return D2Snap.defaults.classifiers.isActionableElement(element)
			|| D2Snap.defaults.classifiers.isTextElement(element);
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

	function getTruncatedDirectText(element) {
		const directText = getDirectText(element);

		return (directText.length > MAX_INDEX_LIST_TEXT_LENGTH)
			? `${directText.slice(0, MAX_INDEX_LIST_TEXT_LENGTH)}…`
			: directText;
	}

	function getAccessibilityTreeRepresentation(dom) {
		const tree = new AccessibilityTree(dom)
			.build()
			.toString({
				collapseEmptyProperties: true,
				sourceStringCb: element => element.getAttribute?.("data-uid") || undefined
			});

		const renameSourceToUID = ({
			source,
			children,
			...node
		}) => {
			return {
				...node,
				...((source !== undefined) ? { uid: source } : {}),
				...(children ? { children: children.map(renameSourceToUID) } : {})
			};
		};

		return jsyaml.dump(renameSourceToUID(JSON.parse(tree)), {
			lineWidth: -1
		});
	}

	function getIndexJSONRepresentation(dom) {
		return JSON.stringify(
			[ ...dom.querySelectorAll("*") ]
				.map(element => {
					const text = getDirectText(element);
					const uid = element.getAttribute("data-uid");
					const role = element.getAttribute("role");

					return {
						tagName: element.tagName.toUpperCase(),

						...(text ? { text } : {}),
						...(uid ? { uid } : {}),
						...(role ? { role } : {})
					};
				}),
			null,
			2
		);
	}

	function getIndexListRepresentation(dom) {
		return [ ...dom.querySelectorAll("*") ]
			.map((element, i) => {
				const uid = element.getAttribute("data-uid");
				const text = getTruncatedDirectText(element);

				return `[${uid ?? i}] ${element.tagName.toUpperCase()}${text ? ` "${text}"` : ""}`;
			})
			.join("\n");
	}

	function getAPICallSnippet() {
		const args = state.isConstraintsMode
			? [
				`${parseInt(downsamplingInputs.maxTokens.value)}, // maxTokens`,
				`${parseInt(downsamplingInputs.maxIterations.value)}, // maxIterations`
			]
			: [
				`${parseFloat(downsamplingInputs.rE.value)}, // rE`,
				`${parseFloat(downsamplingInputs.rA.value)}, // rA`,
				`${parseFloat(downsamplingInputs.rT.value)}, // rT`,
			];
		const options = [
			[ "markdown", downsamplingInputs.markdown.checked, true ],
			[ "prose", downsamplingInputs.prose.checked, false ],
			[ "filterEmptyElements", downsamplingInputs.normalizers.checked, true ],
			[ "uniqueIDs", downsamplingInputs.uniqueIDs.checked, false ],
			[ "normalizers", downsamplingInputs.normalizers.checked, true, "D2Snap.defaults.NORMALIZERS", "[]" ],
			[ "sentenceRanker", downsamplingInputs.textRanker.checked, true, "D2Snap.defaults.SENTENCE_RANKER", "null" ]
		]
			.filter(([ , checked, isDefaultChecked ]) => checked !== isDefaultChecked)
			.map(([ key, checked, , checkedValue = "true", uncheckedValue = "false" ]) => `${key}: ${checked ? checkedValue : uncheckedValue}`);

		const indent = " ".repeat(2);
		return [
			`await D2Snap.${state.isConstraintsMode ? "adaptiveD2Snap" : "d2Snap"}(`,
			`${indent}input,`,
			...args
				.map(arg => `${indent}${arg}`),
			...(options.length
				? [
					`${indent}{`,
					options
						.map(option => `${indent.repeat(2)}${option}`)
						.join(",\n"),
					`${indent}}`
				]
				: []),
			");"
		].join("\n");
	}

	function renderResult3D(htmlInput, htmlOutput) {
		domRelief.update({
			documents: [ htmlInput, htmlOutput ]
		});

		const [ originalDOMMeta, snapshotDOMMeta ] = domRelief.meta.documents;

		domRelief.update({
			layerThickness: Math.max(1, snapshotDOMMeta.nodes / 2500)
		});

		updateMeta({
			originalNodes: formatNumber(originalDOMMeta.nodes),
			snapshotNodes: formatNumber(snapshotDOMMeta.nodes)
		});

		updateSizeMeta();
	}

	function renderResultFrames(htmlInput, result) {
		const createFrameDocument = html => {
			return `
				<meta http-equiv="Content-Security-Policy" content="${FRAME_CONTENT_SECURITY_POLICY}">
				${html}
			`;
		};

		if(htmlInput !== null) {
			inputFrame.srcdoc = createFrameDocument(htmlInput);
		}
		if(result !== null) {
			outputFrame.srcdoc = createFrameDocument(result.outerHTML);
		}
	}

	function updateMeta(meta) {
		for(const [key, value] of Object.entries(meta)) {
			const span = metaElements[key];

			if(!span) continue;

			span.textContent = value;
		}
	}

	function updateSizeMeta() {
		const textarea = outputTabs.querySelector(".tabs-body > .active textarea");

		if(!textarea || !state.originalSize) return;

		const size = textarea.value.length;

		updateMeta({
			tokenEstimate: formatNumber(Math.round(size / 4)),
			sizeRatio: Math.round(size / state.originalSize * 100),
			originalSize: formatBytes(state.originalSize),
			snapshotSize: formatBytes(size)
		});
	}

	async function updateState() {
		const id = ++state.updateCount;
		const htmlInput = textareaHTMLInput.value;

		const options = {
			debug: true,
			minify: false,	// Input is minified and formatted upon paste
			filterEmptyElements: downsamplingInputs.normalizers.checked,
			markdown: downsamplingInputs.markdown.checked,
			prose: downsamplingInputs.prose.checked,
			uniqueIDs: downsamplingInputs.uniqueIDs.checked,
			normalizers: downsamplingInputs.normalizers.checked
				? D2Snap.defaults.NORMALIZERS
				: [],
			sentenceRanker: downsamplingInputs.textRanker.checked
				? D2Snap.defaults.SENTENCE_RANKER
				: null
		};

		const { isConstraintsMode } = state;

		let result;
		let ratios;

		const start = performance.now();
		try {
			if(isConstraintsMode) {
				result = await D2Snap.adaptiveD2Snap(
					htmlInput,
					parseInt(downsamplingInputs.maxTokens.value),
					parseInt(downsamplingInputs.maxIterations.value),
					options
				);

				ratios = result.parameters;
			} else {
				const rE = parseFloat(downsamplingInputs.rE.value);
				const rA = parseFloat(downsamplingInputs.rA.value);
				const rT = parseFloat(downsamplingInputs.rT.value);

				result = await D2Snap.d2Snap(
					htmlInput,
					rE, rA, rT,
					options
				);

				ratios = { rE, rA, rT };
			}
		} catch(err) {
			if(id != state.updateCount) return;

			outputTextareas.forEach(textarea => {
				textarea.value = err;

				textarea.classList.add("error");
			});

			adaptiveParametersElement.textContent = "";

			return;
		}

		outputTextareas.forEach(textarea => {
			textarea.classList.remove("error");
		});

		const duration = performance.now() - start;
		const resultPreservedTextFormattingElements = await D2Snap.d2Snap(
			htmlInput,
			ratios.rE, ratios.rA, ratios.rT,
			{
				...options,

				classifiers: {
					actionableElement: isActionableOrTextElement
				}
			}
		);

		if(id != state.updateCount) return;

		adaptiveParametersElement.textContent = isConstraintsMode
			? [
				[
					`rE = ${ratios.rE.toFixed(1)}`,
					`rA = ${ratios.rA.toFixed(1)}`,
					`rT = ${ratios.rT.toFixed(1)}`
				].join(" · "),
				`(${result.adaptiveIterations} iteration${(result.adaptiveIterations > 1) ? "s" : ""})`
			].join(" ")
			: "";

		textareaHTMLOutput.value = result.html;
		textareaA11yTreeOutput.value = getAccessibilityTreeRepresentation(result.dom);
		textareaIndexOutput.value = getIndexListRepresentation(result.dom);
		textareaIndexJSONOutput.value = getIndexJSONRepresentation(result.dom);

		renderResult3D(htmlInput, result.html);
		renderResultFrames(null, resultPreservedTextFormattingElements);

		state.originalSize = result.meta.originalSize;

		updateMeta({
			duration: formatNumber(Math.round(duration))
		});

		updateSizeMeta();
	}


	function setupIframes() {
		for(const iframe of  [ inputFrame, outputFrame ]) {
			iframe
				.addEventListener("load", () => {
					const sheet = new iframe.contentWindow.CSSStyleSheet();

					sheet.replaceSync(`
						html { font-size: 9px; }
						button, input, select, textarea { font-size: inherit; }
					`);

					iframe.contentDocument.adoptedStyleSheets = [ sheet ];
				});
		}
	}

	function setupTabs() {
		tabs
			.map(tabs => ({
				buttons: [ ...tabs.querySelectorAll(".tabs-header > button") ],
				tabViews: [ ...tabs.querySelectorAll(".tabs-body > *") ]
			}))
			.forEach(({ buttons, tabViews }) => {
				const activateTab = index => {
					buttons
						.forEach((button, i) => {
							button.classList.toggle("active", i == index);
						});
					tabViews
						.forEach((tabView, i) => {
							tabView.classList.toggle("active", i == index);
						});
				};

				buttons.forEach((button, i) => {
					button
						.addEventListener("click", () => {
							activateTab(i);
						});
				});

				activateTab(0);
			});
	}

	function setupSizeMeta() {
		outputTabs.querySelectorAll(".tabs-header > button")
			.forEach(button => {
				button.addEventListener("click", updateSizeMeta);
			});
	}

	function setupCopyButtons() {
		copyButtons
			.forEach(button => {
				const textarea = document.querySelector(`textarea[name='${button.dataset.copy}']`);
				const label = button.textContent;

				button
					.addEventListener("click", async () => {
						await navigator.clipboard.writeText(textarea.value);

						button.textContent = "Copied";

						setTimeout(() => {
							button.textContent = label;
						}, 1500);
					});
			});
	}

	function setupClearButtons() {
		clearButtons
			.forEach(button => {
				const textarea = document.querySelector(`textarea[name='${button.dataset.clear}']`);

				button
					.addEventListener("click", () => {
						textarea.value = "";

						textarea.focus();
						textarea.dispatchEvent(new Event("input"));
					});
			});
	}

	function setupCloseButtons() {
		closeButtons
			.forEach(button => {
				button
					.addEventListener("click", () => {
						button.parentElement.classList.add("hide");
				});
			});
	}

	async function normalizeInput() {
		const { html } = await D2Snap.d2Snap(
			textareaHTMLInput.value,
			0, 0, 0,
			{
				debug: true,
				filterEmptyElements: false,
				markdown: false,
				normalizers: [],
				sentenceRanker: null
			}
		);

		textareaHTMLInput.value = html;
	}

	function setupRatioSliders() {
		const isDeferredUpdate = input => {
			return [ "range", "number" ].includes(input.type)
				&& textareaHTMLInput.value.length > LARGE_INPUT_SIZE_THRESHOLD;
		};

		Object.values(downsamplingInputs)
			.forEach(input => {
				const output = parameterOutputs[input.name];

				const updateOutput = () => {
					if(!output) return;

					output.textContent = parseFloat(input.value).toFixed(1);
				};

				updateOutput();

				input
					.addEventListener("input", () => {
						updateOutput();

						if(isDeferredUpdate(input)) return;

						updateState();
					});
				input
					.addEventListener("change", () => {
						if(!isDeferredUpdate(input)) return;

						updateState();
					});
			});

		textareaHTMLInput.addEventListener("input", async e => {
			(e.inputType === "insertFromPaste")
				&& await normalizeInput();

			renderResultFrames(textareaHTMLInput.value, null);

			updateState();
		});
	}

	function setupRatioButtons() {
		ratioButtons
			.forEach(button => {
				button
					.addEventListener("click", () => {
						const value = parseFloat(button.dataset.ratios);

						[ downsamplingInputs.rE, downsamplingInputs.rA, downsamplingInputs.rT ]
							.forEach(input => {
								input.value = value;
								parameterOutputs[input.name].textContent = value.toFixed(1);
							});

						updateState();
					});
			});
	}

	function setupConstraints() {
		parameterTabButtons
			.forEach((button, i) => {
				button
					.addEventListener("click", () => {
						state.isConstraintsMode = (i == 1);

						updateState();
					});
			});
	}

	function setupExportButton() {
		const label = exportButton.textContent;

		exportButton
			.addEventListener("click", async () => {
				await navigator.clipboard.writeText(getAPICallSnippet());

				exportButton.textContent = "Copied";

				setTimeout(() => {
					exportButton.textContent = label;
				}, 1500);
			});
	}

	function setupSnapshots() {
		snapshotButtons
			.forEach(button => {
				const snapshot = window.SNAPSHOTS?.[button.dataset.snapshot];

				button
					.addEventListener("click", async () => {
						textareaHTMLInput.value = snapshot;

						await normalizeInput();

						renderResultFrames(textareaHTMLInput.value, null);

						updateState();
					});
			});
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

		reliefInputs.flat
			?.addEventListener("change", e => {
				domRelief.update({
					orientation: e.target.checked ? "horizontal" : "vertical"
				});
			});

		reliefInputs.ortho
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

	function setupTooltips() {
		tooltips
			.forEach(tooltip => {
				const content = tooltip.querySelector(".tooltip-content");

				let timeout;

				const show = (delay = 0) => {
					clearTimeout(timeout);

					if(content.matches(":popover-open")) return;

					timeout = setTimeout(() => {
						const isScreenS = matchMedia(SCREEN_S_MEDIA_QUERY).matches;

						content.style.width = isScreenS
							? `${document.documentElement.clientWidth - 2 * TOOLTIP_OFFSET}px`
							: "";
						content.style.maxWidth = isScreenS
							? "none"
							: "";

						content.showPopover();

						const rect = tooltip.getBoundingClientRect();
						const top = Math.min(rect.top, innerHeight - TOOLTIP_OFFSET - content.offsetHeight);
						const left = isScreenS
							? TOOLTIP_OFFSET
							: (rect.right + TOOLTIP_OFFSET + content.offsetWidth > innerWidth)
								? rect.left - TOOLTIP_OFFSET - content.offsetWidth
								: rect.right + TOOLTIP_OFFSET;

						content.style.top = `${Math.max(TOOLTIP_OFFSET, top)}px`;
						content.style.left = `${Math.max(TOOLTIP_OFFSET, left)}px`;
					}, delay);
				};

				const hide = (delay = 0) => {
					clearTimeout(timeout);

					timeout = setTimeout(() => {
						content.matches(":popover-open")
							&& content.hidePopover();
					}, delay);
				};

				tooltip
					.addEventListener("pointerenter", e => {
						if(e.pointerType !== "mouse") return;

						show(TOOLTIP_SHOW_TIMEOUT_MS);
					});
				tooltip
					.addEventListener("pointerleave", e => {
						if(e.pointerType !== "mouse") return;

						hide(TOOLTIP_HIDE_TIMEOUT_MS);
					});
				tooltip
					.addEventListener("pointerup", e => {
						if(e.pointerType === "mouse" || content.contains(e.target)) return;

						content.matches(":popover-open")
							? hide()
							: show();
					});
				document
					.addEventListener("pointerdown", e => {
						if(e.pointerType === "mouse" || tooltip.contains(e.target)) return;

						hide();
					});
			});
	}

	function setupResizers() {
		let fractions = panels.map(() => 1 / panels.length);

		const applyLayout = () => {
			panelContainer.style.gridTemplateColumns = fractions
				.map(f => `minmax(0, ${f}fr)`)
				.join(" var(--space-s) ");
		};

		const stopResizing = (resizer, e) => {
			if(resizer.hasPointerCapture(e.pointerId)) {
				resizer.releasePointerCapture(e.pointerId);
			}

			document.body.classList.remove("resizing");
		};

		applyLayout();

		resizers
			.forEach((resizer, i) => {
				let startX, startA, startB;

				resizer
					.addEventListener("pointerdown", e => {
						resizer.setPointerCapture(e.pointerId);

						document.body.classList.add("resizing");

						startX = e.clientX;
						startA = fractions[i];
						startB = fractions[i + 1];
					});

				resizer
					.addEventListener("pointermove", e => {
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

				resizer
					.addEventListener("pointerup", e => {
						stopResizing(resizer, e);
					});
				resizer
					.addEventListener("pointercancel", e => {
						stopResizing(resizer, e);
					});
			});
	}


	setupTabs();
	setupCopyButtons();
	setupClearButtons();
	setupCloseButtons();
	setupRatioSliders();
	setupRatioButtons();
	setupConstraints();
	setupExportButton();
	setupSnapshots();
	setupSizeMeta();
	setupRelief();
	setupIframes();
	setupTooltips();
	setupResizers();

	textareaHTMLInput.value ||= DEFAULT_HTML_INPUT;

	normalizeInput()
		.then(() => {
			renderResultFrames(textareaHTMLInput.value, null);

			updateState();
		})
		.finally(() => {
			document.body
				.classList
				.add("ready");
		});
})();