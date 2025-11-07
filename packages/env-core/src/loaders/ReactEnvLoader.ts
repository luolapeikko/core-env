import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import type {Awaitable} from '@luolapeikko/ts-common';
import type {LoaderValueResult, OverrideKeyMap} from '../interfaces';
import {AbstractBaseLoader, type IAbstractBaseLoaderProps} from './AbstractBaseLoader';

export class ReactEnvLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap> extends AbstractBaseLoader<IAbstractBaseLoaderProps, OverrideMap> {
	public readonly loaderType = 'react-process-env';
	public override defaultOptions: IAbstractBaseLoaderProps = {
		disabled: false,
	};
	public getRawValue(lookupKey: string): Awaitable<IResult<LoaderValueResult, Error>> {
		if (!process?.env) {
			return Err(new Error(this.buildLogStr('process.env is not defined')));
		}
		const targetKey = `REACT_APP_${this.getOverrideKey(lookupKey)}`;
		return Ok({path: `process.env.${targetKey}`, value: process.env[targetKey]});
	}
}
