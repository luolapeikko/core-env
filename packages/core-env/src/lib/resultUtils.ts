import {ErrorCast} from '@luolapeikko/core-ts-error';
import {LoadableCore} from '@luolapeikko/core-ts-loadable';
import type {Loadable} from '@luolapeikko/core-ts-type';
import {Err, type IResult, Ok} from '@luolapeikko/result-option';

/**
 * Utility function to convert a loadable to a result
 * @param loadable The loadable to convert
 * @returns Promise<IResult<T, Error>>
 * @category Utils
 * @since v0.0.1
 */
export async function loadableResult<T>(loadable: Loadable<T>): Promise<IResult<T, Error>> {
	try {
		return Ok((await LoadableCore.resolve(loadable)) as T);
	} catch (error) {
		return Err(ErrorCast.from(error));
	}
}
