import {type ILoggerLike, LogLevel, type LogLevelValue, type LogMapInfer} from '@avanio/logger-like';
import {AbstractMapLoader, buildStringMap, type IAbstractBaseLoaderProps, type OverrideKeyMap, VariableError} from '@luolapeikko/core-env';
import {ErrorCast} from '@luolapeikko/core-ts-error';
import type {Awaitable, Loadable} from '@luolapeikko/core-ts-type';
import {Err, type IResult, Ok, Result} from '@luolapeikko/result-option';
import {existsSync, type FSWatcher, type PathLike, watch} from 'fs';
import {readFile} from 'fs/promises';

/**
 * Log map for AbstractFileMapLoader
 * @category Logging
 * @since v0.0.1
 */
export const abstractFileMapLoaderLogMap: {
	watcher: LogLevelValue;
	load: LogLevelValue;
	init: LogLevelValue;
	get: LogLevelValue;
	missing: LogLevelValue;
	set: LogLevelValue;
} = {
	get: LogLevel.None,
	init: LogLevel.Debug,
	load: LogLevel.Debug,
	missing: LogLevel.None,
	set: LogLevel.None,
	watcher: LogLevel.None,
} as const;

/**
 * Log map type for AbstractFileMapLoader
 * @category Logging
 * @since v0.0.1
 */
export type AbstractFileMapLoaderLogMap = LogMapInfer<typeof abstractFileMapLoaderLogMap>;

/**
 * Options for AbstractFileMapLoader
 * @category Loaders
 * @since v0.0.1
 */
export interface AbstractFileMapLoaderOptions<FileType extends string> extends IAbstractBaseLoaderProps {
	fileType: FileType;
	/** file name to load */
	fileName: string;
	/** set to false if need errors */
	isSilent: boolean;
	/** optional logger */
	logger: ILoggerLike | undefined;
	/** set to true to watch file for changes */
	watch: boolean;
}

/**
 * Abstract file map loader
 * @category Loaders
 * @since v0.0.1
 */
export abstract class AbstractFileMapLoader<
	Options extends AbstractFileMapLoaderOptions<string> = AbstractFileMapLoaderOptions<string>,
	OverrideMap extends OverrideKeyMap = OverrideKeyMap,
	LogMap extends AbstractFileMapLoaderLogMap = AbstractFileMapLoaderLogMap,
> extends AbstractMapLoader<Options, OverrideMap, string, LogMap> {
	public abstract readonly loaderType: Lowercase<string>;
	protected abstract defaultOptions: Options;
	protected abstract defaultLogMap(): LogMap;
	#watcher: FSWatcher | undefined;
	#timeout: ReturnType<typeof setTimeout> | undefined;

	public constructor(props: Loadable<Partial<Options>> = {}, overrideKeys: Partial<OverrideMap> = {}, logMap?: LogMap) {
		super(props, overrideKeys, logMap);
	}

	/**
	 * If the loader is watching the file, it will stop watching.
	 */
	public async close(): Promise<IResult<void, Error>> {
		if (this.#watcher) {
			return (await this.getOptions()).andThen(({fileName}) => {
				this.logger.debug(this.buildLogStr(`closing file watcher for ${fileName}`));
				this.#watcher?.close();
				return Ok();
			});
		}
		return Ok();
	}

	protected loadData(): Promise<IResult<boolean, Error>> {
		return Result.asyncTupleFlow(this.#loadBufferData(), (data) => this.initData(buildStringMap(data)).andThen(() => Ok(true)));
	}

	async #handleFileChange(options: Options): Promise<void> {
		(await this.reload())
			.inspectOk(() => {
				this.logger.logKey('load', this.buildLogStr(`reloaded file ${options.fileName} due to change`));
			})
			.inspectErr((err) => {
				this.logger.logKey('load', this.buildLogStr(`error reloading file ${options.fileName} due to change: ${err.message}`));
			})
			.unwrapOr(undefined);
	}

	#handleFileWatch(options: Options): IResult<void, Error> {
		if (options.watch && !this.#watcher) {
			this.logger.logKey('watcher', this.buildLogStr(`setting up file watcher for ${options.fileName}`));
			this.#watcher = watch(options.fileName, () => {
				/* c8 ignore next 3 */
				if (this.#timeout) {
					clearTimeout(this.#timeout);
				}
				// delay to prevent multiple reloads
				this.#timeout = setTimeout(() => {
					void this.#handleFileChange(options);
				}, 200);
			});
		}
		return Ok();
	}

	#loadBufferData(): Promise<IResult<Record<string, string | undefined>, VariableError>> {
		return Result.asyncTupleFlow(
			this.getOptions(),
			(options) => this.fileExists(options.fileName),
			(options) => this.#readFileResult(options),
			(options, _, rawData) => this.handleParse(rawData, options),
			(options) => this.#handleFileWatch(options),
			(_options, _, _rawData, value) => Ok(value),
		);
	}

	async #readFileResult(options: Options): Promise<IResult<Buffer, VariableError>> {
		if (options.disabled) {
			this.logger.logKey('load', this.buildLogStr(`loader for file ${options.fileName} is disabled`));
			return Ok(Buffer.from('{}'));
		}
		this.logger.logKey('load', this.buildLogStr(`loading file ${options.fileName}`));
		try {
			return Ok(await readFile(options.fileName));
		} catch (cause) {
			return Err(new VariableError(ErrorCast.from(cause).message, {cause}));
		}
	}

	protected fileExists(path: PathLike): IResult<void, Error> {
		if (!existsSync(path)) {
			return Err(new VariableError(this.buildLogStr(`file ${path} not found`)));
		}
		return Ok();
	}

	/**
	 * Handle the parsing of the file.
	 */
	protected abstract handleParse(rawData: Buffer, options: Options): Awaitable<IResult<Record<string, string | undefined>, Error>>;
}
