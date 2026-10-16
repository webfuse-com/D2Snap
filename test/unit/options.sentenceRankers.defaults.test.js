import { DEFAULT_SETTINGS } from "../../dist.lib/options.sentenceRankers/text-rank.js";
import { DEFAULT_SETTINGS as TEXT_RANK_DEFAULT_SETTINGS } from "../../dist.lib/TextRank.js";


await test("Freeze sentence ranker settings (defaults)", () => {
    assertEqual(
        DEFAULT_SETTINGS,
        TEXT_RANK_DEFAULT_SETTINGS,
        "Invalid default settings (not the TextRank defaults)"
    );
    assertEqual(
        { ...DEFAULT_SETTINGS },
        {
            damping: 0.75,
            maxIterations: 20,
            minSimilarity: 0.1,
            tolerance: 1e-4
        },
        "Invalid default settings"
    );
    assertTrue(Object.isFrozen(DEFAULT_SETTINGS), "Mutable default settings");
});