import {
	AbstractMapLoader,
	type AbstractMapLoaderLogMap,
	abstractMapLoaderLogMap,
	type IAbstractMapLoaderProps,
	type OverrideKeyMap,
} from '@luolapeikko/core-env';
import {ErrorCast} from '@luolapeikko/core-ts-error';
import type {Awaitable} from '@luolapeikko/core-ts-type';
import {Err, type IResult, Ok, Result} from '@luolapeikko/result-option';
import type {IStorageDriver} from 'tachyon-drive';
import type {TachyonConfigStoreType} from './tachyonConfigSerializer';

export class TachyonConfigLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap> extends AbstractMapLoader<IAbstractMapLoaderProps, OverrideMap> {
	public readonly loaderType: Lowercase<string>;
	protected defaultOptions: IAbstractMapLoaderProps = {
		disabled: false,
		logger: undefined,
	};
	protected defaultLogMap(): AbstractMapLoaderLogMap {
		return abstractMapLoaderLogMap;
	}

	#driver: IStorageDriver<TachyonConfigStoreType>;
	#isLoaded = false;

	public constructor(
		driver: IStorageDriver<TachyonConfigStoreType>,
		options: Partial<IAbstractMapLoaderProps> = {},
		overrideKeys?: Partial<OverrideMap>,
		loaderType: Lowercase<string> = 'tachyon',
	) {
		super(options, overrideKeys);
		this.loaderType = loaderType;
		this.#driver = driver;
		this.#driver.on('update', () => {
			void this.loadData();
		});
	}

	/**
	 * Set a Config variable in the store
	 * @param {string} key The key to set
	 * @param {string} value The value to set
	 * @returns {Promise<void>}
	 */
	public override set(key: string, value: string): Promise<IResult<void, Error>> {
		return Result.asyncTupleFlow(
			this.#initHydrate(),
			() => super.set(key, value),
			() => this.#writeStore(),
		);
	}

	/**
	 * Get a Config variable from the store
	 * @param {string} key The key to lookup
	 * @returns {Promise<string | undefined>} The value of the key
	 */
	public override get(key: string): Promise<IResult<string | undefined, Error>> {
		return Result.asyncTupleFlow(this.#initHydrate(), () => super.get(key));
	}

	/**
	 * Clear all Config variables from the store
	 * @returns {Promise<void>}
	 */
	public clear(): Promise<IResult<void, Error>> {
		return Result.asyncTupleFlow(
			this.#initHydrate(),
			() => super.clear(),
			() => this.#writeStore(),
		);
	}

	protected loadData(): Promise<IResult<boolean, Error>> {
		return Result.asyncTupleFlow(
			this.getOptions(),
			(options) => this.#hydrateStore(options),
			async (_options, storeData) => this.initData(storeData ? new Map(Object.entries(storeData.data)) : new Map()),
			() => this.size(),
			({logger}, _storeData, _, size) => {
				logger?.info(`TachyonConfigLoader: Loaded ${size} entries from store`);
				return Ok(true);
			},
		);
	}

	#initHydrate(): Awaitable<IResult<void, Error>> {
		if (!this.#isLoaded) {
			return Result.asyncTupleFlow(this.loadData(), () => {
				this.#isLoaded = true;
				return Ok();
			});
		}
		return Ok();
	}

	#getDataAsStore(): IResult<TachyonConfigStoreType, Error> {
		return this.getData().andThen((data) =>
			Ok({
				_v: 1,
				data: Object.fromEntries(data),
			}),
		);
	}

	async #hydrateStore(options: IAbstractMapLoaderProps) {
		if (options.disabled) {
			return Ok(undefined);
		}
		try {
			return Ok(await this.#driver.hydrate());
		} catch (error) {
			return Err(ErrorCast.from(error));
		}
	}

	#writeStore(): Promise<IResult<void, Error>> {
		return Result.asyncTupleFlow(
			this.getOptions(),
			() => this.#getDataAsStore(),
			() => this.size(),
			async ({logger}, storeData, size) => {
				try {
					await this.#driver.store(storeData);
					logger?.info(`TachyonConfigLoader: Stored ${size} entries to store`);
					return Ok();
				} catch (error) {
					return Err(ErrorCast.from(error));
				}
			},
		);
	}
}
