import {Ok} from '@luolapeikko/result-option';
import {describe, expect, it} from 'vitest';
import {ValidateCore} from './ValidateCore';

describe('Test ValidateCore', function () {
	describe('String', function () {
		it('should validate string values', function () {
			expect(ValidateCore.String('value')).toStrictEqual(Ok('value'));
			expect(ValidateCore.String('hello world')).toStrictEqual(Ok('hello world'));
			expect(ValidateCore.String('')).toStrictEqual(Ok(''));
		});

		it('should fail on non-string values', function () {
			const result1 = ValidateCore.String(123);
			expect(result1.isErr).toBe(true);
			expect(result1.err()?.message).toContain('Invalid String value');

			const result2 = ValidateCore.String(true);
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.String(null);
			expect(result3.isErr).toBe(true);

			const result4 = ValidateCore.String(undefined);
			expect(result4.isErr).toBe(true);

			const result5 = ValidateCore.String({});
			expect(result5.isErr).toBe(true);
		});
	});

	describe('Boolean', function () {
		it('should validate true values', function () {
			expect(ValidateCore.Boolean('true')).toStrictEqual(Ok(true));
			expect(ValidateCore.Boolean('TRUE')).toStrictEqual(Ok(true));
			expect(ValidateCore.Boolean('True')).toStrictEqual(Ok(true));
			expect(ValidateCore.Boolean('1')).toStrictEqual(Ok(true));
			expect(ValidateCore.Boolean('yes')).toStrictEqual(Ok(true));
			expect(ValidateCore.Boolean('YES')).toStrictEqual(Ok(true));
			expect(ValidateCore.Boolean('y')).toStrictEqual(Ok(true));
			expect(ValidateCore.Boolean('Y')).toStrictEqual(Ok(true));
			expect(ValidateCore.Boolean('on')).toStrictEqual(Ok(true));
			expect(ValidateCore.Boolean('ON')).toStrictEqual(Ok(true));
		});

		it('should validate false values', function () {
			expect(ValidateCore.Boolean('false')).toStrictEqual(Ok(false));
			expect(ValidateCore.Boolean('FALSE')).toStrictEqual(Ok(false));
			expect(ValidateCore.Boolean('False')).toStrictEqual(Ok(false));
			expect(ValidateCore.Boolean('0')).toStrictEqual(Ok(false));
			expect(ValidateCore.Boolean('no')).toStrictEqual(Ok(false));
			expect(ValidateCore.Boolean('NO')).toStrictEqual(Ok(false));
			expect(ValidateCore.Boolean('n')).toStrictEqual(Ok(false));
			expect(ValidateCore.Boolean('N')).toStrictEqual(Ok(false));
			expect(ValidateCore.Boolean('off')).toStrictEqual(Ok(false));
			expect(ValidateCore.Boolean('OFF')).toStrictEqual(Ok(false));
		});

		it('should fail on non-string values', function () {
			const result1 = ValidateCore.Boolean(true);
			expect(result1.isErr).toBe(true);

			const result2 = ValidateCore.Boolean(1);
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.Boolean(null);
			expect(result3.isErr).toBe(true);
		});

		it('should fail on invalid string values', function () {
			const result1 = ValidateCore.Boolean('invalid');
			expect(result1.isErr).toBe(true);
			expect(result1.err()?.message).toContain('Invalid Boolean value');

			const result2 = ValidateCore.Boolean('2');
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.Boolean('maybe');
			expect(result3.isErr).toBe(true);
		});
	});

	describe('Integer', function () {
		it('should validate integer values', function () {
			expect(ValidateCore.Integer('42')).toStrictEqual(Ok(42));
			expect(ValidateCore.Integer('-10')).toStrictEqual(Ok(-10));
			expect(ValidateCore.Integer('0')).toStrictEqual(Ok(0));
			expect(ValidateCore.Integer('999999')).toStrictEqual(Ok(999999));
		});

		it('should parse integers from decimal strings', function () {
			const result = ValidateCore.Integer('3.14');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toBe(3);
		});

		it('should fail on non-string values', function () {
			const result1 = ValidateCore.Integer(123);
			expect(result1.isErr).toBe(true);

			const result2 = ValidateCore.Integer(true);
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.Integer(null);
			expect(result3.isErr).toBe(true);
		});

		it('should fail on non-numeric string values', function () {
			const result1 = ValidateCore.Integer('not a number');
			expect(result1.isErr).toBe(true);
			expect(result1.err()?.message).toContain('Invalid Integer value');

			const result2 = ValidateCore.Integer('abc');
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.Integer('');
			expect(result3.isErr).toBe(true);
		});
	});

	describe('Float', function () {
		it('should validate float values', function () {
			expect(ValidateCore.Float('3.14')).toStrictEqual(Ok(3.14));
			expect(ValidateCore.Float('-2.5')).toStrictEqual(Ok(-2.5));
			expect(ValidateCore.Float('0.0')).toStrictEqual(Ok(0));
			expect(ValidateCore.Float('42')).toStrictEqual(Ok(42));
			expect(ValidateCore.Float('99.999')).toStrictEqual(Ok(99.999));
		});

		it('should validate scientific notation', function () {
			expect(ValidateCore.Float('1e5')).toStrictEqual(Ok(100000));
			expect(ValidateCore.Float('1.5e2')).toStrictEqual(Ok(150));
		});

		it('should fail on non-string values', function () {
			const result1 = ValidateCore.Float(3.14);
			expect(result1.isErr).toBe(true);

			const result2 = ValidateCore.Float(true);
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.Float(null);
			expect(result3.isErr).toBe(true);
		});

		it('should fail on non-numeric string values', function () {
			const result1 = ValidateCore.Float('not a number');
			expect(result1.isErr).toBe(true);
			expect(result1.err()?.message).toContain('Invalid Float value');

			const result2 = ValidateCore.Float('abc');
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.Float('');
			expect(result3.isErr).toBe(true);
		});
	});

	describe('BigInt', function () {
		it('should validate bigint values from strings', function () {
			expect(ValidateCore.BigInt('123456789012345678901234567890')).toStrictEqual(Ok(123456789012345678901234567890n));
			expect(ValidateCore.BigInt('0')).toStrictEqual(Ok(0n));
			expect(ValidateCore.BigInt('-999')).toStrictEqual(Ok(-999n));
			expect(ValidateCore.BigInt('42')).toStrictEqual(Ok(42n));
		});

		it('should validate bigint values from bigint type', function () {
			expect(ValidateCore.BigInt(123n)).toStrictEqual(Ok(123n));
			expect(ValidateCore.BigInt(0n)).toStrictEqual(Ok(0n));
			expect(ValidateCore.BigInt(-999n)).toStrictEqual(Ok(-999n));
		});

		it('should fail on non-string/non-bigint values', function () {
			const result1 = ValidateCore.BigInt(123);
			expect(result1.isErr).toBe(true);

			const result2 = ValidateCore.BigInt(true);
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.BigInt(null);
			expect(result3.isErr).toBe(true);

			const result4 = ValidateCore.BigInt({});
			expect(result4.isErr).toBe(true);
		});

		it('should fail on invalid string values', function () {
			const result1 = ValidateCore.BigInt('not a number');
			expect(result1.isErr).toBe(true);
			expect(result1.err()?.message).toContain('Invalid BigInt value');

			const result2 = ValidateCore.BigInt('3.14');
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.BigInt('abc');
			expect(result3.isErr).toBe(true);
		});
	});

	describe('URL', function () {
		it('should validate URL values from strings', function () {
			const result1 = ValidateCore.URL('https://example.com');
			expect(result1.isOk).toBe(true);
			expect(result1.unwrap().href).toBe('https://example.com/');

			const result2 = ValidateCore.URL('http://localhost:3000/path?query=1');
			expect(result2.isOk).toBe(true);
			expect(result2.unwrap().href).toBe('http://localhost:3000/path?query=1');

			const result3 = ValidateCore.URL('ftp://files.example.com');
			expect(result3.isOk).toBe(true);
		});

		it('should validate URL values from URL instances', function () {
			const url = new URL('https://example.com');
			const result = ValidateCore.URL(url);
			expect(result.isOk).toBe(true);
			expect(result.unwrap().href).toBe('https://example.com/');
		});

		it('should fail on invalid URL strings', function () {
			const result1 = ValidateCore.URL('not a url');
			expect(result1.isErr).toBe(true);
			expect(result1.err()?.message).toContain('Invalid URL value');

			const result2 = ValidateCore.URL('ht!tp://invalid');
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.URL('');
			expect(result3.isErr).toBe(true);
		});

		it('should fail on non-string/non-URL values', function () {
			const result1 = ValidateCore.URL(123);
			expect(result1.isErr).toBe(true);

			const result2 = ValidateCore.URL(true);
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.URL(null);
			expect(result3.isErr).toBe(true);

			const result4 = ValidateCore.URL({});
			expect(result4.isErr).toBe(true);
		});
	});

	describe('JSON', function () {
		it('should validate JSON objects', function () {
			const result1 = ValidateCore.JSON('{"key":"value"}');
			expect(result1.isOk).toBe(true);
			expect(result1.unwrap()).toEqual({key: 'value'});

			const result2 = ValidateCore.JSON('{"name":"test","count":42,"active":true}');
			expect(result2.isOk).toBe(true);
			expect(result2.unwrap()).toEqual({active: true, count: 42, name: 'test'});
		});

		it('should validate JSON arrays', function () {
			const result = ValidateCore.JSON('[1,2,3]');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual([1, 2, 3]);
		});

		it('should validate JSON primitives', function () {
			expect(ValidateCore.JSON('"string"')).toStrictEqual(Ok('string'));
			expect(ValidateCore.JSON('42')).toStrictEqual(Ok(42));
			expect(ValidateCore.JSON('true')).toStrictEqual(Ok(true));
			expect(ValidateCore.JSON('null')).toStrictEqual(Ok(null));
		});

		it('should fail on non-string values', function () {
			const result1 = ValidateCore.JSON({key: 'value'});
			expect(result1.isErr).toBe(true);

			const result2 = ValidateCore.JSON(123);
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.JSON(null);
			expect(result3.isErr).toBe(true);
		});

		it('should fail on invalid JSON strings', function () {
			const result1 = ValidateCore.JSON('not json');
			expect(result1.isErr).toBe(true);
			expect(result1.err()?.message).toContain('Invalid JSON value');

			const result2 = ValidateCore.JSON('{invalid}');
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.JSON('{"key":undefined}');
			expect(result3.isErr).toBe(true);
		});
	});

	describe('SemiColon', function () {
		it('should validate semicolon separated key-value pairs', function () {
			const result = ValidateCore.SemiColon('key1=value1;key2=value2');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key1: 'value1', key2: 'value2'});
		});

		it('should handle empty values as "true"', function () {
			const result = ValidateCore.SemiColon('key1;key2=value2;key3');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key1: 'true', key2: 'value2', key3: 'true'});
		});

		it('should decode URI encoded values', function () {
			const result = ValidateCore.SemiColon('key1=hello%20world;key2=test%3Dvalue');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key1: 'hello world', key2: 'test=value'});
		});

		it('should trim keys and values', function () {
			const result = ValidateCore.SemiColon('  key1  =  value1  ;  key2  =  value2  ');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key1: 'value1', key2: 'value2'});
		});

		it('should format keys with UPPERCASE', function () {
			const result = ValidateCore.SemiColon('key1=value1;key2=value2', 'UPPERCASE');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({KEY1: 'value1', KEY2: 'value2'});
		});

		it('should format keys with lowercase', function () {
			const result = ValidateCore.SemiColon('KEY1=value1;KEY2=value2', 'lowercase');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key1: 'value1', key2: 'value2'});
		});

		it('should format keys with camelCase', function () {
			const result = ValidateCore.SemiColon('Key1=value1;Key2=value2', 'camelCase');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key1: 'value1', key2: 'value2'});
		});

		it('should format keys with PascalCase', function () {
			const result = ValidateCore.SemiColon('key1=value1;key2=value2', 'PascalCase');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({Key1: 'value1', Key2: 'value2'});
		});

		it('should ignore empty keys', function () {
			const result = ValidateCore.SemiColon('key1=value1;=value2;key3=value3');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key1: 'value1', key3: 'value3'});
		});

		it('should handle single key-value pair', function () {
			const result = ValidateCore.SemiColon('key=value');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key: 'value'});
		});

		it('should handle empty string', function () {
			const result = ValidateCore.SemiColon('');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({});
		});

		it('should fail on non-string values', function () {
			const result1 = ValidateCore.SemiColon(123);
			expect(result1.isErr).toBe(true);
			expect(result1.err()?.message).toContain('Invalid SemiColon value');

			const result2 = ValidateCore.SemiColon(null);
			expect(result2.isErr).toBe(true);

			const result3 = ValidateCore.SemiColon({});
			expect(result3.isErr).toBe(true);
		});
	});

	describe('buildErr', function () {
		it('should build TypeError with correct message', function () {
			const error = ValidateCore.buildErr('invalid', 'String');
			expect(error).toBeInstanceOf(TypeError);
			expect(error.message).toBe('Invalid String value: "invalid"');
		});

		it('should build TypeError for all type names', function () {
			expect(ValidateCore.buildErr(123, 'Integer').message).toContain('Invalid Integer value: 123');
			expect(ValidateCore.buildErr(true, 'Boolean').message).toContain('Invalid Boolean value: true');
			expect(ValidateCore.buildErr(3.14, 'Float').message).toContain('Invalid Float value: 3.14');
			expect(ValidateCore.buildErr(999n, 'BigInt').message).toContain('Invalid BigInt value: 999');
			expect(ValidateCore.buildErr('bad', 'URL').message).toContain('Invalid URL value: "bad"');
			expect(ValidateCore.buildErr('bad', 'JSON').message).toContain('Invalid JSON value: "bad"');
			expect(ValidateCore.buildErr(123, 'SemiColon').message).toContain('Invalid SemiColon value: 123');
		});

		it('should build TypeError with cause option', function () {
			const cause = new Error('Original error');
			const error = ValidateCore.buildErr('value', 'String', {cause});
			expect(error).toBeInstanceOf(TypeError);
			expect(error.cause).toBe(cause);
		});

		it('should handle complex values in error message', function () {
			const error1 = ValidateCore.buildErr({key: 'value'}, 'String');
			expect(error1.message).toContain('{"key":"value"}');

			const error2 = ValidateCore.buildErr([1, 2, 3], 'Integer');
			expect(error2.message).toContain('[1,2,3]');

			const error3 = ValidateCore.buildErr(null, 'Boolean');
			expect(error3.message).toContain('null');

			const error4 = ValidateCore.buildErr(undefined, 'Float');
			expect(error4.message).toBe('Invalid Float value: undefined');
		});
	});
});
