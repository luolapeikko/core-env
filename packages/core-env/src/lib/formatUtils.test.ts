import {describe, expect, it} from 'vitest';
import {buildLogValue, formatKey, printLogValue} from './formatUtils';

describe('Test formatUtils', function () {
	describe('formatKey', function () {
		it('should parse values', function () {
			expect(formatKey('someKeyValue', 'PascalCase')).to.equal('SomeKeyValue');
			expect(formatKey('SomeKeyValue', 'camelCase')).to.equal('someKeyValue');
			expect(formatKey('SomeKeyValue', 'UPPERCASE')).to.equal('SOMEKEYVALUE');
			expect(formatKey('SomeKeyValue', 'lowercase')).to.equal('somekeyvalue');
			expect(formatKey('SomeKeyValue', undefined)).to.equal('SomeKeyValue');
			expect(formatKey(null as unknown as string, 'lowercase')).to.equal(null);
		});
	});
	describe('buildLogValue', function () {
		it('should parse values', function () {
			expect(buildLogValue('abcdefghijklmnopqrstuvwxyz', 'hidden')).to.equal('');
			expect(buildLogValue('abcdefghijklmnopqrstuvwxyz', 'plain')).to.equal('abcdefghijklmnopqrstuvwxyz');
			expect(buildLogValue('abcdefghijklmnopqrstuvwxyz', 'masked')).to.equal('**************************');
			expect(buildLogValue('abcdefghijklmnopqrstuvwxyz', 'partial')).to.equal('ab**********************yz');
			expect(buildLogValue('abcdefghijklmnopqrstuvwxyz', 'prefix')).to.equal('abc***********************');
			expect(buildLogValue('abcdefghijklmnopqrstuvwxyz', 'suffix')).to.equal('***********************xyz');
		});
	});
	describe('printLogValue', function () {
		it('should parse values', function () {
			expect(printLogValue('abcdefghijklmnopqrstuvwxyz', 'hidden')).to.equal('');
			expect(printLogValue('abcdefghijklmnopqrstuvwxyz', 'plain')).to.equal(' [abcdefghijklmnopqrstuvwxyz]');
			expect(printLogValue('abcdefghijklmnopqrstuvwxyz', 'masked')).to.equal(' [**************************]');
			expect(printLogValue('abcdefghijklmnopqrstuvwxyz', 'partial')).to.equal(' [ab**********************yz]');
			expect(printLogValue('abcdefghijklmnopqrstuvwxyz', 'prefix')).to.equal(' [abc***********************]');
			expect(printLogValue('abcdefghijklmnopqrstuvwxyz', 'suffix')).to.equal(' [***********************xyz]');
			expect(() => printLogValue('abcdefghijklmnopqrstuvwxyz', 'test' as any)).toThrow('Unknown format: test');
		});
	});
});
