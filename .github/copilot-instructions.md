---
applyTo: "**"
---

# Project idea

- This project javascript modules are handling "env" variable loading and schema for it.
  - loaders (IConfigLoader) are different locations for variable data to read from.
  - parsers (IConfigParser) are schema parsers for each variable (like example "PORT" can be parsed as number)
  - ConfigMap is main class for env-core package which takes schema and provides methods to get data.

# Project setup

- uses pnpm workspaces
- typescript paths / references to handle development deps (in tsconfig.base.json)
  - paths in tsconfig.base.json
  - all references described on root tsconfig.json
  - each modules tsconfig.json extending root tsconfig.workspace.json and have references to core-ts-type and core-ts-error.
  - each module have own tsconfig.build.json which extends packages tsconfig.json to remove unit test files and example.ts files from build output.
- vitest is used as unit testing, "pnpm t" command on root folder runs build and vitest with coverage
- biome is used as linting, "pnpm run lint:fix" command on root folder tries to fix all lint issues automatically.

# Project general coding standards

## Naming Conventions

- Use PascalCase for class names, interfaces, and type aliases
- Use camelCase for variables, functions, and methods
- use # for private class members

## JSDoc Comments

- All classes, methods, and functions must have JSDoc comments.
- add @template tag for generics type in JSDoc comments
- Include @since tag with version number in all JSDoc comments.
- Parameters and return types should be documented and type annotated.
- On description use {@link Type} when possible, also on cases when standard types like Array etc.
- Check grammar and spelling carefully.
- if instance creates Loader this should be marked with @category Loaders
- if instance creates Parser this should be marked with @category Parsers

## Code quality

- Always use "pnpm run lint:fix" to apply all linting rules after change.
- "pnpm run lint" can be used to check linting errors.
- Always check "pnpm run validate" to typescript not give any errors. (this runs tsc --noEmit for each modules)

## Unit testing

- All code files should have same prefix test file on same directory (standardSchema.ts with standardSchema.test.ts)
- All vitest type testing files use same rule but files suffix is test-d.ts
- Use "pnpm run test" to run all unit tests and verify that coverage is 100% or "pnpm run coverage" as JSON coverage

---

## applyTo: "\*_/_.ts"

# Project coding standards for TypeScript

## TypeScript Guidelines

- Use TypeScript for all new code
- Follow functional programming principles where possible
- Use interfaces for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators
- Verify TS code with "pnpm run validate" on root folder.
- All functions should have return type
