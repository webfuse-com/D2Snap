export function deepMerge<T1 extends object, T2 extends object>(target: T1, source: T2,): T1 & T2 {
    const result = { ...target } as any;

    for(const key of Object.keys(source) as Array<keyof T2>) {
        const targetValue = result[key];
        const sourceValue = source[key];

        if (
            targetValue !== null
            && sourceValue !== null
            && typeof(targetValue) === "object"
            && typeof(sourceValue) === "object"
            && !Array.isArray(targetValue)
            && !Array.isArray(sourceValue)
        ) {
            result[key] = deepMerge(targetValue, sourceValue);
        } else {
            result[key] = sourceValue;
        }
    }

    return result;
}