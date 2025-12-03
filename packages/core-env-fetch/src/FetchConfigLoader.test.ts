import type {ILoggerLike} from '@avanio/logger-like';
import {type ConfigSchema, EnvKit, KeyParser, VariableError, VariableLookupError} from '@luolapeikko/core-env';
import {Err, Ok} from '@luolapeikko/result-option';
import etag from 'etag';
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {FetchConfigLoader, type FetchConfigLoaderOptions} from './FetchConfigLoader';
import type {IRequestCache} from './interfaces/IRequestCache';

const logSpy = vi.fn();
const loggerSpy: ILoggerLike = {
	debug: logSpy,
	error: logSpy,
	info: logSpy,
	trace: logSpy,
	warn: logSpy,
};

class TestCache implements IRequestCache {
	#state: 'get' | 'store' | 'offline' | undefined;
	public cache = new Map<string, Response>();
	getRequest(req: Request) {
		if (this.#state === 'get') {
			return Promise.resolve(Err(new Error('test')));
		}
		return Promise.resolve(Ok(this.cache.get(req.url)?.clone()));
	}
	isOnline(): boolean {
		return this.#state !== 'offline';
	}
	storeRequest(req: Request, res: Response) {
		if (this.#state === 'store') {
			return Promise.resolve(Err(new Error('test')));
		}
		this.cache.set(req.url, res.clone());
		return Promise.resolve(Ok());
	}
	setState(state: 'get' | 'store' | 'offline' | undefined) {
		this.#state = state;
	}
}

const cacheInstance = new TestCache();

const fetchResponsePayload = {
	API_SERVER: 'http://localhost:123/api',
	NULL_VALUE: null,
	TEST_OBJECT: 'First=false;Second=false;Third=true',
};

function mockFetch(input: globalThis.URL | RequestInfo, init?: RequestInit): Promise<Response> {
	const req = new Request(input, init);
	const bodyData = JSON.stringify(fetchResponsePayload);
	const etagValue = etag(bodyData);
	// cache hit
	if (req.headers.get('If-None-Match') === etagValue) {
		return Promise.resolve(new Response(undefined, {status: 304}));
	}
	return Promise.resolve(new Response(bodyData, {headers: {'Content-Type': 'application/json', etag: etagValue}, status: 200}));
}

function mockFetchNotStrictValid(_input: globalThis.URL | RequestInfo, _init?: RequestInit): Promise<Response> {
	const bodyData = JSON.stringify({
		API_SERVER: 'this is not a url',
		NULL_VALUE: 'hello world!',
		TEST_OBJECT: 'First=false;Second=false;Third=true',
	});
	return Promise.resolve(new Response(bodyData, {headers: {'Content-Type': 'application/json'}, status: 200}));
}

function mockBrokenJsonFetch(_input: globalThis.URL | RequestInfo, _init?: RequestInit): Promise<Response> {
	return Promise.resolve(new Response('hello world!', {headers: {'Content-Type': 'application/json'}, status: 200}));
}

function mockArrayJsonFetch(_input: globalThis.URL | RequestInfo, _init?: RequestInit): Promise<Response> {
	return Promise.resolve(new Response('[1,2,3]', {headers: {'Content-Type': 'application/json'}, status: 200}));
}

function mockFetchError(_input: globalThis.URL | RequestInfo, _init?: RequestInit): Promise<Response> {
	return Promise.reject(new Error('test'));
}

function mockFetchNoChange(_input: globalThis.URL | RequestInfo, _init?: RequestInit): Promise<Response> {
	return Promise.resolve(new Response(undefined, {status: 304}));
}

function mockFetchWrongContentType(_input: globalThis.URL | RequestInfo, _init?: RequestInit): Promise<Response> {
	return Promise.resolve(new Response('hello world!', {headers: {'Content-Type': 'plain/text'}, status: 200}));
}

const strictObjectSchema = z.object({
	API_SERVER: z.url(),
	NULL_VALUE: z.string().optional(),
	TEST_OBJECT: z.string(),
});

let isFetchDisabled = false;

function buildLoaderOption(fetchInstance: typeof fetch, flags = new Set<'no-cache' | 'no-silent' | 'strict-validate'>()) {
	return {
		cache: flags.has('no-cache') ? undefined : cacheInstance,
		disabled: (): boolean => isFetchDisabled,
		fetchClient: fetchInstance,
		isSilent: !flags.has('no-silent'),
		logger: loggerSpy,
		validate: flags.has('strict-validate') ? strictObjectSchema : undefined,
	} satisfies Partial<FetchConfigLoaderOptions>;
}

type EnvMap = {
	API_SERVER: URL;
	NULL_VALUE: string;
	TEST_OBJECT: {
		First: string;
		Second: string;
		Third: string;
	};
};

const schema: ConfigSchema<EnvMap> = {
	API_SERVER: {notFoundError: true, parser: KeyParser.URL()},
	NULL_VALUE: {notFoundError: true, parser: KeyParser.String()},
	TEST_OBJECT: {notFoundError: true, parser: KeyParser.SemiColon(z.object({First: z.string(), Second: z.string(), Third: z.string()}))},
} as const;

let testEnv: EnvKit<EnvMap>;

describe('config variable', () => {
	beforeEach(() => {
		logSpy.mockReset();
	});
	describe('working FetchConfigLoader loader', () => {
		beforeAll(() => {
			const fetchLoader = new FetchConfigLoader(
				new Request(new URL('http://some/settings.json')),
				buildLoaderOption(mockFetch, new Set(['no-cache', 'strict-validate'])),
			);
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		describe('disabled FetchConfigLoader loader', () => {
			it('should return error', async function () {
				isFetchDisabled = true;
				expect(await testEnv.get('API_SERVER')).to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			});
		});
		describe('FetchConfigLoader loader', () => {
			beforeAll(() => {
				isFetchDisabled = false;
			});
			it('should return API_SERVER value from fetch loader', async function () {
				expect(await testEnv.get('API_SERVER')).to.be.eql(Ok(new URL(fetchResponsePayload.API_SERVER)));
				expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
				expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
				expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: successfully loaded config http://some/settings.json`);
				expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigVariables[fetch]: API_SERVER [http://localhost:123/api] from key:API_SERVER`);
				expect(logSpy.mock.calls.length).to.be.eq(4);
			});
			it('should return TEST_OBJECT value from fetch loader', async function () {
				expect(await testEnv.get('TEST_OBJECT')).to.be.eql(Ok({First: 'false', Second: 'false', Third: 'true'}));
				expect(logSpy.mock.calls[0][0]).to.be.eq(
					`ConfigVariables[fetch]: TEST_OBJECT [{"First":"false","Second":"false","Third":"true"}] from key:TEST_OBJECT`,
				);
				expect(logSpy.mock.calls.length).to.be.eq(1);
			});
			it('should return error', async function () {
				expect(await testEnv.get('NULL_VALUE')).to.be.eql(Err(new VariableLookupError('NULL_VALUE', 'Missing required value for key: NULL_VALUE')));
				expect(logSpy.mock.calls.length).to.be.eq(0);
			});
		});
		afterAll(() => {
			isFetchDisabled = false;
		});
	});
	describe('working FetchConfigLoader loader cached', () => {
		beforeAll(() => {
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockFetch));
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		describe('FetchConfigLoader loader', () => {
			it('should return API_SERVER value from fetch loader', async function () {
				expect(await testEnv.get('API_SERVER')).to.be.eql(Ok(new URL(fetchResponsePayload.API_SERVER)));
				expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
				expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
				expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: stored response in cache`);
				expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigLoader[fetch]: successfully loaded config http://some/settings.json`);
				expect(logSpy.mock.calls[4][0]).to.be.eq(`ConfigVariables[fetch]: API_SERVER [http://localhost:123/api] from key:API_SERVER`);
				expect(logSpy.mock.calls.length).to.be.eq(5);
			});
			it('should return TEST_OBJECT value from fetch loader', async function () {
				expect(await testEnv.get('TEST_OBJECT')).to.be.eql(Ok({First: 'false', Second: 'false', Third: 'true'}));
				expect(logSpy.mock.calls[0][0]).to.be.eq(
					`ConfigVariables[fetch]: TEST_OBJECT [{"First":"false","Second":"false","Third":"true"}] from key:TEST_OBJECT`,
				);
				expect(logSpy.mock.calls.length).to.be.eq(1);
			});
			it('should return error', async function () {
				expect(await testEnv.get('NULL_VALUE')).to.be.eql(Err(new VariableLookupError('NULL_VALUE', 'Missing required value for key: NULL_VALUE')));
				expect(logSpy.mock.calls.length).to.be.eq(0);
			});
		});
	});
	describe('working FetchConfigLoader loader should hit cache', () => {
		beforeAll(() => {
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockFetch));
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		describe('FetchConfigLoader loader', () => {
			beforeAll(() => {
				isFetchDisabled = false;
			});
			it('should return cached API_SERVER value from fetch loader', async function () {
				await expect(testEnv.get('API_SERVER')).resolves.to.be.eql(Ok(new URL(fetchResponsePayload.API_SERVER)));
				expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
				expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
				expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: successfully loaded config http://some/settings.json`);
				expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigVariables[fetch]: API_SERVER [http://localhost:123/api] from key:API_SERVER`);
				expect(logSpy.mock.calls.length).to.be.eq(4);
			});
			it('should return TEST_OBJECT value from fetch loader', async function () {
				expect(await testEnv.get('TEST_OBJECT')).to.be.eql(Ok({First: 'false', Second: 'false', Third: 'true'}));
				expect(logSpy.mock.calls[0][0]).to.be.eq(
					`ConfigVariables[fetch]: TEST_OBJECT [{"First":"false","Second":"false","Third":"true"}] from key:TEST_OBJECT`,
				);
				expect(logSpy.mock.calls.length).to.be.eq(1);
			});
			it('should return error', async function () {
				expect(await testEnv.get('NULL_VALUE')).to.be.eql(Err(new VariableLookupError('NULL_VALUE', 'Missing required value for key: NULL_VALUE')));
				expect(logSpy.mock.calls.length).to.be.eq(0);
			});
		});
	});
	describe('working offline FetchConfigLoader', () => {
		beforeAll(() => {
			cacheInstance.cache.clear();
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockFetchNoChange));
			cacheInstance.setState('offline');
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		it('should return error', async function () {
			expect(await testEnv.get('API_SERVER')).to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: client is offline and does not have cached response [http://some/settings.json]`);
			expect(logSpy.mock.calls.length).to.be.eq(3);
		});
	});
	describe('working wrong content type FetchConfigLoader', () => {
		beforeAll(() => {
			cacheInstance.cache.clear();
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockFetchWrongContentType));
			cacheInstance.setState(undefined);
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		it('should return error', async function () {
			expect(await testEnv.get('API_SERVER')).to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: stored response in cache`);
			expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigLoader[fetch]: unsupported content-type plain/text [http://some/settings.json]`);
			expect(logSpy.mock.calls.length).to.be.eq(4);
		});
	});
	describe('working offline FetchConfigLoader', () => {
		beforeAll(() => {
			cacheInstance.cache.clear();
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockFetchWrongContentType));
			cacheInstance.setState('offline');
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		it('should return error', async function () {
			expect(await testEnv.get('API_SERVER')).to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: stored response in cache`);
			expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigLoader[fetch]: unsupported content-type plain/text [http://some/settings.json]`);
			expect(logSpy.mock.calls.length).to.be.eq(4);
		});
	});
	describe('working offline FetchConfigLoader', () => {
		beforeAll(() => {
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), {
				...buildLoaderOption(mockFetchWrongContentType),
				isSilent: false, // get loader errors out
			});
			cacheInstance.setState('offline');
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {loaderError: 'throws', logger: loggerSpy});
		});
		it('should return error', async function () {
			expect(await testEnv.get('API_SERVER')).to.be.eql(
				Err(new VariableError('ConfigLoader[fetch]: unsupported content-type plain/text [http://some/settings.json]')),
			);
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: returning cached response from http://some/settings.json`);
			expect(logSpy.mock.calls.length).to.be.eq(2);
		});
	});
	describe('working FetchConfigLoader error loader', () => {
		beforeAll(() => {
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockFetchError));
			cacheInstance.setState(undefined);
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		it('should return error', async function () {
			expect(await testEnv.get('API_SERVER')).to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: failed to fetch error: test`);
			expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigLoader[fetch]: unsupported content-type plain/text [http://some/settings.json]`);
			expect(logSpy.mock.calls.length).to.be.eq(4);
		});
	});
	describe('working FetchConfigLoader error from cache get', () => {
		beforeAll(() => {
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockFetchNoChange));
			cacheInstance.setState('get');
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		it('should return error', async function () {
			expect(await testEnv.get('API_SERVER')).to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: failed to get cached response: test`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls.length).to.be.eq(3);
		});
	});
	describe('working FetchConfigLoader error from cache store', () => {
		beforeAll(() => {
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockFetch));
			cacheInstance.setState('store');
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		it('should return error', async function () {
			await expect(testEnv.get('API_SERVER')).resolves.to.be.eql(Ok(new URL(fetchResponsePayload.API_SERVER)));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: failed to store response in cache: test`);
			expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigLoader[fetch]: successfully loaded config http://some/settings.json`);
			expect(logSpy.mock.calls[4][0]).to.be.eq(`ConfigVariables[fetch]: API_SERVER [http://localhost:123/api] from key:API_SERVER`);
			expect(logSpy.mock.calls.length).to.be.eq(5);
		});
	});
	describe('error from JSON parser with broken JSON', () => {
		beforeAll(() => {
			cacheInstance.cache.clear();
			cacheInstance.setState(undefined);
			const fetchLoader = new FetchConfigLoader(
				new Request(new URL('http://some/settings.json')),
				buildLoaderOption(mockBrokenJsonFetch, new Set(['no-silent'])),
			);
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		it('should return error', async function () {
			await expect(testEnv.get('API_SERVER')).resolves.to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: stored response in cache`);
			expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigLoader[fetch]: JSON error: Unexpected token 'h', "hello world!" is not valid JSON`);
			expect(logSpy.mock.calls.length).to.be.eq(4);
		});
	});
	describe('error from JSON parser with broken JSON', () => {
		beforeAll(() => {
			cacheInstance.cache.clear();
			cacheInstance.setState(undefined);
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockBrokenJsonFetch));
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		it('should return error', async function () {
			await expect(testEnv.get('API_SERVER')).resolves.to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: stored response in cache`);
			expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigLoader[fetch]: JSON error: Unexpected token 'h', "hello world!" is not valid JSON`);
			expect(logSpy.mock.calls.length).to.be.eq(4);
		});
	});
	describe('error from validator with array JSON', () => {
		beforeAll(() => {
			cacheInstance.cache.clear();
			cacheInstance.setState(undefined);
			const fetchLoader = new FetchConfigLoader(
				new Request(new URL('http://some/settings.json')),
				buildLoaderOption(mockArrayJsonFetch, new Set(['no-silent'])),
			);
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		it('should return error', async function () {
			await expect(testEnv.get('API_SERVER')).resolves.to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: stored response in cache`);
			expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigLoader[fetch]: response is not a valid JSON object`);
			expect(logSpy.mock.calls.length).to.be.eq(4);
		});
	});
	describe('error from strict validator', () => {
		beforeAll(() => {
			cacheInstance.cache.clear();
			cacheInstance.setState(undefined);
			const fetchLoader = new FetchConfigLoader(
				new Request(new URL('http://some/settings.json')),
				buildLoaderOption(mockFetchNotStrictValid, new Set(['no-silent', 'strict-validate'])),
			);
			testEnv = new EnvKit<EnvMap>(schema, [fetchLoader], {logger: loggerSpy});
		});
		it('should return error', async function () {
			await expect(testEnv.get('API_SERVER')).resolves.to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: stored response in cache`);
			expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigLoader[fetch]: validation failed:\n- Invalid URL (path: API_SERVER)`);
			expect(logSpy.mock.calls.length).to.be.eq(4);
		});
	});
	describe('Test module loading', () => {
		it('test CJS loading', () => {
			const {FetchConfigLoader} = require('@luolapeikko/core-env-fetch');
			expect(FetchConfigLoader).toBeInstanceOf(Object);
		});
		it('test ESM loading', async () => {
			const {FetchConfigLoader} = await import('@luolapeikko/core-env-fetch');
			expect(FetchConfigLoader).toBeInstanceOf(Object);
		});
	});
});
