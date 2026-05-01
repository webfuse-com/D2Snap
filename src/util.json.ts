type JSONValue = string | number | boolean | null | JSONObject | JSONObject[];

interface JSONObject {
	[ key: string ]: JSONValue;
}


function isObject(value: unknown): boolean {
	return (typeof(value) === "object")
		&& (value !== null)
		&& !Array.isArray(value);
}


export function mergeJSONs(source: JSONObject, target: JSONObject): JSONObject {
	const result: JSONObject = {
		...source
	};

	for(const key of Object.keys(target)) {
		const sourceValue: JSONValue = result[key];
		const targetValue: JSONValue = target[key];

		if(isObject(sourceValue) && isObject(targetValue)) {
			result[key] = mergeJSONs(sourceValue as JSONObject, targetValue as JSONObject);

			continue;
		}

		if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
			result[key] = [ ...new Set([...sourceValue, ...targetValue]) ];

			continue;
		}

		result[key] = targetValue;
	}

	return result;
}