import { runEvaluation } from "../eval.js";
import { INSTRUCTIONS_DOM, DOMInteractiveElementTarget, analyzeResultDOM } from "../eval.shared.js";


const MAX_SNAPSHOT_SIZE_TOKENS = 2**16;
const MAX_SNAPSHOT_SIZE_B = MAX_SNAPSHOT_SIZE_TOKENS * 4;


// NOTE: Cut-off at 'maximum' context length
runEvaluation(
    "dom",
    async (data) => {
        const domSnapshot = data.originalDOM
            .documentElement
            .outerHTML
            .split(/<\/head>/i)
            .pop()
            .slice(0, MAX_SNAPSHOT_SIZE_B);

        return [
            {
                type: "text",
                data: domSnapshot,
                size: domSnapshot.length
            }
        ];
    },
    analyzeResultDOM,
    INSTRUCTIONS_DOM,
    DOMInteractiveElementTarget
);