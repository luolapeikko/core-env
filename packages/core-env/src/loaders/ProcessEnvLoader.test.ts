import {Ok} from '@luolapeikko/result-option';
import {describe, expect, it} from 'vitest';
import {ProcessEnvLoader} from './ProcessEnvLoader';

describe('Test EnvLoader', function () {
	it('should get raw value', async function () {
		const envLoader = new ProcessEnvLoader();
		process.env.TEST_KEY = 'value';
		await expect(envLoader.getValueResult('TEST_KEY')).resolves.toStrictEqual(Ok({path: 'process.env.TEST_KEY', value: 'value'}));
	});
	it('should get undefined value for disabled loader', async function () {
		const envLoader = new ProcessEnvLoader({disabled: true});
		process.env.TEST_KEY = 'value';
		await expect(envLoader.getValueResult('TEST_KEY')).resolves.toStrictEqual(Ok(undefined));
	});
});
