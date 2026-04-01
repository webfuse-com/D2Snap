import { existsSync, readdirSync } from "fs";
import { join } from "path";

import { parseOption, print } from "./eval.util.js";
import { Logger } from "./Logger.js";


const RESULTS_DATE = parseOption("--date");
if(!RESULTS_DATE)
    throw new ReferenceError(`Missing results directory date identifier`);

const RESULTS_DIR_PATH = join(import.meta.dirname, "results", RESULTS_DATE);
if(!existsSync(RESULTS_DIR_PATH))
    throw new ReferenceError(`Results do not exist '${RESULTS_DATE}'`);

const SUMMARY_FILENAME = "__summary.json";


const summary = {};
for(let resultsFileName of readdirSync(RESULTS_DIR_PATH)) {
    if(resultsFileName === SUMMARY_FILENAME) continue;

    const resultsFilePath = join(RESULTS_DIR_PATH, resultsFileName);
    const results = (await import(resultsFilePath, { with: { type: "json" } })).default;

    summary[resultsFileName] = {
        successCases: 0,
        failureCases: 0,
        errorCases: 0,
        successRate: 0.0,
        totalSnapshotSize: 0,
        totalEstimatedTokens: 0,
        totalRTT: 0
    };
    results
        .results
        .forEach(result => {
            summary[resultsFileName].successCases += +result.success;
            summary[resultsFileName].failureCases += +!result.success;
            summary[resultsFileName].errorCases += +result.error;
            summary[resultsFileName].totalSnapshotSize += +(result.snapshotSize ?? 0);
            summary[resultsFileName].totalEstimatedTokens += +(result.tokenEstimate ?? 0);
            summary[resultsFileName].totalRTT += +(result.rtt ?? 0);
        });

    const totalCases = summary[resultsFileName].successCases
        + summary[resultsFileName].failureCases;

    const mean = (key, ignoreErrors = true) => {
        return summary[resultsFileName][key]
            / (totalCases - (ignoreErrors ? summary[resultsFileName].errorCases : 0));
    };

    summary[resultsFileName].successRate = mean("successCases", false);
    summary[resultsFileName].errorRate = mean("errorCases", false);
    summary[resultsFileName].meanSnapshotSize = mean("totalSnapshotSize");
    summary[resultsFileName].meanEstimatedTokens = mean("totalEstimatedTokens");
    summary[resultsFileName].meanRTT = mean("totalRTT");
}

new Logger(join("..", "results", RESULTS_DATE), false)
    .write(SUMMARY_FILENAME, JSON.stringify(summary, null, 2));

print(`Summary written to ${RESULTS_DATE}/${SUMMARY_FILENAME}`, true);