import {type ILoggerLike, LogLevel, type LogLevelValue, type LogMapInfer, MapLogger} from '@avanio/logger-like';
import {LoadableCore} from '@luolapeikko/core-ts-loadable';
import type {Loadable} from '@luolapeikko/core-ts-type';
import {Err, type IErr, type IResult, Ok} from '@luolapeikko/result-option';
import type {IConfigLoader, LoaderValueResult} from './interfaces';
import type {ConfigSchema} from './types';
import {VariableLookupError} from './VariableLookupError';

/**
 * Configuration options for the EnvKit.
 * @category Core
 * @since v0.0.1
 */
export type EnvKitOptions = {
	/** {@link ILoggerLike} compatible instance (console, log4js, winston, etc.) */
	logger?: ILoggerLike;
	/** optional namespace added to log prefix, `ConfigVariables:${namespace}[${loaderName}]:`... */
	namespace?: string;
	/** logging mode for repeated gets, `single` = log only first get or change, `always` = log every get, default: `single` */
	loggingMode?: 'single' | 'always';
	/** loader error handling, `throws` = throw error, `log` = log error, default: `log` */
	loaderError?: 'throws' | 'log';
};

/**
 * Raw value result type
 * @category Core
 * @since v0.0.1
 */
export type RawValueResult = {loaderType?: string; path?: string} & LoaderValueResult;

/**
 * Infer value result type
 * @category Core
 * @since v0.0.1
 */
export type InferValueResult<K> = undefined extends K ? {loaderType?: string; path?: string; value?: K} : {loaderType?: string; path?: string; value: K};

export type InferValue<K> = undefined extends K ? K | undefined : K;

export type InferValueString<K> = undefined extends K ? string | undefined : string;
/**
 * Result entry list type
 * @category Core
 * @since v0.0.1
 */
export type ResultEntryList = {loaderType?: string; value: unknown; path: string | undefined; error?: Error};

/**
 * Environment configuration kit that retrieves and parses configuration variables from multiple loaders.
 * @template Data - The shape of the configuration data.
 * @example
 * const envSchema = z.enum(['production', 'development', 'test'] as const);
 * type MainEnv = {
 *   PORT: number;
 *   ENV: z.infer<typeof envSchema>;
 *   HOST: string;
 *   DEBUG?: boolean;
 *   URL: URL;
 * };
 * const mainEnv = new EnvKit<MainEnv>(
 *   {
 *     DEBUG: {parser: KeyParser.Boolean()}, // optional variable, returns undefined if not found
 *     ENV: {defaultValue: 'development', parser: KeyParser.String(envSchema)}, // with StandardSchemaV1 parsers (zod,valibot,ark,...)
 *     HOST: {notFoundError: true, parser: KeyParser.String()}, // required variable, throws error if not found
 *     PORT: {defaultValue: 3000, parser: KeyParser.Integer()}, // if no value found, uses defaultValue
 *     URL: {defaultValue: new URL('http://localhost:3000'), parser: KeyParser.URL()},
 *   },
 *   [new ProcessEnvLoader(), new ReactEnvLoader()],
 *   {namespace: 'main'}, // optional namespace for logging
 * );
 * const portValue: number = (await mainEnv.get('PORT')).unwrap(); // unwrap will throw if specific variable is required but missing
 *
 * @category Core
 * @since v0.0.1
 */
export class EnvKit<Data extends Record<string, unknown>> {
	public static defaultLogMap: {loader: LogLevelValue; loaderError: LogLevelValue} = {
		loader: LogLevel.None,
		loaderError: LogLevel.Warn,
	} as const;
	public readonly logger: MapLogger<LogMapInfer<typeof EnvKit.defaultLogMap>>;
	#seenLog = new Map<keyof Data, string>();
	#schema: ConfigSchema<Data>;
	#options: EnvKitOptions;
	#loaders: Iterable<Loadable<IConfigLoader>>;
	#cachedEntries = new Map<keyof Data, InferValueResult<Data[keyof Data]>>();
	public constructor(
		schema: ConfigSchema<Data>,
		loaders: Iterable<Loadable<IConfigLoader>>,
		options: EnvKitOptions = {logger: undefined, namespace: undefined},
	) {
		this.#schema = schema;
		this.#options = options;
		this.#loaders = loaders;
		this.logger = new MapLogger(options.logger ?? undefined, EnvKit.defaultLogMap);
	}

	/**
	 * Get the parsed configuration entry for the given key.
	 * @param {K} lookupKey - The key to look up in the configuration schema.
	 * @returns {Promise<IResult<InferValueResult<Data[K]>, Error>>} - Promise of the parsed configuration entry or an error as {@link IResult}.
	 */
	public async getEntry<K extends keyof Data>(lookupKey: K): Promise<IResult<InferValueResult<Data[K]>, Error>> {
		const schema = this.#schema[lookupKey];
		return (await this.#getEntry(lookupKey)).inspectOk((data) => {
			// update cached entry if it already exists
			if (this.#cachedEntries.has(lookupKey)) {
				this.#cachedEntries.set(lookupKey, data as InferValueResult<Data[keyof Data]>);
			}
			this.#printLog(lookupKey, data, schema);
		});
	}

	/**
	 * Get the parsed configuration value for the given key.
	 * @param {K} lookupKey - The key to look up in the configuration schema.
	 * @returns {Promise<IResult<Data[K], Error>>} - Promise of the parsed configuration value or an error as {@link IResult}.
	 */
	public async get<K extends keyof Data>(lookupKey: K): Promise<IResult<Data[K], Error>> {
		return (await this.getEntry(lookupKey)).andThen((data: InferValueResult<Data[K]>) => Ok(data.value as Data[K]));
	}

	/**
	 * Get the parsed configuration value as a string for the given key.
	 * @param {K} lookupKey - The key to look up in the configuration schema.
	 * @returns {Promise<IResult<string | undefined, Error>>} - Promise of the parsed configuration value as a string or an error as {@link IResult}.
	 */
	public async getString<K extends keyof Data>(lookupKey: K): Promise<IResult<string | undefined, Error>> {
		const schema = this.#schema[lookupKey];
		return (await this.get(lookupKey)).andThen((data) => Ok(data && schema.parser.toString(data)));
	}

	async #getEntry<K extends keyof Data>(lookupKey: K): Promise<IResult<InferValueResult<Data[K]>, Error>> {
		const schema = this.#schema[lookupKey];
		if (!schema) {
			return Err(new VariableLookupError(String(lookupKey), `Key "${String(lookupKey)}" is not defined in schema`));
		}
		const currentParser = schema.parser.parse;
		for await (const result of this.#getResultIterator(lookupKey)) {
			if (this.#options.loaderError === 'throws' && result.isErr) {
				return result;
			}
			const data = result.inspectErr((err) => this.logger.logKey('loaderError', err.message)).ok();
			if (result.isOk && data?.value) {
				return (await currentParser(data.value)).andThen((value: Data[K]) => {
					return Ok({loaderType: data.loaderType, path: data.path, value});
				});
			}
		}
		let defaultValue: undefined | Data[K];
		if (schema.defaultValue !== undefined) {
			defaultValue = (await LoadableCore.resolve(schema.defaultValue)) as Data[K];
		}
		if (defaultValue !== undefined) {
			return Ok({loaderType: 'defaultValue', path: `key:${String(lookupKey)}`, value: defaultValue});
		}
		if (schema.notFoundError) {
			return Err(new VariableLookupError(String(lookupKey), `Missing required value for key: ${String(lookupKey)}`));
		}
		return Ok({
			loaderType: undefined,
			path: String(lookupKey),
			value: undefined,
		}) as IResult<InferValueResult<Data[K]>, Error>;
	}

	public async *getResultEntryList(lookupKey: keyof Data): AsyncIterable<ResultEntryList> {
		for await (const loader of this.#getLoaderIterator()) {
			const res = await loader.getValueResult(lookupKey as string);
			yield {error: res.err(), loaderType: loader.loaderType, path: res.ok()?.path, value: res.ok()?.value};
		}
	}

	/**
	 * Ensure that the specified keys are loaded and cached in the EnvKit. If any key fails to load, the error will be returned.
	 * @param {keyof Data | Iterable<keyof Data>} lookupKeys - The key or iterable of keys to ensure are loaded.
	 * @param {EncodeOptions} [encodeOptions] - Optional encode options to use when loading the keys.
	 * @returns {Promise<IResult<void>>} - A promise that resolves to an IResult indicating success or failure. If any key fails to load, the error will be returned.
	 */
	public async ensure(lookupKeys: keyof Data | Iterable<keyof Data>): Promise<IResult<void>> {
		let errorOccurred: IErr<unknown> | undefined;
		const keysToEnsure = (typeof lookupKeys === 'string' ? [lookupKeys] : lookupKeys) as Iterable<keyof Data>;
		for (const lookupKey of keysToEnsure) {
			const data = await this.#getEntry(lookupKey);
			if (data.isErr) {
				errorOccurred = data;
			} else {
				this.#cachedEntries.set(lookupKey, data.ok());
			}
		}
		return errorOccurred ?? Ok();
	}

	/**
	 * Read the cached configuration value for the given key. (use {@link ensure} to load/reload the value first)
	 * @param {K} lookupKey - The key to look up in the configuration schema.
	 * @returns {LoaderTypeValueStrict<Data[Key]>} - The cached configuration entry.
	 * @throws {VariableLookupError} - If the key is not cached, indicating that {@link ensure} was not called first.
	 * @template K - The type of the key to look up in the configuration schema.
	 */
	public readEntry<Key extends keyof Data = keyof Data>(key: Key): IResult<InferValueResult<Data[Key]>, VariableLookupError> {
		const cachedEntry = this.#cachedEntries.get(key) as InferValueResult<Data[Key]> | undefined;
		if (cachedEntry) {
			return Ok<InferValueResult<Data[Key]>>(cachedEntry);
		}
		return Err(new VariableLookupError(String(key), `Key "${String(key)}" is not cached, check if ensure('${String(key)}') was called first`));
	}

	/**
	 * Read the cached configuration value for the given key as a Result. (use {@link ensure} to load/reload the value first)
	 * @param lookupKey
	 * @returns {IResult<Data[K], VariableLookupError>} - The cached configuration value wrapped in a Result.
	 * @template K - The type of the key to look up in the configuration schema.
	 */
	public read<K extends keyof Data>(lookupKey: K): IResult<InferValue<Data[K]>, VariableLookupError> {
		return this.readEntry<K>(lookupKey).andThen((data) => Ok<InferValue<Data[K]>>(data.value as InferValue<Data[K]>));
	}

	public readString<K extends keyof Data>(lookupKey: K): IResult<InferValueString<Data[K]>, VariableLookupError> {
		const schema = this.#schema[lookupKey];
		return this.read<K>(lookupKey).andThen((data) => Ok<InferValueString<Data[K]>>(data && schema.parser.toString(data)));
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
		return (await loader.getValueResult(lookupKey as string)).andThen((data) => {
			if (!data) {
				return Ok({loaderType: loader.loaderType, path: String(lookupKey), value: undefined});
			}
			return Ok({...data, loaderType: loader.loaderType});
		});
	}

	#printLog<K extends keyof Data>(key: K, data: InferValueResult<Data[K]>, schema: ConfigSchema<Data>[K]) {
		const namespaceString = this.#options.namespace ? `:${this.#options.namespace}` : '';
		const loggingMode = this.#options.loggingMode;
		const output = data.loaderType
			? `ConfigVariables${namespaceString}[${data.loaderType}]: ${String(key)}${this.#printValue(data, schema)} from ${data.path}`
			: `ConfigVariables${namespaceString}: ${String(key)}${this.#printValue(data, schema)}`;
		if (loggingMode === 'always' || output !== this.#seenLog.get(key)) {
			this.#seenLog.set(key, output);
			this.logger.info(output);
		}
	}

	#printValue<K extends keyof Data>({value}: InferValueResult<Data[K]>, {logFormat = 'plain', parser}: ConfigSchema<Data>[K]) {
		if (logFormat === 'hidden') {
			return '';
		}
		if (!value) {
			return ' [undefined]';
		}
		return ` [${parser.toLogString(value, logFormat)}]`;
	}
}
