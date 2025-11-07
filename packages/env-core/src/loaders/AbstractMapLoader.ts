import {type ILoggerLike, LogLevel, LogLevelValue, type LogMapInfer, MapLogger} from '@avanio/logger-like';
import {type IResult, Ok, resultAsyncFlow} from '@luolapeikko/result-option';
import type {Awaitable, Loadable} from '@luolapeikko/ts-common';
import type {LoaderValueResult, OverrideKeyMap} from '../interfaces';
import {AbstractBaseLoader, type IAbstractBaseLoaderProps} from './AbstractBaseLoader';

export interface IAbstractMapLoaderProps extends IAbstractBaseLoaderProps {
	logger: ILoggerLike | undefined;
}

export const mapLoaderLogMap: {get: LogLevelValue; missing: LogLevelValue; set: LogLevelValue} = {
	get: LogLevel.None,
	missing: LogLevel.None,
	set: LogLevel.None,
} as const;

export abstract class AbstractMapLoader<
	Props extends IAbstractMapLoaderProps,
	OverrideMap extends OverrideKeyMap = OverrideKeyMap,
	KeyType extends string = string,
	LogMap extends LogMapInfer<typeof mapLoaderLogMap> | undefined = undefined,
> extends AbstractBaseLoader<Props, OverrideMap> {
	protected abstract defaultOptions: Props;
	public readonly logger: MapLogger<LogMapInfer<typeof mapLoaderLogMap>>;
	#data: Map<KeyType, string | undefined>;
	#isLoaded: boolean;
	#isInitialized = false;

	public constructor(props: Loadable<Partial<Props>> = {}, overrideKeys: Partial<OverrideMap> = {}, logMap?: LogMap) {
		super(props, overrideKeys);
		this.#data = new Map();
		this.#isLoaded = false;
		this.logger = new MapLogger(undefined, logMap || mapLoaderLogMap);
	}
	/**
	 * Initialize the loader, set logger instance
	 */
	public async init(): Promise<IResult<void, Error>> {
		if (this.#isInitialized) {
			const options = await this.getOptions();
			this.logger.setLogger(options.logger ?? undefined);
			this.#isInitialized = true;
		}
		return Ok();
	}

	public getRawValue(lookupKey: KeyType): Promise<IResult<LoaderValueResult, Error>> {
		return resultAsyncFlow(
			this.init(),
			() => this.get(lookupKey),
			(data) => Ok({path: `key:${this.getOverrideKey(lookupKey)}`, value: data}),
		);
	}

	public reload(): Promise<IResult<void, Error>> {
		return resultAsyncFlow(this.init(), () => {
			this.#data.clear();
			this.#isLoaded = false;
			return this.#loadData();
		});
	}

	public isLoaded(): boolean {
		return this.#isLoaded;
	}

	public set(lookupKey: KeyType, value: string | undefined): Promise<IResult<void, Error>> {
		return resultAsyncFlow(this.init(), () => {
			const key = this.getOverrideKey(lookupKey);
			if (value === undefined) {
				this.logger.logKey('set', this.buildLogStr(`clear key ${key}`));
			} else {
				this.logger.logKey('set', this.buildLogStr(`set key ${key}`));
			}
			this.#data.set(key, value);
			this.emit('updated');
			return Ok();
		});
	}

	public get(lookupKey: KeyType): Promise<IResult<string | undefined, Error>> {
		return resultAsyncFlow(this.init(), () => {
			const key = this.getOverrideKey(lookupKey);
			this.logger.logKey('get', this.buildLogStr(`key ${key}`));
			if (!this.#data.has(key)) {
				this.logger.logKey('missing', this.buildLogStr(`key ${key} not found`));
			}
			return Ok(this.#data.get(key));
		});
	}

	async #loadData(): Promise<IResult<void, Error>> {
		return (await this.loadData()).andThen(() => Ok());
	}

	protected initData(inputData: [key: KeyType, value: string | undefined][]): void {
		this.#data = new Map(inputData);
		this.#isLoaded = true;
		this.emit('updated');
	}

	protected abstract loadData(): Awaitable<IResult<boolean, Error>>;
}
