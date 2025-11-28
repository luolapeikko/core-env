import type {Loadable} from '@luolapeikko/core-ts-type';
import {type IResult, Ok} from '@luolapeikko/result-option';
import type {OverrideKeyMap} from '../interfaces';
import {AbstractMapLoader, type AbstractMapLoaderLogMap, abstractMapLoaderLogMap, type IAbstractMapLoaderProps} from './AbstractMapLoader';

/**
 * Memory loader options
 * @template OverrideMap - A mapping type for overriding lookup keys.
 * @template KeyType - The type of keys used in the in-memory object.
 * @category Loaders
 * @since v0.0.1
 */
export type MemoryLoaderOptions<OverrideMap extends OverrideKeyMap, KeyType extends string> = {
	initialData?: Partial<Record<KeyType, string>>;
	options?: Loadable<Partial<IAbstractMapLoaderProps>>;
	overrideKeys?: Partial<OverrideMap>;
	type?: Lowercase<string>;
};

/**
 * Configuration loader that retrieves values from an in-memory object.
 * @template OverrideMap - A mapping type for overriding lookup keys.
 * @template KeyType - The type of keys used in the in-memory object.
 * @extends AbstractMapLoader - {@link AbstractMapLoader}
 * @category Loaders
 * @since v0.0.1
 */
export class MemoryLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap, KeyType extends string = string> extends AbstractMapLoader<
	IAbstractMapLoaderProps,
	OverrideMap,
	KeyType
> {
	public readonly loaderType: Lowercase<string>;
	protected defaultOptions: IAbstractMapLoaderProps = {
		disabled: false,
		logger: undefined,
	};
	protected defaultLogMap(): AbstractMapLoaderLogMap {
		return abstractMapLoaderLogMap;
	}
	#initialData: Partial<Record<KeyType, string>>;

	public constructor({initialData = {}, options = {}, overrideKeys = {}, type = 'memory'}: MemoryLoaderOptions<OverrideMap, KeyType> = {}) {
		super(options, overrideKeys);
		this.#initialData = initialData;
		this.initData(Object.entries(this.#initialData) as [KeyType, string][]);
		this.loaderType = type;
	}

	protected loadData(): IResult<boolean, Error> {
		// restore initial data
		this.initData(Object.entries(this.#initialData) as [KeyType, string][]);
		return Ok(true);
	}

	public override async set(key: KeyType, value: string | undefined): Promise<IResult<void, Error>> {
		return (await super.set(key, value)).inspectOk(() => this.emit('updated'));
	}
}
