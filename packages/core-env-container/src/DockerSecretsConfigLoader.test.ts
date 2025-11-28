import type {ILoggerLike} from '@avanio/logger-like';
import {EnvKit, KeyParser, VariableLookupError} from '@luolapeikko/core-env';
import {Err, Ok} from '@luolapeikko/result-option';
import * as path from 'path';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {DockerSecretsConfigLoader} from './';

const logSpy = vi.fn();

const testLogger: ILoggerLike = {
	debug: logSpy,
	error: logSpy,
	info: logSpy,
	trace: logSpy,
	warn: logSpy,
};

type EnvMap = {
	DOCKERSECRET1: string;
	dockersecret2: string | undefined;
	DOCKERSECRET99: string;
};

const secretsPath = path.resolve(`${__dirname}/../dockersecrets/`);

const testEnv = new EnvKit<EnvMap>(
	{
		DOCKERSECRET1: {notFoundError: true, parser: KeyParser.String()},
		DOCKERSECRET99: {notFoundError: true, parser: KeyParser.String()},
		dockersecret2: {parser: KeyParser.String()},
	},
	[new DockerSecretsConfigLoader({fileLowerCase: true, path: secretsPath})],
	{logger: testLogger},
);

describe('config variable', () => {
	beforeEach(() => {
		logSpy.mockReset();
	});
	describe('Docker Secrets loader', () => {
		it('should return docker secret value force lowercase key', async function () {
			expect(await testEnv.get('DOCKERSECRET1')).to.be.eql(Ok('docker_value'));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[docker-secrets]: DOCKERSECRET1 [docker_value] from ${path.join(secretsPath, 'dockersecret1')}`);
		});
		it('should return docker secret value', async function () {
			expect(await testEnv.get('dockersecret2')).to.be.eql(Ok('docker_value'));
			expect(logSpy.mock.calls[0][0]).to.be.eq(`ConfigVariables[docker-secrets]: dockersecret2 [docker_value] from ${path.join(secretsPath, 'dockersecret2')}`);
		});
		it('should return error', async function () {
			expect(await testEnv.get('DOCKERSECRET99')).to.be.eql(Err(new VariableLookupError('DOCKERSECRET99', 'Missing required value for key: DOCKERSECRET99')));
		});
	});
	describe('Test module loading', () => {
		it('test CJS loading', () => {
			const {DockerSecretsConfigLoader} = require('@luolapeikko/core-env-container');
			expect(DockerSecretsConfigLoader).toBeInstanceOf(Object);
		});
		it('test ESM loading', async () => {
			const {DockerSecretsConfigLoader} = await import('@luolapeikko/core-env-container');
			expect(DockerSecretsConfigLoader).toBeInstanceOf(Object);
		});
	});
});
