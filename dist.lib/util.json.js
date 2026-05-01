function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function mergeJSONs(source, target) {
  const result = {
    ...source
  };
  for (const key of Object.keys(target)) {
    const sourceValue = result[key];
    const targetValue = target[key];
    if (isObject(sourceValue) && isObject(targetValue)) {
      result[key] = mergeJSONs(sourceValue, targetValue);
      continue;
    }
    if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      result[key] = [.../* @__PURE__ */ new Set([...sourceValue, ...targetValue])];
      continue;
    }
    result[key] = targetValue;
  }
  return result;
}
export {
  mergeJSONs
};
