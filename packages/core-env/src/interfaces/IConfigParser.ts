import type {IResult} from '@luolapeikko/result-option';
import type {ValueLogFormat} from '../types';

/**
 * Interface for configuration parsers that convert string values from environment variables into specific output types.
 * @category Parsers
 */
export interface IConfigParser<Output> {
	name: string;
	parse: (value: string) => IResult<Output, Error> | Promise<IResult<Output, Error>>;
	toString: (value: Output) => string;
	toLogString: (value: Output, format: ValueLogFormat) => string;
}
