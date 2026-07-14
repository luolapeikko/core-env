import type {ILoggerLike} from '@avanio/logger-like';
import {EnvKit, KeyParser} from '@luolapeikko/core-env';
import {Ok} from '@luolapeikko/result-option';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {SecretSpecConfigLoader} from '../src/index.js';

const logSpy = vi.fn();

const testLogger: ILoggerLike = {
	debug: logSpy,
	error: logSpy,
	info: logSpy,
	trace: logSpy,
	warn: logSpy,
};

type EnvMap = {
	DATABASE_URL: string;
	SQLITE_URL: string;
};

process.env.DATABASE_URL = 'postgres://user:password@localhost:5432/mydatabase';

const envLoader = new SecretSpecConfigLoader({path: `${__dirname}/../secretspec.toml`, provider: `dotenv:${__dirname}/test_env`});

const testEnv = new EnvKit<EnvMap>(
	{
		DATABASE_URL: {notFoundError: true, parser: KeyParser.String()},
		SQLITE_URL: {notFoundError: true, parser: KeyParser.String()},
	},
	[envLoader],
	{logger: testLogger},
);

describe('config variable', () => {
	beforeEach(() => {
		logSpy.mockReset();
	});
	describe('SecretSpecConfigLoader loader', () => {
		it('should return DATABASE_URL', async function () {
			expect(await testEnv.get('DATABASE_URL')).to.be.eql(Ok('mysql://user:password@localhost:3306/mydatabase'));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[secretspec]: DATABASE_URL [mysql://user:password@localhost:3306/mydatabase] from secretspec[profiles.default] DATABASE_URL`);
		});
		it('should return SQLITE_URL', async function () {
			expect(await testEnv.get('SQLITE_URL')).to.be.eql(Ok('sqlite://./dev.db'));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[secretspec]: SQLITE_URL [sqlite://./dev.db] from secretspec[profiles.default] SQLITE_URL`);
		});
	});
	describe('Test module loading', () => {
		it('test ESM loading', async () => {
			const {SecretSpecConfigLoader} = await import('@luolapeikko/core-env-secretspec');
			expect(SecretSpecConfigLoader).toBeInstanceOf(Object);
		});
	});
});
