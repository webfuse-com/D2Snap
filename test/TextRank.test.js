import { tokenizeSentences, textRank, relativeTextRank } from "../dist.lib/TextRank.js";


await test("Tokenize sentences", async () => {
    const tokenization = tokenizeSentences(`
        An AI agent is a fundamental concept in artificial intelligence.
        At its core, an AI agent operates on a continuous cycle: sensors, processing, actuators.

        The environment itself can be physical, like
        a self-driving car navigating roads,
        or entirely digital.
    `, 3);

    assertEqual(
        tokenization,
        [
            "An AI agent is a fundamental concept in artificial intelligence",
            "At its core an AI agent operates on a continuous cycle",
            "sensors processing actuators",
            "The environment itself can be physical like",
            "a selfdriving car navigating roads",
            "or entirely digital"
        ],
        "TextRank returns invalid results"
    );
});

await test("Summarize text via TextRank sentence algorithm (k = 3)", async () => {
    const summary = textRank(`
        Amsterdam (AM-stər-dam, AM-stər-DAM; Dutch: [ˌɑmstərˈdɑm]; lit. 'Dam in the Amstel') is the capital and largest city of the Kingdom of the Netherlands.
        It has a population of 933,680 in June 2024 within the city proper, 1,457,018 in the urban area and 2,480,394 in the metropolitan area.
        Located in the Dutch province of North Holland, Amsterdam is colloquially referred to as the "Venice of the North", for its large number of canals, now a UNESCO World Heritage Site.

        Amsterdam was founded at the mouth of the Amstel River, which was dammed to control flooding.
        Originally a small fishing village in the 12th century, Amsterdam became a major world port during the Dutch Golden Age of the 17th century, when the Netherlands was an economic powerhouse.
        Amsterdam was the leading centre for finance and trade, as well as a hub of secular art production.
        In the 19th and 20th centuries, the city expanded and new neighborhoods and suburbs were built.
        The city has a long tradition of openness, liberalism, and tolerance.
        Cycling is key to the city's modern character, and there are numerous biking paths and lanes spread throughout.
    `, 3);

    assertEqual(
        summary,
        [
            "In the 19th and 20th centuries the city expanded and new neighborhoods and suburbs were built",
            "The city has a long tradition of openness liberalism and tolerance",
            "Cycling is key to the citys modern character and there are numerous biking paths and lanes spread throughout"
        ].join("\n"),
        "TextRank returns invalid results"
    );
});

await test("Summarize text via relative TextRank sentence algorithm (ratio = 0.6)", async () => {
    const summary = relativeTextRank(`
        Amsterdam was founded at the mouth of the Amstel River, which was dammed to control flooding.
        Originally a small fishing village in the 12th century, Amsterdam became a major world port during the Dutch Golden Age of the 17th century, when the Netherlands was an economic powerhouse.
        Amsterdam was the leading centre for finance and trade, as well as a hub of secular art production.
    `, 0.6);

    assertEqual(
        summary,
        [
            "Amsterdam was founded at the mouth of the Amstel River which was dammed to control flooding",
            "Originally a small fishing village in the 12th century Amsterdam became a major world port during the Dutch Golden Age of the 17th century when the Netherlands was an economic powerhouse"
        ].join("\n"),
        "TextRank returns invalid results"
    );
});