import {describe, expect, it} from 'vitest';
import {buildStringMap} from './objectUtils';

describe('Test objectUtils functions', function () {
	describe('Test buildStringMap ', function () {
		it('should build string map', function () {
			const obj = {a: '1', b: '2', c: undefined, d: null, e: new Date(), f: {}};
			const result = buildStringMap(obj);
			expect(result.get('a')).to.be.eql('1');
			expect(result.get('b')).to.be.eql('2');
			expect(result.get('c')).to.be.undefined;
			expect(result.get('d')).to.be.undefined;
			expect(result.get('e')).to.be.a('string');
			expect(result.get('f')).to.be.eql('{}');
		});
	});
});
