import { textRank } from "../../dist.lib/options.sentenceRankers.js";
import { rankSentences } from "../../dist.lib/TextRank.js";


const SENTENCES = [
    "Burgers are popular.",
    "Fries are popular too.",
    "Burgers and fries are popular together.",
    "Ketchup is red."
];

await test("Rank sentences via TextRank (sentence ranker)", () => {
    assertEqual(
        textRank(SENTENCES),
        rankSentences(SENTENCES),
        "Invalid ranked sentences (default settings)"
    );
    assertEqual(
        [ ...textRank(SENTENCES) ].sort(),
        [ ...SENTENCES ].sort(),
        "Invalid ranked sentences (sentences lost or added)"
    );
    assertEqual(
        textRank([]),
        [],
        "Invalid ranked sentences (no sentences)"
    );
});

await test("Rank sentences via TextRank (settings)", () => {
    assertEqual(
        textRank(SENTENCES, { damping: 0.5 }),
        rankSentences(SENTENCES, { damping: 0.5 }),
        "Settings not passed to TextRank"
    );
});