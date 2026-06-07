#!/usr/bin/env node


import { JSDOM } from "jsdom";

import { d2Snap, adaptiveD2Snap } from "../dist.lib/api.js";


const chunks = [];

process.stdin.on("data", chunk => chunks.push(chunk));
process.stdin.on("end", async () => {
    try {
        const { html, config } = JSON.parse(Buffer.concat(chunks).toString());
        const { document } = new JSDOM(html).window;

        const options = {};

        const snapshot = config.maxTokens
            ? await adaptiveD2Snap(document, config.maxTokens, 5, options)
            : await d2Snap(document, ((config.rE === "Infinity") ? Infinity : config.rE), config.rA, config.rT, options);

        process.stdout.write(
            JSON.stringify({
                ok: true,
                html: snapshot.html,
                size: snapshot.meta.snapshotSize
            })
        );
    } catch (err) {
        process.stderr.write(`[D2Snap.bridge] ${err?.stack || err?.message}\n`);
        process.stdout.write(JSON.stringify({
            ok: false,
            error: err.message
        }));

        process.exit(1);
    }
});