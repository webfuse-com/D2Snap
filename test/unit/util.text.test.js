import { getByteLength, tokenizeSentences, transformWithRanking } from "../../dist.lib/util.text.js";


await test("Tokenize sentences", async () => {
    const tokenization = tokenizeSentences(`
        An AI agent is a fundamental concept in artificial intelligence.
        At its core, an AI agent operates on a continuous cycle: sensors, processing, actuators.

        The environment itself can be physical, like
        a self-driving car navigating roads,
        or entirely digital.
    `);

    assertEqual(
        tokenization,
        [
            "An AI agent is a fundamental concept in artificial intelligence.",
            "At its core, an AI agent operates on a continuous cycle: sensors, processing, actuators.",
            "The environment itself can be physical, like",
            "a self-driving car navigating roads,",
            "or entirely digital."
        ],
        "Tokenization returns invalid results"
    );
});

await test("Transform text via arbitrary sentence ranker", async () => {
    const text = "Pizza is Italian. Sushi is Japanese. Pizza is Italian. Tacos are Mexican.";
    const reverseRanker = sentences => [ ...sentences ].reverse();
    const identityRanker = sentences => sentences;

    assertEqual(
        transformWithRanking(text, 0.5, reverseRanker),
        [ "Pizza is Italian.", "Tacos are Mexican." ].join("\n"),
        "Text transform returns invalid results (top-ranked, original order, duplicates)"
    );
    assertEqual(
        transformWithRanking(text, 0.5, identityRanker),
        [ "Pizza is Italian.", "Sushi is Japanese." ].join("\n"),
        "Text transform returns invalid results (leading sentences)"
    );
    assertEqual(
        transformWithRanking(text, 0, identityRanker, true),
        "Pizza is Italian.",
        "Text transform returns invalid results (no empty)"
    );
});

await test("Transform text via arbitrary sentence ranker (edge cases)", async () => {
    const identityRanker = sentences => sentences;

    assertEqual(
        transformWithRanking("", 0.5, identityRanker, true),
        "",
        "Text transform returns invalid results (empty text)"
    );
    assertEqual(
        transformWithRanking("Only one burger.", 0.1, identityRanker),
        "Only one burger.",
        "Text transform returns invalid results (single sentence)"
    );
    assertEqual(
        transformWithRanking("Pizza.\rBurger.\nTaco.", 1, identityRanker),
        [ "Pizza.", "Burger.", "Taco." ].join("\n"),
        "Text transform returns invalid results (line breaks, full ratio)"
    );
});

await test("Get UTF-8 byte length", async () => {
    assertEqual(getByteLength(""), 0, "Invalid byte length (empty)");
    assertEqual(getByteLength("Fries"), 5, "Invalid byte length (ASCII)");
    assertEqual(getByteLength("Döner"), 6, "Invalid byte length (2-byte character)");
    assertEqual(getByteLength("🌯"), 4, "Invalid byte length (4-byte character, 2 UTF-16 code units)");
});