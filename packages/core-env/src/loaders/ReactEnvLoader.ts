import type {Awaitable} from '@luolapeikko/core-ts-type';
import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import type {LoaderValueResult, OverrideKeyMap} from '../interfaces';
import {AbstractBaseLoader, type IAbstractBaseLoaderProps} from './AbstractBaseLoader';

/**
 * Configuration loader that retrieves values from React environment variables (process.env.REACT_APP_{KEY}).
 * @template OverrideMap - A mapping type for overriding lookup keys.
 * @extends AbstractBaseLoader - {@link AbstractBaseLoader}
 * @category Loaders
 * @since v0.0.1
 */
export class ReactEnvLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap> extends AbstractBaseLoader<IAbstractBaseLoaderProps, OverrideMap> {
	public readonly loaderType = 'react-process-env';
	public override defaultOptions: IAbstractBaseLoaderProps = {
		disabled: false,
	};
	protected getRawValue(lookupKey: string): Awaitable<IResult<LoaderValueResult, Error>> {
		/* c8 ignore next 3 */
		if (!process?.env) {
			return Err(new Error(this.buildLogStr('process.env is not defined')));
		}
		const targetKey = `REACT_APP_${this.getOverrideKey(lookupKey)}`;
		return Ok({path: `process.env.${targetKey}`, value: process.env[targetKey]});
	}
}
