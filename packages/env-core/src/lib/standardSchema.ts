import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import type {StandardSchemaV1} from '@standard-schema/spec';

export function isStandardSchema(value: unknown): value is StandardSchemaV1<unknown, unknown> {
	return typeof value === 'object' && value !== null && '~standard' in value;
}

export function stdValidateResult<T>(schema: StandardSchemaV1<unknown, T>) {
	return async (value: unknown): Promise<IResult<T, TypeError>> => {
		const res = await schema['~standard'].validate(value);
		if (res.issues) {
			return Err(new TypeError(res.issues.map((issue) => issue.message).join('\n')));
		}
		return Ok(res.value);
	};
}
