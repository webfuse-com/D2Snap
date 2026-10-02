import { tokenizeSentences, textRank, transformWithTextRank } from "../../dist.lib/TextRank.js";


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
            "An AI agent is a fundamental concept in artificial intelligence.",
            "At its core, an AI agent operates on a continuous cycle: sensors, processing, actuators.",
            "The environment itself can be physical, like",
            "a self-driving car navigating roads,",
            "or entirely digital."
        ],
        "Tokenization returns invalid results"
    );
});

await test("Apply sentence-based TextRank algorithm", async () => {
    const result = textRank(
        tokenizeSentences(`
            Amsterdam (AM-stər-dam, AM-stər-DAM; Dutch: [ˌɑmstərˈdɑm]; lit. 'Dam in the Amstel') is the capital and largest city of the Kingdom of the Netherlands.
            It has a population of 933,680 in June 2024 within the city proper, 1,457,018 in the urban area and 2,480,394 in the metropolitan area.
            Located in the Dutch province of North Holland, Amsterdam is colloquially referred to as the "Venice of the North", for its large number of canals, now a UNESCO World Heritage Site.

            Amsterdam was founded at the mouth of the Amstel River, which was dammed to control flooding.
            Originally a small fishing village in the 12th century, Amsterdam became a major world port during the Dutch Golden Age of the 17th century, when the Netherlands was an economic powerhouse.
            Amsterdam was the leading centre for finance and trade, as well as a hub of secular art production.
            In the 19th and 20th centuries, the city expanded and new neighborhoods and suburbs were built.
            The city has a long tradition of openness, liberalism, and tolerance.
            Cycling is key to the city's modern character, and there are numerous biking paths and lanes spread throughout.
        `)
    );

    assertEqual(
        result,
        [
            {
                sentence: "'Dam in the Amstel') is the capital and largest city of the Kingdom of the Netherlands.",
                index: 1,
                score: 1.3085387056658566
            },
            {
                sentence: 'Located in the Dutch province of North Holland, Amsterdam is colloquially referred to as the "Venice of the North", for its large number of canals, now a UNESCO World Heritage Site.',
                index: 3,
                score: 1.0651428062983799
            },
            {
                sentence: 'Originally a small fishing village in the 12th century, Amsterdam became a major world port during the Dutch Golden Age of the 17th century, when the Netherlands was an economic powerhouse.',
                index: 5,
                score: 1.0602500776063515
            },
            {
                sentence: 'It has a population of 933,680 in June 2024 within the city proper, 1,457,018 in the urban area and 2,480,394 in the metropolitan area.',
                index: 2,
                score: 1.039954223934244
            },
            {
                sentence: 'In the 19th and 20th centuries, the city expanded and new neighborhoods and suburbs were built.',
                index: 7,
                score: 1.0002090317095265
            },
            {
                sentence: 'The city has a long tradition of openness, liberalism, and tolerance.',
                index: 8,
                score: 0.9923258435118669
            },
            {
                sentence: 'Amsterdam was founded at the mouth of the Amstel River, which was dammed to control flooding.',
                index: 4,
                score: 0.9116083337789185
            },
            {
                sentence: 'Amsterdam was the leading centre for finance and trade, as well as a hub of secular art production.',
                index: 6,
                score: 0.859996644322821
            },
            {
                sentence: "Cycling is key to the city's modern character, and there are numerous biking paths and lanes spread throughout.",
                index: 9,
                score: 0.7619743331720354
            },
            {
                sentence: 'Amsterdam (AM-stər-dam, AM-stər-DAM; Dutch: [ˌɑmstərˈdɑm]; lit.',
                index: 0,
                score: 0.25
            }
        ],
        "TextRank returns invalid results"
    );
});

await test("Apply sentence-based TextRank algorithm (No-ASCII; Greek)", async () => {
    const result = textRank(
        tokenizeSentences(`
            Το Άμστερνταμ (ΑΜ-στερ-νταμ, ΑΜ-στερ-ΝΤΑΜ; ολλανδικά: [ˌɑmstərˈdɑm]; κυριολ. «Φράγμα στον Άμστελ») είναι η πρωτεύουσα και μεγαλύτερη πόλη του Βασιλείου των Κάτω Χωρών.
            Έχει πληθυσμό 933.680 κατοίκων τον Ιούνιο του 2024 εντός των ορίων της πόλης, 1.457.018 στην αστική περιοχή και 2.480.394 στη μητροπολιτική περιοχή.
            Βρίσκεται στην ολλανδική επαρχία της Βόρειας Ολλανδίας και το Άμστερνταμ αποκαλείται συχνά «Βενετία του Βορρά» λόγω του μεγάλου αριθμού καναλιών του, που σήμερα αποτελούν Μνημείο Παγκόσμιας Κληρονομιάς της UNESCO.

            Το Άμστερνταμ ιδρύθηκε στις εκβολές του ποταμού Άμστελ, ο οποίος φράχτηκε για τον έλεγχο των πλημμυρών.
            Αρχικά ένα μικρό ψαροχώρι τον 12ο αιώνα, το Άμστερνταμ έγινε σημαντικό παγκόσμιο λιμάνι κατά τη Χρυσή Εποχή της Ολλανδίας τον 17ο αιώνα, όταν οι Κάτω Χώρες ήταν οικονομική υπερδύναμη.
            Το Άμστερνταμ ήταν το κορυφαίο κέντρο χρηματοοικονομικών και εμπορίου, καθώς και κόμβος κοσμικής καλλιτεχνικής παραγωγής.
            Τον 19ο και τον 20ό αιώνα η πόλη επεκτάθηκε και χτίστηκαν νέες γειτονιές και προάστια.
            Η πόλη έχει μακρά παράδοση ανοιχτότητας, φιλελευθερισμού και ανεκτικότητας.
            Η ποδηλασία είναι βασικό στοιχείο του σύγχρονου χαρακτήρα της πόλης, και υπάρχουν πολυάριθμοι ποδηλατόδρομοι και λωρίδες σε όλη την έκτασή της.
        `)
    );

    assertEqual(
        result.map(entry => [ entry.index, entry.score ]),
        [
            [ 7, 1.4110297976031174 ],
            [ 6, 1.2388098483818795 ],
            [ 1, 1.1571690370630336 ],
            [ 9, 1.1474059347305205 ],
            [ 3, 1.0950614440750697 ],
            [ 4, 1.0262120010966904 ],
            [ 8, 0.9064268893793512 ],
            [ 2, 0.8875155164808664 ],
            [ 5, 0.6885843576069071 ],
            [ 0, 0.4417851735825624 ]
        ],
        "TextRank returns invalid results (No-ASCII)"
    );
});

await test("Summarize text via highlevel text transform algorithm (ratio = 0.6)", async () => {
    const summary = transformWithTextRank(`
        Amsterdam was founded at the mouth of the Amstel River, which was dammed to control flooding.
        Originally a small fishing village in the 12th century, Amsterdam became a major world port during the Dutch Golden Age of the 17th century, when the Netherlands was an economic powerhouse.
        Amsterdam was the leading centre for finance and trade, as well as a hub of secular art production.
    `, 0.6);

    assertEqual(
        summary,
        [
            "Amsterdam was founded at the mouth of the Amstel River, which was dammed to control flooding.",
            "Originally a small fishing village in the 12th century, Amsterdam became a major world port during the Dutch Golden Age of the 17th century, when the Netherlands was an economic powerhouse."
        ].join("\n"),
        "Text transform returns invalid results"
    );
});