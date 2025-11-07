import type {Loadable} from '@luolapeikko/ts-common';
import type {IConfigParser} from '../interfaces';

export type UnwrapUndefined<T> = T extends undefined ? never : T;

type EnvBaseSchema<Value> = {
	/**
	 * The parser to use to parse the value
	 */
	parser: IConfigParser<Value>;
	/**
	 * The format parameters to use to format the value
	 */
	logFormat?: ValueLogFormat;
	/**
	 * Replaces the default throw error message with this message
	 */
	undefinedErrorMessage?: string;
};

export type OptionalEnvSchema<Value> = EnvBaseSchema<Value> & {
	defaultValue?: Loadable<Value>;
	undefinedError?: boolean;
};

export type RequiredDefaultSchema<Value> = EnvBaseSchema<Value> & {
	/**
	 * The default value to use if the variable is not defined
	 */
	defaultValue: Loadable<Value>;
	/**
	 * Whether to throw an error if the variable is undefined
	 */
	undefinedError?: boolean;
};

export type RequiredErrorSchema<Value> = EnvBaseSchema<Value> & {
	/**
	 * The default value to use if the variable is not defined
	 */
	defaultValue?: Loadable<Value>;
	/**
	 * Whether to throw an error if the variable is undefined
	 */
	undefinedError: true;
};

export type RequiredEnvSchema<T> = RequiredDefaultSchema<T> | RequiredErrorSchema<T>;

export type ConfigSchema<Output extends Record<string, unknown>> = {
	[K in keyof Required<Output>]: undefined extends Output[K] ? OptionalEnvSchema<Output[K]> : RequiredEnvSchema<Output[K]>;
};

export type KeyFormatType = 'UPPERCASE' | 'lowercase' | 'camelCase' | 'PascalCase';

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

export type ValueLogFormat = keyof typeof ValueLogFormat;

export type ObjectEntries<R> = {
	[K in keyof R]-?: [K, Exclude<R[K], undefined>];
}[keyof R][];
