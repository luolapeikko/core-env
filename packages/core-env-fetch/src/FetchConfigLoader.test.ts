import type {ILoggerLike} from '@avanio/logger-like';
import {EnvKit, KeyParser, VariableError, VariableLookupError} from '@luolapeikko/core-env';
import {Err, Ok} from '@luolapeikko/result-option';
import etag from 'etag';
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {FetchConfigLoader, type FetchConfigLoaderOptions} from './FetchConfigLoader';
import type {IRequestCache} from './interfaces/IRequestCache';

let isOnline = true;
const resCache = new Map<string, Response>();

const logSpy = vi.fn();
const loggerSpy: ILoggerLike = {
	debug: logSpy,
	error: logSpy,
	info: logSpy,
	trace: logSpy,
	warn: logSpy,
};

export const reqCacheSetup: IRequestCache = {
	getRequest(req) {
		return Promise.resolve(Ok(resCache.get(req.url)?.clone()));
	},
	isOnline() {
		return isOnline;
	},
	storeRequest(req, res) {
		resCache.set(req.url, res.clone());
		return Promise.resolve(Ok());
	},
};

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

function mockFetchError(_input: globalThis.URL | RequestInfo, _init?: RequestInit): Promise<Response> {
	return Promise.reject(new Error('test'));
}

function mockFetchNoChange(_input: globalThis.URL | RequestInfo, _init?: RequestInit): Promise<Response> {
	return Promise.resolve(new Response(undefined, {status: 304}));
}

function mockFetchWrongContentType(_input: globalThis.URL | RequestInfo, _init?: RequestInit): Promise<Response> {
	return Promise.resolve(new Response('hello world!', {headers: {'Content-Type': 'plain/text'}, status: 200}));
}

const fetchInstance: typeof fetch = mockFetch;

const stringRecordSchema = z.record(z.string().min(1), z.string());
let isFetchDisabled = true;

function buildLoaderOption(fetchInstance: typeof fetch) {
	return {
		cache: reqCacheSetup,
		disabled: (): boolean => isFetchDisabled,
		fetchClient: fetchInstance,
		logger: loggerSpy,
		validate: stringRecordSchema,
	} satisfies Partial<FetchConfigLoaderOptions>;
}

/* const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), fetchLoaderOptions);

const errorFetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), () => {
	throw new Error('test');
}); */

type EnvMap = {
	API_SERVER: URL;
	NULL_VALUE: string;
	TEST_OBJECT: {
		First: string;
		Second: string;
		Third: string;
	};
};

let testEnv: EnvKit<EnvMap>;

describe('config variable', () => {
	beforeEach(() => {
		logSpy.mockReset();
	});
	describe('working FetchConfigLoader loader', () => {
		beforeAll(() => {
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(fetchInstance));
			testEnv = new EnvKit<EnvMap>(
				{
					API_SERVER: {notFoundError: true, parser: KeyParser.URL()},
					NULL_VALUE: {notFoundError: true, parser: KeyParser.String()},
					TEST_OBJECT: {notFoundError: true, parser: KeyParser.SemiColon(z.object({First: z.string(), Second: z.string(), Third: z.string()}))},
				},
				[fetchLoader],
				{logger: loggerSpy},
			);
		});
		describe('disabled FetchConfigLoader loader', () => {
			it('should return error', async function () {
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
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(fetchInstance));
			testEnv = new EnvKit<EnvMap>(
				{
					API_SERVER: {notFoundError: true, parser: KeyParser.URL()},
					NULL_VALUE: {notFoundError: true, parser: KeyParser.String()},
					TEST_OBJECT: {notFoundError: true, parser: KeyParser.SemiColon(z.object({First: z.string(), Second: z.string(), Third: z.string()}))},
				},
				[fetchLoader],
				{logger: loggerSpy},
			);
		});
		describe('FetchConfigLoader loader', () => {
			beforeAll(() => {
				isFetchDisabled = false;
			});
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
	describe('working offline FetchConfigLoader', () => {
		beforeAll(() => {
			resCache.clear();
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockFetchNoChange));
			isOnline = false;
			testEnv = new EnvKit<EnvMap>(
				{
					API_SERVER: {notFoundError: true, parser: KeyParser.URL()},
					NULL_VALUE: {notFoundError: true, parser: KeyParser.String()},
					TEST_OBJECT: {notFoundError: true, parser: KeyParser.SemiColon(z.object({First: z.string(), Second: z.string(), Third: z.string()}))},
				},
				[fetchLoader],
				{logger: loggerSpy},
			);
		});
		it('should return error', async function () {
			expect(await testEnv.get('API_SERVER')).to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: client is offline and does not have cached response [http://some/settings.json]`);
			expect(logSpy.mock.calls.length).to.be.eq(3);
		});
	});
	describe('working offline FetchConfigLoader', () => {
		beforeAll(() => {
			resCache.clear();
			const fetchLoader = new FetchConfigLoader(new Request(new URL('http://some/settings.json')), buildLoaderOption(mockFetchWrongContentType));
			isOnline = false;
			testEnv = new EnvKit<EnvMap>(
				{
					API_SERVER: {notFoundError: true, parser: KeyParser.URL()},
					NULL_VALUE: {notFoundError: true, parser: KeyParser.String()},
					TEST_OBJECT: {notFoundError: true, parser: KeyParser.SemiColon(z.object({First: z.string(), Second: z.string(), Third: z.string()}))},
				},
				[fetchLoader],
				{logger: loggerSpy},
			);
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
			isOnline = false;
			testEnv = new EnvKit<EnvMap>(
				{
					API_SERVER: {notFoundError: true, parser: KeyParser.URL()},
					NULL_VALUE: {notFoundError: true, parser: KeyParser.String()},
					TEST_OBJECT: {notFoundError: true, parser: KeyParser.SemiColon(z.object({First: z.string(), Second: z.string(), Third: z.string()}))},
				},
				[fetchLoader],
				{loaderError: 'throws', logger: loggerSpy},
			);
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
			isOnline = true;
			testEnv = new EnvKit<EnvMap>(
				{
					API_SERVER: {notFoundError: true, parser: KeyParser.URL()},
					NULL_VALUE: {notFoundError: true, parser: KeyParser.String()},
					TEST_OBJECT: {notFoundError: true, parser: KeyParser.SemiColon(z.object({First: z.string(), Second: z.string(), Third: z.string()}))},
				},
				[fetchLoader],
				{logger: loggerSpy},
			);
		});
		it('should return error', async function () {
			expect(await testEnv.get('API_SERVER')).to.be.eql(Err(new VariableLookupError('API_SERVER', 'Missing required value for key: API_SERVER')));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[fetch]: loader of type fetch is initialized`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[fetch]: fetching config from http://some/settings.json`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[fetch]: failed to fetch error: test`);
			expect(logSpy.mock.calls[3][0]).to.be.eq(`ConfigLoader[fetch]: client is offline and does not have cached response [http://some/settings.json]`);
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
