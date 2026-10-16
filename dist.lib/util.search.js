function searchITP(f, bracket, options) {
  let { a, fa, b, fb } = bracket;
  let evaluations = 0;
  if (fa !== 0 && Math.sign(fa) === Math.sign(fb)) {
    throw new RangeError("Bracket does not enclose a sign change");
  }
  if (fa === 0 || fb === 0) return { a, fa, b, fb, evaluations };
  const width = b - a;
  const k1 = options.k1 ?? 0.2 / width;
  const k2 = options.k2 ?? 2;
  const n0 = options.n0 ?? 1;
  const nMax = Math.max(Math.ceil(Math.log2(width / (2 * options.epsilon))), 0) + n0;
  const targetWidth = 2 * options.epsilon * (1 + 1e-12);
  for (let j = 0; b - a > targetWidth; j++) {
    if (evaluations >= options.maxEvaluations) break;
    if (options.stop?.()) break;
    const xHalf = (a + b) / 2;
    const radius = options.epsilon * 2 ** (nMax - j) - (b - a) / 2;
    const delta = k1 * (b - a) ** k2;
    const xF = (fb * a - fa * b) / (fb - fa);
    const sigma = Math.sign(xHalf - xF);
    const xT = delta <= Math.abs(xHalf - xF) ? xF + sigma * delta : xHalf;
    const x = Math.abs(xT - xHalf) <= radius ? xT : xHalf - sigma * radius;
    const fx = f(x);
    evaluations++;
    if (fx === 0) return {
      a: x,
      fa: fx,
      b: x,
      fb: fx,
      evaluations
    };
    if (Math.sign(fx) === Math.sign(fa)) {
      a = x;
      fa = fx;
    } else {
      b = x;
      fb = fx;
    }
  }
  return {
    a,
    fa,
    b,
    fb,
    evaluations
  };
}
export {
  searchITP
};
