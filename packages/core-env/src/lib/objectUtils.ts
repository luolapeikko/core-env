/**
 * validate if a value is a valid object
 * @param {unknown} value - value to validate
 * @returns {value is Record<string, unknown>} - true if value is a valid object
 * @since v0.0.1
 */
function isValidObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value has a toJSON method
 * @param {unknown} value - value to check
 * @returns {value is {toJSON: () => string}} - true if value has a toJSON method
 */
function haveToJSON(value: unknown): value is {toJSON: () => string} {
	return typeof value === 'object' && value !== null && 'toJSON' in value;
}

/**
 * Stringify a value to a string
 * @param {unknown} value - value to stringify
 * @returns {string} - stringified value
 */
function stringifyValue(value: unknown): string {
	if (isValidObject(value)) {
		return haveToJSON(value) ? value.toJSON() : JSON.stringify(value);
	}
	return String(value);
}

/**
 * Convert an object to a Map<string, string>
 * @param {Record<string, unknown>} obj - object to convert
 * @returns {Map<string, string>} - Map with string values
 * @since v0.0.1
 * @category Utils
 */
export function buildStringMap(obj: Record<string, unknown>): Map<string, string> {
	return Object.entries(obj).reduce((acc, [key, value]) => {
		if (value) {
			acc.set(key, stringifyValue(value));
		}
		return acc;
	}, new Map<string, string>());
}
