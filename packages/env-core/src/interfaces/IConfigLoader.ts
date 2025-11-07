import type {IResult} from '@luolapeikko/result-option';
import type {Awaitable} from '@luolapeikko/ts-common';

export type LoaderValueResult = {
	value: string | undefined;
	path: string;
};

export interface IConfigLoader {
	readonly loaderType: Lowercase<string>;
	getRawValue(lookupKey: string): Awaitable<IResult<LoaderValueResult, Error>>;
	isLoaderDisabled(): Awaitable<boolean>;
}

/**
 * Helper type to write override keys to config loaders
 * @since v0.0.1
 * @category Loaders
 * @example
 * type OverrideKeyMap = InferOverrideKeyMap<MainEnv & TestEnv>;
 * // Example usage of OverrideKeyMap, where the keys are the original config keys and the values are the override keys
 * const env = new EnvConfigLoader<OverrideKeyMap>(undefined, {PORT: 'HTTP_PORT'}); // get PORT value from process.env.HTTP_PORT
 */
export type OverrideKeyMap = Record<string, string>;

/**
 * Helper infer type to write override keys to config loaders
 * @template T - The type of the config object.
 * @since v0.0.1
 * @category Loaders
 * @example
 * type OverrideKeyMap = InferOverrideKeyMap<MainEnv & TestEnv>;
 * // Example usage of OverrideKeyMap, where the keys are the original config keys and the values are the override keys
 * const env = new EnvConfigLoader<OverrideKeyMap>(undefined, {PORT: 'HTTP_PORT'}); // get PORT value from process.env.HTTP_PORT
 */
export type InferOverrideKeyMap<T> = Record<keyof T, string>;
