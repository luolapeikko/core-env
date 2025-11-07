import {type ILoggerLike, LogLevel, LogLevelValue, type LogMapInfer, MapLogger} from '@avanio/logger-like';
import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import {type Loadable, LoadableCore, UndefCore} from '@luolapeikko/ts-common';
import type {IConfigLoader, LoaderValueResult} from './interfaces';
import type {ConfigSchema} from './types';

export type ConfigOptions = {
	/** undefined = global logger, null = no logger else it's ILoggerLike */
	logger?: ILoggerLike | null;
	/** optional namespace added to logs */
	namespace?: string;
};

export type RawValueResult = {loaderType?: string; path?: string} & LoaderValueResult;

export type InferValueResult<K> = undefined extends K ? {loaderType?: string; path?: string; value?: K} : {loaderType?: string; path?: string; value: K};

export type ResultEntryList = {loaderType?: string; value: unknown; path: string | undefined; error?: Error};

export class ConfigMap<Data extends Record<string, unknown>> {
	public static defaultLogMap: {loader: LogLevelValue; loaderError: LogLevelValue} = {
		loader: LogLevel.None,
		loaderError: LogLevel.Warn,
	} as const;
	public readonly logger: MapLogger<LogMapInfer<typeof ConfigMap.defaultLogMap>>;
	#schema: ConfigSchema<Data>;
	#options: ConfigOptions;
	#loaders: Iterable<Loadable<IConfigLoader>>;
	public constructor(
		schema: ConfigSchema<Data>,
		loaders: Iterable<Loadable<IConfigLoader>>,
		options: ConfigOptions = {logger: undefined, namespace: undefined},
	) {
		this.#schema = schema;
		this.#options = options;
		this.#loaders = loaders;
		this.logger = new MapLogger(options.logger ?? undefined, ConfigMap.defaultLogMap);
	}

	public async getEntry<K extends keyof Data>(lookupKey: K): Promise<IResult<InferValueResult<Data[K]>, Error>> {
		const schema = this.#schema[lookupKey];
		return (await this.#getEntry(lookupKey)).inspect((data) => this.#printLog(lookupKey, data, schema));
	}

	public async get<K extends keyof Data>(lookupKey: K): Promise<IResult<Data[K], Error>> {
		return (await this.getEntry(lookupKey)).andThen((data: InferValueResult<Data[K]>) => Ok(data.value as Data[K]));
	}

	public async getString<K extends keyof Data>(lookupKey: K): Promise<IResult<string | undefined, Error>> {
		const schema = this.#schema[lookupKey];
		return (await this.getEntry(lookupKey)).andThen((data: InferValueResult<Data[K]>) => Ok(data.value && schema.parser.toString(data.value)));
	}

	async #getEntry<K extends keyof Data>(lookupKey: K): Promise<IResult<InferValueResult<Data[K]>, Error>> {
		const schema = this.#schema[lookupKey];
		if (!schema) {
			return Err(new Error(`Key "${String(lookupKey)}" is not defined in schema`));
		}
		const currentParser = schema.parser.parse;
		for await (const result of this.#getResultIterator(lookupKey)) {
			const data = result.inspectErr((err) => this.logger.logKey('loaderError', `Loader error: ${String(lookupKey)} ${err.message}`)).ok();
			if (result.isOk && data?.value) {
				return (await currentParser(data.value)).andThen((value: Data[K]) => {
					return Ok({loaderType: data.loaderType, path: data.path, value});
				});
			}
		}
		let defaultValue: undefined | Data[K];
		if (UndefCore.isNotUndefined(schema.defaultValue)) {
			defaultValue = (await LoadableCore.resolve(schema.defaultValue)) as Data[K];
		}
		if (defaultValue !== undefined) {
			return Ok({loaderType: 'defaultValue', path: `key:${String(lookupKey)}`, value: defaultValue});
		}
		if (schema.undefinedError) {
			return Err(new Error(`Missing required value for key: ${String(lookupKey)}`));
		}
		return Ok({
			loaderType: undefined,
			path: `key:${String(lookupKey)}`,
			value: undefined,
		}) as IResult<InferValueResult<Data[K]>, Error>;
	}

	public async *getResultEntryList(lookupKey: keyof Data): AsyncIterable<ResultEntryList> {
		for await (const loader of this.#getLoaderIterator()) {
			const res = await loader.getRawValue(lookupKey as string);
			yield {error: res.err(), loaderType: loader.loaderType, path: res.ok()?.path, value: res.ok()?.value};
		}
	}

	async *#getResultIterator<K extends keyof Data>(lookupKey: K): AsyncIterable<IResult<RawValueResult, Error>> {
		for await (const loader of this.#getLoaderIterator()) {
			this.logger.logKey('loader', `get loader ${loader.loaderType} result for key ${String(lookupKey)}`);
			yield this.#getLoaderEntry(loader, lookupKey);
		}
	}

	async *#getLoaderIterator(): AsyncIterable<IConfigLoader> {
		for (const loader of this.#loaders) {
			yield await LoadableCore.resolve(loader);
		}
	}

	async #getLoaderEntry(loader: IConfigLoader, lookupKey: keyof Data): Promise<IResult<RawValueResult, Error>> {
		return (await loader.getRawValue(lookupKey as string)).andThen((data: LoaderValueResult) => Ok({...data, loaderType: loader.loaderType}));
	}

	#printLog<K extends keyof Data>(key: K, data: InferValueResult<Data[K]>, schema: ConfigSchema<Data>[K]) {
		const namespaceString = this.#options.namespace ? `:${this.#options.namespace}` : '';
		this.#options.logger?.info(`ConfigVariables${namespaceString}[${data.loaderType}]: ${String(key)}${this.#printValue(data, schema)} from ${data.path}`);
	}

	#printValue<K extends keyof Data>({value}: InferValueResult<Data[K]>, {logFormat = 'plain', parser}: ConfigSchema<Data>[K]) {
		if (!value || logFormat === 'hidden') {
			return '';
		}
		return ` [${parser.toLogString(value, logFormat)}]`;
	}
}
