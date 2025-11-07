import {Err, Ok} from '@luolapeikko/result-option';
import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {ConfigMap} from './ConfigMap';
import {EnvLoader} from './loaders/EnvLoader';
import {MemoryLoader} from './loaders/MemoryLoader';
import {ReactEnvLoader} from './loaders/ReactEnvLoader';
import {KeyParser} from './parsers/KeyParser';

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
};

const memLoader = new MemoryLoader({overrideKeys: {key7: 'override7'}});

const config = new ConfigMap<EnvConfig>(
	{
		key1: {
			parser: KeyParser.String(),
			undefinedError: true,
		},
		key2: {
			parser: KeyParser.Boolean(),
			undefinedError: true,
		},
		key3: {
			parser: KeyParser.Integer(),
			undefinedError: true,
		},
		key4: {
			parser: KeyParser.String(strictValue),
			undefinedError: true,
		},
		key5: {
			parser: KeyParser.JSON(objectValue),
			undefinedError: true,
		},
		key6: {
			parser: KeyParser.SemiColon(objectValue),
			undefinedError: true,
		},
		key7: {
			parser: KeyParser.String(),
			undefinedError: true,
		},
	},
	[new EnvLoader(), new ReactEnvLoader(), memLoader],
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
			await expect(config.get('key1')).to.resolves.toStrictEqual(Err(new Error('Missing required value for key: key1')));
		});
		it('should parse values', async function () {
			await memLoader.set('key1', undefined);
			await expect(config.get('_unknown_' as any)).to.resolves.toStrictEqual(Err(new Error(`Key "_unknown_" is not defined in schema`)));
		});
		it('should parse values', async function () {
			await memLoader.set('key7', 'value');
			await expect(config.getEntry('key7')).to.resolves.toStrictEqual(Ok({loaderType: 'memory', path: 'key:override7', value: 'value'}));
		});
	});
});
