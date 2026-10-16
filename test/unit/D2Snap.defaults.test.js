import { getAttributeScore } from "../../dist.lib/D2Snap.js";


await test("Get attribute scores (defaults)", () => {
    assertEqual(
        getAttributeScore("HREF"),
        0.91,
        "Invalid retireved attribute score ('HREF'; default scores, case-insensitive)"
    );
    assertEqual(
        getAttributeScore("aria-expanded"),
        0.62,
        "Invalid retireved attribute score ('aria-expanded'; default scores, wildcard)"
    );
    assertEqual(
        getAttributeScore("data-unknown"),
        0,
        "Invalid retireved attribute score ('data-unknown'; default scores, fallback)"
    );
});