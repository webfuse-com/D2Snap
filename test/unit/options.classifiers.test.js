import { isActionableElement, isTextElement } from "../../dist.lib/options.classifiers.js";


const MOCKED_ACTIONABLE_ELEMENT_TAG_NAMES = [
    "A",
    "BUTTON"
];

const MOCKED_ACTIONABLE_ELEMENT_ROLE_ATTRIBUTE_VALUES = [
    "button"
];


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
    return isActionableElement(element, {
        tagNames: MOCKED_ACTIONABLE_ELEMENT_TAG_NAMES,
        roleAttributeValues: MOCKED_ACTIONABLE_ELEMENT_ROLE_ATTRIBUTE_VALUES
    });
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

await test("Check element text formatting", () => {
    assertEqual(
        isTextElement(_mockElement("STRONG")),
        true,
        "Invalid is-text classification (default tag names)"
    );
    assertEqual(
        isTextElement(_mockElement("div")),
        false,
        "Invalid is-text classification (default tag names, negative)"
    );
    assertEqual(
        isTextElement(_mockElement("div"), {
            tagNames: [ "DIV" ]
        }),
        true,
        "Invalid is-text classification (custom tag names)"
    );
});

await test("Check element actionability (role property)", () => {
    // Role property without role attribute (e.g., element internals)
    const element = _mockElement("DIV");
    element.role = "button";

    assertEqual(
        isActionableElement(element),
        true,
        "Invalid is-actionable classification (role property)"
    );
});

await test("Check element actionability (shared settings list)", () => {
    // One array for both settings: tag names normalise to upper case, role values to lower case
    for(const firstLookup of [ "tag", "role" ]) {
        const names = [ "button", "x-widget" ];
        const settings = { tagNames: names, roleAttributeValues: names };
        const button = _mockElement("BUTTON");
        const roleButton = _mockElement("DIV", { role: "button" });
        const roleLink = _mockElement("SPAN", { role: "link" });
        const lookups = (firstLookup === "tag")
            ? [ [ "<button>", button ], [ "role=\"button\"", roleButton ] ]
            : [ [ "role=\"button\"", roleButton ], [ "<button>", button ] ];

        for(const [ label, element ] of lookups) {
            assertTrue(
                isActionableElement(element, settings),
                `Invalid actionability (shared list, ${firstLookup} lookup first): ${label}`
            );
        }
        assertTrue(
            !isActionableElement(roleLink, settings),
            `Invalid actionability (shared list, ${firstLookup} lookup first): role="link" is not listed`
        );
    }
});