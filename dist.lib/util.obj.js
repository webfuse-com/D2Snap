function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const targetValue = result[key];
    const sourceValue = source[key];
    if (targetValue !== null && sourceValue !== null && typeof targetValue === "object" && typeof sourceValue === "object" && !Array.isArray(targetValue) && !Array.isArray(sourceValue)) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      result[key] = sourceValue;
    }
  }
  return result;
}
export {
  deepMerge
};
