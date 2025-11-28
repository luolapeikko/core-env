import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import type {KeyFormatType} from '../types';
import {formatKey} from './formatUtils';

const booleanTrueStringValues = ['true', '1', 'yes', 'y', 'on'];
const booleanFalseStringValues = ['false', '0', 'no', 'n', 'off'];

const allBooleanStringValues = [...booleanFalseStringValues, ...booleanTrueStringValues];

/**
 * Validate core class to build validation results
 * @category Validator
 * @since v0.0.1
 */
export class ValidateCore {
	public static URL = <T extends URL = URL>(value: unknown): IResult<T, TypeError> => {
		if (typeof value !== 'string' && !(value instanceof URL)) {
			return Err(ValidateCore.buildErr(value, 'URL'));
		}
		try {
			return Ok(new URL(value) as T);
		} catch (cause) {
			return Err(ValidateCore.buildErr(value, 'URL', {cause}));
		}
	};
	public static String = <T extends string = string>(value: unknown): IResult<T, TypeError> => {
		if (typeof value !== 'string') {
			return Err(ValidateCore.buildErr(value, 'String'));
		}
		return Ok(value as T);
	};
	public static Boolean = <T extends boolean = boolean>(value: unknown): IResult<T, TypeError> => {
		if (typeof value !== 'string') {
			return Err(ValidateCore.buildErr(value, 'Boolean'));
		}
		const output = value.toLowerCase();
		if (!allBooleanStringValues.includes(output)) {
			return Err(ValidateCore.buildErr(value, 'Boolean'));
		}
		return Ok(booleanTrueStringValues.includes(output) as T);
	};
	public static Integer = <T extends number = number>(value: unknown): IResult<T, TypeError> => {
		if (typeof value !== 'string') {
			return Err(ValidateCore.buildErr(value, 'Integer'));
		}
		const parsed = Number.parseInt(value, 10);
		if (Number.isNaN(parsed)) {
			return Err(ValidateCore.buildErr(value, 'Integer'));
		}
		return Ok(parsed as T);
	};
	public static Float = <T extends number = number>(value: unknown): IResult<T, TypeError> => {
		if (typeof value !== 'string') {
			return Err(ValidateCore.buildErr(value, 'Float'));
		}
		const parsed = parseFloat(value);
		if (Number.isNaN(parsed)) {
			return Err(ValidateCore.buildErr(value, 'Float'));
		}
		return Ok(parsed as T);
	};
	public static BigInt = <T extends bigint = bigint>(value: unknown): IResult<T, TypeError> => {
		if (typeof value !== 'string' && typeof value !== 'bigint') {
			return Err(ValidateCore.buildErr(value, 'BigInt'));
		}
		try {
			return Ok(BigInt(value) as T);
		} catch (cause) {
			return Err(ValidateCore.buildErr(value, 'BigInt', {cause}));
		}
	};
	public static JSON = <T>(value: unknown): IResult<T, TypeError> => {
		if (typeof value !== 'string') {
			return Err(ValidateCore.buildErr(value, 'JSON'));
		}
		try {
			return Ok(JSON.parse(value));
		} catch (cause) {
			return Err(ValidateCore.buildErr(value, 'JSON', {cause}));
		}
	};
	public static SemiColon = (value: unknown, keyFormat?: KeyFormatType): IResult<Record<string, string>, TypeError> => {
		if (typeof value !== 'string') {
			return Err(ValidateCore.buildErr(value, 'SemiColon'));
		}
		return Ok(
			value.split(';').reduce<Record<string, string>>((last, c) => {
				const pair = c.split('=', 2);
				const k = pair[0]?.trim();
				const v = pair[1]?.trim() ?? 'true'; // if no value is provided, default to "true"
				if (k) {
					const key = formatKey(k, keyFormat);
					if (key) {
						last[key] = decodeURIComponent(v);
					}
				}
				return last;
			}, {}),
		);
	};
	public static buildErr(
		value: unknown,
		typeName: 'Integer' | 'String' | 'BigInt' | 'Float' | 'Boolean' | 'URL' | 'JSON' | 'SemiColon',
		options?: ErrorOptions,
	): TypeError {
		const stringValue = typeof value === 'bigint' ? value.toString() : JSON.stringify(value);
		return new TypeError(`Invalid ${typeName} value: ${stringValue}`, options);
	}
	/* c8 ignore next 3 */
	private constructor() {
		throw new Error('This class should not be instantiated.');
	}
}
