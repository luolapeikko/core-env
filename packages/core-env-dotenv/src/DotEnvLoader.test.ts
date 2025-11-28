import type {ILoggerLike} from '@avanio/logger-like';
import {EnvKit, KeyParser, VariableLookupError} from '@luolapeikko/core-env';
import {Err, Ok} from '@luolapeikko/result-option';
import * as path from 'path';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {DotEnvLoader} from './';

const logSpy = vi.fn();

const testLogger: ILoggerLike = {
	debug: logSpy,
	error: logSpy,
	info: logSpy,
	trace: logSpy,
	warn: logSpy,
};

type EnvMap = {
	ENVVAR1: string;
	ENVVAR2: string | undefined;
	ENVVAR3: string;
};

const envPath = path.resolve(`${__dirname}/../.env.test`);
const envLoader = new DotEnvLoader({fileName: envPath});

const testEnv = new EnvKit<EnvMap>(
	{
		ENVVAR1: {notFoundError: true, parser: KeyParser.String()},
		ENVVAR2: {parser: KeyParser.String()},
		ENVVAR3: {notFoundError: true, parser: KeyParser.String()},
	},
	[envLoader],
	{logger: testLogger},
);

describe('config variable', () => {
	beforeEach(() => {
		logSpy.mockReset();
	});
	describe('DotEnvLoader loader', () => {
		it('should return ENVVAR1', async function () {
			expect(await testEnv.get('ENVVAR1')).to.be.eql(Ok('value1'));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[dotenv]: ENVVAR1 [value1] from key:ENVVAR1`);
		});
		it('should return ENVVAR2 as undefined', async function () {
			expect(await testEnv.get('ENVVAR2')).to.be.eql(Ok(undefined));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables: ENVVAR2 [undefined]`);
		});
		it('should return error', async function () {
			expect(await testEnv.get('ENVVAR3')).to.be.eql(Err(new VariableLookupError('ENVVAR3', 'Missing required value for key: ENVVAR3')));
		});
	});
	describe('Test module loading', () => {
		it('test CJS loading', () => {
			const {DotEnvLoader} = require('@luolapeikko/core-env-dotenv');
			expect(DotEnvLoader).toBeInstanceOf(Object);
		});
		it('test ESM loading', async () => {
			const {DotEnvLoader} = await import('@luolapeikko/core-env-dotenv');
			expect(DotEnvLoader).toBeInstanceOf(Object);
		});
	});
});
