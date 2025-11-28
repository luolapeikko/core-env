# @luolapeikko/core-env-azurekv

Azure Key Vault loader for EnvKit

## Features

- Azure Key Vault Secrets loader

## Example

```ts
type EnvMap = {
  API_SERVER: URL;
  PORT?: number;
};

const kvLoader = new AzureSecretsConfigLoader<EnvMap>(
  { API_SERVER: "backend-database-uri" }, // map ENV key to KV secret name
  {
    credentials: new DefaultAzureCredential(), // or SPN / Managed Identity
    url: process.env.KV_URI, // https://<your-keyvault-name>.vault.azure.net
  }
);

const baseEnv = new EnvKit<EnvMap>(
  {
    API_SERVER: { notFoundError: true, parser: KeyParser.URL() },
    PORT: { parser: KeyParser.Integer() },
  },
  [envLoader, kvLoader]
);
const apiServer: URL = (await baseEnv.get("API_SERVER")).unwrap();
const port: number = (await baseEnv.get("PORT")).unwrap();
```
