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
      halton(i, 2),
      halton(i, 3),
      halton(i, 5)
    ];
  }
}
function adaptiveD2Snap(d2SnapFn, dom, maxTokens = 4096, maxIterations = 5, options = {}) {
  const haltonGenerator = generateHalton();
  const parameters = {
    rE: 0,
    rA: 0,
    rT: 0
  };
  let aggressiveness = 0;
  let snapshot;
  for (let i = 0; i <= maxIterations; i++) {
    const haltonPoint = haltonGenerator.next().value;
    const jitter = (h) => 0.5 + 0.5 * h;
    parameters.rE = Math.min(aggressiveness * jitter(haltonPoint[0]), 1);
    parameters.rA = Math.min(aggressiveness * jitter(haltonPoint[1]), 1);
    parameters.rT = Math.min(aggressiveness * jitter(haltonPoint[2]), 1);
    snapshot = d2SnapFn.call(null, dom, parameters.rE, parameters.rA, parameters.rT, options);
    if (snapshot.meta.tokenEstimate <= maxTokens) {
      return {
        ...snapshot,
        parameters,
        adaptiveIterations: i
      };
    }
    const overshoot = snapshot.meta.tokenEstimate / maxTokens;
    if (i === 0) {
      aggressiveness = Math.min(0.9, 1 - 1 / overshoot);
      continue;
    }
    const logOver = Math.log2(overshoot);
    const step = Math.max(0.05, 0.15 * logOver);
    aggressiveness = Math.min(1, aggressiveness + step);
  }
  throw new RangeError(
    `Unable to create snapshot below ${maxTokens} tokens (last estimate: ${snapshot?.meta.tokenEstimate})`
  );
}
export {
  adaptiveD2Snap
};
