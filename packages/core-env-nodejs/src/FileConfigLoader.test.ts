import type {ILoggerLike} from '@avanio/logger-like';
import {EnvKit, KeyParser} from '@luolapeikko/core-env';
import {Ok} from '@luolapeikko/result-option';
import * as fs from 'fs';
import * as path from 'path';
import {afterAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {FileConfigLoader} from './';

const logSpy = vi.fn();

const testLogger: ILoggerLike = {
	debug: logSpy,
	error: logSpy,
	info: logSpy,
	trace: logSpy,
	warn: logSpy,
};

type EnvMap = {
	SETTINGS_VARIABLE1: string;
	SETTINGS_VARIABLE2: boolean;
	SETTINGS_VARIABLE3: boolean;
	SETTINGS_VARIABLE4: number;
	SETTINGS_VARIABLE5: number;
	SETTINGS_VARIABLE6: string | undefined;
};

const filePath = path.resolve(`${__dirname}/../test/testSettings.json`);
const envLoader = new FileConfigLoader({fileName: filePath, logger: testLogger, watch: true});
const disabledEnvLoader = new FileConfigLoader({disabled: true, fileName: 'non-existing-file.json'});

const testEnv = new EnvKit<EnvMap>(
	{
		SETTINGS_VARIABLE1: {notFoundError: true, parser: KeyParser.String()},
		SETTINGS_VARIABLE2: {notFoundError: true, parser: KeyParser.Boolean()},
		SETTINGS_VARIABLE3: {notFoundError: true, parser: KeyParser.Boolean()},
		SETTINGS_VARIABLE4: {notFoundError: true, parser: KeyParser.Integer()},
		SETTINGS_VARIABLE5: {notFoundError: true, parser: KeyParser.Integer()},
		SETTINGS_VARIABLE6: {parser: KeyParser.String()},
	},
	[disabledEnvLoader, envLoader],
	{logger: testLogger},
);

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('config variable', () => {
	beforeEach(async () => {
		(await envLoader.reload()).unwrap();
		logSpy.mockReset();
	});
	describe('FileConfigLoader loader', () => {
		it('should return SETTINGS_VARIABLE1 (string value)', async function () {
			expect(await testEnv.get('SETTINGS_VARIABLE1')).to.be.eql(Ok('string value'));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[json-file]: SETTINGS_VARIABLE1 [string value] from key:SETTINGS_VARIABLE1`);
		});
		it('should return SETTINGS_VARIABLE2 (boolean value)', async function () {
			expect(await testEnv.get('SETTINGS_VARIABLE2')).to.be.eql(Ok(true));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[json-file]: SETTINGS_VARIABLE2 [true] from key:SETTINGS_VARIABLE2`);
		});
		it('should return SETTINGS_VARIABLE3 (boolean string value)', async function () {
			expect(await testEnv.get('SETTINGS_VARIABLE3')).to.be.eql(Ok(true));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[json-file]: SETTINGS_VARIABLE3 [true] from key:SETTINGS_VARIABLE3`);
		});
		it('should return SETTINGS_VARIABLE4 (number value)', async function () {
			expect(await testEnv.get('SETTINGS_VARIABLE4')).to.be.eql(Ok(1));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[json-file]: SETTINGS_VARIABLE4 [1] from key:SETTINGS_VARIABLE4`);
		});
		it('should return SETTINGS_VARIABLE5 (number string value)', async function () {
			expect(await testEnv.get('SETTINGS_VARIABLE5')).to.be.eql(Ok(1));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[json-file]: SETTINGS_VARIABLE5 [1] from key:SETTINGS_VARIABLE5`);
		});
		it('should return SETTINGS_VARIABLE6 (null value)', async function () {
			expect(await testEnv.get('SETTINGS_VARIABLE6')).to.be.eql(Ok(undefined));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables: SETTINGS_VARIABLE6 [undefined]`);
		});
		it('should return SETTINGS_VARIABLE6 (null value)', async function () {
			await fs.promises.utimes(filePath, new Date(), new Date());
			await sleep(10);
			await fs.promises.utimes(filePath, new Date(), new Date());
			await sleep(10);
			await fs.promises.utimes(filePath, new Date(), new Date());
			await sleep(500);
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigLoader[json-file]: loading file ${filePath}`);
			expect(logSpy.mock.calls[1][0]).to.be.eq(`ConfigLoader[json-file]: reloaded file ${filePath} due to change`);
			expect(logSpy.mock.calls.length).to.be.eq(2);
		});
	});
	describe('Test module loading', () => {
		it('test CJS loading', () => {
			const {FileConfigLoader} = require('@luolapeikko/core-env-nodejs');
			expect(FileConfigLoader).toBeInstanceOf(Object);
		});
		it('test ESM loading', async () => {
			const {FileConfigLoader} = await import('@luolapeikko/core-env-nodejs');
			expect(FileConfigLoader).toBeInstanceOf(Object);
		});
	});
	afterAll(async () => {
		await envLoader.close();
		await disabledEnvLoader.close();
	});
});
