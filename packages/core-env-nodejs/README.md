# @luolapeikko/core-env-nodejs

NodeJS loaders for EnvKit

## Features

- AbstractFileMapLoader (base loader for file based loaders, with file change support)
- FileConfigLoader (file config loader which supports flat object JSON)

## Example

```ts
type EnvMap = {
  API_SERVER: string;
  FEATURE_FLAG: boolean;
};

const settingsLoader = new FileConfigLoader({ fileName: "./settings.json" });
const devSettingsLoader = new FileConfigLoader({
  fileName: "./settings.dev.json",
  disabled: process.env.NODE_ENV !== "development",
});

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
  [devSettingsLoader, settingsLoader] // first try dev settings, then try production settings
);
const apiServer: string = (await baseEnv.get("API_SERVER")).unwrap();
const featureFlag: boolean = (await baseEnv.get("FEATURE_FLAG")).unwrap();
```
