import {type ILoggerLike, LogLevel} from '@avanio/logger-like';
import {EnvKit, KeyParser, type OverrideKeyMap, VariableLookupError} from '@luolapeikko/core-env';
import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import EventEmitter from 'events';
import {
	type IHydrateOptions,
	type IPersistSerializer,
	type IStorageDriver,
	MemoryStorageDriver,
	type StorageDriverEventsMap,
	TachyonBandwidth,
} from 'tachyon-drive';
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
let configMemoryDriver: MemoryStorageDriver<TachyonConfigStoreType, unknown>;

class BrokenDriver extends EventEmitter<StorageDriverEventsMap<TachyonConfigStoreType>> implements IStorageDriver<TachyonConfigStoreType> {
	bandwidth = TachyonBandwidth.Small;
	isInitialized = false;
	name = 'broken';
	errorState: 'hydrate' | 'store' | undefined;
	init(): boolean | Promise<boolean> {
		throw new Error('Method not implemented.');
	}
	initResult(): IResult<boolean> | Promise<IResult<boolean>> {
		throw new Error('Method not implemented.');
	}
	store(_data: TachyonConfigStoreType): void | Promise<void> {
		if (this.errorState === 'store') {
			throw new Error('Method not implemented.');
		}
	}
	storeResult(_data: TachyonConfigStoreType): IResult<void> | Promise<IResult<void>> {
		if (this.errorState === 'store') {
			return Err(new Error('Method not implemented.'));
		}
		return Ok();
	}
	hydrate(_options?: IHydrateOptions): TachyonConfigStoreType | Promise<TachyonConfigStoreType | undefined> | undefined {
		if (this.errorState === 'hydrate') {
			throw new Error('Method not implemented.');
		}
		return undefined;
	}
	hydrateResult(_options?: IHydrateOptions): IResult<TachyonConfigStoreType | undefined> | Promise<IResult<TachyonConfigStoreType | undefined>> {
		if (this.errorState === 'hydrate') {
			return Err(new Error('Method not implemented.'));
		}
		return Ok(undefined);
	}
	clear(): void | Promise<void> {
		throw new Error('Method not implemented.');
	}
	clearResult(): IResult<void> | Promise<IResult<void>> {
		throw new Error('Method not implemented.');
	}
	unload(): boolean | Promise<boolean> {
		throw new Error('Method not implemented.');
	}
	unloadResult(): IResult<boolean> | Promise<IResult<boolean>> {
		throw new Error('Method not implemented.');
	}
	clone(_data: TachyonConfigStoreType): TachyonConfigStoreType {
		throw new Error('Method not implemented.');
	}
	cloneResult(_data: TachyonConfigStoreType): IResult<TachyonConfigStoreType> {
		throw new Error('Method not implemented.');
	}
	toJSON(): {name: string; bandwidth: TachyonBandwidth; processor?: string | undefined; serializer: string} {
		throw new Error('Method not implemented.');
	}
	toString(): string {
		throw new Error('Method not implemented.');
	}
	setBroken(state: 'hydrate' | 'store') {
		this.errorState = state;
	}
}

const brokenDriver = new BrokenDriver();

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

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
				configMemoryDriver = new MemoryStorageDriver('MemoryStorageDriver', serializer as IPersistSerializer<TachyonConfigStoreType, unknown>, null);
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
			it('should reload last driver instance', async function () {
				configMemoryDriver.removeAllListeners();
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
				await loader.set('ENVVAR1', 'value1');
				expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[unit-test]: loader of type unit-test is initialized`);
				expect(logSpy.mock.calls[1][0]).to.be.eq(`TachyonConfigLoader: Loaded 1 entries from store`);
				expect(logSpy.mock.calls[2][0]).to.be.eq(`ConfigLoader[unit-test]: set key ENVVAR1`);
				expect(logSpy.mock.calls[3][0]).to.be.eq(`TachyonConfigLoader: Stored 1 entries to store`);
				expect(logSpy.mock.calls.length).to.be.eql(4);
			});
			it('should reload values from emit', async function () {
				configMemoryDriver.emit('update', undefined);
				await sleep(10);
				await loader.set('ENVVAR1', 'value1');
				expect(logSpy.mock.calls[0][0]).to.be.eq(`TachyonConfigLoader: Loaded 1 entries from store`);
				expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[unit-test]: set key ENVVAR1`);
				expect(logSpy.mock.calls[2][0]).to.be.eq(`TachyonConfigLoader: Stored 1 entries to store`);
				expect(logSpy.mock.calls.length).to.be.eql(3);
			});
			it('should should clear store', async function () {
				await expect(loader.clear()).resolves.to.be.eql(Ok());
				expect(logSpy.mock.calls[0][0]).to.be.eq(`TachyonConfigLoader: Stored 0 entries to store`);
				expect(logSpy.mock.calls.length).to.be.eql(1);
			});
		});
	});
	describe('Test disabled loader', () => {
		it('should not load', async function () {
			const loader = new TachyonConfigLoader(configMemoryDriver, {disabled: true}, undefined, 'unit-test');
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
			await expect(testEnv.get('ENVVAR1')).resolves.to.be.eql(Err(new VariableLookupError('ENVVAR1', 'Missing required value for key: ENVVAR1')));
			await loader.set('ENVVAR1', 'value1');
			expect(logSpy.mock.calls.length).to.be.eql(0);
		});
	});
	describe('Test broken loader', () => {
		it('should not load', async function () {
			const loader = new TachyonConfigLoader(brokenDriver, {disabled: false}, undefined, 'unit-test');
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
			brokenDriver.setBroken('hydrate');
			await expect(testEnv.get('ENVVAR1')).resolves.to.be.eql(Err(new VariableLookupError('ENVVAR1', 'Missing required value for key: ENVVAR1')));
			brokenDriver.setBroken('store');
			await loader.set('ENVVAR1', 'value1');
			expect(logSpy.mock.calls[0][0]).to.be.eq(`Method not implemented.`);
			expect(logSpy.mock.calls.length).to.be.eql(1);
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
