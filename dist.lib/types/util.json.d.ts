type JSONValue = string | number | boolean | null | JSONObject | JSONObject[];
interface JSONObject {
    [key: string]: JSONValue;
}
export declare function mergeJSONs(source: JSONObject, target: JSONObject): JSONObject;
export {};
