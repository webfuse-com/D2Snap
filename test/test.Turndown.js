import { KEEP_LINE_BREAK_MARK, turndown } from "../src/Turndown.ts";


function flattenCode(code) {
    return code
        .replace(/\n +/g, "\n")
        .trim();
}

await test("Translate markup to markdown via Turndown", async () => {
    const markdown = turndown(
        flattenCode(`
            <h1>Amsterdam</h1>
            <p>
                <strong>Amsterdam</strong> is the capital and largest city of the Kingdom of the Netherlands.
            <p>
            <blockquote>
                Amsterdam has a population of 933,680 in June 2024.
            </blockquote>
            <table>
                <tr>
                    <th>Landmark</th><th>District</th>
                </tr>
                <tr>
                    <td>Royal Palace</td><td>Centrum</td>
                </tr>
                <tr>
                    <td>Oude Kerk</td><td>Centrum</td>
                </tr>
                <tr>
                    <td>Rijksmuseum</td><td>Zuid</td>
                </tr>
            </table>
            <a href="#stats">Stats</a>
        `)
    )
        .replace(new RegExp(KEEP_LINE_BREAK_MARK, "g"), "\n")
        .trim();

    assertEqual(
        markdown,
        flattenCode(`
            # Amsterdam
            
            **Amsterdam** is the capital and largest city of the Kingdom of the Netherlands.
            
            > Amsterdam has a population of 933,680 in June 2024.
            
            | Landmark | District |
            | --- | --- |
            | Royal Palace | Centrum |
            | Oude Kerk | Centrum |
            | Rijksmuseum | Zuid |
            
            <a href="#stats">Stats</a>
        `),
        "Turndown returns invalid results"
    );
});