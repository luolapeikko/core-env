import type {Awaitable} from '@luolapeikko/core-ts-type';
import type {IResult} from '@luolapeikko/result-option';

/**
 * Type representing the result of loading a configuration value, including the value and its source path.
 * @category Loaders
 * @since v0.0.1
 */
export type LoaderValueResult = {
	value: string | undefined;
	path: string;
};

/**
 * Interface for configuration loaders that retrieve raw string values from various sources, such as environment variables or files.
 * @category Loaders
 * @since v0.0.1
 */
export interface IConfigLoader {
	readonly loaderType: Lowercase<string>;
	getValueResult(lookupKey: string): Awaitable<IResult<LoaderValueResult | undefined, Error>>;
	isLoaderDisabled(): Awaitable<IResult<boolean, Error>>;
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
