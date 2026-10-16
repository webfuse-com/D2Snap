import * as api from "../../dist.lib/api.js";


await test("Verify API", () => {
    assertEqual(
        Object.keys(api),
        [
            "adaptiveD2Snap",
            "d2Snap",
            "defaults",
            "normalizeDOM"
        ],
        "Invalid API declaration"
    );
});

await test("Verify API namespaces", () => {
    assertEqual(
        Object.keys(api.defaults.classifiers),
        [
            "isActionableElement",
            "isTextElement"
        ],
        "Invalid API declaration (defaults.classifiers)"
    );
    assertEqual(
        Object.keys(api.defaults),
        [
            "ATTRIBUTE_SCORES",
            "CLASSIFIERS",
            "CLASSIFIER_SETTINGS",
            "NORMALIZERS",
            "NORMALIZER_SETTINGS",
            "SENTENCE_RANKER",
            "SENTENCE_RANKER_SETTINGS",
            "classifiers",
            "normalizers",
            "sentenceRankers"
        ],
        "Invalid API declaration (defaults)"
    );
    assertEqual(
        Object.keys(api.defaults.normalizers),
        [
            "assignUniqueIds",
            "filterAttributes",
            "filterComments",
            "filterDataUrls",
            "filterEmptyImages",
            "filterNoiseElements",
            "normalizeIconClassesToImgs",
            "normalizeSvgsToImgs",
            "normalizeTextLabelAttributesToContent"
        ],
        "Invalid API declaration (defaults.normalizers)"
    );
    assertEqual(
        Object.keys(api.defaults.sentenceRankers),
        [
            "textRank"
        ],
        "Invalid API declaration (defaults.sentenceRankers)"
    );
});