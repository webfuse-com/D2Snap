document
    .addEventListener("DOMContentLoaded", async() => {
        const dom = document.body ?? document.documentElement;
    
        const presentSnapshot = async (parameters = null, fnCb = null) => {
            const snapshot = !fnCb
                ? await D2Snap.d2Snap(
                    dom,
                    parameters.k, parameters.l, parameters.m,
                    { debug: true }
                )
                : await fnCb.call(null);

            console.log("-".repeat(25));
            console.log("D2Snap-downsampled DOM snapshot:");
            console.log(snapshot.parameters ?? parameters);
            console.log(snapshot.meta);
            console.log(snapshot.serializedHtml);
        };

        console.log("Raw DOM snapshot:\n", dom.outerHTML);

        const t0 = performance.now();

        await presentSnapshot({ k: 0.7, l: 0.7, m: 0.7 });
        await presentSnapshot({ k: 0.2, l: 0.4, m: 0.6 });
        await presentSnapshot(null, () => D2Snap.adaptiveD2Snap(
            dom,
            undefined, undefined, {
                debug: true,
                assignUniqueIDs: true
            })
        );

        console.debug(`... ${performance.now() - t0}ms`);
    });