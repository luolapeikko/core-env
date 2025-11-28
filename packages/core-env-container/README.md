# @luolapeikko/core-env-container

Container loader for EnvKit

## Features

- Container environment variables loader

## Example

```ts
type EnvMap = {
  DB_PASSWORD: string;
  PORT?: number;
};

const dockerLoader = new DockerSecretsConfigLoader({ fileLowerCase: true });

const baseEnv = new EnvKit<EnvMap>(
  {
    DB_PASSWORD: {
      notFoundError: true,
      parser: KeyParser.String(),
      logFormat: "partial",
    }, // tries to read /run/secrets/DB_PASSWORD
    PORT: { parser: KeyParser.Integer() },
  },
  [dockerLoader]
);
const dbPassword: string = (await baseEnv.get("DB_PASSWORD")).unwrap();
const port: number = (await baseEnv.get("PORT")).unwrap();
```
