# @luolapeikko/core-env-tachyon

[Tachyon Drive](https://github.com/mharj/tachyon-drive) storage driver loader for EnvKit

## Features

- Can use any Tachyon Drive storage driver as store for config variables. (S3, Redis, Memory, Filesystem, etc.)
- Three serializers available: String, Buffer and Uint8Array (based on used Tachyon driver type)

## Example

```ts
const memoryDriver = new MemoryStorageDriver(
  "MemoryStorageDriver",
  TachyonConfigSerializer.jsonString(
    z.object({
      _v: z.literal(1),
      data: z.record(z.string().min(1), z.string()),
    }) // validation schema can be any StandardSchemaV1 validation with `TachyonConfigStoreType` as output type
  ),
  null
);

type EnvMap = {
  API_SERVER: string;
  FEATURE_FLAG: boolean;
};

const tachyonLoader = new TachyonConfigLoader(memoryDriver);

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
  [tachyonLoader]
);
const apiServer: string = (await baseEnv.get("API_SERVER")).unwrap();
const featureFlag: boolean = (await baseEnv.get("FEATURE_FLAG")).unwrap();
```
