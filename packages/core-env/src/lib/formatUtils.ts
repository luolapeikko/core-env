import {type KeyFormatType, ValueLogFormat} from '../types';

/**
 * Print log value
 * @param value The value to print
 * @param format The format to use
 * @returns The formatted value
 * @category Logger
 * @since v0.0.1
 */
export function printLogValue(value: string, format: ValueLogFormat): string {
	if (format === ValueLogFormat.hidden) {
		return '';
	}
	return ` [${buildLogValue(value, format)}]`;
}

/**
 * Build masked value based on format type
 * @param value The value to build
 * @param format The format to use
 * @returns The formatted value
 * @category Logger
 * @since v0.0.1
 */
export function buildLogValue(value: string, format: ValueLogFormat): string {
	const visibleCharacters = Math.min(3, Math.max(1, Math.floor(value.length * 0.2)));
	switch (format) {
		case ValueLogFormat.masked:
			return '*'.repeat(value.length);
		case ValueLogFormat.plain:
			return value;
		case ValueLogFormat.prefix:
			return `${value.slice(0, visibleCharacters)}${'*'.repeat(value.length - visibleCharacters)}`;
		case ValueLogFormat.suffix:
			return `${'*'.repeat(value.length - visibleCharacters)}${value.slice(-visibleCharacters)}`;
		case ValueLogFormat.partial: {
			const halfOfVisibleCharacters = Math.max(1, Math.ceil(visibleCharacters / 2));
			return `${value.slice(0, halfOfVisibleCharacters)}${'*'.repeat(value.length - halfOfVisibleCharacters * 2)}${value.slice(-halfOfVisibleCharacters)}`;
		}
		case ValueLogFormat.hidden:
			return '';
		default:
			throw new Error(`Unknown format: ${format satisfies never}`);
	}
}

/**
 * Format key based on format type
 * @param key The key to format
 * @param format The format to use
 * @returns The formatted key
 * @category Logger
 * @since v0.0.1
 */
export function formatKey(key: string, format?: KeyFormatType): string {
	if (!key) {
		return key;
	}
	const firstKey = key.at(0) ?? '';
	switch (format) {
		case 'UPPERCASE':
			return key.toUpperCase();
		case 'lowercase':
			return key.toLowerCase();
		case 'camelCase':
			return firstKey.toLowerCase() + key.slice(1);
		case 'PascalCase':
			return firstKey.toUpperCase() + key.slice(1);
		default:
			return key;
	}
}
