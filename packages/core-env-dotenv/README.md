# @luolapeikko/core-env-dotenv

Dotenv loader for EnvKit

## Features

- Uses .env file to load environment variables

## Example

```ts
type EnvMap = {
  DB_PASSWORD: string;
  PORT?: number;
};

const envLoader = new DotEnvLoader(); // loads default .env file (can be configured)

const baseEnv = new EnvKit<EnvMap>(
  {
    DB_PASSWORD: {
      notFoundError: true,
      parser: KeyParser.String(),
      logFormat: "partial",
    }, // tries to read /run/secrets/DB_PASSWORD
    PORT: { parser: KeyParser.Integer() },
  },
  [envLoader]
);
const dbPassword: string = (await baseEnv.get("DB_PASSWORD")).unwrap();
const port: number = (await baseEnv.get("PORT")).unwrap();
```
