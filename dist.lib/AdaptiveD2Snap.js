// src/util.dom.ts
function resolveRoot(node) {
  return node?.body ?? node?.documentElement ?? node;
}

// src/AdaptiveD2Snap.ts
function* generateHalton() {
  const halton = (index, base) => {
    let result = 0;
    let f = 1 / base;
    let i2 = index;
    while (i2 > 0) {
      result += f * (i2 % base);
      i2 = Math.floor(i2 / base);
      f /= base;
    }
    return result;
  };
  let i = 0;
  while (true) {
    i++;
    yield [
      halton(i, 7),
      halton(i, 3),
      halton(i, 3)
    ];
  }
}
async function adaptiveD2Snap(d2SnapFn, dom, maxTokens = 4096, maxIterations = 5, options = {}) {
  const S = (typeof dom !== "string" ? resolveRoot(dom).outerHTML : dom).length;
  const M = 1e6;
  let i = 0;
  let sCalc = S;
  let parameters, snapshot;
  const haltonGenerator = generateHalton();
  while (true) {
    const haltonPoint = haltonGenerator.next().value;
    const computeParam = (haltonValue) => Math.min(sCalc / M * haltonValue, 1);
    parameters = {
      rE: computeParam(haltonPoint[0]),
      rA: computeParam(haltonPoint[1]),
      rT: computeParam(haltonPoint[2])
    };
    snapshot = await d2SnapFn.call(null, dom, parameters.rE, parameters.rA, parameters.rT, options);
    sCalc = sCalc ** 1.125;
    if (snapshot.meta.tokenEstimate <= maxTokens)
      break;
    if (i++ === maxIterations)
      throw new RangeError("Unable to create snapshot below given token threshold");
  }
  return {
    ...snapshot,
    parameters: {
      ...parameters,
      adaptiveIterations: i
    }
  };
}
export {
  adaptiveD2Snap
};
