import {Ok} from '@luolapeikko/result-option';
import {describe, expect, it} from 'vitest';
import {ReactEnvLoader} from './ReactEnvLoader';

describe('Test EnvLoader', function () {
	const envLoader = new ReactEnvLoader();
	it('should get raw value', function () {
		process.env.REACT_APP_TEST_KEY = 'value';
		expect(envLoader.getRawValue('TEST_KEY')).toStrictEqual(Ok({path: 'process.env.REACT_APP_TEST_KEY', value: 'value'}));
	});
});
