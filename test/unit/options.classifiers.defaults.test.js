import { isActionableElement } from "../../dist.lib/options.classifiers.js";
import { CLASSIFIER_SETTINGS } from "../../dist.lib/constants.defaults.js";


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


await test("Check element actionability (defaults)", () => {
    assertEqual(
        isActionableElement(_mockElement("INPUT")),
        true,
        "Invalid is-actionable classification (default tag names)"
    );
    assertEqual(
        isActionableElement(_mockElement("DIV", {
            role: "Checkbox"
        })),
        true,
        "Invalid is-actionable classification (default role attribute values, case-insensitive)"
    );
    assertEqual(
        isActionableElement(_mockElement("X-ORDER-BUTTON"), {
            tagNames: [ ...CLASSIFIER_SETTINGS.isActionableElement.tagNames, "x-order-button" ]
        }),
        true,
        "Invalid is-actionable classification (extended default tag names)"
    );
    assertEqual(
        [ _mockElement("A"), _mockElement("DIV") ]
            .filter(isActionableElement)
            .map(element => element.tagName),
        [ "A" ],
        "Invalid is-actionable classification (array method callback)"
    );
});