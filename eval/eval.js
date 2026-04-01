import { readFileSync } from "fs";
import { join } from "path";

import { JSDOM } from "jsdom";

import { parseOption, print } from "./eval.util.js";
import { OpenAIAdapter, AnthropicAdapter } from "./LLMAdapter.js";
import { Logger } from "./Logger.js";


const DATASET = loadDataset();
const REFERENCE = await loadReference();
const { API_ADAPTER, PROVIDER, MODEL } = (() => {
    const provider = parseOption("--provider") ?? "openai";

    let model = parseOption("--model");
    let adapter;
    switch(provider) {
        case "openai":
            model = model ?? "gpt-4o";
            adapter = new OpenAIAdapter(
                model,
                process.env.OPENAI_API_KEY
            );

            break;
        case "anthropic":
            model = model ?? "claude-sonnet-4-20250514";
            adapter = new AnthropicAdapter(
                model,
                process.env.ANTHROPIC_API_KEY
            );

            break;
        default:
            throw new SyntaxError("Specify a valid model provider");
    }

    return {
        API_ADAPTER: adapter,
        PROVIDER: provider,
        MODEL: model
    }
})();


function loadDataset() {
    const raw = readFileSync(join(import.meta.dirname, "..", "dataset", "data.jsonl")).toString();
    return raw
        .split(/\n/g)
        .map(record => record.trim())
        .filter(record => !!record)
        .map(record => JSON.parse(record));
}

async function loadReference() {
    const reference = (await import(
        join(import.meta.dirname, "..", "dataset", "reference.json"), { with: { type: "json" } })
    ).default;
    return new Map(
        reference
            .map(record => [ record.id, record ])
    );
}


export async function runEvaluation(
    identifier,
    snapshotLoaderCb,
    analyzeResultsCb,
    instructions,
    outputSchema
) {
    print(`Evaluating '${identifier}'...`, true);

    const t0 = Date.now();
    const results = [];

    process.on("exit", () => {
        const dateID = new Date()
            .toLocaleString("nl")
            .split(/[^\d]+/g)
            .slice(0, -2)
            .join("-");
        new Logger(
            join("..", "results", dateID),
            false
        )
            .write(identifier.replace(/(\.json)?$/i, ".json"), JSON.stringify({
                endpoint: `${PROVIDER}: ${MODEL}`,
                date: new Date().toISOString(),
                results
            }, null, 2));
    });

    const abbrev = (str, limit = 100) => (str.length > limit) ? `${str.slice(0, limit)}${(str.length > limit) ? "…" : ""}` : str;

    const split = (parseOption("--split") ?? "0").split(",");
    const splitSize = parseInt(split[0]) || Infinity;
    const splitOffset = parseInt(split[1]) || 0;
    const splitOffsetEnd = Math.min(DATASET.length, splitSize + splitOffset);
    print(`Split ${splitOffset} - ${splitOffsetEnd}`);

    for(let i = splitOffset; i < splitOffsetEnd; i++) {
        const record = DATASET[i];
 
        const readGUISnapshot = dir => {
            const path = join(import.meta.dirname, "..", "dataset", dir, `${record.id}.png`);
            return {
                path,
                data: readFileSync(path)
            };
        };
        const readDOMSnapshot = () => {
            const raw = readFileSync(join(import.meta.dirname, "..", "dataset", "dom", `${record.id}.html`)).toString();

            const { document } = new JSDOM(raw).window;
        
            return document;
        };

        const rawSnapshots = {
            originalDOM: readDOMSnapshot(),
            originalGUI: readGUISnapshot("gui"),
            buGUI: readGUISnapshot("bu"),
            buTxt: readFileSync(join(import.meta.dirname, "..", "dataset", "bu", `${record.id}.txt`)).toString()
        };
        const snapshotData = await snapshotLoaderCb(rawSnapshots, record.id);
        if(!snapshotData) {
            results.push({
                id: record.id,
                success: false,
                error: true
            });

            continue;
        }

        const snapshotDataPrint = (
            snapshotData[0].path
            ?? snapshotData[0].data.replace(/\s+/g, " ")
        );
        print(`(${i}) ${record.url}`, true);
        print([
            record.task,
            abbrev(snapshotDataPrint, 500)
        ].join("\n"));

        let llmResponse;
        let autoAnalysisWasSuccessful = false;
        let rtt;
        try {
            const ti0 = performance.now();
            const res = await API_ADAPTER.request(
                instructions,
                record.task,
                snapshotData,
                outputSchema
            );
            rtt = performance.now() - ti0;

            llmResponse = res.interactiveElements;

            autoAnalysisWasSuccessful = await analyzeResultsCb(
                res.interactiveElements,
                REFERENCE.get(record.id).trajectories,
                rawSnapshots
        );
        } catch(err) {
            console.error(err);

            llmResponse = err?.message ?? "Error";
        }

        results.push({
            id: record.id,
            snapshotSize: snapshotData
                .reduce((acc, snapshot) => acc + snapshot.size, 0),
            tokenEstimate: snapshotData
                .reduce((acc, snapshot) => {
                    return acc + (snapshot.type !== "image")
                        ? Math.round(snapshot.size / 4)         // according to https://platform.openai.com/tokenizer
                        : Math.round(snapshot.size / (32**2));  // according to https://platform.openai.com/docs/guides/images-vision?api-mode=responses#calculating-costs
                }, 0),
            response: llmResponse,
            success: autoAnalysisWasSuccessful,
            error: false,
            rtt
        });
    }

    print(`...'${identifier}' done (${Math.round((Date.now() - t0) / 1000)}s).`, true);
}