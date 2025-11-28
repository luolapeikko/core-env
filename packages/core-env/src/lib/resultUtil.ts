import {type IResult, Ok} from '@luolapeikko/result-option';

/**
 * Utility function to combine multiple results into a single result
 * @param results The results to combine
 * @returns The combined result
 * @category Utils
 * @since v0.0.1
 */
export function resultAll<OkType, ErrType>(results: IResult<OkType, ErrType>[]): IResult<OkType[], ErrType> {
	return results.reduce<IResult<OkType[], ErrType>>((acc, res) => {
		if (!acc.isOk) {
			return acc;
		}
		if (!res.isOk) {
			return res;
		}
		acc.ok().push(res.ok());
		return acc;
	}, Ok([]));
}
