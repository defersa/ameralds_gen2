import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import { generateFrontApi } from '../../../../tools/generate-front-api';

jest.mock('node:child_process', () => ({ spawn: jest.fn() }));
jest.mock('node:fs/promises', () => ({
    ...jest.requireActual('node:fs/promises'),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
}));
jest.mock('@nestjs/testing', () => ({ Test: { createTestingModule: jest.fn() } }));
jest.mock('../app.module', () => ({ AppModule: class AppModule {} }));
jest.mock('../db/db-shared.module', () => ({ DbSharedModule: class DbSharedModule {} }));

describe('Swagger and frontend API generation lifecycle', () => {
    let app: { setGlobalPrefix: jest.Mock; close: jest.Mock };
    let builder: { overrideProvider: jest.Mock; compile: jest.Mock };
    let child: EventEmitter;
    let generatorStarted: Promise<void>;
    const document = { openapi: '3.0.0', info: { title: 'Ameralds api', version: '1.0' }, paths: {} };

    beforeEach(() => {
        jest.clearAllMocks();
        app = { setGlobalPrefix: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
        builder = {
            overrideProvider: jest.fn().mockReturnValue({ useValue: jest.fn() }),
            compile: jest.fn().mockResolvedValue({ createNestApplication: () => app }),
        };
        jest.mocked(Test.createTestingModule).mockReturnValue(builder as unknown as ReturnType<typeof Test.createTestingModule>);
        jest.spyOn(SwaggerModule, 'createDocument').mockReturnValue(document);
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.mocked(mkdir).mockResolvedValue(undefined);
        jest.mocked(writeFile).mockResolvedValue(undefined);
        child = new EventEmitter();
        generatorStarted = new Promise((resolve) => {
            jest.mocked(spawn).mockImplementation(() => {
                resolve();
                return child as ReturnType<typeof spawn>;
            });
        });
    });

    afterEach(() => jest.restoreAllMocks());

    it('writes a fresh schema before running the generator and closes the app after it exits', async () => {
        const generation = generateFrontApi();
        await generatorStarted;

        expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');
        expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('/dist/openapi/schema.json'), `${JSON.stringify(document, null, 2)}\n`);
        expect(jest.mocked(writeFile).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(spawn).mock.invocationCallOrder[0]);
        expect(spawn).toHaveBeenCalledWith(
            process.execPath,
            [expect.stringContaining('ng-openapi/cli.cjs'), '-c', 'openapi.config.ts'],
            { cwd: expect.stringContaining('/apps/am-front'), stdio: 'inherit' },
        );
        expect(app.close).not.toHaveBeenCalled();

        child.emit('exit', 0, null);
        await generation;
        expect(app.close).toHaveBeenCalledTimes(1);
    });

    it('closes the app when Swagger cannot create the schema', async () => {
        const error = new Error('Invalid Swagger metadata');
        jest.mocked(SwaggerModule.createDocument).mockImplementationOnce(() => { throw error; });

        await expect(generateFrontApi()).rejects.toBe(error);
        expect(spawn).not.toHaveBeenCalled();
        expect(app.close).toHaveBeenCalledTimes(1);
    });

    it('does not run the generator on an old schema if writing the new one fails', async () => {
        const error = new Error('Cannot write the schema');
        jest.mocked(writeFile).mockRejectedValueOnce(error);

        await expect(generateFrontApi()).rejects.toBe(error);
        expect(spawn).not.toHaveBeenCalled();
        expect(app.close).toHaveBeenCalledTimes(1);
    });

    it('closes the app when the generator process cannot start', async () => {
        const error = new Error('Cannot spawn ng-openapi');
        const generation = generateFrontApi();
        await generatorStarted;
        child.emit('error', error);

        await expect(generation).rejects.toBe(error);
        expect(app.close).toHaveBeenCalledTimes(1);
    });

    it.each([
        [1, null, 'кодом 1'],
        [null, 'SIGTERM', 'сигналом SIGTERM'],
    ])('propagates generator failure code=%s signal=%s and closes the app', async (code, signal, message) => {
        const generation = generateFrontApi();
        await generatorStarted;
        child.emit('exit', code, signal);

        await expect(generation).rejects.toThrow(message);
        expect(app.close).toHaveBeenCalledTimes(1);
    });
});
