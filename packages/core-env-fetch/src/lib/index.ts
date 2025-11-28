import type {ILoggerLike} from '@avanio/logger-like';
import {RecordCore} from '@luolapeikko/core-ts-record';

/**
 * Sanitizes a URL by replacing the username and password with asterisks.
 * @param {string} value - The URL to sanitize.
 * @param {ILoggerLike} [logger] - An optional logger to use for logging warnings.
 * @returns {string} The sanitized URL.
 * @category Utils
 * @since v0.0.1
 */
export function urlSanitize(value: string, logger?: ILoggerLike): string {
	try {
		const url = new URL(value);
		url.password = '*'.repeat(url.password.length);
		url.username = '*'.repeat(url.username.length);
		return url.href;
	} catch (err) {
		// warn to log if can't parse url
		logger?.warn('variables:', err);
		return value;
	}
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
	if (RecordCore.is(value)) {
		return haveToJSON(value) ? value.toJSON() : JSON.stringify(value);
	}
	return String(value);
}

/**
 * Convert an object to a string value object
 * @param {Record<string, unknown>} obj - object to convert
 * @returns {Record<string, string | undefined>} - object with string values
 * @since v0.0.1
 */
export function buildStringObject(obj: Record<string, unknown>): Record<string, string> {
	return Object.entries(obj).reduce<Record<string, string>>((last, [key, value]) => {
		if (value !== undefined && value !== null) {
			last[key] = stringifyValue(value);
		}
		return last;
	}, {});
}
