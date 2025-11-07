import type {IResult} from '@luolapeikko/result-option';
import {type Awaitable, type Loadable, LoadableCore} from '@luolapeikko/ts-common';
import {EventEmitter} from 'events';
import type {IConfigLoader, LoaderValueResult, OverrideKeyMap} from '../interfaces';

/**
 * ConfigLoaderEventMap is the event map for the ConfigLoader
 * @category Loaders
 * @since v0.11.1
 */
export type ConfigLoaderEventMap = {
	/** notify when loader data is updated */
	updated: [];
};

/**
 * IConfigLoaderProps is the interface for ConfigLoader props
 * @category Loaders
 * @since v0.8.0
 */
export interface IAbstractBaseLoaderProps {
	disabled?: Loadable<boolean>;
}

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

	public setDisabled(disabled: Loadable<boolean>): Promise<void> {
		return this.setOption('disabled', disabled);
	}

	public async isLoaderDisabled(): Promise<boolean> {
		return (await LoadableCore.resolve((await this.getOptions()).disabled)) ?? false;
	}

	/**
	 * Get options from loader and merge with default options
	 * @returns {Promise<DefaultProps>} - Promise of DefaultProps & Props
	 */
	protected async getOptions(): Promise<Props> {
		const resolvedOptions = await (typeof this.options === 'function' ? this.options() : this.options);
		return Object.assign({}, this.defaultOptions, resolvedOptions);
	}

	protected async setOption<Key extends keyof Props>(key: Key, value: Props[Key]): Promise<void> {
		this.options = Object.assign({}, await this.getOptions(), {
			[key]: value,
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

	public abstract getRawValue(lookupKey: string): Awaitable<IResult<LoaderValueResult, Error>>;
}
