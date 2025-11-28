import {type ILoggerLike, LogLevel, type LogLevelValue, type LogMapInfer, MapLogger} from '@avanio/logger-like';
import type {Awaitable, Loadable} from '@luolapeikko/core-ts-type';
import {type IResult, Ok, Result} from '@luolapeikko/result-option';
import type {LoaderValueResult, OverrideKeyMap} from '../interfaces';
import {loadableResult} from '../lib/resultUtils';
import {AbstractBaseLoader, type IAbstractBaseLoaderProps} from './AbstractBaseLoader';

/**
 * Abstract map loader properties
 * @category Loaders
 * @since v0.0.1
 */
export interface IAbstractMapLoaderProps extends IAbstractBaseLoaderProps {
	logger: ILoggerLike | undefined;
}

/**
 * Abstract map loader log map
 * @category Logger
 * @since v0.0.1
 */
export const abstractMapLoaderLogMap: {init: LogLevelValue; get: LogLevelValue; missing: LogLevelValue; set: LogLevelValue} = {
	get: LogLevel.None,
	init: LogLevel.Debug,
	missing: LogLevel.None,
	set: LogLevel.None,
} as const;

/**
 * Abstract map loader log map type
 * @category Logger
 * @since v0.0.1
 */
export type AbstractMapLoaderLogMap = LogMapInfer<typeof abstractMapLoaderLogMap>;

/**
 * Abstract configuration loader that retrieves values from a key-value {@link Map}.
 * @template Props - The type of the loader properties.
 * @template OverrideMap - Optionally extends `OverrideKeyMap` to add custom override keys.
 * @template KeyType - Optional type of key used in the Map, default: `string`
 * @template LogMap - Optionally extends `AbstractMapLoaderLogMap` to add custom log keys.
 * @extends AbstractBaseLoader - {@link AbstractBaseLoader}
 * @category Loaders
 * @since v0.0.1
 */
export abstract class AbstractMapLoader<
	Props extends IAbstractMapLoaderProps,
	OverrideMap extends OverrideKeyMap = OverrideKeyMap,
	KeyType extends string = string,
	LogMap extends AbstractMapLoaderLogMap = AbstractMapLoaderLogMap,
> extends AbstractBaseLoader<Props, OverrideMap> {
	protected abstract defaultOptions: Props;
	protected abstract defaultLogMap(): LogMap;
	public readonly logger: MapLogger<LogMap>;
	#data = new Map<KeyType, string | undefined>();
	#isLoaded = false;
	#isInitialized = false;

	public constructor(props: Loadable<Partial<Props>> = {}, overrideKeys: Partial<OverrideMap> = {}, logMap?: LogMap) {
		super(props, overrideKeys);
		this.logger = new MapLogger(undefined, Object.assign({}, this.defaultLogMap(), logMap ?? {}));
	}

	/**
	 * Initialize the loader, set logger instance
	 */
	public init(): Awaitable<IResult<void, Error>> {
		if (this.#isInitialized) {
			return Ok();
		}
		return Result.asyncTupleFlow(
			this.getOptions(),
			() => this.isLoaderDisabled(),
			({logger}, isDisabled) => {
				if (!this.#isInitialized) {
					this.#isInitialized = true;
					this.logger.setLogger(logger);
					if (isDisabled) {
						this.logger.logKey('init', this.buildLogStr(`loader of type ${this.loaderType} is disabled`));
					} else {
						this.logger.logKey('init', this.buildLogStr(`loader of type ${this.loaderType} is initialized`));
					}
				}
				return Ok();
			},
		);
	}

	protected getRawValue(lookupKey: KeyType): Promise<IResult<LoaderValueResult, Error>> {
		return Result.asyncTupleFlow(
			this.init(),
			() => this.get(lookupKey),
			(_, data) => Ok({path: `key:${this.getOverrideKey(lookupKey)}`, value: data}),
		);
	}

	/**
	 * Clear all cached data and force reload on next access
	 * @returns Promise that resolves to a result indicating success or failure
	 */
	public reload(): Promise<IResult<void, Error>> {
		return Result.asyncTupleFlow(
			this.init(),
			() => {
				this.#data.clear();
				this.#isLoaded = false;
				return Ok();
			},
			() => this.#handleLoad(),
		);
	}

	public isLoaded(): boolean {
		return this.#isLoaded;
	}

	public set(lookupKey: KeyType, value: string | undefined): Promise<IResult<void, Error>> {
		return Result.asyncTupleFlow(
			this.init(),
			() => this.#handleLoad(),
			() => {
				const key = this.getOverrideKey(lookupKey);
				if (value === undefined) {
					this.logger.logKey('set', this.buildLogStr(`clear key ${key}`));
				} else {
					this.logger.logKey('set', this.buildLogStr(`set key ${key}`));
				}
				this.#data.set(key, value);
				this.emit('updated');
				return Ok();
			},
		);
	}

	public get(lookupKey: KeyType): Promise<IResult<string | undefined, Error>> {
		return Result.asyncTupleFlow(
			this.init(),
			() => this.#handleLoad(),
			() => {
				const key = this.getOverrideKey(lookupKey);
				this.logger.logKey('get', this.buildLogStr(`key ${key}`));
				if (!this.#data.has(key)) {
					this.logger.logKey('missing', this.buildLogStr(`key ${key} not found`));
				}
				return Ok(this.#data.get(key));
			},
		);
	}

	public size(): Promise<IResult<number, Error>> {
		return Result.asyncTupleFlow(
			this.init(),
			() => this.#handleLoad(),
			() => Ok(this.#data.size),
		);
	}

	protected initData(inputData: Iterable<readonly [KeyType, string | undefined]>): IResult<void, Error> {
		this.#data = new Map(inputData);
		this.#isLoaded = true;
		this.emit('updated');
		return Ok();
	}

	protected getData(): IResult<Map<KeyType, string>, Error> {
		return Ok(this.#data.entries().reduce<Map<KeyType, string>>((acc, [key, value]) => (value ? acc.set(key, value) : acc), new Map()));
	}

	/**
	 * Handle initial load of data if not already loaded
	 * @returns
	 */
	#handleLoad(): Promise<IResult<void, Error>> {
		return Result.asyncTupleFlow(
			this.getOptions(),
			(options) => loadableResult(options.disabled),
			async (_, isDisabled) => {
				if (!this.#isLoaded && !isDisabled) {
					return (await this.loadData()).andThen(() => Ok());
				}
				return Ok();
			},
		);
	}

	protected abstract loadData(): Awaitable<IResult<boolean, Error>>;
}
