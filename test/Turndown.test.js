import { Turndown } from "../dist.lib/Turndown.js";


function flattenCode(code) {
    return code
        .replace(/\n +/g, "\n")
        .trim();
}

const turndown = new Turndown([ "A", "BUTTON" ]);

await test("Translate markup to markdown via Turndown", async () => {
    const markdown = turndown.translate(`
        <h1>Amsterdam</h1>
        <p>
            <strong>Amsterdam</strong> is the capital and largest city of the Kingdom of the Netherlands.
        <p>
        <blockquote>
            Amsterdam has a population of 933,680 in June 2024.
        </blockquote>
        <h2 id="districts">District</h2>
        <div>
            <ul>
                <li>
                    Centrum <button onclick="info('centrum')"><i>i</i></button>
                </li>
                <li>Noord</li>
                <li>Zuid</li>
                <li>Oost</li>
                <li>West</li>
                <li>Zuidoost</li>
                <li>Niew-West</li>
            </ul>
        </div>
        <h2 id="landmarks">Landmarks</h2>
        <div>
            <div>
                <p>
                    Popular sights in Amsterdam...
                </p>
            </div>
        </div>
        <table>
            <tr>
                <th>Landmark</th>
                <th>District</th>
            </tr>
            <tr>
                <td>
                    <a href="/royal-palace.html">Royal Palace</a>
                </td>
                <td>Centrum</td>
            </tr>
            <tr>
                <td>Oude Kerk</td>
                <td>Centrum</td>
            </tr>
            <tr>
                <td>Rijksmuseum</td>
                <td>Zuid</td>
            </tr>
        </table>
        View <a href="#stats">Stats</a>
    `)
        .trim();

    assertEqual(
        flattenCode(markdown),
        flattenCode(`
            # Amsterdam

            **Amsterdam** is the capital and largest city of the Kingdom of the Netherlands.

            > Amsterdam has a population of 933,680 in June 2024.

            ## District

            -   Centrum <button onclick="info('centrum')"><i>i</i></button>
            -   Noord
            -   Zuid
            -   Oost
            -   West
            -   Zuidoost
            -   Niew-West

            ## Landmarks

            Popular sights in Amsterdam...

            | Landmark | District |
            | --- | --- |
            | <a href="/royal-palace.html">Royal Palace</a> | Centrum |
            | Oude Kerk | Centrum |
            | Rijksmuseum | Zuid |

            View <a href="#stats">Stats</a>
        `),
        "Turndown returns invalid results"
    );
});