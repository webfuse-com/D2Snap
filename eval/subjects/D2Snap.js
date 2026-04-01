import { Worker } from "worker_threads";
import { join } from "path";

import { parseOption } from "../eval.util.js";


const EVALS = {
    "D2Snap.1": { rE: 0.1, rA: 0.1, rT: 0.1 },
    "D2Snap.4": { rE: 0.4, rA: 0.4, rT: 0.4 },
    "D2Snap.7": { rE: 0.7, rA: 0.7, rT: 0.7 },
    "D2Snap.3-9-6": { rE: 0.3, rA: 0.9, rT: 0.6 },
    "D2Snap.6-3-9": { rE: 0.6, rA: 0.3, rT: 0.9 },
    "D2Snap.9-6-3": { rE: 0.9, rA: 0.6, rT: 0.3 },
    "D2Snap.lin": { rE: Infinity, rA: 1, rT: 0 },
    "D2Snap.ada.4096": { maxTokens: 4096 },
    "D2Snap.ada.8192": { maxTokens: 8192 },
    "D2Snap.ada.32768": { maxTokens: 32768 }
};


function runEvaluationInWorker(identifier, config) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(join(import.meta.dirname, "D2Snap.worker.js"), {
            argv: process.argv,
            workerData: {
                identifier,
                config
            }
        });

        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", code => {
            code
                ? reject(new Error(`Worker stopped with exit code ${code}`))
                : resolve();
        });
    });
}


const singleConfig = parseOption("--config");
if(singleConfig) {
    const ev = EVALS[singleConfig];
    if(!ev) throw new ReferenceError("Undefined configuration");

    await runEvaluationInWorker(singleConfig, ev);
} else {
    await Promise.all(
        Object.entries(EVALS)
            .map(ev => {
                return runEvaluationInWorker.apply(null, ev);
            })
    );
}