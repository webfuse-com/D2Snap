export function formatHTML(html: string, indentSize: number = 2): string {
    const tokens = html
        .replace(/>\s+</g, "><")
        .trim()
        .split(/(<[^>]+>)/)
        .filter(token => token.trim().length);
    const indentChar = " ".repeat(indentSize);

    let indentLevel = 0;
    const formattedHtml: string[] = [];
    for(const token of tokens) {
        if(token.match(/^<\/\w/)) {
            indentLevel = Math.max(indentLevel - 1, 0);
            formattedHtml.push(indentChar.repeat(indentLevel) + token);

            continue;
        }
        if(token.match(/^<\w[^>]*[^\/]>$/)) {
            formattedHtml.push(indentChar.repeat(indentLevel) + token);
            indentLevel++;

            continue;
        }
        if(token.match(/^<[^>]+\/>$/)) {
            formattedHtml.push(indentChar.repeat(indentLevel) + token);

            continue;
        }
        if(token.match(/^<[^!]/)) {
            formattedHtml.push(indentChar.repeat(indentLevel) + token);

            continue;
        }

        formattedHtml.push(indentChar.repeat(indentLevel) + token.trim());
    }

    return formattedHtml
        .join("\n")
        .trim();
}