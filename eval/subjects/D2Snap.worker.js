import { workerData, parentPort } from "worker_threads";

import { runEvaluation } from "../eval.js";
import { INSTRUCTIONS_DOM, DOMInteractiveElementTarget,analyzeResultDOM } from "../eval.shared.js";
import { Logger } from "../Logger.js";

import { d2Snap, adaptiveD2Snap } from "../../dist.lib/api.js";


const D2Snap_CONFIG = {
    uniqueIDs: true
};
const LOGGER = new Logger("D2Snap-serialization");


export async function runWorkerEvaluation(identifier, config) {
    await runEvaluation(
        identifier,
        async (data, id) => {
            let downsampledDOMSnapshot;
            try {
                if(!config.maxTokens) {
                    downsampledDOMSnapshot = await d2Snap(data.originalDOM, config.rE, config.rA, config.rT, D2Snap_CONFIG);
                } else {
                    downsampledDOMSnapshot = await adaptiveD2Snap(data.originalDOM, config.maxTokens, 5, D2Snap_CONFIG);
                }
            } catch {
                return null;
            }

            LOGGER.write(`${id}.${identifier}`, downsampledDOMSnapshot.html);

            return [
                {
                    type: "text",
                    data: downsampledDOMSnapshot.html,
                    size: downsampledDOMSnapshot.meta.snapshotSize
                }
            ];
        },
        analyzeResultDOM,
        INSTRUCTIONS_DOM,
        DOMInteractiveElementTarget
    );
}


if(workerData?.identifier) {
    runWorkerEvaluation(workerData.identifier, workerData.config);

    parentPort.postMessage(true);
}