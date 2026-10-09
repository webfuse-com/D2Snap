import * as api from "../../dist.lib/api.js";


await test("Verify API", () => {
    assertEqual(
        Object.keys(api),
        [
            "adaptiveD2Snap",
            "d2Snap",
            "isActionableElement"
        ],
        "Invalid API declaration"
    );
});