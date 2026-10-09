import { getAttributeScore, isActionableElement } from "../../dist.lib/D2Snap.js";


const MOCKED_ACTIONABLE_ELEMENT_TAG_NAMES = new Set([
    "A",
    "BUTTON"
]);

const MOCKED_ACTIONABLE_ELEMENT_ROLE_ATTRIBUTE_VALUES = new Set([
    "button"
]);


const _mockGetAttribute = (name, attrsDict = {}) => {
    return attrsDict[name];
};

const _mockElement = (tagName, attrsDict = {}) => {
    return {
        tagName,
        getAttribute(name) {
            return _mockGetAttribute(name, attrsDict);
        }
    };
};

const _wrapIsActionableElement = element => {
    return isActionableElement(
        element,
        MOCKED_ACTIONABLE_ELEMENT_TAG_NAMES,
        MOCKED_ACTIONABLE_ELEMENT_ROLE_ATTRIBUTE_VALUES
    );
};


await test("Get attribute scores", () => {
    // Disjunction checks
    const attributeScores = new Map(
        Object.entries({
            "test": 1,
            "data-override-1": 0.3,
            "data-*": 0.7,
            "data-override-2": 0.4,
            "aria-label": 0.4,
            "*": 0.2
        })
            .map(entry => [ entry[0].toLowerCase(), entry[1] ])
    );

    assertEqual(
        getAttributeScore("test", attributeScores),
        1,
        "Invalid retireved attribute score ('test')"
    );
    assertEqual(
        getAttributeScore("data-test", attributeScores),
        0.7,
        "Invalid retireved attribute score ('data-test'; specified wildcard)"
    );
    assertEqual(
        getAttributeScore("aria-label", attributeScores),
        0.4,
        "Invalid retireved attribute score ('aria-label')"
    );
    assertEqual(
        getAttributeScore("aria-test", attributeScores),
        0.2,
        "Invalid retireved attribute score ('data-test'; unspecified wildcard, default)"
    );
    assertEqual(
        getAttributeScore("test-test", attributeScores),
        0.2,
        "Invalid retireved attribute score ('test-test'; default)"
    );
    assertEqual(
        getAttributeScore("data-override-1", attributeScores),
        0.3,
        "Invalid retireved attribute score ('data-override-1')"
    );
    assertEqual(
        getAttributeScore("data-override-2", attributeScores),
        0.4,
        "Invalid retireved attribute score ('data-override-1')"
    );
});

await test("Check element actionability", () => {
    // Disjunction checks

    assertEqual(
        _wrapIsActionableElement(_mockElement("BUTTON", {
            role: "button"
        })),
        true,
        "Invalid is-actionable classification (true axes: [1, 1])"
    );
    assertEqual(
        _wrapIsActionableElement(_mockElement("BUTTON", {
            role: "static"
        })),
        true,
        "Invalid is-actionable classification (true axes: [1, 0 (explicit)])"
    );
    assertEqual(
        _wrapIsActionableElement(_mockElement("A")),
        true,
        "Invalid is-actionable classification (true axes: [1, 0 (implicit)])"
    );
    assertEqual(
        _wrapIsActionableElement(_mockElement("DIV", {
            role: "button"
        })),
        true,
        "Invalid is-actionable classification (true axex: [0, 1])"
    );
    assertEqual(
        _wrapIsActionableElement(_mockElement("SECTION", {
            role: "static"
        })),
        false,
        "Invalid is-actionable classification (true axes: [0, 0 (explicit)])"
    );
    assertEqual(
        _wrapIsActionableElement(_mockElement("section")),
        false,
        "Invalid is-actionable classification (true axes: [0, 0 (implicit)])"
    );
});