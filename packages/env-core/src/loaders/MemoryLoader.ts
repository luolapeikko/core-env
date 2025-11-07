import {type IResult, Ok} from '@luolapeikko/result-option';
import type {Loadable} from '@luolapeikko/ts-common';
import type {OverrideKeyMap} from '../interfaces';
import {AbstractMapLoader, type IAbstractMapLoaderProps} from './AbstractMapLoader';

export type MemoryLoaderArgs<OverrideMap extends OverrideKeyMap, KeyType extends string> = {
	initialData?: Partial<Record<KeyType, string>>;
	options?: Loadable<Partial<IAbstractMapLoaderProps>>;
	overrideKeys?: Partial<OverrideMap>;
	type?: Lowercase<string>;
};

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
	#initialData: Partial<Record<KeyType, string>>;
	public constructor({initialData = {}, options = {}, overrideKeys = {}, type = 'memory'}: MemoryLoaderArgs<OverrideMap, KeyType> = {}) {
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
		return (await super.set(key, value)).inspect(() => this.emit('updated'));
	}
}
