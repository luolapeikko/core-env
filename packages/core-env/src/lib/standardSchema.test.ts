import {Err, Ok} from '@luolapeikko/result-option';
import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {stdValidateResult} from './standardSchema';

describe('Test standardSchema functions', function () {
	describe('Test stdValidateResult ', function () {
		it('should get raw value', async function () {
			const validateFn = stdValidateResult(z.string());
			expect(await validateFn('ok')).to.be.eql(Ok('ok'));
			expect(await validateFn(null)).to.be.eql(Err(new TypeError('Invalid input: expected string, received null')));
		});
	});
});
