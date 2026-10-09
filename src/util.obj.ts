export function deepMerge<T1 extends object, T2 extends object>(target: T1, source: T2,): T1 & T2 {
	const result = { ...target } as T1 & T2;

	for(const key of Object.keys(source) as Array<keyof T2>) {
		const targetValue = result[key as keyof T1 & keyof T2];
		const sourceValue = source[key];

		if (
			targetValue !== null
            && sourceValue !== null
            && typeof(targetValue) === "object"
            && typeof(sourceValue) === "object"
            && !Array.isArray(targetValue)
            && !Array.isArray(sourceValue)
		) {
			(result as Record<keyof T2, unknown>)[key] = deepMerge(
				targetValue as object,
				sourceValue as object,
			);
		} else {
			(result as Record<keyof T2, unknown>)[key] = sourceValue;
		}
	}

	return result;
}
