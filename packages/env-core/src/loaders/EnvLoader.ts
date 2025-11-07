import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import type {LoaderValueResult, OverrideKeyMap} from '../interfaces';
import {AbstractBaseLoader, type IAbstractBaseLoaderProps} from './AbstractBaseLoader';

export class EnvLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap> extends AbstractBaseLoader<IAbstractBaseLoaderProps, OverrideMap> {
	public readonly loaderType = 'env';
	public override defaultOptions: IAbstractBaseLoaderProps = {
		disabled: false,
	};
	public getRawValue(lookupKey: string): IResult<LoaderValueResult, Error> {
		const key = this.getOverrideKey(lookupKey);
		if (!process?.env) {
			return Err(new Error(this.buildLogStr('process.env is not defined')));
		}
		return Ok({path: `process.env.${key}`, value: process.env[key]});
	}
}
