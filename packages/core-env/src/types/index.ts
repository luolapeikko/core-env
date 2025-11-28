import type {Loadable} from '@luolapeikko/core-ts-type';
import type {IConfigParser} from '../interfaces';

/**
 * Object entries type
 * @category Types
 * @since v0.0.1
 */
export type UnwrapUndefined<T> = T extends undefined ? never : T;

/**
 * Base env schema type
 * @category Schema
 * @since v0.0.1
 */
export type EnvBaseSchema<Value> = {
	/**
	 * The parser to use to parse the value
	 */
	parser: IConfigParser<NonNullable<Value>>;
	/**
	 * The format parameters to use to format the value
	 */
	logFormat?: ValueLogFormat;
};

/**
 * Optional env schema type
 * @category Schema
 * @since v0.0.1
 */
export type OptionalEnvSchema<Value> = EnvBaseSchema<Value> & {
	defaultValue?: Loadable<Value>;
	notFoundError?: boolean;
};

/**
 * Required env schema type (default value if undefined)
 * @category Schema
 * @since v0.0.1
 */
export type RequiredDefaultSchema<Value> = EnvBaseSchema<Value> & {
	/**
	 * The default value to use if the variable is not defined
	 */
	defaultValue: Loadable<Value>;
	/**
	 * Whether to throw an error if the variable is undefined
	 */
	notFoundError?: boolean;
};

/**
 * Required env schema type (error if undefined)
 * @category Schema
 * @since v0.0.1
 */
export type RequiredErrorSchema<Value> = EnvBaseSchema<Value> & {
	/**
	 * The default value to use if the variable is not defined
	 */
	defaultValue?: Loadable<Value>;
	/**
	 * Whether to throw an error if the variable is undefined
	 */
	notFoundError: true;
};

/**
 * Required env schema type
 * @category Schema
 * @since v0.0.1
 */
export type RequiredEnvSchema<T> = RequiredDefaultSchema<T> | RequiredErrorSchema<T>;

/**
 * Config schema type
 * @category Schema
 * @since v0.0.1
 */
export type ConfigSchema<Output extends Record<string, unknown>> = {
	[K in keyof Required<Output>]: undefined extends Output[K] ? OptionalEnvSchema<Output[K]> : RequiredEnvSchema<Output[K]>;
};

/**
 * Key format type
 * @category Logger
 * @since v0.0.1
 */
export type KeyFormatType = 'UPPERCASE' | 'lowercase' | 'camelCase' | 'PascalCase';

/**
 * Value log format type
 * @category Logger
 * @since v0.0.1
 */
export const ValueLogFormat = {
	/** Hide the value */
	hidden: 'hidden',
	/** replaced with '*' */
	masked: 'masked',
	/** both prefix + suffix visible */
	partial: 'partial',
	/** full value */
	plain: 'plain',
	/** first N chars, rest masked */
	prefix: 'prefix',
	/** last N chars, rest masked */
	suffix: 'suffix',
} as const;

/**
 * Value log format type
 * @category Logger
 * @since v0.0.1
 */
export type ValueLogFormat = keyof typeof ValueLogFormat;

/**
 * Object entries type
 * @category Types
 * @since v0.0.1
 */
export type ObjectEntries<R> = {
	[K in keyof R]-?: [K, Exclude<R[K], undefined>];
}[keyof R][];
