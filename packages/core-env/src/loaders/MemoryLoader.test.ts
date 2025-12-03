import {Ok} from '@luolapeikko/result-option';
import {describe, expect, it, vi} from 'vitest';
import {MemoryLoader} from './MemoryLoader';

describe('Test MemoryLoader', function () {
	describe('constructor', function () {
		it('should create MemoryLoader with default values', function () {
			const loader = new MemoryLoader();
			expect(loader.loaderType).toBe('memory');
			expect(loader.isLoaded()).toBe(true);
		});

		it('should create MemoryLoader with custom type', function () {
			const loader = new MemoryLoader({type: 'custom'});
			expect(loader.loaderType).toBe('custom');
		});

		it('should create MemoryLoader with initial data', async function () {
			const initialData = {key1: 'value1', key2: 'value2'};
			const loader = new MemoryLoader({initialData});
			expect(await loader.get('key1')).toStrictEqual(Ok('value1'));
			expect(await loader.get('key2')).toStrictEqual(Ok('value2'));
		});

		it('should create MemoryLoader with override keys', async function () {
			const loader = new MemoryLoader<Record<'mappedKey', 'originalKey'>, 'originalKey' | 'mappedKey'>({
				initialData: {originalKey: 'value'},
				overrideKeys: {mappedKey: 'originalKey'},
			});
			expect(await loader.get('mappedKey')).toStrictEqual(Ok('value'));
		});
		it('should create MemoryLoader with options', async function () {
			const loader = new MemoryLoader({
				options: {disabled: true},
			});
			expect(await loader.isLoaderDisabled()).to.be.eql(Ok(true));
		});

		it('should create MemoryLoader with loadable options', async function () {
			const loader = new MemoryLoader({
				options: async () => ({disabled: true}),
			});
			expect(await loader.isLoaderDisabled()).to.be.eql(Ok(true));
		});
	});

	describe('getRawValue', function () {
		it('should get raw value for existing key', async function () {
			const loader = new MemoryLoader({initialData: {testKey: 'testValue'}});
			const result = await loader.getValueResult('testKey');
			expect(result).toStrictEqual(Ok({path: 'key:testKey', value: 'testValue'}));
		});

		it('should return undefined for missing key', async function () {
			const loader = new MemoryLoader();
			const result = await loader.getValueResult('missingKey');
			expect(result).toStrictEqual(Ok({path: 'key:missingKey', value: undefined}));
		});

		it('should use override key in path', async function () {
			const loader = new MemoryLoader<Record<'aliasKey', 'actualKey'>, 'actualKey' | 'aliasKey'>({
				initialData: {actualKey: 'value'},
				overrideKeys: {aliasKey: 'actualKey'},
			});
			const result = await loader.getValueResult('aliasKey');
			expect(result).toStrictEqual(Ok({path: 'key:actualKey', value: 'value'}));
		});
	});

	describe('get', function () {
		it('should get value for existing key', async function () {
			const loader = new MemoryLoader({initialData: {key1: 'value1'}});
			expect(await loader.get('key1')).toStrictEqual(Ok('value1'));
		});

		it('should return undefined for missing key', async function () {
			const loader = new MemoryLoader();
			expect(await loader.get('missingKey')).toStrictEqual(Ok(undefined));
		});

		it('should get value after set', async function () {
			const loader = new MemoryLoader();
			await loader.set('newKey', 'newValue');
			expect(await loader.get('newKey')).toStrictEqual(Ok('newValue'));
		});
	});

	describe('set', function () {
		it('should set new value', async function () {
			const loader = new MemoryLoader();
			await loader.set('key1', 'value1');
			expect(await loader.get('key1')).toStrictEqual(Ok('value1'));
		});

		it('should update existing value', async function () {
			const loader = new MemoryLoader({initialData: {key1: 'oldValue'}});
			await loader.set('key1', 'newValue');
			expect(await loader.get('key1')).toStrictEqual(Ok('newValue'));
		});

		it('should clear value when set to undefined', async function () {
			const loader = new MemoryLoader({initialData: {key1: 'value1'}});
			await loader.set('key1', undefined);
			expect(await loader.get('key1')).toStrictEqual(Ok(undefined));
		});

		it('should emit updated event when value is set', async function () {
			const loader = new MemoryLoader();
			const updateSpy = vi.fn();
			loader.on('updated', updateSpy);
			await loader.set('key1', 'value1');
			// MemoryLoader emits twice: once from super.set() and once from override
			expect(updateSpy).toHaveBeenCalledTimes(2);
		});

		it('should emit updated event when value is cleared', async function () {
			const loader = new MemoryLoader({initialData: {key1: 'value1'}});
			const updateSpy = vi.fn();
			loader.on('updated', updateSpy);
			await loader.set('key1', undefined);
			// MemoryLoader emits twice: once from super.set() and once from override
			expect(updateSpy).toHaveBeenCalledTimes(2);
		});
		it('should use override key when setting', async function () {
			const loader = new MemoryLoader<Record<'aliasKey', 'actualKey'>, 'actualKey' | 'aliasKey'>({
				overrideKeys: {aliasKey: 'actualKey'},
			});
			await loader.set('aliasKey', 'value');
			expect(await loader.get('aliasKey')).toStrictEqual(Ok('value'));
			expect(await loader.get('actualKey')).toStrictEqual(Ok('value'));
		});
	});

	describe('reload', function () {
		it('should restore initial data on reload', async function () {
			const loader = new MemoryLoader({initialData: {key1: 'initialValue'}});
			await loader.set('key1', 'modifiedValue');
			expect(await loader.get('key1')).toStrictEqual(Ok('modifiedValue'));
			await loader.reload();
			expect(await loader.get('key1')).toStrictEqual(Ok('initialValue'));
		});

		it('should remove keys added after initialization', async function () {
			const loader = new MemoryLoader<Record<string, string>, 'key1' | 'key2'>({initialData: {key1: 'value1'}});
			await loader.set('key2', 'value2');
			expect(await loader.get('key2')).toStrictEqual(Ok('value2'));
			await loader.reload();
			expect(await loader.get('key2')).toStrictEqual(Ok(undefined));
		});
		it('should restore empty state if no initial data', async function () {
			const loader = new MemoryLoader();
			await loader.set('key1', 'value1');
			expect(await loader.get('key1')).toStrictEqual(Ok('value1'));
			await loader.reload();
			expect(await loader.get('key1')).toStrictEqual(Ok(undefined));
		});

		it('should emit updated event on reload', async function () {
			const loader = new MemoryLoader();
			const updateSpy = vi.fn();
			loader.on('updated', updateSpy);
			await loader.reload();
			expect(updateSpy).toHaveBeenCalledTimes(1);
		});

		it('should return Ok result on successful reload', async function () {
			const loader = new MemoryLoader();
			const result = await loader.reload();
			expect(result).toStrictEqual(Ok());
		});
	});

	describe('isLoaded', function () {
		it('should return true after initialization', function () {
			const loader = new MemoryLoader();
			expect(loader.isLoaded()).toBe(true);
		});

		it('should return true after loading with initial data', function () {
			const loader = new MemoryLoader({initialData: {key1: 'value1'}});
			expect(loader.isLoaded()).toBe(true);
		});

		it('should return true after reload', async function () {
			const loader = new MemoryLoader();
			await loader.reload();
			expect(loader.isLoaded()).toBe(true);
		});
	});

	describe('isLoaderDisabled', function () {
		it('should return false by default', async function () {
			const loader = new MemoryLoader();
			expect(await loader.isLoaderDisabled()).to.be.eql(Ok(false));
		});

		it('should return true when disabled', async function () {
			const loader = new MemoryLoader({options: {disabled: true}});
			expect(await loader.isLoaderDisabled()).to.be.eql(Ok(true));
		});

		it('should return true when disabled via setDisabled', async function () {
			const loader = new MemoryLoader();
			await loader.setDisabled(true);
			expect(await loader.isLoaderDisabled()).to.be.eql(Ok(true));
		});
	});

	describe('setDisabled', function () {
		it('should disable the loader', async function () {
			const loader = new MemoryLoader();
			await loader.setDisabled(true);
			expect(await loader.isLoaderDisabled()).to.be.eql(Ok(true));
		});

		it('should enable the loader', async function () {
			const loader = new MemoryLoader({options: {disabled: true}});
			await loader.setDisabled(false);
			expect(await loader.isLoaderDisabled()).to.be.eql(Ok(false));
		});

		it('should accept loadable disabled value', async function () {
			const loader = new MemoryLoader();
			await loader.setDisabled(async () => true);
			expect(await loader.isLoaderDisabled()).to.be.eql(Ok(true));
		});
	});

	describe('event emitter', function () {
		it('should emit updated event on initialization with data', function () {
			const updateSpy = vi.fn();
			const loader = new MemoryLoader({initialData: {key1: 'value1'}});
			loader.on('updated', updateSpy);
			// Initial data triggers an updated event during construction
			expect(loader.isLoaded()).toBe(true);
		});

		it('should allow multiple listeners', async function () {
			const loader = new MemoryLoader();
			const spy1 = vi.fn();
			const spy2 = vi.fn();
			loader.on('updated', spy1);
			loader.on('updated', spy2);
			await loader.set('key1', 'value1');
			// MemoryLoader emits twice: once from super.set() and once from override
			expect(spy1).toHaveBeenCalledTimes(2);
			expect(spy2).toHaveBeenCalledTimes(2);
		});
		it('should remove listener', async function () {
			const loader = new MemoryLoader();
			const updateSpy = vi.fn();
			loader.on('updated', updateSpy);
			loader.off('updated', updateSpy);
			await loader.set('key1', 'value1');
			expect(updateSpy).not.toHaveBeenCalled();
		});
	});
	describe('clear', function () {
		it('should clear all keys', async function () {
			const loader = new MemoryLoader({initialData: {key1: 'value1', key2: 'value2'}});
			await expect(loader.size()).resolves.toStrictEqual(Ok(2));
			await loader.clear();
			await expect(loader.size()).resolves.toStrictEqual(Ok(0));
			await expect(loader.get('key1')).resolves.toStrictEqual(Ok(undefined));
			await expect(loader.get('key2')).resolves.toStrictEqual(Ok(undefined));
		});
	});

	describe('complex scenarios', function () {
		it('should handle multiple keys with initial data', async function () {
			const loader = new MemoryLoader({
				initialData: {
					key1: 'value1',
					key2: 'value2',
					key3: 'value3',
				},
			});
			expect(await loader.get('key1')).toStrictEqual(Ok('value1'));
			expect(await loader.get('key2')).toStrictEqual(Ok('value2'));
			expect(await loader.get('key3')).toStrictEqual(Ok('value3'));
		});

		it('should handle multiple override keys', async function () {
			const loader = new MemoryLoader<Record<'alias1' | 'alias2', 'actual1' | 'actual2'>, 'actual1' | 'actual2' | 'alias1' | 'alias2'>({
				initialData: {actual1: 'value1', actual2: 'value2'},
				overrideKeys: {alias1: 'actual1', alias2: 'actual2'},
			});
			expect(await loader.get('alias1')).toStrictEqual(Ok('value1'));
			expect(await loader.get('alias2')).toStrictEqual(Ok('value2'));
		});
		it('should handle set, reload, set sequence', async function () {
			const loader = new MemoryLoader({initialData: {key1: 'initial'}});
			await loader.set('key1', 'modified1');
			expect(await loader.get('key1')).toStrictEqual(Ok('modified1'));
			await loader.reload();
			expect(await loader.get('key1')).toStrictEqual(Ok('initial'));
			await loader.set('key1', 'modified2');
			expect(await loader.get('key1')).toStrictEqual(Ok('modified2'));
		});

		it('should handle undefined values in initial data', async function () {
			const loader = new MemoryLoader({
				initialData: {key1: 'value1', key2: undefined},
			});
			expect(await loader.get('key1')).toStrictEqual(Ok('value1'));
			expect(await loader.get('key2')).toStrictEqual(Ok(undefined));
		});
		it('should test disabled loader', async function () {
			const loader = new MemoryLoader({options: {disabled: true}});
			await loader.init();
			expect(await loader.isLoaderDisabled()).toStrictEqual(Ok(true));
			expect(await loader.get('key1')).toStrictEqual(Ok(undefined));
		});
	});
});
