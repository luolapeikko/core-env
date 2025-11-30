import type {ILoggerLike} from '@avanio/logger-like';
import type {GetSecretOptions, KeyVaultSecret} from '@azure/keyvault-secrets';
import {EnvKit, KeyParser, VariableLookupError} from '@luolapeikko/core-env';
import {Err, Ok} from '@luolapeikko/result-option';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AzureSecretsConfigLoader} from './AzureSecretsConfigLoader';

vi.mock('@azure/keyvault-secrets', () => {
	return {
		SecretClient: vi.fn().mockImplementation(function () {
			return {
				getSecret: vi.fn().mockImplementation((secretName: string, _options?: GetSecretOptions): Promise<KeyVaultSecret> => {
					if (secretName === 'some-api-server') {
						return Promise.resolve({
							name: 'some-api-server',
							properties: {name: 'some-api-server', vaultUrl: 'http://vault.localhost'},
							value: 'http://localhost:3000',
						});
					}
					return Promise.reject(new Error(`secret ${secretName} not found`));
				}),
			};
		}),
	};
});

const logSpy = vi.fn();
const loggerSpy: ILoggerLike = {
	debug: logSpy,
	error: logSpy,
	info: logSpy,
	trace: logSpy,
	warn: logSpy,
};

type EnvMap = {
	API_SERVER: URL;
	BROKEN: string;
	PORT?: number; // not in KV
};

const kvLoader = new AzureSecretsConfigLoader<EnvMap>(
	{API_SERVER: 'some-api-server', BROKEN: 'some-broken', PORT: undefined},
	{
		cacheLogger: loggerSpy,
		credentials: {
			getToken() {
				return Promise.resolve({expiresOnTimestamp: Date.now() + 60 * 60 * 1000, token: 'test-token'});
			},
		},
		errExpireMs: 0,
		expireMs: 60,
		logger: loggerSpy,
		url: 'http://vault.localhost',
	},
);

const testEnv = new EnvKit<EnvMap>(
	{
		API_SERVER: {notFoundError: true, parser: KeyParser.URL()},
		BROKEN: {notFoundError: true, parser: KeyParser.String()},
		PORT: {parser: KeyParser.Integer()},
	},
	[kvLoader],
	{logger: loggerSpy},
);

describe('AzureSecretsConfigLoader', () => {
	beforeEach(() => {
		logSpy.mockReset();
	});
	describe('AzureSecretsConfigLoader loader', () => {
		it('should load KV secret and get API_SERVER value', {timeout: 60000}, async function () {
			await expect(testEnv.get('API_SERVER')).resolves.to.be.eql(Ok(new URL('http://localhost:3000')));
			expect(logSpy.mock.calls.length).to.be.eq(3);
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[azure-secrets]: getting some-api-server from http://vault.localhost`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[azure-secrets]: loaded secret some-api-server from http://vault.localhost`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(
				`ConfigVariables[azure-secrets]: API_SERVER [http://localhost:3000/] from http://vault.localhost/some-api-server`,
			);
		});
		it('shuold not load KV secret if already loaded', async function () {
			await expect(testEnv.get('API_SERVER')).resolves.to.be.eql(Ok(new URL('http://localhost:3000')));
			expect(logSpy.mock.calls.length).to.be.eq(0);
		});
		it('load KV value again after reload (cache timeouts)', async function () {
			kvLoader.reload(); // clears cache
			await expect(testEnv.get('API_SERVER')).resolves.to.be.eql(Ok(new URL('http://localhost:3000')));
			expect(logSpy.mock.calls.length).to.be.eq(2); // we already have seen the variable log once as it's same value
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[azure-secrets]: getting some-api-server from http://vault.localhost`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[azure-secrets]: loaded secret some-api-server from http://vault.localhost`);
		});
		it('should not load KV secret if not in keySecretMap', async function () {
			await expect(testEnv.get('PORT')).resolves.to.be.eql(Ok(undefined));
			expect(logSpy.mock.calls.length).to.be.eq(1);
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables: PORT [undefined]`);
		});
		it('should not load KV secret if not found', async function () {
			await expect(testEnv.get('BROKEN')).resolves.to.be.eql(Err(new VariableLookupError('BROKEN', 'Missing required value for key: BROKEN')));
			expect(logSpy.mock.calls.length).to.be.eq(2);
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[azure-secrets]: getting some-broken from http://vault.localhost`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(
				`ConfigLoader[azure-secrets]: error loading secret "some-broken" from http://vault.localhost: secret some-broken not found`,
			);
		});
	});
	describe('Test module loading', () => {
		it('test CJS loading', () => {
			const {AzureSecretsConfigLoader} = require('@luolapeikko/core-env-azurekv');
			expect(AzureSecretsConfigLoader).toBeInstanceOf(Object);
		});
		it('test ESM loading', async () => {
			const {AzureSecretsConfigLoader} = await import('@luolapeikko/core-env-azurekv');
			expect(AzureSecretsConfigLoader).toBeInstanceOf(Object);
		});
	});
});
