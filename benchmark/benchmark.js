import benchmarkDOM from "./benchmark.dom.js";
import benchmarkString from "./benchmark.string.js";


const BENCHMARKS = {
    "dom": benchmarkDOM,
    "string": benchmarkString
};


async function benchmark(cb, iterations) {
    const t0 = performance.now();

    for(let i = 0; i < iterations; i++) {
        await cb();
    }

    const totalTime = performance.now() - t0;

    console.log(`Total time (${iterations} iterations): ${totalTime.toPrecision(5)}ms`);
}


const identifier = process.argv.slice(2)[0];
const iterations = process.argv.slice(2)[1] || 100;

console.log(`\x1b[1mBenchmark '${identifier}'\x1b[0m`);

await benchmark(BENCHMARKS[identifier], iterations);