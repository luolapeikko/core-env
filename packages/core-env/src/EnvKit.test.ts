import type {ILoggerLike} from '@avanio/logger-like';
import {Err, Ok} from '@luolapeikko/result-option';
import {describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {EnvKit} from './EnvKit';
import {MemoryLoader} from './loaders/MemoryLoader';
import {ProcessEnvLoader} from './loaders/ProcessEnvLoader';
import {ReactEnvLoader} from './loaders/ReactEnvLoader';
import {KeyParser} from './parsers/KeyParser';
import {VariableLookupError} from './VariableLookupError';

const strictValue = z.enum(['one', 'two'] as const);

const objectValue = z.object({
	keyA: z.string(),
	keyB: z.string(),
});

type EnvConfig = {
	key1: string;
	key2: boolean;
	key3: number;
	key4: z.infer<typeof strictValue>;
	key5: z.infer<typeof objectValue>;
	key6: z.infer<typeof objectValue>;
	key7: string;
	key8: string;
	key9?: string;
};

const spy = vi.fn();
const loggerSpy: ILoggerLike = {
	debug: spy,
	error: spy,
	info: spy,
	trace: spy,
	warn: spy,
};

const memLoader = new MemoryLoader({overrideKeys: {key7: 'override7'}});

const config = new EnvKit<EnvConfig>(
	{
		key1: {
			notFoundError: true,
			parser: KeyParser.String(),
		},
		key2: {
			notFoundError: true,
			parser: KeyParser.Boolean(),
		},
		key3: {
			notFoundError: true,
			parser: KeyParser.Integer(),
		},
		key4: {
			notFoundError: true,
			parser: KeyParser.String(strictValue),
		},
		key5: {
			notFoundError: true,
			parser: KeyParser.JSON(objectValue),
		},
		key6: {
			notFoundError: true,
			parser: KeyParser.SemiColon(objectValue),
		},
		key7: {
			notFoundError: true,
			parser: KeyParser.String(),
		},
		key8: {
			defaultValue: 'default',
			parser: KeyParser.String(),
		},
		key9: {
			logFormat: 'hidden',
			parser: KeyParser.String(),
		},
	},
	[new ProcessEnvLoader(), new ReactEnvLoader(), memLoader],
	{logger: loggerSpy},
);

describe('Test formatUtils', function () {
	describe('formatKey', function () {
		it('should parse values', async function () {
			await memLoader.set('key1', 'value');
			await expect(config.get('key1')).to.resolves.toStrictEqual(Ok('value'));
		});
		it('should parse values', async function () {
			await memLoader.set('key2', 'true');
			await expect(config.get('key2')).to.resolves.toStrictEqual(Ok(true));
			await expect(config.getString('key2')).to.resolves.toStrictEqual(Ok('true'));
		});
		it('should parse values', async function () {
			await memLoader.set('key3', '56');
			await expect(config.get('key3')).to.resolves.toStrictEqual(Ok(56));
		});
		it('should parse values', async function () {
			await memLoader.set('key4', 'one');
			await expect(config.get('key4')).to.resolves.toStrictEqual(Ok('one'));
		});
		it('should parse values', async function () {
			await memLoader.set('key5', '{"keyA":"value","keyB":"56"}');
			await expect(config.get('key5')).to.resolves.toStrictEqual(Ok({keyA: 'value', keyB: '56'}));
		});
		it('should parse values', async function () {
			await memLoader.set('key6', 'keyA=value;keyB=56');
			await expect(config.get('key6')).to.resolves.toStrictEqual(Ok({keyA: 'value', keyB: '56'}));
		});
		it('should parse values', async function () {
			await memLoader.set('key1', undefined);
			await expect(config.get('key1')).to.resolves.toStrictEqual(Err(new VariableLookupError('key1', 'Missing required value for key: key1')));
		});
		it('should parse values', async function () {
			await memLoader.set('key1', undefined);
			await expect(config.get('_unknown_' as any)).to.resolves.toStrictEqual(
				Err(new VariableLookupError('_unknown_', `Key "_unknown_" is not defined in schema`)),
			);
		});
		it('should parse values', async function () {
			await memLoader.set('key7', 'value');
			await expect(config.getEntry('key7')).to.resolves.toStrictEqual(Ok({loaderType: 'memory', path: 'key:override7', value: 'value'}));
		});
		it('should parse values', async function () {
			await expect(config.get('key8')).to.resolves.toStrictEqual(Ok('default'));
		});
		it('should parse values', async function () {
			await expect(config.get('key9')).to.resolves.toStrictEqual(Ok(undefined));
		});
	});
	describe('getResultEntryList', function () {
		it('should get loader entry list', async function () {
			await memLoader.set('key1', 'value');
			const entries = [];
			for await (const entry of config.getResultEntryList('key1')) {
				entries.push(entry);
			}
			expect(entries).to.be.eql([
				{error: undefined, loaderType: 'process-env', path: 'process.env.key1', value: undefined},
				{error: undefined, loaderType: 'react-process-env', path: 'process.env.REACT_APP_key1', value: undefined},
				{error: undefined, loaderType: 'memory', path: 'key:key1', value: 'value'},
			]);
		});
	});
	describe('Test module loading', () => {
		it('test CJS loading', () => {
			const {EnvKit} = require('@luolapeikko/core-env');
			expect(EnvKit).toBeInstanceOf(Object);
		});
		it('test ESM loading', async () => {
			const {EnvKit} = await import('@luolapeikko/core-env');
			expect(EnvKit).toBeInstanceOf(Object);
		});
	});
});
