import tsconfigPaths from 'vite-tsconfig-paths';
import {defineConfig} from 'vitest/config';

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		globals: true,
		environment: 'node',
		include: ['packages/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text'],
			include: ['**/*.ts'],
			exclude: ['**/dist/**','**/*.test-d.ts','**/core-ts-type'],
		},
		typecheck: {
			include: ['**/*.test-d.ts'],
		},
	},
});
