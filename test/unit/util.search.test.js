import { searchITP } from "../../dist.lib/util.search.js";


const EPSILON = 5e-4;
// Worst case of bisection on [0, 1] to width 2 * epsilon, plus n0 = 1
const MAX_EVALUATIONS = Math.ceil(Math.log2(1 / (2 * EPSILON))) + 1;

function search(f, options = {}) {
    let evaluations = 0;
    const counted = x => {
        evaluations++;

        return f(x);
    };
    const result = searchITP(counted, { a: 0, fa: f(0), b: 1, fb: f(1) }, {
        epsilon: EPSILON,
        maxEvaluations: Infinity,
        ...options
    });

    return { ...result, counted: evaluations };
}

// Decreasing functions (as token counts over the ratio), root at 0.3
const FUNCTIONS = {
    "linear": x => 0.3 - x,
    "skewed (x^20)": x => 0.3**20 - x**20,
    "steps": x => Math.ceil((0.3 - x) * 8) / 8 + ((x < 0.3) ? 0.01 : -0.01),
    "plateau": x => (x < 0.3) ? 1 : ((x < 0.9) ? -0.001 : -1),
    "jump": x => (x < 0.3) ? 100 : -0.001
};


await test("Search ITP (worst case of bisection)", () => {
    for(const [ name, f ] of Object.entries(FUNCTIONS)) {
        const { a, fa, b, fb, counted, evaluations } = search(f);

        assertTrue(counted <= MAX_EVALUATIONS, `${name}: ${counted} evaluations (max ${MAX_EVALUATIONS})`);
        assertEqual(counted, evaluations, `${name}: evaluations not reported`);
        assertTrue(fa === 0 || fb === 0 || Math.sign(fa) !== Math.sign(fb), `${name}: sign change lost`);
        assertTrue(fa === 0 || fb === 0 || (b - a) <= 2 * EPSILON * (1 + 1e-9), `${name}: bracket not narrowed (${b - a})`);   // up to rounding
        assertTrue(a <= 0.3 + 2 * EPSILON && b >= 0.3 - 2 * EPSILON, `${name}: root not enclosed ([${a}, ${b}])`);
    }
});

await test("Search ITP (faster than bisection on well-behaved functions)", () => {
    const bisectionEvaluations = MAX_EVALUATIONS - 1;
    const { counted } = search(FUNCTIONS["linear"]);

    assertTrue(counted <= bisectionEvaluations / 2, `Linear function: ${counted} evaluations (bisection: ${bisectionEvaluations})`);
});

await test("Search ITP (early stop, evaluation budget)", () => {
    let calls = 0;
    const stopped = search(FUNCTIONS["skewed (x^20)"], { stop: () => (++calls > 2) });

    assertEqual(stopped.counted, 2, "Early stop not honoured");

    for(const maxEvaluations of [ 0, 1, 3 ]) {
        const { counted } = search(FUNCTIONS["skewed (x^20)"], { maxEvaluations });

        assertEqual(counted, maxEvaluations, `Evaluation budget not honoured (${maxEvaluations})`);
    }
});

await test("Search ITP (bracket validation)", () => {
    let err = null;
    try {
        searchITP(x => 1 + x, { a: 0, fa: 1, b: 1, fb: 2 }, { epsilon: EPSILON, maxEvaluations: 10 });
    } catch(e) {
        err = e;
    }

    assertTrue(err instanceof RangeError, "No range error for a bracket without sign change");

    const exact = searchITP(() => { throw new Error("evaluated"); }, { a: 0, fa: 0, b: 1, fb: -1 }, { epsilon: EPSILON, maxEvaluations: 10 });

    assertEqual(exact.evaluations, 0, "Evaluated despite a zero at the bracket");
});