import { formatHTML } from "../dist.lib/util.html.js";
import { mergeJSONs } from "../dist.lib/util.json.js";


await test("Format HTML", async () => {
    const formattedHTML = formatHTML(
        `<h1>Amsterdam</h1><p><strong>Amsterdam</strong> is the capital and largest city of the Kingdom of the Netherlands.</p>`
    );

    assertEqual(
        formattedHTML,
        `
        <h1>
          Amsterdam
        </h1>
        <p>
          <strong>Amsterdam</strong> is the capital and largest city of the Kingdom of the Netherlands.
        </p>
        `
            .replace(/\n {8}/g, "\n")
            .trim(),
        "Incorrectly formatted HTML"
    );
});

await test("Merge JSONs", async () => {
    const mergedJSONs = mergeJSONs({
        group: "Pizza",
        number: 1,
        toppings: [ "Tomato", "Mozzarella"],
        info: {
            vegetarian: true
        }
    }, {
        number: 9,
        toppings: [ "Tomato", "Salami", "Ricotta" ],
        surcharge: true,
        info: {
            vegetarian: false,
            vegan: false
        }
    });

    assertEqual(
        mergedJSONs,
        {
            group: "Pizza",
            number: 9,
            toppings: [ "Tomato", "Mozzarella", "Salami", "Ricotta" ],
            surcharge: true,
            info: {
                vegetarian: false,
                vegan: false
            }
        },
        "Incorrectly merged JSONs"
    );
});