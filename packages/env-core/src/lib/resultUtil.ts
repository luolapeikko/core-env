import {type IResult, Ok} from '@luolapeikko/result-option';

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
