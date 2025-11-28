# @luolapeikko/core-env-vite

Vite loader for EnvKit (ESM only)

## Features

- Vite environment variables loader

## Example

```ts
type EnvMap = {
  API_SERVER: string;
  FEATURE_FLAG: boolean;
};

const viteLoader = new ViteLoader(); // loads import.meta.env.VITE_*

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
  [viteLoader]
);
const apiServer: string = (await baseEnv.get("API_SERVER")).unwrap();
const featureFlag: boolean = (await baseEnv.get("FEATURE_FLAG")).unwrap();
```
