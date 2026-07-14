import {AbstractBaseLoader, type IAbstractBaseLoaderProps, type LoaderValueResult, type OverrideKeyMap} from '@luolapeikko/core-env';
import {type IResult, Ok} from '@luolapeikko/result-option';
import {type Resolved, SecretSpec} from 'secretspec';

export type SecretSpecConfigLoaderProps = IAbstractBaseLoaderProps & {
	provider?: string;
	profile?: string;
	reason?: string;
	path?: string;
};

export class SecretSpecConfigLoader<OverrideMap extends OverrideKeyMap = OverrideKeyMap> extends AbstractBaseLoader<IAbstractBaseLoaderProps, OverrideMap> {
	public readonly loaderType = 'secretspec';
	private readonly resolved: Resolved;

	public override defaultOptions: IAbstractBaseLoaderProps = {
		disabled: false,
	};

	public constructor(options: SecretSpecConfigLoaderProps = {}, override?: Partial<OverrideMap>) {
		super(override);
		let builder = SecretSpec.builder();
		if (options.path) {
			builder = builder.withPath(options.path);
		}
		if (options.provider) {
			builder = builder.withProvider(options.provider);
		}
		if (options.profile) {
			builder = builder.withProfile(options.profile);
		}
		if (options.reason) {
			builder = builder.withReason(options.reason);
		}
		this.resolved = builder.load();
	}

	protected getRawValue(lookupKey: string): IResult<LoaderValueResult, Error> {
		const resolvedValue = this.resolved.secrets[lookupKey];
		return Ok({path: `secretspec[profiles.${this.resolved.profile}] ${lookupKey}`, value: resolvedValue.value ?? undefined});
	}
}
