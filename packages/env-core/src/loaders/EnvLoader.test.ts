import {Ok} from '@luolapeikko/result-option';
import {describe, expect, it} from 'vitest';
import {EnvLoader} from './EnvLoader';

describe('Test EnvLoader', function () {
	const envLoader = new EnvLoader();
	it('should get raw value', function () {
		process.env.TEST_KEY = 'value';
		expect(envLoader.getRawValue('TEST_KEY')).toStrictEqual(Ok({path: 'process.env.TEST_KEY', value: 'value'}));
	});
});
