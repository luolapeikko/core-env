import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import type {StandardSchemaV1} from '@standard-schema/spec';

/**
 * Checks if a value is a standard schema.
 * @param value The value to check.
 * @returns True if the value is a standard schema, false otherwise.
 * @category Validator
 * @since v0.0.1
 */
export function isStandardSchema(value: unknown): value is StandardSchemaV1<unknown, unknown> {
	return typeof value === 'object' && value !== null && '~standard' in value;
}

/**
 * Creates a validator function for a standard schema.
 * @param schema The standard schema to validate against.
 * @returns A validator function that takes a value and returns a result.
 * @category Validator
 * @since v0.0.1
 */
export function stdValidateResult<T>(schema: StandardSchemaV1<unknown, T>) {
	return async (value: unknown): Promise<IResult<T, TypeError>> => {
		const res = await schema['~standard'].validate(value);
		if (res.issues) {
			return Err(new TypeError(res.issues.map((issue) => issue.message).join('\n')));
		}
		return Ok(res.value);
	};
}
