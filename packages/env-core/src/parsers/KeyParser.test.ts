import {Ok} from '@luolapeikko/result-option';
import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {KeyParser} from './KeyParser';

describe('Test KeyParser', function () {
	describe('String', function () {
		const parser = KeyParser.String();
		const strictParser = KeyParser.String(z.literal('test'));

		it('should parse string values', async function () {
			expect(await parser.parse('value')).toStrictEqual(Ok('value'));
			expect(await strictParser.parse('test')).toStrictEqual(Ok('test'));
			expect(await parser.parse('hello world')).toStrictEqual(Ok('hello world'));
			expect(await parser.parse('')).toStrictEqual(Ok(''));
		});

		it('should convert to string', function () {
			expect(parser.toString('test')).toBe('test');
		});

		it('should format log string', function () {
			expect(parser.toLogString('secret', 'plain')).toBe('secret');
			expect(parser.toLogString('secret', 'masked')).toBe('******');
			expect(parser.toLogString('secret', 'hidden')).toBe('');
			expect(parser.toLogString('secret', 'prefix')).toBe('s*****');
			expect(parser.toLogString('secret', 'suffix')).toBe('*****t');
			expect(parser.toLogString('secret', 'partial')).toBe('s****t');
		});
	});
	describe('Boolean', function () {
		const parser = KeyParser.Boolean();

		it('should parse true values', async function () {
			expect(await parser.parse('true')).toStrictEqual(Ok(true));
			expect(await parser.parse('TRUE')).toStrictEqual(Ok(true));
			expect(await parser.parse('1')).toStrictEqual(Ok(true));
			expect(await parser.parse('yes')).toStrictEqual(Ok(true));
			expect(await parser.parse('y')).toStrictEqual(Ok(true));
			expect(await parser.parse('on')).toStrictEqual(Ok(true));
		});

		it('should parse false values', async function () {
			expect(await parser.parse('false')).toStrictEqual(Ok(false));
			expect(await parser.parse('FALSE')).toStrictEqual(Ok(false));
			expect(await parser.parse('0')).toStrictEqual(Ok(false));
			expect(await parser.parse('no')).toStrictEqual(Ok(false));
			expect(await parser.parse('n')).toStrictEqual(Ok(false));
			expect(await parser.parse('off')).toStrictEqual(Ok(false));
		});

		it('should fail on invalid values', async function () {
			const result = await parser.parse('invalid');
			expect(result.isErr).toBe(true);
		});

		it('should convert to string', function () {
			expect(parser.toString(true)).toBe('true');
			expect(parser.toString(false)).toBe('false');
		});

		it('should format log string', function () {
			expect(parser.toLogString(true, 'plain')).toBe('true');
			expect(parser.toLogString(false, 'plain')).toBe('false');
		});
	});

	describe('Integer', function () {
		const parser = KeyParser.Integer();

		it('should parse integer values', async function () {
			expect(await parser.parse('42')).toStrictEqual(Ok(42));
			expect(await parser.parse('-10')).toStrictEqual(Ok(-10));
			expect(await parser.parse('0')).toStrictEqual(Ok(0));
		});

		it('should fail on invalid values', async function () {
			const result1 = await parser.parse('3.14');
			expect(result1.isOk).toBe(true);
			expect(result1.unwrap()).toBe(3);

			const result2 = await parser.parse('not a number');
			expect(result2.isErr).toBe(true);
		});

		it('should convert to string', function () {
			expect(parser.toString(42)).toBe('42');
			expect(parser.toString(-10)).toBe('-10');
		});

		it('should format log string', function () {
			expect(parser.toLogString(42, 'plain')).toBe('42');
			expect(parser.toLogString(100, 'masked')).toBe('***');
		});
	});

	describe('Float', function () {
		const parser = KeyParser.Float();

		it('should parse float values', async function () {
			expect(await parser.parse('3.14')).toStrictEqual(Ok(3.14));
			expect(await parser.parse('-2.5')).toStrictEqual(Ok(-2.5));
			expect(await parser.parse('0.0')).toStrictEqual(Ok(0));
			expect(await parser.parse('42')).toStrictEqual(Ok(42));
		});

		it('should fail on invalid values', async function () {
			const result = await parser.parse('not a number');
			expect(result.isErr).toBe(true);
		});

		it('should convert to string', function () {
			expect(parser.toString(3.14)).toBe('3.14');
			expect(parser.toString(-2.5)).toBe('-2.5');
		});

		it('should format log string', function () {
			expect(parser.toLogString(3.14, 'plain')).toBe('3.14');
		});
	});

	describe('BigInt', function () {
		const parser = KeyParser.BigInt();

		it('should parse bigint values', async function () {
			expect(await parser.parse('123456789012345678901234567890')).toStrictEqual(Ok(123456789012345678901234567890n));
			expect(await parser.parse('0')).toStrictEqual(Ok(0n));
			expect(await parser.parse('-999')).toStrictEqual(Ok(-999n));
		});

		it('should fail on invalid values', async function () {
			const result = await parser.parse('not a number');
			expect(result.isErr).toBe(true);
		});

		it('should convert to string', function () {
			expect(parser.toString(123n)).toBe('123');
			expect(parser.toString(999999999999999999n)).toBe('999999999999999999');
		});

		it('should format log string', function () {
			expect(parser.toLogString(123n, 'plain')).toBe('123');
		});
	});

	describe('URL', function () {
		const parser = KeyParser.URL();

		it('should parse URL values', async function () {
			const result = await parser.parse('https://example.com');
			expect(result.isOk).toBe(true);
			expect(result.unwrap().href).toBe('https://example.com/');

			const result2 = await parser.parse('http://user:pass@localhost:3000/path?query=1');
			expect(result2.isOk).toBe(true);
			expect(result2.unwrap().href).toBe('http://user:pass@localhost:3000/path?query=1');
		});

		it('should fail on invalid URLs', async function () {
			const result = await parser.parse('not a url');
			expect(result.isErr).toBe(true);
		});

		it('should convert to string', function () {
			const url = new URL('https://example.com/path');
			expect(parser.toString(url)).toBe('https://example.com/path');
		});

		it('should format log string with masked credentials', function () {
			const url = new URL('http://user:password@example.com/path');
			const logString = parser.toLogString(url, 'masked');
			expect(logString).toContain('****');
			expect(logString).toContain('********');
			expect(logString).not.toContain('user');
			expect(logString).not.toContain('password');
		});

		it('should format log string with plain credentials', function () {
			const url = new URL('http://user:password@example.com/path');
			const logString = parser.toLogString(url, 'plain');
			expect(logString).toContain('user');
			expect(logString).toContain('password');
		});
	});

	describe('Array', function () {
		it('should parse array of strings with default separator', async function () {
			const parser = KeyParser.Array(KeyParser.String());
			const result = await parser.parse('a;b;c');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual(['a', 'b', 'c']);
		});

		it('should parse array with custom separator', async function () {
			const parser = KeyParser.Array(KeyParser.String(), ',');
			const result = await parser.parse('a,b,c');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual(['a', 'b', 'c']);
		});

		it('should parse array of integers', async function () {
			const parser = KeyParser.Array(KeyParser.Integer());
			const result = await parser.parse('1;2;3;4;5');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual([1, 2, 3, 4, 5]);
		});

		it('should fail if any element fails parsing', async function () {
			const parser = KeyParser.Array(KeyParser.Integer());
			const result = await parser.parse('1;2;invalid;4');
			expect(result.isErr).toBe(true);
		});

		it('should convert to string', function () {
			const parser = KeyParser.Array(KeyParser.String());
			expect(parser.toString(['a', 'b', 'c'])).toBe('a;b;c');
		});

		it('should format log string', function () {
			const parser = KeyParser.Array(KeyParser.String());
			expect(parser.toLogString(['a', 'b', 'c'], 'plain')).toBe('a;b;c');
			expect(parser.toLogString(['secret1', 'secret2'], 'masked')).toBe('***************');
		});
	});

	describe('JSON', function () {
		const simpleSchema = z.object({key: z.string()});
		const complexSchema = z.object({
			active: z.boolean(),
			count: z.number(),
			name: z.string(),
		});
		const credentialsSchema = z.object({
			password: z.string(),
			secret: z.string().optional(),
			username: z.string(),
		});

		it('should parse JSON objects', async function () {
			const parser = KeyParser.JSON(simpleSchema);
			const result = await parser.parse('{"key":"value"}');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key: 'value'});
		});

		it('should parse complex JSON', async function () {
			const parser = KeyParser.JSON(complexSchema);
			const result = await parser.parse('{"name":"test","count":42,"active":true}');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({active: true, count: 42, name: 'test'});
		});

		it('should fail on invalid JSON', async function () {
			const parser = KeyParser.JSON(simpleSchema);
			const result = await parser.parse('not json');
			expect(result.isErr).toBe(true);
		});

		it('should convert to string', function () {
			const parser = KeyParser.JSON(simpleSchema);
			expect(parser.toString({key: 'value'})).toBe('{"key":"value"}');
		});

		it('should protect specified keys in log string', function () {
			const parser = KeyParser.JSON(credentialsSchema, ['password', 'secret']);
			const logString = parser.toLogString({password: 'pass123', secret: 'shhh', username: 'user'}, 'masked');
			const parsed = JSON.parse(logString);
			expect(parsed.username).toBe('user');
			expect(parsed.password).toBe('*******');
			expect(parsed.secret).toBe('****');
		});

		it('should not protect non-specified keys', function () {
			const parser = KeyParser.JSON(credentialsSchema, ['password']);
			const logString = parser.toLogString({password: 'pass123', username: 'user'}, 'masked');
			const parsed = JSON.parse(logString);
			expect(parsed.username).toBe('user');
			expect(parsed.password).toBe('*******');
		});
	});

	describe('SemiColon', function () {
		const kvSchema = z.object({
			key1: z.string(),
			key2: z.string(),
		});
		const upperSchema = z.object({
			KEY1: z.string(),
			KEY2: z.string(),
		});
		const credentialsSchema = z.object({
			apiKey: z.string(),
			password: z.string(),
			username: z.string(),
		});

		it('should parse semicolon separated key-value pairs', async function () {
			const parser = KeyParser.SemiColon(kvSchema);
			const result = await parser.parse('key1=value1;key2=value2');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key1: 'value1', key2: 'value2'});
		});

		it('should handle empty values as "true"', async function () {
			const parser = KeyParser.SemiColon(kvSchema);
			const result = await parser.parse('key1;key2=value2');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key1: 'true', key2: 'value2'});
		});

		it('should decode URI encoded values', async function () {
			const parser = KeyParser.SemiColon(kvSchema);
			const result = await parser.parse('key1=hello%20world;key2=test%3Dvalue');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({key1: 'hello world', key2: 'test=value'});
		});

		it('should format keys according to keyFormat option', async function () {
			const parser = KeyParser.SemiColon(upperSchema, {keyFormat: 'UPPERCASE'});
			const result = await parser.parse('key1=value1;key2=value2');
			expect(result.isOk).toBe(true);
			expect(result.unwrap()).toEqual({KEY1: 'value1', KEY2: 'value2'});
		});

		it('should convert to string', function () {
			const parser = KeyParser.SemiColon(kvSchema);
			expect(parser.toString({key1: 'value1', key2: 'value2'})).toBe('{"key1":"value1","key2":"value2"}');
		});

		it('should protect specified keys in log string', function () {
			const parser = KeyParser.SemiColon(credentialsSchema, {protectedKeys: ['password', 'apiKey']});
			const logString = parser.toLogString({apiKey: 'key123', password: 'secret', username: 'user'}, 'masked');
			const parsed = JSON.parse(logString);
			expect(parsed.username).toBe('user');
			expect(parsed.password).toBe('******');
			expect(parsed.apiKey).toBe('******');
		});
	});
});
