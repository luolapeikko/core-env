import {type ILoggerLike, LogLevel} from '@avanio/logger-like';
import {EnvKit, KeyParser, type OverrideKeyMap, VariableLookupError} from '@luolapeikko/core-env';
import {Err, Ok} from '@luolapeikko/result-option';
import {type IPersistSerializer, MemoryStorageDriver} from 'tachyon-drive';
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {TachyonConfigLoader, TachyonConfigSerializer, type TachyonConfigStoreType} from '.';

const logSpy = vi.fn();

const dataSchema = z.object({
	_v: z.literal(1),
	data: z.record(z.string().min(1), z.string()),
});

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

let testEnv: EnvKit<EnvMap>;
let loader: TachyonConfigLoader<OverrideKeyMap>;

const tests = {
	'JsonArrayBuffer driver': TachyonConfigSerializer.jsonArrayBuffer(dataSchema),
	'JsonBuffer driver': TachyonConfigSerializer.jsonBuffer(dataSchema),
	'JsonString driver': TachyonConfigSerializer.jsonString(dataSchema),
} as const;

describe('config variable', () => {
	beforeEach(() => {
		logSpy.mockReset();
	});
	Object.entries(tests).forEach(([driverName, serializer]) => {
		describe(`TachyonConfigLoader with ${driverName}`, () => {
			beforeAll(() => {
				const configMemoryDriver = new MemoryStorageDriver('MemoryStorageDriver', serializer as IPersistSerializer<TachyonConfigStoreType, unknown>, null);
				loader = new TachyonConfigLoader(configMemoryDriver, {logger: testLogger}, undefined, 'unit-test');
				testEnv = new EnvKit<EnvMap>(
					{
						ENVVAR1: {notFoundError: true, parser: KeyParser.String()},
						ENVVAR2: {parser: KeyParser.String()},
						ENVVAR3: {notFoundError: true, parser: KeyParser.String()},
					},
					[loader],
					{logger: testLogger},
				);
				loader.logger.allLogMapSet(LogLevel.Debug);
			});
			it('should add value to loader', async function () {
				await loader.set('ENVVAR1', 'value1');
				expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[unit-test]: loader of type unit-test is initialized`);
				expect(logSpy.mock.calls[1][0]).to.be.eq(`TachyonConfigLoader: Loaded 0 entries from store`);
				expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[unit-test]: set key ENVVAR1`);
				expect(logSpy.mock.calls[3][0]).to.be.eq(`TachyonConfigLoader: Stored 1 entries to store`);
				expect(logSpy.mock.calls.length).to.be.eql(4);
			});
			it('should return ENVVAR1', async function () {
				expect(await testEnv.get('ENVVAR1')).to.be.eql(Ok('value1'));
				expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[unit-test]: key ENVVAR1`);
				expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigVariables[unit-test]: ENVVAR1 [value1] from key:ENVVAR1`);
				expect(logSpy.mock.calls.length).to.be.eql(2);
			});
			it('should return ENVVAR2 as undefined', async function () {
				expect(await testEnv.get('ENVVAR2')).to.be.eql(Ok(undefined));
				expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[unit-test]: key ENVVAR2`);
				expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[unit-test]: key ENVVAR2 not found`);
				expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigVariables: ENVVAR2 [undefined]`);
				expect(logSpy.mock.calls.length).to.be.eql(3);
			});
			it('should return error', async function () {
				expect(await testEnv.get('ENVVAR3')).to.be.eql(Err(new VariableLookupError('ENVVAR3', 'Missing required value for key: ENVVAR3')));
				expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[unit-test]: key ENVVAR3`);
				expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[unit-test]: key ENVVAR3 not found`);
				expect(logSpy.mock.calls.length).to.be.eql(2);
			});
		});
	});
	describe('Test module loading', () => {
		it('test CJS loading', () => {
			const {TachyonConfigLoader} = require('@luolapeikko/core-env-tachyon');
			expect(TachyonConfigLoader).toBeInstanceOf(Object);
		});
		it('test ESM loading', async () => {
			const {TachyonConfigLoader} = await import('@luolapeikko/core-env-tachyon');
			expect(TachyonConfigLoader).toBeInstanceOf(Object);
		});
	});
});
