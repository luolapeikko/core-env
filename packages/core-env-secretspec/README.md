# @luolapeikko/core-env-secretspec

SecretSpec loader for EnvKit

## Features

- SecretSpec environment variables loader

## Example

```ts
type EnvMap = {
	API_SERVER: string;
	FEATURE_FLAG: boolean;
};

const secretSpecLoader = new SecretSpecConfigLoader(); // {provider?: string; profile?: string; reason?: string; path?: string;} | {disabled?: boolean}

const baseEnv = new EnvKit<EnvMap>(
	{
		API_SERVER: {
			notFoundError: true,
			parser: KeyParser.String(),
		},
		FEATURE_FLAG: {
			parser: KeyParser.Boolean(),
			defaultValue: false,
		},
	},
	[secretSpecLoader],
);
const apiServer: string = (await baseEnv.get("API_SERVER")).unwrap();
const featureFlag: boolean = (await baseEnv.get("FEATURE_FLAG")).unwrap();
```
