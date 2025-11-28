import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import type {LoaderValueResult, OverrideKeyMap} from '../interfaces';
import {AbstractBaseLoader, type IAbstractBaseLoaderProps} from './AbstractBaseLoader';

/**
 * Configuration loader that retrieves values from environment variables (process.env[KEY]).
 * @template OverrideMap - A mapping type for overriding lookup keys.
 * @extends AbstractBaseLoader - {@link AbstractBaseLoader}
 * @category Loaders
 * @since v0.0.1
 */
export class ProcessEnvLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap> extends AbstractBaseLoader<IAbstractBaseLoaderProps, OverrideMap> {
	public readonly loaderType = 'process-env';
	public override defaultOptions: IAbstractBaseLoaderProps = {
		disabled: false,
	};
	protected getRawValue(lookupKey: string): IResult<LoaderValueResult, Error> {
		/* c8 ignore next 3 */
		if (!process?.env) {
			return Err(new Error(this.buildLogStr('process.env is not defined')));
		}
		const key = this.getOverrideKey(lookupKey);
		return Ok({path: `process.env.${key}`, value: process.env[key]});
	}
}
