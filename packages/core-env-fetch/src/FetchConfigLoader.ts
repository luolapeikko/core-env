import type {ILoggerLike} from '@avanio/logger-like';
import {
	AbstractMapLoader,
	type AbstractMapLoaderLogMap,
	abstractMapLoaderLogMap,
	type IAbstractMapLoaderProps,
	type OverrideKeyMap,
	VariableError,
} from '@luolapeikko/core-env';
import {ErrorCast} from '@luolapeikko/core-ts-error';
import {LoadableCore} from '@luolapeikko/core-ts-loadable';
import {RecordCore} from '@luolapeikko/core-ts-record';
import type {Loadable} from '@luolapeikko/core-ts-type';
import {Err, type IResult, Ok, Result} from '@luolapeikko/result-option';
import type {StandardSchemaV1} from '@standard-schema/spec';
import type {IRequestCache} from './interfaces/IRequestCache';
import {buildStringObject, urlSanitize} from './lib';

/**
 * Options for the FetchConfigLoader
 * @since v0.0.1
 */
export interface FetchConfigLoaderOptions extends IAbstractMapLoaderProps {
	fetchClient: typeof fetch;
	/** this prevents Error to be thrown if have http error */
	isSilent: boolean;
	payload: 'json';
	validate: StandardSchemaV1<unknown, Record<string, string>> | undefined;
	logger: ILoggerLike | undefined;
	cache: IRequestCache | undefined;
	/** if we get a cache hit code (defaults 304), we use the cached response instead */
	cacheHitHttpCode: number;
}

/**
 * FetchConfigLoader is used to load config from a fetch request
 * @template OverrideMap - the type of the override key map
 * @category Loaders
 * @since v0.0.1
 */
export class FetchConfigLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap> extends AbstractMapLoader<FetchConfigLoaderOptions, OverrideMap> {
	public readonly loaderType: Lowercase<string>;
	private request: Loadable<Request>;

	protected defaultOptions: FetchConfigLoaderOptions = {
		cache: undefined,
		cacheHitHttpCode: 304,
		disabled: false,
		fetchClient: typeof window === 'object' ? fetch.bind(window) : fetch,
		isSilent: true,
		logger: undefined,
		payload: 'json',
		validate: undefined,
	};
	protected defaultLogMap(): AbstractMapLoaderLogMap {
		return abstractMapLoaderLogMap;
	}

	/**
	 * Constructor for FetchConfigLoader
	 * @param {Loadable<Request>} request - callback that returns a fetch request
	 * @param {Loadable<Partial<FetchConfigLoaderOptions>>} options - optional options for FetchConfigLoader
	 * @param {Partial<OverrideMap>} overrideKeys - optional override keys for FetchConfigLoader
	 * @param {Lowercase<string>} type - optional name type for FetchConfigLoader (default: 'fetch')
	 */
	public constructor(
		request: Loadable<Request>,
		options: Loadable<Partial<FetchConfigLoaderOptions>> = {},
		overrideKeys: Partial<OverrideMap> = {},
		type: Lowercase<string> = 'fetch',
	) {
		super(options, overrideKeys);
		this.request = request;
		this.loaderType = type;
	}

	protected loadData(): Promise<IResult<boolean, Error>> {
		return Result.asyncTupleFlow(
			this.getOptions(),
			() => this.#getRequest(),
			(_options, req) => this.#fetchRequestOrCacheResponse(req),
			async ({logger, isSilent, payload}, req, res) => {
				const path = urlSanitize(req.url); // hide username/passwords from URL in logs
				if (!res) {
					logger?.info(this.buildLogStr(`client is offline and does not have cached response [${path}]`));
					return Ok(false);
				}
				const contentType = res.headers.get('content-type');
				if (contentType?.startsWith('application/json') && payload === 'json') {
					return (await this.#handleDataLoading(res)).inspectOk(() => {
						logger?.debug(this.buildLogStr(`successfully loaded config ${path}`));
					});
				}
				if (isSilent) {
					logger?.info(this.buildLogStr(`unsupported content-type ${String(contentType)} [${path}]`));
					return Ok(false);
				}
				return Err(new VariableError(this.buildLogStr(`unsupported content-type ${String(contentType)} [${path}]`)));
			},
		);
	}

	/**
	 * if client is offline, we will try return the cached response else add cache validation (ETag) and try get the response from the fetch request
	 * @param {Request} req - request to fetch
	 * @returns {Promise<Response | undefined>} - response or undefined
	 */
	#fetchRequestOrCacheResponse(req: Request): Promise<IResult<Response | undefined, Error>> {
		return Result.asyncTupleFlow(
			this.getOptions(),
			() => this.#getCacheResponse(req),
			(options, cacheRes) => {
				if (cacheRes) {
					options.logger?.debug(this.buildLogStr(`returning cached response from ${urlSanitize(req.url)}`));
					return Ok(cacheRes);
				}
				options.logger?.debug(this.buildLogStr(`fetching config from ${urlSanitize(req.url)}`));
				return this.#handleFetchCall(options, req, cacheRes);
			},
		);
	}

	async #handleFetchCall({logger, cache, cacheHitHttpCode}: FetchConfigLoaderOptions, req: Request, cacheRes: Response | undefined) {
		return Result.asyncTupleFlow(
			(await this.#fetchResult(req))
				.inspectErr((err) => {
					logger?.warn(this.buildLogStr(`failed to fetch error: ${err.message}`), err);
				})
				.orElse(() => Ok(cacheRes)),
			async (res) => {
				if (res?.ok && cache) {
					(await cache.storeRequest(req, res))
						.inspectOk(() => {
							logger?.debug(this.buildLogStr('stored response in cache'));
						})
						.inspectErr((error) => {
							logger?.warn(this.buildLogStr(`failed to store response in cache: ${error.message}`));
						});
				}
				// if we have a cached response and we get a cache hit code (default 304) or an error, return the cached response
				if (res && (res.status === cacheHitHttpCode || res.status >= 400)) {
					return Ok(cacheRes);
				}
				return Ok(res);
			},
		);
	}

	/**
	 * read response JSON and push to map loader
	 */
	#handleDataLoading(res: Response): Promise<IResult<boolean, Error>> {
		return Result.asyncTupleFlow(
			this.#handleJsonMap(res),
			(data) => this.initData(data),
			() => Ok(true),
		);
	}

	/**
	 * get cached response if available
	 */
	#getCacheResponse(req: Request): Promise<IResult<Response | undefined, Error>> {
		return Result.asyncTupleFlow(this.getOptions(), async ({cache}) => {
			if (cache && !cache.isOnline()) {
				return (await cache.getRequest(req)).andThen((res) => {
					if (res) {
						if (!cache.isOnline()) {
							return Ok(res);
						}
						// add ETag header for cache validation
						const etag = res.headers.get('etag');
						if (etag) {
							req.headers.set('If-None-Match', etag);
						}
					}
					return Ok(undefined);
				});
			}
			return Ok(undefined);
		});
	}

	/**
	 * Fetch result from request
	 */
	#fetchResult(req: Request): Promise<IResult<Response, Error>> {
		return Result.asyncTupleFlow(this.getOptions(), async ({fetchClient}) => {
			try {
				const res = await fetchClient(req);
				return Ok(res);
			} catch (error) {
				return Err(ErrorCast.from(error));
			}
		});
	}

	/**
	 * Read response JSON and push to map
	 */
	#handleJsonMap(res: Response): Promise<IResult<Map<string, string>, Error>> {
		return Result.asyncTupleFlow(this.getOptions(), async ({validate, isSilent, logger}) => {
			try {
				const contentType = res.headers.get('content-type');
				if (!contentType?.startsWith('application/json')) {
					return Err(new Error(this.buildLogStr(`unsupported content-type ${String(contentType)}`)));
				}
				const rawData: unknown = await res.json();
				if (!RecordCore.is(rawData)) {
					return Err(new Error(this.buildLogStr(`response is not a valid JSON object`)));
				}
				const data = buildStringObject(rawData);
				if (validate) {
					const validateRes = await validate['~standard'].validate(data);
					if (validateRes.issues) {
						const issues = validateRes.issues.map((issue) => `- ${issue.message} ${issue.path ? `(path: ${issue.path.join('.')})` : ''}`);
						return Err(new VariableError(this.buildLogStr(`validation failed:\n${issues.join('\n')}`)));
					}
					return Ok(Object.entries(validateRes.value).reduce<Map<string, string>>((acc, [key, value]) => acc.set(key, value), new Map()));
				}
				return Ok(Object.entries(data).reduce<Map<string, string>>((acc, [key, value]) => acc.set(key, value), new Map()));
			} catch (error) {
				const err = ErrorCast.from(error);
				if (isSilent) {
					logger?.info(this.buildLogStr(`JSON error: ${err.message}`));
					return Ok(new Map()); // set as empty so we prevent fetch spamming
				}
				return Err(new VariableError(this.buildLogStr(`JSON error: ${err.message}`)));
			}
		});
	}

	async #getRequest(): Promise<IResult<Request, Error>> {
		try {
			return Ok(await LoadableCore.resolve(this.request));
		} catch (error) {
			return Err(ErrorCast.from(error));
		}
	}
}
