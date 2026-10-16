export interface SearchBracket {
	a: number;
	fa: number;
	b: number;
	fb: number;
}

export interface SearchITPOptions {
	epsilon: number;	// half the bracket width to narrow to
	maxEvaluations: number;
	stop?: () => boolean;	// checked before each evaluation
	k1?: number;
	k2?: number;
	n0?: number;
}

export interface SearchITPResult extends SearchBracket {
	evaluations: number;
}


// Bracketed root search with the ITP method (Oliveira & Takahashi, 2020):
// regula falsi speed on well-behaved functions, at most the bisection steps (+ n0) in the worst case.
export function searchITP(
	f: (x: number) => number,
	bracket: SearchBracket,
	options: SearchITPOptions
): SearchITPResult {
	let { a, fa, b, fb } = bracket;
	let evaluations: number = 0;

	if(fa !== 0 && Math.sign(fa) === Math.sign(fb)) {
		throw new RangeError("Bracket does not enclose a sign change");
	}

	if(fa === 0 || fb === 0) return { a, fa, b, fb, evaluations };

	const width: number = b - a;
	const k1: number = options.k1 ?? (0.2 / width);
	const k2: number = options.k2 ?? 2;
	const n0: number = options.n0 ?? 1;
	const nMax: number = Math.max(Math.ceil(Math.log2(width / (2 * options.epsilon))), 0) + n0;
	// Relative slack for floating-point rounding
	const targetWidth: number = 2 * options.epsilon * (1 + 1e-12);

	for(let j = 0; (b - a) > targetWidth; j++) {
		if(evaluations >= options.maxEvaluations) break;
		if(options.stop?.()) break;

		const xHalf: number = (a + b) / 2;
		const radius: number = options.epsilon * 2**(nMax - j) - (b - a) / 2;
		const delta: number = k1 * (b - a)**k2;

		// Interpolate
		const xF: number = (fb * a - fa * b) / (fb - fa);

		// Truncate
		const sigma: number = Math.sign(xHalf - xF);
		const xT: number = (delta <= Math.abs(xHalf - xF))
			? xF + sigma * delta
			: xHalf;

		// Project
		const x: number = (Math.abs(xT - xHalf) <= radius)
			? xT
			: xHalf - sigma * radius;

		const fx: number = f(x);

		evaluations++;

		if(fx === 0) return {
			a: x,
			fa: fx,
			b: x,
			fb: fx,
			evaluations
		};

		if(Math.sign(fx) === Math.sign(fa)) {
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