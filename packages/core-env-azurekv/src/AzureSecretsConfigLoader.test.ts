import type {ILoggerLike} from '@avanio/logger-like';
import {DefaultAzureCredential} from '@azure/identity';
import {EnvKit, KeyParser} from '@luolapeikko/core-env';
import {Ok} from '@luolapeikko/result-option';
import dotenv from 'dotenv';
import * as path from 'path';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AzureSecretsConfigLoader} from './AzureSecretsConfigLoader';

dotenv.config({path: path.resolve(__dirname, '../.env'), quiet: true});

const kvMongoKey = process.env.KV_MONGO_KEY ?? 'API_SERVER';
const kvUri = process.env.KV_URI ?? 'http://localhost';

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
	PORT?: number; // not in KV
};

const kvLoader = new AzureSecretsConfigLoader<EnvMap>(
	{API_SERVER: kvMongoKey, PORT: undefined},
	{credentials: new DefaultAzureCredential(), logger: loggerSpy, url: kvUri},
);

const testEnv = new EnvKit<EnvMap>(
	{
		API_SERVER: {notFoundError: true, parser: KeyParser.URL()},
		PORT: {parser: KeyParser.Integer()},
	},
	[kvLoader],
	{logger: loggerSpy},
);

describe.skipIf(!process.env.KV_URI || !process.env.KV_MONGO_KEY || !process.env.MONGO_URL)('AzureSecretsConfigLoader', () => {
	beforeEach(() => {
		logSpy.mockReset();
	});
	describe('AzureSecretsConfigLoader loader', () => {
		it('should load KV secret and get API_SERVER value', {timeout: 60000}, async function () {
			expect(await testEnv.get('API_SERVER')).to.be.eql(Ok(new URL(process.env.MONGO_URL ?? '')));
			expect(logSpy.mock.calls.length).to.be.eq(3);
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[azure-secrets]: getting ${kvMongoKey} from ${kvUri}`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[azure-secrets]: loaded secret ${kvMongoKey} from ${kvUri}`);
			expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigVariables[azure-secrets]: API_SERVER [${process.env.MONGO_URL}] from ${kvUri}${kvMongoKey}`);
		});
		it('shuold not load KV secret if already loaded', async function () {
			expect(await testEnv.get('API_SERVER')).to.be.eql(Ok(new URL(process.env.MONGO_URL ?? '')));
			expect(logSpy.mock.calls.length).to.be.eq(0);
		});
		it('load KV value again after reload (cache timeouts)', async function () {
			kvLoader.reload(); // clears cache
			expect(await testEnv.get('API_SERVER')).to.be.eql(Ok(new URL(process.env.MONGO_URL ?? '')));
			expect(logSpy.mock.calls.length).to.be.eq(2); // we already have seen the variable log once as it's same value
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[azure-secrets]: getting ${kvMongoKey} from ${kvUri}`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[azure-secrets]: loaded secret ${kvMongoKey} from ${kvUri}`);
		});
		it('should not load KV secret if not in keySecretMap', async function () {
			expect(await testEnv.get('PORT')).to.be.eql(Ok(undefined));
			expect(logSpy.mock.calls.length).to.be.eq(1);
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables: PORT [undefined]`);
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
