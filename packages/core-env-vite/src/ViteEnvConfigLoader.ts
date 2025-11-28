/// <reference types="vite/client" />
import {AbstractBaseLoader, type IAbstractBaseLoaderProps, type LoaderValueResult, type OverrideKeyMap} from '@luolapeikko/core-env';
import {type IResult, Ok} from '@luolapeikko/result-option';

/**
 * Vite env loader class is used to load env variables from import.meta.env.VITE_*
 * @example
 * const viteEnv = new ViteEnvConfigLoader();
 * const loaders = [viteEnv, fetchEnv];
 * export const envConfig = new ConfigMap<EnvConfig>({
 *   API_HOST: {parser: urlParser, defaultValue: new URL('http://localhost:3001'), params: {showValue: true}},
 * }, loaders, {logger});
 * @template OverrideMap - the type of the override key map
 * @param {Partial<OverrideMap>} [override] - optional override key for lookup
 * @returns {AbstractBaseLoader} - IConfigLoader object
 * @category Loaders
 * @since v0.0.1
 */
export class ViteEnvConfigLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap> extends AbstractBaseLoader<IAbstractBaseLoaderProps, OverrideMap> {
	public readonly loaderType = 'vite-env';
	public override defaultOptions: IAbstractBaseLoaderProps = {
		disabled: false,
	};
	protected getRawValue(lookupKey: string): IResult<LoaderValueResult, Error> {
		const targetKey = `VITE_${lookupKey}`;
		const currentValue: unknown = import.meta.env[targetKey];
		if (typeof currentValue === 'string' || typeof currentValue === 'number' || typeof currentValue === 'boolean') {
			return Ok({path: `import.meta.env.${targetKey}`, value: String(currentValue)});
		}
		return Ok({path: `import.meta.env.${targetKey}`, value: undefined});
	}
}
