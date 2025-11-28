import type {Awaitable, Loadable} from '@luolapeikko/core-ts-type';
import {type IResult, Ok, Result} from '@luolapeikko/result-option';
import {EventEmitter} from 'events';
import type {IConfigLoader, LoaderValueResult, OverrideKeyMap} from '../interfaces';
import {loadableResult} from '../lib/resultUtils';

/**
 * ConfigLoaderEventMap is the event map for the ConfigLoader
 * @category Loaders
 * @since v0.0.1
 */
export type ConfigLoaderEventMap = {
	/** notify when loader data is updated */
	updated: [];
};

/**
 * IConfigLoaderProps is the interface for ConfigLoader props
 * @category Loaders
 * @since v0.0.1
 */
export interface IAbstractBaseLoaderProps {
	disabled?: Loadable<boolean>;
}

/**
 * Abstract configuration loader base class.
 * @template Props - The type of the loader properties.
 * @template OverrideMap - Optionally extends `OverrideKeyMap` to add custom override keys.
 * @extends EventEmitter<ConfigLoaderEventMap> - {@link EventEmitter}
 * @extends IConfigLoader - {@link IConfigLoader}
 * @category Loaders
 * @since v0.0.1
 */
export abstract class AbstractBaseLoader<Props extends IAbstractBaseLoaderProps, OverrideMap extends OverrideKeyMap = OverrideKeyMap>
	extends EventEmitter<ConfigLoaderEventMap>
	implements IConfigLoader
{
	public abstract loaderType: Lowercase<string>;
	protected abstract defaultOptions: Props;
	protected options: Loadable<Partial<Props>>;
	protected overrideKeys: Partial<OverrideMap>;

	public constructor(props: Loadable<Partial<Props>> = {}, overrideKeys: Partial<OverrideMap> = {}) {
		super();
		this.options = props;
		this.overrideKeys = overrideKeys;
	}

	public setDisabled(disabled: Loadable<boolean>): Promise<IResult<void, Error>> {
		return this.setOption('disabled', disabled);
	}

	public isLoaderDisabled(): Promise<IResult<boolean, Error>> {
		return Result.asyncTupleFlow(
			this.getOptions(),
			(options) => loadableResult(options.disabled),
			(_options, value) => Ok(value ?? false),
		);
	}

	public async getValueResult(lookupKey: string): Promise<IResult<LoaderValueResult | undefined, Error>> {
		// option loading error is disabled
		if ((await this.isLoaderDisabled()).unwrapOr(true)) {
			return Ok(undefined);
		}
		return this.getRawValue(lookupKey);
	}

	/**
	 * Get options from loader and merge with default options
	 * @returns {Promise<DefaultProps>} - Promise of DefaultProps & Props
	 */
	protected getOptions(): Promise<IResult<Props, Error>> {
		return Result.asyncTupleFlow(loadableResult(this.options), (options) => Ok(Object.assign({}, this.defaultOptions, options)));
	}

	protected setOption<Key extends keyof Props>(key: Key, value: Props[Key]): Promise<IResult<void, Error>> {
		return Result.asyncTupleFlow(this.getOptions(), (options) => {
			this.options = Object.assign({}, options, {
				[key]: value,
			});
			return Ok();
		});
	}

	protected getOverrideKey<KeyType extends string>(key: KeyType): KeyType {
		return (this.overrideKeys[key] || key) as KeyType;
	}

	/**
	 * Build error string `ConfigVariables[<type>]: <message>`
	 * @param {string} message - error message
	 * @returns {string} - error string
	 */
	protected buildLogStr(message: string): string {
		return `ConfigLoader[${this.loaderType}]: ${message}`;
	}

	/**
	 * Get raw value from loader, this is only called when loader is not disabled
	 * @param lookupKey lookup key
	 * @returns {Promise<IResult<LoaderValueResult, Error>>} - Promise of LoaderValueResult
	 */
	protected abstract getRawValue(lookupKey: string): Awaitable<IResult<LoaderValueResult, Error>>;
}
