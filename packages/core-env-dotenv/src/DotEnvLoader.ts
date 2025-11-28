import type {OverrideKeyMap} from '@luolapeikko/core-env';
import {
	AbstractFileMapLoader,
	type AbstractFileMapLoaderLogMap,
	type AbstractFileMapLoaderOptions,
	abstractFileMapLoaderLogMap,
} from '@luolapeikko/core-env-nodejs';
import {ErrorCast} from '@luolapeikko/core-ts-error';
import type {Loadable} from '@luolapeikko/core-ts-type';
import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import {parse} from 'dotenv';
/**
 * Loader for dotenv files, using the `dotenv` packages parser.
 * @template OverrideMap Type of the override keys
 * @since v0.0.1
 */
export class DotEnvLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap> extends AbstractFileMapLoader<AbstractFileMapLoaderOptions<'env'>, OverrideMap> {
	public readonly loaderType: Lowercase<string>;

	protected defaultOptions: AbstractFileMapLoaderOptions<'env'> = {
		disabled: false,
		fileName: '.env',
		fileType: 'env',
		isSilent: true,
		logger: undefined,
		watch: false,
	};

	protected defaultLogMap(): AbstractFileMapLoaderLogMap {
		return abstractFileMapLoaderLogMap;
	}

	public constructor(
		options: Loadable<Partial<AbstractFileMapLoaderOptions<'env'>>> = {},
		overrideKeys?: Partial<OverrideMap>,
		type: Lowercase<string> = 'dotenv',
	) {
		super(options, overrideKeys);
		this.loaderType = type;
	}

	protected handleParse(rawData: Buffer): IResult<Record<string, string | undefined>, Error> {
		try {
			return Ok(parse(rawData));
		} catch (err) {
			return Err(ErrorCast.from(err));
		}
	}
}
