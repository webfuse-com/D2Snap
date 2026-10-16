import * as defaults from "../../dist.lib/constants.defaults.js";
import {
    ATTRIBUTE_SCORES,
    CLASSIFIERS,
    CLASSIFIER_SETTINGS,
    NORMALIZERS,
    NORMALIZER_SETTINGS,
    SENTENCE_RANKER,
    SENTENCE_RANKER_SETTINGS
} from "../../dist.lib/constants.defaults.js";
import { isActionableElement, isTextElement } from "../../dist.lib/options.classifiers.js";
import {
    filterAttributes,
    filterComments,
    filterDataUrls,
    filterNoiseElements,
    filterEmptyImages,
    normalizeIconClassesToImgs,
    normalizeTextLabelAttributesToContent,
    normalizeSvgsToImgs,
    assignUniqueIds
} from "../../dist.lib/options.normalizers.js";
import { textRank } from "../../dist.lib/options.sentenceRankers.js";
import { CONFIG } from "../../dist.lib/config.js";


await test("Verify default callbacks", () => {
    assertEqual(
        NORMALIZERS,
        [
            filterComments,
            filterNoiseElements,
            filterEmptyImages,
            normalizeSvgsToImgs,
            normalizeIconClassesToImgs,
            normalizeTextLabelAttributesToContent,
            filterAttributes,
            filterDataUrls
        ],
        "Invalid default normalizers (strict order)"
    );
    assertTrue(
        !NORMALIZERS.includes(assignUniqueIds),
        "Invalid default normalizers (unique IDs opt-in)"
    );
    assertEqual(
        CLASSIFIERS,
        {
            actionableElement: isActionableElement,
            textFormattingElement: isTextElement
        },
        "Invalid default classifiers"
    );
    assertTrue(
        SENTENCE_RANKER === textRank,
        "Invalid default sentence ranker"
    );
});

await test("Verify default callbacks namespace", () => {
    const callbackNames = Object.keys(defaults.normalizers);

    assertEqual(
        callbackNames,
        Object.keys(NORMALIZER_SETTINGS).sort(),
        "Invalid default normalizers namespace (callbacks vs. settings)"
    );
    assertTrue(
        NORMALIZERS.every(normalizer => Object.values(defaults.normalizers).includes(normalizer)),
        "Invalid default normalizers namespace (default list not covered)"
    );
    assertTrue(
        defaults.normalizers.assignUniqueIds === assignUniqueIds,
        "Invalid default normalizers namespace (opt-in callback missing)"
    );
});

await test("Verify default classifier callbacks namespace", () => {
    assertEqual(
        Object.keys(defaults.classifiers),
        Object.keys(CLASSIFIER_SETTINGS).sort(),
        "Invalid default classifiers namespace (callbacks vs. settings)"
    );
    assertTrue(
        Object.values(CLASSIFIERS).every(classifier => Object.values(defaults.classifiers).includes(classifier)),
        "Invalid default classifiers namespace (default classifiers not covered)"
    );
});

await test("Verify default sentence ranker callbacks namespace", () => {
    assertEqual(
        Object.keys(defaults.sentenceRankers),
        Object.keys(SENTENCE_RANKER_SETTINGS).sort(),
        "Invalid default sentence rankers namespace (callbacks vs. settings)"
    );
    assertTrue(
        Object.values(defaults.sentenceRankers).includes(SENTENCE_RANKER),
        "Invalid default sentence rankers namespace (default sentence ranker not covered)"
    );
});

await test("Verify default settings", () => {
    assertEqual(
        Object.keys(CLASSIFIER_SETTINGS),
        [
            "isActionableElement",
            "isTextElement"
        ],
        "Invalid default classifier settings"
    );
    assertEqual(
        Object.keys(NORMALIZER_SETTINGS),
        [
            "filterAttributes",
            "filterComments",
            "filterDataUrls",
            "filterNoiseElements",
            "filterEmptyImages",
            "normalizeIconClassesToImgs",
            "normalizeTextLabelAttributesToContent",
            "normalizeSvgsToImgs",
            "assignUniqueIds"
        ],
        "Invalid default normalizer settings"
    );
    assertEqual(
        NORMALIZER_SETTINGS.assignUniqueIds.attributeName,
        CONFIG.uniqueAttributeName,
        "Invalid default normalizer settings (unique ID attribute name)"
    );
    assertEqual(
        ATTRIBUTE_SCORES[CONFIG.uniqueAttributeName],
        1,
        "Invalid default attribute scores (unique ID attribute preserved)"
    );
});

await test("Freeze defaults", () => {
    for(const mutate of [
        () => NORMALIZERS.push(assignUniqueIds),
        () => { CLASSIFIERS.actionableElement = () => true; },
        () => { ATTRIBUTE_SCORES.href = 0; },
        () => CLASSIFIER_SETTINGS.isActionableElement.tagNames.push("DIV"),
        () => CLASSIFIER_SETTINGS.isActionableElement.roleAttributeValues.push("none"),
        () => NORMALIZER_SETTINGS.filterNoiseElements.tagNames.push("DIV"),
        () => { NORMALIZER_SETTINGS.normalizeSvgsToImgs.labelAttributeNames = []; },
        () => { NORMALIZER_SETTINGS.assignUniqueIds.attributeName = "data-x"; },
        () => { SENTENCE_RANKER_SETTINGS.textRank.damping = 0.5; },
        () => { SENTENCE_RANKER_SETTINGS.textRank = {}; }
    ]) {
        let isMutable = false;

        try {
            mutate();

            isMutable = true;
        } catch {}

        assertTrue(
            !isMutable,
            `Mutable default (${mutate.toString()})`
        );
    }
});