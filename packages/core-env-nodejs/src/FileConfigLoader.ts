import type {OverrideKeyMap} from '@luolapeikko/core-env';
import {ErrorCast} from '@luolapeikko/core-ts-error';
import type {Loadable} from '@luolapeikko/core-ts-type';
import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import {AbstractFileMapLoader, type AbstractFileMapLoaderLogMap, type AbstractFileMapLoaderOptions, abstractFileMapLoaderLogMap} from './AbstractFileMapLoader';

/**
 * A file-based configuration loader that reads a JSON file.
 * @template OverrideMap Type of the override keys
 * @since v0.0.1
 * @category Loaders
 */
export class FileConfigLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap> extends AbstractFileMapLoader<
	AbstractFileMapLoaderOptions<'json'>,
	OverrideMap
> {
	public readonly loaderType: Lowercase<string>;

	protected defaultOptions: AbstractFileMapLoaderOptions<'json'> = {
		disabled: false,
		fileName: 'config.json',
		fileType: 'json',
		isSilent: true,
		logger: undefined,
		watch: false,
	};

	protected defaultLogMap(): AbstractFileMapLoaderLogMap {
		return abstractFileMapLoaderLogMap;
	}

	public constructor(
		options: Loadable<Partial<AbstractFileMapLoaderOptions<'json'>>>,
		overrideKeys?: Partial<OverrideMap>,
		type: Lowercase<string> = 'json-file',
	) {
		super(options, overrideKeys);
		this.loaderType = type;
	}

	protected handleParse(rawData: Buffer, options: AbstractFileMapLoaderOptions<'json'>): IResult<Record<string, string | undefined>, Error> {
		try {
			const data: unknown = JSON.parse(rawData.toString());
			if (typeof data !== 'object' || data === null || Array.isArray(data)) {
				options.logger?.error(`ConfigVariables[${this.loaderType}]: Invalid JSON data from ${options.fileName}`);
				return Ok({});
			}
			return Ok(this.convertObjectToStringRecord(data));
		} catch (cause) {
			return Err(new Error(`ConfigVariables[${this.loaderType}]: Failed to parse JSON from ${options.fileName}: ${ErrorCast.from(cause).message}`, {cause}));
		}
	}

	/**
	 * Converts an object to a record of strings as env values are always strings.
	 * @param {object} data The object to convert
	 * @returns {Record<string, string>} The converted object
	 */
	private convertObjectToStringRecord(data: object): Record<string, string> {
		return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
			if (value) {
				acc[key] = String(value);
			}
			return acc;
		}, {});
	}
}
