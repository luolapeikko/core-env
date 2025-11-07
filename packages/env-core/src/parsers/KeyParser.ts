import type {IResult} from '@luolapeikko/result-option';
import type {Awaitable} from '@luolapeikko/ts-common';
import type {StandardSchemaV1} from '@standard-schema/spec';
import type {IConfigParser} from '../interfaces';
import {buildLogValue} from '../lib/formatUtils';
import {resultAll} from '../lib/resultUtil';
import {isStandardSchema, stdValidateResult} from '../lib/standardSchema';
import {ValidateCore} from '../lib/ValidateCore';
import type {KeyFormatType, ObjectEntries, ValueLogFormat} from '../types';

type ParserOrSchema<T> = IConfigParser<T> | StandardSchemaV1<unknown, T>;

type BaseParse<Out> = (value: string) => Awaitable<IResult<Out, TypeError>>;

type ValidateResultOrSchema<Out> = BaseParse<Out> | StandardSchemaV1<unknown, Out>;

export class KeyParser {
	public static String = <T extends string = string>(parser: ValidateResultOrSchema<T> = ValidateCore.String<T>): IConfigParser<T> => {
		return {
			name: 'stringParser',
			parse: KeyParser.#resolveParser(parser),
			toLogString: (value, format) => buildLogValue(value, format),
			toString: (value) => value,
		};
	};

	public static Boolean = <T extends boolean = boolean>(parser: ValidateResultOrSchema<T> = ValidateCore.Boolean): IConfigParser<T> => {
		return {
			name: 'booleanParser',
			parse: KeyParser.#resolveParser(parser),
			toLogString: (value, format) => buildLogValue(value.toString(), format),
			toString: (value) => value.toString(),
		};
	};

	public static Integer = <T extends number = number>(parser: ValidateResultOrSchema<T> = ValidateCore.Integer): IConfigParser<T> => {
		return {
			name: 'integerParser',
			parse: KeyParser.#resolveParser(parser),
			toLogString: (value, format) => buildLogValue(value.toString(), format),
			toString: (value) => value.toString(),
		};
	};

	public static Float = <T extends number = number>(parser: ValidateResultOrSchema<T> = ValidateCore.Float): IConfigParser<T> => {
		return {
			name: 'floatParser',
			parse: KeyParser.#resolveParser(parser),
			toLogString: (value, format) => buildLogValue(value.toString(), format),
			toString: (value) => value.toString(),
		};
	};

	public static BigInt = <T extends bigint = bigint>(parser: ValidateResultOrSchema<T> = ValidateCore.BigInt): IConfigParser<T> => {
		return {
			name: 'bigintParser',
			parse: KeyParser.#resolveParser(parser),
			toLogString: (value, format) => buildLogValue(value.toString(), format),
			toString: (value) => value.toString(),
		};
	};

	public static URL = <T extends URL = URL>(parser: ValidateResultOrSchema<T> = ValidateCore.URL): IConfigParser<T> => {
		return {
			name: 'urlEnvParser',
			parse: KeyParser.#resolveParser<T>(parser),
			toLogString: (value, format) => {
				const url = new URL(value);
				url.username = buildLogValue(url.username, format);
				url.password = buildLogValue(url.password, format);
				return url.href;
			},
			toString: (value) => value.href,
		};
	};

	/**
	 * Creates an array parser.
	 * @param parser The parser to use for each element.
	 * @param separator The separator to use for splitting the input string.
	 * @returns An array parser.
	 */
	public static Array = <T>(parser: ParserOrSchema<T>, separator = ';'): IConfigParser<T[]> => {
		const isStandard = isStandardSchema(parser);
		const parserInstance = isStandard ? stdValidateResult<T>(parser) : parser.parse;
		return {
			name: `arrayParser[${isStandard ? 'standard schema' : parser.name}]`,
			parse: async (value) => resultAll(await Promise.all(value.split(separator).map(parserInstance))),
			toLogString: (value, format) => buildLogValue(value.join(separator), format),
			toString: (value) => value.join(separator),
		};
	};

	/**
	 * Creates a JSON parser.
	 *
	 * @param parser The parser to use for the JSON value.
	 * @param protectedKeys The keys to protect from logging.
	 * @returns A JSON parser.
	 */
	public static JSON = <T extends object>(parser: ParserOrSchema<T>, protectedKeys: Iterable<keyof T> = new Set()): IConfigParser<T> => {
		const keys = new Set(protectedKeys);
		const isStandard = isStandardSchema(parser);
		return {
			name: `jsonParser`,
			parse: (value) => (isStandard ? ValidateCore.JSON(value).andThenPromise(stdValidateResult(parser)) : parser.parse(value)),
			toLogString: (value, format) => JSON.stringify(KeyParser.protectedKeysObject(value, format, keys)),
			toString: (value) => JSON.stringify(value),
		};
	};

	/**
	 * Creates a semi-colon separated key=value parser.
	 * @param parser The parser to use for each element.
	 * @param options Options for the parser.
	 * @returns A semi-colon separated parser.
	 */
	public static SemiColon = <T extends object>(
		parser: ParserOrSchema<T>,
		options: {keyFormat?: KeyFormatType; protectedKeys?: Iterable<keyof T>} = {},
	): IConfigParser<T> => {
		const keys = new Set(options.protectedKeys ?? []);
		const isStandard = isStandardSchema(parser);
		return {
			name: `semiColonParser`,
			parse: (value) => (isStandard ? ValidateCore.SemiColon(value, options.keyFormat).andThenPromise(stdValidateResult(parser)) : parser.parse(value)),
			toLogString: (value, format) => JSON.stringify(KeyParser.protectedKeysObject(value, format, keys)),
			toString: (value) => JSON.stringify(value),
		};
	};

	private static protectedKeysObject<T extends object>(value: T, format: ValueLogFormat, keys: Set<keyof T>) {
		return (Object.entries(value) as ObjectEntries<T>).reduce<Record<string, unknown>>((acc, [key, value]) => {
			if (keys.has(key)) {
				acc[String(key)] = buildLogValue(String(value), format);
			} else {
				acc[String(key)] = value;
			}
			return acc;
		}, {});
	}

	static #resolveParser<Out>(parser: BaseParse<Out> | StandardSchemaV1<unknown, Out>): BaseParse<Out> {
		if (isStandardSchema(parser)) {
			return stdValidateResult<Out>(parser);
		}
		return parser;
	}

	/* c8 ignore next 3 */
	private constructor() {
		throw new Error('This class should not be instantiated.');
	}
}
