# @luolapeikko/core-env-fetch

Fetch API JSON loader for EnvKit

## Features

- Fetch API JSON variables loader
- Response Cache support via IRequestCache interface (for offline usage like PWA, optional)
- Optional payload validation via StandardSchemaV1
- fetch client is overridable (default: globalThis.fetch or window.fetch)
- supports .reload() to reload the config again.

## Example

```ts
type EnvMap = {
  API_SERVER: string;
  FEATURE_FLAG: boolean;
};

const fetchLoader = new FetchConfigLoader(
  new Request(new URL("http://some/settings.json"))
);

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
  [fetchLoader]
);
const apiServer: string = (await baseEnv.get("API_SERVER")).unwrap();
const featureFlag: boolean = (await baseEnv.get("FEATURE_FLAG")).unwrap();
```
