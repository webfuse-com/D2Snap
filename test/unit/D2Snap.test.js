import { isActionableElement } from "../../dist.lib/D2Snap.js";


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