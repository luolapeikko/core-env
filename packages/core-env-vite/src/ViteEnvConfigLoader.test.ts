import type {ILoggerLike} from '@avanio/logger-like';
import {EnvKit, KeyParser, VariableLookupError} from '@luolapeikko/core-env';
import {Err, Ok} from '@luolapeikko/result-option';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ViteEnvConfigLoader} from './index.js';

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

const envLoader = new ViteEnvConfigLoader();

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
	describe('ViteEnvConfigLoader loader', () => {
		it('should return ENVVAR1', async function () {
			import.meta.env.VITE_ENVVAR1 = 'value1';
			expect(await testEnv.get('ENVVAR1')).to.be.eql(Ok('value1'));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[vite-env]: ENVVAR1 [value1] from import.meta.env.VITE_ENVVAR1`);
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
		it('test ESM loading', async () => {
			const {ViteEnvConfigLoader} = await import('@luolapeikko/core-env-vite');
			expect(ViteEnvConfigLoader).toBeInstanceOf(Object);
		});
	});
});
